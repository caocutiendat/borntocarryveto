// ============================================================================
//  STORE — lớp đồng bộ realtime duy nhất của app.
//
//  Thay thế hoàn toàn setInterval(POLL_MS) của bản cũ:
//   • onValue() giữ một WebSocket mở, server đẩy thay đổi xuống ngay khi có.
//   • Khi không ai sửa gì, app không tạo request nào -> không đốt quota.
//   • Admin và Viewer dùng CHUNG code render; khác biệt chỉ nằm ở quyền write().
// ============================================================================
import { db, ref, onValue, set, update, remove, push, get } from './firebase.js';
import { PATHS, WRITE_DEBOUNCE_MS } from '../config.js';
import { isAdmin } from '../modules/auth.js';

/** Bản sao cục bộ của dữ liệu server, để render đồng bộ không cần await. */
const cache = new Map();

/**
 * Lắng nghe một đường dẫn. Callback chạy ngay với dữ liệu hiện có,
 * rồi chạy lại mỗi khi server báo đổi.
 * @returns {Function} hàm huỷ lắng nghe
 */
export function subscribe(path, callback) {
  return onValue(
    ref(db, path),
    snap => {
      const value = snap.val();
      cache.set(path, value);
      callback(value);
    },
    err => console.error(`[store] không đọc được "${path}":`, err)
  );
}

/** Đọc nhanh từ bản sao cục bộ (không gọi mạng). */
export function read(path) {
  return cache.get(path) ?? null;
}

/** Đọc một lần từ server, dùng cho thao tác không cần theo dõi liên tục. */
export async function readOnce(path) {
  const snap = await get(ref(db, path));
  return snap.val();
}

// --- Ghi có gom nhóm --------------------------------------------------------
const pending = new Map();
const timers = new Map();

function flush(path) {
  const value = pending.get(path);
  pending.delete(path);
  timers.delete(path);
  const op = value === null ? remove(ref(db, path)) : set(ref(db, path), value);
  op.catch(err => console.error(`[store] ghi "${path}" thất bại:`, err));
}

/**
 * Ghi đè một node. Nhiều lần gọi liên tiếp trong WRITE_DEBOUNCE_MS
 * được gom thành một lần ghi duy nhất.
 * Viewer gọi hàm này sẽ bị chặn tại chỗ; Rules ở server là lớp chặn thật.
 */
export function write(path, value) {
  if (!isAdmin()) {
    console.warn('[store] bỏ qua thao tác ghi: tài khoản không có quyền admin.');
    return false;
  }
  pending.set(path, value);
  clearTimeout(timers.get(path));
  timers.set(path, setTimeout(() => flush(path), WRITE_DEBOUNCE_MS));
  return true;
}

/** Ghi ngay, không chờ debounce — dùng cho thao tác chốt (kết thúc veto, lưu lịch sử). */
export async function writeNow(path, value) {
  if (!isAdmin()) return false;
  clearTimeout(timers.get(path));
  timers.delete(path);
  pending.delete(path);
  await (value === null ? remove(ref(db, path)) : set(ref(db, path), value));
  return true;
}

/** Cập nhật một phần node, tiết kiệm băng thông hơn ghi đè cả object. */
export async function patch(path, partial) {
  if (!isAdmin()) return false;
  await update(ref(db, path), partial);
  return true;
}

/** Thêm bản ghi mới với key tự sinh (dùng cho lịch sử trận). */
export async function append(path, value) {
  if (!isAdmin()) return null;
  const node = push(ref(db, path));
  await set(node, value);
  return node.key;
}

// --- Các shortcut theo nghiệp vụ -------------------------------------------
export const match = {
  subscribe: cb => subscribe(PATHS.match, cb),
  get: () => read(PATHS.match),
  save: data => write(PATHS.match, data),
  clear: () => writeNow(PATHS.match, null)
};

export const bracket = {
  subscribe: cb => subscribe(PATHS.bracket, cb),
  get: () => read(PATHS.bracket),
  save: data => write(PATHS.bracket, data),
  clear: () => writeNow(PATHS.bracket, null)
};

export const history = {
  subscribe: cb => subscribe(PATHS.history, cb),
  add: entry => append(PATHS.history, entry),
  clear: () => writeNow(PATHS.history, null)
};
