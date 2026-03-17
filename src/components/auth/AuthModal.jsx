import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';

/**
 * Auth modal - sign in, sign up, forgot password
 * Matches the app's theme-aware design system
 */
export function AuthModal({ isOpen, onClose, theme }) {
  const [mode, setMode] = useState('signin'); // signin | signup | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } = useAuth();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setError('');
    setMessage('');
  };

  const switchMode = (newMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
        onClose();
      } else if (mode === 'signup') {
        const { error } = await signUpWithEmail(email, password, username);
        if (error) throw error;
        setMessage('Check your email to confirm your account.');
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setMessage('Password reset email sent. Check your inbox.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  };

  const focusTrapRef = useFocusTrap(isOpen);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const isDark = theme === 'dark';

  return (
    <AnimatePresence>
      {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <motion.div
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
          className={`w-full max-w-md border rounded-lg ${
            isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${
            isDark ? 'border-zinc-700' : 'border-stone-200'
          }`}>
            <h2 id="auth-modal-title" className={`text-xl font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
              {mode === 'signin' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
            </h2>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-md transition-colors ${isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-stone-500 hover:text-black hover:bg-stone-100'}`}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Google OAuth */}
            {mode !== 'forgot' && (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  className={`w-full py-3 px-4 font-medium flex items-center justify-center gap-3 border rounded-md transition-colors ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-700 text-white hover:bg-zinc-700'
                      : 'bg-stone-50 border-stone-200 text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className={`flex-1 h-px ${isDark ? 'bg-zinc-700' : 'bg-stone-200'}`} />
                  <span className={`text-sm ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>or</span>
                  <div className={`flex-1 h-px ${isDark ? 'bg-zinc-700' : 'bg-stone-200'}`} />
                </div>
              </>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="auth-username" className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-stone-500'}`}>
                    Username
                  </label>
                  <div className="relative">
                    <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-stone-400'}`} />
                    <input
                      id="auth-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="your_username"
                      required
                      minLength={2}
                      maxLength={30}
                      className={`w-full pl-10 pr-4 py-3 border rounded-md outline-none transition-colors focus:ring-2 ${
                        isDark
                          ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 focus:border-ember-500 focus:ring-ember-500/30'
                          : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400 focus:border-ember-600 focus:ring-ember-600/20'
                      }`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-stone-500'}`}>
                  Email
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-stone-400'}`} />
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className={`w-full pl-10 pr-4 py-3 border outline-none transition-colors rounded-md focus:ring-2 ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 focus:border-ember-500 focus:ring-ember-500/30'
                        : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400 focus:border-ember-600 focus:ring-ember-600/20'
                    }`}
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label htmlFor="auth-password" className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-stone-500'}`}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-stone-400'}`} />
                    <input
                      id="auth-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                      className={`w-full pl-10 pr-4 py-3 border rounded-md outline-none transition-colors focus:ring-2 ${
                        isDark
                          ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 focus:border-ember-500 focus:ring-ember-500/30'
                          : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400 focus:border-ember-600 focus:ring-ember-600/20'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Error / Success messages */}
              {error && (
                <div role="alert" className="px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-md">
                  {error}
                  {error.includes('already exists') && (
                    <button
                      onClick={() => switchMode('signin')}
                      className={`block mt-2 font-medium hover:underline ${isDark ? 'text-white' : 'text-ember-600'}`}
                    >
                      Go to Sign In →
                    </button>
                  )}
                </div>
              )}
              {message && (
                <div role="alert" className={`px-4 py-3 text-sm rounded-md ${
                  isDark
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}>
                  {message}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 font-medium flex items-center justify-center gap-2 rounded-md transition-opacity ${
                  isDark
                    ? 'bg-white text-black hover:bg-stone-200'
                    : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-500/20'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'signin' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot' && 'Send Reset Link'}
              </button>
            </form>

            {/* Footer links */}
            <div className={`mt-6 text-sm text-center space-y-2 ${isDark ? 'text-zinc-400' : 'text-stone-500'}`}>
              {mode === 'signin' && (
                <>
                  <button
                    onClick={() => switchMode('forgot')}
                    className={`hover:underline ${isDark ? 'text-zinc-400' : 'text-ember-600'}`}
                  >
                    Forgot password?
                  </button>
                  <div>
                    Don't have an account?{' '}
                    <button
                      onClick={() => switchMode('signup')}
                      className={`font-medium hover:underline ${isDark ? 'text-white' : 'text-ember-600'}`}
                    >
                      Sign up
                    </button>
                  </div>
                </>
              )}
              {mode === 'signup' && (
                <div>
                  Already have an account?{' '}
                  <button
                    onClick={() => switchMode('signin')}
                    className={`font-medium hover:underline ${isDark ? 'text-white' : 'text-ember-600'}`}
                  >
                    Sign in
                  </button>
                </div>
              )}
              {mode === 'forgot' && (
                <button
                  onClick={() => switchMode('signin')}
                  className={`font-medium hover:underline ${isDark ? 'text-white' : 'text-ember-600'}`}
                >
                  Back to sign in
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
    </AnimatePresence>
  );
}
