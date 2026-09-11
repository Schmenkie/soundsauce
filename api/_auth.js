/**
 * Lab auth — single-user password gate for the Remix Lab API.
 *
 * Replaces Supabase JWT auth. The only thing auth protects here is spend: stem
 * separation (Replicate GPU) and Blob uploads. One shared password is plenty.
 *
 * Token format: base64url(JSON payload) + "." + HMAC-SHA256(payload) hex.
 * Payload: { exp: <unix ms>, v: 1 }. Issued by /api/auth, verified by requireLab().
 *
 * Env:
 *   LAB_PASSWORD        — the password (required)
 *   LAB_SESSION_SECRET  — HMAC secret for tokens (falls back to LAB_PASSWORD)
 */

import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret() {
  return process.env.LAB_SESSION_SECRET || process.env.LAB_PASSWORD || '';
}

function sign(payloadB64) {
  return createHmac('sha256', getSecret()).update(payloadB64).digest('hex');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Constant-time password check against LAB_PASSWORD. */
export function checkPassword(candidate) {
  const expected = process.env.LAB_PASSWORD;
  if (!expected || typeof candidate !== 'string') return false;
  return safeEqual(candidate, expected);
}

/** Issue a signed session token. */
export function issueToken() {
  const payload = { exp: Date.now() + TOKEN_TTL_MS, v: 1 };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { token: `${payloadB64}.${sign(payloadB64)}`, expiresAt: payload.exp };
}

/** Verify a token string. Returns the payload or null. */
export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !getSecret()) return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, sign(payloadB64))) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Express-style guard for API handlers. Sends 401 and returns null on failure,
 * otherwise returns the token payload.
 *
 *   const session = requireLab(req, res);
 *   if (!session) return;
 */
export function requireLab(req, res) {
  if (!process.env.LAB_PASSWORD) {
    res.status(500).json({ error: 'LAB_PASSWORD is not configured' });
    return null;
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Sign in to the lab to continue' });
    return null;
  }
  return payload;
}

/** HMAC used to bind Replicate prediction IDs to this lab (IDOR guard in check-stems). */
export function signPredictionId(predictionId) {
  return createHmac('sha256', getSecret()).update(`prediction:${predictionId}`).digest('hex');
}
