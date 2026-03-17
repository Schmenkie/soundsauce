-- Phase 5C: Backfill Notifications + Add parent_id to Comments
--
-- Part 1: Adds the parent_id column to comments (for reply threading).
-- Part 2: Backfills notifications for likes and comments that were created
--          before the notification triggers (phase5a) were set up.
--
-- Safe to run multiple times (idempotent):
--   - ALTER TABLE uses IF NOT EXISTS for the column
--   - INSERT uses NOT EXISTS to skip duplicates
--   - Backfilled notifications are marked is_read = true (won't affect unread counts)

BEGIN;

-- ============================================================
-- 0. Add parent_id column to comments (if not already present)
-- ============================================================
-- This enables reply threading. References self (comments.id).
-- ON DELETE CASCADE means deleting a parent removes its replies.
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- Index for efficient child lookups
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id)
  WHERE parent_id IS NOT NULL;

-- ============================================================
-- 1. Backfill notifications for existing likes (type: 'recipe_liked')
-- ============================================================
-- For each like, notify the recipe owner (skip self-likes).
INSERT INTO public.notifications (user_id, actor_id, type, reference_id, reference_title, is_read, created_at)
SELECT
  a.user_id       AS user_id,        -- recipe owner (recipient)
  l.user_id       AS actor_id,       -- person who liked
  'recipe_liked'  AS type,
  l.analysis_id   AS reference_id,
  a.title         AS reference_title,
  true            AS is_read,
  l.created_at    AS created_at
FROM public.likes l
JOIN public.analyses a ON a.id = l.analysis_id
WHERE
  -- Prevent self-notifications (matches create_notification behavior)
  l.user_id != a.user_id
  -- Only insert if no matching notification already exists
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = a.user_id
      AND n.actor_id = l.user_id
      AND n.type = 'recipe_liked'
      AND n.reference_id = l.analysis_id
  );

-- ============================================================
-- 2. Backfill notifications for existing comments (type: 'recipe_commented')
-- ============================================================
-- For each comment, notify the recipe owner (skip self-comments).
INSERT INTO public.notifications (user_id, actor_id, type, reference_id, reference_title, is_read, created_at)
SELECT
  a.user_id            AS user_id,        -- recipe owner (recipient)
  c.user_id            AS actor_id,       -- person who commented
  'recipe_commented'   AS type,
  c.analysis_id        AS reference_id,
  a.title              AS reference_title,
  true                 AS is_read,
  c.created_at         AS created_at
FROM public.comments c
JOIN public.analyses a ON a.id = c.analysis_id
WHERE
  -- Prevent self-notifications
  c.user_id != a.user_id
  -- Only insert if no matching notification already exists
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = a.user_id
      AND n.actor_id = c.user_id
      AND n.type = 'recipe_commented'
      AND n.reference_id = c.analysis_id
      -- Match on created_at to distinguish multiple comments by same user on same recipe
      AND n.created_at = c.created_at
  );

-- ============================================================
-- 3. Backfill notifications for comment replies (type: 'comment_replied')
-- ============================================================
-- For each reply (parent_id IS NOT NULL), notify the parent comment author.
-- Skip if:
--   - The reply author IS the parent comment author (self-notification)
--   - The parent comment author IS the recipe owner (already notified via recipe_commented)
-- This matches the existing notify_on_comment trigger behavior.
--
-- NOTE: This section will produce 0 rows if no replies existed before this
-- migration (since parent_id was just added). That's expected — future replies
-- will be handled by the existing notify_on_comment trigger in phase5a.
INSERT INTO public.notifications (user_id, actor_id, type, reference_id, reference_title, is_read, created_at)
SELECT
  parent_c.user_id     AS user_id,        -- parent comment author (recipient)
  c.user_id            AS actor_id,       -- person who replied
  'comment_replied'    AS type,
  c.analysis_id        AS reference_id,
  a.title              AS reference_title,
  true                 AS is_read,
  c.created_at         AS created_at
FROM public.comments c
JOIN public.comments parent_c ON parent_c.id = c.parent_id
JOIN public.analyses a ON a.id = c.analysis_id
WHERE
  -- Only replies (has a parent comment)
  c.parent_id IS NOT NULL
  -- Prevent self-notifications
  AND c.user_id != parent_c.user_id
  -- Don't double-notify the recipe owner (they already got recipe_commented above)
  AND parent_c.user_id != a.user_id
  -- Only insert if no matching notification already exists
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = parent_c.user_id
      AND n.actor_id = c.user_id
      AND n.type = 'comment_replied'
      AND n.reference_id = c.analysis_id
      AND n.created_at = c.created_at
  );

COMMIT;
