import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { trackPresetPosted } from '../lib/posthog';

/**
 * Hook for posting standalone Vital presets directly to the feed.
 * Handles file validation, upload to Vercel Blob, and Supabase insert.
 */
export function usePresetPost() {
  const { user } = useAuth();
  const [status, setStatus] = useState('idle'); // idle | validating | uploading | saving | done | error
  const [error, setError] = useState(null);

  const postPreset = useCallback(async ({ file, title, description, tags }) => {
    if (!user) {
      setError('You must be signed in to post a preset');
      setStatus('error');
      return null;
    }

    if (!file || !title?.trim()) {
      setError('Title and preset file are required');
      setStatus('error');
      return null;
    }

    setStatus('validating');
    setError(null);

    try {
      // 1. Read the .vital file as text
      const fileText = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });

      // 2. Validate it's valid JSON (Vital presets are JSON)
      try {
        JSON.parse(fileText);
      } catch {
        setError('Invalid preset file. Vital presets must be valid JSON.');
        setStatus('error');
        return null;
      }

      // 3. Upload to Vercel Blob via existing endpoint
      setStatus('uploading');
      const safeName = title.trim().replace(/[^a-zA-Z0-9]/g, '_');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const res = await fetch('/api/upload-preset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ presetData: fileText, filename: safeName }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to upload preset');
      }

      const { url } = await res.json();

      // 4. Insert into analyses table as a preset post
      setStatus('saving');
      const { data, error: dbError } = await supabase
        .from('analyses')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description?.trim() || null,
          tags: tags || [],
          post_type: 'preset',
          vital_preset_url: url,
          is_public: true,
          results: {},
        })
        .select('id')
        .single();

      if (dbError) {
        throw new Error(dbError.message);
      }

      setStatus('done');
      trackPresetPosted(data.id);
      // Notify listeners that a new preset was posted (cache invalidation)
      window.dispatchEvent(new CustomEvent('recipe-mutation', { detail: { type: 'preset-post', id: data.id } }));
      return data.id;
    } catch (err) {
      setError(err.message);
      setStatus('error');
      return null;
    }
  }, [user]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return {
    status,
    error,
    postPreset,
    reset,
    isPosting: status === 'validating' || status === 'uploading' || status === 'saving',
  };
}
