-- ============================================
-- Avatar Storage Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- Create the avatars bucket (public so avatars display without auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Everyone can view avatars
CREATE POLICY "Public avatars are downloadable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Users can upload to their own folder
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can overwrite their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
