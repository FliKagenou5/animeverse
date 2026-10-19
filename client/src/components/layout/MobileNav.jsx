import { MoreHorizontal } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { MOBILE_NAV } from '../../utils/constants.js';

const MAIN_PATHS = MOBILE_NAV.map((item) => item.to);

export function MobileNav({ onMore, moreOpen }) {
  const location = useLocation();
  const onOtherPage = !MAIN_PATHS.some((path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),
  );

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {MOBILE_NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'is-active' : ''}`.trim()}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
      <button
        type="button"
        className={`mobile-nav-item ${onOtherPage || moreOpen ? 'is-active' : ''}`.trim()}
        onClick={onMore}
        aria-label="Open all navigation"
        aria-expanded={moreOpen}
      >
        <MoreHorizontal size={20} aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  );
}
