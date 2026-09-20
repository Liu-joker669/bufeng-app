import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider } from './store.jsx';
import BottomNav from './components/BottomNav.jsx';
import Home from './pages/Home.jsx';
import Calendar from './pages/Calendar.jsx';
import Badges from './pages/Badges.jsx';
import Profile from './pages/Profile.jsx';
import RunDetail from './pages/RunDetail.jsx';
import RunActive from './pages/RunActive.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.querySelector('.app-content')?.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppShell() {
  const location = useLocation();
  const isRunActive = location.pathname === '/run';

  if (isRunActive) {
    return (
      <div className="app-shell run-fullscreen">
        <ScrollToTop />
        <RunActive />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header style={{
        padding: '14px 20px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: 19, color: 'var(--color-text)' }}>步频</span>
      </header>

      <main className="app-content">
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/badges" element={<Badges />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/run/:id" element={<RunDetail />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  );
}

export default function App() {
  const routerBase = import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL;

  return (
    <BrowserRouter basename={routerBase}>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </BrowserRouter>
  );
}
