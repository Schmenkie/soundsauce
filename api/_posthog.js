/**
 * Shared PostHog server-side client for Vercel serverless functions.
 *
 * Uses flushAt:1 / flushInterval:0 so every capture is sent immediately —
 * required for short-lived serverless invocations that don't persist between requests.
 */

import { PostHog } from 'posthog-node';

let _client = null;

function getClient() {
  if (!_client) {
    _client = new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
      enableExceptionAutocapture: true,
    });
  }
  return _client;
}

export const posthog = new Proxy({}, {
  get(_, prop) {
    return getClient()[prop].bind(getClient());
  },
});

/**
 * Read the client's PostHog distinct ID from the X-POSTHOG-DISTINCT-ID header.
 * Falls back to the authenticated user's ID so server events are always linkable.
 *
 * @param {object} req - Vercel request object
 * @param {string} [fallbackUserId] - Authenticated user ID to use if header is absent
 * @returns {string}
 */
export function getDistinctId(req, fallbackUserId) {
  return req.headers['x-posthog-distinct-id'] || fallbackUserId || 'anonymous';
}
