/**
 * Vercel Serverless Function: Handle Audio Upload
 *
 * Handles client-side uploads to Vercel Blob storage via @vercel/blob client protocol.
 * Validates audio file types (wav, mp3, m4a) and enforces 100MB max.
 * Returns a public URL that can be passed to Replicate for stem separation.
 *
 * @param {object} req - Vercel request object (multipart, handled by @vercel/blob)
 * @param {object} res - Vercel response object
 * @returns {object} Vercel Blob client upload response (includes blob URL)
 * @returns {{ error: string }} On failure (400)
 */

import { handleUpload } from '@vercel/blob/client';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from './_rateLimit.js';
import { validateServerEnv } from './_validateEnv.js';

// Anon client for JWT validation
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Rate limit: 30 requests per minute
  if (rateLimit(req, res, { limit: 30 })) return;

  if (validateServerEnv(res, ['BLOB_READ_WRITE_TOKEN'])) return;

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

  try {
    const response = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Validate the file is an audio file
        const extension = pathname.split('.').pop()?.toLowerCase();
        const allowedExtensions = ['wav', 'mp3', 'm4a'];

        if (!allowedExtensions.includes(extension)) {
          throw new Error('Invalid file type. Please upload an audio file.');
        }

        return {
          allowedContentTypes: [
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/wave',
            'audio/x-wav',
            'audio/mp4',
            'audio/m4a',
            'audio/x-m4a',
          ],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB max
          addRandomSuffix: true, // Generate unique filenames to avoid conflicts
          tokenPayload: JSON.stringify({
            uploadedAt: Date.now(),
          }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Log successful upload (optional)
        console.log('Audio uploaded:', blob.url);
      },
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(400).json({
      error: error.message || 'Upload failed'
    });
  }
}
