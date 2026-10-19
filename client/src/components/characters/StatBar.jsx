import { clamp } from '../../utils/format.js';

export function StatBar({ label, value, tone = 'var(--accent)', weight, compact = false, suffix }) {
  const safeValue = typeof value === 'number' ? clamp(value, 0, 100) : null;

  return (
    <div className={`stat-bar ${compact ? 'stat-bar-compact' : ''}`.trim()}>
      <div className="stat-bar-head">
        <span className="stat-bar-label">
          {label}
          {suffix ? <em>{suffix}</em> : null}
        </span>
        <span className="stat-bar-value">
          {safeValue === null ? 'No data' : safeValue}
          {weight && !compact ? <small>{weight}% weight</small> : null}
        </span>
      </div>
      <div
        className="stat-track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue ?? undefined}
        aria-valuetext={safeValue === null ? 'No data' : `${safeValue} of 100`}
      >
        <span
          className="stat-fill"
          style={{
            width: safeValue === null ? '0%' : `${safeValue}%`,
            '--stat-tone': tone,
          }}
        />
        {safeValue === null ? <span className="stat-missing">unknown</span> : null}
      </div>
    </div>
  );
}
