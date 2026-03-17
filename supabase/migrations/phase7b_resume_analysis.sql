-- Phase 7B: Resume Analysis with Stems
-- Adds stem_urls column to persist Replicate CDN stem URLs for session restoration.
-- The audio_url and audio_filename columns already exist but were never populated.
-- This migration just adds the missing stem_urls column.

-- Add stem_urls JSONB column for persisting stem separation results
-- Stores: { vocals: url, drums: url, bass: url, other: url }
-- These are Replicate CDN URLs that expire after ~7 days.
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS stem_urls jsonb DEFAULT NULL;

COMMENT ON COLUMN public.analyses.stem_urls IS 'Replicate CDN stem URLs { vocals, drums, bass, other }. Expire after ~7 days.';
