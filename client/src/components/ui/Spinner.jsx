export function Spinner({ size = 18, label = 'Loading' }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 9)) }}
      role="status"
      aria-label={label}
    />
  );
}
