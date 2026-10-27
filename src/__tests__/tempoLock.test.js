import { describe, it, expect } from 'vitest';
import {
  planTempoLock,
  bestResampleSemitones,
  bpmFromBeats,
  tempoRangeOf,
  buildTimeMap,
  transposedKey,
  formatTimeMap,
  describeLockPlan,
  mapTimeThroughLock,
  lockedSections,
  MIN_LOCK_BEATS,
} from '../utils/tempoLock';

/** A beat list at `bpm`, optionally drifting linearly to `endBpm` over the track. */
function beatsAt(bpm, count, { start = 0, endBpm = bpm } = {}) {
  const out = [];
  let t = start;
  for (let i = 0; i < count; i++) {
    out.push(t);
    const f = count > 1 ? i / (count - 1) : 0;
    t += 60 / (bpm + (endBpm - bpm) * f);
  }
  return out;
}

describe('tempoLock', () => {
  it('reads tempo and drift off a beat list', () => {
    expect(bpmFromBeats(beatsAt(128, 64))).toBeCloseTo(128, 6);
    const range = tempoRangeOf(beatsAt(149, 200, { endBpm: 153 }));
    expect(range.min).toBeCloseTo(149, 1);
    expect(range.max).toBeCloseTo(153, 1);
  });

  it('picks the whole semitone that lands nearest the target', () => {
    // the case this was built for: a 1979 record at ~149.8 into a 132 house project
    expect(bestResampleSemitones(149.8, 132)).toBe(-2);
    expect(bestResampleSemitones(128, 128)).toBe(0);
    expect(bestResampleSemitones(174, 87)).toBe(-6); // an octave down, clamped to 6 st
    expect(bestResampleSemitones(100, 140)).toBe(6);
    expect(bestResampleSemitones(174, 87, 12)).toBe(-12);
  });

  it('moves the key by the resample, keeping the mode', () => {
    expect(transposedKey({ key: 'C#', mode: 'minor' }, -2)).toEqual({ key: 'B', mode: 'minor', camelot: '10A' });
    expect(transposedKey({ key: 'A', mode: 'minor' }, 3)).toEqual({ key: 'C', mode: 'minor', camelot: '5A' });
    expect(transposedKey({ key: 'C', mode: 'major' }, 0)).toEqual({ key: 'C', mode: 'major', camelot: '8B' });
    expect(transposedKey(null, -2)).toBeNull();
  });

  it('turns a steady grid into a time map with a near-zero stretch', () => {
    // 149.83 BPM resampled down 2 semitones is 133.46 — only 1.1% left to stretch
    const beats = beatsAt(149.83, 240);
    const plan = planTempoLock({ beats, targetBpm: 132, duration: beats[239] + 2, key: { key: 'C#', mode: 'minor' } });
    expect(plan.semitones).toBe(-2);
    expect(plan.resampleRatio).toBeCloseTo(0.8909, 3);
    expect(plan.resultKey.key).toBe('B');
    expect(plan.stretch.median).toBeCloseTo(-1.09, 1);
    expect(Math.abs(plan.stretch.max)).toBeLessThan(2);
    expect(plan.naiveStretchPercent).toBeCloseTo(-11.9, 1);
  });

  it('emits a strictly increasing time map that ends where -D will', () => {
    const beats = beatsAt(149.3, 300, { start: 1.7, endBpm: 152.6 });
    const duration = beats[299] + 5;
    const plan = planTempoLock({ beats, targetBpm: 132, duration, sampleRate: 44100 });
    const map = plan.timeMap;
    // no explicit (0,0): rubberband's implicit start covers it without a 0/0 ratio
    expect(map[0][0]).toBeGreaterThan(0);
    for (let i = 1; i < map.length; i++) {
      expect(map[i][0]).toBeGreaterThan(map[i - 1][0]);
      expect(map[i][1]).toBeGreaterThan(map[i - 1][1]);
    }
    // the trap: -D must match the map's last target frame exactly or rubberband emits NaN
    expect(plan.outputFrames).toBe(map[map.length - 1][1]);
    expect(plan.outputDuration).toBeCloseTo(plan.outputFrames / 44100, 9);
    // the map covers the whole resampled file
    expect(map[map.length - 1][0]).toBe(Math.round(plan.resampledDuration * 44100));
  });

  it('puts every beat on an exact grid in the output', () => {
    const beats = beatsAt(150, 128, { start: 0.4, endBpm: 153 });
    const plan = planTempoLock({ beats, targetBpm: 132, duration: beats[127] + 3 });
    const beatSec = 60 / 132;
    const beatTargets = plan.timeMap.slice(0, beats.length).map(([, t]) => t / plan.sampleRate);
    for (let i = 1; i < beatTargets.length; i++) {
      expect(beatTargets[i] - beatTargets[i - 1]).toBeCloseTo(beatSec, 4);
    }
  });

  it('pads so the first downbeat lands on a bar line', () => {
    const beats = beatsAt(132, 64, { start: 1.3 });
    for (const downbeatIndex of [0, 1, 2, 3]) {
      const plan = planTempoLock({ beats, targetBpm: 132, duration: beats[63] + 2, downbeatIndex });
      const firstDownbeat = plan.padSeconds + beats[0] / plan.resampleRatio + downbeatIndex * plan.beatSec;
      const offBar = firstDownbeat % plan.barSec;
      expect(Math.min(offBar, plan.barSec - offBar)).toBeCloseTo(0, 6);
      expect(plan.padSeconds).toBeGreaterThanOrEqual(0);
      expect(plan.padSeconds).toBeLessThan(plan.barSec);
    }
  });

  it('keeps the pitch when told to', () => {
    const beats = beatsAt(149.8, 64);
    const plan = planTempoLock({ beats, targetBpm: 132, duration: beats[63] + 1, semitones: 0, key: { key: 'C#', mode: 'minor' } });
    expect(plan.semitones).toBe(0);
    expect(plan.resampleRatio).toBe(1);
    expect(plan.resultKey.key).toBe('C#');
    expect(plan.stretch.median).toBeCloseTo(-11.9, 0);
  });

  it('refuses beat lists it cannot fit a grid to', () => {
    expect(() => planTempoLock({ beats: beatsAt(128, MIN_LOCK_BEATS - 1), targetBpm: 132, duration: 10 })).toThrow(/at least/);
    expect(() => planTempoLock({ beats: beatsAt(128, 32), targetBpm: 0, duration: 10 })).toThrow(/positive/);
    expect(() => planTempoLock({ beats: [0, 1, 0.5, 2, 3, 4, 5, 6, 7], targetBpm: 120, duration: 10 })).toThrow(/increasing/);
  });

  it('drops anchors that would break monotonicity', () => {
    // two beats inside the same output frame — the second anchor must be skipped
    const sr = 100;
    const { pairs } = buildTimeMap([0.1, 0.105, 1.0, 2.0], 120, sr, 3);
    for (let i = 1; i < pairs.length; i++) {
      expect(pairs[i][0]).toBeGreaterThan(pairs[i - 1][0]);
      expect(pairs[i][1]).toBeGreaterThan(pairs[i - 1][1]);
    }
  });

  it('moves section markers onto the locked timeline', () => {
    const beats = beatsAt(150, 256, { start: 0.5, endBpm: 152 });
    const plan = planTempoLock({ beats, targetBpm: 132, duration: beats[255] + 4 });
    // a marker on a tracked beat must land on that beat's grid position
    const beatNo = 64;
    const mapped = mapTimeThroughLock(plan, beats[beatNo]);
    expect(mapped - plan.padSeconds).toBeCloseTo(beats[0] / plan.resampleRatio + beatNo * plan.beatSec, 3);
    // the start of the file maps to the pad, and markers stay in order
    expect(mapTimeThroughLock(plan, 0)).toBeCloseTo(plan.padSeconds, 6);
    const secs = lockedSections(plan, [{ label: 'intro', start: 0 }, { label: 'drop', start: beats[64] }, { label: 'outro', start: beats[200] }]);
    expect(secs.map(s => s.label)).toEqual(['intro', 'drop', 'outro']);
    expect(secs[0].start).toBeLessThan(secs[1].start);
    expect(secs[1].start).toBeLessThan(secs[2].start);
    expect(lockedSections(plan, null)).toEqual([]);
  });

  it('formats the map and the readout', () => {
    expect(formatTimeMap([[0, 0], [100, 120]])).toBe('0 0\n100 120\n');
    const plan = planTempoLock({ beats: beatsAt(149.8, 64), targetBpm: 132, duration: 30, key: { key: 'C#', mode: 'minor' } });
    expect(describeLockPlan(plan)).toMatch(/−2 st → B minor/);
    expect(describeLockPlan(null)).toBe('');
  });
});
