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

import { createClient } from '@supabase/supabase-js';
import { rateLimit } from './_rateLimit.js';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Anon client for JWT validation
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Prediction IDs from Replicate are alphanumeric, typically 20-40 chars
const PREDICTION_ID_REGEX = /^[a-z0-9]{20,40}$/;

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 60 req/min (polling endpoint, called every 2s)
  if (rateLimit(req, res, { limit: 60 })) return;

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

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Prediction ID required' });
  }

  // Validate prediction ID format (alphanumeric, 20-40 chars)
  if (!PREDICTION_ID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid prediction ID format' });
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

    // Calculate progress estimate based on time elapsed
    // Demucs typically takes 30-90 seconds depending on track length
    let progress = 0;
    if (prediction.status === 'processing' || prediction.status === 'starting') {
      const startTime = new Date(prediction.created_at).getTime();
      const now = Date.now();
      const elapsed = (now - startTime) / 1000; // seconds
      // Estimate progress: assume ~60 seconds average, cap at 95%
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

    // If succeeded, include stem URLs
    if (prediction.status === 'succeeded' && prediction.output) {
      // Demucs output format: object with stem URLs
      // The exact format depends on the model version
      if (typeof prediction.output === 'object' && !Array.isArray(prediction.output)) {
        // Format: { vocals: url, drums: url, bass: url, other: url }
        result.stems = {
          vocals: prediction.output.vocals || null,
          drums: prediction.output.drums || null,
          bass: prediction.output.bass || null,
          other: prediction.output.other || null,
        };
      } else if (Array.isArray(prediction.output)) {
        // Some models return an array of URLs
        // Try to match by filename pattern
        const stems = { vocals: null, drums: null, bass: null, other: null };
        for (const url of prediction.output) {
          const lowerUrl = url.toLowerCase();
          if (lowerUrl.includes('vocal')) stems.vocals = url;
          else if (lowerUrl.includes('drum')) stems.drums = url;
          else if (lowerUrl.includes('bass')) stems.bass = url;
          else if (lowerUrl.includes('other') || lowerUrl.includes('instrum')) stems.other = url;
        }
        result.stems = stems;
      } else if (typeof prediction.output === 'string') {
        // Single URL - might be a zip file or single stem
        result.outputUrl = prediction.output;
      }
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
