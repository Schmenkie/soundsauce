/**
 * Vercel Serverless Function: Upload Vital Preset
 *
 * Receives a Vital preset JSON string and stores it in Vercel Blob.
 * Returns the public URL for the stored preset.
 * Requires a valid Supabase JWT in the Authorization header.
 *
 * @param {object} req - Vercel request object
 * @param {object} req.body - Request body
 * @param {string} req.body.presetData - Vital preset as JSON string (max 5MB)
 * @param {string} req.body.filename - Original preset filename
 * @param {string} req.headers.authorization - Bearer token (Supabase JWT)
 * @param {object} res - Vercel response object
 * @returns {{ url: string }} Public Vercel Blob URL of the stored preset
 * @returns {{ error: string }} On failure (400/401/500)
 */

import { put } from '@vercel/blob';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from './_rateLimit.js';
import { validateServerEnv } from './_validateEnv.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 30 requests per minute
  if (rateLimit(req, res, { limit: 30 })) return;

  if (validateServerEnv(res, ['BLOB_READ_WRITE_TOKEN'])) return;

  try {
    // Validate auth — require a valid Supabase JWT
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { presetData, filename } = req.body;

    if (!presetData || !filename) {
      return res.status(400).json({ error: 'Missing presetData or filename' });
    }

    // Max 5MB for preset files (they're typically < 100KB)
    // Check size BEFORE JSON.parse to avoid parsing a huge string into memory
    if (typeof presetData !== 'string' || presetData.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Preset file too large (max 5MB)' });
    }

    // Validate it's valid JSON (Vital presets are JSON)
    try {
      JSON.parse(presetData);
    } catch {
      return res.status(400).json({ error: 'Invalid preset data (must be valid JSON)' });
    }

    const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
    const blob = await put(`presets/${safeName}_${Date.now()}.vital`, presetData, {
      access: 'public',
      contentType: 'application/octet-stream',
      addRandomSuffix: true,
    });

    return res.status(200).json({ url: blob.url });
  } catch (error) {
    console.error('Preset upload error:', error);
    return res.status(500).json({ error: 'Failed to upload preset' });
  }
}
