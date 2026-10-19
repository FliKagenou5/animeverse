import { forwardRef, useId } from 'react';

export function Field({ label, htmlFor, error, hint, required, children, className = '' }) {
  return (
    <div className={`field ${className}`.trim()}>
      {label ? (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="field-required" aria-hidden="true">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="field-error" id={htmlFor ? `${htmlFor}-error` : undefined} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`input ${className}`.trim()} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className = '', rows = 4, ...props }, ref) {
  return (
    <textarea ref={ref} rows={rows} className={`input textarea ${className}`.trim()} {...props} />
  );
});

export const Select = forwardRef(function Select({ className = '', children, ...props }, ref) {
  return (
    <select ref={ref} className={`input select ${className}`.trim()} {...props}>
      {children}
    </select>
  );
});

export function SearchField({
  value,
  onChange,
  placeholder = 'Search…',
  id,
  label = 'Search',
  className = '',
  icon,
  onClear,
}) {
  const fallbackId = useId();
  const inputId = id || fallbackId;
  const Icon = icon;

  return (
    <div className={`search-field ${className}`.trim()}>
      {Icon ? <Icon size={17} className="search-field-icon" aria-hidden="true" /> : null}
      <input
        id={inputId}
        type="search"
        className="input search-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          className="search-clear"
          onClick={() => (onClear ? onClear() : onChange(''))}
          aria-label="Clear search"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
