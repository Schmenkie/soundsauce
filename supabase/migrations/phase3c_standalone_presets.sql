-- Phase 3C: Standalone Preset Posts
-- Allows users to post Vital presets directly without analyzing audio first.
-- Adds post_type column to distinguish recipe posts from standalone preset posts.
-- Run this in Supabase SQL Editor.

-- 1. Add post_type column (defaults to 'recipe' for backward compatibility)
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS post_type text DEFAULT 'recipe'
  CHECK (post_type IN ('recipe', 'preset'));

-- 2. Index for filtering by post_type
CREATE INDEX IF NOT EXISTS analyses_post_type_idx ON public.analyses(post_type);
