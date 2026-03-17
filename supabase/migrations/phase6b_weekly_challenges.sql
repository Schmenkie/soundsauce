-- Phase 6B: Weekly Challenges
-- Depends on: profiles, analyses tables, phase5a_notifications.sql, phase5b_achievements.sql
--
-- Rules:
-- - Challenges reference a published Sound Sauce (analyses row)
-- - One week duration (start_date → end_date)
-- - Any authenticated user can submit
-- - Users can re-submit (UPSERT on user_id + challenge_id)
-- - Pro/Premium users can create challenges; free users participate only
-- - Leaderboard sorted by match_score
-- - Status is derived, not stored: upcoming/active/ended

-- ============================================
-- 1. Challenges table
-- ============================================
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 100),
  description text DEFAULT '' NOT NULL CHECK (char_length(description) <= 500),
  sound_sauce_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  reference_audio_url text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  submission_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CHECK (end_date > start_date),
  CHECK (end_date - start_date >= interval '1 day')
);

-- ============================================
-- 2. Challenge submissions table
-- ============================================
CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  audio_url text NOT NULL,
  match_score real DEFAULT 0 NOT NULL,
  band_scores jsonb DEFAULT '{}' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, challenge_id)
);

-- ============================================
-- 3. Enable RLS
-- ============================================
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS Policies — challenges
-- ============================================
CREATE POLICY "Challenges are viewable by everyone"
  ON public.challenges FOR SELECT
  USING (true);

CREATE POLICY "Pro/Premium users can create challenges"
  ON public.challenges FOR INSERT
  WITH CHECK (
    auth.uid() = creator_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND subscription_tier IN ('pro', 'premium')
    )
  );

CREATE POLICY "Creators can update own challenges"
  ON public.challenges FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own challenges"
  ON public.challenges FOR DELETE
  USING (auth.uid() = creator_id);

-- ============================================
-- 5. RLS Policies — submissions
-- ============================================
CREATE POLICY "Submissions are viewable by everyone"
  ON public.challenge_submissions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can submit to active challenges"
  ON public.challenge_submissions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
      AND now() >= c.start_date
      AND now() <= c.end_date
    )
  );

-- Allow UPDATE for re-submissions (UPSERT via ON CONFLICT)
CREATE POLICY "Users can update own submissions"
  ON public.challenge_submissions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_challenges_creator ON public.challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_dates ON public.challenges(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_challenges_created ON public.challenges(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_challenge ON public.challenge_submissions(challenge_id, match_score DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_user ON public.challenge_submissions(user_id);

-- ============================================
-- 7. Trigger: maintain submission_count on challenges
-- ============================================
CREATE OR REPLACE FUNCTION public.update_challenge_submission_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.challenges SET submission_count = submission_count + 1 WHERE id = NEW.challenge_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.challenges SET submission_count = GREATEST(submission_count - 1, 0) WHERE id = OLD.challenge_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_challenge_submission_count
  AFTER INSERT OR DELETE ON public.challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_challenge_submission_count();

-- ============================================
-- 8. Trigger: notify challenge creator on new submission
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_on_challenge_submission()
RETURNS trigger AS $$
DECLARE
  v_creator_id uuid;
  v_title text;
BEGIN
  SELECT creator_id, title INTO v_creator_id, v_title
  FROM public.challenges WHERE id = NEW.challenge_id;

  IF v_creator_id IS NOT NULL THEN
    PERFORM public.create_notification(
      v_creator_id,
      NEW.user_id,
      'challenge_submission',
      NEW.challenge_id,
      v_title
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_challenge_submission_notify
  AFTER INSERT ON public.challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_challenge_submission();

-- ============================================
-- 9. Trigger: award badges on challenge participation
-- ============================================
CREATE OR REPLACE FUNCTION public.check_challenge_badges()
RETURNS trigger AS $$
DECLARE
  v_count integer;
BEGIN
  -- first_challenge badge: first submission ever
  SELECT COUNT(*) INTO v_count FROM public.challenge_submissions WHERE user_id = NEW.user_id;
  IF v_count = 1 THEN
    PERFORM public.check_and_award_badge(NEW.user_id, 'first_challenge', 'Challenger');
  END IF;

  -- challenge_winner badge: score 90%+
  IF NEW.match_score >= 90 THEN
    PERFORM public.check_and_award_badge(NEW.user_id, 'challenge_winner', 'Challenge Champion');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_challenge_submission_badge_check
  AFTER INSERT ON public.challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION public.check_challenge_badges();

-- ============================================
-- 10. Update notification type CHECK constraint to include both new types
-- (This migration runs after phase6a, so include all types)
-- ============================================
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'recipe_liked', 'recipe_commented', 'comment_replied',
    'user_followed', 'recreation_submitted', 'badge_earned',
    'new_message', 'challenge_submission'
  ));
