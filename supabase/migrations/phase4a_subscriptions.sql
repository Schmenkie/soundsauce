-- Phase 4A: Stripe Subscription Integration
-- Adds subscription columns to profiles + usage tracking table

-- ============================================================
-- 1. Add subscription columns to profiles
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none'
    CHECK (subscription_status IN ('none', 'active', 'past_due', 'canceled', 'trialing'));

-- Index for webhook lookups by Stripe customer ID
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles(stripe_customer_id);

-- ============================================================
-- 2. Create usage_tracking table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  period text NOT NULL,  -- 'YYYY-MM' format, e.g. '2026-02'
  analyses_count integer NOT NULL DEFAULT 0,
  stems_count integer NOT NULL DEFAULT 0,
  publishes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, period)
);

-- ============================================================
-- 3. RLS policies for usage_tracking
-- ============================================================

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own usage"
  ON public.usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own usage rows
CREATE POLICY "Users can insert own usage"
  ON public.usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage rows
CREATE POLICY "Users can update own usage"
  ON public.usage_tracking FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS usage_tracking_user_period_idx
  ON public.usage_tracking(user_id, period);

-- ============================================================
-- 4. Auto-update updated_at trigger
-- ============================================================

CREATE TRIGGER usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
