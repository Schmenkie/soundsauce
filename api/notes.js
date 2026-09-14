/**
 * Vercel Serverless Function: public Remix Notes
 *
 *   GET /api/notes -> { entries: [{ id, title, artist, bpm, key, source, sourceUrl, thumbnailUrl,
 *                                   notes: { pulled, changes, lessons, resultUrl, updatedAt } }] }
 *
 * No auth: only tracks whose notes are marked public, and only the fields a portfolio
 * page needs — never stem or source audio URLs.
 */
import { rateLimit } from './_rateLimit.js';
import { validateServerEnv } from './_validateEnv.js';
import { readIndex } from './_vaultIndex.js';

export default async function handler(req, res) {
  if (rateLimit(req, res, { limit: 60 })) return;
  if (validateServerEnv(res, ['BLOB_READ_WRITE_TOKEN'])) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { tracks } = await readIndex();
    const entries = tracks
      .filter(t => t.notes && typeof t.notes === 'object' && t.notes.public)
      .map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist || null,
        bpm: t.bpm || null,
        key: t.key ? { key: t.key.key, mode: t.key.mode, camelot: t.key.camelot } : null,
        source: t.source || null,
        sourceUrl: t.sourceUrl || null,
        thumbnailUrl: t.thumbnailUrl || null,
        notes: {
          pulled: t.notes.pulled || '',
          changes: t.notes.changes || '',
          lessons: t.notes.lessons || '',
          resultUrl: t.notes.resultUrl || '',
          updatedAt: t.notes.updatedAt || t.updatedAt || null,
        },
      }))
      .sort((a, b) => (b.notes.updatedAt || '').localeCompare(a.notes.updatedAt || ''));
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json({ entries });
  } catch (err) {
    console.error('notes error:', err);
    return res.status(500).json({ error: err.message || 'Failed to read notes' });
  }
}
