/**
 * Vercel Serverless Function: Create Stripe Checkout Session
 *
 * Creates a Stripe Checkout Session for upgrading to Pro or Premium.
 * Looks up or creates a Stripe Customer for the authenticated user.
 * Returns the checkout URL for client-side redirect.
 * Requires a valid Supabase JWT in the Authorization header.
 *
 * @param {object} req - Vercel request object
 * @param {object} req.body - Request body
 * @param {string} req.body.priceId - Tier name ('pro'|'premium') or Stripe Price ID
 * @param {string} req.headers.authorization - Bearer token (Supabase JWT)
 * @param {object} res - Vercel response object
 * @returns {{ url: string }} Stripe Checkout URL for client-side redirect
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

// Service role client for writing stripe_customer_id (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Map tier names to Stripe Price IDs
const TIER_TO_PRICE = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
};

const VALID_PRICES = new Set(Object.values(TIER_TO_PRICE).filter(Boolean));

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

    const { priceId: rawPriceId } = req.body;

    // Accept either a tier name ('pro', 'premium') or a direct Stripe Price ID
    const priceId = TIER_TO_PRICE[rawPriceId] || rawPriceId;

    if (!priceId || !VALID_PRICES.has(priceId)) {
      return res.status(400).json({ error: 'Invalid price ID' });
    }

    // Get user's profile to check for existing Stripe customer
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, username')
      .eq('id', user.id)
      .single();

    let stripeCustomerId = profile?.stripe_customer_id;

    // Create Stripe customer if none exists
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.username || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      // Save customer ID to profile
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
    }

    // Determine success/cancel URLs (validated against allowlist)
    const origin = getSafeOrigin(req.headers.origin);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      client_reference_id: user.id,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings?checkout=success`,
      cancel_url: `${origin}/settings?checkout=canceled`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Create checkout error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
