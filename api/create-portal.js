/**
 * Vercel Serverless Function: Create Stripe Customer Portal Session
 *
 * Opens the Stripe-hosted billing portal where users can manage
 * their subscription (upgrade, downgrade, cancel, view invoices).
 * Requires a valid Supabase JWT in the Authorization header.
 *
 * @param {object} req - Vercel request object
 * @param {string} req.headers.authorization - Bearer token (Supabase JWT)
 * @param {object} res - Vercel response object
 * @returns {{ url: string }} Stripe billing portal URL for client-side redirect
 * @returns {{ error: string }} On failure (400/401/500)
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from './_rateLimit.js';
import { validateServerEnv } from './_validateEnv.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Anon client for JWT validation
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Service role client for reading stripe_customer_id
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALLOWED_ORIGINS = [
  'https://soundsauce.app',
  'https://www.soundsauce.app',
  'https://audio-analyzer-pro.vercel.app',
];

function getSafeOrigin(reqOrigin) {
  if (!reqOrigin) return 'https://soundsauce.app';
  if (ALLOWED_ORIGINS.includes(reqOrigin)) return reqOrigin;
  // Allow localhost in development
  if (reqOrigin.includes('localhost')) return reqOrigin;
  return 'https://soundsauce.app';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 5 requests per minute
  if (rateLimit(req, res, { limit: 5 })) return;

  if (validateServerEnv(res, ['STRIPE_SECRET_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'])) return;

  try {
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

    // Get the user's Stripe customer ID
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const origin = getSafeOrigin(req.headers.origin);

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/settings`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Create portal error:', error);
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
}
