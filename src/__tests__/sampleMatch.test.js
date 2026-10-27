import { describe, it, expect } from 'vitest';
import {
  canonicalBpm,
  tempoDelta,
  keyRelation,
  rankSamples,
  isAnalysed,
  formatPercent,
  formatSemitones,
  searchQueryFor,
  FOLD_MIN,
} from '../utils/sampleMatch';

/** A target of 132 BPM in C# minor — 12A — the query Spencer actually runs. */
const TARGET = { bpm: 132, key: 'C#', mode: 'minor' };

const row = (over = {}) => ({ artist: 'A', title: 'T', bpm: 132, camelot: '12A', confidence: 80, ...over });

describe('canonicalBpm', () => {
  it('leaves a tempo already in the octave alone', () => {
    expect(canonicalBpm(128)).toBe(128);
    expect(canonicalBpm(132)).toBe(132);
    expect(canonicalBpm(90)).toBe(90);
    expect(canonicalBpm(179)).toBe(179);
  });

  it('folds the half-time readings detectBPM actually returns', () => {
    // Measured against scripts/key-truth.json: 128 -> 63, 130 -> 65, 148 -> 73
    expect(canonicalBpm(63)).toBe(126);
    expect(canonicalBpm(65)).toBe(130);
    expect(canonicalBpm(73)).toBe(146);
    expect(canonicalBpm(67)).toBe(134);
  });

  it('folds a double-time reading back down', () => {
    expect(canonicalBpm(256)).toBe(128);
    expect(canonicalBpm(300)).toBe(150);
  });

  it('is idempotent', () => {
    for (const bpm of [63, 65, 73, 128, 256, 44, 300]) {
      expect(canonicalBpm(canonicalBpm(bpm))).toBe(canonicalBpm(bpm));
    }
  });

  it('respects a different fold point', () => {
    expect(canonicalBpm(63, 60)).toBe(63);
    expect(canonicalBpm(63, FOLD_MIN)).toBe(126);
  });

  it('returns null for nothing usable', () => {
    expect(canonicalBpm(null)).toBeNull();
    expect(canonicalBpm(0)).toBeNull();
    expect(canonicalBpm(undefined)).toBeNull();
    expect(canonicalBpm('nope')).toBeNull();
  });

  it("doesn't hang on an absurd reading", () => {
    expect(canonicalBpm(0.0001)).toBeNull;
    expect(Number.isFinite(canonicalBpm(1e9))).toBe(true);
  });
});

describe('tempoDelta', () => {
  it('reports the percentage between two folded tempos', () => {
    const d = tempoDelta(128, 132);
    expect(d.percent).toBeCloseTo(3.125, 2);
    expect(d.from).toBe(128);
    expect(d.to).toBe(132);
  });

  it('folds a half-time reading before comparing', () => {
    // 65 is a 130 BPM track read at half speed — 1.5% from a 132 project, not 102%
    expect(tempoDelta(65, 132).percent).toBeCloseTo(1.538, 2);
  });

  it('is signed in the direction of the move', () => {
    expect(tempoDelta(140, 132).percent).toBeLessThan(0);
    expect(tempoDelta(124, 132).percent).toBeGreaterThan(0);
  });

  it('returns null without both tempos', () => {
    expect(tempoDelta(null, 132)).toBeNull();
    expect(tempoDelta(128, null)).toBeNull();
  });
});

describe('keyRelation', () => {
  it('ranks the harmonic-mixing set in order', () => {
    expect(keyRelation('12A', '12A')).toEqual({ relation: 'same key', rank: 0 });
    expect(keyRelation('1A', '12A')).toEqual({ relation: '+1 on the wheel', rank: 1 });
    expect(keyRelation('11A', '12A')).toEqual({ relation: '-1 on the wheel', rank: 2 });
    expect(keyRelation('12B', '12A')).toEqual({ relation: 'relative', rank: 3 });
  });

  it('wraps around the wheel', () => {
    expect(keyRelation('1A', '12A').rank).toBe(1);
    expect(keyRelation('12A', '1A').rank).toBe(2);
  });

  it('is null for keys that do not mix', () => {
    expect(keyRelation('8A', '12A')).toBeNull();
    expect(keyRelation('', '12A')).toBeNull();
    expect(keyRelation('12A', 'nonsense')).toBeNull();
  });

  it('tolerates lowercase and whitespace from an index row', () => {
    expect(keyRelation(' 12a ', '12A').rank).toBe(0);
  });
});

describe('isAnalysed', () => {
  it('needs both a tempo and a key', () => {
    expect(isAnalysed(row())).toBe(true);
    expect(isAnalysed({ bpm: 128 })).toBe(false);
    expect(isAnalysed({ camelot: '12A' })).toBe(false);
    expect(isAnalysed(null)).toBe(false);
  });

  it('accepts a nested vault-shaped key', () => {
    expect(isAnalysed({ bpm: 128, key: { camelot: '8A' } })).toBe(true);
  });
});

describe('rankSamples', () => {
  it('puts same-key drop-ins first, then the wheel, then relative', () => {
    const out = rankSamples([
      row({ title: 'relative', camelot: '12B' }),
      row({ title: 'minus one', camelot: '11A' }),
      row({ title: 'same', camelot: '12A' }),
      row({ title: 'plus one', camelot: '1A' }),
    ], TARGET);
    expect(out.map(r => r.title)).toEqual(['same', 'plus one', 'minus one', 'relative']);
    expect(out.every(r => r.bucket === 'drop-in')).toBe(true);
  });

  it('breaks ties on the smaller tempo move', () => {
    const out = rankSamples([
      row({ title: 'far', bpm: 140 }),
      row({ title: 'near', bpm: 131 }),
      row({ title: 'exact', bpm: 132 }),
    ], TARGET);
    expect(out.map(r => r.title)).toEqual(['exact', 'near', 'far']);
  });

  it('matches a track whose stored tempo is a half-time reading', () => {
    const out = rankSamples([row({ title: 'half', bpm: 66 })], TARGET);
    expect(out).toHaveLength(1);
    expect(out[0].bpm).toBe(132);
    expect(out[0].rawBpm).toBe(66);
    expect(out[0].percent).toBeCloseTo(0, 5);
  });

  it('drops tracks outside the tempo tolerance', () => {
    const tracks = [row({ title: 'way off', bpm: 110 })];
    expect(rankSamples(tracks, TARGET)).toHaveLength(0);
    expect(rankSamples(tracks, TARGET, { tolerancePct: 0.2 })).toHaveLength(1);
  });

  it('offers the shift-my-track variant after the drop-ins', () => {
    const out = rankSamples([
      row({ title: 'needs a shift', camelot: '2A' }),   // D#m — 2 st from C#m
      row({ title: 'drops in', camelot: '12A' }),
    ], TARGET);
    expect(out.map(r => r.bucket)).toEqual(['drop-in', 'shift']);
    expect(out[1].semitones).toBe(2);
    expect(out[1].relation).toBeNull();
  });

  it('respects maxSemitones', () => {
    const tracks = [row({ camelot: '9A' })]; // Em — 3 st from C#m, and not on the wheel
    expect(rankSamples(tracks, TARGET)).toHaveLength(0);
    expect(rankSamples(tracks, TARGET, { maxSemitones: 3 })).toHaveLength(1);
  });

  it('sorts the shift bucket by the smaller move', () => {
    const out = rankSamples([
      row({ title: 'two', camelot: '2A' }),  // D#m — 2 st
      row({ title: 'one', camelot: '7A' }),  // Dm  — 1 st
    ], TARGET, { maxSemitones: 3 });
    expect(Math.abs(out[0].semitones)).toBeLessThanOrEqual(Math.abs(out[1].semitones));
  });

  it('never drops a result on confidence, but flags the low ones', () => {
    const out = rankSamples([
      row({ title: 'shaky', confidence: 41 }),
      row({ title: 'solid', confidence: 93 }),
    ], TARGET);
    expect(out).toHaveLength(2);
    expect(out.find(r => r.title === 'shaky').lowConfidence).toBe(true);
    expect(out.find(r => r.title === 'solid').lowConfidence).toBe(false);
  });

  it('skips un-analysed rows instead of throwing', () => {
    const out = rankSamples([
      { artist: 'A', title: 'no numbers yet' },
      { artist: 'A', title: 'failed', error: 'not found' },
      row({ title: 'good' }),
    ], TARGET);
    expect(out.map(r => r.title)).toEqual(['good']);
  });

  it('returns nothing without a usable target', () => {
    expect(rankSamples([row()], { bpm: 132 })).toEqual([]);
    expect(rankSamples([row()], { key: 'C#', mode: 'minor' })).toEqual([]);
    expect(rankSamples([row()], null)).toEqual([]);
  });

  it('accepts a target given as a camelot code', () => {
    const out = rankSamples([row()], { bpm: 132, camelot: '12A' });
    expect(out).toHaveLength(1);
  });

  it('honours a limit', () => {
    const many = Array.from({ length: 10 }, (_, i) => row({ title: `t${i}`, bpm: 130 + i * 0.1 }));
    expect(rankSamples(many, TARGET, { limit: 3 })).toHaveLength(3);
  });

  it('copes with an empty or missing library', () => {
    expect(rankSamples([], TARGET)).toEqual([]);
    expect(rankSamples(null, TARGET)).toEqual([]);
  });
});

describe('formatting', () => {
  it('signs percentages and collapses near-zero', () => {
    expect(formatPercent(3.125)).toBe('+3.1%');
    expect(formatPercent(-1.5)).toBe('-1.5%');
    expect(formatPercent(0.01)).toBe('0%');
    expect(formatPercent(null)).toBe('—');
  });

  it('signs semitones', () => {
    expect(formatSemitones(2)).toBe('+2 st');
    expect(formatSemitones(-1)).toBe('-1 st');
    expect(formatSemitones(0)).toBe('0 st');
    expect(formatSemitones(null)).toBe('—');
  });

  it('builds the import search text', () => {
    expect(searchQueryFor({ artist: 'Mall Grab', title: 'Liverpool Street In The Rain' }))
      .toBe('Mall Grab Liverpool Street In The Rain');
    expect(searchQueryFor({ title: 'Untitled' })).toBe('Untitled');
    expect(searchQueryFor({})).toBe('');
  });
});
