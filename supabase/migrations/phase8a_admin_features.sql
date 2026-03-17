-- Phase 8A: Admin Features — Staff Pick + User Suspend
-- Run in Supabase SQL Editor after all previous migrations

-- Staff Pick: Allow admins to feature recipes
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Partial index for quick featured recipe queries
CREATE INDEX IF NOT EXISTS idx_analyses_is_featured ON analyses(is_featured) WHERE is_featured = true;

-- User Suspend: Allow admins to suspend users
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
