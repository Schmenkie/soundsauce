/**
 * Tempo lock — the arithmetic behind "export these stems already on the grid".
 *
 * A record cut without a click drifts (the one that started this: 149.3–152.6 BPM over
 * four minutes) and an acapella has too few transients for Live's Auto-Warp to find the
 * grid at all. So we beat-track the full mix, then bend the audio onto a perfect grid:
 *
 *   1. Split the tempo change into a constant part and a variable part.
 *   2. Do the constant part by RESAMPLING to a whole number of semitones — varispeed,
 *      no artefacts at all, and it lands the track in a named key.
 *   3. Apply only the small remainder plus the drift as a time map, so a 150 → 132
 *      move stretches by 0.2–3% instead of 12%.
 *
 * Everything here is pure: beats in, a render plan out. The helper on the Mac turns the
 * plan into files (ffmpeg resample → rubberband time map → FLAC).
 */

import { NOTE_NAMES, noteIndex, camelotOf } from './remixMath';

/** Furthest the auto chooser will move the pitch to get close to the target tempo. */
export const MAX_LOCK_SEMITONES = 6;

/** Below this many tracked beats there is nothing to fit a grid to. */
export const MIN_LOCK_BEATS = 8;

/** Median of an array of numbers (does not mutate the input). */
function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Inter-beat intervals in seconds. */
function intervals(beats) {
  const out = [];
  for (let i = 1; i < beats.length; i++) out.push(beats[i] - beats[i - 1]);
  return out;
}

/** Tempo implied by a beat list, from the median inter-beat interval. */
export function bpmFromBeats(beats) {
  const ibi = median(intervals(beats));
  return ibi > 0 ? 60 / ibi : 0;
}

/** Local tempo range across a beat list — how much the record drifts. */
export function tempoRangeOf(beats) {
  const ibi = intervals(beats).filter(d => d > 0);
  if (!ibi.length) return { min: 0, max: 0 };
  const bpms = ibi.map(d => 60 / d).sort((a, b) => a - b);
  return { min: bpms[0], max: bpms[bpms.length - 1] };
}

/**
 * Whole-semitone resample that gets closest to the target tempo.
 * Resampling by 2^(n/12) multiplies both pitch and tempo by the same factor, so this is
 * the one move that is free of artefacts — it just costs n semitones of pitch.
 *
 * @param {number} sourceBpm
 * @param {number} targetBpm
 * @param {number} [maxSemitones=MAX_LOCK_SEMITONES]
 * @returns {number} integer semitones (negative = pitched down)
 */
export function bestResampleSemitones(sourceBpm, targetBpm, maxSemitones = MAX_LOCK_SEMITONES) {
  if (!(sourceBpm > 0) || !(targetBpm > 0)) return 0;
  const ideal = 12 * Math.log2(targetBpm / sourceBpm);
  const limit = Math.max(0, Math.round(maxSemitones));
  return Math.max(-limit, Math.min(limit, Math.round(ideal)));
}

/** Key after resampling by `semitones` (same mode, pitch class moved). */
export function transposedKey(keyInfo, semitones) {
  const i = noteIndex(keyInfo?.key);
  if (i < 0) return null;
  const key = NOTE_NAMES[(((i + semitones) % 12) + 12) % 12];
  const mode = keyInfo.mode === 'minor' ? 'minor' : 'major';
  return { key, mode, camelot: camelotOf({ key, mode }) };
}

/**
 * Build the time map: (sourceFrame, targetFrame) pairs that rubberband reads with -M.
 *
 * Source frames are positions in the *resampled* file; target frames are positions in the
 * locked output. Beat k is pinned to `firstBeat + k × 60/targetBpm`, so the grid is exact
 * and the stretch applied between any two beats is only the local drift.
 *
 * @param {number[]} resampledBeats beat times (s) in the resampled file
 * @param {number} targetBpm
 * @param {number} sampleRate
 * @param {number} resampledDuration length (s) of the resampled file
 * @returns {{ pairs: [number, number][], outputFrames: number, sourceFrames: number }}
 */
export function buildTimeMap(resampledBeats, targetBpm, sampleRate, resampledDuration) {
  const beatOut = 60 / targetBpm;
  const sourceFrames = Math.round(resampledDuration * sampleRate);
  const firstBeat = resampledBeats[0];
  // No explicit (0,0) anchor: rubberband's implicit start is already (0,0), and adding it
  // makes a zero-length first segment whose ratio is 0/0 — it prints a NaN warning and
  // falls back to the default ratio. Leaving it out gives the lead-in a clean 1:1.
  const pairs = [];
  const push = (src, tgt) => {
    const [prevSrc, prevTgt] = pairs.length ? pairs[pairs.length - 1] : [0, 0];
    // rubberband needs both columns strictly increasing — a drop of a frame or two can
    // collapse one at extreme local tempos, so skip rather than emit a bad anchor.
    if (src > prevSrc && tgt > prevTgt && src < sourceFrames) pairs.push([src, tgt]);
  };
  for (let k = 0; k < resampledBeats.length; k++) {
    push(Math.round(resampledBeats[k] * sampleRate), Math.round((firstBeat + k * beatOut) * sampleRate));
  }

  // Tail past the last beat: carry on at the stretch the final beat was given, so the
  // outro is not suddenly at a different speed from the rest of the track.
  const n = resampledBeats.length;
  const lastGap = resampledBeats[n - 1] - resampledBeats[n - 2];
  const lastRatio = lastGap > 0 ? beatOut / lastGap : 1;
  const tail = Math.max(0, resampledDuration - resampledBeats[n - 1]);
  const endTarget = Math.round((firstBeat + (n - 1) * beatOut + tail * lastRatio) * sampleRate);
  const [lastSrc, lastTgt] = pairs.length ? pairs[pairs.length - 1] : [0, 0];
  if (sourceFrames > lastSrc && endTarget > lastTgt) pairs.push([sourceFrames, endTarget]);
  if (!pairs.length) throw new Error('Could not build a usable time map from these beats');

  return { pairs, outputFrames: pairs[pairs.length - 1][1], sourceFrames };
}

/**
 * Plan a tempo lock.
 *
 * @param {object} args
 * @param {number[]} args.beats       beat times (s) in the original audio, ascending
 * @param {number} args.targetBpm     the project tempo to land on
 * @param {number} args.duration      length of the original audio in seconds
 * @param {number} [args.sampleRate=44100] rate the render (and so the time map) runs at
 * @param {{key:string,mode:string}|null} [args.key] detected key, for the resulting-key readout
 * @param {number} [args.downbeatIndex=0] which tracked beat is a downbeat (0–3)
 * @param {number|null} [args.semitones] force a resample instead of choosing one (0 = keep pitch)
 * @param {number} [args.maxSemitones=MAX_LOCK_SEMITONES]
 * @returns {object} the render plan (see below), or throws if the beats are unusable
 */
export function planTempoLock({
  beats,
  targetBpm,
  duration,
  sampleRate = 44100,
  key = null,
  downbeatIndex = 0,
  semitones = null,
  maxSemitones = MAX_LOCK_SEMITONES,
}) {
  if (!Array.isArray(beats) || beats.length < MIN_LOCK_BEATS) {
    throw new Error(`Need at least ${MIN_LOCK_BEATS} tracked beats to lock the tempo`);
  }
  if (!(targetBpm > 0) || !(duration > 0) || !(sampleRate > 0)) {
    throw new Error('Target tempo, duration and sample rate must all be positive');
  }
  for (let i = 1; i < beats.length; i++) {
    if (!(beats[i] > beats[i - 1])) throw new Error('Beat times must be strictly increasing');
  }

  const sourceBpm = bpmFromBeats(beats);
  const sourceRange = tempoRangeOf(beats);
  const semis = semitones == null ? bestResampleSemitones(sourceBpm, targetBpm, maxSemitones) : Math.round(semitones);
  const resampleRatio = Math.pow(2, semis / 12);

  // ffmpeg's asetrate takes an integer, so the ratio we actually get is quantised. Use the
  // quantised one everywhere downstream or the map and the audio disagree by a few frames.
  const resampleRate = Math.round(sampleRate * resampleRatio);
  const actualRatio = resampleRate / sampleRate;

  const resampledBeats = beats.map(t => t / actualRatio);
  const resampledDuration = duration / actualRatio;
  const { pairs, outputFrames, sourceFrames } = buildTimeMap(resampledBeats, targetBpm, sampleRate, resampledDuration);

  // What rubberband is actually asked to do, beat by beat, as a tempo change in percent —
  // the same units Live's warp shows, and the same units as naiveStretchPercent.
  const beatOut = 60 / targetBpm;
  const changes = intervals(resampledBeats)
    .filter(d => d > 0)
    .map(d => (d / beatOut - 1) * 100)
    .sort((a, b) => a - b);
  const stretch = {
    min: changes[0],
    median: median(changes),
    max: changes[changes.length - 1],
  };

  // Silence to prepend so the first downbeat sits on a bar line — drop the file at 1|1|1
  // in Live with Warp off and it is in place.
  const barSec = beatOut * 4;
  const firstDownbeat = resampledBeats[0] + Math.max(0, Math.round(downbeatIndex)) * beatOut;
  const padSeconds = (barSec - (firstDownbeat % barSec)) % barSec;

  return {
    sourceBpm,
    sourceRange,
    targetBpm,
    semitones: semis,
    resampleRatio: actualRatio,
    resampleRate,
    sampleRate,
    resampledDuration,
    sourceKey: key ? { key: key.key, mode: key.mode, camelot: camelotOf(key) } : null,
    resultKey: transposedKey(key, semis),
    stretch,
    /** What a plain stretch with no resample would have cost, for the readout. */
    naiveStretchPercent: (targetBpm / sourceBpm - 1) * 100,
    timeMap: pairs,
    outputFrames,
    sourceFrames,
    outputDuration: outputFrames / sampleRate,
    padSeconds,
    padFrames: Math.round(padSeconds * sampleRate),
    barOneAt: 0,
    beatSec: beatOut,
    barSec,
    beatCount: beats.length,
  };
}

/**
 * Where a moment in the original audio ends up in the locked file — resample, then
 * linear interpolation through the time map, then the silence added at the front.
 * Used to move the section markers onto the new timeline for notes.txt.
 * @param {object} plan a planTempoLock() result
 * @param {number} seconds a time in the original audio
 * @returns {number} the same moment in the rendered file
 */
export function mapTimeThroughLock(plan, seconds) {
  const srcFrame = (seconds / plan.resampleRatio) * plan.sampleRate;
  const map = plan.timeMap;
  if (srcFrame <= 0) return plan.padSeconds;
  let i = 0;
  while (i < map.length && map[i][0] < srcFrame) i++;
  const [aSrc, aTgt] = i === 0 ? [0, 0] : map[i - 1];
  const [bSrc, bTgt] = i < map.length ? map[i] : map[map.length - 1];
  const span = bSrc - aSrc;
  const f = span > 0 ? (srcFrame - aSrc) / span : 0;
  return plan.padSeconds + (aTgt + f * (bTgt - aTgt)) / plan.sampleRate;
}

/** Section markers moved onto the locked timeline, in order. */
export function lockedSections(plan, sections) {
  if (!Array.isArray(sections)) return [];
  return sections.map(s => ({ ...s, start: Math.round(mapTimeThroughLock(plan, s.start) * 1000) / 1000 }));
}

/** The time map as rubberband's -M file wants it: "sourceFrame targetFrame" per line. */
export function formatTimeMap(pairs) {
  return pairs.map(([s, t]) => `${s} ${t}`).join('\n') + '\n';
}

/** One-line summary of a plan for buttons and toasts: "−2 st → B minor · +0.2…+3.0%". */
export function describeLockPlan(plan) {
  if (!plan) return '';
  const semi = plan.semitones === 0
    ? 'no pitch change'
    : `${plan.semitones > 0 ? '+' : '−'}${Math.abs(plan.semitones)} st`;
  const keyPart = plan.resultKey ? ` → ${plan.resultKey.key} ${plan.resultKey.mode}` : '';
  const fmt = v => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}%`;
  return `${semi}${keyPart} · stretch ${fmt(plan.stretch.min)}…${fmt(plan.stretch.max)}`;
}
