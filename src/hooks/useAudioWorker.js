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
   * @param {ArrayBuffer[]} [transfer] - Buffers to hand over instead of copying
   * @returns {Promise} - Resolves with the result
   */
  const postMessage = useCallback((type, payload, transfer = []) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = ++requestIdRef.current;
      pendingRequestsRef.current.set(id, { resolve, reject });
      setIsProcessing(true);

      workerRef.current.postMessage({ type, payload, id }, transfer);
    });
  }, []);

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
   * Spectral-centroid colour map for the waveform (Signal Deck). One t ∈ [0,1] per column,
   * -1 for silence.
   * @returns {Promise<{ colors: Float32Array, numColumns: number }>}
   */
  const generateWaveformColors = useCallback(async (channelData, sampleRate, numColumns = 512) => {
    const result = await postMessage('GENERATE_WAVEFORM_COLORS', { channelData: channelData.buffer.slice(0), sampleRate, numColumns });
    return { colors: new Float32Array(result.colors), numColumns: result.numColumns };
  }, [postMessage]);

  /**
   * Quick tempo + key detection. Used to stamp stem filenames with BPM/key as soon as
   * a track is decoded.
   * @param {Float32Array} channelData - Mono audio samples
   * @param {number} sampleRate
   * @returns {Promise<{ bpm: Object, key: Object }>}
   */
  const detectTempoAndKey = useCallback(async (channelData, sampleRate) => {
    const [bpm, key] = await Promise.all([
      postMessage('DETECT_BPM', { channelData: channelData.buffer.slice(0), sampleRate }),
      postMessage('DETECT_KEY', { channelData: channelData.buffer.slice(0), sampleRate }),
    ]);
    return { bpm, key };
  }, [postMessage]);

  /**
   * Section labels (intro / breakdown / buildup / drop / outro) from per-bar energy.
   * @param {{ role: string, data: Float32Array }[]} layers  the full mix, or one entry per stem
   * @param {number} sampleRate
   * @param {{ bpm?: number, gridOffset?: number }} options
   * @returns {Promise<{ sections: { label: string, start: number }[], bars: { start: number, intensity: number }[], barSec: number }>}
   */
  const detectSections = useCallback((layers, sampleRate, options) => {
    const payload = {
      layers: layers.map(l => ({ role: l.role, channelData: l.data.buffer.slice(l.data.byteOffset, l.data.byteOffset + l.data.byteLength) })),
      sampleRate,
      options,
    };
    return postMessage('DETECT_SECTIONS', payload, payload.layers.map(l => l.channelData));
  }, [postMessage]);

  return {
    isProcessing,
    progress,
    detectTempoAndKey,
    detectSections,
    generateWaveformColors,
    generateWaveformData,
  };
}
