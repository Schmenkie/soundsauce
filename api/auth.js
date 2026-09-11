/**
 * Vercel Serverless Function: Lab sign-in
 *
 * POST { password } -> { token, expiresAt }
 * GET  (with Authorization: Bearer <token>) -> { ok: true, expiresAt } | 401
 *
 * Single-user password gate. See _auth.js for the token scheme.
 */

import { rateLimit } from './_rateLimit.js';
import { checkPassword, issueToken, verifyToken } from './_auth.js';

export default async function handler(req, res) {
  if (!process.env.LAB_PASSWORD) {
    return res.status(500).json({ error: 'LAB_PASSWORD is not configured' });
  }

  if (req.method === 'GET') {
    const header = req.headers.authorization || '';
    const payload = verifyToken(header.startsWith('Bearer ') ? header.slice(7) : null);
    if (!payload) return res.status(401).json({ error: 'Invalid or expired session' });
    return res.status(200).json({ ok: true, expiresAt: payload.exp });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Brute-force guard: 5 attempts per minute per IP
  if (rateLimit(req, res, { limit: 5 })) return;

  const { password } = req.body || {};
  if (!checkPassword(password)) {
    return res.status(401).json({ error: 'Wrong password' });
  }

  return res.status(200).json(issueToken());
}
