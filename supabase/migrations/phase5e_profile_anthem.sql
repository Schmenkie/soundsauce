-- Phase 5E: Profile Anthem (Instagram-inspired song showcase)
-- Adds anthem fields to profiles for a featured song on user profiles.

-- anthem_url: URL to the audio file (uploaded to Vercel Blob or external link)
-- anthem_title: Display title for the anthem
-- anthem_artist: Artist name for the anthem
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS anthem_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS anthem_title text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS anthem_artist text;
