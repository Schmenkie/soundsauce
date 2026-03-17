-- Phase 3A: Comments on Sound Recipes
-- Run this in Supabase SQL Editor

-- 1. Create comments table
CREATE TABLE public.comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Indexes
CREATE INDEX idx_comments_analysis ON public.comments(analysis_id, created_at DESC);
CREATE INDEX idx_comments_user ON public.comments(user_id);

-- 3. Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Anyone can read comments on public recipes
CREATE POLICY "Anyone can view comments on public recipes"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = comments.analysis_id AND analyses.is_public = true
    )
  );

-- Authenticated users can add comments
CREATE POLICY "Users can add comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Add comment_count to analyses (denormalized for display)
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS comment_count integer DEFAULT 0;

-- 6. Trigger to maintain comment_count
CREATE OR REPLACE FUNCTION public.update_comment_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.analyses SET comment_count = comment_count + 1 WHERE id = NEW.analysis_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.analyses SET comment_count = comment_count - 1 WHERE id = OLD.analysis_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_comment_count();

-- 7. Updated_at trigger for comments
CREATE OR REPLACE FUNCTION public.update_comment_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_comment_update
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_comment_updated_at();
