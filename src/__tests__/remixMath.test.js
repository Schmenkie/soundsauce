import { describe, it, expect } from 'vitest';
import { transposeSemitones, tempoChange, camelotOf, relativeKey, compatibleTargets, warpAdvice, repitchSemitones, shortestShift } from '../utils/remixMath';

describe('remixMath', () => {
  it('maps keys to Camelot', () => {
    expect(camelotOf({ key: 'A#', mode: 'minor' })).toBe('3A');
    expect(camelotOf({ key: 'Bb', mode: 'minor' })).toBe('3A');
    expect(camelotOf({ key: 'C', mode: 'major' })).toBe('8B');
    expect(camelotOf({ key: 'A', mode: 'minor' })).toBe('8A');
  });

  it('finds relative keys', () => {
    expect(relativeKey({ key: 'A', mode: 'minor' })).toEqual({ key: 'C', mode: 'major' });
    expect(relativeKey({ key: 'C', mode: 'major' })).toEqual({ key: 'A', mode: 'minor' });
    expect(relativeKey({ key: 'A#', mode: 'minor' })).toEqual({ key: 'C#', mode: 'major' });
  });

  it('wraps shifts into the shortest direction', () => {
    expect(shortestShift(7)).toBe(-5);
    expect(shortestShift(-7)).toBe(5);
    expect(shortestShift(6)).toBe(6);
    expect(shortestShift(12)).toBe(0);
  });

  it('transposes same-mode keys by tonic distance', () => {
    expect(transposeSemitones({ key: 'A', mode: 'minor' }, { key: 'C', mode: 'minor' }).semitones).toBe(3);
    expect(transposeSemitones({ key: 'A', mode: 'minor' }, { key: 'F', mode: 'minor' }).semitones).toBe(-4);
  });

  it('uses the relative key when modes differ', () => {
    // Bb minor vocal over a Db major project: same notes, no transpose
    const r = transposeSemitones({ key: 'A#', mode: 'minor' }, { key: 'C#', mode: 'major' });
    expect(r.semitones).toBe(0);
    expect(r.viaRelative).toBe(true);
    expect(r.exact).toBe(3);
  });

  it('computes tempo change and prefers half/double-time when closer', () => {
    const t = tempoChange(118, 128);
    expect(t.straight.percent).toBeCloseTo(8.47, 1);
    expect(t.best.label).toBe('straight');
    const h = tempoChange(70, 138);
    expect(h.best.label).toBe('double-time');
    expect(h.best.percent).toBeCloseTo(-1.43, 1);
  });

  it('gives Re-Pitch semitones for a ratio', () => {
    expect(repitchSemitones(2)).toBeCloseTo(12, 5);
    expect(repitchSemitones(128 / 118)).toBeCloseTo(1.41, 1);
  });

  it('escalates warp advice with stretch amount', () => {
    expect(warpAdvice(3).mode).toBe('Complex Pro');
    expect(warpAdvice(25).mode).toBe('Re-Pitch');
  });

  it('lists compatible targets with zero-shift options first', () => {
    const list = compatibleTargets({ key: 'A#', mode: 'minor' });
    expect(list.map(x => x.camelot)).toEqual(['3A', '3B', '4A', '2A']);
    expect(list[0].semitones).toBe(0);
    expect(list[1].semitones).toBe(0); // relative major = same notes
    expect(Math.abs(list[2].semitones)).toBe(5); // +1 on the wheel = up a fifth (shortest: -5)
  });
});
