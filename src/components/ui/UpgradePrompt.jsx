import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, Zap, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from '../auth';
import { trackUpgradePromptShown, trackUpgradePromptClicked } from '../../lib/posthog';
import { useFocusTrap } from '../../hooks/useFocusTrap';

/**
 * UpgradePrompt - Modal shown when a user hits a tier limit
 *
 * Props:
 *   isOpen - whether the modal is visible
 *   onClose - close handler
 *   feature - which limit was hit ('analyses' | 'stems' | 'publishes' | 'storage')
 *   used - current usage count
 *   limit - max allowed for current tier
 *   onUpgrade - function(priceId) called when user clicks an upgrade button
 *   theme - 'dark' | 'light'
 *   t - theme classes object
 */
export function UpgradePrompt({ isOpen, onClose, feature, used, limit, onUpgrade, theme, t }) {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
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

  useEffect(() => {
    if (isOpen && feature) {
      trackUpgradePromptShown(feature);
    }
  }, [isOpen, feature]);

  // After guest signs in via AuthModal, trigger the upgrade flow
  useEffect(() => {
    if (user && showAuthModal) {
      setShowAuthModal(false);
      onUpgrade('pro');
    }
  }, [user, showAuthModal, onUpgrade]);

  if (!isOpen) return null;

  const featureLabels = {
    analyses: 'analyses',
    stems: 'stem separations',
    publishes: 'recipe publishes',
    storage: 'saved analyses',
  };

  const featureLabel = featureLabels[feature] || feature;

  const handleUpgradeClick = (priceId) => {
    trackUpgradePromptClicked(feature);
    if (!user) {
      // Guest: show auth modal first, then redirect to checkout after sign-in
      setShowAuthModal(true);
      return;
    }
    onUpgrade(priceId);
  };

  const plans = [
    {
      name: 'Pro',
      price: '$10/mo',
      priceId: 'pro',
      icon: Zap,
      features: [
        'Unlimited analyses',
        'Unlimited stem separations',
        'Unlimited cloud storage',
        'Unlimited recipe sharing',
      ],
    },
  ];

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        className={`relative w-full max-w-lg border rounded-lg ${
          theme === 'dark' ? 'bg-zinc-950 border-zinc-700' : 'bg-white border-stone-200'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-zinc-700' : 'border-stone-200'
        }`}>
          <div>
            <h2 id="upgrade-modal-title" className={`text-lg font-bold ${t.text}`}>Upgrade Your Plan</h2>
            <p className={`text-sm mt-1 ${t.textMuted}`}>
              You've used {used}/{limit} {featureLabel} this month
            </p>
          </div>
          <button onClick={onClose} className={`p-1 ${t.textMuted}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plans */}
        <div className="p-6 space-y-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.priceId}
                className={`p-4 border rounded-lg transition-all ${
                  theme === 'dark'
                    ? 'border-zinc-700 hover:border-zinc-500'
                    : 'border-stone-200 hover:border-ember-600'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
                    <span className={`font-bold ${t.text}`}>{plan.name}</span>
                    <span className={`text-sm ${t.textMuted}`}>{plan.price}</span>
                  </div>
                  <button
                    onClick={() => handleUpgradeClick(plan.priceId)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      theme === 'dark'
                        ? 'bg-white text-black hover:bg-zinc-200'
                        : 'bg-ember-600 text-white hover:bg-ember-700'
                    }`}
                  >
                    {user ? 'Upgrade' : 'Sign Up & Upgrade'}
                  </button>
                </div>
                <ul className="space-y-1.5">
                  {plan.features.map((f, i) => (
                    <li key={i} className={`flex items-center gap-2 text-sm ${t.textMuted}`}>
                      <Check className="w-3.5 h-3.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t text-center space-y-2 ${
          theme === 'dark' ? 'border-zinc-700' : 'border-stone-200'
        }`}>
          <Link
            to="/pricing"
            onClick={onClose}
            className={`text-sm font-medium block ${
              theme === 'dark' ? 'text-ember-500 hover:text-white' : 'text-ember-600 hover:text-ember-700'
            }`}
          >
            Compare all plans
          </Link>
          <button onClick={onClose} className={`text-sm ${t.textMuted}`}>
            Maybe later
          </button>
        </div>
      </div>
    </div>

    {/* Auth Modal for guest upgrade */}
    {showAuthModal && (
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        theme={theme}
      />
    )}
    </>
  );
}
