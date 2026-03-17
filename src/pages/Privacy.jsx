import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

export function Privacy({ theme, t }) {
  usePageTitle('Privacy Policy');

  const cardClass = theme === 'dark'
    ? 'bg-zinc-900 border border-zinc-800 rounded-lg'
    : 'bg-white border border-stone-200 rounded-lg';

  const headingClass = `text-lg font-bold mb-3 ${t.text}`;
  const textClass = `text-sm leading-relaxed ${t.textMuted}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/"
        className={`inline-flex items-center gap-2 text-sm font-medium ${t.textMuted} ${theme === 'dark' ? 'hover:text-zinc-50' : 'hover:text-stone-900'} transition-colors`}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <h1 className={`text-3xl font-bold ${t.text}`}>Privacy Policy</h1>
      <p className={`text-sm ${t.textDimmed}`}>Last updated: February 2026</p>

      <div className={`p-6 space-y-6 ${cardClass}`}>
        <section>
          <h2 className={headingClass}>1. Information We Collect</h2>
          <div className={`space-y-3 ${textClass}`}>
            <p><strong className={t.text}>Account Information:</strong> When you create an account, we collect your email address, username, and optionally your profile photo and bio. If you sign in with Google, we receive your name, email, and profile picture from Google.</p>
            <p><strong className={t.text}>Audio Files:</strong> Audio files you upload are processed in your browser for analysis. Files uploaded for stem separation or preset sharing are stored temporarily on our servers (Vercel Blob). We do not listen to, analyze, or sell your audio content.</p>
            <p><strong className={t.text}>Usage Data:</strong> We collect anonymous product analytics (page views, feature usage) through PostHog to improve the product. We also use Sentry for error monitoring to identify and fix crashes.</p>
            <p><strong className={t.text}>Payment Information:</strong> Subscription payments are processed by Stripe. We never see or store your credit card details. Stripe handles all payment data under their own privacy policy.</p>
          </div>
        </section>

        <section>
          <h2 className={headingClass}>2. How We Use Your Information</h2>
          <div className={`space-y-2 ${textClass}`}>
            <p>We use your information to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide and maintain the SoundSauce service</li>
              <li>Store your analyses, presets, and community content</li>
              <li>Process subscription payments</li>
              <li>Send transactional emails (password resets, signup confirmations)</li>
              <li>Improve the product through anonymous usage analytics</li>
              <li>Monitor and fix technical issues</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className={headingClass}>3. Data Sharing</h2>
          <p className={textClass}>We do not sell your personal data. We share data only with service providers necessary to operate SoundSauce: Supabase (database and authentication), Vercel (hosting and file storage), Stripe (payments), PostHog (analytics), Sentry (error monitoring), Replicate (stem separation processing), Google AI/Gemini (audio data is sent to Google AI for instrument detection), and Resend (feedback emails are sent via Resend email delivery service).</p>
        </section>

        <section>
          <h2 className={headingClass}>4. Public Content</h2>
          <p className={textClass}>Sound Sauces, presets, comments, and profile information that you choose to make public are visible to other users and may appear in search results. You can delete your public content or make analyses private at any time.</p>
        </section>

        <section>
          <h2 className={headingClass}>5. Data Storage and Security</h2>
          <p className={textClass}>Your data is stored securely using Supabase (PostgreSQL with Row Level Security) and Vercel infrastructure. Audio analysis runs entirely in your browser — raw audio data is not sent to our servers unless you use stem separation or upload a preset. All connections use HTTPS encryption.</p>
        </section>

        <section>
          <h2 className={headingClass}>6. Cookies</h2>
          <p className={textClass}>We use essential cookies for authentication (keeping you signed in). PostHog may set analytics cookies to understand product usage. You can disable analytics cookies in your browser settings.</p>
        </section>

        <section>
          <h2 className={headingClass}>7. Your Rights</h2>
          <div className={`space-y-2 ${textClass}`}>
            <p>You can:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access, update, or delete your profile information in Settings</li>
              <li>Delete your analyses and public content</li>
              <li>Cancel your subscription at any time through the billing portal</li>
              <li>Request a full data export or account deletion by contacting us</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className={headingClass}>8. Contact</h2>
          <p className={textClass}>If you have questions about this privacy policy or your data, contact us at <a href="mailto:soundsauceapp@gmail.com" className={theme === 'dark' ? 'text-ember-500 hover:underline' : 'text-ember-600 hover:underline'}>soundsauceapp@gmail.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
