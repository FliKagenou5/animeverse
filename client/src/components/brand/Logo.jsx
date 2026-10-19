import { useId } from 'react';
import { Link } from 'react-router-dom';

export function LogoMark({ size = 40 }) {
  const gradientId = `logo-aurora-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="logo-mark"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="8" y1="56" x2="56" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#46f5b0" />
          <stop offset="0.5" stopColor="#38d6ff" />
          <stop offset="1" stopColor="#7c7bff" />
        </linearGradient>
      </defs>
      <rect x="1.25" y="1.25" width="61.5" height="61.5" rx="17" fill="rgba(7, 14, 24, 0.9)" stroke="rgba(150, 200, 255, 0.18)" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="16.5" fill="none" stroke={`url(#${gradientId})`} strokeWidth="2" opacity="0.82" />
      <ellipse
        cx="32"
        cy="32"
        rx="25"
        ry="8.5"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.6"
        transform="rotate(-28 32 32)"
        opacity="0.58"
      />
      <path
        d="M32 17.5l3 11.5 11.5 3-11.5 3-3 11.5-3-11.5-11.5-3 11.5-3 3-11.5z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}

export function Logo({ to = '/', compact = false, className = '', onNavigate }) {
  const content = (
    <>
      <LogoMark size={compact ? 34 : 42} />
      <span className="brand-copy">
        <span className="brand-name">ANIMEVERSE</span>
        {!compact ? <span className="brand-sub">Infinite anime universe</span> : null}
      </span>
    </>
  );

  if (!to) return <div className={`brand ${className}`.trim()}>{content}</div>;
  return (
    <Link
      to={to}
      className={`brand ${className}`.trim()}
      aria-label="ANIMEVERSE home"
      onClick={onNavigate}
    >
      {content}
    </Link>
  );
}
