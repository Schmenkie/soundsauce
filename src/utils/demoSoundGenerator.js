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
 */
function waveFrameToOscType(waveFrame) {
  if (waveFrame <= 10) return 'sine';
  if (waveFrame <= 48) return 'triangle';
  if (waveFrame <= 80) return 'sawtooth';
  return 'square';
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
 * Generate a 2-second audio preview of a curated Vital preset.
 * Uses OfflineAudioContext to render a simplified approximation
 * based on the preset's oscillator, filter, and envelope settings.
 *
 * @param {string} presetId - ID of a CURATED_PRESETS entry
 * @param {number} [duration=2] - Duration in seconds
 * @returns {Promise<ArrayBuffer>} WAV ArrayBuffer ready for playback
 */
export async function generatePresetPreview(presetId, duration = 2) {
  const preset = CURATED_PRESETS.find(p => p.id === presetId);
  if (!preset) throw new Error(`Preset not found: ${presetId}`);

  const s = preset.settings;
  const ctx = new OfflineAudioContext(1, SAMPLE_RATE * duration, SAMPLE_RATE);
  const noteFreq = getNoteForCategory(preset.category);

  // Master gain (amplitude envelope)
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);

  // ADSR envelope
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

  // Filter (if enabled)
  let filterNode = null;
  if (s.filter_1_on) {
    filterNode = ctx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = vitalCutoffToHz(s.filter_1_cutoff || 80);
    filterNode.Q.value = 0.5 + (s.filter_1_resonance || 0) * 15;
    filterNode.connect(masterGain);
  }

  const destination = filterNode || masterGain;

  // OSC 1
  if (s.osc_1_on !== 0) {
    const oscType = waveFrameToOscType(s.osc_1_wave_frame || 0);
    const voices = Math.min(s.osc_1_unison_voices || 1, 5); // Limit for performance
    const detuneRange = (s.osc_1_unison_detune || 0) * 4; // Scale detune to cents

    for (let v = 0; v < voices; v++) {
      const osc = ctx.createOscillator();
      osc.type = oscType;
      osc.frequency.value = noteFreq;
      // Spread detune evenly across voices
      if (voices > 1) {
        const spread = detuneRange * ((v / (voices - 1)) - 0.5) * 2;
        osc.detune.value = spread;
      }

      const oscGain = ctx.createGain();
      oscGain.gain.value = (s.osc_1_level ?? 0.8) / Math.sqrt(voices);

      osc.connect(oscGain);
      oscGain.connect(destination);
      osc.start(0);
      osc.stop(duration);
    }
  }

  // OSC 2 (if enabled)
  if (s.osc_2_on) {
    const osc2Type = waveFrameToOscType(s.osc_2_wave_frame || 0);
    const osc2 = ctx.createOscillator();
    osc2.type = osc2Type;
    // Apply transpose (semitones)
    const transpose = s.osc_2_transpose || 0;
    osc2.frequency.value = noteFreq * Math.pow(2, transpose / 12);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = (s.osc_2_level ?? 0.5) * 0.8;

    osc2.connect(osc2Gain);
    osc2Gain.connect(destination);
    osc2.start(0);
    osc2.stop(duration);
  }

  // Render and convert to WAV
  const renderedBuffer = await ctx.startRendering();
  return audioBufferToWav(renderedBuffer);
}
