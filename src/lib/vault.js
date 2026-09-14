/**
 * Vault client — the index of every track you've separated, stored as one JSON
 * document on Vercel Blob behind /api/vault (lab-gated).
 *
 * Track shape (VaultTrack):
 * {
 *   id, createdAt, updatedAt,
 *   title, artist, source ('soundcloud'|'youtube'|'upload'|'demo'), sourceUrl, thumbnailUrl,
 *   duration, bpm, key: { key, mode, camelot, confidence },
 *   audioUrl,                       // original upload on Blob (persists)
 *   mode,                           // separation mode id
 *   stems: { [stemType]: { url, kept: boolean, size?: number } },
 *   notes: '', tags: []
 * }
 */

import { labAuthHeaders } from './labAuth';

const CACHE_KEY = 'soundsauce_vault_cache';

async function request(method, body) {
  const res = await fetch('/api/vault', {
    method,
    headers: { 'Content-Type': 'application/json', ...labAuthHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Vault request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export function readVaultCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeVaultCache(index) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(index)); } catch { /* ignore */ }
}

/** @returns {Promise<{ tracks: object[], updatedAt: string|null, storage: { usedBytes, blobCount } }>} */
export async function fetchVault() {
  const data = await request('GET');
  writeVaultCache({ tracks: data.tracks, updatedAt: data.updatedAt, storage: data.storage });
  return data;
}

export async function saveVault(tracks) {
  const data = await request('PUT', { tracks });
  const cached = readVaultCache() || {};
  writeVaultCache({ ...cached, tracks, updatedAt: data.updatedAt });
  return data;
}

/** Permanently delete blobs (stems / source uploads) that belonged to a removed track. */
export async function deleteVaultBlobs(urls) {
  const blobUrls = urls.filter(u => /\.public\.blob\.vercel-storage\.com/.test(u || ''));
  if (blobUrls.length === 0) return { deleted: 0 };
  return request('DELETE', { urls: blobUrls });
}

/** Stable id for a track: the source upload's blob URL is unique per upload. */
/** Vercel Hobby Blob allowance */
export const BLOB_LIMIT_BYTES = 1024 * 1024 * 1024;
/** What a two-stem FLAC grab costs on average (source upload + vocals + instrumental) */
export const BYTES_PER_GRAB = 55 * 1024 * 1024;

export function formatMB(bytes) {
  return `${(bytes / 1048576).toFixed(0)} MB`;
}

/** "356 MB used · ~12 more tracks fit" */
export function describeStorage(storage) {
  if (!storage) return null;
  const used = storage.usedBytes || 0;
  const free = Math.max(0, BLOB_LIMIT_BYTES - used);
  const grabsLeft = Math.floor(free / BYTES_PER_GRAB);
  return { used, free, grabsLeft, usedPct: Math.min(100, (used / BLOB_LIMIT_BYTES) * 100), blobCount: storage.blobCount || 0 };
}

export function vaultIdFor(audioUrl) {
  if (!audioUrl) return null;
  // Take the random suffix Vercel appends — short, unique, URL-safe
  const m = audioUrl.match(/-([A-Za-z0-9]{20,})\.[a-z0-9]+$/);
  return m ? m[1] : audioUrl.replace(/[^A-Za-z0-9]/g, '').slice(-32);
}

/** Camelot helpers for compatibility filtering. "8A" -> { number: 8, letter: 'A' } */
export function parseCamelot(code) {
  const m = /^(\d{1,2})([AB])$/.exec(code || '');
  return m ? { number: Number(m[1]), letter: m[2] } : null;
}

/**
 * Camelot-compatible codes for a given code: same, ±1 on the wheel, and the relative
 * major/minor. This is the DJ "harmonic mixing" set.
 */
export function compatibleCamelot(code) {
  const c = parseCamelot(code);
  if (!c) return [];
  const wrap = (n) => ((n - 1 + 12) % 12) + 1;
  return [
    `${c.number}${c.letter}`,
    `${wrap(c.number + 1)}${c.letter}`,
    `${wrap(c.number - 1)}${c.letter}`,
    `${c.number}${c.letter === 'A' ? 'B' : 'A'}`,
  ];
}

/** Tempo compatibility: within ±pct, or half/double time within the same tolerance. */
export function tempoCompatible(a, b, pct = 0.08) {
  if (!a || !b) return false;
  const within = (x, y) => Math.abs(x - y) / y <= pct;
  return within(a, b) || within(a * 2, b) || within(a, b * 2);
}
