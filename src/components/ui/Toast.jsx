import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, Info, X, AlertTriangle } from 'lucide-react';

/**
 * Toast notification system.
 *
 * Usage:
 *   1. Wrap app with <ToastProvider>
 *   2. const { toast } = useToast();
 *   3. toast.success('Preset downloaded!');
 *      toast.error('Upload failed');
 *      toast.info('Analysis running...');
 *
 * Toasts slide in from bottom-right, auto-dismiss after 4 seconds.
 * Click X to dismiss immediately.
 */

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback — return no-op toast so components don't crash outside provider
    return {
      toast: {
        success: () => {},
        error: () => {},
        info: () => {},
        warning: () => {},
      },
    };
  }
  return ctx;
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const DURATION = 4000; // auto-dismiss after 4s

function ToastItem({ toast, onDismiss, isDark }) {
  const Icon = ICONS[toast.type] || Info;

  const typeStyles = {
    success: isDark
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : 'border-emerald-500/30 bg-emerald-50',
    error: isDark
      ? 'border-red-500/30 bg-red-500/10'
      : 'border-red-500/30 bg-red-50',
    warning: isDark
      ? 'border-amber-500/30 bg-amber-500/10'
      : 'border-amber-500/30 bg-amber-50',
    info: isDark
      ? 'border-zinc-500/30 bg-zinc-800'
      : 'border-stone-300 bg-white',
  };

  const iconStyles = {
    success: 'text-emerald-500',
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: isDark ? 'text-zinc-400' : 'text-stone-500',
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm animate-toast-in max-w-sm ${
        typeStyles[toast.type] || typeStyles.info
      } ${isDark ? 'shadow-black/40' : 'shadow-stone-200/60'}`}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconStyles[toast.type] || iconStyles.info}`} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-stone-900'}`}>
            {toast.title}
          </div>
        )}
        <div className={`text-sm ${toast.title ? 'mt-0.5' : ''} ${isDark ? 'text-zinc-300' : 'text-stone-600'}`}>
          {toast.message}
        </div>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className={`flex-shrink-0 p-0.5 rounded transition-colors ${
          isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-stone-400 hover:text-stone-600'
        }`}
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children, theme }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const isDark = theme === 'dark';

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type, messageOrOptions) => {
    const id = ++idRef.current;
    const toast = typeof messageOrOptions === 'string'
      ? { id, type, message: messageOrOptions, title: null }
      : { id, type, message: messageOrOptions.message, title: messageOrOptions.title || null };

    setToasts(prev => [...prev, toast]);

    // Auto-dismiss
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, DURATION);

    return id;
  }, []);

  const toast = {
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    info: (msg) => addToast('info', msg),
    warning: (msg) => addToast('warning', msg),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container — fixed bottom-right */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
          aria-live="polite"
        >
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onDismiss={dismiss} isDark={isDark} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
