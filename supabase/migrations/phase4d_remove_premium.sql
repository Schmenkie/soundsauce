-- phase4d_remove_premium.sql
-- Simplify subscription tiers: merge Premium into Pro
-- All existing Premium subscribers become Pro (same features, unlimited everything)

-- Step 1: Migrate all premium users to pro
UPDATE profiles
SET subscription_tier = 'pro'
WHERE subscription_tier = 'premium';

-- Step 2: Drop existing CHECK constraint and add new one (free/pro only)
-- The constraint name may vary; use ALTER TABLE to be safe
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'pro'));

-- Step 3: Update challenges RLS policy to remove 'premium' reference
-- The INSERT policy currently checks: subscription_tier IN ('pro', 'premium')
-- Drop and recreate with just 'pro'
DROP POLICY IF EXISTS "Pro/Premium users can create challenges" ON challenges;

CREATE POLICY "Pro users can create challenges"
  ON challenges
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.subscription_tier = 'pro'
    )
  );
