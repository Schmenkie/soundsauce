-- ============================================
-- Phase 2C: Likes + Public Profiles
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Likes table (composite PK prevents duplicates)
CREATE TABLE IF NOT EXISTS public.likes (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, analysis_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone"
  ON public.likes FOR SELECT USING (true);

CREATE POLICY "Users can like"
  ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike"
  ON public.likes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS likes_analysis_id_idx ON public.likes(analysis_id);
CREATE INDEX IF NOT EXISTS likes_user_id_idx ON public.likes(user_id);

-- 2. Denormalized like count on analyses (trigger-maintained)
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS like_count integer DEFAULT 0 NOT NULL;
CREATE INDEX IF NOT EXISTS analyses_like_count_idx ON public.analyses(like_count DESC) WHERE is_public = true;

-- 3. Trigger to keep like_count in sync
CREATE OR REPLACE FUNCTION public.update_like_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.analyses SET like_count = like_count + 1 WHERE id = NEW.analysis_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.analyses SET like_count = like_count - 1 WHERE id = OLD.analysis_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE PROCEDURE public.update_like_count();
