// ============================================================================
//  AUTH — Firebase Authentication.
//
//  Bản cũ: mảng ADMIN_ACCOUNTS với mật khẩu dạng chữ thường trong JS,
//          ai xem source cũng đăng nhập được.
//  Bản mới: mật khẩu do Firebase giữ; quyền ghi do Database Rules quyết định
//          (kiểm tra /admins/$uid), client chỉ ẩn/hiện nút cho gọn mắt.
// ============================================================================
import {
  auth,
  db,
  ref,
  get,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from '../core/firebase.js';
import { PATHS } from '../config.js';
import { $, toast } from '../core/ui.js';

let currentUser = null;
let admin = false;
const listeners = new Set();

export const isAdmin = () => admin;
export const getUser = () => currentUser;

/** Đăng ký callback chạy mỗi khi trạng thái đăng nhập đổi. */
export function onAuthChange(cb) {
  listeners.add(cb);
  cb({ user: currentUser, isAdmin: admin });
  return () => listeners.delete(cb);
}

function emit() {
  listeners.forEach(cb => cb({ user: currentUser, isAdmin: admin }));
}

/** Tên đăng nhập ngắn -> email. Người dùng vẫn gõ "caocutiendat" như cũ. */
const toEmail = username =>
  username.includes('@') ? username.trim() : `${username.trim().toLowerCase()}@btc.local`;

export async function login(username, password) {
  const cred = await signInWithEmailAndPassword(auth, toEmail(username), password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

/** Lỗi Firebase -> câu tiếng Việt nói rõ phải làm gì. */
export function describeAuthError(err) {
  const map = {
    'auth/invalid-credential': 'Tên đăng nhập hoặc mật khẩu không đúng.',
    'auth/invalid-email': 'Tên đăng nhập không hợp lệ.',
    'auth/user-not-found': 'Tên đăng nhập hoặc mật khẩu không đúng.',
    'auth/wrong-password': 'Tên đăng nhập hoặc mật khẩu không đúng.',
    'auth/too-many-requests': 'Sai quá nhiều lần. Thử lại sau vài phút.',
    'auth/network-request-failed': 'Mất kết nối mạng. Kiểm tra Internet rồi thử lại.'
  };
  return map[err?.code] || 'Không đăng nhập được. Thử lại sau ít phút.';
}

/** Gọi một lần lúc khởi động. Firebase tự khôi phục phiên sau reload. */
export function initAuth() {
  onAuthStateChanged(auth, async user => {
    currentUser = user;
    admin = false;
    if (user) {
      try {
        const snap = await get(ref(db, `${PATHS.admins}/${user.uid}`));
        admin = snap.val() === true;
        if (!admin) toast('ban', 'Tài khoản này chưa được cấp quyền admin.');
      } catch (err) {
        console.error('[auth] không đọc được danh sách admin:', err);
      }
    }
    renderAuthBar();
    emit();
  });

  wireLoginForm();
}

// --- Giao diện thanh admin --------------------------------------------------
function renderAuthBar() {
  const badge = $('#adminBadge');
  if (badge) {
    badge.textContent = admin ? 'Admin' : 'Chế độ xem';
    badge.classList.toggle('on', admin);
  }
  const loginBtn = $('#adminLoginBtn');
  const logoutBtn = $('#adminLogoutBtn');
  if (loginBtn) loginBtn.hidden = admin;
  if (logoutBtn) logoutBtn.hidden = !admin;
  const note = $('#viewerNote');
  if (note) note.hidden = admin;
  document.body.dataset.role = admin ? 'admin' : 'viewer';
}

function wireLoginForm() {
  const modal = $('#loginModal');
  const form = $('#loginForm');
  const errEl = $('#modalError');
  if (!modal || !form) return;

  const open = () => {
    errEl.textContent = '';
    form.reset();
    modal.hidden = false;
    $('#adminUsername').focus();
  };
  const close = () => {
    modal.hidden = true;
  };

  $('#adminLoginBtn')?.addEventListener('click', open);
  $('#modalCloseBtn')?.addEventListener('click', close);
  modal.addEventListener('click', e => {
    if (e.target === modal) close();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = $('#modalSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang đăng nhập…';
    errEl.textContent = '';
    try {
      await login($('#adminUsername').value, $('#pwMain').value);
      close();
      toast('pick', 'Đã đăng nhập.');
    } catch (err) {
      errEl.textContent = describeAuthError(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Đăng nhập';
    }
  });

  $('#adminLogoutBtn')?.addEventListener('click', async () => {
    await logout();
    toast('pick', 'Đã đăng xuất.');
  });
}
