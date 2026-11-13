import { useCallback, useRef, useState } from 'react';
import { ToastContext } from '../hooks/toastContext.js';

const DEFAULT_DURATION = 4000;

// Short messages at the bottom of the screen, such as "Casey voted for Tram 28" or
// "Deleted Dinner · Undo". The region is aria-live so screen readers announce them.
export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, { actionLabel, onAction, duration = DEFAULT_DURATION } = {}) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, message, actionLabel, onAction }]);
      window.setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-lg [animation:toast-in_.2s_ease-out]"
          >
            <span className="flex-1">{toast.message}</span>
            {toast.actionLabel && (
              <button
                type="button"
                className="min-h-11 rounded-lg px-3 font-bold underline outline-none focus-visible:ring-2 focus-visible:ring-white"
                onClick={() => {
                  toast.onAction?.();
                  dismiss(toast.id);
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
