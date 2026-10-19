import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
let toastCounter = 0;

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (type, message, title) => {
      if (!message) return null;
      toastCounter += 1;
      const id = toastCounter;
      const toast = {
        id,
        type,
        message,
        title:
          title ||
          (type === 'error' ? 'Something went wrong' : type === 'success' ? 'Done' : 'Heads up'),
      };
      setToasts((current) => [...current.slice(-3), toast]);
      const timer = window.setTimeout(() => dismiss(id), 4800);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const toast = useMemo(
    () => ({
      success: (message, title) => push('success', message, title),
      error: (message, title) => push('error', message, title),
      info: (message, title) => push('info', message, title),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="toast-viewport" aria-live="polite" aria-label="Notifications">
          {toasts.map((item) => {
            const Icon = ICONS[item.type] || Info;
            return (
              <div key={item.id} className={`toast toast-${item.type}`} role="status">
                <span className="toast-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <div className="toast-copy">
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                </div>
                <button
                  type="button"
                  className="toast-close"
                  onClick={() => dismiss(item.id)}
                  aria-label="Dismiss notification"
                >
                  <X size={15} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}
