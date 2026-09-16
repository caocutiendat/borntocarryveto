// ============================================================================
//  FILE DUY NHẤT BẠN CẦN SỬA KHI SETUP DỰ ÁN
//  Các key dưới đây KHÔNG phải bí mật — quyền ghi do Auth + Database Rules quyết định.
// ============================================================================

export const firebaseConfig = {
  apiKey: 'DAN_API_KEY_CUA_BAN',
  authDomain: 'btc-veto.firebaseapp.com',
  databaseURL: 'https://btc-veto-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'btc-veto',
  storageBucket: 'btc-veto.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:xxxxxxxxxxxx'
};

/** Đường dẫn dữ liệu trên Realtime Database. Đổi ở đây, cả app đổi theo. */
export const PATHS = {
  match: 'match/current',
  history: 'history',
  bracket: 'bracket/current',
  admins: 'admins'
};

/** Cache Valorant API trong localStorage. */
export const CACHE = {
  prefix: 'btc-veto:cache:',
  /** 7 ngày — pool map/agent của Valorant không đổi nhanh hơn thế. */
  ttlMs: 7 * 24 * 60 * 60 * 1000
};

/** Gom nhiều thao tác liên tiếp thành 1 lần ghi, tiết kiệm quota Free Tier. */
export const WRITE_DEBOUNCE_MS = 250;

/** Pool map thi đấu hiện hành — dùng cho nút "Pool hiện tại". */
export const CURRENT_POOL = ['Ascent', 'Abyss', 'Haven', 'Lotus', 'Split', 'Summit', 'Sunset'];

/** Số map tối thiểu cho từng thể thức. */
export const MIN_MAPS = { bo1: 3, bo3: 5, bo5: 7 };

/** Thời gian mỗi lượt trong Agent Draft (giây). */
export const AGENT_TIMER = { role: 30, agent: 45, ban: 30 };
