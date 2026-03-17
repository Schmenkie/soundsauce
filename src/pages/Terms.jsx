import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

export function Terms({ theme, t }) {
  usePageTitle('Terms of Service');

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

      <h1 className={`text-3xl font-bold ${t.text}`}>Terms of Service</h1>
      <p className={`text-sm ${t.textDimmed}`}>Last updated: February 2026</p>

      <div className={`p-6 space-y-6 ${cardClass}`}>
        <section>
          <h2 className={headingClass}>1. Acceptance of Terms</h2>
          <p className={textClass}>By using SoundSauce ("the Service"), you agree to these Terms of Service. If you do not agree, do not use the Service.</p>
        </section>

        <section>
          <h2 className={headingClass}>2. The Service</h2>
          <p className={textClass}>SoundSauce is a web-based platform for audio analysis, sound design learning, and community sharing. The Service provides tools to analyze audio files, generate synthesis recommendations, create and share Sound Sauces, download Vital synth presets, and participate in community features like challenges and discussions.</p>
        </section>

        <section>
          <h2 className={headingClass}>3. Accounts</h2>
          <div className={`space-y-2 ${textClass}`}>
            <p>You may use SoundSauce without an account for basic audio analysis. Creating an account gives you access to saving analyses, publishing content, and community features.</p>
            <p>You are responsible for maintaining the security of your account. You must be at least 13 years old to create an account.</p>
          </div>
        </section>

        <section>
          <h2 className={headingClass}>4. User Content</h2>
          <div className={`space-y-2 ${textClass}`}>
            <p>You retain ownership of any audio files you upload and content you create. By publishing Sound Sauces, presets, or comments, you grant SoundSauce a non-exclusive license to display that content to other users on the platform.</p>
            <p>You must only upload audio that you have the right to use. Do not upload copyrighted music you don't own for sharing purposes. Personal analysis of your own music library is acceptable.</p>
          </div>
        </section>

        <section>
          <h2 className={headingClass}>5. Subscriptions and Payments</h2>
          <div className={`space-y-2 ${textClass}`}>
            <p>SoundSauce offers Free and Pro ($10/month) subscription tiers. Paid subscriptions are billed monthly through Stripe and renew automatically until canceled.</p>
            <p>You can cancel your subscription at any time through the billing portal in Settings. Cancellation takes effect at the end of the current billing period. We do not offer refunds for partial months.</p>
          </div>
        </section>

        <section>
          <h2 className={headingClass}>6. Acceptable Use</h2>
          <div className={`space-y-2 ${textClass}`}>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Service for any illegal purpose</li>
              <li>Upload malicious files or attempt to compromise the Service</li>
              <li>Harass, abuse, or threaten other users</li>
              <li>Spam, send unsolicited messages, or post irrelevant content</li>
              <li>Attempt to circumvent usage limits or subscription restrictions</li>
              <li>Scrape, crawl, or automatically access the Service beyond normal use</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className={headingClass}>7. Third-Party Services</h2>
          <p className={textClass}>SoundSauce integrates with third-party services (Stripe for payments, Replicate for stem separation, Supabase for data storage). Your use of these services is subject to their respective terms. Vital synth presets are designed for use with the Vital synthesizer by Matt Tytel — SoundSauce is not affiliated with Vital.</p>
        </section>

        <section>
          <h2 className={headingClass}>8. Disclaimers</h2>
          <div className={`space-y-2 ${textClass}`}>
            <p>Audio analysis results (BPM, key, instrument detection, synthesis recommendations) are algorithmic estimates and may not be perfectly accurate. Sound Sauces are educational guides, not guaranteed replications.</p>
            <p>The Service is provided "as is" without warranties of any kind.</p>
          </div>
        </section>

        <section>
          <h2 className={headingClass}>9. Limitation of Liability</h2>
          <p className={textClass}>SoundSauce is not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including but not limited to lost data, lost profits, or service interruptions.</p>
        </section>

        <section>
          <h2 className={headingClass}>10. Changes to Terms</h2>
          <p className={textClass}>We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated terms. We will notify users of significant changes via email or in-app notification.</p>
        </section>

        <section>
          <h2 className={headingClass}>11. Contact</h2>
          <p className={textClass}>Questions about these terms? Contact us at <a href="mailto:soundsauceapp@gmail.com" className={theme === 'dark' ? 'text-ember-500 hover:underline' : 'text-ember-600 hover:underline'}>soundsauceapp@gmail.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
