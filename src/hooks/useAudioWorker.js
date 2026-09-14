import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Custom hook for managing the audio analysis Web Worker.
 * Handles worker lifecycle, message passing, and progress tracking.
 */
export function useAudioWorker() {
  const workerRef = useRef(null);
  const pendingRequestsRef = useRef(new Map());
  const requestIdRef = useRef(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, status: '' });

  // Initialize worker on mount
  useEffect(() => {
    // Use Vite's worker import syntax
    workerRef.current = new Worker(
      new URL('../workers/audio.worker.js', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e) => {
      const { type, id, result, error, percent, status } = e.data;

      if (type === 'PROGRESS') {
        setProgress({ percent, status });
        return;
      }

      const pending = pendingRequestsRef.current.get(id);
      if (!pending) return;

      pendingRequestsRef.current.delete(id);

      if (type === 'SUCCESS') {
        pending.resolve(result);
      } else if (type === 'ERROR') {
        pending.reject(new Error(error));
      }

      // Check if any requests are still pending
      if (pendingRequestsRef.current.size === 0) {
        setIsProcessing(false);
        setProgress({ percent: 0, status: '' });
      }
    };

    workerRef.current.onerror = (e) => {
      console.error('Worker error:', e);
      // Reject all pending requests
      for (const [, pending] of pendingRequestsRef.current) {
        pending.reject(new Error('Worker error'));
      }
      pendingRequestsRef.current.clear();
      setIsProcessing(false);
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  /**
   * Send a message to the worker and wait for response.
   * @param {string} type - Message type
   * @param {Object} payload - Message payload
   * @returns {Promise} - Resolves with the result
   */
  const postMessage = useCallback((type, payload) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = ++requestIdRef.current;
      pendingRequestsRef.current.set(id, { resolve, reject });
      setIsProcessing(true);

      workerRef.current.postMessage({ type, payload, id });
    });
  }, []);

  /**
   * Run full audio analysis in the worker.
   * @param {Float32Array} channelData - Audio samples
   * @param {number} sampleRate - Sample rate in Hz
   * @returns {Promise<Object>} - Analysis results
   */
  const analyzeAudio = useCallback(async (channelData, sampleRate) => {
    // Convert Float32Array to transferable buffer
    const buffer = channelData.buffer.slice(0);
    return postMessage('ANALYZE_FULL', {
      channelData: buffer,
      sampleRate
    });
  }, [postMessage]);

  /**
   * Detect instruments in the worker.
   * @param {Float32Array} channelData - Audio samples
   * @param {number} sampleRate - Sample rate in Hz
   * @returns {Promise<Object>} - Instrument detection result
   */
  const detectInstruments = useCallback(async (channelData, sampleRate) => {
    const buffer = channelData.buffer.slice(0);
    return postMessage('DETECT_INSTRUMENTS', { channelData: buffer, sampleRate });
  }, [postMessage]);

  /**
   * Calculate spectral match in the worker.
   * @param {Float32Array} channelDataA - First audio samples
   * @param {Float32Array} channelDataB - Second audio samples
   * @param {number} sampleRate - Sample rate in Hz
   * @returns {Promise<Object>} - Match result
   */
  const calculateSpectralMatch = useCallback(async (channelDataA, channelDataB, sampleRate) => {
    const bufferA = channelDataA.buffer.slice(0);
    const bufferB = channelDataB.buffer.slice(0);
    return postMessage('SPECTRAL_MATCH', {
      channelDataA: bufferA,
      channelDataB: bufferB,
      sampleRate
    });
  }, [postMessage]);

  /**
   * Detect harmonics in the worker.
   * @param {Float32Array} channelData - Audio samples
   * @param {number} sampleRate - Sample rate in Hz
   * @returns {Promise<Array>} - Harmonics data
   */
  const detectHarmonics = useCallback(async (channelData, sampleRate) => {
    const buffer = channelData.buffer.slice(0);
    return postMessage('DETECT_HARMONICS', { channelData: buffer, sampleRate });
  }, [postMessage]);

  /**
   * Generate high-resolution min/max waveform data in the worker.
   * Returns ~1 min/max pair per 64 samples for deep zoom rendering.
   * @param {Float32Array} channelData - Audio samples
   * @param {number} sampleRate - Sample rate in Hz
   * @returns {Promise<Object>} - { mins: Float32Array, maxes: Float32Array, numBlocks, blockSize, totalSamples, sampleRate }
   */
  const generateWaveformData = useCallback(async (channelData, sampleRate) => {
    const buffer = channelData.buffer.slice(0);
    const raw = await postMessage('GENERATE_WAVEFORM_DATA', { channelData: buffer, sampleRate });
    // Reconstruct Float32Arrays from transferred ArrayBuffers
    return {
      mins: new Float32Array(raw.mins),
      maxes: new Float32Array(raw.maxes),
      numBlocks: raw.numBlocks,
      blockSize: raw.blockSize,
      totalSamples: raw.totalSamples,
      sampleRate: raw.sampleRate
    };
  }, [postMessage]);

  /**
   * Extract wavetable frames from audio for Vital preset injection.
   * @param {Float32Array} channelData - Audio samples
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} [numFrames=256] - Number of wavetable frames to extract
   * @returns {Promise<Object>} - { keyframes, fundamentalHz, numFrames, success, error? }
   */
  const extractWavetable = useCallback(async (channelData, sampleRate, numFrames = 256) => {
    const buffer = channelData.buffer.slice(0);
    return postMessage('EXTRACT_WAVETABLE', { channelData: buffer, sampleRate, numFrames });
  }, [postMessage]);

  /**
   * Spectral-centroid colour map for the waveform (Signal Deck). One t ∈ [0,1] per column,
   * -1 for silence.
   * @returns {Promise<{ colors: Float32Array, numColumns: number }>}
   */
  const generateWaveformColors = useCallback(async (channelData, sampleRate, numColumns = 512) => {
    const result = await postMessage('GENERATE_WAVEFORM_COLORS', { channelData: channelData.buffer.slice(0), sampleRate, numColumns });
    return { colors: new Float32Array(result.colors), numColumns: result.numColumns };
  }, [postMessage]);

  /**
   * Quick tempo + key detection (no full feature extraction). Used to stamp
   * stem filenames with BPM/key as soon as a track is decoded.
   * @param {Float32Array} channelData - Mono audio samples
   * @param {number} sampleRate
   * @returns {Promise<{ bpm: Object, key: Object }>}
   */
  /** Per-bar anatomy of a stem: structure, chords / bass roots, drum density, band balance */
  const analyzeStemAnatomy = useCallback((channelData, sampleRate, options) => {
    return postMessage('ANALYZE_STEM_ANATOMY', { channelData: channelData.buffer.slice(0), sampleRate, options });
  }, [postMessage]);

  const detectTempoAndKey = useCallback(async (channelData, sampleRate) => {
    const [bpm, key] = await Promise.all([
      postMessage('DETECT_BPM', { channelData: channelData.buffer.slice(0), sampleRate }),
      postMessage('DETECT_KEY', { channelData: channelData.buffer.slice(0), sampleRate }),
    ]);
    return { bpm, key };
  }, [postMessage]);

  return {
    isProcessing,
    progress,
    analyzeAudio,
    detectInstruments,
    detectTempoAndKey,
    analyzeStemAnatomy,
    generateWaveformColors,
    calculateSpectralMatch,
    detectHarmonics,
    generateWaveformData,
    extractWavetable
  };
}
