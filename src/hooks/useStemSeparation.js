import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { upload } from '@vercel/blob/client';
import { zipSync, strToU8 } from 'fflate';
import { trackStemSeparationStarted, trackStemSeparationCompleted } from '../lib/posthog';
import { labAuthHeaders, getLabToken } from '../lib/labAuth';
import {
  SEPARATION_MODES,
  buildStemFilename,
  buildPackFilename,
  buildPackNotes,
  sanitizeForFilename,
} from '../utils/stemFiles';

/**
 * Hook for managing stem separation workflow using Replicate API.
 *
 * Flow:
 * 1. User uploads audio -> separateStems(audioData, filename, { mode }) called
 * 2. Audio uploaded to Vercel Blob storage (handles large files)
 * 3. Blob URL + mode sent to /api/separate-stems -> Replicate prediction started
 * 4. Prediction ID returned, polling begins via /api/check-stems
 * 5. When complete, stem URLs are available (Replicate CDN, ~7 day TTL)
 * 6. keepStem() re-hosts a stem on Vercel Blob so it never expires
 *    (automatic in 'vocals' mode — the Remix Lab default)
 * 7. downloadStemFile() / downloadRemixPack() save stamped FLACs locally
 */

const MIME_TYPES = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  webm: 'audio/webm',
};

/** File extension of a stem URL (Replicate returns .flac now, legacy sessions have .mp3). */
function extFromUrl(url, fallback = 'flac') {
  try {
    const path = new URL(url).pathname;
    const ext = path.split('.').pop()?.toLowerCase();
    return ext && ext.length <= 4 ? ext : fallback;
  } catch {
    return fallback;
  }
}

/** Infer separation mode from the set of stem keys (for restored sessions with no saved mode). */
function inferMode(stems) {
  if (!stems) return 'stems4';
  const keys = Object.keys(stems).filter(k => stems[k]);
  if (keys.includes('guitar') || keys.includes('piano')) return 'stems6';
  if (keys.length === 2 && keys.includes('vocals') && keys.includes('other')) return 'vocals';
  return 'stems4';
}

/** Trigger a browser download of a Blob with a given filename. */
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the browser a tick to start the download before revoking
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useStemSeparation() {
  // Stem URLs — keys depend on mode: { vocals, other } | { vocals, drums, bass, other } | 6-stem
  const [stems, setStems] = useState(null);

  // Which separation mode produced the current stems
  const [mode, setMode] = useState('vocals');

  // Downloaded stem audio data (ArrayBuffers) keyed by stem type
  const [stemAudioData, setStemAudioData] = useState({});

  // Vercel Blob URL of the original audio (persists indefinitely, used for session restore)
  const [blobUrl, setBlobUrl] = useState(null);

  // Current status: 'idle' | 'uploading' | 'processing' | 'downloading' | 'ready' | 'expired' | 'error'
  const [status, setStatus] = useState('idle');

  // Progress percentage (0-100)
  const [progress, setProgress] = useState(0);

  // Error message if any
  const [error, setError] = useState(null);

  // Per-stem persistence state: { [stemType]: 'saving' | 'saved' | 'error' }
  const [keepStatus, setKeepStatus] = useState({});

  // Prediction ID for polling
  const predictionIdRef = useRef(null);

  // HMAC ownership token returned by separate-stems; passed to check-stems to prevent IDOR
  const predictionTokenRef = useRef(null);

  // Whether to auto-persist stems to Blob once the current separation finishes
  const autoKeepRef = useRef(false);

  // Polling interval ref
  const pollIntervalRef = useRef(null);

  // Safety timeout ref (fire-and-forget prevention)
  const safetyTimeoutRef = useRef(null);

  // Track whether the hook's consumer is still mounted to prevent setState after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Refs synced with state to avoid stale closures in callbacks
  const stemAudioDataRef = useRef(stemAudioData);
  useEffect(() => { stemAudioDataRef.current = stemAudioData; }, [stemAudioData]);
  const stemsRef = useRef(stems);
  useEffect(() => { stemsRef.current = stems; }, [stems]);
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

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
   * Fetch a stem's audio as an ArrayBuffer (cached). Detects expired Replicate URLs.
   * Internal — does not touch `status` so it can run in the background.
   */
  const fetchStemBuffer = useCallback(async (stemType) => {
    if (stemAudioDataRef.current[stemType]) {
      return stemAudioDataRef.current[stemType];
    }
    const url = stemsRef.current?.[stemType];
    if (!url) throw new Error(`No ${stemType} stem available`);

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 403 || response.status === 404) {
        const err = new Error('Stem URLs have expired. Click "Separate" to re-process.');
        err.code = 'EXPIRED';
        throw err;
      }
      throw new Error(`Failed to download ${stemType} stem`);
    }
    const arrayBuffer = await response.arrayBuffer();
    if (mountedRef.current) {
      setStemAudioData(prev => ({ ...prev, [stemType]: arrayBuffer }));
    }
    stemAudioDataRef.current = { ...stemAudioDataRef.current, [stemType]: arrayBuffer };
    return arrayBuffer;
  }, []);

  /**
   * Re-host one stem on Vercel Blob so it survives Replicate's ~7-day CDN expiry.
   * Replaces stems[stemType] with the permanent URL on success.
   *
   * Storage note: Vercel Hobby includes ~1GB of Blob storage. A FLAC stem of a
   * 4-minute track is ~20-30MB, so this is deliberately opt-in outside vocals mode.
   */
  const keepStem = useCallback(async (stemType, meta = {}) => {
    const url = stemsRef.current?.[stemType];
    if (!url) return null;
    // Already on our Blob store — nothing to do
    if (/\.public\.blob\.vercel-storage\.com/.test(url)) {
      setKeepStatus(prev => ({ ...prev, [stemType]: 'saved' }));
      return url;
    }

    setKeepStatus(prev => ({ ...prev, [stemType]: 'saving' }));
    try {
      const buffer = await fetchStemBuffer(stemType);
      const ext = extFromUrl(url);
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
      const filename = buildStemFilename(meta, stemType, modeRef.current, ext);
      const folder = sanitizeForFilename(meta.title) || 'untitled';
      const file = new File([buffer], filename, { type: mimeType });

      const result = await upload(`stems/${folder}/${filename}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload-audio',
        headers: labAuthHeaders(),
      });

      if (!result?.url) throw new Error('Upload returned no URL');

      if (mountedRef.current) {
        setStems(prev => (prev ? { ...prev, [stemType]: result.url } : prev));
        setKeepStatus(prev => ({ ...prev, [stemType]: 'saved' }));
      }
      stemsRef.current = { ...stemsRef.current, [stemType]: result.url };
      return result.url;
    } catch (err) {
      console.error(`Keep ${stemType} error:`, err);
      if (mountedRef.current) {
        setKeepStatus(prev => ({ ...prev, [stemType]: 'error' }));
        if (err.code === 'EXPIRED') {
          setError(err.message);
          setStatus('expired');
        }
      }
      return null;
    }
  }, [fetchStemBuffer]);

  /**
   * Re-host every available stem (sequentially — keeps memory and bandwidth sane).
   */
  const keepAllStems = useCallback(async (meta = {}) => {
    const current = stemsRef.current;
    if (!current) return {};
    const results = {};
    for (const stemType of Object.keys(current)) {
      if (current[stemType]) {
        results[stemType] = await keepStem(stemType, meta);
      }
    }
    return results;
  }, [keepStem]);

  // Metadata to use when auto-keeping (set by separateStems from the caller's meta)
  const autoKeepMetaRef = useRef({});

  /**
   * Poll for prediction status
   */
  const pollStatus = useCallback(async () => {
    if (!predictionIdRef.current) return;

    try {
      const token = predictionTokenRef.current || '';
      const response = await fetch(
        `/api/check-stems?id=${predictionIdRef.current}&token=${encodeURIComponent(token)}`,
        { headers: labAuthHeaders() }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to check status');
      }

      const data = await response.json();

      // Guard: component may have unmounted while the fetch was in flight
      if (!mountedRef.current) return;

      // Update progress
      setProgress(data.progress || 0);

      if (data.status === 'succeeded' && data.stems) {
        // Separation complete!
        stopPolling();
        setStems(data.stems);
        stemsRef.current = data.stems;
        setStatus('ready');
        setProgress(100);
        predictionIdRef.current = null;
        predictionTokenRef.current = null;
        trackStemSeparationCompleted();

        // Vocals mode: re-host both files right away so the vault entry never expires
        if (autoKeepRef.current) {
          autoKeepRef.current = false;
          keepAllStems(autoKeepMetaRef.current);
        }
      } else if (data.status === 'failed') {
        // Separation failed
        stopPolling();
        setError(data.error || 'Stem separation failed');
        setStatus('error');
        predictionIdRef.current = null;
        predictionTokenRef.current = null;
      }
      // Otherwise keep polling
    } catch (err) {
      console.error('Polling error:', err);
      // Don't stop polling on transient errors, just log
    }
  }, [stopPolling, keepAllStems]);

  /**
   * Start stem separation process
   * @param {ArrayBuffer} audioData - The audio file as ArrayBuffer
   * @param {string} filename - Original filename for the upload (extension matters for MIME)
   * @param {object} [options]
   * @param {'vocals'|'stems4'|'stems6'} [options.mode='vocals']
   * @param {'best'|'fast'} [options.quality='best']
   * @param {boolean} [options.autoKeep] - Re-host stems on Blob when done (default: mode === 'vocals')
   * @param {string} [options.existingUrl] - Source already on our Blob store: skip the upload, keep the vault id
   * @param {object} [options.meta] - { artist, title, bpm, key } used for persisted filenames
   * @returns {Promise<boolean>} - True if started successfully
   */
  const separateStems = useCallback(async (audioData, filename = 'audio.mp3', options = {}) => {
    if (!audioData) {
      setError('No audio data provided');
      return false;
    }

    const selectedMode = SEPARATION_MODES.some(m => m.id === options.mode) ? options.mode : 'vocals';
    const quality = options.quality === 'fast' ? 'fast' : 'best';
    autoKeepRef.current = options.autoKeep ?? (selectedMode === 'vocals');
    autoKeepMetaRef.current = options.meta || {};

    // Reset state
    setStems(null);
    stemsRef.current = null;
    setStemAudioData({});
    stemAudioDataRef.current = {};
    setKeepStatus({});
    setError(null);
    setProgress(0);
    setStatus('uploading');
    setMode(selectedMode);
    modeRef.current = selectedMode;
    stopPolling();

    try {
      // Step 1: Upload to Vercel Blob (skipped when the source is already there — a vault
      // track being re-separated keeps its Blob URL, and therefore its vault id)
      setProgress(5);

      if (!getLabToken()) {
        const err = new Error('Unlock the lab to separate stems — it runs on a paid GPU.');
        err.code = 'UNAUTHENTICATED';
        throw err;
      }
      const authHeaders = labAuthHeaders();

      let blobResult;
      if (options.existingUrl && /\.public\.blob\.vercel-storage\.com/.test(options.existingUrl)) {
        blobResult = { url: options.existingUrl };
      } else {
        const extension = filename.split('.').pop()?.toLowerCase() || 'mp3';
        const mimeType = MIME_TYPES[extension] || 'audio/mpeg';

        // Convert ArrayBuffer to Blob for upload
        const audioBlob = new Blob([audioData], { type: mimeType });
        const file = new File([audioBlob], filename, { type: mimeType });

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

        try {
          blobResult = await Promise.race([uploadPromise, timeoutPromise]);
        } catch (uploadErr) {
          console.error('Blob upload failed:', uploadErr);
          throw new Error(uploadErr.message || 'Failed to upload audio file. Please try again.');
        }
      }

      if (!blobResult.url) {
        throw new Error('Failed to upload audio file');
      }

      // Persist the blob URL for session restore (Vercel Blob URLs don't expire)
      setBlobUrl(blobResult.url);

      setProgress(30);
      setStatus('processing');

      // Step 2: Start stem separation with the blob URL
      const response = await fetch('/api/separate-stems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ audioUrl: blobResult.url, mode: selectedMode, quality }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to start stem separation');
      }

      const data = await response.json();

      if (!data.predictionId) {
        throw new Error('No prediction ID returned');
      }

      // Store prediction ID and ownership token for polling
      predictionIdRef.current = data.predictionId;
      predictionTokenRef.current = data.token || '';
      setProgress(35);

      trackStemSeparationStarted();

      // Poll every 2 seconds
      pollIntervalRef.current = setInterval(pollStatus, 2000);

      // Also poll immediately
      setTimeout(pollStatus, 500);

      // Safety timeout: 10 minutes. htdemucs_ft on a long track can take 3-5 min.
      safetyTimeoutRef.current = setTimeout(() => {
        safetyTimeoutRef.current = null;
        if (pollIntervalRef.current) {
          stopPolling();
          if (!mountedRef.current) return;
          setError('Stem separation timed out. The process may still be running — try refreshing the page.');
          setStatus('error');
        }
      }, 600000);

      return true;
    } catch (err) {
      console.error('Stem separation error:', err);
      setError(err.message || 'Failed to separate stems');
      setStatus('error');
      return false;
    }
  }, [stopPolling, pollStatus]);

  /**
   * Download a specific stem and return as ArrayBuffer (updates status while fetching)
   * @param {string} stemType
   * @returns {Promise<ArrayBuffer|null>}
   */
  const downloadStem = useCallback(async (stemType) => {
    if (!stemsRef.current || !stemsRef.current[stemType]) {
      setError(`No ${stemType} stem available`);
      return null;
    }

    if (stemAudioDataRef.current[stemType]) {
      return stemAudioDataRef.current[stemType];
    }

    try {
      setStatus('downloading');
      const buffer = await fetchStemBuffer(stemType);
      setStatus('ready');
      return buffer;
    } catch (err) {
      console.error(`Download ${stemType} error:`, err);
      setError(err.message || `Failed to download ${stemType} stem`);
      setStatus(err.code === 'EXPIRED' ? 'expired' : 'error');
      return null;
    }
  }, [fetchStemBuffer]);

  /**
   * Download all stems at once
   * @returns {Promise<Object>} - Object with all stem ArrayBuffers
   */
  const downloadAllStems = useCallback(async () => {
    const current = stemsRef.current;
    if (!current) {
      setError('No stems available');
      return null;
    }

    setStatus('downloading');
    setProgress(0);

    const stemTypes = Object.keys(current).filter(k => current[k]);
    const results = {};
    let completed = 0;

    for (const stemType of stemTypes) {
      const data = await downloadStem(stemType);
      if (data) results[stemType] = data;
      completed++;
      setProgress(Math.floor((completed / stemTypes.length) * 100));
    }

    setStatus('ready');
    return results;
  }, [downloadStem]);

  /**
   * Save one stem to disk with a stamped filename, e.g.
   * "Artist - Title - 124bpm - Am - vocals.flac"
   * @param {string} stemType
   * @param {object} meta - { artist, title, bpm, key }
   */
  const downloadStemFile = useCallback(async (stemType, meta = {}) => {
    const url = stemsRef.current?.[stemType];
    if (!url) return false;
    const buffer = await downloadStem(stemType);
    if (!buffer) return false;
    const ext = extFromUrl(url);
    const blob = new Blob([buffer], { type: MIME_TYPES[ext] || 'application/octet-stream' });
    saveBlob(blob, buildStemFilename(meta, stemType, modeRef.current, ext));
    return true;
  }, [downloadStem]);

  /**
   * Save every stem plus a notes.txt (BPM, key, Camelot, compatible keys, Ableton tips)
   * as a single "Remix Pack" zip. Stored uncompressed — FLAC is already compressed.
   * @param {object} meta - { artist, title, bpm, key, ... }
   */
  const downloadRemixPack = useCallback(async (meta = {}) => {
    const buffers = await downloadAllStems();
    if (!buffers || Object.keys(buffers).length === 0) return false;

    const currentMode = modeRef.current;
    const stemTypes = Object.keys(buffers);
    const entries = {};
    for (const stemType of stemTypes) {
      const ext = extFromUrl(stemsRef.current[stemType]);
      entries[buildStemFilename(meta, stemType, currentMode, ext)] = new Uint8Array(buffers[stemType]);
    }
    entries['notes.txt'] = strToU8(buildPackNotes(meta, stemTypes, currentMode));

    const zipped = zipSync(entries, { level: 0 });
    saveBlob(new Blob([zipped], { type: 'application/zip' }), buildPackFilename(meta));
    return true;
  }, [downloadAllStems]);

  /**
   * Get stem audio data (download if needed)
   * @param {string} stemType
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
    stemsRef.current = null;
    setStemAudioData({});
    stemAudioDataRef.current = {};
    setKeepStatus({});
    setBlobUrl(null);
    setStatus('idle');
    setProgress(0);
    setError(null);
    predictionIdRef.current = null;
    predictionTokenRef.current = null;
    autoKeepRef.current = false;
  }, [stopPolling]);

  /**
   * Cancel ongoing separation
   */
  const cancelSeparation = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setProgress(0);
    predictionIdRef.current = null;
    predictionTokenRef.current = null;
    autoKeepRef.current = false;
    // Note: The Replicate prediction will continue, but we stop tracking it
  }, [stopPolling]);

  /**
   * Restore stems from saved URLs (session resume — no re-separation needed).
   * @param {Object} savedStems - stem URL map
   * @param {string} [savedBlobUrl] - Optional Vercel Blob URL of the original audio
   * @param {string} [savedMode] - Separation mode; inferred from the keys if omitted
   */
  const restoreStems = useCallback((savedStems, savedBlobUrl, savedMode) => {
    if (!savedStems) return;
    const restoredMode = savedMode || inferMode(savedStems);
    setStems(savedStems);
    stemsRef.current = savedStems;
    setMode(restoredMode);
    modeRef.current = restoredMode;
    setStemAudioData({});
    stemAudioDataRef.current = {};
    // Anything already on our Blob store is permanently kept
    const restoredKeep = {};
    for (const [k, url] of Object.entries(savedStems)) {
      if (url && /\.public\.blob\.vercel-storage\.com/.test(url)) restoredKeep[k] = 'saved';
    }
    setKeepStatus(restoredKeep);
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
    return !!(stems && stems[stemType]);
  }, [stems]);

  /**
   * Check if a specific stem has been downloaded
   */
  const isStemDownloaded = useCallback((stemType) => {
    return !!stemAudioData[stemType];
  }, [stemAudioData]);

  /** Stem types available in the current result, in canonical display order */
  const stemTypes = useMemo(() => stems
    ? ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other'].filter(k => stems[k])
    : [], [stems]);

  return {
    // State
    stems,
    stemTypes,
    mode,
    stemAudioData,
    blobUrl,
    status,
    progress,
    error,
    keepStatus,

    // Computed
    isProcessing: status === 'uploading' || status === 'processing',
    isReady: status === 'ready',
    isExpired: status === 'expired',
    hasStems: stems !== null,
    isKeeping: Object.values(keepStatus).some(s => s === 'saving'),

    // Actions
    separateStems,
    restoreStems,
    downloadStem,
    downloadAllStems,
    downloadStemFile,
    downloadRemixPack,
    keepStem,
    keepAllStems,
    getStemAudio,
    clearStems,
    cancelSeparation,
    hasStem,
    isStemDownloaded,
  };
}
