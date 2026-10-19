import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Heart, LayoutDashboard, LogOut, Settings2, ShieldCheck } from 'lucide-react';
import { getApiError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { initials } from '../../utils/format.js';
import { Spinner } from '../ui/Spinner.jsx';

export function UserMenu() {
  const { user, loading, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (loading) {
    return (
      <div className="user-chip-skeleton">
        <Spinner size={16} />
      </div>
    );
  }

  if (!user) {
    return (
      <Link to="/login" className="btn btn-secondary btn-sm topbar-signin">
        Sign in
      </Link>
    );
  }

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
      setOpen(false);
      toast.success('You have been signed out.', 'Signed out');
      navigate('/');
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className={`user-trigger ${open ? 'is-open' : ''}`.trim()}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open account menu"
      >
        <span className="user-avatar" aria-hidden="true">
          {initials(user.name)}
        </span>
        <span className="user-trigger-copy">
          <strong>{user.name.split(' ')[0]}</strong>
          <small>{isAdmin ? 'Admin' : 'Explorer'}</small>
        </span>
        <ChevronDown size={14} className="user-chevron" aria-hidden="true" />
      </button>

      {open ? (
        <div className="user-dropdown" role="menu">
          <div className="user-dropdown-head">
            <span className="user-avatar user-avatar-lg" aria-hidden="true">
              {initials(user.name)}
            </span>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
              <span className={`role-tag ${isAdmin ? 'role-admin' : ''}`}>
                {isAdmin ? <ShieldCheck size={11} /> : null}
                {isAdmin ? 'Administrator' : 'Member'}
              </span>
            </div>
          </div>
          <div className="user-dropdown-links">
            <Link to="/" role="menuitem" className="menu-item">
              <LayoutDashboard size={15} /> Dashboard
            </Link>
            <Link to="/favorites" role="menuitem" className="menu-item">
              <Heart size={15} /> Favorites
            </Link>
            <Link to="/settings" role="menuitem" className="menu-item">
              <Settings2 size={15} /> Settings
            </Link>
          </div>
          <button
            type="button"
            className="menu-item menu-item-danger"
            onClick={handleLogout}
            disabled={busy}
            role="menuitem"
          >
            {busy ? <Spinner size={14} /> : <LogOut size={15} />}
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
