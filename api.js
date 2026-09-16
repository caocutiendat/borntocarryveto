// ============================================================================
//  API — lấy dữ liệu map/agent theo thứ tự ưu tiên:
//    1. cache localStorage còn hạn   -> hiện ngay, 0 request
//    2. gọi valorant-api.com         -> làm mới cache
//    3. cache hết hạn nhưng còn dữ liệu -> dùng tạm, báo "dữ liệu cũ"
//    4. fallback tĩnh trong mã nguồn -> app không bao giờ trắng màn hình
// ============================================================================
import { CACHE } from '../config.js';
import { FALLBACK_MAPS, FALLBACK_AGENTS, AGENT_ROLES } from '../data/fallback.js';

const ENDPOINTS = {
  maps: 'https://valorant-api.com/v1/maps',
  agents: 'https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=en-US'
};

function cacheKey(name) {
  return CACHE.prefix + name;
}

function readCache(name) {
  try {
    const raw = localStorage.getItem(cacheKey(name));
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    if (!Array.isArray(data) || !data.length) return null;
    return { data, stale: Date.now() - at > CACHE.ttlMs };
  } catch {
    return null;
  }
}

function writeCache(name, data) {
  try {
    localStorage.setItem(cacheKey(name), JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* localStorage đầy hoặc bị chặn — bỏ qua, app vẫn chạy bằng bộ nhớ RAM */
  }
}

async function fetchJson(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const normalizeMaps = json =>
  (json.data || [])
    .filter(m => m.coordinates && m.displayName)
    .map(m => ({
      name: m.displayName,
      splash: m.splash || '',
      listIcon: m.listViewIcon || m.splash || ''
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

const normalizeAgents = json =>
  (json.data || [])
    .filter(a => a?.displayName && a?.role?.displayName && AGENT_ROLES.includes(a.role.displayName))
    .map(a => ({
      uuid: a.uuid,
      name: a.displayName,
      role: a.role.displayName,
      icon: a.displayIcon || a.killfeedPortrait || '',
      portrait: a.fullPortraitV2 || a.fullPortrait || a.displayIcon || ''
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

/**
 * @returns {Promise<{data: Array, source: 'cache'|'network'|'stale-cache'|'fallback'}>}
 */
async function load(name, normalize, fallback) {
  const cached = readCache(name);
  if (cached && !cached.stale) {
    // Vẫn làm mới ngầm để lần sau có dữ liệu mới, nhưng không chặn render.
    refreshInBackground(name, normalize);
    return { data: cached.data, source: 'cache' };
  }

  try {
    const data = normalize(await fetchJson(ENDPOINTS[name]));
    if (!data.length) throw new Error('API trả về danh sách rỗng');
    writeCache(name, data);
    return { data, source: 'network' };
  } catch (err) {
    console.warn(`[api] không tải được "${name}":`, err.message);
    if (cached) return { data: cached.data, source: 'stale-cache' };
    return { data: fallback, source: 'fallback' };
  }
}

function refreshInBackground(name, normalize) {
  fetchJson(ENDPOINTS[name])
    .then(json => {
      const data = normalize(json);
      if (data.length) writeCache(name, data);
    })
    .catch(() => {});
}

export const getMaps = () => load('maps', normalizeMaps, FALLBACK_MAPS);
export const getAgents = () => load('agents', normalizeAgents, FALLBACK_AGENTS);

/** Ép tải lại từ mạng, bỏ qua cache (nút "Tải lại Agent API"). */
export function clearCache() {
  Object.keys(ENDPOINTS).forEach(name => localStorage.removeItem(cacheKey(name)));
}

/** Câu thông báo hiển thị cho người dùng theo nguồn dữ liệu. */
export function sourceLabel(source) {
  return {
    network: '',
    cache: '',
    'stale-cache': 'Đang dùng dữ liệu đã lưu lần trước — không kết nối được Valorant API.',
    fallback: 'Không kết nối được Valorant API. Đang chạy với danh sách dự phòng, ảnh sẽ không hiển thị.'
  }[source] || '';
}
