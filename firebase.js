// ============================================================================
//  Khởi tạo Firebase. Dùng modular SDK nạp thẳng từ CDN -> không cần npm/bundler.
//  Chỉ file này biết đến SDK; các module khác import lại từ đây.
// ============================================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getDatabase,
  ref,
  onValue,
  get,
  set,
  update,
  remove,
  push,
  query,
  orderByChild,
  limitToLast,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

import { firebaseConfig } from '../config.js';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Giữ phiên đăng nhập qua reload — thay cho cơ chế tự chế bằng localStorage ở bản cũ.
// Chỉ "Đăng xuất" mới kết thúc phiên, đúng như hành vi cũ nhưng an toàn hơn.
setPersistence(auth, browserLocalPersistence).catch(console.warn);

export {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  ref,
  onValue,
  get,
  set,
  update,
  remove,
  push,
  query,
  orderByChild,
  limitToLast,
  serverTimestamp
};
