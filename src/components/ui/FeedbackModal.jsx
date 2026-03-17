import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { X, Bug, Lightbulb, MessageCircle, Send, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { trackFeedbackSubmitted, trackFeedbackOpened } from '../../lib/posthog';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const FEEDBACK_TYPES = [
  { id: 'bug', label: 'Bug Report', icon: Bug, description: 'Something isn\'t working right' },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, description: 'Suggest an improvement or new feature' },
  { id: 'general', label: 'General', icon: MessageCircle, description: 'General feedback or question' },
];

const MAX_MESSAGE_LENGTH = 2000;

/**
 * Lightweight feedback modal for collecting bug reports, feature requests, and general feedback.
 * Sends submissions to soundsauceapp@gmail.com via /api/send-feedback.
 */
export function FeedbackModal({ isOpen, onClose, theme }) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [type, setType] = useState(null);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const textareaRef = useRef(null);
  const focusTrapRef = useFocusTrap(isOpen);
  const isDark = theme === 'dark';

  // Track feedback modal opened
  useEffect(() => {
    if (isOpen) {
      trackFeedbackOpened(location.pathname);
    }
  }, [isOpen, location.pathname]);

  // Focus textarea when type is selected
  useEffect(() => {
    if (type && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [type]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      // Delay reset so success state is visible during close animation
      const timer = setTimeout(() => {
        setType(null);
        setMessage('');
        setEmail('');
        setStatus('idle');
        setErrorMessage('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleSubmit = async () => {
    if (!type || !message.trim()) return;

    setStatus('sending');
    setErrorMessage('');

    try {
      const res = await fetch('/api/send-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          email: email.trim() || (user?.email || null),
          page: location.pathname,
          username: profile?.username || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send feedback');
      }

      trackFeedbackSubmitted(type, location.pathname);
      setStatus('success');

      // Auto-close after showing success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.div
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
          className={`relative w-full max-w-md rounded-lg shadow-xl ${
            isDark ? 'bg-zinc-900 border border-zinc-700' : 'bg-white border border-stone-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
          <h2 id="feedback-modal-title" className={`text-lg font-bold ${isDark ? 'text-white' : 'text-stone-900'}`}>
            Send Feedback
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-md transition-colors ${
              isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-stone-100 text-stone-500'
            }`}
            aria-label="Close feedback modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success state */}
        {status === 'success' ? (
          <div className="px-5 py-10 text-center">
            <CheckCircle className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
            <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-stone-900'}`}>
              Thanks for your feedback!
            </h3>
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-stone-500'}`}>
              We'll review it and get back to you if needed.
            </p>
          </div>
        ) : (
          <>
            {/* Type selector */}
            <div className="px-5 pt-4 pb-2">
              <p className={`text-xs font-medium mb-2.5 ${isDark ? 'text-zinc-400' : 'text-stone-500'}`}>
                What kind of feedback?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {FEEDBACK_TYPES.map(({ id, label, icon: Icon, description }) => {
                  const isSelected = type === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setType(id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg text-center transition-all ${
                        isSelected
                          ? isDark
                            ? 'bg-white text-black'
                            : 'bg-ember-600 text-white shadow-lg shadow-ember-500/20'
                          : isDark
                            ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                            : 'bg-stone-50 text-stone-500 hover:bg-stone-100 hover:text-ember-600'
                      }`}
                      aria-label={`Select ${label}`}
                      title={description}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message textarea */}
            <div className="px-5 py-3">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                aria-label="Feedback message"
                placeholder={
                  type === 'bug'
                    ? 'What happened? What did you expect to happen?'
                    : type === 'feature'
                      ? 'What would you like to see? How would it help you?'
                      : 'Share your thoughts...'
                }
                rows={4}
                className={`w-full px-3 py-2.5 text-sm rounded-md border resize-none transition-colors focus:outline-none focus:ring-2 ${
                  isDark
                    ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 focus:ring-ember-500/50 focus:border-ember-500'
                    : 'bg-white border-stone-200 text-stone-900 placeholder-stone-400 focus:ring-ember-600/30 focus:border-ember-600'
                }`}
              />
              <div className={`text-right text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>
                {message.length}/{MAX_MESSAGE_LENGTH}
              </div>
            </div>

            {/* Email field (for guests) */}
            {!user && (
              <div className="px-5 pb-3">
                <label htmlFor="feedback-email" className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-stone-500'}`}>
                  Email (optional, if you'd like a reply)
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={`w-full px-3 py-2 text-sm rounded-md border transition-colors focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 focus:ring-ember-500/50 focus:border-ember-500'
                      : 'bg-white border-stone-200 text-stone-900 placeholder-stone-400 focus:ring-ember-600/30 focus:border-ember-600'
                  }`}
                />
              </div>
            )}

            {/* Error message */}
            {status === 'error' && (
              <div className="px-5 pb-2">
                <p role="alert" className="text-sm px-3 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md">{errorMessage}</p>
              </div>
            )}

            {/* Footer */}
            <div className={`px-5 py-4 border-t flex items-center justify-between ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
              <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>
                {user ? `Sending as ${profile?.username || user.email}` : 'Sending anonymously'}
              </p>
              <button
                onClick={handleSubmit}
                disabled={!type || !message.trim() || status === 'sending'}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-white text-black hover:bg-stone-200'
                    : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-500/20'
                }`}
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send Feedback
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
}
