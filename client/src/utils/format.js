export function formatNumber(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en').format(value);
}

export function formatDate(value, options = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(date);
}

export function formatDateTime(value) {
  return formatDate(value, { hour: '2-digit', minute: '2-digit' });
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const AVATAR_GRADIENTS = [
  ['#1b2a52', '#2b6b86', '#57e3c2'],
  ['#301a4a', '#6a3d9e', '#ee8fe3'],
  ['#0d2f36', '#146a6a', '#5ff0b7'],
  ['#3a1b20', '#8a3e4f', '#ffb38a'],
  ['#101f3c', '#345fa8', '#7ed7ff'],
  ['#2b1d0e', '#7d5a1f', '#f0cc72'],
];

export function avatarGradient(seed = '') {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  const colors = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  return `radial-gradient(circle at 72% 18%, ${colors[2]}55, transparent 42%), linear-gradient(145deg, ${colors[0]}, ${colors[1]})`;
}

export function truncate(value = '', length = 120) {
  if (value.length <= length) return value;
  return `${value.slice(0, length).trimEnd()}…`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
