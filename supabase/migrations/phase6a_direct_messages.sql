-- Phase 6A: Direct Messaging
-- Depends on: profiles, follows tables, phase5a_notifications.sql (create_notification helper)
--
-- Rules:
-- - Mutual follows = conversation in "Inbox"
-- - One-way follow = conversation in "Requests"
-- - When recipient follows back, conversation auto-promotes from Requests → Inbox
-- - When user unfollows, conversation auto-demotes from Inbox → Requests
-- - Text-only messages (2000 char limit)

-- ============================================
-- 1. Conversations table
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_b_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_request boolean DEFAULT true NOT NULL,
  unread_a integer DEFAULT 0 NOT NULL,
  unread_b integer DEFAULT 0 NOT NULL,
  last_message_at timestamptz DEFAULT now() NOT NULL,
  last_message_preview text DEFAULT '' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  -- Canonical ordering: user_a_id < user_b_id prevents duplicates
  CHECK (user_a_id < user_b_id),
  UNIQUE (user_a_id, user_b_id)
);

-- ============================================
-- 2. Messages table
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL CHECK (char_length(content) <= 2000 AND char_length(content) > 0),
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- 3. Add unread_messages to profiles (sidebar badge)
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unread_messages integer DEFAULT 0 NOT NULL;

-- ============================================
-- 4. Enable RLS
-- ============================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS Policies — conversations
-- ============================================
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- No direct INSERT policy — use get_or_create_conversation RPC

-- ============================================
-- 6. RLS Policies — messages
-- ============================================
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
    )
  );

-- ============================================
-- 7. Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_conversations_user_a ON public.conversations(user_a_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_b ON public.conversations(user_b_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- ============================================
-- 8. Check if two users mutually follow each other
-- ============================================
CREATE OR REPLACE FUNCTION public.are_mutual_follows(p_user_1 uuid, p_user_2 uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.follows WHERE follower_id = p_user_1 AND following_id = p_user_2
  ) AND EXISTS (
    SELECT 1 FROM public.follows WHERE follower_id = p_user_2 AND following_id = p_user_1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. BEFORE INSERT trigger: set is_request based on mutual follow status
-- ============================================
CREATE OR REPLACE FUNCTION public.set_conversation_request_status()
RETURNS trigger AS $$
BEGIN
  NEW.is_request := NOT public.are_mutual_follows(NEW.user_a_id, NEW.user_b_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_conversation_insert_set_request
  BEFORE INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_conversation_request_status();

-- ============================================
-- 10. AFTER INSERT on messages: update conversation metadata + unread counts
-- ============================================
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS trigger AS $$
DECLARE
  v_conv public.conversations;
  v_recipient_id uuid;
BEGIN
  -- Get the conversation
  SELECT * INTO v_conv FROM public.conversations WHERE id = NEW.conversation_id;

  -- Determine recipient
  IF NEW.sender_id = v_conv.user_a_id THEN
    v_recipient_id := v_conv.user_b_id;
    -- Increment user_b unread count
    UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100),
        unread_b = unread_b + 1
    WHERE id = NEW.conversation_id;
  ELSE
    v_recipient_id := v_conv.user_a_id;
    -- Increment user_a unread count
    UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100),
        unread_a = unread_a + 1
    WHERE id = NEW.conversation_id;
  END IF;

  -- Increment recipient's profile unread_messages count
  UPDATE public.profiles
  SET unread_messages = unread_messages + 1
  WHERE id = v_recipient_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();

-- ============================================
-- 11. Notify recipient on new message
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger AS $$
DECLARE
  v_conv public.conversations;
  v_recipient_id uuid;
BEGIN
  SELECT * INTO v_conv FROM public.conversations WHERE id = NEW.conversation_id;

  IF NEW.sender_id = v_conv.user_a_id THEN
    v_recipient_id := v_conv.user_b_id;
  ELSE
    v_recipient_id := v_conv.user_a_id;
  END IF;

  PERFORM public.create_notification(
    v_recipient_id,
    NEW.sender_id,
    'new_message',
    NEW.conversation_id,
    LEFT(NEW.content, 50)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

-- ============================================
-- 12. AFTER INSERT on follows: promote conversations from request → inbox if now mutual
-- ============================================
CREATE OR REPLACE FUNCTION public.update_conversations_on_follow()
RETURNS trigger AS $$
DECLARE
  v_a uuid;
  v_b uuid;
BEGIN
  -- Canonical ordering
  IF NEW.follower_id < NEW.following_id THEN
    v_a := NEW.follower_id;
    v_b := NEW.following_id;
  ELSE
    v_a := NEW.following_id;
    v_b := NEW.follower_id;
  END IF;

  -- If conversation exists and they are now mutual follows, promote to inbox
  IF public.are_mutual_follows(NEW.follower_id, NEW.following_id) THEN
    UPDATE public.conversations
    SET is_request = false
    WHERE user_a_id = v_a AND user_b_id = v_b AND is_request = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_update_conversations
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.update_conversations_on_follow();

-- ============================================
-- 13. AFTER DELETE on follows: demote conversations from inbox → request if no longer mutual
-- ============================================
CREATE OR REPLACE FUNCTION public.update_conversations_on_unfollow()
RETURNS trigger AS $$
DECLARE
  v_a uuid;
  v_b uuid;
BEGIN
  -- Canonical ordering
  IF OLD.follower_id < OLD.following_id THEN
    v_a := OLD.follower_id;
    v_b := OLD.following_id;
  ELSE
    v_a := OLD.following_id;
    v_b := OLD.follower_id;
  END IF;

  -- If conversation exists and they are no longer mutual, demote to request
  IF NOT public.are_mutual_follows(OLD.follower_id, OLD.following_id) THEN
    UPDATE public.conversations
    SET is_request = true
    WHERE user_a_id = v_a AND user_b_id = v_b AND is_request = false;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_unfollow_update_conversations
  AFTER DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.update_conversations_on_unfollow();

-- ============================================
-- 14. RPC: get_or_create_conversation
-- Handles canonical ordering so the caller doesn't have to
-- ============================================
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_user_1 uuid, p_user_2 uuid)
RETURNS uuid AS $$
DECLARE
  v_a uuid;
  v_b uuid;
  v_id uuid;
BEGIN
  -- Cannot message yourself
  IF p_user_1 = p_user_2 THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  -- Canonical ordering
  IF p_user_1 < p_user_2 THEN
    v_a := p_user_1;
    v_b := p_user_2;
  ELSE
    v_a := p_user_2;
    v_b := p_user_1;
  END IF;

  -- Try to find existing conversation
  SELECT id INTO v_id FROM public.conversations
  WHERE user_a_id = v_a AND user_b_id = v_b;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- Create new conversation (BEFORE INSERT trigger will set is_request)
  INSERT INTO public.conversations (user_a_id, user_b_id)
  VALUES (v_a, v_b)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 15. Update notification type CHECK constraint to include 'new_message'
-- ============================================
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'recipe_liked', 'recipe_commented', 'comment_replied',
    'user_followed', 'recreation_submitted', 'badge_earned',
    'new_message'
  ));
