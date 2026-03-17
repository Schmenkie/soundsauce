-- ============================================
-- Phase 2E: Recreation Uploads + Spectral Match
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS public.recreations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  audio_url text NOT NULL,
  match_score numeric(5,2),
  band_scores jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.recreations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recreations are viewable by everyone"
  ON public.recreations FOR SELECT USING (true);

CREATE POLICY "Users can insert own recreations"
  ON public.recreations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recreations"
  ON public.recreations FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS recreations_analysis_id_idx ON public.recreations(analysis_id);
CREATE INDEX IF NOT EXISTS recreations_user_id_idx ON public.recreations(user_id);
CREATE INDEX IF NOT EXISTS recreations_match_score_idx ON public.recreations(match_score DESC);
