/**
 * Generates a ~3 second demo synth sound programmatically using OfflineAudioContext.
 * Returns an ArrayBuffer in WAV format that can be passed directly to prepareAudioBuffer/analyzeAudio.
 *
 * The sound is a rich, evolving synth pad chord (Cm7) with:
 * - Sawtooth oscillators for harmonic richness
 * - Low-pass filter sweep for movement
 * - ADSR-style amplitude envelope
 * - Subtle detuning for width
 */

import { CURATED_PRESETS } from '../data/vitalPresets';

const SAMPLE_RATE = 44100;
const DURATION = 3.0; // seconds

/**
 * Encode an AudioBuffer as a WAV ArrayBuffer.
 * Mono output, 16-bit PCM.
 */
export function audioBufferToWav(audioBuffer) {
  const numChannels = 1;
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const numSamples = channelData.length;
  const bytesPerSample = 2; // 16-bit
  const dataSize = numSamples * numChannels * bytesPerSample;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // subchunk1 size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Convert float samples to 16-bit PCM
  let offset = headerSize;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return buffer;
}

/**
 * Generate the demo synth sound.
 * Returns a Promise<ArrayBuffer> (WAV format).
 */
export async function generateDemoSound() {
  const ctx = new OfflineAudioContext(1, SAMPLE_RATE * DURATION, SAMPLE_RATE);

  // Cm7 chord frequencies: C3, Eb3, G3, Bb3
  const frequencies = [130.81, 155.56, 196.00, 233.08];
  const detuneAmounts = [-4, 3, -2, 5]; // cents, for subtle width

  // Master gain for overall volume
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);

  // Low-pass filter with sweep for movement
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 2.5;
  // Filter sweep: start closed, open up, then close again
  filter.frequency.setValueAtTime(200, 0);
  filter.frequency.linearRampToValueAtTime(3500, 0.8);
  filter.frequency.linearRampToValueAtTime(1800, 2.0);
  filter.frequency.linearRampToValueAtTime(600, DURATION);
  filter.connect(masterGain);

  // Amplitude envelope: soft attack, sustain, release
  masterGain.gain.setValueAtTime(0, 0);
  masterGain.gain.linearRampToValueAtTime(0.35, 0.15); // attack
  masterGain.gain.linearRampToValueAtTime(0.28, 0.6);  // decay to sustain
  masterGain.gain.setValueAtTime(0.28, 2.2);            // hold sustain
  masterGain.gain.linearRampToValueAtTime(0, DURATION);  // release

  // Create oscillators for each note in the chord
  for (let i = 0; i < frequencies.length; i++) {
    // Primary oscillator (sawtooth for rich harmonics)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = frequencies[i];
    osc.detune.value = detuneAmounts[i];

    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.25;

    osc.connect(oscGain);
    oscGain.connect(filter);

    osc.start(0);
    osc.stop(DURATION);

    // Detuned copy for thickness (slight detune in opposite direction)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = frequencies[i];
    osc2.detune.value = -detuneAmounts[i] + 7; // offset detune for stereo-like width

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.15;

    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);

    osc2.start(0);
    osc2.stop(DURATION);
  }

  // Sub layer: sine wave at root note for weight
  const subOsc = ctx.createOscillator();
  subOsc.type = 'sine';
  subOsc.frequency.value = frequencies[0]; // C3
  const subGain = ctx.createGain();
  subGain.gain.value = 0.2;
  subOsc.connect(subGain);
  subGain.connect(masterGain); // bypass filter for clean sub
  subOsc.start(0);
  subOsc.stop(DURATION);

  // Render offline
  const renderedBuffer = await ctx.startRendering();

  // Convert to WAV ArrayBuffer
  return audioBufferToWav(renderedBuffer);
}

// =============================================================================
// Preset Audio Preview Generator
// =============================================================================

/**
 * Map Vital's osc wave_frame (0-127) to Web Audio OscillatorNode type.
 * Vital: 0 = sine, ~32 = triangle region, ~64 = saw, ~96+ = square
 * Legacy fallback — used only when PeriodicWave creation fails.
 */
function waveFrameToOscType(waveFrame) {
  if (waveFrame <= 10) return 'sine';
  if (waveFrame <= 48) return 'triangle';
  if (waveFrame <= 80) return 'sawtooth';
  return 'square';
}

/**
 * Build a PeriodicWave from a wave_frame value (0-127) using 32 harmonics.
 * Creates smooth, interpolated waveforms that sound much closer to Vital's
 * wavetable synthesis than the 4 basic OscillatorNode types.
 *
 * Ranges and their harmonic profiles:
 *   0-10:   sine-like (fundamental dominant, harmonics decay rapidly)
 *   11-32:  triangle-like (odd harmonics with 1/n^2 rolloff)
 *   33-48:  saw-triangle blend (crossfade between triangle and saw)
 *   49-80:  sawtooth-like (all harmonics with 1/n rolloff)
 *   81-95:  pulse/square-like (odd harmonics with 1/n rolloff)
 *   96-127: complex/harsh (all harmonics with slower rolloff)
 *
 * Uses smooth interpolation within ranges so adjacent frames sound different.
 *
 * @param {BaseAudioContext} audioContext - Audio context for PeriodicWave creation
 * @param {number} waveFrame - Vital wave_frame value (0-127)
 * @returns {PeriodicWave}
 */
function waveFrameToPeriodicWave(audioContext, waveFrame) {
  const NUM_HARMONICS = 32;
  const real = new Float32Array(NUM_HARMONICS + 1); // index 0 = DC offset
  const imag = new Float32Array(NUM_HARMONICS + 1);
  real[0] = 0; // no DC offset

  const frame = Math.max(0, Math.min(127, waveFrame));

  if (frame <= 10) {
    // Sine-like: fundamental dominant, upper harmonics decay exponentially
    // frame 0 = pure sine, frame 10 = sine with subtle harmonics
    const harmonicPresence = frame / 10; // 0 to 1
    for (let h = 1; h <= NUM_HARMONICS; h++) {
      if (h === 1) {
        imag[h] = 1.0;
      } else {
        // Rapid exponential decay, stronger as frame approaches 10
        imag[h] = harmonicPresence * Math.pow(0.3, h - 1) * (1.0 / h);
      }
    }
  } else if (frame <= 32) {
    // Triangle-like: odd harmonics with 1/n^2 rolloff
    // frame 11 = soft triangle, frame 32 = brighter triangle with even harmonics creeping in
    const t = (frame - 11) / 21; // 0 to 1
    const evenHarmonicLevel = t * 0.3; // even harmonics fade in toward end of range
    for (let h = 1; h <= NUM_HARMONICS; h++) {
      const isOdd = h % 2 === 1;
      if (isOdd) {
        // Classic triangle: alternating sign, 1/h^2 rolloff
        const sign = ((h - 1) / 2) % 2 === 0 ? 1 : -1;
        imag[h] = sign * (1.0 / (h * h));
      } else {
        // Even harmonics sneak in as frame increases
        imag[h] = evenHarmonicLevel * (1.0 / (h * h));
      }
    }
  } else if (frame <= 48) {
    // Saw-triangle blend: crossfade from triangle-like to saw-like
    const t = (frame - 33) / 15; // 0 = triangle-ish, 1 = nearly saw
    for (let h = 1; h <= NUM_HARMONICS; h++) {
      const isOdd = h % 2 === 1;
      // Triangle component: odd harmonics 1/h^2, even near zero
      const triSign = isOdd ? (((h - 1) / 2) % 2 === 0 ? 1 : -1) : 1;
      const triAmp = isOdd ? (1.0 / (h * h)) : 0.1 * (1.0 / (h * h));
      // Saw component: all harmonics with 1/h rolloff, alternating sign
      const sawAmp = (1.0 / h) * (h % 2 === 0 ? -1 : 1);
      // Crossfade
      imag[h] = triAmp * triSign * (1 - t) + sawAmp * t;
    }
  } else if (frame <= 80) {
    // Sawtooth-like: all harmonics with 1/n rolloff
    // frame 49 = clean saw, frame 80 = slightly brighter saw (slower rolloff)
    const t = (frame - 49) / 31; // 0 to 1
    const rolloffExponent = 1.0 - t * 0.15; // 1.0 to 0.85 — slower rolloff = brighter
    for (let h = 1; h <= NUM_HARMONICS; h++) {
      // Standard saw: alternating sign, 1/h rolloff
      const sign = h % 2 === 0 ? -1 : 1;
      imag[h] = sign * (1.0 / Math.pow(h, rolloffExponent));
    }
  } else if (frame <= 95) {
    // Pulse/square-like: odd harmonics with 1/n rolloff
    // frame 81 = wide pulse (near-square), frame 95 = narrower pulse (more harmonics)
    const t = (frame - 81) / 14; // 0 to 1
    const evenLeakage = t * 0.25; // narrow pulse adds even harmonics
    for (let h = 1; h <= NUM_HARMONICS; h++) {
      const isOdd = h % 2 === 1;
      if (isOdd) {
        imag[h] = 1.0 / h;
      } else {
        // Even harmonics leak in as pulse narrows
        imag[h] = evenLeakage * (1.0 / h);
      }
    }
  } else {
    // Complex/harsh: all harmonics with slower rolloff (more upper content)
    // frame 96 = moderately harsh, frame 127 = very bright/aggressive
    const t = (frame - 96) / 31; // 0 to 1
    const rolloff = 0.8 - t * 0.35; // 0.8 to 0.45 — progressively less rolloff
    for (let h = 1; h <= NUM_HARMONICS; h++) {
      // Mix of even and odd with slow rolloff, slight randomization for grit
      const phase = Math.sin(h * 1.618) * 0.3; // golden ratio pseudo-random phase variation
      imag[h] = (1.0 / Math.pow(h, rolloff)) * (1 + phase * t);
      real[h] = phase * t * (1.0 / Math.pow(h, rolloff + 0.2));
    }
  }

  // Normalize the wave to prevent clipping
  let maxEnergy = 0;
  for (let h = 1; h <= NUM_HARMONICS; h++) {
    maxEnergy += Math.abs(imag[h]) + Math.abs(real[h]);
  }
  if (maxEnergy > 2.0) {
    const scale = 2.0 / maxEnergy;
    for (let h = 1; h <= NUM_HARMONICS; h++) {
      imag[h] *= scale;
      real[h] *= scale;
    }
  }

  return audioContext.createPeriodicWave(real, imag, { disableNormalization: false });
}

/**
 * Convert Vital's filter_1_cutoff (MIDI-like 8-136) to Hz.
 * Vital uses a ~semitone scale where 60 ≈ 261 Hz (C4).
 */
function vitalCutoffToHz(cutoff) {
  // Approximate: 8.176 * 2^(cutoff/12) maps MIDI-like values to Hz
  const hz = 8.176 * Math.pow(2, cutoff / 12);
  return Math.max(20, Math.min(20000, hz));
}

// Note name to frequency mapping (used for key-based pitch matching)
const NOTE_FREQUENCIES = {
  'C': 65.41, 'C#': 69.30, 'Db': 69.30, 'D': 73.42, 'D#': 77.78, 'Eb': 77.78,
  'E': 82.41, 'F': 87.31, 'F#': 92.50, 'Gb': 92.50, 'G': 98.00,
  'G#': 103.83, 'Ab': 103.83, 'A': 110.00, 'A#': 116.54, 'Bb': 116.54, 'B': 123.47,
};

/**
 * Get the appropriate note frequency for a preset category.
 * Bass/kick play low, pads/keys play mid, leads play higher.
 */
function getNoteForCategory(category) {
  switch (category) {
    case 'bass': return 65.41;     // C2
    case 'kick': return 55.0;      // A1
    case 'drums': return 65.41;    // C2
    case 'pad': return 130.81;     // C3
    case 'keys': return 261.63;    // C4
    case 'guitar': return 196.0;   // G3
    case 'brass': return 233.08;   // Bb3
    case 'woodwind': return 261.63; // C4
    case 'lead': return 329.63;    // E4
    case 'pluck': return 261.63;   // C4
    default: return 261.63;        // C4
  }
}

/**
 * Get the best note frequency for the preview based on analysis data.
 * Uses detected key for bass/kick (fundamental detection unreliable for processed bass).
 * Uses fundamental frequency for other categories if reasonable.
 */
function getSmartNoteFrequency(category, options) {
  const categoryDefault = getNoteForCategory(category);
  const { fundamentalHz, keyNote } = options;

  // For bass/kick, use detected key to pick the right root note in the correct octave
  if (category === 'bass' || category === 'kick') {
    if (keyNote) {
      // Extract just the note name (e.g., "A" from "A major")
      const noteName = keyNote.split(' ')[0];
      const baseFreq = NOTE_FREQUENCIES[noteName];
      if (baseFreq) {
        // Bass plays in octave 1-2 range (27-130 Hz)
        // NOTE_FREQUENCIES gives octave 2 values, divide by 2 for octave 1 if needed
        return baseFreq > 100 ? baseFreq / 2 : baseFreq;
      }
    }
    // Don't trust fundamentalHz for bass — often picks up harmonics
    return categoryDefault;
  }

  // For other categories, use fundamental if it's in a reasonable range
  if (fundamentalHz && fundamentalHz > 60 && fundamentalHz < 2000) {
    return fundamentalHz;
  }

  // Use key-based note in the right octave for the category
  if (keyNote) {
    const noteName = keyNote.split(' ')[0];
    const baseFreq = NOTE_FREQUENCIES[noteName];
    if (baseFreq) {
      // Scale to the right octave for the category
      if (category === 'pad') return baseFreq * 2;       // octave 3
      if (category === 'lead') return baseFreq * 4;       // octave 4
      if (category === 'keys') return baseFreq * 4;       // octave 4
      if (category === 'pluck') return baseFreq * 4;      // octave 4
      return baseFreq * 2; // default octave 3
    }
  }

  return categoryDefault;
}

/**
 * Create a WaveShaperNode distortion curve.
 * amount: 0-100, higher = more harmonics
 */
function makeDistortionCurve(amount) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const k = amount;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

/**
 * Create a pair of chained BiquadFilterNodes for 24dB/oct rolloff (Vital default).
 * Two 12dB/oct filters in series, second filter has slightly reduced Q to prevent
 * runaway resonance peaks.
 *
 * @param {BaseAudioContext} ctx - Audio context
 * @param {number} cutoffHz - Filter cutoff in Hz
 * @param {number} resonance - Resonance (0-1 range from Vital)
 * @returns {{ input: AudioNode, output: AudioNode, setCutoff: (hz: number, time: number) => void }}
 */
function create24dBFilter(ctx, cutoffHz, resonance) {
  const q = 0.5 + resonance * 15;

  const filter1 = ctx.createBiquadFilter();
  filter1.type = 'lowpass';
  filter1.frequency.value = cutoffHz;
  filter1.Q.value = q;

  const filter2 = ctx.createBiquadFilter();
  filter2.type = 'lowpass';
  filter2.frequency.value = cutoffHz;
  filter2.Q.value = q * 0.7; // Reduce Q on second stage to prevent runaway peaks

  filter1.connect(filter2);

  return {
    input: filter1,
    output: filter2,
    // Helper to schedule cutoff changes on both filters simultaneously
    setValueAtTime(hz, time) {
      filter1.frequency.setValueAtTime(hz, time);
      filter2.frequency.setValueAtTime(hz, time);
    },
    linearRampToValueAtTime(hz, time) {
      filter1.frequency.linearRampToValueAtTime(hz, time);
      filter2.frequency.linearRampToValueAtTime(hz, time);
    },
    exponentialRampToValueAtTime(hz, time) {
      const safeHz = Math.max(20, hz);
      filter1.frequency.exponentialRampToValueAtTime(safeHz, time);
      filter2.frequency.exponentialRampToValueAtTime(safeHz, time);
    },
  };
}

/**
 * Create a chorus effect: modulated delay for width and movement.
 * Uses a DelayNode with an LFO (OscillatorNode) modulating delay time.
 *
 * @param {BaseAudioContext} ctx - Audio context
 * @param {number} amount - Chorus amount (0-1)
 * @param {number} duration - Duration in seconds
 * @returns {{ input: AudioNode, output: AudioNode }}
 */
function createChorusEffect(ctx, amount, duration) {
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  const merger = ctx.createGain(); // Mix point

  dryGain.gain.value = 1 - amount * 0.4;
  wetGain.gain.value = amount * 0.5;

  // Modulated delay line
  const delay = ctx.createDelay(0.05);
  const baseDelayTime = 0.007 + amount * 0.008; // 7-15ms
  delay.delayTime.value = baseDelayTime;

  // LFO to modulate delay time
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.5 + amount * 1.5; // 0.5-2 Hz
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = amount * 0.003; // Depth in seconds (up to 3ms)
  lfo.connect(lfoGain);
  lfoGain.connect(delay.delayTime);
  lfo.start(0);
  lfo.stop(duration);

  // Slight pitch feedback for richness
  const feedbackGain = ctx.createGain();
  feedbackGain.gain.value = amount * 0.2;
  delay.connect(feedbackGain);
  feedbackGain.connect(delay);

  // Routing: input → dryGain → merger, input → delay → wetGain → merger
  const input = ctx.createGain();
  input.gain.value = 1;
  input.connect(dryGain);
  input.connect(delay);
  delay.connect(wetGain);
  dryGain.connect(merger);
  wetGain.connect(merger);

  return { input, output: merger };
}

/**
 * Create a phaser effect: chain of allpass filters swept by LFO.
 * Classic phaser uses 4 allpass stages with staggered center frequencies.
 *
 * @param {BaseAudioContext} ctx - Audio context
 * @param {number} amount - Phaser depth (0-1)
 * @param {number} duration - Duration in seconds
 * @returns {{ input: AudioNode, output: AudioNode }}
 */
function createPhaserEffect(ctx, amount, duration) {
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  const merger = ctx.createGain();

  dryGain.gain.value = 0.7;
  wetGain.gain.value = 0.5 * amount;

  // 4 allpass filter stages at staggered center frequencies
  const centerFreqs = [300, 800, 1500, 3500];
  const allpassFilters = centerFreqs.map(freq => {
    const ap = ctx.createBiquadFilter();
    ap.type = 'allpass';
    ap.frequency.value = freq;
    ap.Q.value = 0.5 + amount * 2;
    return ap;
  });

  // Chain allpass filters in series
  for (let i = 0; i < allpassFilters.length - 1; i++) {
    allpassFilters[i].connect(allpassFilters[i + 1]);
  }

  // LFO sweeps all allpass frequencies for the phaser sweep
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.3 + amount * 0.7; // 0.3-1 Hz
  for (const ap of allpassFilters) {
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = ap.frequency.value * 0.5 * amount; // Sweep range
    lfo.connect(lfoGain);
    lfoGain.connect(ap.frequency);
  }
  lfo.start(0);
  lfo.stop(duration);

  // Routing: input splits to dry and allpass chain, both merge at output
  const input = ctx.createGain();
  input.gain.value = 1;
  input.connect(dryGain);
  input.connect(allpassFilters[0]);
  allpassFilters[allpassFilters.length - 1].connect(wetGain);
  dryGain.connect(merger);
  wetGain.connect(merger);

  return { input, output: merger };
}

/**
 * Create a multi-tap delay reverb network for diffuse, realistic reverb.
 * Uses 6 delay taps at prime-number-spaced intervals with feedback and
 * lowpass filtering for natural high-frequency decay.
 *
 * @param {BaseAudioContext} ctx - Audio context
 * @param {number} wetLevel - Wet mix level (0-1)
 * @param {number} size - Room size (0-1), affects delay times and feedback
 * @returns {{ input: AudioNode, output: AudioNode }}
 */
function createMultiTapReverb(ctx, wetLevel, size) {
  const input = ctx.createGain();
  input.gain.value = 1;
  const output = ctx.createGain();
  output.gain.value = 1;

  // Dry path
  const dryGain = ctx.createGain();
  dryGain.gain.value = 1 - wetLevel * 0.4;
  input.connect(dryGain);
  dryGain.connect(output);

  // Wet path: multi-tap delay network
  const wetGain = ctx.createGain();
  wetGain.gain.value = wetLevel * 0.6;

  // Prime-number-spaced delay times (in ms) scaled by room size
  const baseTimes = [23, 29, 37, 41, 53, 67];
  const feedback = 0.25 + size * 0.35; // 0.25-0.6

  const mixPoint = ctx.createGain();
  mixPoint.gain.value = 1 / baseTimes.length;

  for (const baseMs of baseTimes) {
    const delayTime = (baseMs / 1000) * (0.5 + size * 1.5); // Scale by room size
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = Math.min(0.95, delayTime);

    const tapFilter = ctx.createBiquadFilter();
    tapFilter.type = 'lowpass';
    tapFilter.frequency.value = 2000 + (1 - size) * 4000; // Smaller rooms = brighter
    tapFilter.Q.value = 0.5;

    const fbGain = ctx.createGain();
    fbGain.gain.value = feedback;

    input.connect(delay);
    delay.connect(tapFilter);
    tapFilter.connect(mixPoint);

    // Feedback loop with damping
    tapFilter.connect(fbGain);
    fbGain.connect(delay);
  }

  mixPoint.connect(wetGain);
  wetGain.connect(output);

  return { input, output };
}

/**
 * Generate a 2-second audio preview of a curated Vital preset.
 * Uses OfflineAudioContext to render an approximation based on the preset's
 * oscillator, filter, and envelope settings. Features:
 *
 * - PeriodicWave synthesis with 32 harmonics (not just 4 basic types)
 * - Proper unison voices with detuning spread and stereo panning (up to 8)
 * - 24dB/oct filter via chained BiquadFilterNodes
 * - Full filter envelope (ENV 2) ADSR with exponential curves
 * - Chorus effect (modulated delay with LFO)
 * - Phaser effect (4-stage allpass with LFO sweep)
 * - Multi-tap reverb (6 prime-spaced delay taps with feedback)
 *
 * @param {string} presetId - ID of a CURATED_PRESETS entry
 * @param {number} [duration=2] - Duration in seconds
 * @param {Object} [settingsOverrides] - Merged settings (tuning sliders + analysis)
 * @param {Object} [options] - Additional options
 * @param {number} [options.fundamentalHz] - Detected fundamental frequency
 * @param {string} [options.keyNote] - Detected key (e.g., "A major") for pitch matching
 * @returns {Promise<ArrayBuffer>} WAV ArrayBuffer ready for playback
 */
export async function generatePresetPreview(presetId, duration = 2, settingsOverrides = null, options = {}) {
  const preset = CURATED_PRESETS.find(p => p.id === presetId);
  if (!preset) throw new Error(`Preset not found: ${presetId}`);

  // Merge curated settings with any overrides (from tuning sliders + analysis)
  const s = settingsOverrides
    ? { ...preset.settings, ...settingsOverrides }
    : preset.settings;

  // Use stereo (2 channels) for unison panning, mono fallback for simple presets
  const numVoices = Math.min(s.osc_1_unison_voices || 1, 8);
  const useStereo = numVoices > 1;
  const numChannels = useStereo ? 2 : 1;
  const ctx = new OfflineAudioContext(numChannels, SAMPLE_RATE * duration, SAMPLE_RATE);

  // Smart pitch selection: uses key for bass (fundamental unreliable), fundamental for others
  const noteFreq = getSmartNoteFrequency(preset.category, options);

  // =========================================================================
  // Build the signal chain from output backward
  // Chain: oscillators → distortion → filter → effects → masterGain → destination
  // =========================================================================

  // Master gain (amplitude envelope) → destination
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);

  // ADSR amplitude envelope (ENV 1)
  const attack = Math.max(0.003, s.env_1_attack || 0.01);
  const decay = Math.max(0.01, s.env_1_decay || 0.2);
  const sustainLevel = s.env_1_sustain ?? 0.7;
  const release = Math.max(0.01, s.env_1_release || 0.1);

  const noteOff = Math.max(duration - release - 0.05, duration * 0.6);
  masterGain.gain.setValueAtTime(0, 0);
  masterGain.gain.linearRampToValueAtTime(0.4, attack);
  masterGain.gain.linearRampToValueAtTime(0.4 * sustainLevel, attack + decay);
  masterGain.gain.setValueAtTime(0.4 * sustainLevel, noteOff);
  masterGain.gain.linearRampToValueAtTime(0, noteOff + release);

  // ---- Effects chain (connects between filter output and masterGain) ----
  // Build effects from last (closest to masterGain) to first, then connect
  let effectsInput = masterGain; // Start with masterGain as the destination

  // Reverb (multi-tap delay network)
  if (s.reverb_on === 1.0 && (s.reverb_dry_wet || 0) > 0.05) {
    const wetLevel = Math.min(0.5, s.reverb_dry_wet || 0.2);
    const roomSize = s.reverb_size ?? 0.5;
    const reverb = createMultiTapReverb(ctx, wetLevel, roomSize);
    reverb.output.connect(effectsInput);
    effectsInput = reverb.input;
  }

  // Phaser
  if (s.phaser_on === 1.0 && (s.phaser_amount || 0) > 0.05) {
    const phaser = createPhaserEffect(ctx, s.phaser_amount || 0.5, duration);
    phaser.output.connect(effectsInput);
    effectsInput = phaser.input;
  }

  // Chorus
  if (s.chorus_on === 1.0 && (s.chorus_amount || 0) > 0.05) {
    const chorus = createChorusEffect(ctx, s.chorus_amount || 0.5, duration);
    chorus.output.connect(effectsInput);
    effectsInput = chorus.input;
  }

  // ---- Filter (24dB/oct via chained biquads) ----
  let filterChain = null;
  let baseCutoffHz = 20000; // Wide open if filter is off
  if (s.filter_1_on) {
    baseCutoffHz = vitalCutoffToHz(s.filter_1_cutoff || 80);
    const resonance = s.filter_1_resonance || 0;
    filterChain = create24dBFilter(ctx, baseCutoffHz, resonance);
    filterChain.output.connect(effectsInput);

    // Filter envelope (ENV 2 → filter cutoff) with proper ADSR curves
    const hasFilterEnvMod = s.env_2_attack != null || s.env_2_decay != null;
    if (hasFilterEnvMod) {
      const envAttack = Math.max(0.005, s.env_2_attack || 0.1);
      const envDecay = Math.max(0.01, s.env_2_decay || 0.3);
      const envSustain = s.env_2_sustain ?? 0.3;
      const envRelease = Math.max(0.01, s.env_2_release || 0.2);

      // Sweep range: from half the base cutoff up to 3x, settle at sustain level
      const minFreq = Math.max(20, baseCutoffHz * 0.5);
      const maxFreq = Math.min(baseCutoffHz * 3, 14000);
      const sustainFreq = Math.max(20, minFreq + (maxFreq - minFreq) * envSustain);
      const releaseFreq = Math.max(20, minFreq * 0.8);

      // Attack: linear ramp to peak (linear sounds better for filter opens)
      filterChain.setValueAtTime(minFreq, 0);
      filterChain.linearRampToValueAtTime(maxFreq, envAttack);
      // Decay: exponential ramp to sustain level (more natural decay curve)
      filterChain.exponentialRampToValueAtTime(sustainFreq, envAttack + envDecay);
      // Hold at sustain until note off
      filterChain.setValueAtTime(sustainFreq, noteOff);
      // Release: exponential ramp down
      filterChain.exponentialRampToValueAtTime(releaseFreq, noteOff + envRelease);
    }
  }

  // ---- Distortion (WaveShaperNode) ----
  let distortionNode = null;
  const postDistDest = filterChain ? filterChain.input : effectsInput;
  if (s.distortion_on === 1.0 && s.distortion_drive > 0) {
    distortionNode = ctx.createWaveShaper();
    distortionNode.curve = makeDistortionCurve(s.distortion_drive * (s.distortion_mix || 0.5) * 10);
    distortionNode.oversample = '2x';
    distortionNode.connect(postDistDest);
  }

  const oscDest = distortionNode || postDistDest;

  // ---- OSC 1 with PeriodicWave and unison voices ----
  if (s.osc_1_on !== 0) {
    const waveFrame = s.osc_1_wave_frame || 0;
    const voices = Math.min(numVoices, 8); // Cap for performance
    const detuneRange = (s.osc_1_unison_detune || 0) * 100; // Vital detune → cents

    // Build the PeriodicWave for richer waveform synthesis
    let periodicWave = null;
    try {
      periodicWave = waveFrameToPeriodicWave(ctx, waveFrame);
    } catch {
      // Fallback to basic type if PeriodicWave creation fails
      periodicWave = null;
    }

    for (let v = 0; v < voices; v++) {
      const osc = ctx.createOscillator();

      // Use PeriodicWave for rich harmonics, fallback to basic type
      if (periodicWave) {
        osc.setPeriodicWave(periodicWave);
      } else {
        osc.type = waveFrameToOscType(waveFrame);
      }

      osc.frequency.value = noteFreq;

      // Spread detune evenly across voices
      if (voices > 1) {
        const spread = (v / (voices - 1) - 0.5) * detuneRange;
        osc.detune.value = spread;
      }

      const oscGain = ctx.createGain();
      oscGain.gain.value = (s.osc_1_level ?? 0.8) / Math.sqrt(voices);

      osc.connect(oscGain);

      // Stereo panning for unison voices — alternate left and right
      if (useStereo && voices > 1) {
        const panner = ctx.createStereoPanner();
        // Spread across stereo field: center for single, wide for many
        const panWidth = Math.min(0.8, (s.osc_1_unison_detune || 0) * 0.4 + 0.2);
        panner.pan.value = (v / (voices - 1) - 0.5) * 2 * panWidth;
        oscGain.connect(panner);
        panner.connect(oscDest);
      } else {
        oscGain.connect(oscDest);
      }

      osc.start(0);
      osc.stop(duration);
    }
  }

  // ---- OSC 2 (if enabled) with PeriodicWave ----
  if (s.osc_2_on) {
    const waveFrame2 = s.osc_2_wave_frame || 0;
    const transpose = s.osc_2_transpose || 0;
    const osc2Freq = noteFreq * Math.pow(2, transpose / 12);

    // OSC 2 unison voices (defaults to 1 if not specified)
    const osc2Voices = Math.min(s.osc_2_unison_voices || 1, 8);
    const osc2DetuneRange = (s.osc_2_unison_detune || 0) * 100;

    let periodicWave2 = null;
    try {
      periodicWave2 = waveFrameToPeriodicWave(ctx, waveFrame2);
    } catch {
      periodicWave2 = null;
    }

    for (let v = 0; v < osc2Voices; v++) {
      const osc2 = ctx.createOscillator();

      if (periodicWave2) {
        osc2.setPeriodicWave(periodicWave2);
      } else {
        osc2.type = waveFrameToOscType(waveFrame2);
      }

      osc2.frequency.value = osc2Freq;

      if (osc2Voices > 1) {
        const spread = (v / (osc2Voices - 1) - 0.5) * osc2DetuneRange;
        osc2.detune.value = spread;
      }

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.value = ((s.osc_2_level ?? 0.5) * 0.8) / Math.sqrt(osc2Voices);

      osc2.connect(osc2Gain);

      if (useStereo && osc2Voices > 1) {
        const panner = ctx.createStereoPanner();
        const panWidth = Math.min(0.8, (s.osc_2_unison_detune || 0) * 0.4 + 0.2);
        panner.pan.value = (v / (osc2Voices - 1) - 0.5) * 2 * panWidth;
        osc2Gain.connect(panner);
        panner.connect(oscDest);
      } else {
        osc2Gain.connect(oscDest);
      }

      osc2.start(0);
      osc2.stop(duration);
    }
  }

  // Render and convert to WAV
  const renderedBuffer = await ctx.startRendering();
  return audioBufferToWav(renderedBuffer);
}

// =============================================================================
// Automated Parameter Sweep Engine (Coordinate Descent Optimization)
// =============================================================================

/**
 * Inline FFT for the parameter sweep — avoids Worker round-trips.
 * Cooley-Tukey radix-2 DIT, same algorithm as audio.worker.js.
 */
function inlineFft(real, imag) {
  const n = real.length;
  if (n <= 1) return;
  for (let i = 0, j = 0; i < n; i++) {
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) { j -= m; m >>= 1; }
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
        const tReal = curReal * real[i + j + halfLen] - curImag * imag[i + j + halfLen];
        const tImag = curReal * imag[i + j + halfLen] + curImag * real[i + j + halfLen];
        real[i + j + halfLen] = real[i + j] - tReal;
        imag[i + j + halfLen] = imag[i + j] - tImag;
        real[i + j] += tReal;
        imag[i + j] += tImag;
        const newReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = newReal;
      }
    }
  }
}

/**
 * Compute magnitude spectrum with Hann windowing (inline version).
 */
function inlineMagnitudeSpectrum(data, fftSize) {
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);
  for (let i = 0; i < fftSize && i < data.length; i++) {
    real[i] = data[i] * 0.5 * (1 - Math.cos(2 * Math.PI * i / fftSize));
  }
  inlineFft(real, imag);
  const mag = new Float32Array(fftSize / 2);
  for (let i = 0; i < fftSize / 2; i++) {
    mag[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  return mag;
}

/**
 * Fast perceptual spectral similarity score (0-100).
 * Same algorithm as the rewritten calculateSpectralMatch in audio.worker.js:
 * multi-window averaging, shape normalization, log-weighted cosine similarity.
 */
export function quickSpectralScore(channelDataA, channelDataB, sampleRate) {
  const fftSize = 4096;
  const freqResolution = sampleRate / fftSize;

  function getAveragedSpectrum(data) {
    const numWindows = Math.min(4, Math.max(1, Math.floor(data.length / fftSize)));
    const hopSize = numWindows > 1 ? Math.floor((data.length - fftSize) / (numWindows - 1)) : 0;
    const acc = new Float32Array(fftSize / 2);
    for (let w = 0; w < numWindows; w++) {
      const offset = w * hopSize;
      const end = Math.min(offset + fftSize, data.length);
      const window = new Float32Array(fftSize);
      for (let i = 0; i < end - offset; i++) window[i] = data[offset + i];
      const mag = inlineMagnitudeSpectrum(window, fftSize);
      for (let i = 0; i < mag.length; i++) acc[i] += mag[i];
    }
    for (let i = 0; i < acc.length; i++) acc[i] /= numWindows;
    return acc;
  }

  const magA = getAveragedSpectrum(channelDataA);
  const magB = getAveragedSpectrum(channelDataB);

  // Normalize to spectral shape
  let totalA = 0, totalB = 0;
  for (let i = 0; i < magA.length; i++) { totalA += magA[i]; totalB += magB[i]; }
  if (totalA === 0 || totalB === 0) return 0;

  // Log-weighted cosine similarity
  let dot = 0, nA = 0, nB = 0;
  for (let i = 1; i < magA.length; i++) {
    const freqHz = i * freqResolution;
    if (freqHz < 20 || freqHz > 16000) continue;
    const weight = 1.0 / Math.log2(1 + freqHz / 20);
    const a = (magA[i] / totalA) * weight;
    const b = (magB[i] / totalB) * weight;
    dot += a * b;
    nA += a * a;
    nB += b * b;
  }
  const cosine = dot / (Math.sqrt(nA) * Math.sqrt(nB) + 1e-10);
  return Math.round(Math.max(0, Math.min(100, cosine * 100)));
}

/**
 * Render a preset with given settings and return mono channel data (Float32Array).
 * Uses OfflineAudioContext — renders faster than real-time.
 */
export async function renderPresetToChannelData(presetId, settings, duration, noteOptions) {
  const wavBuffer = await generatePresetPreview(presetId, duration, settings, noteOptions);
  // Decode WAV to get raw channel data
  const ctx = new OfflineAudioContext(1, SAMPLE_RATE * duration, SAMPLE_RATE);
  const audioBuffer = await ctx.decodeAudioData(wavBuffer);
  return audioBuffer.getChannelData(0);
}

/**
 * Automated parameter sweep using coordinate descent optimization.
 *
 * Instead of analytically mapping analysis features → Vital parameters (which has
 * hit a ceiling at ~33%), this renders 80-100 preset variations and picks the
 * settings that produce the closest spectral match to the source audio.
 *
 * Algorithm: coordinate descent — sweep one parameter at a time, pick the best
 * value, move to the next parameter. Repeat for 2 rounds to catch interactions.
 *
 * @param {string} presetId - Curated preset ID
 * @param {Float32Array} sourceChannelData - Source audio channel data
 * @param {number} sampleRate - Source sample rate
 * @param {Object} initialSettings - Starting settings (from computeAnalysisTuning)
 * @param {Object} [options] - Options
 * @param {number} [options.fundamentalHz] - Detected fundamental frequency
 * @param {string} [options.keyNote] - Detected key
 * @param {Function} [options.onProgress] - Progress callback (0-1)
 * @returns {Promise<{settings: Object, score: number, improvement: number}>}
 */
export async function optimizePresetSettings(
  presetId, sourceChannelData, sampleRate, initialSettings, options = {}
) {
  const preset = CURATED_PRESETS.find(p => p.id === presetId);
  if (!preset) throw new Error(`Preset not found: ${presetId}`);

  const noteOptions = {
    fundamentalHz: options.fundamentalHz || null,
    keyNote: options.keyNote || null,
  };
  const onProgress = options.onProgress || (() => {});
  const duration = 2; // seconds — matches preview length

  // Parameters to sweep and their search ranges
  // Core params (always swept) + conditional params = ~80-100 renders across 2 rounds
  const sweepParams = [
    {
      vitalKey: 'filter_1_cutoff',
      values: [30, 45, 55, 65, 72, 80, 90, 100, 110, 120],
      requires: 'filter_1_on',
    },
    {
      vitalKey: 'filter_1_resonance',
      values: [0, 0.15, 0.3, 0.5, 0.7, 0.9],
      requires: 'filter_1_on',
    },
    {
      vitalKey: 'env_1_attack',
      values: [0.003, 0.01, 0.05, 0.15, 0.4],
    },
    {
      vitalKey: 'env_1_release',
      values: [0.05, 0.15, 0.4, 0.8, 1.5],
    },
    {
      vitalKey: 'osc_1_wave_frame',
      values: [0, 16, 32, 48, 64, 80, 96, 112, 127],
    },
    // Decay and sustain shape the sound more than almost anything — a pluck at
    // decay=0.1s sounds completely different from decay=0.5s. Adding these to
    // the sweep catches envelope mismatches the analytical path misses.
    {
      vitalKey: 'env_1_decay',
      values: [0.05, 0.15, 0.3, 0.5, 0.8],
    },
    {
      vitalKey: 'env_1_sustain',
      values: [0.1, 0.3, 0.5, 0.7, 0.9],
    },
  ];

  // Add distortion sweep only if the preset supports it
  if (initialSettings.distortion_on === 1.0 || preset.settings.distortion_on === 1.0) {
    sweepParams.push({
      vitalKey: 'distortion_drive',
      values: [1, 4, 8, 12, 16],
      linkedToggle: 'distortion_on',
    });
    sweepParams.push({
      vitalKey: 'distortion_mix',
      values: [0.05, 0.15, 0.3, 0.5, 0.8],
    });
  }

  // OSC 2 sweeps (if OSC 2 is enabled)
  if (initialSettings.osc_2_on === 1.0 || preset.settings.osc_2_on === 1.0) {
    sweepParams.push({
      vitalKey: 'osc_2_level',
      values: [0.1, 0.3, 0.5, 0.7, 0.9],
    });
    // Transpose: coarser steps to keep budget reasonable
    sweepParams.push({
      vitalKey: 'osc_2_transpose',
      values: [-24, -12, -7, 0, 7, 12, 19, 24],
    });
  }

  // Unison detune sweep (if preset uses unison voices)
  if ((initialSettings.osc_1_unison_voices || preset.settings.osc_1_unison_voices || 1) > 1) {
    sweepParams.push({
      vitalKey: 'osc_1_unison_detune',
      values: [0.5, 2, 4, 7, 10],
    });
  }

  // Chorus amount sweep (if chorus is enabled or preset has chorus)
  if (initialSettings.chorus_on === 1.0 || preset.settings.chorus_on === 1.0 ||
      initialSettings.chorus_amount > 0 || (preset.settings.chorus_amount || 0) > 0) {
    sweepParams.push({
      vitalKey: 'chorus_amount',
      values: [0.1, 0.3, 0.6, 0.9],
      linkedToggle: 'chorus_on',
    });
  }

  // ENV 2 decay sweep (filter envelope — critical for acid/pluck sounds)
  if (initialSettings.env_2_decay != null || preset.settings.env_2_decay != null) {
    sweepParams.push({
      vitalKey: 'env_2_decay',
      values: [0.05, 0.15, 0.3, 0.6, 1.2],
    });
  }

  // Reverb size sweep (if reverb is enabled)
  if (initialSettings.reverb_on === 1.0 || preset.settings.reverb_on === 1.0) {
    sweepParams.push({
      vitalKey: 'reverb_size',
      values: [0.1, 0.3, 0.5, 0.7, 0.9],
    });
  }

  // Start with initial settings
  let bestSettings = { ...preset.settings, ...initialSettings };
  const mergedInitial = { ...bestSettings };

  // Render source-length-matched audio for the initial settings to get baseline score
  let bestData = await renderPresetToChannelData(presetId, bestSettings, duration, noteOptions);
  let bestScore = quickSpectralScore(sourceChannelData, bestData, sampleRate);
  const initialScore = bestScore;

  // Count total renders for progress tracking
  const totalRenders = sweepParams.reduce((sum, p) => sum + p.values.length, 0) * 2; // 2 rounds
  let rendersCompleted = 0;

  // Coordinate descent: 2 rounds to catch parameter interactions
  for (let round = 0; round < 2; round++) {
    for (const param of sweepParams) {
      // Skip if the param requires a feature that's off
      if (param.requires && !bestSettings[param.requires]) {
        rendersCompleted += param.values.length;
        onProgress(rendersCompleted / totalRenders);
        continue;
      }

      const currentBest = bestSettings[param.vitalKey];

      for (const candidateValue of param.values) {
        // Skip if this is already the current value
        if (candidateValue === currentBest) {
          rendersCompleted++;
          onProgress(rendersCompleted / totalRenders);
          continue;
        }

        const testSettings = { ...bestSettings, [param.vitalKey]: candidateValue };
        if (param.linkedToggle) {
          testSettings[param.linkedToggle] = candidateValue > 0 ? 1.0 : 0.0;
        }

        const testData = await renderPresetToChannelData(presetId, testSettings, duration, noteOptions);
        const testScore = quickSpectralScore(sourceChannelData, testData, sampleRate);

        if (testScore > bestScore) {
          bestScore = testScore;
          bestSettings = testSettings;
          bestData = testData;
        }

        rendersCompleted++;
        onProgress(rendersCompleted / totalRenders);
      }
    }
  }

  // Map optimized Vital settings back to tuning slider values for the UI
  const optimizedOverrides = {};
  const { TUNING_PARAMS: tuningParams } = await import('../data/vitalPresets');
  for (const param of tuningParams) {
    const val = bestSettings[param.vitalKey];
    if (val != null && val !== mergedInitial[param.vitalKey]) {
      optimizedOverrides[param.id] = Math.min(param.max, Math.max(param.min, val));
    }
  }

  // Preserve raw overrides that weren't part of the sweep
  if (initialSettings._rawOverrides) {
    optimizedOverrides._rawOverrides = { ...initialSettings._rawOverrides };
  }
  // Add any swept raw values that aren't in TUNING_PARAMS
  const tuningVitalKeys = new Set(tuningParams.map(p => p.vitalKey));
  for (const param of sweepParams) {
    if (!tuningVitalKeys.has(param.vitalKey) && bestSettings[param.vitalKey] !== mergedInitial[param.vitalKey]) {
      if (!optimizedOverrides._rawOverrides) optimizedOverrides._rawOverrides = {};
      optimizedOverrides._rawOverrides[param.vitalKey] = bestSettings[param.vitalKey];
    }
  }

  return {
    settings: optimizedOverrides,
    score: bestScore,
    initialScore,
    improvement: bestScore - initialScore,
  };
}
