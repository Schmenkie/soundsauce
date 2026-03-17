-- Phase 4C: Admin Dashboard
-- Adds is_admin flag to profiles for admin access control.

-- Add is_admin column (defaults to false, no backfill needed)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false NOT NULL;
