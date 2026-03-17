/**
 * Vercel Serverless Function: Public Platform Stats
 *
 * Returns aggregate platform stats for the home page social proof bar.
 * No auth required — public endpoint with in-memory caching.
 *
 * @param {object} req - Vercel request object (GET)
 * @param {object} res - Vercel response object
 * @returns {{ totalAnalyses: number, publicRecipes: number, totalDownloads: number }}
 */

import { createClient } from '@supabase/supabase-js';
import { rateLimit } from './_rateLimit.js';
import { validateServerEnv } from './_validateEnv.js';

// In-memory cache (per serverless instance)
let cachedStats = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 30 req/min
  if (rateLimit(req, res, { limit: 30 })) return;

  // Check required env vars
  if (validateServerEnv(res, ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])) return;

  // Return cached stats if fresh
  if (cachedStats && Date.now() - cacheTimestamp < CACHE_TTL) {
    return res.status(200).json(cachedStats);
  }

  try {
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Run all three counts in parallel
    const [analysesResult, recipesResult, downloadsResult] = await Promise.all([
      supabaseAdmin.from('analyses').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('analyses').select('id', { count: 'exact', head: true }).eq('is_public', true),
      supabaseAdmin.from('downloads').select('id', { count: 'exact', head: true }),
    ]);

    const stats = {
      totalAnalyses: analysesResult.count || 0,
      publicRecipes: recipesResult.count || 0,
      totalDownloads: downloadsResult.count || 0,
    };

    // Cache the result
    cachedStats = stats;
    cacheTimestamp = Date.now();

    res.status(200).json(stats);
  } catch (err) {
    console.error('public-stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
