// ============================================================================
//  AGENT DRAFT — khung sẵn, port logic từ bản cũ vào theo đúng mẫu veto.js.
//
//  Quy tắc khi port:
//   1. Toàn bộ state draft nằm TRONG object trận (match/current.agentDraft),
//      không để biến toàn cục riêng -> viewer thấy đúng y hệt admin.
//   2. Đồng hồ đếm ngược: lưu `deadline` (timestamp tuyệt đối) lên Firebase,
//      mỗi máy tự tính `deadline - Date.now()`. Không đồng bộ từng giây
//      (tốn quota); chỉ ghi khi hết giờ hoặc có người chọn.
//   3. Auto-random khi hết giờ: CHỈ máy admin được phép ghi kết quả,
//      viewer chỉ hiển thị 0s và chờ.
// ============================================================================
import { match } from '../core/store.js';
import { isAdmin } from './auth.js';
import { getAgents, sourceLabel } from '../core/api.js';
import { AGENT_ROLES } from '../data/fallback.js';
import { AGENT_TIMER } from '../config.js';
import { $, button, mountImage, toast } from '../core/ui.js';

let agents = [];

export const rolesAvailable = (pool, used) =>
  AGENT_ROLES.filter(r => pool.some(a => a.role === r && !used.includes(a.name)));

export const pickRandom = list => list[Math.floor(Math.random() * list.length)];

/** Trả về state MỚI sau một lượt ban agent. */
export function applyAgentBan(draft, agentName, team) { /* TODO: port */ }

/** Trả về state MỚI sau một lượt pick agent. */
export function applyAgentPick(draft, agentName, team) { /* TODO: port */ }

export async function initAgent() {
  const { data, source } = await getAgents();
  agents = data;
  const note = sourceLabel(source);
  if (note) toast('ban', note);

  match.subscribe(state => {
    // render(state?.agentDraft)
  });
}
