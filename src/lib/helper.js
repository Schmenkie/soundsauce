/**
 * Client for the local Remix Lab helper (helper/remix-helper.mjs) — yt-dlp on
 * your own machine, reachable at http://localhost:7331 from both the dev server
 * and the deployed site (browsers exempt localhost from mixed-content rules).
 */

const STORAGE_KEY = 'soundsauce_helper_url';
export const DEFAULT_HELPER_URL = 'http://localhost:7331';

export function getHelperUrl() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_HELPER_URL;
  } catch {
    return DEFAULT_HELPER_URL;
  }
}

export function setHelperUrl(url) {
  try {
    if (url && url !== DEFAULT_HELPER_URL) localStorage.setItem(STORAGE_KEY, url);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

async function request(path, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${getHelperUrl()}${path}`, { ...options, signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Helper error (${res.status})`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** Returns health info or null if the helper isn't running. */
export async function helperHealth() {
  try {
    return await request('/health', {}, 3000);
  } catch {
    return null;
  }
}

/** URL or search text -> candidate tracks. Searches can take ~10s (two platforms). */
export function helperResolve(query) {
  return request('/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  }, 90000);
}

export function helperStartJob(url) {
  return request('/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
}

export function helperJob(id) {
  return request(`/jobs/${id}`);
}

/**
 * Ask the helper to download stems into ~/Music/Remix Lab/Stems/<folder>/ (Live's browser).
 * @param {{ folder: string, files: {name:string,url:string}[], notes?: string }} payload
 * @returns {Promise<{ dir: string, files: string[] }>}
 */
export function helperSaveStems(payload) {
  return request('/stems', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, 180000);
}

/**
 * Start a "lock to tempo" render: the helper resamples each stem, bends it onto the grid
 * with rubberband and writes the FLACs into ~/Music/Remix Lab/Stems/<folder>/.
 * Returns a job id — poll it with helperLockJob().
 * @param {{ folder: string, files: {name:string,url:string}[], lock: object, notes?: string }} payload
 * @returns {Promise<{ id: string }>}
 */
export function helperStartLock(payload) {
  return request('/lock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, 60000);
}

export function helperLockJob(id) {
  return request(`/lock/${id}`);
}

export function helperFileUrl(id) {
  return `${getHelperUrl()}/files/${id}`;
}

export function helperThumbUrl(id) {
  return `${getHelperUrl()}/files/${id}/thumb`;
}

/** Detect a YouTube / SoundCloud link in arbitrary text (e.g. clipboard). */
export function extractMediaUrl(text) {
  if (!text) return null;
  const m = String(text).match(/https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be|soundcloud\.com|on\.soundcloud\.com)\/[^\s"'<>]+/i);
  return m ? m[0] : null;
}

export function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '';
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// --- Apple Music library index ---------------------------------------------

/** The local library index: playlists, analysed rows and the batch's running totals. */
export function helperLibrary() {
  return request('/library', {}, 30000);
}

/** Every user playlist, live from Music. Slow — it counts the tracks of each one. */
export function helperPlaylists() {
  return request('/library/playlists', {}, 180000);
}

/** Pull a playlist into the index. Returns a job id — poll with helperSyncJob(). */
export function helperStartSync(persistentId) {
  return request('/library/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persistentId }),
  });
}

export function helperSyncJob(id) {
  return request(`/library/sync/${id}`);
}

export function helperAnalysis() {
  return request('/library/analyse', {}, 20000);
}

/** @param {{ concurrency?: number, limit?: number, playlistId?: string, retryFailed?: boolean }} opts */
export function helperStartAnalysis(opts = {}) {
  return request('/library/analyse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  }, 30000);
}

export function helperStopAnalysis() {
  return request('/library/analyse/stop', { method: 'POST' }, 20000);
}
