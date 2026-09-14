/**
 * Shared reader for the Vault index (vault/index.json on Blob). Used by /api/vault
 * (lab-gated, full document) and /api/notes (public, published notes only).
 */
import { list } from '@vercel/blob';

export const INDEX_PATH = 'vault/index.json';

export async function findIndexUrl() {
  const { blobs } = await list({ prefix: INDEX_PATH, limit: 5 });
  const exact = blobs.find(b => b.pathname === INDEX_PATH) || blobs[0];
  return exact?.url || null;
}

export async function readIndex() {
  const url = await findIndexUrl();
  if (!url) return { tracks: [], updatedAt: null };
  // Blob CDN caches aggressively; bust it so we always see the latest write
  const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to read vault index (${res.status})`);
  const data = await res.json();
  return { tracks: Array.isArray(data.tracks) ? data.tracks : [], updatedAt: data.updatedAt || null };
}
