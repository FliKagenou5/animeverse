import { useState } from 'react';
import { Menu, Moon, Search, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.jsx';
import { NAV_SECTIONS } from '../../utils/constants.js';
import { Logo } from '../brand/Logo.jsx';
import { Modal } from '../ui/Modal.jsx';
import { GlobalSearch } from './GlobalSearch.jsx';
import { UserMenu } from './UserMenu.jsx';

function pageLabel(pathname) {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.to === '/') {
        if (pathname === '/') return item.label;
      } else if (pathname.startsWith(item.to)) {
        return item.label;
      }
    }
  }
  if (pathname.startsWith('/characters/')) return 'Character profile';
  if (pathname.startsWith('/login')) return 'Sign in';
  if (pathname.startsWith('/register')) return 'Create account';
  return 'Universe';
}

export function Topbar({ onOpenMenu }) {
  const { isDark, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-button topbar-menu"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <div className="topbar-mobile-logo">
          <Logo compact />
        </div>
        <div className="topbar-context">
          <span className="topbar-eyebrow">Universe index</span>
          <span className="topbar-page">{pageLabel(location.pathname)}</span>
        </div>
      </div>

      <div className="topbar-search">
        <GlobalSearch />
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="icon-button topbar-search-toggle"
          onClick={() => setSearchOpen(true)}
          aria-label="Search the universe"
        >
          <Search size={19} />
        </button>
        <button
          type="button"
          className="icon-button theme-toggle"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <UserMenu />
      </div>

      {searchOpen ? (
        <Modal title="Search the universe" size="sm" onClose={() => setSearchOpen(false)}>
          <GlobalSearch
            autoFocus
            onNavigate={() => setSearchOpen(false)}
            placeholder="Character name or alias…"
          />
        </Modal>
      ) : null}
    </header>
  );
}
