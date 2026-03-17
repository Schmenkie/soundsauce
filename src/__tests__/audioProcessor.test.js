import { describe, it, expect } from 'vitest';

// =============================================================================
// Pure functions extracted from useAudioProcessor.js for unit testing
// =============================================================================

/**
 * FFT (Cooley-Tukey radix-2 DIT) - copied from useAudioProcessor.js
 */
function fft(real, imag) {
  const n = real.length;
  if (n <= 1) return;

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
 */
function computeMagnitudeSpectrum(data, windowSize) {
  const n = windowSize;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);

  for (let i = 0; i < n && i < data.length; i++) {
    const hannWindow = 0.5 * (1 - Math.cos(2 * Math.PI * i / n));
    real[i] = data[i] * hannWindow;
  }

  fft(real, imag);

  const magnitudes = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }

  return magnitudes;
}

/**
 * Format time in MM:SS format - copied from useAudioProcessor
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins + ':' + secs.toString().padStart(2, '0');
}

/**
 * Find attack time - copied from useAudioProcessor
 */
function findAttackTime(data, sampleRate) {
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
}

/**
 * Generate waveform data (downsampled) - copied from useAudioProcessor
 */
function generateWaveform(rawData, samples = 200) {
  const blockSize = Math.floor(rawData.length / samples);
  const waveform = [];

  for (let i = 0; i < samples; i++) {
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(rawData[i * blockSize + j]);
    }
    waveform.push(sum / blockSize);
  }

  const max = Math.max(...waveform);
  return max > 0 ? waveform.map(v => v / max) : waveform;
}

/**
 * Calculate spectral centroid for brightness - from useAudioProcessor
 */
function calculateSpectralCentroid(frequencyData, bufferLength) {
  let weightedSum = 0;
  let magnitudeSum = 0;

  for (let i = 0; i < bufferLength; i++) {
    const magnitude = frequencyData[i];
    weightedSum += i * magnitude;
    magnitudeSum += magnitude;
  }

  if (magnitudeSum === 0) return 0;

  const centroidBin = weightedSum / magnitudeSum;
  const normalizedCentroid = centroidBin / bufferLength;
  return Math.min(1, Math.sqrt(normalizedCentroid) * 1.5);
}

// =============================================================================
// Tests
// =============================================================================

describe('Audio Processor Pure Functions', () => {
  describe('formatTime', () => {
    it('formats 0 seconds', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('formats seconds < 60', () => {
      expect(formatTime(5)).toBe('0:05');
      expect(formatTime(30)).toBe('0:30');
      expect(formatTime(59)).toBe('0:59');
    });

    it('formats minutes correctly', () => {
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(125)).toBe('2:05');
    });

    it('handles fractional seconds by flooring', () => {
      expect(formatTime(3.7)).toBe('0:03');
      expect(formatTime(61.9)).toBe('1:01');
    });

    it('pads single-digit seconds with leading zero', () => {
      expect(formatTime(1)).toBe('0:01');
      expect(formatTime(62)).toBe('1:02');
    });

    it('formats large durations', () => {
      expect(formatTime(600)).toBe('10:00');
      expect(formatTime(3661)).toBe('61:01');
    });
  });

  describe('FFT', () => {
    it('handles a single sample', () => {
      const real = new Float32Array([5.0]);
      const imag = new Float32Array([0.0]);
      fft(real, imag);
      expect(real[0]).toBeCloseTo(5.0);
    });

    it('computes FFT of a constant signal', () => {
      const n = 4;
      const real = new Float32Array([1, 1, 1, 1]);
      const imag = new Float32Array(n);
      fft(real, imag);

      // DC component should equal the sum
      expect(real[0]).toBeCloseTo(4.0);
      // All other bins should be near zero for constant signal
      for (let i = 1; i < n; i++) {
        expect(Math.abs(real[i])).toBeLessThan(1e-10);
        expect(Math.abs(imag[i])).toBeLessThan(1e-10);
      }
    });

    it('computes FFT of a simple sine wave correctly', () => {
      const n = 8;
      const real = new Float32Array(n);
      const imag = new Float32Array(n);

      // Generate a sine wave at bin 1 frequency
      for (let i = 0; i < n; i++) {
        real[i] = Math.sin(2 * Math.PI * i / n);
      }

      fft(real, imag);

      // Bin 1 should have the energy (sine = imaginary part)
      const mag1 = Math.sqrt(real[1] * real[1] + imag[1] * imag[1]);
      expect(mag1).toBeGreaterThan(3.0); // n/2 = 4

      // DC should be approximately zero
      expect(Math.abs(real[0])).toBeLessThan(1e-10);
    });
  });

  describe('computeMagnitudeSpectrum', () => {
    it('returns half the window size in magnitudes', () => {
      const data = new Float32Array(64);
      const result = computeMagnitudeSpectrum(data, 64);
      expect(result.length).toBe(32);
    });

    it('returns non-negative magnitudes', () => {
      const data = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        data[i] = Math.sin(2 * Math.PI * 4 * i / 128);
      }
      const result = computeMagnitudeSpectrum(data, 128);
      for (let i = 0; i < result.length; i++) {
        expect(result[i]).toBeGreaterThanOrEqual(0);
      }
    });

    it('detects a sine wave peak at the correct bin', () => {
      const n = 256;
      const binFreq = 10; // Put energy in bin 10
      const data = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        data[i] = Math.sin(2 * Math.PI * binFreq * i / n);
      }
      const result = computeMagnitudeSpectrum(data, n);

      // Find peak (Hann window spreads energy to adjacent bins)
      let maxBin = 0;
      let maxVal = 0;
      for (let i = 0; i < result.length; i++) {
        if (result[i] > maxVal) {
          maxVal = result[i];
          maxBin = i;
        }
      }
      expect(maxBin).toBe(binFreq);
    });

    it('returns zero magnitudes for silence', () => {
      const data = new Float32Array(64).fill(0);
      const result = computeMagnitudeSpectrum(data, 64);
      for (let i = 0; i < result.length; i++) {
        expect(result[i]).toBe(0);
      }
    });
  });

  describe('findAttackTime', () => {
    it('returns 0 for silent audio', () => {
      const data = new Float32Array(44100).fill(0);
      expect(findAttackTime(data, 44100)).toBe(0);
    });

    it('returns 0 when peak is at the start', () => {
      const data = new Float32Array(44100).fill(0);
      data[0] = 1.0; // Peak at sample 0
      expect(findAttackTime(data, 44100)).toBe(0);
    });

    it('detects attack time for a ramp signal', () => {
      const sampleRate = 44100;
      const data = new Float32Array(sampleRate);

      // Create a ramp: starts at threshold (0.05) at sample 0, peaks at sample 441 (10ms)
      const peakSample = 441;
      for (let i = 0; i <= peakSample; i++) {
        data[i] = 0.06 + (i / peakSample) * 0.94;
      }
      // Decay after peak
      for (let i = peakSample + 1; i < sampleRate; i++) {
        data[i] = data[peakSample] * Math.exp(-(i - peakSample) / 1000);
      }

      const attackTime = findAttackTime(data, sampleRate);
      // Peak at sample 441, start (threshold crossing) at sample 0
      // Attack time = (441 - 0) / 44100 * 1000 = 10ms
      expect(attackTime).toBeCloseTo(10, 0);
    });

    it('limits search to first second of audio', () => {
      const sampleRate = 44100;
      const data = new Float32Array(sampleRate * 5); // 5 seconds

      // Only put signal after 1 second
      for (let i = sampleRate; i < sampleRate * 2; i++) {
        data[i] = 0.5;
      }

      // Since the search is limited to first sampleRate samples and those are 0,
      // start will be -1, so it should return 0
      expect(findAttackTime(data, sampleRate)).toBe(0);
    });
  });

  describe('generateWaveform', () => {
    it('produces 200 points by default', () => {
      const rawData = new Float32Array(44100);
      for (let i = 0; i < rawData.length; i++) {
        rawData[i] = Math.sin(2 * Math.PI * i / 100);
      }
      const result = generateWaveform(rawData);
      expect(result.length).toBe(200);
    });

    it('normalizes output to 0-1 range', () => {
      const rawData = new Float32Array(44100);
      for (let i = 0; i < rawData.length; i++) {
        rawData[i] = Math.sin(2 * Math.PI * i / 100) * 0.5;
      }
      const result = generateWaveform(rawData);
      for (const val of result) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
      // At least one value should be 1 (the max)
      expect(Math.max(...result)).toBeCloseTo(1);
    });

    it('returns all zeros for silent audio', () => {
      const rawData = new Float32Array(44100).fill(0);
      const result = generateWaveform(rawData);
      for (const val of result) {
        expect(val).toBe(0);
      }
    });

    it('handles custom sample count', () => {
      const rawData = new Float32Array(10000);
      for (let i = 0; i < rawData.length; i++) {
        rawData[i] = Math.random() - 0.5;
      }
      const result = generateWaveform(rawData, 50);
      expect(result.length).toBe(50);
    });
  });

  describe('calculateSpectralCentroid', () => {
    it('returns 0 for silent audio (all zeros)', () => {
      const data = new Uint8Array(128).fill(0);
      expect(calculateSpectralCentroid(data, 128)).toBe(0);
    });

    it('returns low brightness for low-frequency energy', () => {
      const data = new Uint8Array(128).fill(0);
      // Put energy only in first few bins (low freq)
      data[0] = 255;
      data[1] = 200;
      data[2] = 100;
      const brightness = calculateSpectralCentroid(data, 128);
      expect(brightness).toBeLessThan(0.3);
    });

    it('returns higher brightness for high-frequency energy', () => {
      const data = new Uint8Array(128).fill(0);
      // Put energy in higher bins
      data[100] = 255;
      data[110] = 200;
      data[120] = 150;
      const brightness = calculateSpectralCentroid(data, 128);
      expect(brightness).toBeGreaterThan(0.5);
    });

    it('returns value clamped between 0 and 1', () => {
      const data = new Uint8Array(128);
      for (let i = 0; i < 128; i++) {
        data[i] = Math.round(Math.random() * 255);
      }
      const brightness = calculateSpectralCentroid(data, 128);
      expect(brightness).toBeGreaterThanOrEqual(0);
      expect(brightness).toBeLessThanOrEqual(1);
    });

    it('gives higher value when energy is spread to higher frequencies', () => {
      const dataLow = new Uint8Array(128).fill(0);
      const dataHigh = new Uint8Array(128).fill(0);

      // Low freq energy
      for (let i = 0; i < 10; i++) dataLow[i] = 255;
      // High freq energy
      for (let i = 90; i < 128; i++) dataHigh[i] = 255;

      const brightnessLow = calculateSpectralCentroid(dataLow, 128);
      const brightnessHigh = calculateSpectralCentroid(dataHigh, 128);

      expect(brightnessHigh).toBeGreaterThan(brightnessLow);
    });
  });
});
