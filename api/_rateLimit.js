/**
 * Simple in-memory rate limiter for Vercel Serverless Functions.
 * Uses a sliding window approach. Note: each Vercel function instance
 * has its own memory, so this is per-instance limiting (still effective
 * against single-origin bursts, which is the main threat).
 */

const windowMs = 60 * 1000; // 1 minute window

// Map of IP -> { count, resetTime }
const store = new Map();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store) {
    if (now > value.resetTime) store.delete(key);
  }
}, 60 * 1000);

export function rateLimit(req, res, { limit = 60, identifier } = {}) {
  const ip = identifier || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'unknown';
  const now = Date.now();
  const record = store.get(ip);

  if (!record || now > record.resetTime) {
    store.set(ip, { count: 1, resetTime: now + windowMs });
    return false; // not limited
  }

  record.count++;

  if (record.count > limit) {
    res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return true; // limited
  }

  return false; // not limited
}
