// ============================================================================
//  VETO — ban/pick map và chọn phe.
//
//  Kiến trúc: hàm thuần tạo ra state mới -> store.write() -> Firebase phát cho
//  mọi máy -> subscribe() gọi render(). Admin không render sớm hơn viewer,
//  nên không còn cảnh hai bên nhìn thấy hai thứ khác nhau như bản polling.
// ============================================================================
import { match } from '../core/store.js';
import { isAdmin, onAuthChange } from './auth.js';
import { getMaps, sourceLabel } from '../core/api.js';
import { $, button, mountImage, escapeHtml, toast, announce, setScreen } from '../core/ui.js';
import { MIN_MAPS, CURRENT_POOL } from '../config.js';

let allMaps = [];
let current = null;              // bản sao state trận từ Firebase
const selected = new Set();      // lựa chọn pool ở màn hình setup (chỉ cục bộ)
let format = 'bo3';

// ---------------------------------------------------------------------------
//  1. LOGIC THUẦN — không chạm DOM, không chạm mạng. Dễ test, dễ đọc.
// ---------------------------------------------------------------------------

/** Sinh trình tự lượt. Mỗi lượt pick kèm ngay lượt chọn phe của đối thủ. */
export function buildSequence(mapCount, fmt) {
  const seq = [];
  const ban = team => seq.push({ team, action: 'ban' });
  const pick = team => {
    seq.push({ team, action: 'pick' });
    seq.push({ team: team === 'A' ? 'B' : 'A', action: 'side' });
  };

  let left = mapCount;
  if (fmt === 'bo1') {
    let i = 0;
    while (left > 1) { ban(i++ % 2 === 0 ? 'A' : 'B'); left--; }
    return seq;
  }

  const pickCount = fmt === 'bo5' ? 3 : 1;   // bo3: A,B pick 1 lượt; bo5: A,B pick 3 lượt
  ban('A'); left--;
  ban('B'); left--;
  for (let i = 0; i < pickCount; i++) {
    pick('A'); left--;
    pick('B'); left--;
  }
  let t = 0;
  while (left > 1) { ban(t++ % 2 === 0 ? 'B' : 'A'); left--; }
  return seq;
}

export function currentStep(state) {
  return state && state.stepIndex < state.sequence.length ? state.sequence[state.stepIndex] : null;
}

/** Trả về state MỚI sau một lượt ban/pick. Không sửa state cũ. */
export function applyChoice(state, mapName) {
  const step = currentStep(state);
  if (!step || (step.action !== 'ban' && step.action !== 'pick')) return state;

  const pool = state.pool.map(m =>
    m.name === mapName
      ? { ...m, status: step.action === 'ban' ? 'banned' : 'picked', order: state.stepIndex + 1 }
      : m
  );
  return {
    ...state,
    pool,
    stepIndex: state.stepIndex + 1,
    log: [...state.log, { team: step.team, action: step.action, mapName }]
  };
}

/** Trả về state MỚI sau khi chốt phe cho map vừa pick. */
export function applySide(state, mapName, attackTeam, drawn = false) {
  const step = currentStep(state);
  const pool = state.pool.map(m => (m.name === mapName ? { ...m, attackTeam } : m));
  const atkName = attackTeam === 'A' ? state.teamA : state.teamB;
  return {
    ...state,
    pool,
    stepIndex: step?.action === 'side' ? state.stepIndex + 1 : state.stepIndex,
    log: [
      ...state.log,
      {
        team: step?.action === 'side' ? step.team : null,
        action: 'side',
        mapName,
        detail: (drawn ? 'Bốc thăm: ' : '') + `${atkName} Công`
      }
    ]
  };
}

/** Khi hết trình tự mà còn đúng 1 map -> map đó là map quyết định. */
export function promoteDecider(state) {
  if (state.stepIndex < state.sequence.length) return state;
  const left = state.pool.filter(m => m.status === 'available');
  if (left.length !== 1) return state;
  const name = left[0].name;
  return {
    ...state,
    pool: state.pool.map(m =>
      m.name === name ? { ...m, status: 'decider', order: state.stepIndex + 1 } : m
    ),
    log: [...state.log, { team: null, action: 'decider', mapName: name }]
  };
}

export const finalMaps = state =>
  state.pool
    .filter(m => m.status === 'picked' || m.status === 'decider')
    .sort((a, b) => (a.order || 99) - (b.order || 99));

export const isVetoComplete = state =>
  state.stepIndex >= state.sequence.length && finalMaps(state).every(m => m.attackTeam);

// ---------------------------------------------------------------------------
//  2. HÀNH ĐỘNG — gói logic thuần + ghi lên Firebase.
// ---------------------------------------------------------------------------
function commit(next, message) {
  match.save(promoteDecider(next));
  if (message) announce(message);
}

function chooseMap(mapName) {
  if (!isAdmin() || !current) return;
  const step = currentStep(current);
  const team = step.team === 'A' ? current.teamA : current.teamB;
  const verb = step.action === 'ban' ? 'cấm' : 'chọn';
  toast(step.action, `${team} ${verb} ${mapName}`);
  commit(applyChoice(current, mapName), `${team} ${verb} ${mapName}`);
}

function chooseSide(mapName, attackTeam, drawn) {
  if (!isAdmin() || !current) return;
  const atk = attackTeam === 'A' ? current.teamA : current.teamB;
  toast('pick', `${drawn ? 'Bốc thăm: ' : ''}${atk} đánh Công tại ${mapName}`);
  commit(applySide(current, mapName, attackTeam, drawn), `${atk} đánh Công tại ${mapName}`);
}

export function startMatch({ teamA, teamB, fmt, mapNames }) {
  const pool = allMaps
    .filter(m => mapNames.includes(m.name))
    .map(m => ({ name: m.name, splash: m.splash, status: 'available', order: null }));

  match.save({
    teamA,
    teamB,
    format: fmt,
    pool,
    sequence: buildSequence(pool.length, fmt),
    stepIndex: 0,
    log: [],
    mapAgentDrafts: {},
    currentAgentMap: null,
    startedAt: Date.now()
  });
}

// ---------------------------------------------------------------------------
//  3. RENDER — chạy lại từ đầu mỗi khi Firebase báo có thay đổi.
// ---------------------------------------------------------------------------
function renderMapGrid() {
  const grid = $('#mapGrid');
  grid.innerHTML = '';
  const step = currentStep(current);
  const canAct = isAdmin() && step && (step.action === 'ban' || step.action === 'pick');

  current.pool.forEach(m => {
    const status = m.status;
    const selectable = status === 'available' && canAct;

    const card = button({
      className: `map-card map-card--${status}`,
      disabled: !selectable,
      label: selectable
        ? `${step.action === 'ban' ? 'Cấm' : 'Chọn'} ${m.name}`
        : `${m.name} — ${statusLabel(status)}`,
      onClick: selectable ? () => chooseMap(m.name) : null
    });

    const frame = document.createElement('span');
    frame.className = 'map-card__frame';
    card.append(frame);
    mountImage(frame, m.splash, '');

    const caption = document.createElement('span');
    caption.className = 'map-card__name';
    caption.textContent = m.name;
    card.append(caption);

    if (status !== 'available') {
      const stamp = document.createElement('span');
      stamp.className = `map-card__stamp map-card__stamp--${status}`;
      stamp.textContent = statusLabel(status);
      card.append(stamp);
    }
    if (m.attackTeam) card.append(sideBadge(m));

    grid.append(card);
  });
}

const statusLabel = s =>
  ({ available: 'Còn lại', banned: 'Đã cấm', picked: 'Đã chọn', decider: 'Map quyết định' }[s]);

function sideBadge(m) {
  const atk = m.attackTeam === 'A' ? current.teamA : current.teamB;
  const def = m.attackTeam === 'A' ? current.teamB : current.teamA;
  const el = document.createElement('span');
  el.className = 'map-card__side';
  el.innerHTML = `${escapeHtml(atk)} <b class="side side--atk">Công</b> · ${escapeHtml(def)} <b class="side side--def">Thủ</b>`;
  return el;
}

function renderTurn() {
  const step = currentStep(current);
  const banner = $('#turnBanner');
  $('#tagA').classList.toggle('on-turn', step?.team === 'A');
  $('#tagB').classList.toggle('on-turn', step?.team === 'B');

  if (!step) {
    const decider = current.pool.find(m => m.status === 'decider' && !m.attackTeam);
    banner.textContent = decider ? 'Còn lại bước bốc thăm phe cho map quyết định.' : 'Đã chốt xong bản đồ.';
    renderSidePanel(decider, null);
    return;
  }
  const team = step.team === 'A' ? current.teamA : current.teamB;
  if (step.action === 'side') {
    const target = [...current.pool].filter(m => m.status === 'picked' && !m.attackTeam).pop();
    banner.innerHTML = `Lượt của <b>${escapeHtml(team)}</b> — chọn phe`;
    renderSidePanel(target, step);
    return;
  }
  banner.innerHTML = `Lượt của <b>${escapeHtml(team)}</b> — ${
    step.action === 'ban' ? '<span class="act act--ban">cấm</span>' : '<span class="act act--pick">chọn</span>'
  } một bản đồ`;
  renderSidePanel(null, null);
}

function renderSidePanel(map, step) {
  const panel = $('#sidePanel');
  panel.innerHTML = '';
  panel.hidden = !map;
  if (!map) return;

  const isDecider = !step;
  const title = document.createElement('p');
  title.className = 'side-panel__title';
  title.textContent = isDecider ? `Bốc thăm phe cho ${map.name}` : `Chọn phe cho ${map.name}`;
  panel.append(title);

  if (!isAdmin()) {
    const wait = document.createElement('p');
    wait.className = 'side-panel__wait';
    wait.textContent = 'Đang chờ quản trị viên.';
    panel.append(wait);
    return;
  }

  const row = document.createElement('div');
  row.className = 'side-panel__actions';
  ['A', 'B'].forEach(team => {
    const name = team === 'A' ? current.teamA : current.teamB;
    row.append(
      button({
        className: `side-btn side-btn--${team === 'A' ? 'atk' : 'def'}`,
        html: `${escapeHtml(name)} đánh Công`,
        onClick: () => chooseSide(map.name, team, false)
      })
    );
  });
  panel.append(row);

  if (isDecider) {
    panel.append(
      button({
        className: 'side-draw',
        html: 'Bốc thăm ngẫu nhiên',
        onClick: () => chooseSide(map.name, Math.random() < 0.5 ? 'A' : 'B', true)
      })
    );
  }
}

function renderLog() {
  const list = $('#logList');
  list.innerHTML = '';
  if (!current.log.length) {
    list.innerHTML = '<p class="log-empty">Chưa có lượt nào.</p>';
    return;
  }
  current.log.forEach((item, i) => {
    const who = item.team ? (item.team === 'A' ? current.teamA : current.teamB) : 'Hệ thống';
    const verb = { ban: 'Cấm', pick: 'Chọn', side: 'Chọn phe', decider: 'Map quyết định' }[item.action];
    const row = document.createElement('li');
    row.className = `log-item log-item--${item.team === 'A' ? 'a' : item.team === 'B' ? 'b' : 'sys'}`;
    row.innerHTML =
      `<span class="log-item__idx">${i + 1}</span>` +
      `<span class="log-item__who">${escapeHtml(who)}</span>` +
      `<span class="log-item__verb">${verb}</span>` +
      `<span class="log-item__map">${escapeHtml(item.mapName)}${
        item.detail ? ` <em>(${escapeHtml(item.detail)})</em>` : ''
      }</span>`;
    list.append(row);
  });
}

function render() {
  if (!current || !current.pool?.length) {
    setScreen('setup');
    return;
  }
  setScreen('veto');
  $('#tagAName').textContent = current.teamA;
  $('#tagBName').textContent = current.teamB;
  renderTurn();
  renderMapGrid();
  renderLog();
}

// ---------------------------------------------------------------------------
//  4. KHỞI ĐỘNG
// ---------------------------------------------------------------------------
export async function initVeto() {
  const { data, source } = await getMaps();
  allMaps = data;
  const note = sourceLabel(source);
  if (note) toast('ban', note);

  const preset = allMaps.filter(m => CURRENT_POOL.includes(m.name));
  (preset.length >= 5 ? preset : allMaps).forEach(m => selected.add(m.name));
  renderPoolPicker();
  wireSetupForm();

  // Một dòng này thay cho toàn bộ cơ chế polling cũ.
  match.subscribe(state => {
    current = state;
    render();
  });

  onAuthChange(() => render());
}

function renderPoolPicker() {
  const grid = $('#mapSelectGrid');
  grid.innerHTML = '';
  allMaps.forEach(m => {
    const on = selected.has(m.name);
    const item = button({
      className: 'map-pick' + (on ? ' is-on' : ''),
      pressed: on,
      label: m.name,
      onClick: () => {
        selected.has(m.name) ? selected.delete(m.name) : selected.add(m.name);
        renderPoolPicker();
        validateSetup();
      }
    });
    const frame = document.createElement('span');
    frame.className = 'map-pick__frame';
    item.append(frame);
    mountImage(frame, m.listIcon, '');
    const cap = document.createElement('span');
    cap.className = 'map-pick__name';
    cap.textContent = m.name;
    item.append(cap);
    grid.append(item);
  });
  $('#poolCount').textContent = `${selected.size} map đã chọn`;
}

function validateSetup() {
  const a = $('#teamA').value.trim();
  const b = $('#teamB').value.trim();
  const min = MIN_MAPS[format];
  let msg = '';
  if (!a || !b) msg = 'Nhập tên cả hai đội.';
  else if (a.toLowerCase() === b.toLowerCase()) msg = 'Hai đội không được trùng tên.';
  else if (selected.size < min) msg = `${format.toUpperCase()} cần tối thiểu ${min} map, hiện có ${selected.size}.`;
  else if (!isAdmin()) msg = 'Đăng nhập admin để bắt đầu veto.';
  $('#validationMsg').textContent = msg;
  $('#startBtn').disabled = Boolean(msg);
}

function wireSetupForm() {
  $('#teamA').addEventListener('input', validateSetup);
  $('#teamB').addEventListener('input', validateSetup);

  document.querySelectorAll('[data-fmt]').forEach(btn => {
    btn.addEventListener('click', () => {
      format = btn.dataset.fmt;
      document.querySelectorAll('[data-fmt]').forEach(b =>
        b.setAttribute('aria-pressed', String(b === btn))
      );
      validateSetup();
    });
  });

  $('#presetCurrent').addEventListener('click', () => {
    selected.clear();
    allMaps.filter(m => CURRENT_POOL.includes(m.name)).forEach(m => selected.add(m.name));
    renderPoolPicker();
    validateSetup();
  });
  $('#presetAll').addEventListener('click', () => {
    allMaps.forEach(m => selected.add(m.name));
    renderPoolPicker();
    validateSetup();
  });
  $('#presetNone').addEventListener('click', () => {
    selected.clear();
    renderPoolPicker();
    validateSetup();
  });

  $('#startBtn').addEventListener('click', () =>
    startMatch({
      teamA: $('#teamA').value.trim(),
      teamB: $('#teamB').value.trim(),
      fmt: format,
      mapNames: [...selected]
    })
  );

  validateSetup();
}
