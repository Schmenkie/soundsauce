/**
 * Vercel Serverless Function: Admin Actions Endpoint
 *
 * Handles write operations for the admin dashboard.
 * Double-layer security: JWT auth + is_admin DB check.
 *
 * @param {object} req - Vercel request object (POST)
 * @param {string} req.headers.authorization - Bearer token (Supabase JWT)
 * @param {object} req.body - Action payload
 * @param {string} req.body.action - 'changeTier' | 'unpublish' | 'deleteComment'
 * @param {object} res - Vercel response object
 * @returns {{ success: boolean }} On success
 * @returns {{ error: string }} On failure (400/401/403/500)
 */

import { createClient } from '@supabase/supabase-js';
import { rateLimit } from './_rateLimit.js';
import { validateServerEnv } from './_validateEnv.js';

// Anon client for JWT validation
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Service role client — bypasses RLS for admin operations
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 10 actions per minute
  if (rateLimit(req, res, { limit: 10 })) return;

  if (validateServerEnv(res, ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'])) return;

  try {
    // --- Layer 1: JWT auth ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // --- Layer 2: Admin check ---
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // --- Route action ---
    const { action } = req.body;

    switch (action) {
      case 'changeTier':
        return handleChangeTier(req, res);
      case 'unpublish':
        return handleUnpublish(req, res);
      case 'deleteComment':
        return handleDeleteComment(req, res);
      case 'toggleFeature':
        return handleToggleFeature(req, res);
      case 'toggleSuspend':
        return handleToggleSuspend(req, res);
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('Admin action error:', error);
    return res.status(500).json({ error: 'Failed to execute admin action' });
  }
}

async function handleChangeTier(req, res) {
  const { userId, tier } = req.body;

  if (!userId || !['free', 'pro'].includes(tier)) {
    return res.status(400).json({ error: 'Invalid parameters. Requires userId and tier (free or pro).' });
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ subscription_tier: tier })
    .eq('id', userId);

  if (error) {
    console.error('Change tier error:', error);
    return res.status(500).json({ error: 'Failed to change user tier' });
  }

  return res.status(200).json({ success: true });
}

async function handleUnpublish(req, res) {
  const { analysisId } = req.body;

  if (!analysisId) {
    return res.status(400).json({ error: 'Invalid parameters. Requires analysisId.' });
  }

  const { error } = await supabaseAdmin
    .from('analyses')
    .update({ is_public: false })
    .eq('id', analysisId);

  if (error) {
    console.error('Unpublish error:', error);
    return res.status(500).json({ error: 'Failed to unpublish content' });
  }

  return res.status(200).json({ success: true });
}

async function handleDeleteComment(req, res) {
  const { commentId } = req.body;

  if (!commentId) {
    return res.status(400).json({ error: 'Invalid parameters. Requires commentId.' });
  }

  const { error } = await supabaseAdmin
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({ error: 'Failed to delete comment' });
  }

  return res.status(200).json({ success: true });
}

async function handleToggleFeature(req, res) {
  const { analysisId, isFeatured } = req.body;

  if (!analysisId || typeof isFeatured !== 'boolean') {
    return res.status(400).json({ error: 'Invalid parameters. Requires analysisId and isFeatured (boolean).' });
  }

  const { error } = await supabaseAdmin
    .from('analyses')
    .update({ is_featured: isFeatured })
    .eq('id', analysisId);

  if (error) {
    console.error('Toggle feature error:', error);
    return res.status(500).json({ error: 'Failed to toggle featured status' });
  }

  return res.status(200).json({ success: true });
}

async function handleToggleSuspend(req, res) {
  const { userId, isSuspended } = req.body;

  if (!userId || typeof isSuspended !== 'boolean') {
    return res.status(400).json({ error: 'Invalid parameters. Requires userId and isSuspended (boolean).' });
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ is_suspended: isSuspended })
    .eq('id', userId);

  if (error) {
    console.error('Toggle suspend error:', error);
    return res.status(500).json({ error: 'Failed to toggle suspend status' });
  }

  return res.status(200).json({ success: true });
}
