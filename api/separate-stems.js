/**
 * Vercel Serverless Function: Start Stem Separation
 *
 * Receives an audio URL (from Vercel Blob), starts a Replicate prediction
 * using Demucs model, and returns the prediction ID for polling.
 *
 * @param {object} req - Vercel request object
 * @param {object} req.body - Request body
 * @param {string} req.body.audioUrl - Public URL of audio file (from Vercel Blob)
 * @param {object} res - Vercel response object
 * @returns {{ predictionId: string, status: string, createdAt: string }} On success
 * @returns {{ error: string }} On failure (400/401/500)
 */

import { createClient } from '@supabase/supabase-js';
import { rateLimit } from './_rateLimit.js';

export const config = {
  maxDuration: 60, // Allow up to 60 seconds for the initial request
};

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Anon client for JWT validation
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Demucs model on Replicate - htdemucs variant for best quality
const DEMUCS_MODEL_VERSION = 'cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 10 requests per minute (costs money on Replicate)
  if (rateLimit(req, res, { limit: 10 })) return;

  // Validate auth
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Check for API token
  if (!REPLICATE_API_TOKEN) {
    console.error('REPLICATE_API_TOKEN not configured');
    return res.status(500).json({ error: 'Stem separation service not configured' });
  }

  try {
    const { audioUrl } = req.body;

    if (!audioUrl) {
      return res.status(400).json({ error: 'No audio URL provided' });
    }

    // Validate URL format
    try {
      new URL(audioUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid audio URL format' });
    }

    // SSRF protection: only allow Vercel Blob URLs
    const ALLOWED_HOSTS = ['public.blob.vercel-storage.com'];
    const parsedUrl = new URL(audioUrl);
    if (!ALLOWED_HOSTS.some(host => parsedUrl.hostname.endsWith(host))) {
      return res.status(400).json({ error: 'Audio URL must be a Vercel Blob URL' });
    }

    // Start Replicate prediction with the audio URL
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: DEMUCS_MODEL_VERSION.split(':')[1],
        input: {
          audio: audioUrl,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Replicate API error:', response.status, errorText);

      // Parse error for more details
      let errorDetail = 'Failed to start stem separation';
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.detail || errorJson.error || errorText;
      } catch {
        errorDetail = errorText;
      }

      if (response.status === 401) {
        return res.status(500).json({ error: 'Invalid API configuration' });
      }
      if (response.status === 422) {
        return res.status(400).json({
          error: 'Invalid audio file format. Please try a different file.',
        });
      }

      return res.status(500).json({ error: 'Failed to start stem separation' });
    }

    const prediction = await response.json();

    return res.status(200).json({
      predictionId: prediction.id,
      status: prediction.status,
      createdAt: prediction.created_at,
    });

  } catch (error) {
    console.error('Stem separation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
