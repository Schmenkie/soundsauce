import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Zap, Loader2, Minus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, usePageTitle } from '../hooks';
import { trackPricingPageViewed, trackPricingPlanClicked } from '../lib/posthog';
import { AuthModal } from '../components/auth';

/**
 * Dedicated pricing page with 2-column plan comparison grid + FAQ.
 * Accessible from Home page hero, sidebar footer, UpgradePrompt modal, Settings page.
 * Guests see AuthModal on upgrade click instead of silent redirect.
 */
export function Pricing({ theme, t }) {
  usePageTitle('Pricing');
  const { user } = useAuth();
  const subscription = useSubscription();
  const [openFaq, setOpenFaq] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  useEffect(() => {
    trackPricingPageViewed();
  }, []);

  // After signing in via AuthModal, auto-trigger checkout
  useEffect(() => {
    if (user && showAuthModal) {
      setShowAuthModal(false);
      const priceId = import.meta.env.VITE_STRIPE_PRO_PRICE_ID;
      if (!priceId) {
        setCheckoutError('Checkout is temporarily unavailable. Please try again later.');
        return;
      }
      setCheckoutError(null);
      setCheckoutLoading(true);
      subscription.startCheckout(priceId);
    }
  }, [user, showAuthModal, subscription]);

  const isDark = theme === 'dark';
  const currentTier = subscription.tier || 'free';

  const handleUpgrade = (tier) => {
    trackPricingPlanClicked(tier);
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (tier === 'pro') {
      const priceId = import.meta.env.VITE_STRIPE_PRO_PRICE_ID;
      if (!priceId) {
        setCheckoutError('Checkout is temporarily unavailable. Please try again later.');
        return;
      }
      setCheckoutError(null);
      setCheckoutLoading(true);
      subscription.startCheckout(priceId);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      tier: 'free',
      features: [
        '10 analyses per month',
        '2 stem separations per month',
        '3 recipe publishes per month',
        '20 saved analyses',
        'Community access',
        'Vital preset downloads',
      ],
      cta: 'Get Started',
      ctaLink: '/analyze',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '$10',
      period: 'per month',
      tier: 'pro',
      icon: Zap,
      badge: 'Most Popular',
      features: [
        'Unlimited analyses',
        'Unlimited stem separations',
        'Unlimited cloud storage',
        'Unlimited recipe sharing',
        'Create weekly challenges',
        'Priority support',
      ],
      cta: 'Start Pro',
      highlight: true,
    },
  ];

  const faqs = [
    {
      q: 'Can I cancel anytime?',
      a: 'Yes. You can cancel your subscription from Settings at any time. Your plan stays active until the end of the billing period. No questions asked.',
    },
    {
      q: 'Is this worth $10/month vs free YouTube tutorials?',
      a: 'YouTube tutorials teach general techniques. SoundSauce analyzes YOUR specific sound and gives you exact synth settings, filter values, and a downloadable Vital preset. It turns hours of guessing into seconds of analysis.',
    },
    {
      q: 'What is stem separation?',
      a: 'Stem separation uses AI to split a full song into individual parts — vocals, drums, bass, and other instruments. This lets you analyze isolated sounds for dramatically more accurate results.',
    },
    {
      q: 'Do I need expensive plugins?',
      a: 'No. SoundSauce generates presets for Vital, a completely free synthesizer. All Sound Sauce instructions reference free tools and your DAW\'s built-in plugins.',
    },
    {
      q: 'What happens when I hit the free limit?',
      a: 'Your existing analyses and presets are always available. You just can\'t run new analyses until next month — or you can upgrade to Pro for unlimited access instantly.',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        to="/"
        className={`inline-flex items-center gap-2 text-sm font-medium mb-8 transition-colors ${
          isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-stone-500 hover:text-stone-900'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h1 className={`text-3xl md:text-4xl font-bold font-display mb-3 ${t.text}`}>
          Stop guessing. Start creating.
        </h1>
        <p className={`text-lg mb-4 ${t.textMuted}`}>
          Pro producers analyze unlimited sounds, separate stems instantly, and never lose their work.
        </p>
        <p className={`text-sm ${t.textDimmed}`}>
          Less than the cost of a single sample pack — and it works with every sound you'll ever hear.
        </p>
      </motion.div>

      {/* Checkout error */}
      {checkoutError && (
        <div className={`max-w-3xl mx-auto mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
          isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-200'
        }`}>
          {checkoutError}
        </div>
      )}

      {/* Pricing grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
        {plans.map((plan, index) => {
          const isCurrentPlan = currentTier === plan.tier && user;
          const PlanIcon = plan.icon;
          return (
            <motion.div
              key={plan.tier}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.15 }}
              className={`relative p-6 border rounded-lg flex flex-col transition-all duration-300 ${
                plan.highlight
                  ? isDark
                    ? 'border-ember-500/50 bg-zinc-900 ring-1 ring-ember-500/20 hover:ring-ember-500/40'
                    : 'border-ember-500 bg-white ring-2 ring-ember-500/20 shadow-xl shadow-ember-500/10'
                  : isDark
                    ? 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              {/* "Most Popular" badge */}
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold rounded-full ${
                  isDark
                    ? 'bg-ember-500 text-zinc-950'
                    : 'bg-ember-600 text-white'
                }`}>
                  {plan.badge}
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  {PlanIcon && (
                    <PlanIcon className={`w-5 h-5 ${
                      isDark ? 'text-ember-500' : 'text-ember-600'
                    }`} />
                  )}
                  <h3 className={`text-xl font-bold font-display ${t.text}`}>{plan.name}</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${t.text}`}>{plan.price}</span>
                  <span className={`text-sm ${t.textDimmed}`}>/{plan.period}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      isDark ? 'text-ember-500' : 'text-ember-600'
                    }`} />
                    <span className={`text-sm ${t.textMuted}`}>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrentPlan ? (
                <div className={`py-3 text-center text-sm font-medium rounded-md ${
                  isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-stone-100 text-stone-400 border border-stone-200'
                }`}>
                  Current Plan
                </div>
              ) : plan.ctaLink ? (
                <Link
                  to={plan.ctaLink}
                  className={`block py-3 text-center font-medium transition-all rounded-md ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                      : 'bg-stone-900 text-white hover:bg-stone-800'
                  }`}
                >
                  {plan.cta}
                </Link>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.tier)}
                  disabled={checkoutLoading}
                  className={`w-full py-3 font-medium transition-all rounded-md flex items-center justify-center gap-2 ${
                    plan.highlight
                      ? isDark
                        ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
                        : 'bg-ember-600 text-white hover:bg-ember-700'
                      : isDark
                        ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                        : 'bg-stone-900 text-white hover:bg-stone-800'
                  } ${checkoutLoading ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {checkoutLoading && plan.highlight ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redirecting to payment...
                    </>
                  ) : plan.cta}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="max-w-3xl mx-auto mb-16"
      >
        <h2 className={`text-2xl font-bold font-display text-center mb-8 ${t.text}`}>
          Compare plans
        </h2>
        <div className={`border rounded-xl overflow-hidden ${
          isDark ? 'border-zinc-800' : 'border-stone-200'
        }`}>
          {/* Table header */}
          <div className={`grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] items-center p-4 ${
            isDark ? 'bg-zinc-900' : 'bg-stone-50'
          }`}>
            <div className={`text-sm font-semibold ${t.text}`}>Features</div>
            <div className={`text-sm font-semibold text-center ${t.text}`}>Free</div>
            <div className={`text-sm font-semibold text-center ${isDark ? 'text-ember-500' : 'text-ember-600'}`}>Pro</div>
          </div>
          {/* Feature rows */}
          {[
            { feature: 'Sound analyses', free: '10/mo', pro: true },
            { feature: 'Stem separation', free: '2/mo', pro: true },
            { feature: 'Recipe publishing', free: '3/mo', pro: true },
            { feature: 'Cloud storage', free: '20 analyses', pro: true },
            { feature: 'Vital preset downloads', free: true, pro: true },
            { feature: 'Community access', free: true, pro: true },
            { feature: 'AI instrument detection', free: true, pro: true },
            { feature: 'Create weekly challenges', free: false, pro: true },
            { feature: 'Priority support', free: false, pro: true },
          ].map(({ feature, free, pro }, i) => (
            <div
              key={feature}
              className={`grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] items-center px-4 py-3 border-t ${
                isDark ? 'border-zinc-800' : 'border-stone-200'
              } ${i % 2 === 0
                ? isDark ? 'bg-zinc-950/50' : 'bg-white'
                : isDark ? 'bg-zinc-900/50' : 'bg-stone-50/50'
              }`}
            >
              <div className={`text-sm ${t.textMuted}`}>{feature}</div>
              <div className="flex justify-center">
                {free === true ? (
                  <Check className={`w-4 h-4 ${isDark ? 'text-ember-500' : 'text-ember-600'}`} />
                ) : free === false ? (
                  <Minus className={`w-4 h-4 ${t.textDimmed}`} />
                ) : (
                  <span className={`text-xs ${t.textDimmed}`}>{free}</span>
                )}
              </div>
              <div className="flex justify-center">
                {pro === true ? (
                  <div className="flex items-center gap-1">
                    <Check className={`w-4 h-4 ${isDark ? 'text-ember-500' : 'text-ember-600'}`} />
                    {typeof free === 'string' && (
                      <span className={`text-xs font-medium ${isDark ? 'text-ember-500' : 'text-ember-600'}`}>
                        Unlimited
                      </span>
                    )}
                  </div>
                ) : (
                  <span className={`text-xs ${t.textDimmed}`}>{pro}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* FAQ Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="max-w-2xl mx-auto mb-16"
      >
        <h2 className={`text-2xl font-bold font-display text-center mb-8 ${t.text}`}>
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`border rounded-lg overflow-hidden transition-colors ${
                isDark ? 'border-zinc-800' : 'border-stone-200'
              }`}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800'
                    : 'bg-white hover:bg-stone-50'
                }`}
              >
                <span className={`font-medium ${t.text}`}>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${t.textMuted} ${
                  openFaq === i ? 'rotate-180' : ''
                }`} />
              </button>
              {openFaq === i && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={`px-4 pb-4 text-sm ${t.textMuted}`}
                >
                  {faq.a}
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Value Proposition */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className={`max-w-2xl mx-auto mb-12 p-6 border rounded-lg ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'
        }`}
      >
        <h3 className={`text-lg font-bold font-display mb-4 text-center ${t.text}`}>What Pro producers get</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { stat: 'Unlimited', desc: 'Sound analyses per month' },
            { stat: 'Unlimited', desc: 'Stem separations' },
            { stat: '40+', desc: 'Curated Vital presets' },
          ].map(({ stat, desc }) => (
            <div key={stat + desc} className="text-center">
              <div className={`text-2xl font-bold font-display mb-1 ${isDark ? 'text-ember-500' : 'text-ember-600'}`}>{stat}</div>
              <p className={`text-xs ${t.textMuted}`}>{desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className={`text-center py-12 mb-8 border rounded-lg ${
          isDark
            ? 'bg-zinc-900 border-zinc-800'
            : 'bg-amber-50/50 border-amber-200'
        }`}
      >
        <h2 className={`text-2xl font-bold font-display mb-2 ${t.text}`}>Not sure yet?</h2>
        <p className={`mb-6 ${t.textMuted}`}>
          Try 10 free analyses — no credit card required.
        </p>
        <Link
          to="/analyze"
          className={`inline-flex items-center gap-2 px-8 py-4 text-lg font-medium transition-all rounded-md ${
            isDark
              ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
              : 'bg-ember-600 text-white hover:bg-ember-700'
          }`}
        >
          Start Analyzing Free
          <ArrowRight className="w-5 h-5" />
        </Link>
      </motion.div>

      {/* Auth Modal for guest upgrade */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          theme={theme}
        />
      )}
    </div>
  );
}
