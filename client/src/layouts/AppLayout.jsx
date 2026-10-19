import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MobileMenu } from '../components/layout/MobileMenu.jsx';
import { MobileNav } from '../components/layout/MobileNav.jsx';
import { ScrollToTop } from '../components/layout/ScrollToTop.jsx';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { Topbar } from '../components/layout/Topbar.jsx';

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="sidebar-desktop">
        <Sidebar />
      </div>
      <div className="app-column">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main id="main-content" className="app-main">
          <div className="page-enter" key={`${location.pathname}${location.search}`}>
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav onMore={() => setMenuOpen(true)} moreOpen={menuOpen} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ScrollToTop />
    </div>
  );
}
