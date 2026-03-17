import { useState, useCallback } from 'react';
import { upload } from '@vercel/blob/client';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAudioWorker } from './useAudioWorker';
import { trackChallengeSubmissionUploaded } from '../lib/posthog';

/**
 * Hook for submitting a recreation to a weekly challenge.
 * Flow: upload audio → decode both → Web Worker spectral match → UPSERT result.
 * Pattern: useRecreation.js (identical flow, UPSERT instead of INSERT)
 */
export function useChallengeSubmission() {
  const { user } = useAuth();
  const { calculateSpectralMatch } = useAudioWorker();
  const [status, setStatus] = useState('idle'); // idle | uploading | analyzing | saving | done | error
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submitEntry = useCallback(async (challengeId, referenceAudioUrl, submissionFile) => {
    if (!user) return null;

    setStatus('uploading');
    setProgress(0);
    setError(null);
    setResult(null);

    let audioContext = null;

    try {
      // Step 1: Upload submission audio to Vercel Blob
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

      const blobResult = await upload(submissionFile.name, submissionFile, {
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

      const [referenceResponse, submissionResponse] = await Promise.all([
        fetch(referenceAudioUrl),
        fetch(blobResult.url),
      ]);

      const [referenceArrayBuffer, submissionArrayBuffer] = await Promise.all([
        referenceResponse.arrayBuffer(),
        submissionResponse.arrayBuffer(),
      ]);

      setProgress(50);

      const [referenceBuffer, submissionBuffer] = await Promise.all([
        audioContext.decodeAudioData(referenceArrayBuffer),
        audioContext.decodeAudioData(submissionArrayBuffer),
      ]);

      setProgress(60);

      const referenceData = referenceBuffer.getChannelData(0);
      const submissionData = submissionBuffer.getChannelData(0);
      const sampleRate = referenceBuffer.sampleRate;

      // Step 3: Run spectral match via Web Worker
      const matchResult = await calculateSpectralMatch(referenceData, submissionData, sampleRate);

      setProgress(85);
      setStatus('saving');

      // Step 4: UPSERT to challenge_submissions (allows re-submission)
      const { data, error: saveError } = await supabase
        .from('challenge_submissions')
        .upsert(
          {
            user_id: user.id,
            challenge_id: challengeId,
            audio_url: blobResult.url,
            match_score: matchResult.overallMatch || 0,
            band_scores: matchResult.bandDifferences || {},
          },
          { onConflict: 'user_id,challenge_id' }
        )
        .select('*, profiles:user_id(username, display_name, avatar_url)')
        .single();

      if (saveError) {
        throw new Error('Failed to save submission');
      }

      setProgress(100);
      setStatus('done');
      trackChallengeSubmissionUploaded(challengeId, matchResult.overallMatch);
      setResult({ ...data, matchResult });
      return { ...data, matchResult };
    } catch (err) {
      console.error('Challenge submission failed:', err);
      setError(err.message);
      setStatus('error');
      return null;
    } finally {
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
    submitEntry,
    reset,
    isProcessing: status === 'uploading' || status === 'analyzing' || status === 'saving',
  };
}
