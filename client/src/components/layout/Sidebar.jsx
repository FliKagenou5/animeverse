import { NavLink, Link } from 'react-router-dom';
import { Database, Sparkles } from 'lucide-react';
import { Logo } from '../brand/Logo.jsx';
import { useFavorites } from '../../context/FavoritesContext.jsx';
import { NAV_SECTIONS } from '../../utils/constants.js';

export function Sidebar({ onNavigate, mobile = false }) {
  const { count } = useFavorites();

  return (
    <aside className={`sidebar ${mobile ? 'sidebar-mobile' : ''}`.trim()}>
      <div className="sidebar-top">
        <Logo onNavigate={onNavigate} />
        <div className="sidebar-demo-chip" title="Seeded characters carry a data-source label.">
          <Sparkles size={13} aria-hidden="true" />
          <span>Demo dataset</span>
          <span className="demo-pulse" aria-hidden="true" />
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_SECTIONS.map((section) => (
          <div className="nav-section" key={section.label}>
            <p className="nav-section-label">{section.label}</p>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`.trim()}
                >
                  <span className="nav-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="nav-label">{item.label}</span>
                  {item.to === '/favorites' && count > 0 ? (
                    <span className="nav-count" aria-label={`${count} favorites`}>
                      {count}
                    </span>
                  ) : null}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-data-card">
          <span className="sidebar-data-icon" aria-hidden="true">
            <Database size={15} />
          </span>
          <div>
            <strong>Local-first index</strong>
            <p>SQLite persistence. Stats are community interpretations, not official facts.</p>
            <Link to="/settings" onClick={onNavigate}>
              Read the data notes
            </Link>
          </div>
        </div>
        <div className="sidebar-meta">
          <span className="status-dot" aria-hidden="true" />
          API-connected
          <span className="meta-divider" aria-hidden="true">·</span>
          v1.0
        </div>
      </div>
    </aside>
  );
}
