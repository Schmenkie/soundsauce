/**
 * Vercel Serverless Function: Check Stem Separation Status
 *
 * Polls Replicate for the prediction status and returns stem URLs when complete.
 *
 * @param {object} req - Vercel request object
 * @param {string} req.query.id - Replicate prediction ID to poll
 * @param {object} res - Vercel response object
 * @returns {{ status: string, progress: number, predictionId: string, stems?: { vocals: string|null, drums: string|null, bass: string|null, other: string|null }, error?: string }} On success
 * @returns {{ error: string }} On failure (400/404/500)
 */

import { rateLimit } from './_rateLimit.js';
import { requireLab, signPredictionId } from './_auth.js';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Prediction IDs from Replicate are alphanumeric, typically 20-40 chars
const PREDICTION_ID_REGEX = /^[a-z0-9]{20,40}$/;

// Every stem key the Demucs predictor can emit across all models/modes
const STEM_KEYS = ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other'];

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 60 req/min (polling endpoint, called every 2s)
  if (rateLimit(req, res, { limit: 60 })) return;

  // Lab password gate (see _auth.js)
  if (!requireLab(req, res)) return;

  // Check for API token
  if (!REPLICATE_API_TOKEN) {
    console.error('REPLICATE_API_TOKEN not configured');
    return res.status(500).json({ error: 'Stem separation service not configured' });
  }

  const { id, token } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Prediction ID required' });
  }

  // Validate prediction ID format (alphanumeric, 20-40 chars)
  if (!PREDICTION_ID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid prediction ID format' });
  }

  // Verify HMAC ownership token to prevent IDOR enumeration of other users' predictions.
  // The token was issued by separate-stems.js as HMAC(predictionId:userId).
  if (!token) {
    return res.status(403).json({ error: 'Ownership token required' });
  }
  if (token !== signPredictionId(id)) {
    return res.status(403).json({ error: 'Invalid ownership token' });
  }

  try {
    // Get prediction status from Replicate
    const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Replicate API error:', response.status, errorText);

      if (response.status === 404) {
        return res.status(404).json({ error: 'Prediction not found' });
      }

      return res.status(500).json({ error: 'Failed to check separation status' });
    }

    const prediction = await response.json();

    // Map Replicate status to our status
    const statusMap = {
      'starting': 'processing',
      'processing': 'processing',
      'succeeded': 'succeeded',
      'failed': 'failed',
      'canceled': 'failed',
    };

    const status = statusMap[prediction.status] || 'processing';

    // Calculate progress estimate based on time elapsed.
    // Measured ~35s predict time for htdemucs_ft on a 2:40 track, plus queue/cold start.
    // We can't see the model from the prediction, so assume ~60s and cap at 95%.
    let progress = 0;
    if (prediction.status === 'processing' || prediction.status === 'starting') {
      const startTime = new Date(prediction.created_at).getTime();
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      progress = Math.min(95, Math.floor((elapsed / 60) * 100));
    } else if (prediction.status === 'succeeded') {
      progress = 100;
    }

    // Build response
    const result = {
      status,
      progress,
      predictionId: prediction.id,
    };

    // If succeeded, include stem URLs. Only keys that are actually present are
    // returned, so the client can render whatever the chosen mode produced:
    //   vocals mode -> { vocals, other }   (other = instrumental)
    //   stems4      -> { vocals, drums, bass, other }
    //   stems6      -> { vocals, drums, bass, guitar, piano, other }
    if (prediction.status === 'succeeded' && prediction.output) {
      const stems = {};
      if (typeof prediction.output === 'object' && !Array.isArray(prediction.output)) {
        for (const key of STEM_KEYS) {
          if (prediction.output[key]) stems[key] = prediction.output[key];
        }
      } else if (Array.isArray(prediction.output)) {
        // Fallback: match by filename pattern
        for (const url of prediction.output) {
          const lowerUrl = url.toLowerCase();
          const match = STEM_KEYS.find(key => lowerUrl.includes(key.slice(0, 4)));
          if (match) stems[match] = url;
        }
      } else if (typeof prediction.output === 'string') {
        result.outputUrl = prediction.output;
      }
      if (Object.keys(stems).length > 0) result.stems = stems;
    }

    // If failed, include error message
    if (prediction.status === 'failed') {
      result.error = prediction.error || 'Stem separation failed';
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Check stems error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
