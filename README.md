# Born To Carry Veto — bản tái cấu trúc (Vanilla JS + ES Modules + Firebase Free Tier)

Mục tiêu: chi phí vận hành **0đ**, không build step, không server riêng, realtime thật (không polling).

---

## 1. Cấu trúc thư mục

```
btc-veto/
├── index.html                  # Chỉ còn markup + 1 thẻ <script type="module">
├── database.rules.json         # Luật bảo mật Realtime Database (copy vào Firebase Console)
├── css/
│   ├── tokens.css              # Biến màu, font, spacing, focus-visible, skeleton
│   └── app.css                 # Toàn bộ CSS giao diện (dán phần <style> cũ vào đây)
└── js/
    ├── config.js               # Firebase config + hằng số toàn app  ← FILE DUY NHẤT BẠN SỬA KHI SETUP
    ├── main.js                 # Điểm khởi động: wire các module lại với nhau
    ├── core/
    │   ├── firebase.js         # Khởi tạo Firebase App / Auth / Database
    │   ├── store.js            # Lớp đồng bộ realtime (subscribe / write / debounce)
    │   ├── api.js              # Valorant API + cache localStorage + fallback data
    │   └── ui.js               # toast, escapeHtml, skeleton image, helper DOM
    ├── data/
    │   └── fallback.js         # Dữ liệu map/agent dự phòng khi API chết
    └── modules/
        ├── auth.js             # Đăng nhập Firebase Auth, phân quyền admin
        ├── veto.js             # Ban/Pick map + chọn phe
        ├── agent.js            # Agent draft theo từng map
        ├── bracket.js          # Nhánh đấu / vòng bảng
        └── history.js          # Lịch sử trận + popup chi tiết
```

Nguyên tắc: **module không gọi thẳng nhau**. Mọi thay đổi state đều đi qua `store.js`;
mọi module chỉ `subscribe()` và render lại. Nhờ vậy Admin và Viewer chạy **cùng một code path** —
khác biệt duy nhất là Viewer không được phép `write()`.

---

## 2. Cấu hình Firebase Free Tier (khoảng 10 phút)

### 2.1 Tạo project
1. Vào https://console.firebase.google.com → **Add project** → đặt tên `btc-veto` → tắt Google Analytics (không cần, đỡ rắc rối).

### 2.2 Bật Authentication
1. **Build → Authentication → Get started**.
2. Tab **Sign-in method** → bật **Email/Password** (chỉ bật dòng đầu, không cần passwordless).
3. Tab **Users → Add user**: tạo tay từng tài khoản admin (ví dụ `caocutiendat@btc.local` / mật khẩu mạnh).
   Email không cần có thật, chỉ cần đúng định dạng.
4. Copy **User UID** của từng tài khoản (cột bên phải) — dùng ở bước 2.4.

> Free Tier: Email/Password không giới hạn số lần đăng nhập. 0đ.

### 2.3 Bật Realtime Database
1. **Build → Realtime Database → Create Database**.
2. Chọn location `asia-southeast1` (Singapore — gần VN nhất, latency ~20–40ms).
3. Chọn **Start in locked mode** (sẽ dán rules ở bước 2.4).

> Free Tier (Spark): 1GB lưu trữ, 10GB/tháng băng thông, 100 kết nối đồng thời.
> Một trận veto ~20KB. 100 viewer xem cùng lúc vẫn nằm gọn trong hạn mức.

### 2.4 Dán luật bảo mật + khai báo admin
1. Tab **Rules** → dán nguyên nội dung `database.rules.json` → **Publish**.
   Ý nghĩa: **ai cũng đọc được** (viewer không cần đăng nhập), **chỉ UID nằm trong `/admins` mới ghi được**.
2. Tab **Data** → bấm `+` ở node gốc, tạo nhánh:
   ```
   admins
     └── <UID_lấy_ở_bước_2.2> : true
   ```
   Thêm mỗi admin một dòng. Muốn thu hồi quyền chỉ cần xoá dòng đó — không phải sửa code, không phải deploy lại.

### 2.5 Lấy config
**Project settings (bánh răng) → General → Your apps → Web (`</>`)** → đăng ký app →
copy object `firebaseConfig` → dán vào `js/config.js`.

> Các key này **không phải bí mật**, lộ ra ngoài vẫn an toàn vì quyền ghi do Rules + Auth quyết định.

### 2.6 Chốt danh sách admin ở 2 nơi
- `database.rules.json` → chặn ghi ở phía server (quan trọng nhất).
- `js/config.js → ADMIN_UIDS` → chỉ để ẩn/hiện nút bấm ở phía client (UX).

---

## 3. Deploy 0đ

| Cách | Thao tác |
|---|---|
| **Netlify Drop** | Kéo thả cả thư mục vào https://app.netlify.com/drop. Xong. |
| **GitHub Pages** | Push repo → Settings → Pages → branch `main`, folder `/`. |
| **Firebase Hosting** | `npm i -g firebase-tools && firebase init hosting && firebase deploy` (cùng project, 10GB/tháng miễn phí). |

Sau khi có domain, quay lại **Authentication → Settings → Authorized domains** và thêm domain đó.

Chạy local: ES Modules cần HTTP server, mở file trực tiếp sẽ lỗi CORS.
```bash
npx serve .        # hoặc: python3 -m http.server 8080
```

---

## 4. Những gì đã thay đổi so với bản cũ

| Trước | Sau |
|---|---|
| 5 tài khoản admin hardcode trong JS | Firebase Auth, không còn mật khẩu trong mã nguồn |
| `setInterval` poll 4s | `onValue()` — cập nhật <100ms, không tốn request khi rảnh |
| `window.storage` / `localStorage` làm "shared" (thực ra chỉ local) | Realtime Database — shared thật giữa mọi thiết bị |
| Gọi Valorant API mỗi lần load | Cache 7 ngày trong localStorage + fallback tĩnh |
| `<div onclick>` cho map/agent | `<button>` — có focus keyboard, `aria-pressed`, đọc được bằng screen reader |
| Ảnh map nhảy layout khi tải | Skeleton shimmer + `aspect-ratio`, không layout shift |
| 1 file 3000 dòng | 11 module, mỗi file 1 trách nhiệm |

---

## 5. Việc còn lại (đã có khung, cần bạn port nốt)

`js/modules/agent.js`, `bracket.js`, `history.js` đã có sẵn khung + chữ ký hàm.
Port logic từ file cũ vào theo đúng mẫu của `veto.js`: **hàm thuần tính toán → `store.write()` → render từ `subscribe()`**.
Tuyệt đối không giữ lại biến state toàn cục tự sửa rồi mới ghi.
