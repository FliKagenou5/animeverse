import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './Button.jsx';
import { PageLoader } from './StateViews.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export function AuthGate({ title, description, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Checking your session…" />;

  if (!user) {
    return (
      <div className="auth-gate glass">
        <span className="auth-gate-icon" aria-hidden="true">
          <LockKeyhole size={24} />
        </span>
        <span className="eyebrow">Account required</span>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="auth-gate-actions">
          <Link to="/login" state={{ from: `${location.pathname}${location.search}` }}>
            <Button iconRight={ArrowRight}>Sign in</Button>
          </Link>
          <Link to="/register" state={{ from: `${location.pathname}${location.search}` }}>
            <Button variant="secondary">Create an account</Button>
          </Link>
        </div>
        <p className="auth-gate-note">
          Accounts, favorites and saved boards live in this app&apos;s own SQLite database. No
          third-party identity provider is involved.
        </p>
      </div>
    );
  }

  return children;
}
