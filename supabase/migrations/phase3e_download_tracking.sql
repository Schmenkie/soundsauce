-- ============================================
-- Phase 3E: Download Count Tracking
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Downloads table
CREATE TABLE IF NOT EXISTS public.downloads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Per-user dedup (guests are not deduplicated)
CREATE UNIQUE INDEX IF NOT EXISTS downloads_user_analysis_unique
  ON public.downloads(user_id, analysis_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS downloads_analysis_id_idx ON public.downloads(analysis_id);

-- 2. RLS
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Downloads are viewable by everyone"
  ON public.downloads FOR SELECT USING (true);

CREATE POLICY "Users can track downloads"
  ON public.downloads FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Denormalized download count on analyses
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0 NOT NULL;

-- 4. Trigger to maintain download_count
CREATE OR REPLACE FUNCTION public.update_download_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.analyses SET download_count = download_count + 1 WHERE id = NEW.analysis_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.analyses SET download_count = download_count - 1 WHERE id = OLD.analysis_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_download_change
  AFTER INSERT OR DELETE ON public.downloads
  FOR EACH ROW EXECUTE PROCEDURE public.update_download_count();
