import { describe, it, expect } from 'vitest';
import { detectPhrases, encodeWavSlice, buildChopFilename } from '../utils/vocalChops';

const SR = 44100;

/** Build a mono signal from [start, end] seconds of "singing" (noisy sine), silence elsewhere */
function synth(phrases, totalSec = 8) {
  const data = new Float32Array(Math.round(totalSec * SR));
  for (const [a, b] of phrases) {
    for (let i = Math.round(a * SR); i < Math.round(b * SR); i++) {
      data[i] = 0.5 * Math.sin(2 * Math.PI * 220 * i / SR) + 0.05 * (Math.random() - 0.5);
    }
  }
  return data;
}

describe('detectPhrases', () => {
  it('finds phrases separated by real gaps', () => {
    const data = synth([[0.5, 1.5], [2.5, 4.0], [5.0, 5.2], [6.0, 7.0]]);
    const phrases = detectPhrases(data, SR);
    // the 200 ms blip at 5.0 is dropped (minPhraseMs = 400)
    expect(phrases).toHaveLength(3);
    // 15 ms preroll before, 60 ms release after
    expect(phrases[0].start).toBeCloseTo(0.485, 2);
    expect(phrases[0].end).toBeCloseTo(1.56, 2);
    expect(phrases[1].start).toBeCloseTo(2.485, 2);
    expect(phrases[2].end).toBeCloseTo(7.06, 2);
  });

  it('bridges breaths shorter than minGapMs', () => {
    // 100 ms breath inside a line → still one phrase at normal sensitivity, two when tight
    const data = synth([[1.0, 2.0], [2.1, 3.0]]);
    expect(detectPhrases(data, SR, { minGapMs: 250 })).toHaveLength(1);
    expect(detectPhrases(data, SR, { minGapMs: 50 })).toHaveLength(2);
  });

  it('never overlaps neighbouring chops', () => {
    const data = synth([[1.0, 2.0], [2.3, 3.0]]);
    const phrases = detectPhrases(data, SR, { minGapMs: 100, releaseMs: 500 });
    expect(phrases).toHaveLength(2);
    expect(phrases[0].end).toBeLessThanOrEqual(phrases[1].start);
  });

  it('returns nothing for silence', () => {
    expect(detectPhrases(new Float32Array(SR * 2), SR)).toEqual([]);
  });
});

describe('encodeWavSlice', () => {
  it('writes a valid 16-bit stereo WAV of the slice', () => {
    const left = new Float32Array(SR).fill(0.25);
    const right = new Float32Array(SR).fill(-0.25);
    const buffer = { sampleRate: SR, numberOfChannels: 2, getChannelData: (c) => (c === 0 ? left : right) };
    const wav = encodeWavSlice(buffer, 0.25, 0.75);
    const view = new DataView(wav);
    expect(String.fromCharCode(...new Uint8Array(wav, 0, 4))).toBe('RIFF');
    expect(view.getUint16(22, true)).toBe(2);        // channels
    expect(view.getUint32(24, true)).toBe(SR);       // sample rate
    expect(view.getUint32(40, true)).toBe(Math.ceil(SR * 0.5) * 4); // 0.5 s × 2 ch × 2 bytes
    // middle of the slice (past the fade-in): +0.25 / -0.25 full scale
    const mid = 44 + Math.floor(SR * 0.25) * 4;
    expect(view.getInt16(mid, true)).toBe(Math.trunc(0.25 * 0x7FFF));
    expect(view.getInt16(mid + 2, true)).toBe(Math.trunc(-0.25 * 0x8000));
  });
});

describe('buildChopFilename', () => {
  it('stamps index and bar', () => {
    expect(buildChopFilename('A - B - 128bpm - Bbm', 2, 17)).toBe('A - B - 128bpm - Bbm - chop 03 (bar 17).wav');
    expect(buildChopFilename('A - B', 0)).toBe('A - B - chop 01.wav');
  });
});
