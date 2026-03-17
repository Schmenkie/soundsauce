import { useState, useRef, useEffect, useCallback } from 'react';
import { useAudioWorker } from './useAudioWorker';

/**
 * Fast Fourier Transform (Cooley-Tukey radix-2 DIT algorithm)
 * O(n log n) vs O(n²) for DFT - critical for performance
 */
function fft(real, imag) {
  const n = real.length;
  if (n <= 1) return;

  // Bit-reversal permutation
  for (let i = 0, j = 0; i < n; i++) {
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  // Cooley-Tukey iterative FFT
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = -2 * Math.PI / len;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curReal = 1, curImag = 0;
      for (let j = 0; j < halfLen; j++) {
        const idx1 = i + j;
        const idx2 = i + j + halfLen;
        const tReal = curReal * real[idx2] - curImag * imag[idx2];
        const tImag = curReal * imag[idx2] + curImag * real[idx2];
        real[idx2] = real[idx1] - tReal;
        imag[idx2] = imag[idx1] - tImag;
        real[idx1] += tReal;
        imag[idx1] += tImag;
        const newCurReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = newCurReal;
      }
    }
  }
}

/**
 * Compute magnitude spectrum using FFT
 * Returns array of magnitudes for positive frequencies
 */
function computeMagnitudeSpectrum(data, windowSize) {
  // Ensure power of 2 for FFT
  const n = windowSize;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);

  // Apply Hann window and copy data
  for (let i = 0; i < n && i < data.length; i++) {
    const hannWindow = 0.5 * (1 - Math.cos(2 * Math.PI * i / n));
    real[i] = data[i] * hannWindow;
  }

  fft(real, imag);

  // Compute magnitudes for positive frequencies
  const magnitudes = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }

  return magnitudes;
}

/**
 * Custom hook for audio processing, playback, and analysis.
 * Handles AudioContext lifecycle, playback controls, waveform generation,
 * spectrum visualization, and audio feature extraction.
 */
export function useAudioProcessor() {
  // Web Worker for heavy DSP operations
  const worker = useAudioWorker();

  // Audio state
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [spectrumData, setSpectrumData] = useState([]);
  const [waveformData, setWaveformData] = useState([]);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(0);

  // Loop state
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(null);
  const [loopEnd, setLoopEnd] = useState(null);

  // Audio nodes refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const gainNodeRef = useRef(null);
  const animationRef = useRef(null);
  const previousSpectrumRef = useRef(new Array(64).fill(0));

  // Timing refs
  const startTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const durationRef = useRef(0);
  const audioBufferRef = useRef(null);
  const audioBufferSourceRef = useRef(null); // Track which raw audio data was decoded into audioBufferRef
  const playbackTimeRef = useRef(0);
  const waveformHiResRef = useRef(null);

  // Loop refs (for use in callbacks)
  const loopEnabledRef = useRef(false);
  const loopStartRef = useRef(null);
  const loopEndRef = useRef(null);

  // Function ref for recursive callback
  const playAudioBufferRef = useRef(null);

  // Performance optimization: refs for high-frequency visualization data
  // These are updated every frame, but state is only updated periodically
  const spectrumDataRef = useRef([]);
  const brightnessRef = useRef(0);
  const lastStateUpdateRef = useRef(0);
  const STATE_UPDATE_INTERVAL = 50; // Update React state every 50ms (20fps for state, 60fps for refs)

  // Keep refs in sync with state (consolidated into two effects)
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    durationRef.current = duration;
    audioBufferRef.current = audioBuffer;
    playbackTimeRef.current = playbackTime;
  }, [isPlaying, duration, audioBuffer, playbackTime]);

  useEffect(() => {
    loopEnabledRef.current = loopEnabled;
    loopStartRef.current = loopStart;
    loopEndRef.current = loopEnd;
  }, [loopEnabled, loopStart, loopEnd]);

  // Volume control - update gain node when volume changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  /**
   * Cleanup function to properly dispose of audio resources.
   * Prevents memory leaks by disconnecting nodes and closing context.
   */
  const cleanup = useCallback(() => {
    // Cancel any pending animation frames
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Stop and disconnect the source node
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // Source may already be stopped
      }
      try {
        sourceRef.current.disconnect();
      } catch {
        // Source may already be disconnected
      }
      sourceRef.current = null;
    }

    // Disconnect analyser node
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {
        // May already be disconnected
      }
      analyserRef.current = null;
    }

    // Disconnect gain node
    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.disconnect();
      } catch {
        // May already be disconnected
      }
      gainNodeRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.warn('Error closing AudioContext:', e);
      }
      audioContextRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  /**
   * Get or create AudioContext, handling browser autoplay policy.
   */
  const getAudioContext = useCallback(async () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  /**
   * Generate waveform data from audio buffer (downsampled to 200 points).
   */
  const generateWaveform = useCallback((buffer) => {
    const rawData = buffer.getChannelData(0);
    const samples = 200;
    const blockSize = Math.floor(rawData.length / samples);
    const waveform = [];

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[i * blockSize + j]);
      }
      waveform.push(sum / blockSize);
    }

    // Normalize
    const max = Math.max(...waveform);
    return max > 0 ? waveform.map(v => v / max) : waveform;
  }, []);

  /**
   * Calculate real-time spectral centroid from frequency data.
   * Returns a normalized value between 0 and 1, where higher = brighter sound.
   */
  const calculateSpectralCentroid = useCallback((frequencyData, bufferLength) => {
    let weightedSum = 0;
    let magnitudeSum = 0;

    // Calculate weighted average of frequency bins
    for (let i = 0; i < bufferLength; i++) {
      const magnitude = frequencyData[i];
      weightedSum += i * magnitude;
      magnitudeSum += magnitude;
    }

    if (magnitudeSum === 0) return 0;

    // Get the centroid bin index
    const centroidBin = weightedSum / magnitudeSum;

    // Normalize to 0-1 range (centroid relative to Nyquist frequency)
    // Using a perceptual scaling - most musical content is in lower frequencies
    const normalizedCentroid = centroidBin / bufferLength;

    // Apply a curve to make the brightness more perceptually meaningful
    // Square root scaling spreads out the lower values
    return Math.min(1, Math.sqrt(normalizedCentroid) * 1.5);
  }, []);

  /**
   * Real-time spectrum visualization using requestAnimationFrame.
   * Performance optimized: refs update every frame, React state updates throttled.
   */
  const visualize = useCallback(() => {
    if (!analyserRef.current || !sourceRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!sourceRef.current) return;

      animationRef.current = requestAnimationFrame(draw);

      analyserRef.current.getByteFrequencyData(dataArray);

      const now = performance.now();
      const shouldUpdateState = now - lastStateUpdateRef.current >= STATE_UPDATE_INTERVAL;

      // Update playback time (always update ref, throttle state)
      if (audioContextRef.current && startTimeRef.current !== null && startTimeRef.current !== undefined) {
        const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
        playbackTimeRef.current = Math.min(elapsed, durationRef.current);
      }

      // Calculate real-time spectral centroid for brightness (always update ref)
      brightnessRef.current = calculateSpectralCentroid(dataArray, bufferLength);

      // Generate 64-bar spectrum with exponential frequency mapping
      const numBars = 64;
      const spectrum = [];
      const responsiveness = 0.7; // Higher = more responsive to changes

      for (let i = 0; i < numBars; i++) {
        // Exponential mapping for perceptual frequency distribution
        const percent = i / numBars;
        const expPercent = Math.pow(percent, 2.5);
        const centerIndex = Math.floor(expPercent * bufferLength);

        // Sample a few neighboring bins and average for smoother appearance
        const range = Math.max(1, Math.floor(bufferLength / numBars / 2));
        let sum = 0;
        let count = 0;
        for (let j = Math.max(0, centerIndex - range); j <= Math.min(bufferLength - 1, centerIndex + range); j++) {
          sum += dataArray[j];
          count++;
        }
        const avgValue = sum / count / 255;

        // Boost quieter values for better visibility
        const boostedValue = Math.pow(avgValue, 0.6);

        // Blend with previous frame for smoothness
        const previousValue = previousSpectrumRef.current[i] || 0;
        const smoothedValue = previousValue * (1 - responsiveness) + boostedValue * responsiveness;

        spectrum.push(smoothedValue);
      }

      // Store for next frame (always update ref)
      previousSpectrumRef.current = spectrum;
      spectrumDataRef.current = spectrum;

      // Throttled state updates (only every STATE_UPDATE_INTERVAL ms)
      if (shouldUpdateState) {
        lastStateUpdateRef.current = now;
        setPlaybackTime(playbackTimeRef.current);
        setBrightness(brightnessRef.current);
        setSpectrumData(spectrum);
      }
    };

    draw();
  }, [calculateSpectralCentroid]);

  /**
   * Play audio buffer from a specific start time.
   */
  const playAudioBuffer = useCallback((buffer, startTime = 0) => {
    if (!audioContextRef.current) return;

    // Create new source node (BufferSource can only be used once)
    sourceRef.current = audioContextRef.current.createBufferSource();
    sourceRef.current.buffer = buffer;

    // Create or reuse analyser node
    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      analyserRef.current.smoothingTimeConstant = 0.4;
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -20;
    }

    // Create or reuse gain node
    if (!gainNodeRef.current) {
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = volume;
    }

    // Connect the audio graph: source -> gain -> analyser -> destination
    sourceRef.current.connect(gainNodeRef.current);
    gainNodeRef.current.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);

    // Handle playback end
    sourceRef.current.onended = () => {
      // Check if we should loop
      if (loopEnabledRef.current && loopStartRef.current !== null && loopEndRef.current !== null) {
        // Use ref to get the latest version of playAudioBuffer
        if (playAudioBufferRef.current) {
          playAudioBufferRef.current(buffer, loopStartRef.current);
        }
        return;
      }

      setIsPlaying(false);
      setPlaybackTime(0);
      setSpectrumData([]);
      setBrightness(0);
      previousSpectrumRef.current = new Array(64).fill(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      sourceRef.current = null;
    };

    const clampedStart = Math.max(0, Math.min(startTime, buffer.duration - 0.1));
    startTimeRef.current = audioContextRef.current.currentTime - clampedStart;

    // If looping, set the duration to stop at loop end
    if (loopEnabledRef.current && loopEndRef.current !== null) {
      const loopDuration = loopEndRef.current - clampedStart;
      sourceRef.current.start(0, clampedStart, loopDuration);
    } else {
      sourceRef.current.start(0, clampedStart);
    }

    setIsPlaying(true);
    setPlaybackTime(clampedStart);

    requestAnimationFrame(() => visualize());
  }, [volume, visualize]);

  // Keep playAudioBuffer ref in sync for use in callbacks
  useEffect(() => {
    playAudioBufferRef.current = playAudioBuffer;
  }, [playAudioBuffer]);

  /**
   * Toggle audio playback (play/pause).
   */
  const togglePlayback = useCallback(async (audioFileData) => {
    if (!audioFileData) {
      return { error: 'Please upload audio first' };
    }

    try {
      const ctx = await getAudioContext();

      if (isPlayingRef.current) {
        // Stop playback
        if (sourceRef.current) {
          try {
            sourceRef.current.stop();
          } catch {
            // Already stopped
          }
          sourceRef.current.disconnect();
          sourceRef.current = null;
        }
        setIsPlaying(false);
        setSpectrumData([]);
        setBrightness(0);
        previousSpectrumRef.current = new Array(64).fill(0);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      } else {
        // Start playback
        // Check if we need to decode new audio data (e.g. playing a stem vs full mix)
        const isNewAudioSource = audioFileData !== audioBufferSourceRef.current;
        if (!audioBufferRef.current || isNewAudioSource) {
          const decoded = await ctx.decodeAudioData(audioFileData.slice(0));
          audioBufferRef.current = decoded;
          audioBufferSourceRef.current = audioFileData;
          durationRef.current = decoded.duration;
          // Only update waveform/duration state for main audio, not stem previews
          if (!audioBufferSourceRef.current || isNewAudioSource) {
            setAudioBuffer(decoded);
            setDuration(decoded.duration);
          }

          playbackTimeRef.current = 0;
          playAudioBuffer(decoded, 0);
        } else {
          const startPos = loopEnabledRef.current && loopStartRef.current !== null
            ? loopStartRef.current
            : playbackTimeRef.current;
          playAudioBuffer(audioBufferRef.current, startPos);
        }
      }

      return { error: null };
    } catch {
      setIsPlaying(false);
      return { error: 'Error playing audio' };
    }
  }, [getAudioContext, generateWaveform, playAudioBuffer]);

  /**
   * Skip forward or backward in time.
   */
  const skipTime = useCallback((seconds) => {
    if (!audioBufferRef.current || !durationRef.current) return;

    const currentTime = playbackTimeRef.current;
    const newTime = Math.max(0, Math.min(currentTime + seconds, durationRef.current - 0.1));

    const wasPlaying = isPlayingRef.current;

    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // Already stopped
      }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsPlaying(false);
    setPlaybackTime(newTime);

    if (wasPlaying) {
      setTimeout(() => {
        playAudioBuffer(audioBufferRef.current, newTime);
      }, 10);
    }
  }, [playAudioBuffer]);

  /**
   * Seek to a specific time in the audio.
   */
  const seek = useCallback((newTime) => {
    if (!audioBufferRef.current || !durationRef.current) return;

    const wasPlaying = isPlayingRef.current;

    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // Already stopped
      }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsPlaying(false);
    setPlaybackTime(newTime);

    if (wasPlaying) {
      setTimeout(() => {
        playAudioBuffer(audioBufferRef.current, newTime);
      }, 10);
    }
  }, [playAudioBuffer]);

  /**
   * Clear the loop region.
   */
  const clearLoop = useCallback(() => {
    setLoopStart(null);
    setLoopEnd(null);
    setLoopEnabled(false);
  }, []);

  /**
   * Reset audio state (when loading new file).
   */
  const reset = useCallback(() => {
    // Stop current playback
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
      } catch {
        // Already stopped/disconnected
      }
      sourceRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Reset analyser to pick up any new settings
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch { /* ignore */ }
      analyserRef.current = null;
    }

    setIsPlaying(false);
    setAudioBuffer(null);
    setWaveformData([]);
    setSpectrumData([]);
    setBrightness(0);
    previousSpectrumRef.current = new Array(64).fill(0);
    setPlaybackTime(0);
    setDuration(0);
    clearLoop();

    audioBufferRef.current = null;
    audioBufferSourceRef.current = null;
    durationRef.current = 0;
  }, [clearLoop]);

  /**
   * Find attack time in audio data.
   */
  const findAttackTime = useCallback((data, sampleRate) => {
    const threshold = 0.05;
    let start = -1;
    let peak = 0;
    let peakIndex = 0;

    for (let i = 0; i < Math.min(data.length, sampleRate); i++) {
      const abs = Math.abs(data[i]);
      if (abs > threshold && start === -1) start = i;
      if (abs > peak) {
        peak = abs;
        peakIndex = i;
      }
    }

    if (start === -1 || peakIndex === start) return 0;
    return ((peakIndex - start) / sampleRate) * 1000;
  }, []);

  /**
   * Analyze frequency band energy distribution using FFT.
   * Returns energy in each frequency band as a ratio of total energy.
   */
  const analyzeFrequencyBands = useCallback((channelData, sampleRate) => {
    // Use power of 2 for FFT efficiency
    const windowSize = Math.min(4096, channelData.length);
    const data = channelData.slice(0, windowSize);

    // Define frequency bands (in Hz)
    const bands = {
      subBass: { min: 20, max: 60 },
      bass: { min: 60, max: 250 },
      lowMid: { min: 250, max: 500 },
      mid: { min: 500, max: 2000 },
      highMid: { min: 2000, max: 6000 },
      high: { min: 6000, max: 20000 }
    };

    const freqResolution = sampleRate / windowSize;
    const bandEnergy = {};

    // Use FFT instead of O(n²) DFT
    const magnitudes = computeMagnitudeSpectrum(data, windowSize);

    let totalEnergy = 0;
    for (let i = 0; i < magnitudes.length; i++) {
      totalEnergy += magnitudes[i];
    }

    // Calculate energy in each band
    for (const [bandName, range] of Object.entries(bands)) {
      const minBin = Math.floor(range.min / freqResolution);
      const maxBin = Math.min(Math.ceil(range.max / freqResolution), windowSize / 2 - 1);

      let bandSum = 0;
      for (let i = minBin; i <= maxBin; i++) {
        bandSum += magnitudes[i];
      }
      bandEnergy[bandName] = totalEnergy > 0 ? bandSum / totalEnergy : 0;
    }

    return bandEnergy;
  }, []);

  /**
   * Analyze temporal envelope characteristics.
   */
  const analyzeEnvelope = useCallback((channelData, sampleRate) => {
    const blockSize = Math.floor(sampleRate / 100); // 10ms blocks
    const numBlocks = Math.floor(channelData.length / blockSize);
    const envelope = [];

    for (let i = 0; i < numBlocks; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[i * blockSize + j]);
      }
      envelope.push(sum / blockSize);
    }

    if (envelope.length === 0) return { decay: 0, sustain: 0, isPercussive: false };

    const peak = Math.max(...envelope);
    const peakIndex = envelope.indexOf(peak);

    // Calculate decay rate (how quickly it falls from peak)
    let decaySum = 0;
    let decayCount = 0;
    for (let i = peakIndex + 1; i < Math.min(peakIndex + 20, envelope.length); i++) {
      decaySum += (envelope[i - 1] - envelope[i]) / peak;
      decayCount++;
    }
    const decayRate = decayCount > 0 ? decaySum / decayCount : 0;

    // Calculate sustain level (average level in latter half)
    const latterHalf = envelope.slice(Math.floor(envelope.length / 2));
    const sustainLevel = latterHalf.length > 0
      ? latterHalf.reduce((a, b) => a + b, 0) / latterHalf.length / peak
      : 0;

    // Is it percussive? (fast attack, quick decay)
    const isPercussive = peakIndex < 5 && decayRate > 0.05;

    return { decayRate, sustainLevel, isPercussive };
  }, []);

  /**
   * Detect which instruments are likely present in the audio.
   * Returns an array of detected instruments with confidence scores.
   */
  const detectInstruments = useCallback((channelData, sampleRate) => {
    // Get frequency band distribution
    const bands = analyzeFrequencyBands(channelData, sampleRate);

    // Get envelope characteristics
    const envelope = analyzeEnvelope(channelData, sampleRate);

    // Get basic features
    const attackTime = findAttackTime(channelData, sampleRate);

    // Calculate zero crossing rate for harmonicity
    let zeroCrossings = 0;
    for (let i = 1; i < channelData.length; i++) {
      if ((channelData[i] >= 0 && channelData[i - 1] < 0) ||
          (channelData[i] < 0 && channelData[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const zcr = zeroCrossings / channelData.length;
    const harmonicity = 1 - Math.min(zcr * 50, 1);

    // Instrument scoring based on characteristics
    const scores = {
      kick: 0,
      bass: 0,
      'sub-bass': 0,
      lead: 0,
      pad: 0,
      pluck: 0
    };

    // KICK: Very low freq, fast attack, percussive, short
    scores.kick += bands.subBass * 3;
    scores.kick += bands.bass * 1.5;
    scores.kick += envelope.isPercussive ? 2 : 0;
    scores.kick += attackTime < 10 ? 2 : attackTime < 30 ? 1 : 0;
    scores.kick += envelope.decayRate > 0.03 ? 1.5 : 0;
    scores.kick -= bands.mid * 2;
    scores.kick -= bands.high * 2;
    scores.kick -= envelope.sustainLevel > 0.3 ? 2 : 0;

    // BASS: Low freq dominant, moderate attack, sustained
    scores.bass += bands.bass * 3;
    scores.bass += bands.subBass * 1.5;
    scores.bass += bands.lowMid * 1;
    scores.bass += harmonicity > 0.6 ? 1.5 : 0;
    scores.bass += envelope.sustainLevel > 0.2 ? 1 : 0;
    scores.bass -= bands.high * 2;
    scores.bass -= envelope.isPercussive ? 1 : 0;

    // SUB-BASS: Very low freq, high harmonicity, sustained
    scores['sub-bass'] += bands.subBass * 4;
    scores['sub-bass'] += harmonicity > 0.7 ? 2 : 0;
    scores['sub-bass'] += envelope.sustainLevel > 0.3 ? 1.5 : 0;
    scores['sub-bass'] -= bands.mid * 2;
    scores['sub-bass'] -= bands.highMid * 2;
    scores['sub-bass'] -= bands.high * 3;
    scores['sub-bass'] -= envelope.isPercussive ? 2 : 0;

    // LEAD: Mid-high freq, varied attack, harmonic, melodic range
    scores.lead += bands.mid * 2.5;
    scores.lead += bands.highMid * 2;
    scores.lead += bands.lowMid * 1;
    scores.lead += harmonicity > 0.5 ? 1.5 : 0;
    scores.lead += (attackTime > 0 && attackTime < 50) ? 1 : 0;
    scores.lead -= bands.subBass * 2;

    // PAD: Wide frequency, very slow attack, sustained, harmonic
    scores.pad += attackTime > 100 ? 3 : attackTime > 50 ? 1.5 : 0;
    scores.pad += envelope.sustainLevel > 0.5 ? 2 : envelope.sustainLevel > 0.3 ? 1 : 0;
    scores.pad += harmonicity > 0.6 ? 1.5 : 0;
    scores.pad += (bands.lowMid + bands.mid + bands.highMid) > 0.4 ? 1.5 : 0;
    scores.pad -= envelope.isPercussive ? 3 : 0;
    scores.pad -= envelope.decayRate > 0.05 ? 2 : 0;

    // PLUCK: Fast attack, quick decay, mid freq, harmonic
    scores.pluck += attackTime < 15 ? 2.5 : attackTime < 30 ? 1.5 : 0;
    scores.pluck += envelope.decayRate > 0.02 ? 2 : 0;
    scores.pluck += bands.mid * 2;
    scores.pluck += bands.highMid * 1.5;
    scores.pluck += harmonicity > 0.5 ? 1 : 0;
    scores.pluck += envelope.sustainLevel < 0.3 ? 1.5 : 0;
    scores.pluck -= envelope.sustainLevel > 0.5 ? 2 : 0;
    scores.pluck -= attackTime > 50 ? 2 : 0;

    // Define expected characteristics for each instrument for feature matching
    const instrumentProfiles = {
      kick: { minScore: 3, idealAttack: 5, idealBands: ['subBass', 'bass'] },
      bass: { minScore: 3, idealAttack: 20, idealBands: ['bass', 'subBass', 'lowMid'] },
      'sub-bass': { minScore: 3, idealAttack: 30, idealBands: ['subBass'] },
      lead: { minScore: 2.5, idealAttack: 25, idealBands: ['mid', 'highMid'] },
      pad: { minScore: 2.5, idealAttack: 150, idealBands: ['lowMid', 'mid', 'highMid'] },
      pluck: { minScore: 3, idealAttack: 10, idealBands: ['mid', 'highMid'] }
    };

    // Calculate both relative and absolute confidence
    const maxScore = Math.max(...Object.values(scores), 1);
    const scoreValues = Object.values(scores);
    const avgScore = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
    const detected = [];

    for (const [instrument, score] of Object.entries(scores)) {
      const profile = instrumentProfiles[instrument];

      // Relative confidence (how much better than others)
      const relativeConf = score / maxScore;

      // Absolute confidence (does it meet minimum thresholds)
      const meetsMinimum = score >= profile.minScore;

      // Feature match bonus: how well do the bands match expected profile
      let bandMatchScore = 0;
      for (const idealBand of profile.idealBands) {
        bandMatchScore += bands[idealBand] || 0;
      }
      const bandMatch = Math.min(1, bandMatchScore / (profile.idealBands.length * 0.15));

      // Attack time match (closer to ideal = better)
      const attackDiff = Math.abs(attackTime - profile.idealAttack);
      const attackMatch = Math.max(0, 1 - attackDiff / 200);

      // Combined confidence with multiple factors
      let confidence = 0;
      if (meetsMinimum) {
        // Base: relative score (40%)
        confidence += relativeConf * 0.4;
        // Band profile match (30%)
        confidence += bandMatch * 0.3;
        // Attack time match (15%)
        confidence += attackMatch * 0.15;
        // Separation from average (15%)
        const separation = (score - avgScore) / (maxScore - avgScore + 0.001);
        confidence += Math.max(0, separation) * 0.15;
      } else {
        // Below minimum threshold - reduced confidence
        confidence = relativeConf * 0.5 * (score / profile.minScore);
      }

      confidence = Math.max(0, Math.min(1, confidence));

      if (confidence > 0.25) { // Lowered threshold since we're more selective now
        detected.push({
          instrument,
          confidence: Math.round(confidence * 100),
          score: score.toFixed(2),
          bandMatch: Math.round(bandMatch * 100),
          attackMatch: Math.round(attackMatch * 100)
        });
      }
    }

    // Sort by confidence descending
    detected.sort((a, b) => b.confidence - a.confidence);

    // Improved full mix detection
    const isFullMix = detected.length >= 3 &&
      detected[0].confidence - detected[2].confidence < 25 &&
      detected[0].confidence < 70; // Top instrument not dominant

    return {
      detected,
      isFullMix,
      bands,
      envelope: {
        decayRate: envelope.decayRate.toFixed(3),
        sustainLevel: envelope.sustainLevel.toFixed(3),
        isPercussive: envelope.isPercussive
      }
    };
  }, [analyzeFrequencyBands, analyzeEnvelope, findAttackTime]);

  // NOTE: BPM, key, ADSR, filter envelope, modulation, waveform detection, and spectral match
  // are all handled by the Web Worker. See: src/workers/audio.worker.js

  /**
   * Prepare audio buffer for playback and visualization without running detection.
   * Decodes audio, generates waveform, caches buffer, sets duration.
   * Call this on upload for instant waveform rendering.
   */
  const prepareAudioBuffer = useCallback(async (audioFileData) => {
    if (!audioFileData) {
      return { error: 'No audio data provided' };
    }

    try {
      const ctx = await getAudioContext();
      const buffer = await ctx.decodeAudioData(audioFileData.slice(0));

      // Set up waveform, buffer cache, and duration
      setWaveformData(generateWaveform(buffer));
      setAudioBuffer(buffer);
      setDuration(buffer.duration);
      audioBufferRef.current = buffer;
      audioBufferSourceRef.current = audioFileData; // Track which raw data this buffer was decoded from
      durationRef.current = buffer.duration;

      // Generate hi-res waveform data asynchronously via Web Worker
      // This enables deep zoom (64x) with min/max pairs per ~64 samples
      waveformHiResRef.current = null; // Clear stale data
      const channelData = buffer.getChannelData(0);
      worker.generateWaveformData(channelData, buffer.sampleRate)
        .then(hiResData => {
          waveformHiResRef.current = hiResData;
        })
        .catch(err => {
          console.warn('Hi-res waveform generation failed:', err);
        });

      return { error: null };
    } catch {
      return { error: 'Error decoding audio file' };
    }
  }, [getAudioContext, generateWaveform, worker]);

  /**
   * Detect instruments from audio file data (quick detection without full analysis).
   * Uses Web Worker to keep UI responsive during detection.
   * Used for automatic detection on upload.
   */
  const detectInstrumentsFromAudioData = useCallback(async (audioFileData) => {
    if (!audioFileData) {
      return { error: 'No audio data provided', instrumentDetection: null };
    }

    try {
      const ctx = await getAudioContext();
      const buffer = await ctx.decodeAudioData(audioFileData.slice(0));
      const channelData = buffer.getChannelData(0);
      const sampleRate = buffer.sampleRate;

      // Generate waveform while we're at it (main thread - quick operation)
      setWaveformData(generateWaveform(buffer));
      setAudioBuffer(buffer);
      setDuration(buffer.duration);
      audioBufferRef.current = buffer;
      durationRef.current = buffer.duration;

      // Limit detection to first 10 seconds for quick response
      const maxSamples = sampleRate * 10;
      const detectionData = channelData.length > maxSamples
        ? channelData.slice(0, maxSamples)
        : channelData;

      // Use Web Worker for instrument detection
      const instrumentDetection = await worker.detectInstruments(detectionData, sampleRate);

      return { error: null, instrumentDetection };
    } catch {
      return { error: 'Error analyzing audio file', instrumentDetection: null };
    }
  }, [getAudioContext, generateWaveform, worker]);

  /**
   * Analyze audio file data and extract features.
   * Uses Web Worker for heavy DSP operations to keep UI responsive.
   * Reuses cached AudioBuffer if available to avoid re-decoding.
   *
   * @param {ArrayBuffer} audioFileData - Raw audio file data
   * @param {Object} [options] - Analysis options
   * @param {number} [options.regionStart] - Start time in seconds for region-based analysis
   * @param {number} [options.regionEnd] - End time in seconds for region-based analysis
   */
  const analyzeAudio = useCallback(async (audioFileData, options = {}) => {
    if (!audioFileData && !audioBufferRef.current) {
      return { error: 'Please upload or record audio first', features: null, instrumentDetection: null };
    }

    try {
      let buffer;

      // Reuse cached buffer ONLY if it was decoded from the same raw audio data.
      // When analyzing a stem, audioFileData is the stem's ArrayBuffer (not the full mix),
      // so audioBufferSourceRef won't match and we correctly decode the stem.
      const isNewAudioSource = audioFileData && audioFileData !== audioBufferSourceRef.current;

      if (audioBufferRef.current && !isNewAudioSource) {
        buffer = audioBufferRef.current;
      } else {
        const ctx = await getAudioContext();
        buffer = await ctx.decodeAudioData(audioFileData.slice(0));

        // Only cache into the main refs if this is the first decode (no existing buffer).
        // Stem buffers are ephemeral — waveform, playback, and spectrum depend on the
        // full mix buffer in audioBufferRef, so we don't overwrite it for stems.
        if (!audioBufferRef.current) {
          setAudioBuffer(buffer);
          setDuration(buffer.duration);
          audioBufferRef.current = buffer;
          audioBufferSourceRef.current = audioFileData;
          durationRef.current = buffer.duration;
        }
      }

      const channelData = buffer.getChannelData(0);
      const sampleRate = buffer.sampleRate;

      // Generate waveform if not already done (main thread - quick operation)
      if (waveformData.length === 0) {
        setWaveformData(generateWaveform(buffer));
      }

      let analysisData;

      // If a region is specified (loop selection), analyze only that region
      if (options.regionStart != null && options.regionEnd != null && options.regionEnd > options.regionStart) {
        const startSample = Math.floor(options.regionStart * sampleRate);
        const endSample = Math.min(Math.floor(options.regionEnd * sampleRate), channelData.length);
        analysisData = channelData.slice(startSample, endSample);
      } else {
        // Default: limit analysis to first 30 seconds for performance
        const maxSamples = sampleRate * 30;
        analysisData = channelData.length > maxSamples
          ? channelData.slice(0, maxSamples)
          : channelData;
      }

      // Use Web Worker for heavy analysis operations
      const [features, instrumentDetection, harmonics] = await Promise.all([
        worker.analyzeAudio(analysisData, sampleRate),
        worker.detectInstruments(analysisData, sampleRate),
        worker.detectHarmonics(analysisData, sampleRate)
      ]);

      return { error: null, features, instrumentDetection, harmonics };
    } catch {
      return { error: 'Error analyzing audio file', features: null, instrumentDetection: null };
    }
  }, [getAudioContext, waveformData.length, generateWaveform, worker]);

  /**
   * Format time in MM:SS format.
   */
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + secs.toString().padStart(2, '0');
  }, []);

  // Worker-based spectral match (exposed for A/B comparison)
  const calculateSpectralMatchAsync = useCallback(async (channelDataA, channelDataB, sampleRate) => {
    return worker.calculateSpectralMatch(channelDataA, channelDataB, sampleRate);
  }, [worker]);

  return {
    // State (throttled updates for React rendering)
    audioBuffer,
    isPlaying,
    spectrumData,
    waveformData,
    playbackTime,
    duration,
    volume,
    brightness,
    loopEnabled,
    loopStart,
    loopEnd,

    // Worker state
    isAnalyzing: worker.isProcessing,
    analysisProgress: worker.progress,

    // Real-time refs (for smooth 60fps animations without re-renders)
    spectrumDataRef,
    brightnessRef,
    playbackTimeRef,
    waveformHiResRef,

    // Setters
    setVolume,
    setLoopEnabled,
    setLoopStart,
    setLoopEnd,

    // Actions
    togglePlayback,
    skipTime,
    seek,
    clearLoop,
    reset,
    analyzeAudio,
    prepareAudioBuffer,
    detectInstruments,
    detectInstrumentsFromAudioData,
    cleanup,

    // Sound Design Analysis (worker-based async version)
    calculateSpectralMatchAsync,

    // Utilities
    formatTime,
    generateWaveform,
    generateWaveformData: worker.generateWaveformData
  };
}
