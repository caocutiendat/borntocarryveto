// ============================================================================
//  MAIN — điểm khởi động duy nhất. index.html chỉ nạp file này.
// ============================================================================
import { initAuth, onAuthChange } from './modules/auth.js';
import { initVeto } from './modules/veto.js';
// import { initAgent } from './modules/agent.js';
// import { initBracket } from './modules/bracket.js';
// import { initHistory } from './modules/history.js';
import { $$ } from './core/ui.js';

function wireTabs() {
  const tabs = $$('[role="tab"]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', e => {
      const i = tabs.indexOf(tab);
      if (e.key === 'ArrowRight') select(tabs[(i + 1) % tabs.length]);
      if (e.key === 'ArrowLeft') select(tabs[(i - 1 + tabs.length) % tabs.length]);
    });
  });

  function select(tab) {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    tab.focus();
  }
}

async function boot() {
  wireTabs();
  initAuth();
  await initVeto();
  // initAgent(); initBracket(); initHistory();

  // Mọi module tự render lại khi quyền đổi — không cần reload trang.
  onAuthChange(({ isAdmin }) => {
    document.body.dataset.role = isAdmin ? 'admin' : 'viewer';
  });
}

boot().catch(err => {
  console.error(err);
  document.getElementById('bootError').hidden = false;
});
