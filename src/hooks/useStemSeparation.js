import { useState, useCallback, useRef, useEffect } from 'react';
import { upload } from '@vercel/blob/client';
import { trackStemSeparationStarted, trackStemSeparationCompleted } from '../lib/posthog';
import { supabase } from '../lib/supabase';

/**
 * Hook for managing stem separation workflow using Replicate API.
 *
 * Flow:
 * 1. User uploads audio -> separateStems() called
 * 2. Audio uploaded to Vercel Blob storage (handles large files)
 * 3. Blob URL sent to /api/separate-stems -> Replicate prediction started
 * 4. Prediction ID returned, polling begins via /api/check-stems
 * 5. When complete, stem URLs are available
 * 6. User can download/load individual stems as ArrayBuffer
 */
export function useStemSeparation() {
  // Stem URLs from Replicate
  const [stems, setStems] = useState(null);
  // { vocals: url, drums: url, bass: url, other: url }

  // Downloaded stem audio data (ArrayBuffers)
  const [stemAudioData, setStemAudioData] = useState({});
  // { vocals: ArrayBuffer, drums: ArrayBuffer, ... }

  // Vercel Blob URL of the original audio (persists indefinitely, used for session restore)
  const [blobUrl, setBlobUrl] = useState(null);

  // Current status: 'idle' | 'uploading' | 'processing' | 'downloading' | 'ready' | 'expired' | 'error'
  const [status, setStatus] = useState('idle');

  // Progress percentage (0-100)
  const [progress, setProgress] = useState(0);

  // Error message if any
  const [error, setError] = useState(null);

  // Prediction ID for polling
  const predictionIdRef = useRef(null);

  // Polling interval ref
  const pollIntervalRef = useRef(null);

  // Safety timeout ref (fire-and-forget prevention)
  const safetyTimeoutRef = useRef(null);

  // Ref synced with stemAudioData to avoid stale closures in callbacks
  const stemAudioDataRef = useRef(stemAudioData);
  useEffect(() => { stemAudioDataRef.current = stemAudioData; }, [stemAudioData]);

  /**
   * Stop polling for prediction status
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  }, []);

  // Cleanup poll interval and safety timeout on unmount
  useEffect(() => () => { stopPolling(); }, [stopPolling]);

  /**
   * Poll for prediction status
   */
  const pollStatus = useCallback(async () => {
    if (!predictionIdRef.current) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/check-stems?id=${predictionIdRef.current}`, {
        headers: session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {},
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to check status');
      }

      const data = await response.json();

      // Update progress
      setProgress(data.progress || 0);

      if (data.status === 'succeeded' && data.stems) {
        // Separation complete!
        stopPolling();
        setStems(data.stems);
        setStatus('ready');
        setProgress(100);
        predictionIdRef.current = null;
        trackStemSeparationCompleted();
      } else if (data.status === 'failed') {
        // Separation failed
        stopPolling();
        setError(data.error || 'Stem separation failed');
        setStatus('error');
        predictionIdRef.current = null;
      }
      // Otherwise keep polling
    } catch (err) {
      console.error('Polling error:', err);
      // Don't stop polling on transient errors, just log
    }
  }, [stopPolling]);

  /**
   * Start stem separation process
   * @param {ArrayBuffer} audioData - The audio file as ArrayBuffer
   * @param {string} filename - Original filename for the upload
   * @returns {Promise<boolean>} - True if started successfully
   */
  const separateStems = useCallback(async (audioData, filename = 'audio.mp3') => {
    if (!audioData) {
      setError('No audio data provided');
      return false;
    }

    // Reset state
    setStems(null);
    setStemAudioData({});
    setError(null);
    setProgress(0);
    setStatus('uploading');
    stopPolling();

    try {
      // Step 1: Upload to Vercel Blob
      setProgress(5);

      // Detect MIME type from filename extension
      const extension = filename.split('.').pop()?.toLowerCase() || 'mp3';
      const mimeTypes = {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'flac': 'audio/flac',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac',
        'webm': 'audio/webm',
      };
      const mimeType = mimeTypes[extension] || 'audio/mpeg';

      // Convert ArrayBuffer to Blob for upload
      const audioBlob = new Blob([audioData], { type: mimeType });
      const file = new File([audioBlob], filename, { type: mimeType });

      // Upload to Vercel Blob using client upload (with timeout)
      // Get auth token for upload endpoint
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

      const uploadTimeout = 180000; // 3 minute timeout for upload (large audio files)
      const uploadPromise = upload(filename, file, {
        access: 'public',
        handleUploadUrl: '/api/upload-audio',
        headers: authHeaders,
        onUploadProgress: (progressEvent) => {
          // Upload is 5-30% of total progress
          const uploadProgress = 5 + Math.floor((progressEvent.loaded / progressEvent.total) * 25);
          setProgress(uploadProgress);
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Upload timed out. Please check your connection and try again.')), uploadTimeout)
      );

      let blobResult;
      try {
        blobResult = await Promise.race([uploadPromise, timeoutPromise]);
      } catch (uploadErr) {
        console.error('Blob upload failed:', uploadErr);
        throw new Error(uploadErr.message || 'Failed to upload audio file. Please try again.');
      }

      if (!blobResult.url) {
        throw new Error('Failed to upload audio file');
      }

      // Persist the blob URL for session restore (Vercel Blob URLs don't expire)
      setBlobUrl(blobResult.url);

      setProgress(30);
      setStatus('processing');

      // Step 2: Start stem separation with the blob URL
      // Reuse authHeaders from the upload step (same session)
      const response = await fetch('/api/separate-stems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ audioUrl: blobResult.url }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to start stem separation');
      }

      const data = await response.json();

      if (!data.predictionId) {
        throw new Error('No prediction ID returned');
      }

      // Start polling
      predictionIdRef.current = data.predictionId;
      setProgress(35);

      trackStemSeparationStarted();

      // Poll every 2 seconds
      pollIntervalRef.current = setInterval(pollStatus, 2000);

      // Also poll immediately
      setTimeout(pollStatus, 500);

      // Safety timeout: stop polling after 5 minutes (Demucs usually takes 30-90 seconds)
      safetyTimeoutRef.current = setTimeout(() => {
        safetyTimeoutRef.current = null;
        if (pollIntervalRef.current) {
          stopPolling();
          setError('Stem separation timed out. The process may still be running — try refreshing the page.');
          setStatus('error');
        }
      }, 300000);

      return true;
    } catch (err) {
      console.error('Stem separation error:', err);
      setError(err.message || 'Failed to separate stems');
      setStatus('error');
      return false;
    }
  }, [stopPolling, pollStatus]);

  /**
   * Download a specific stem and return as ArrayBuffer
   * @param {string} stemType - 'vocals' | 'drums' | 'bass' | 'other'
   * @returns {Promise<ArrayBuffer|null>}
   */
  const downloadStem = useCallback(async (stemType) => {
    if (!stems || !stems[stemType]) {
      setError(`No ${stemType} stem available`);
      return null;
    }

    // Check if already downloaded (read from ref to avoid stale closure)
    if (stemAudioDataRef.current[stemType]) {
      return stemAudioDataRef.current[stemType];
    }

    try {
      setStatus('downloading');

      const response = await fetch(stems[stemType]);

      if (!response.ok) {
        // Replicate CDN URLs expire after ~7 days — detect and surface gracefully
        if (response.status === 403 || response.status === 404) {
          setError('Stem URLs have expired. Click "Separate Stems" to re-process.');
          setStatus('expired');
          return null;
        }
        throw new Error(`Failed to download ${stemType} stem`);
      }

      const arrayBuffer = await response.arrayBuffer();

      // Cache the downloaded stem
      setStemAudioData(prev => ({
        ...prev,
        [stemType]: arrayBuffer
      }));

      setStatus('ready');
      return arrayBuffer;
    } catch (err) {
      console.error(`Download ${stemType} error:`, err);
      setError(err.message || `Failed to download ${stemType} stem`);
      setStatus('error');
      return null;
    }
  }, [stems]);

  /**
   * Download all stems at once
   * @returns {Promise<Object>} - Object with all stem ArrayBuffers
   */
  const downloadAllStems = useCallback(async () => {
    if (!stems) {
      setError('No stems available');
      return null;
    }

    setStatus('downloading');
    setProgress(0);

    const stemTypes = ['vocals', 'drums', 'bass', 'other'];
    const results = {};
    let completed = 0;

    for (const stemType of stemTypes) {
      if (stems[stemType]) {
        const data = await downloadStem(stemType);
        if (data) {
          results[stemType] = data;
        }
        completed++;
        setProgress(Math.floor((completed / stemTypes.length) * 100));
      }
    }

    setStatus('ready');
    return results;
  }, [stems, downloadStem]);

  /**
   * Get stem audio data (download if needed)
   * @param {string} stemType - 'vocals' | 'drums' | 'bass' | 'other'
   * @returns {Promise<ArrayBuffer|null>}
   */
  const getStemAudio = useCallback(async (stemType) => {
    if (stemAudioDataRef.current[stemType]) {
      return stemAudioDataRef.current[stemType];
    }
    return downloadStem(stemType);
  }, [downloadStem]);

  /**
   * Clear all stems and reset state
   */
  const clearStems = useCallback(() => {
    stopPolling();
    setStems(null);
    setStemAudioData({});
    setBlobUrl(null);
    setStatus('idle');
    setProgress(0);
    setError(null);
    predictionIdRef.current = null;
  }, [stopPolling]);

  /**
   * Cancel ongoing separation
   */
  const cancelSeparation = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setProgress(0);
    predictionIdRef.current = null;
    // Note: The Replicate prediction will continue, but we stop tracking it
  }, [stopPolling]);

  /**
   * Restore stems from saved URLs (session resume — no re-separation needed).
   * Sets stems object and status to 'ready'. If URLs have expired, the next
   * downloadStem() call will detect 403/404 and set status to 'expired'.
   * @param {Object} savedStems - { vocals: url, drums: url, bass: url, other: url }
   * @param {string} [savedBlobUrl] - Optional Vercel Blob URL of the original audio
   */
  const restoreStems = useCallback((savedStems, savedBlobUrl) => {
    if (!savedStems) return;
    setStems(savedStems);
    setStemAudioData({});
    setStatus('ready');
    setProgress(100);
    setError(null);
    if (savedBlobUrl) {
      setBlobUrl(savedBlobUrl);
    }
  }, []);

  /**
   * Check if a specific stem is available
   */
  const hasStem = useCallback((stemType) => {
    return stems && stems[stemType];
  }, [stems]);

  /**
   * Check if a specific stem has been downloaded
   */
  const isStemDownloaded = useCallback((stemType) => {
    return !!stemAudioData[stemType];
  }, [stemAudioData]);

  return {
    // State
    stems,
    stemAudioData,
    blobUrl,
    status,
    progress,
    error,

    // Computed
    isProcessing: status === 'uploading' || status === 'processing',
    isReady: status === 'ready',
    isExpired: status === 'expired',
    hasStems: stems !== null,

    // Actions
    separateStems,
    restoreStems,
    downloadStem,
    downloadAllStems,
    getStemAudio,
    clearStems,
    cancelSeparation,
    hasStem,
    isStemDownloaded,
  };
}
