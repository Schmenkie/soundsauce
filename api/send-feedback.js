/**
 * Vercel Serverless Function: Send Feedback Email
 *
 * Receives user feedback (bug report, feature request, general)
 * and sends it to soundsauceapp@gmail.com via Resend HTTP API.
 *
 * Rate limited to 3 submissions per minute per IP to prevent abuse.
 *
 * @param {object} req - Vercel request object (POST)
 * @param {string} req.body.type - 'bug' | 'feature' | 'general'
 * @param {string} req.body.message - Feedback message (max 2000 chars)
 * @param {string} [req.body.email] - Optional reply-to email
 * @param {string} [req.body.page] - Page the user was on
 * @param {string} [req.body.username] - Username if authenticated
 * @param {object} res - Vercel response object
 * @returns {{ success: boolean }}
 */

import { rateLimit } from './_rateLimit.js';
import { validateServerEnv } from './_validateEnv.js';

const TYPE_LABELS = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  general: 'General Feedback',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Strict rate limit: 3 per minute per IP
  if (rateLimit(req, res, { limit: 3 })) return;

  // Check required env vars
  if (validateServerEnv(res, ['RESEND_API_KEY'])) return;

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
        subject: `[${typeLabel}] ${sanitizedMessage.slice(0, 60)}${sanitizedMessage.length > 60 ? '...' : ''}`,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Resend API error:', response.status, errorData);
      return res.status(500).json({ error: 'Failed to send feedback. Please try again.' });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('send-feedback error:', err);
    res.status(500).json({ error: 'Failed to send feedback. Please try again.' });
  }
}
