// ============================================================================
//  UI — các mảnh giao diện dùng chung. Không biết gì về nghiệp vụ veto.
// ============================================================================

export const $ = sel => document.querySelector(sel);
export const $$ = sel => Array.from(document.querySelectorAll(sel));

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// --- Toast ------------------------------------------------------------------
let toastTimer;
export function toast(kind, text) {
  const el = $('#toast');
  if (!el) return;
  el.className = `toast ${kind}`;
  el.textContent = text;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

// --- Ảnh có skeleton --------------------------------------------------------
/**
 * Gắn ảnh vào một khung đã có tỉ lệ cố định.
 * Trong lúc tải: khung shimmer. Tải lỗi hoặc không có URL: giữ nền màu + chữ,
 * nên bản fallback (không ảnh) vẫn dùng được bình thường.
 */
export function mountImage(container, src, alt) {
  container.classList.add('is-loading');
  if (!src) {
    container.classList.remove('is-loading');
    container.classList.add('no-image');
    return;
  }
  const img = new Image();
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = alt || '';
  img.addEventListener('load', () => {
    container.classList.remove('is-loading');
    container.prepend(img);
  });
  img.addEventListener('error', () => {
    container.classList.remove('is-loading');
    container.classList.add('no-image');
  });
  img.src = src;
}

// --- Nút ---------------------------------------------------------------------
/**
 * Tạo <button> thay cho <div onclick> của bản cũ.
 * Nhờ đó: Tab tới được, Enter/Space kích hoạt được, screen reader đọc đúng vai trò,
 * trạng thái disabled do trình duyệt quản lý chứ không phải class CSS.
 */
export function button({ className = '', html = '', label, disabled = false, pressed, onClick }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.innerHTML = html;
  if (label) btn.setAttribute('aria-label', label);
  if (pressed !== undefined) btn.setAttribute('aria-pressed', String(pressed));
  btn.disabled = disabled;
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}

/** Báo cho screen reader biết trạng thái trận vừa đổi, mà không cần hiện thêm gì. */
export function announce(text) {
  const el = $('#liveRegion');
  if (el) el.textContent = text;
}

export function setScreen(id) {
  $$('[data-screen]').forEach(el => {
    el.hidden = el.dataset.screen !== id;
  });
}

export function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  } catch {
    return '';
  }
}
