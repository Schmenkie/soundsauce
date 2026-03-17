-- ============================================
-- Phase 4B: Onboarding
-- Run this in Supabase SQL Editor
-- ============================================

-- Add onboarding flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false NOT NULL;

-- Backfill existing users so they don't see the onboarding modal
UPDATE public.profiles SET onboarding_completed = true;
