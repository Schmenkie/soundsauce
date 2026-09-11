/**
 * Lab auth client — single-user password session for the Remix Lab.
 *
 * The token from /api/auth is stored in localStorage and sent as a Bearer header
 * on every /api call that costs money (uploads, separation, instrument detection).
 * Nothing in the browser is secret; the server verifies the HMAC.
 */

const STORAGE_KEY = 'soundsauce_lab_session';

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.token || !session?.expiresAt || session.expiresAt < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/** Current session token, or null. */
export function getLabToken() {
  return readSession()?.token ?? null;
}

/** `{ Authorization: 'Bearer …' }` or `{}` — spread into fetch headers. */
export function labAuthHeaders() {
  const token = getLabToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Exchange the lab password for a session. Throws on wrong password / network error. */
export async function labSignIn(password) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Sign in failed');
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token, expiresAt: data.expiresAt }));
  } catch {
    // Private mode / blocked storage — the session just won't persist across reloads
  }
  return data;
}

/** Ask the server whether the stored token is still valid. */
export async function labVerify() {
  const token = getLabToken();
  if (!token) return false;
  try {
    const res = await fetch('/api/auth', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    // Network errors / 5xx: trust the local expiry rather than logging the user out
    return true;
  } catch {
    return true;
  }
}

export function labSignOut() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
