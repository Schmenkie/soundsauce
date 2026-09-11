import { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars -- motion is used as motion.div
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';

/**
 * Lab sign-in modal — one password field. Gates the paid API routes
 * (stem separation, uploads). See src/lib/labAuth.js.
 */
export function LabSignIn({ isOpen, onClose, theme, reason }) {
  const { signIn } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const focusTrapRef = useFocusTrap(isOpen);

  // Hide the dock while open
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('dock-visibility', { detail: { hidden: isOpen } }));
    return () => window.dispatchEvent(new CustomEvent('dock-visibility', { detail: { hidden: false } }));
  }, [isOpen]);

  const handleClose = () => {
    setPassword('');
    setError(null);
    setSubmitting(false);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(password);
      handleClose();
    } catch (err) {
      setError(err.message || 'Sign in failed');
      setSubmitting(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            ref={focusTrapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lab-signin-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`w-full max-w-sm rounded-lg border p-6 shadow-2xl ${
              isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-stone-100'}`}>
                  <Lock className={`w-5 h-5 ${isDark ? 'text-ember-500' : 'text-ember-600'}`} />
                </div>
                <div>
                  <h2 id="lab-signin-title" className={`font-display font-semibold ${isDark ? 'text-zinc-50' : 'text-stone-900'}`}>
                    Unlock the lab
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-stone-500'}`}>
                    {reason || 'Stem separation runs on a paid GPU.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className={`p-1.5 rounded-md ${isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-stone-500 hover:bg-stone-100'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <label htmlFor="lab-password" className="sr-only">Lab password</label>
              <input
                id="lab-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Lab password"
                className={`w-full px-3 py-2.5 rounded-md border text-sm outline-none focus:ring-2 ${
                  isDark
                    ? 'bg-zinc-950 border-zinc-700 text-zinc-50 placeholder-zinc-500 focus:ring-ember-500/40'
                    : 'bg-white border-stone-200 text-stone-900 placeholder-stone-400 focus:ring-ember-600/30'
                }`}
              />
              {error && (
                <p role="alert" className="text-sm text-red-500">{error}</p>
              )}
              <button
                type="submit"
                disabled={!password || submitting}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                  isDark ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600' : 'bg-ember-600 text-white hover:bg-ember-700'
                }`}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {submitting ? 'Unlocking…' : 'Unlock'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
