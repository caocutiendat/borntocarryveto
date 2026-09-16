// ============================================================================
//  BRACKET — khung sẵn cho nhánh đấu / vòng bảng.
//
//  Khi port từ bản cũ:
//   • Logo đội: KHÔNG lưu base64 vào Realtime Database (1 logo ~50KB, 16 đội
//     là 800KB mỗi lần ghi -> đốt băng thông free tier rất nhanh).
//     Lưu base64 vào localStorage của máy admin, chỉ đẩy URL/hash lên DB;
//     hoặc dùng Firebase Storage (5GB free) nếu cần chia sẻ logo cho viewer.
//   • Các hàm tính toán (buildSingle/buildDouble/buildGroups/getStandings)
//     giữ nguyên, chỉ thay chỗ lưu: storeSet(KEY_BRACKET) -> bracket.save().
// ============================================================================
import { bracket } from '../core/store.js';
import { isAdmin } from './auth.js';

export function buildSingle(teams) { /* TODO: port nguyên hàm cũ */ }
export function buildDouble(teams) { /* TODO: port nguyên hàm cũ */ }
export function buildGroups(teams, groupCount) { /* TODO: port nguyên hàm cũ */ }
export function getStandings(group) { /* TODO: port nguyên hàm cũ */ }

export function initBracket() {
  bracket.subscribe(data => {
    // render(data)
  });
}
