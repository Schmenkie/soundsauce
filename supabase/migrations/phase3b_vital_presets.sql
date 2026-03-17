-- Phase 3B: Vital Preset Attachments on Sound Recipes
-- Run this in Supabase SQL Editor

-- Add vital_preset_url column to analyses
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS vital_preset_url text;
