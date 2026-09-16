// ============================================================================
//  HISTORY — lịch sử trận đã veto.
//
//  Khác bản cũ: lưu trên Realtime Database nên mọi thiết bị đều thấy chung.
//  Giữ tối đa ~50 bản ghi; xoá bản ghi cũ nhất khi vượt ngưỡng để không
//  phình dung lượng (1GB free tier là rất nhiều, nhưng đọc cả cây thì tốn
//  băng thông — hãy dùng query limitToLast khi render danh sách).
// ============================================================================
import { history } from '../core/store.js';
import { fmtDate, escapeHtml } from '../core/ui.js';

export function snapshotMatch(state) {
  return {
    date: new Date().toISOString(),
    teamA: state.teamA,
    teamB: state.teamB,
    format: state.format,
    log: state.log,
    finalMaps: state.pool
      .filter(m => m.status === 'picked' || m.status === 'decider')
      .sort((a, b) => (a.order || 99) - (b.order || 99))
      .map(m => ({
        name: m.name,
        decider: m.status === 'decider',
        attackTeam: m.attackTeam || null,
        agentDraft: state.mapAgentDrafts?.[m.name] || null
      }))
  };
}

export const saveMatch = state => history.add(snapshotMatch(state));

export function initHistory() {
  history.subscribe(data => {
    // render danh sách + popup chi tiết (port từ openHistoryDetail cũ)
  });
}
