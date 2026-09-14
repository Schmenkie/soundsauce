/**
 * Vocal chop kit — slice a vocal stem into phrases at the gaps between them.
 *
 * Pure functions (no Web Audio) so they're testable: detectPhrases() works on a mono
 * Float32Array, encodeWavSlice() turns a slice of any AudioBuffer-like into 16-bit WAV.
 */

export const CHOP_SENSITIVITY = {
  tight:  { label: 'tight',  minGapMs: 120, minPhraseMs: 250 }, // every breath → many short chops
  normal: { label: 'normal', minGapMs: 250, minPhraseMs: 400 },
  loose:  { label: 'loose',  minGapMs: 500, minPhraseMs: 800 }, // whole lines
};

/**
 * Find sung phrases: runs of energy separated by silences of at least minGapMs.
 *
 * @param {Float32Array} channelData  mono samples
 * @param {number} sampleRate
 * @param {object} [opts]
 * @param {number} [opts.minGapMs=250]      a silence shorter than this doesn't split a phrase
 * @param {number} [opts.minPhraseMs=400]   drop blips shorter than this
 * @param {number} [opts.thresholdDb]       "silence" = this far below the loudest frame. Default: adaptive —
 *                                          55% of the way from the stem's silence floor (p10) up to its singing
 *                                          level (p75), clamped to [-40, -14]. Demucs stems carry residue and
 *                                          reverb tails, so a fixed low gate would call everything singing.
 * @param {number} [opts.prerollMs=15]      start each chop slightly early so the consonant survives
 * @param {number} [opts.releaseMs=60]      keep a little tail after the level drops
 * @param {number} [opts.maxChops=96]
 * @returns {{ start: number, end: number, peakDb: number }[]}  seconds, in order
 */
export function detectPhrases(channelData, sampleRate, opts = {}) {
  const {
    minGapMs = 250, minPhraseMs = 400,
    prerollMs = 15, releaseMs = 60, maxChops = 96,
  } = opts;
  if (!channelData || channelData.length === 0) return [];

  const hop = Math.max(1, Math.round(sampleRate * 0.01)); // 10 ms frames
  const frames = Math.ceil(channelData.length / hop);
  const rmsDb = new Float32Array(frames);
  let maxDb = -Infinity;
  for (let f = 0; f < frames; f++) {
    const start = f * hop;
    const end = Math.min(channelData.length, start + hop);
    let sum = 0;
    for (let i = start; i < end; i++) sum += channelData[i] * channelData[i];
    const rms = Math.sqrt(sum / Math.max(1, end - start));
    const db = rms > 1e-6 ? 20 * Math.log10(rms) : -120;
    rmsDb[f] = db;
    if (db > maxDb) maxDb = db;
  }
  if (!Number.isFinite(maxDb) || maxDb < -80) return []; // effectively silent stem

  let thresholdDb = opts.thresholdDb;
  if (thresholdDb == null) {
    const sorted = Float32Array.from(rmsDb).sort();
    const floor = sorted[Math.floor(sorted.length * 0.1)] - maxDb;
    const voice = sorted[Math.floor(sorted.length * 0.75)] - maxDb;
    thresholdDb = Math.max(-40, Math.min(-14, floor + 0.55 * (voice - floor)));
  }
  const gate = maxDb + thresholdDb;
  const active = new Uint8Array(frames);
  for (let f = 0; f < frames; f++) active[f] = rmsDb[f] > gate ? 1 : 0;

  // Close gaps shorter than minGapMs (a breath inside a line isn't a phrase boundary)
  const minGapFrames = Math.max(1, Math.round(minGapMs / 10));
  let f = 0;
  while (f < frames) {
    if (active[f]) { f++; continue; }
    let g = f;
    while (g < frames && !active[g]) g++;
    const gapLen = g - f;
    if (f > 0 && g < frames && gapLen < minGapFrames) active.fill(1, f, g);
    f = g;
  }

  // Collect runs, drop the ones shorter than minPhraseMs
  const minPhraseFrames = Math.max(1, Math.round(minPhraseMs / 10));
  const phrases = [];
  f = 0;
  while (f < frames) {
    if (!active[f]) { f++; continue; }
    let g = f;
    let peak = -Infinity;
    while (g < frames && active[g]) { if (rmsDb[g] > peak) peak = rmsDb[g]; g++; }
    if (g - f >= minPhraseFrames) {
      phrases.push({
        start: Math.max(0, (f * hop) / sampleRate - prerollMs / 1000),
        end: Math.min(channelData.length / sampleRate, (g * hop) / sampleRate + releaseMs / 1000),
        peakDb: Math.round((peak - maxDb) * 10) / 10,
      });
    }
    f = g;
  }

  // Preroll/release can make neighbours overlap — trim the earlier one
  for (let i = 1; i < phrases.length; i++) {
    if (phrases[i - 1].end > phrases[i].start) phrases[i - 1].end = phrases[i].start;
  }

  if (phrases.length > maxChops) {
    // Keep the loudest ones, in time order
    return phrases
      .map((p, i) => ({ ...p, i }))
      .sort((a, b) => b.peakDb - a.peakDb)
      .slice(0, maxChops)
      .sort((a, b) => a.i - b.i)
      .map(({ i, ...p }) => p); // eslint-disable-line no-unused-vars
  }
  return phrases;
}

/**
 * Encode a slice of an AudioBuffer-like ({ sampleRate, numberOfChannels, getChannelData })
 * as 16-bit PCM WAV, keeping the channel count (stems are usually stereo).
 * @returns {ArrayBuffer}
 */
export function encodeWavSlice(buffer, startSec, endSec) {
  const sampleRate = buffer.sampleRate;
  const numChannels = Math.max(1, buffer.numberOfChannels || 1);
  const s0 = Math.max(0, Math.floor(startSec * sampleRate));
  const s1 = Math.min(buffer.getChannelData(0).length, Math.ceil(endSec * sampleRate));
  const numSamples = Math.max(0, s1 - s0);
  const bytesPerSample = 2;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);
  const writeString = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = Array.from({ length: numChannels }, (_, c) => buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1)));
  // Short fades so chops never click
  const fade = Math.min(Math.round(sampleRate * 0.005), Math.floor(numSamples / 2));
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const env = i < fade ? i / fade : i >= numSamples - fade ? (numSamples - i) / fade : 1;
    for (let c = 0; c < numChannels; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][s0 + i] * env));
      view.setInt16(offset, v < 0 ? v * 0x8000 : v * 0x7FFF, true);
      offset += 2;
    }
  }
  return out;
}

/** "Artist - Title - 128bpm - Bbm - chop 03 (bar 17).wav" */
export function buildChopFilename(base, index, bar) {
  const n = String(index + 1).padStart(2, '0');
  return `${base} - chop ${n}${bar != null ? ` (bar ${bar})` : ''}.wav`;
}
