-- Phase 5B: Achievement Badges
-- Depends on: phase5a_notifications.sql (uses create_notification function)

-- 1. Achievements table (composite PK = one badge per user per type)
CREATE TABLE IF NOT EXISTS public.achievements (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  badge_type text NOT NULL,
  earned_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, badge_type)
);

-- 2. Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- 3. RLS: anyone can see badges (public), only SECURITY DEFINER can insert
CREATE POLICY "Achievements are viewable by everyone"
  ON public.achievements FOR SELECT
  USING (true);

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_achievements_user
  ON public.achievements(user_id);

-- 5. Idempotent badge award function
CREATE OR REPLACE FUNCTION public.check_and_award_badge(
  p_user_id uuid,
  p_badge_type text,
  p_badge_label text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.achievements (user_id, badge_type)
  VALUES (p_user_id, p_badge_type)
  ON CONFLICT DO NOTHING;

  -- If newly inserted (not a conflict), create a badge_earned notification
  IF FOUND THEN
    PERFORM public.create_notification(
      p_user_id,
      p_user_id,
      'badge_earned',
      NULL,
      COALESCE(p_badge_label, p_badge_type)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Badge check triggers

-- After analysis INSERT -> first_analysis
CREATE OR REPLACE FUNCTION public.check_analysis_badges()
RETURNS trigger AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.analyses WHERE user_id = NEW.user_id;
  IF v_count = 1 THEN
    PERFORM public.check_and_award_badge(NEW.user_id, 'first_analysis', 'First Analysis');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_analysis_badge_check
  AFTER INSERT ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION public.check_analysis_badges();

-- After analyses UPDATE (is_public = true) -> first_recipe, five_recipes
CREATE OR REPLACE FUNCTION public.check_publish_badges()
RETURNS trigger AS $$
DECLARE
  v_count integer;
BEGIN
  IF NEW.is_public = true AND (OLD.is_public IS NULL OR OLD.is_public = false) THEN
    SELECT COUNT(*) INTO v_count FROM public.analyses WHERE user_id = NEW.user_id AND is_public = true;
    IF v_count = 1 THEN
      PERFORM public.check_and_award_badge(NEW.user_id, 'first_recipe', 'Sound Chef');
    END IF;
    IF v_count = 5 THEN
      PERFORM public.check_and_award_badge(NEW.user_id, 'five_recipes', 'Prolific');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_publish_badge_check
  AFTER UPDATE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION public.check_publish_badges();

-- After likes INSERT -> first_like_given (liker), first_like_received (recipe owner)
CREATE OR REPLACE FUNCTION public.check_like_badges()
RETURNS trigger AS $$
DECLARE
  v_owner_id uuid;
  v_given_count integer;
  v_received_count integer;
BEGIN
  -- first_like_given for the liker
  SELECT COUNT(*) INTO v_given_count FROM public.likes WHERE user_id = NEW.user_id;
  IF v_given_count = 1 THEN
    PERFORM public.check_and_award_badge(NEW.user_id, 'first_like_given', 'Supporter');
  END IF;

  -- first_like_received for the recipe owner
  SELECT user_id INTO v_owner_id FROM public.analyses WHERE id = NEW.analysis_id;
  IF v_owner_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_received_count FROM public.likes l
      JOIN public.analyses a ON l.analysis_id = a.id
      WHERE a.user_id = v_owner_id;
    IF v_received_count = 1 THEN
      PERFORM public.check_and_award_badge(v_owner_id, 'first_like_received', 'Crowd Pleaser');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_badge_check
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.check_like_badges();

-- After follows INSERT -> first_follower, ten_followers for the followed user
CREATE OR REPLACE FUNCTION public.check_follow_badges()
RETURNS trigger AS $$
DECLARE
  v_follower_count integer;
BEGIN
  SELECT COUNT(*) INTO v_follower_count FROM public.follows WHERE following_id = NEW.following_id;
  IF v_follower_count = 1 THEN
    PERFORM public.check_and_award_badge(NEW.following_id, 'first_follower', 'Rising Star');
  END IF;
  IF v_follower_count = 10 THEN
    PERFORM public.check_and_award_badge(NEW.following_id, 'ten_followers', 'Influencer');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_badge_check
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.check_follow_badges();

-- After recreations INSERT -> first_recreation, high_match (90%+)
CREATE OR REPLACE FUNCTION public.check_recreation_badges()
RETURNS trigger AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.recreations WHERE user_id = NEW.user_id;
  IF v_count = 1 THEN
    PERFORM public.check_and_award_badge(NEW.user_id, 'first_recreation', 'Recreator');
  END IF;
  IF NEW.match_score >= 90 THEN
    PERFORM public.check_and_award_badge(NEW.user_id, 'high_match', 'Sound Twin');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_recreation_badge_check
  AFTER INSERT ON public.recreations
  FOR EACH ROW EXECUTE FUNCTION public.check_recreation_badges();

-- After comments INSERT -> first_comment
CREATE OR REPLACE FUNCTION public.check_comment_badges()
RETURNS trigger AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.comments WHERE user_id = NEW.user_id;
  IF v_count = 1 THEN
    PERFORM public.check_and_award_badge(NEW.user_id, 'first_comment', 'Community Voice');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_badge_check
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.check_comment_badges();
