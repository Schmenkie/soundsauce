/**
 * Vercel Serverless Function: the Vault index
 *
 * The Acapella Vault is a single JSON document on Vercel Blob (vault/index.json) —
 * every track that has been separated, with its source upload, stems, tempo and key.
 * One user, a few writes a day: whole-document replace is simpler and safer than a DB.
 *
 *   GET    /api/vault                 -> { tracks: [...], updatedAt, storage: { usedBytes, blobCount } }
 *   PUT    /api/vault  { tracks }     -> { ok, updatedAt }          replace the index
 *   DELETE /api/vault  { urls: [] }   -> { ok, deleted }            delete blobs (stems / source) of a removed track
 *
 * All routes require the lab token (see _auth.js).
 */

import { put, list, del } from '@vercel/blob';
import { INDEX_PATH, readIndex } from './_vaultIndex.js';
import { rateLimit } from './_rateLimit.js';
import { validateServerEnv } from './_validateEnv.js';
import { requireLab } from './_auth.js';

const MAX_INDEX_BYTES = 4 * 1024 * 1024;
const MAX_TRACKS = 2000;

async function storageSummary() {
  let cursor, usedBytes = 0, blobCount = 0;
  do {
    const r = await list({ cursor, limit: 1000 });
    for (const b of r.blobs) { usedBytes += b.size; blobCount++; }
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return { usedBytes, blobCount };
}

function isBlobUrl(u) {
  try { return new URL(u).hostname.endsWith('.public.blob.vercel-storage.com'); } catch { return false; }
}

export default async function handler(req, res) {
  if (rateLimit(req, res, { limit: 60 })) return;
  if (validateServerEnv(res, ['BLOB_READ_WRITE_TOKEN'])) return;
  if (!requireLab(req, res)) return;

  try {
    if (req.method === 'GET') {
      const [index, storage] = await Promise.all([readIndex(), storageSummary()]);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ...index, storage });
    }

    if (req.method === 'PUT') {
      const tracks = req.body?.tracks;
      if (!Array.isArray(tracks)) return res.status(400).json({ error: 'tracks[] required' });
      if (tracks.length > MAX_TRACKS) return res.status(400).json({ error: `Too many tracks (max ${MAX_TRACKS})` });
      const updatedAt = new Date().toISOString();
      const body = JSON.stringify({ version: 1, updatedAt, tracks });
      if (Buffer.byteLength(body) > MAX_INDEX_BYTES) return res.status(413).json({ error: 'Vault index too large' });
      await put(INDEX_PATH, body, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        cacheControlMaxAge: 60, // minimum allowed; reads add a cache-busting query anyway
      });
      return res.status(200).json({ ok: true, updatedAt, count: tracks.length });
    }

    if (req.method === 'DELETE') {
      const urls = (req.body?.urls || []).filter(isBlobUrl);
      if (urls.length === 0) return res.status(200).json({ ok: true, deleted: 0 });
      if (urls.length > 50) return res.status(400).json({ error: 'Too many urls (max 50)' });
      await del(urls);
      return res.status(200).json({ ok: true, deleted: urls.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Vault error:', err);
    return res.status(500).json({ error: err.message || 'Vault error' });
  }
}
