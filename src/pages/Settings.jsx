import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings as SettingsIcon, Mail, Lock, Sun, Moon, Eye, EyeOff, Globe, Save, Loader2, Check, AlertCircle, Zap, CreditCard, BarChart3, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, usePageTitle } from '../hooks';
import { AuthModal } from '../components/auth';
import { AvatarCreator } from '../components/settings';

const DAW_OPTIONS = ['Ableton Live', 'FL Studio', 'Logic Pro', 'Bitwig', 'Reaper', 'Pro Tools', 'Other'];

/**
 * Settings page — account management, preferences, and avatar selection.
 * Separated from Profile (which is public-facing info only).
 */
export function Settings({ theme, t, onThemeToggle }) {
  usePageTitle('Settings');
  const { user, profile, loading: authLoading, updateProfile, updateEmail, updatePassword, isSubscribed, isPro, refreshProfile } = useAuth();
  const subscription = useSubscription();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  // DAW preference state
  const [dawPreference, setDawPreference] = useState('');
  const [dawSaving, setDawSaving] = useState(false);
  const [dawSaved, setDawSaved] = useState(false);

  // Default visibility state (localStorage)
  const [defaultVisibility, setDefaultVisibility] = useState(() => {
    try {
      return localStorage.getItem('audioAnalyzer_defaultVisibility') || 'private';
    } catch {
      return 'private';
    }
  });

  // Sync DAW preference with profile
  useEffect(() => {
    if (profile) {
      setDawPreference(profile.daw_preference || '');
    }
  }, [profile]);

  // Detect checkout success from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      setCheckoutSuccess(true);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      // Refresh profile to pick up new subscription tier
      if (refreshProfile) refreshProfile();
      // Auto-dismiss after 8 seconds
      setTimeout(() => setCheckoutSuccess(false), 8000);
    }
  }, [refreshProfile]);

  // Handle upgrade click
  const handleUpgrade = async (priceId) => {
    if (subscription?.startCheckout) {
      await subscription.startCheckout(priceId);
    }
  };

  // Handle manage subscription click
  const handleManageSubscription = async () => {
    setPortalLoading(true);
    if (subscription?.openBillingPortal) {
      await subscription.openBillingPortal();
    }
    setPortalLoading(false);
  };

  // Handle email change
  const handleEmailChange = async () => {
    if (!newEmail.trim()) return;
    setEmailSaving(true);
    setEmailMessage(null);

    const { error } = await updateEmail(newEmail.trim());

    if (error) {
      setEmailMessage({ type: 'error', text: error.message });
    } else {
      setEmailMessage({ type: 'success', text: `Confirmation email sent to ${newEmail}. Please verify it to complete the change.` });
      setNewEmail('');
    }
    setEmailSaving(false);
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage(null);

    const { error } = await updatePassword(newPassword);

    if (error) {
      setPasswordMessage({ type: 'error', text: error.message });
    } else {
      setPasswordMessage({ type: 'success', text: 'Password updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordSaving(false);
  };

  // Handle DAW preference save
  const handleDawSave = async () => {
    setDawSaving(true);
    setDawSaved(false);
    await updateProfile({ daw_preference: dawPreference || null });
    setDawSaving(false);
    setDawSaved(true);
    setTimeout(() => setDawSaved(false), 2000);
  };

  // Handle visibility toggle
  const handleVisibilityChange = (value) => {
    setDefaultVisibility(value);
    try {
      localStorage.setItem('audioAnalyzer_defaultVisibility', value);
    } catch {
      // localStorage not available
    }
  };

  // Guest view
  if (!authLoading && !user) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${t.text}`}>Settings</h1>
          <p className={t.textMuted}>Manage your account and preferences</p>
        </div>

        {/* Theme is accessible to guests */}
        <div className="mb-8">
          <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
            {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            Theme
          </h3>
          <div className={`p-6 border rounded-lg ${
            theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
          }`}>
            <div className="flex gap-3">
              <button
                onClick={() => { if (theme !== 'dark') onThemeToggle(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 font-medium transition-all rounded-md ${
                  theme === 'dark'
                    ? 'bg-white text-black'
                    : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                      : 'border border-stone-200 text-stone-500 hover:border-ember-600'
                }`}
              >
                <Moon className="w-4 h-4" />
                Dark
              </button>
              <button
                onClick={() => { if (theme !== 'light') onThemeToggle(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 font-medium transition-all rounded-md ${
                  theme === 'light'
                    ? 'bg-ember-600 text-white'
                    : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                      : 'border border-stone-200 text-stone-500 hover:border-ember-600'
                }`}
              >
                <Sun className="w-4 h-4" />
                Light
              </button>
            </div>
          </div>
        </div>

        {/* Sign in prompt for other settings */}
        <div className={`p-8 border rounded-lg ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
        }`}>
          <p className={`mb-4 ${t.textMuted}`}>
            Sign in to manage your account, preferences, and avatar.
          </p>
          <button
            onClick={() => setAuthModalOpen(true)}
            className={`w-full py-3 font-medium rounded-md ${
              theme === 'dark'
                ? 'bg-white text-black hover:bg-zinc-200'
                : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-500/20'
            }`}
          >
            Sign In / Create Account
          </button>
        </div>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          theme={theme}
        />
      </div>
    );
  }

  const inputClass = `w-full px-4 py-3 border outline-none transition-colors rounded-md focus:ring-2 ${
    theme === 'dark'
      ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 focus:border-ember-500 focus:ring-ember-500/30'
      : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400 focus:border-ember-600 focus:ring-ember-600/20'
  }`;

  const selectClass = `w-full px-4 py-3 border outline-none transition-colors rounded-md focus:ring-2 ${
    theme === 'dark'
      ? 'bg-zinc-950 border-zinc-700 text-white focus:border-ember-500 focus:ring-ember-500/30'
      : 'bg-stone-50 border-stone-200 text-stone-900 focus:border-ember-600 focus:ring-ember-600/20'
  }`;

  // Authenticated view
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${t.text}`}>Settings</h1>
        <p className={t.textMuted}>Manage your account and preferences</p>
      </div>

      {/* Checkout Success Banner */}
      {checkoutSuccess && (
        <div role="alert" className={`mb-6 p-4 border flex items-center gap-3 rounded-lg ${
          theme === 'dark'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          <Check className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-medium">Subscription activated!</div>
            <div className={`text-sm ${theme === 'dark' ? 'text-green-400/70' : 'text-green-600'}`}>
              Your plan has been upgraded. Enjoy your new features!
            </div>
          </div>
        </div>
      )}

      {/* Avatar Section */}
      <div className="mb-8">
        <AvatarCreator theme={theme} t={t} />
      </div>

      {/* Subscription & Billing Section */}
      <div className="mb-8">
        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
          <CreditCard className="w-5 h-5" />
          Subscription & Billing
        </h3>

        <div className={`p-6 border space-y-6 rounded-lg ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
        }`}>
          {/* Current Plan Display */}
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${t.textDimmed} mb-1`}>Current Plan</div>
              <div className="flex items-center gap-2">
                {isPro && (
                  <Zap className={`w-5 h-5 ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`} />
                )}
                <span className={`text-lg font-bold ${t.text}`}>
                  {isPro ? 'Pro' : 'Free'}
                </span>
                {isSubscribed && (
                  <span className={`text-sm ${t.textMuted}`}>
                    $10/mo
                  </span>
                )}
              </div>
              {profile?.subscription_status === 'past_due' && (
                <div className="text-sm text-red-400 mt-1">Payment past due — please update your payment method</div>
              )}
              {profile?.subscription_status === 'canceled' && (
                <div className={`text-sm mt-1 ${t.textDimmed}`}>Plan canceled — access continues until period ends</div>
              )}
            </div>
            {isSubscribed && (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors rounded-md ${
                  theme === 'dark'
                    ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                    : 'border border-stone-200 text-stone-500 hover:border-ember-600 hover:text-ember-600'
                }`}
              >
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Manage Subscription
              </button>
            )}
          </div>

          {/* Compare Plans link — for free tier users */}
          {!isSubscribed && (
            <Link
              to="/pricing"
              className={`inline-flex items-center gap-2 text-sm font-medium ${
                theme === 'dark' ? 'text-ember-500 hover:text-white' : 'text-ember-600 hover:text-ember-700'
              }`}
            >
              <Zap className="w-4 h-4" />
              Compare plans
            </Link>
          )}

          {/* Usage Stats (for subscribed users) */}
          {isSubscribed && subscription && (
            <div className={`pt-4 border-t ${theme === 'dark' ? 'border-zinc-700' : 'border-stone-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className={`w-4 h-4 ${t.textMuted}`} />
                <span className={`text-sm font-medium ${t.textMuted}`}>Usage This Month</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Analyses', used: subscription.usage?.analyses_count || 0, limit: subscription.limits?.analyses, remaining: subscription.analysesRemaining },
                  { label: 'Stem Separations', used: subscription.usage?.stems_count || 0, limit: subscription.limits?.stems, remaining: subscription.stemsRemaining },
                  { label: 'Recipe Publishes', used: subscription.usage?.publishes_count || 0, limit: subscription.limits?.publishes, remaining: subscription.publishesRemaining },
                  { label: 'Saved Analyses', used: subscription.totalAnalyses || 0, limit: subscription.limits?.storage, remaining: subscription.storageRemaining },
                ].map((stat) => (
                  <div key={stat.label} className={`p-3 border rounded-lg ${
                    theme === 'dark' ? 'bg-zinc-950 border-zinc-700' : 'bg-stone-50 border-stone-200'
                  }`}>
                    <div className={`text-xs ${t.textDimmed} mb-1`}>{stat.label}</div>
                    <div className={`text-sm font-bold ${t.text}`}>
                      {stat.used}{stat.limit !== Infinity ? `/${stat.limit}` : ''}
                    </div>
                    <div className={`text-xs ${t.textDimmed}`}>
                      {stat.limit === Infinity ? 'Unlimited' : `${stat.remaining} remaining`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Usage Stats (for free users) */}
          {!isSubscribed && subscription && (
            <div className={`pt-4 border-t ${theme === 'dark' ? 'border-zinc-700' : 'border-stone-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className={`w-4 h-4 ${t.textMuted}`} />
                <span className={`text-sm font-medium ${t.textMuted}`}>Free Tier Usage This Month</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Analyses', used: subscription.usage?.analyses_count || 0, limit: 10 },
                  { label: 'Stem Separations', used: subscription.usage?.stems_count || 0, limit: 2 },
                  { label: 'Recipe Publishes', used: subscription.usage?.publishes_count || 0, limit: 3 },
                  { label: 'Saved Analyses', used: subscription.totalAnalyses || 0, limit: 20 },
                ].map((stat) => {
                  const pct = Math.min(100, (stat.used / stat.limit) * 100);
                  return (
                    <div key={stat.label} className={`p-3 border rounded-lg ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-700' : 'bg-stone-50 border-stone-200'
                    }`}>
                      <div className={`text-xs ${t.textDimmed} mb-1`}>{stat.label}</div>
                      <div className={`text-sm font-bold ${t.text}`}>{stat.used}/{stat.limit}</div>
                      <div className={`w-full h-1.5 mt-1.5 rounded-full ${theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'}`}>
                        <div
                          className={`h-full transition-all rounded-full ${
                            pct >= 100
                              ? 'bg-red-500'
                              : pct >= 80
                                ? theme === 'dark' ? 'bg-amber-400' : 'bg-amber-500'
                                : theme === 'dark' ? 'bg-ember-500' : 'bg-ember-600'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upgrade Plan (for free users) */}
          {!isSubscribed && (
            <div className={`pt-4 border-t ${theme === 'dark' ? 'border-zinc-700' : 'border-stone-200'}`}>
              <div className={`text-sm font-medium mb-3 ${t.text}`}>Upgrade Your Plan</div>
              <div className={`p-4 border transition-all rounded-lg ${
                theme === 'dark'
                  ? 'border-zinc-700 hover:border-zinc-500'
                  : 'border-stone-200 hover:border-ember-600'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className={`w-5 h-5 ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`} />
                  <span className={`font-bold ${t.text}`}>Pro</span>
                </div>
                <div className={`text-2xl font-bold mb-3 ${t.text}`}>$10<span className={`text-sm font-normal ${t.textMuted}`}>/mo</span></div>
                <ul className="space-y-1.5 mb-4">
                  {['Unlimited analyses', 'Unlimited stem separations', 'Unlimited cloud storage', 'Unlimited recipe sharing'].map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${t.textMuted}`}>
                      <Check className="w-3.5 h-3.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleUpgrade('pro')}
                  className={`w-full py-2.5 text-sm font-medium transition-colors rounded-md ${
                    theme === 'dark'
                      ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
                      : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-500/20'
                  }`}
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Section */}
      <div className="mb-8">
        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
          <SettingsIcon className="w-5 h-5" />
          Account
        </h3>

        <div className={`p-6 border space-y-6 rounded-lg ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
        }`}>
          {/* Current Email Display */}
          <div>
            <div className={`text-sm ${t.textDimmed} mb-1`}>Current email</div>
            <div className={`text-sm font-medium ${t.text}`}>{user?.email}</div>
          </div>

          {/* Change Email */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${t.textMuted}`}>
              <Mail className="w-3.5 h-3.5 inline mr-1" />
              New Email Address
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email"
                className={inputClass}
              />
              <button
                onClick={handleEmailChange}
                disabled={!newEmail.trim() || emailSaving}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all rounded-md ${
                  !newEmail.trim()
                    ? theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : theme === 'dark'
                      ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
                      : 'bg-ember-600 text-white hover:bg-ember-700'
                }`}
              >
                {emailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
              </button>
            </div>
            {emailMessage && (
              <div role="alert" className={`flex items-start gap-2 mt-2 text-sm ${
                emailMessage.type === 'error' ? 'text-red-400' : 'text-green-400'
              }`}>
                {emailMessage.type === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                {emailMessage.text}
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className={`pt-4 border-t ${theme === 'dark' ? 'border-zinc-700' : 'border-stone-200'}`}>
            <label className={`block text-sm font-medium mb-1.5 ${t.textMuted}`}>
              <Lock className="w-3.5 h-3.5 inline mr-1" />
              New Password
            </label>
            <div className="space-y-2 mb-3">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 6 characters)"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textDimmed} ${theme === 'dark' ? 'hover:text-zinc-400' : 'hover:text-stone-500'}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className={inputClass}
              />
            </div>
            <button
              onClick={handlePasswordChange}
              disabled={!newPassword || !confirmPassword || passwordSaving}
              className={`px-4 py-2.5 text-sm font-medium transition-all rounded-md ${
                !newPassword || !confirmPassword
                  ? theme === 'dark'
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : theme === 'dark'
                    ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
                    : 'bg-ember-600 text-white hover:bg-ember-700'
              }`}
            >
              {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
            </button>
            {passwordMessage && (
              <div role="alert" className={`flex items-start gap-2 mt-2 text-sm ${
                passwordMessage.type === 'error' ? 'text-red-400' : 'text-green-400'
              }`}>
                {passwordMessage.type === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                {passwordMessage.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="mb-8">
        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
          <Save className="w-5 h-5" />
          Preferences
        </h3>

        <div className={`p-6 border space-y-6 rounded-lg ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
        }`}>
          {/* Theme Toggle */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${t.textMuted}`}>Theme</label>
            <div className="flex gap-3">
              <button
                onClick={() => { if (theme !== 'dark') onThemeToggle(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 font-medium transition-all rounded-md ${
                  theme === 'dark'
                    ? 'bg-white text-black'
                    : 'border border-stone-200 text-stone-500 hover:border-ember-600'
                }`}
              >
                <Moon className="w-4 h-4" />
                Dark
              </button>
              <button
                onClick={() => { if (theme !== 'light') onThemeToggle(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 font-medium transition-all rounded-md ${
                  theme === 'light'
                    ? 'bg-ember-600 text-white'
                    : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                      : 'border border-stone-200 text-stone-500 hover:border-ember-600'
                }`}
              >
                <Sun className="w-4 h-4" />
                Light
              </button>
            </div>
          </div>

          {/* DAW Preference */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${t.textMuted}`}>DAW Preference</label>
            <p className={`text-xs mb-2 ${t.textDimmed}`}>
              Sound Sauces will recommend plugins native to your DAW
            </p>
            <div className="flex gap-2">
              <select
                value={dawPreference}
                onChange={(e) => setDawPreference(e.target.value)}
                className={selectClass}
              >
                <option value="">Select DAW</option>
                {DAW_OPTIONS.map((daw) => (
                  <option key={daw} value={daw}>{daw}</option>
                ))}
              </select>
              <button
                onClick={handleDawSave}
                disabled={dawSaving}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all rounded-md ${
                  dawSaved
                    ? theme === 'dark'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-green-50 text-green-700 border border-green-200'
                    : theme === 'dark'
                      ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
                      : 'bg-ember-600 text-white hover:bg-ember-700'
                }`}
              >
                {dawSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : dawSaved ? <Check className="w-4 h-4" /> : 'Save'}
              </button>
            </div>
          </div>

          {/* Default Visibility */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${t.textMuted}`}>Default Analysis Visibility</label>
            <p className={`text-xs mb-2 ${t.textDimmed}`}>
              New analyses will default to this visibility setting
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleVisibilityChange('private')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all rounded-md ${
                  defaultVisibility === 'private'
                    ? theme === 'dark'
                      ? 'bg-white text-black'
                      : 'bg-ember-600 text-white'
                    : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                      : 'border border-stone-200 text-stone-500 hover:border-ember-600'
                }`}
              >
                <Lock className="w-4 h-4" />
                Private
              </button>
              <button
                onClick={() => handleVisibilityChange('public')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all rounded-md ${
                  defaultVisibility === 'public'
                    ? theme === 'dark'
                      ? 'bg-white text-black'
                      : 'bg-ember-600 text-white'
                    : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                      : 'border border-stone-200 text-stone-500 hover:border-ember-600'
                }`}
              >
                <Globe className="w-4 h-4" />
                Public
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
