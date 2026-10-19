import { tierColor, tierFamily } from '../../utils/constants.js';

export function TierBadge({ tier, showFamily = false, className = '' }) {
  if (!tier) return null;
  const key = typeof tier === 'string' ? tier : tier.key;
  const label = typeof tier === 'string' ? tier : tier.label || tier.key;
  const color = tierColor(key);

  return (
    <span
      className={`tier-badge ${className}`.trim()}
      style={{ '--tier-color': color }}
      title={`Tier ${label} · ${tierFamily(key)}`}
    >
      <span className="tier-dot" aria-hidden="true" />
      <span className="tier-label">{label}</span>
      {showFamily ? <span className="tier-family">{tierFamily(key)}</span> : null}
    </span>
  );
}
