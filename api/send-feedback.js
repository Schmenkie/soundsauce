/**
 * Vercel Serverless Function: Email Handler
 *
 * Routes:
 * - action: 'feedback' (default) — Send user feedback to soundsauceapp@gmail.com
 * - action: 'welcome' — Send welcome email to new user
 *
 * Rate limited to 3 submissions per minute per IP.
 *
 * @param {object} req - Vercel request object (POST)
 * @param {string} [req.body.action] - 'feedback' (default) | 'welcome'
 * @param {object} res - Vercel response object
 * @returns {{ success: boolean }}
 */

import { createClient } from '@supabase/supabase-js';
import { rateLimit } from './_rateLimit.js';
import { validateServerEnv } from './_validateEnv.js';
import { posthog, getDistinctId } from './_posthog.js';

const TYPE_LABELS = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  general: 'General Feedback',
};

// Text-based logo for email (Gmail strips inline SVG)
// Uses table-based wave bars that render in all email clients
const LOGO_HTML = `<table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 12px auto;" role="presentation"><tr><td style="padding: 0 2px;"><div style="width: 4px; height: 10px; background: #09090B; border-radius: 2px;"></div></td><td style="padding: 0 2px;"><div style="width: 4px; height: 18px; background: #09090B; border-radius: 2px;"></div></td><td style="padding: 0 2px;"><div style="width: 4px; height: 24px; background: #09090B; border-radius: 2px;"></div></td><td style="padding: 0 2px;"><div style="width: 4px; height: 16px; background: #09090B; border-radius: 2px;"></div></td><td style="padding: 0 2px;"><div style="width: 4px; height: 8px; background: #09090B; border-radius: 2px;"></div></td></tr></table>`;

const EARLY_USER_THRESHOLD = 200;

// --- Welcome email builder ---

function buildWelcomeEmail(username, { isEarlyUser = false } = {}) {
  const name = username || 'there';
  const earlyUserLine = isEarlyUser
    ? `Thanks for signing up — you're one of our earliest users and that means a lot. `
    : `Thanks for signing up! `;
  const feedbackIntro = isEarlyUser
    ? `Since you're one of our first users, your opinion genuinely shapes what we build next. Hit reply and let me know:`
    : `Your feedback shapes what we build next. Hit reply and let me know:`;
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #09090B; border-radius: 8px; overflow: hidden; border: 1px solid #27272A;">
        <div style="background: linear-gradient(135deg, #F59E0B, #D97706); padding: 28px 24px; text-align: center;">
          ${LOGO_HTML}
          <h1 style="color: #09090B; margin: 0; font-size: 24px; font-weight: 700;">Welcome to SoundSauce!</h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #FAFAFA;">Hey ${name},</p>

          <p style="font-size: 15px; line-height: 1.6; color: #A1A1AA; margin: 0 0 20px 0;">
            ${earlyUserLine}SoundSauce helps you hear any sound and learn exactly how to recreate it.
          </p>

          <div style="text-align: center; margin: 0 0 28px 0;">
            <a href="https://soundsauce.app/analyze" style="display: inline-block; background: #F59E0B; color: #09090B; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-weight: 700; font-size: 16px;">Upload Your First Sound</a>
          </div>

          <div style="background: #18181B; border: 1px solid #3F3F46; border-radius: 8px; padding: 20px; margin: 0 0 28px 0;">
            <h2 style="color: #F59E0B; font-size: 16px; margin: 0 0 16px 0;">Here's how it works:</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 12px 10px 0; vertical-align: top; color: #F59E0B; font-weight: 700; font-size: 18px; width: 32px;">1.</td>
                <td style="padding: 10px 0; font-size: 14px; color: #A1A1AA; line-height: 1.5;"><strong style="color: #FAFAFA;">Upload a sound</strong> — a bass hit, a lead, a pad, anything you want to recreate</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px 10px 0; vertical-align: top; color: #F59E0B; font-weight: 700; font-size: 18px; width: 32px;">2.</td>
                <td style="padding: 10px 0; font-size: 14px; color: #A1A1AA; line-height: 1.5;"><strong style="color: #FAFAFA;">Get the breakdown</strong> — waveform, filter, ADSR, modulation, and a matched Vital preset</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px 10px 0; vertical-align: top; color: #F59E0B; font-weight: 700; font-size: 18px; width: 32px;">3.</td>
                <td style="padding: 10px 0; font-size: 14px; color: #A1A1AA; line-height: 1.5;"><strong style="color: #FAFAFA;">Recreate it</strong> — download the .vital preset, fine-tune it, and make it yours</td>
              </tr>
            </table>
          </div>

          <div style="border-top: 1px solid #3F3F46; padding-top: 24px;">
            <h2 style="color: #FAFAFA; font-size: 16px; margin: 0 0 12px 0;">Quick question — I'd love your feedback</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #A1A1AA; margin: 0 0 16px 0;">
              ${feedbackIntro}
            </p>
            <ul style="color: #A1A1AA; font-size: 14px; line-height: 2; padding-left: 20px; margin: 0 0 20px 0;">
              <li>What sound made you want to sign up?</li>
              <li>What's working well so far?</li>
              <li>What's confusing or could be better?</li>
              <li>What feature would make this a must-have tool for you?</li>
            </ul>
            <p style="font-size: 14px; color: #A1A1AA; margin: 0;">
              Seriously — just hit reply. I read every response personally.
            </p>
          </div>

          <div style="border-top: 1px solid #3F3F46; padding-top: 20px; margin-top: 24px; text-align: center;">
            <p style="font-size: 13px; color: #71717A; margin: 0;">
              — Spencer, creator of <a href="https://soundsauce.app" style="color: #F59E0B; text-decoration: none;">SoundSauce</a>
            </p>
          </div>
        </div>

        <div style="background: #18181B; border-top: 1px solid #27272A; padding: 20px 24px; text-align: center;">
          <p style="font-size: 12px; color: #52525B; margin: 0 0 8px 0;">
            <a href="https://soundsauce.app" style="color: #71717A; text-decoration: none;">soundsauce.app</a>
            &nbsp;&middot;&nbsp;
            <a href="https://soundsauce.app/privacy" style="color: #71717A; text-decoration: none;">Privacy</a>
            &nbsp;&middot;&nbsp;
            <a href="https://soundsauce.app/terms" style="color: #71717A; text-decoration: none;">Terms</a>
          </p>
          <p style="font-size: 11px; color: #3F3F46; margin: 0;">
            SoundSauce &middot; Austin, TX
          </p>
        </div>
      </div>
    </div>
  `;
}

// --- Handler ---

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Strict rate limit: 3 per minute per IP
  if (rateLimit(req, res, { limit: 3 })) return;

  // Check required env vars
  if (validateServerEnv(res, ['RESEND_API_KEY'])) return;

  const { action = 'feedback' } = req.body || {};

  // --- Welcome email route ---
  if (action === 'welcome') {
    const welcomeAuthHeader = req.headers.authorization;
    if (!welcomeAuthHeader || !welcomeAuthHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const welcomeToken = welcomeAuthHeader.replace('Bearer ', '');
    const supabaseAnon = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    const { data: { user: authUser }, error: welcomeAuthError } = await supabaseAnon.auth.getUser(welcomeToken);

    if (welcomeAuthError || !authUser) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const email = authUser.email;
    const { username } = req.body;

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }

    const cleanUsername = username && typeof username === 'string' ? username.trim() : null;

    // Check user count for early user messaging
    let isEarlyUser = false;
    try {
      if (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabaseAdmin = createClient(
          process.env.VITE_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        const { count } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        isEarlyUser = typeof count === 'number' && count < EARLY_USER_THRESHOLD;
      }
    } catch {
      // Non-critical — default to generic messaging
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Spencer from SoundSauce <spencer@soundsauce.app>',
          to: email.trim(),
          reply_to: 'soundsauceapp@gmail.com',
          subject: `Welcome to SoundSauce${cleanUsername ? `, ${cleanUsername}` : ''} — here's how to get started`,
          html: buildWelcomeEmail(cleanUsername, { isEarlyUser }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Resend welcome email error:', response.status, errorData);
        return res.status(500).json({ error: 'Failed to send welcome email.' });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('welcome-email error:', err);
      return res.status(500).json({ error: 'Failed to send welcome email.' });
    }
  }

  // --- Feedback email route (default) ---
  const { type, message, email, page, username } = req.body || {};

  // Validate required fields
  if (!type || !TYPE_LABELS[type]) {
    return res.status(400).json({ error: 'Invalid feedback type. Must be bug, feature, or general.' });
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message too long. Maximum 2000 characters.' });
  }

  const typeLabel = TYPE_LABELS[type];
  const sanitizedMessage = message.trim();
  const subjectSnippet = sanitizedMessage.replace(/[\r\n]+/g, ' ').slice(0, 60);
  const userEmail = email && typeof email === 'string' ? email.trim() : null;

  // Validate email format if provided — reject header injection attempts (CRLF, null bytes)
  if (userEmail) {
    if (/[\r\n\0]/.test(userEmail)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail) || userEmail.length > 254) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
  }
  const userPage = page && typeof page === 'string' ? page.trim() : 'Unknown';
  const userName = username && typeof username === 'string' ? username.trim() : 'Guest';

  // Escape HTML entities to prevent injection in email body
  const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Build email body
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ff4d8d, #ff6b35); padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 18px;">New ${typeLabel}</h2>
      </div>
      <div style="background: #ffffff; padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px; width: 80px;">Type</td>
            <td style="padding: 6px 0; font-size: 13px; font-weight: 600;">${typeLabel}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;">User</td>
            <td style="padding: 6px 0; font-size: 13px;">${escapeHtml(userName)}</td>
          </tr>
          ${userEmail ? `<tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;">Email</td>
            <td style="padding: 6px 0; font-size: 13px;"><a href="mailto:${encodeURI(userEmail)}">${escapeHtml(userEmail)}</a></td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;">Page</td>
            <td style="padding: 6px 0; font-size: 13px;">${escapeHtml(userPage)}</td>
          </tr>
        </table>
        <div style="background: #f8f8f8; padding: 16px; border-radius: 6px; border-left: 3px solid ${type === 'bug' ? '#ef4444' : type === 'feature' ? '#3b82f6' : '#22c55e'};">
          <p style="margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${sanitizedMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SoundSauce Feedback <noreply@soundsauce.app>',
        to: 'soundsauceapp@gmail.com',
        reply_to: userEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail) ? userEmail : undefined,
        subject: `[${typeLabel}] ${subjectSnippet}${sanitizedMessage.length > 60 ? '...' : ''}`,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Resend API error:', response.status, errorData);
      return res.status(500).json({ error: 'Failed to send feedback. Please try again.' });
    }

    posthog.capture({
      distinctId: getDistinctId(req, userName !== 'Guest' ? userName : undefined),
      event: 'feedback_submitted',
      properties: {
        feedback_type: type,
        page: userPage,
      },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    posthog.captureException(err, getDistinctId(req));
    console.error('send-feedback error:', err);
    res.status(500).json({ error: 'Failed to send feedback. Please try again.' });
  }
}
