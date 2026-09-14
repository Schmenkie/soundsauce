/**
 * Vercel Serverless Function: Start Stem Separation
 *
 * Receives an audio URL (from Vercel Blob) plus a separation mode, starts a
 * Replicate prediction using Demucs, and returns the prediction ID for polling.
 *
 * Modes (see SEPARATION_MODES):
 *   vocals — two-stem split: vocals + instrumental (Remix Lab default)
 *   stems4 — vocals / drums / bass / other
 *   stems6 — vocals / drums / bass / guitar / piano / other
 *
 * Output is always lossless FLAC (Ableton-native, ~half the size of WAV, which
 * matters because persisted stems count against Vercel Blob storage).
 *
 * @param {object} req - Vercel request object
 * @param {object} req.body - Request body
 * @param {string} req.body.audioUrl - Public URL of audio file (from Vercel Blob)
 * @param {string} [req.body.mode='vocals'] - 'vocals' | 'stems4' | 'stems6'
 * @param {string} [req.body.quality='best'] - 'best' (htdemucs_ft, slower) | 'fast' (htdemucs)
 * @param {object} res - Vercel response object
 * @returns {{ predictionId: string, token: string, mode: string, status: string, createdAt: string }} On success
 * @returns {{ error: string }} On failure (400/401/500)
 */

import { rateLimit } from './_rateLimit.js';
import { requireLab, signPredictionId } from './_auth.js';

export const config = {
  maxDuration: 60, // Allow up to 60 seconds for the initial request
};

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// cjwbw/demucs on Replicate. Input schema (verified against the version's OpenAPI schema):
//   audio, model_name (htdemucs | htdemucs_ft | htdemucs_6s | ...), stem (two-stem mode),
//   output_format (mp3 | wav | flac), shifts, overlap, clip_mode, float32, mp3_bitrate
const DEMUCS_MODEL_VERSION = 'cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953';

// htdemucs_ft is the fine-tuned model (noticeably cleaner vocals, ~4x slower).
// htdemucs_6s is the only model with guitar/piano sources, so stems6 can't use _ft.
const SEPARATION_MODES = {
  vocals: { best: 'htdemucs_ft', fast: 'htdemucs', stem: 'vocals' },
  stems4: { best: 'htdemucs_ft', fast: 'htdemucs', stem: null },
  stems6: { best: 'htdemucs_6s', fast: 'htdemucs_6s', stem: null },
};

const OUTPUT_FORMAT = 'flac';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 10 requests per minute (costs money on Replicate)
  if (rateLimit(req, res, { limit: 10 })) return;

  // Lab password gate (see _auth.js)
  if (!requireLab(req, res)) return;

  // Check for API token
  if (!REPLICATE_API_TOKEN) {
    console.error('REPLICATE_API_TOKEN not configured');
    return res.status(500).json({ error: 'Stem separation service not configured' });
  }

  try {
    const { audioUrl, mode = 'vocals', quality = 'best' } = req.body || {};

    if (!audioUrl) {
      return res.status(400).json({ error: 'No audio URL provided' });
    }

    const modeConfig = SEPARATION_MODES[mode];
    if (!modeConfig) {
      return res.status(400).json({ error: `Invalid mode. Use one of: ${Object.keys(SEPARATION_MODES).join(', ')}` });
    }
    const modelName = quality === 'fast' ? modeConfig.fast : modeConfig.best;

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

    const input = {
      audio: audioUrl,
      model_name: modelName,
      output_format: OUTPUT_FORMAT,
      shifts: 1,
      overlap: 0.25,
      clip_mode: 'rescale',
    };
    if (modeConfig.stem) {
      // Two-stem mode: Demucs returns { [stem]: url, other: url } where `other`
      // is everything except the chosen stem (i.e. the instrumental for vocals).
      input.stem = modeConfig.stem;
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
        input,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Replicate API error:', response.status, errorText);
      return res.status(500).json({ error: 'Failed to start stem separation' });
    }

    const prediction = await response.json();

    // Ownership token: check-stems.js verifies this so prediction IDs can't be enumerated.
    const token = signPredictionId(prediction.id);

    return res.status(200).json({
      predictionId: prediction.id,
      token,
      mode,
      modelName,
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
