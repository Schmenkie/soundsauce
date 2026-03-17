-- Phase 5A: Notifications System
-- Depends on: profiles, analyses, likes, follows, comments, recreations tables

-- 1. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN (
    'recipe_liked', 'recipe_commented', 'comment_replied',
    'user_followed', 'recreation_submitted', 'badge_earned'
  )),
  reference_id uuid,
  reference_title text,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies — users can only see/update their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- No INSERT policy for regular users — only SECURITY DEFINER functions insert

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_actor
  ON public.notifications(actor_id);

-- 5. Denormalized unread count on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unread_notifications integer DEFAULT 0 NOT NULL;

-- 6. Trigger to maintain unread_notifications count on profiles
CREATE OR REPLACE FUNCTION public.update_unread_notification_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_read = false THEN
      UPDATE public.profiles SET unread_notifications = unread_notifications + 1 WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_read = false AND NEW.is_read = true THEN
      UPDATE public.profiles SET unread_notifications = GREATEST(unread_notifications - 1, 0) WHERE id = NEW.user_id;
    ELSIF OLD.is_read = true AND NEW.is_read = false THEN
      UPDATE public.profiles SET unread_notifications = unread_notifications + 1 WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_read = false THEN
      UPDATE public.profiles SET unread_notifications = GREATEST(unread_notifications - 1, 0) WHERE id = OLD.user_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_notification_change
  AFTER INSERT OR UPDATE OR DELETE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_unread_notification_count();

-- 7. SECURITY DEFINER helper to create notifications (prevents self-notifications)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_reference_id uuid DEFAULT NULL,
  p_reference_title text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- No self-notifications
  IF p_recipient_id = p_actor_id THEN RETURN; END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, reference_id, reference_title)
  VALUES (p_recipient_id, p_actor_id, p_type, p_reference_id, p_reference_title);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Auto-notification triggers

-- Like -> notify recipe owner
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger AS $$
DECLARE
  v_owner_id uuid;
  v_title text;
BEGIN
  SELECT user_id, title INTO v_owner_id, v_title FROM public.analyses WHERE id = NEW.analysis_id;
  IF v_owner_id IS NOT NULL THEN
    PERFORM public.create_notification(v_owner_id, NEW.user_id, 'recipe_liked', NEW.analysis_id, v_title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_notify
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- Follow -> notify followed user
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger AS $$
BEGIN
  PERFORM public.create_notification(NEW.following_id, NEW.follower_id, 'user_followed', NULL, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_notify
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Comment -> notify recipe owner; reply -> also notify parent comment author
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger AS $$
DECLARE
  v_owner_id uuid;
  v_title text;
  v_parent_author uuid;
BEGIN
  SELECT user_id, title INTO v_owner_id, v_title FROM public.analyses WHERE id = NEW.analysis_id;

  -- Notify recipe owner about the comment
  IF v_owner_id IS NOT NULL THEN
    PERFORM public.create_notification(v_owner_id, NEW.user_id, 'recipe_commented', NEW.analysis_id, v_title);
  END IF;

  -- If this is a reply, also notify the parent comment author
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_author FROM public.comments WHERE id = NEW.parent_id;
    IF v_parent_author IS NOT NULL AND v_parent_author != v_owner_id THEN
      PERFORM public.create_notification(v_parent_author, NEW.user_id, 'comment_replied', NEW.analysis_id, v_title);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_notify
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- Recreation -> notify recipe owner
CREATE OR REPLACE FUNCTION public.notify_on_recreation()
RETURNS trigger AS $$
DECLARE
  v_owner_id uuid;
  v_title text;
BEGIN
  SELECT user_id, title INTO v_owner_id, v_title FROM public.analyses WHERE id = NEW.analysis_id;
  IF v_owner_id IS NOT NULL THEN
    PERFORM public.create_notification(v_owner_id, NEW.user_id, 'recreation_submitted', NEW.analysis_id, v_title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_recreation_notify
  AFTER INSERT ON public.recreations
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_recreation();
