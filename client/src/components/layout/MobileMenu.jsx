import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar.jsx';

export function MobileMenu({ open, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => panelRef.current?.focus(), 40);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="mobile-menu-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mobile-menu-backdrop" aria-hidden="true" />
      <div
        className="mobile-menu-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        tabIndex={-1}
        ref={panelRef}
      >
        <button
          type="button"
          className="icon-button mobile-menu-close"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
        <Sidebar mobile onNavigate={onClose} />
      </div>
    </div>,
    document.body,
  );
}
