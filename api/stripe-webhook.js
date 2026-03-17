/**
 * Vercel Serverless Function: Stripe Webhook Handler
 *
 * Receives Stripe webhook events and updates the Supabase database.
 * Uses raw body parsing for Stripe signature verification.
 * Uses Supabase service role key to bypass RLS for writes.
 *
 * Handled event types:
 * - checkout.session.completed - New subscription created, sets tier + stripe_customer_id
 * - customer.subscription.updated - Plan change or status change, updates tier + status
 * - customer.subscription.deleted - Subscription canceled, resets to free tier
 *
 * @param {object} req - Vercel request object (POST, raw body)
 * @param {string} req.headers['stripe-signature'] - Stripe webhook signature
 * @param {object} res - Vercel response object
 * @returns {{ received: true }} Always returns 200 to acknowledge receipt
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Service role client — bypasses RLS for webhook-driven writes
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Map a Stripe Price ID to our tier name.
 * @param {string} priceId - Stripe Price ID
 * @returns {'free'|'pro'}
 */
function priceToTier(priceId) {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';
  // Legacy: map old Premium price to Pro for existing subscribers
  if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) return 'pro';
  return 'free';
}

/**
 * Map a Stripe subscription status to our app status enum.
 * @param {string} stripeStatus - Stripe subscription status
 * @returns {'active'|'trialing'|'past_due'|'canceled'|'none'}
 */
function mapStatus(stripeStatus) {
  switch (stripeStatus) {
    case 'active': return 'active';
    case 'trialing': return 'trialing';
    case 'past_due': return 'past_due';
    case 'canceled': return 'canceled';
    case 'incomplete':
    case 'incomplete_expired':
    case 'unpaid':
      return 'past_due';
    default:
      return 'none';
  }
}

// Disable Vercel's automatic JSON body parsing — Stripe needs raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Read the raw request body as a Buffer (required for Stripe signature verification).
 * @param {object} req - Node.js request stream
 * @returns {Promise<Buffer>}
 */
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let event;

  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const subscriptionId = session.subscription;

        if (!userId || !subscriptionId) {
          console.error('Missing userId or subscriptionId in checkout session');
          break;
        }

        // Fetch the subscription to get the price/tier
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;
        const tier = priceToTier(priceId);

        // Update profile with subscription info
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: tier,
            subscription_status: mapStatus(subscription.status),
            stripe_customer_id: session.customer,
          })
          .eq('id', userId);

        if (error) {
          console.error('Failed to update profile on checkout:', error);
        } else {
          console.log(`Checkout completed: user ${userId} → ${tier}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          // Try to find user by customer ID
          const customerId = subscription.customer;
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (!profile) {
            console.error('Cannot find user for subscription update:', customerId);
            break;
          }

          const priceId = subscription.items.data[0]?.price?.id;
          const tier = priceToTier(priceId);

          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_tier: tier,
              subscription_status: mapStatus(subscription.status),
            })
            .eq('id', profile.id);

          console.log(`Subscription updated: user ${profile.id} → ${tier} (${subscription.status})`);
        } else {
          const priceId = subscription.items.data[0]?.price?.id;
          const tier = priceToTier(priceId);

          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_tier: tier,
              subscription_status: mapStatus(subscription.status),
            })
            .eq('id', userId);

          console.log(`Subscription updated: user ${userId} → ${tier} (${subscription.status})`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;
        const customerId = subscription.customer;

        // Find user by metadata or customer ID
        let targetUserId = userId;
        if (!targetUserId) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();

          targetUserId = profile?.id;
        }

        if (targetUserId) {
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_tier: 'free',
              subscription_status: 'canceled',
            })
            .eq('id', targetUserId);

          console.log(`Subscription deleted: user ${targetUserId} → free`);
        } else {
          console.error('Cannot find user for subscription deletion:', customerId);
        }
        break;
      }

      default:
        // Unhandled event type — that's fine
        break;
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    // Still return 200 — Stripe will retry on non-2xx, and we don't want infinite retries
    return res.status(200).json({ received: true, error: 'Handler error' });
  }
}
