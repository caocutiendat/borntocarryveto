// ============================================================================
//  FALLBACK — dữ liệu tối thiểu để app vẫn chạy được khi:
//   • mất mạng giữa giải,
//   • valorant-api.com sập hoặc đổi schema,
//   • cache localStorage bị xoá.
//  Không có ảnh thì UI tự hiển thị ô màu + tên map/agent (xem ui.js -> mountImage).
//  Cập nhật danh sách này mỗi khi Riot thêm map/agent mới.
// ============================================================================

export const FALLBACK_MAPS = [
  'Abyss', 'Ascent', 'Bind', 'Breeze', 'Corrode', 'Fracture',
  'Haven', 'Icebox', 'Lotus', 'Pearl', 'Split', 'Sunset'
].map(name => ({ name, splash: '', listIcon: '' }));

export const FALLBACK_AGENTS = [
  ['Jett', 'Duelist'], ['Raze', 'Duelist'], ['Phoenix', 'Duelist'], ['Reyna', 'Duelist'],
  ['Yoru', 'Duelist'], ['Neon', 'Duelist'], ['Iso', 'Duelist'], ['Waylay', 'Duelist'],
  ['Sova', 'Initiator'], ['Breach', 'Initiator'], ['Skye', 'Initiator'], ['KAY/O', 'Initiator'],
  ['Fade', 'Initiator'], ['Gekko', 'Initiator'], ['Tejo', 'Initiator'],
  ['Brimstone', 'Controller'], ['Omen', 'Controller'], ['Viper', 'Controller'],
  ['Astra', 'Controller'], ['Harbor', 'Controller'], ['Clove', 'Controller'],
  ['Killjoy', 'Sentinel'], ['Cypher', 'Sentinel'], ['Sage', 'Sentinel'],
  ['Chamber', 'Sentinel'], ['Deadlock', 'Sentinel'], ['Vyse', 'Sentinel']
].map(([name, role]) => ({ uuid: `fb-${name}`, name, role, icon: '', portrait: '' }));

export const AGENT_ROLES = ['Duelist', 'Initiator', 'Controller', 'Sentinel'];
