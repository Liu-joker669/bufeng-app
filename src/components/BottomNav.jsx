import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/calendar', label: '日历', icon: '📅' },
  { path: '#run', label: '跑步', icon: '' },
  { path: '/badges', label: '成就', icon: '🏆' },
  { path: '/profile', label: '我的', icon: '👤' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => {
        if (item.path === '#run') {
          return (
            <button key="run" type="button" aria-label="开始跑走" className="nav-run-btn" onClick={() => navigate('/run')}>
              <svg width="31" height="31" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 4a1 1 0 1 0 2 0 1 1 0 1 0-2 0" />
                <path d="M7 21l3-7 1.5 1.5L13 21" />
                <path d="M17 21l-2-7-3.5-3 1-3a6 6 0 0 0 5 3" />
                <path d="M7 9.5a3 3 0 0 1 0 3" />
              </svg>
            </button>
          );
        }
        const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
        return (
          <button
            type="button"
            key={item.path}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span style={{ fontSize: 24 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
