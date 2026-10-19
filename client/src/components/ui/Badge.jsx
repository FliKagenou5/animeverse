import { DATA_SOURCE_META } from '../../utils/constants.js';

export function Badge({ tone = 'neutral', children, icon: Icon, className = '', title }) {
  return (
    <span className={`badge badge-${tone} ${className}`.trim()} title={title}>
      {Icon ? <Icon size={12} aria-hidden="true" /> : <span className="badge-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const tone =
    status === 'Alive'
      ? 'success'
      : status === 'Deceased'
        ? 'danger'
        : status === 'Sealed'
          ? 'warning'
          : status === 'Inactive'
            ? 'neutral'
            : 'info';
  return <Badge tone={tone}>{status}</Badge>;
}

export function DataSourceBadge({ source, compact = false }) {
  const meta = DATA_SOURCE_META[source] || DATA_SOURCE_META.demo;
  return (
    <span
      className={`source-badge source-${meta.tone}`}
      title={meta.description}
    >
      <span className="source-dot" aria-hidden="true" />
      {compact ? meta.label.split(' ')[0] : meta.label}
    </span>
  );
}
