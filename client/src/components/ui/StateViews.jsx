import { AlertOctagon, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from './Button.jsx';
import { Spinner } from './Spinner.jsx';

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`.trim()} aria-hidden="true" />;
}

export function PageLoader({ label = 'Loading the universe…' }) {
  return (
    <div className="page-loader" role="status">
      <Spinner size={26} />
      <span>{label}</span>
    </div>
  );
}

export function CardGridSkeleton({ count = 8 }) {
  return (
    <div className="character-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skeleton-card">
          <Skeleton className="skeleton-avatar" />
          <div className="skeleton-lines">
            <Skeleton className="skeleton-line skeleton-line-lg" />
            <Skeleton className="skeleton-line skeleton-line-sm" />
            <Skeleton className="skeleton-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Sparkles, title, message, action, children }) {
  return (
    <div className="state-panel empty-state">
      <span className="state-icon" aria-hidden="true">
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
      {action ? <div className="state-actions">{action}</div> : null}
      {children}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'This view could not load' }) {
  const message =
    typeof error === 'string'
      ? error
      : error?.message || 'An unexpected error occurred. Please try again.';
  return (
    <div className="state-panel error-state" role="alert">
      <span className="state-icon" aria-hidden="true">
        <AlertOctagon size={24} />
      </span>
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry ? (
        <div className="state-actions">
          <Button variant="secondary" icon={RotateCcw} onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
