-- ============================================
-- Phase 2A: Add recipe publishing columns to analyses
-- Run this in Supabase SQL Editor
-- ============================================

-- Description field for Sound Recipes
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS description text;

-- Tags for discoverability (stored as PostgreSQL text array)
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- GIN index for efficient tag filtering with @> (contains) operator
CREATE INDEX IF NOT EXISTS analyses_tags_idx ON public.analyses USING GIN (tags);

-- Full-text search vector (auto-maintained generated column)
-- Weighted: title matches rank higher than description matches
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED;

-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS analyses_search_idx ON public.analyses USING GIN (search_vector);
