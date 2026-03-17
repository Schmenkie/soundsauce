import { useState, useCallback } from 'react';
import { upload } from '@vercel/blob/client';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAudioWorker } from './useAudioWorker';
import { trackRecreationUploaded } from '../lib/posthog';

/**
 * Hook for uploading recreation audio and computing spectral match vs original.
 *
 * Flow:
 * 1. Upload recreation audio to Vercel Blob
 * 2. Decode both original + recreation AudioBuffers client-side
 * 3. Run calculateSpectralMatch via Web Worker
 * 4. Save result to recreations table
 */
export function useRecreation() {
  const { user } = useAuth();
  const { calculateSpectralMatch } = useAudioWorker();
  const [status, setStatus] = useState('idle'); // idle | uploading | analyzing | saving | done | error
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submitRecreation = useCallback(async (analysisId, originalAudioUrl, recreationFile) => {
    if (!user) return null;

    setStatus('uploading');
    setProgress(0);
    setError(null);
    setResult(null);

    let audioContext = null;

    try {
      // Step 1: Upload recreation audio to Vercel Blob
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

      const blobResult = await upload(recreationFile.name, recreationFile, {
        access: 'public',
        handleUploadUrl: '/api/upload-audio',
        headers: authHeaders,
        onUploadProgress: (progressEvent) => {
          setProgress(Math.floor((progressEvent.loaded / progressEvent.total) * 30));
        },
      });

      if (!blobResult.url) {
        throw new Error('Failed to upload audio file');
      }

      setProgress(30);
      setStatus('analyzing');

      // Step 2: Decode both audio files client-side
      audioContext = new (window.AudioContext || window.webkitAudioContext)();

      const [originalResponse, recreationResponse] = await Promise.all([
        fetch(originalAudioUrl),
        fetch(blobResult.url),
      ]);

      const [originalArrayBuffer, recreationArrayBuffer] = await Promise.all([
        originalResponse.arrayBuffer(),
        recreationResponse.arrayBuffer(),
      ]);

      setProgress(50);

      const [originalBuffer, recreationBuffer] = await Promise.all([
        audioContext.decodeAudioData(originalArrayBuffer),
        audioContext.decodeAudioData(recreationArrayBuffer),
      ]);

      setProgress(60);

      // Get mono channel data from both
      const originalData = originalBuffer.getChannelData(0);
      const recreationData = recreationBuffer.getChannelData(0);
      const sampleRate = originalBuffer.sampleRate;

      // Step 3: Run spectral match via Web Worker
      const matchResult = await calculateSpectralMatch(originalData, recreationData, sampleRate);

      setProgress(85);
      setStatus('saving');

      // Step 4: Save to recreations table
      const { data, error: saveError } = await supabase
        .from('recreations')
        .insert({
          user_id: user.id,
          analysis_id: analysisId,
          audio_url: blobResult.url,
          match_score: matchResult.overallMatch || 0,
          band_scores: matchResult.bandDifferences || {},
        })
        .select('*, profiles:user_id(username, display_name, avatar_url)')
        .single();

      if (saveError) {
        throw new Error('Failed to save recreation');
      }

      setProgress(100);
      setStatus('done');
      trackRecreationUploaded(analysisId, matchResult.overallMatch);
      setResult({ ...data, matchResult });
      return { ...data, matchResult };
    } catch (err) {
      console.error('Recreation failed:', err);
      setError(err.message);
      setStatus('error');
      return null;
    } finally {
      // Always close AudioContext to prevent memory leak
      if (audioContext) {
        try { audioContext.close(); } catch { /* already closed */ }
      }
    }
  }, [user, calculateSpectralMatch]);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    progress,
    result,
    error,
    submitRecreation,
    reset,
    isProcessing: status === 'uploading' || status === 'analyzing' || status === 'saving',
  };
}
