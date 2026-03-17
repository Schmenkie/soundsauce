# Database Migrations

## Setup
1. Install Supabase CLI: `brew install supabase/tap/supabase`
2. Link your project: `supabase link --project-ref YOUR_PROJECT_REF`
3. Set your database password when prompted

## Creating New Migrations
```bash
supabase migration new migration_name
```
This creates a timestamped file in `supabase/migrations/`.

## Applying Migrations
```bash
supabase db push
```
This applies all pending migrations to your remote database.

## Existing Migrations (applied manually)
The following migrations were applied manually before CLI setup.
They are kept for reference but should NOT be re-run:

1. `schema.sql` -- Base schema (profiles, analyses, RLS, triggers)
2. `storage.sql` -- Avatar storage bucket + policies
3. `phase2a_publish.sql` -- description, tags, search_vector on analyses
4. `phase2c_likes.sql` -- likes table, like_count trigger
5. `phase2d_follows.sql` -- follows table with RLS
6. `phase2e_recreations.sql` -- recreations table with match scores
7. `phase3a_comments.sql` -- comments table with threading
8. `phase3b_vital_presets.sql` -- vital_preset_url column
9. `phase3c_standalone_presets.sql` -- post_type column
10. `phase3d_google_oauth_trigger.sql` -- Google OAuth trigger
11. `phase3e_download_tracking.sql` -- downloads table
12. `phase4a_subscriptions.sql` -- subscription fields + usage_tracking
13. `phase4b_onboarding.sql` -- onboarding_completed flag
14. `phase4c_admin.sql` -- is_admin flag
15. `phase5a_notifications.sql` -- notifications table + triggers
16. `phase5b_achievements.sql` -- achievements table + badge triggers
17. `phase5c_backfill_notifications.sql` -- Backfill notification data
18. `phase5d_display_name.sql` -- display_name column
19. `phase5e_profile_anthem.sql` -- Profile anthem feature
20. `phase6a_direct_messages.sql` -- conversations + messages
21. `phase6b_weekly_challenges.sql` -- challenges + submissions
