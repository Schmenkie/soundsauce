/**
 * "Find me something to sample" — the ranking behind /sample.
 *
 * Given a target (your project's BPM + key) and rows from the Apple Music library index,
 * work out which tracks are harmonically and rhythmically close enough to lift a vocal
 * from. Pure and unit-tested (sampleMatch.test.js); no library needed to exercise it.
 *
 * Two things earned their own module rather than living in the page:
 *
 *  1. BPM canonicalisation. detectBPM reads a house track at half time about two thirds
 *     of the time (128 -> 63, 148 -> 73 — measured on the 11 tracks that overlap
 *     scripts/key-truth.json). Comparing those to a 132 project is worthless, so every
 *     tempo is folded into one octave before anything is compared.
 *  2. The "shift my track" variant. Spencer moves the project key regularly, so a track
 *     that is not Camelot-compatible as-is but sits two semitones away is still a
 *     candidate — it just comes with a number attached.
 */

import { camelotOf, keyFromCamelot, transposeSemitones, tempoChange } from './remixMath';
import { compatibleCamelot, tempoCompatible } from '../lib/vault';

/** Tempos are folded into [FOLD_MIN, FOLD_MIN * 2). 90 keeps 128/132/140 where they are. */
export const FOLD_MIN = 90;

/**
 * Fold a tempo into a single octave so a half-time reading compares against a real one.
 *
 * detectBPM is the reason this exists: it reports 63 for a 128 BPM track often enough
 * that an un-folded index can't be matched at all.
 *
 * @param {number|null|undefined} bpm
 * @param {number} [foldMin=FOLD_MIN]
 * @returns {number|null} the folded tempo, or null if there wasn't one
 */
export function canonicalBpm(bpm, foldMin = FOLD_MIN) {
  const n = Number(bpm);
  if (!Number.isFinite(n) || n <= 0) return null;
  let v = n;
  // Guard the loops: a 0.001 BPM reading shouldn't spin forever.
  for (let i = 0; i < 12 && v < foldMin; i++) v *= 2;
  for (let i = 0; i < 12 && v >= foldMin * 2; i++) v /= 2;
  return Math.round(v * 10) / 10;
}

/**
 * Smallest tempo move from `from` to `to`, as a percentage, considering half- and
 * double-time readings. Both sides are folded first.
 *
 * @returns {{ percent: number, reading: string, from: number, to: number }|null}
 */
export function tempoDelta(from, to) {
  const a = canonicalBpm(from);
  const b = canonicalBpm(to);
  if (a == null || b == null) return null;
  const change = tempoChange(a, b);
  if (!change) return null;
  return { percent: change.best.percent, reading: change.best.label, from: a, to: b };
}

/** The Camelot relation names, in the order compatibleCamelot() returns them. */
export const RELATIONS = ['same key', '+1 on the wheel', '-1 on the wheel', 'relative'];

/**
 * Where `camelot` sits relative to `targetCamelot` on the harmonic-mixing set.
 * @returns {{ relation: string, rank: number }|null} null when they don't mix
 */
export function keyRelation(camelot, targetCamelot) {
  const set = compatibleCamelot(targetCamelot);
  const rank = set.indexOf(String(camelot || '').trim().toUpperCase());
  return rank < 0 ? null : { relation: RELATIONS[rank], rank };
}

/** A track is usable here only once it has both numbers. */
export function isAnalysed(track) {
  return !!(track && track.bpm && (track.camelot || track.key?.camelot));
}

function camelotFromRow(track) {
  const code = track.camelot || track.key?.camelot;
  return code ? String(code).trim().toUpperCase() : null;
}

/**
 * Rank library rows against a target.
 *
 * Buckets, in the order they're returned:
 *   'drop-in'  tempo fits and the key already mixes — nothing to do
 *   'shift'    tempo fits, key doesn't, but moving your project by N semitones fixes it
 *
 * `semitones` is how far to move YOUR project so the track lands in key, which is the
 * direction Spencer actually works in.
 *
 * @param {object[]} tracks  library rows: { artist, title, bpm, camelot, confidence, ... }
 * @param {object} target    { bpm, key, mode }
 * @param {object} [options]
 * @param {number} [options.tolerancePct=0.08]   tempo tolerance, as a fraction
 * @param {number} [options.maxSemitones=2]      how far you'll move the project
 * @param {number} [options.limit]               cap the result length
 * @returns {object[]} ranked rows with { bucket, relation, rank, percent, semitones, lowConfidence }
 */
export function rankSamples(tracks, target, options = {}) {
  const { tolerancePct = 0.08, maxSemitones = 2, limit } = options;
  const targetCamelot = target?.camelot || camelotOf(target);
  const targetBpm = canonicalBpm(target?.bpm);
  if (!targetCamelot || targetBpm == null) return [];
  const targetKey = keyFromCamelot(targetCamelot);

  const scored = [];
  for (const track of tracks || []) {
    if (!isAnalysed(track)) continue;
    const camelot = camelotFromRow(track);
    const bpm = canonicalBpm(track.bpm);
    if (!camelot || bpm == null) continue;

    const delta = tempoDelta(bpm, targetBpm);
    if (!delta) continue;
    if (!tempoCompatible(bpm, targetBpm, tolerancePct)) continue;

    const rel = keyRelation(camelot, targetCamelot);
    const trackKey = keyFromCamelot(camelot);
    // How far to move the project so it meets the track. transposeSemitones returns an
    // object, not a number.
    const shift = targetKey && trackKey ? transposeSemitones(targetKey, trackKey) : null;
    const semitones = shift?.semitones ?? null;

    if (!rel && (semitones == null || semitones === 0 || Math.abs(semitones) > maxSemitones)) continue;

    const confidence = track.confidence ?? track.key?.confidence ?? null;
    scored.push({
      ...track,
      camelot,
      bpm,
      rawBpm: track.bpm,
      bucket: rel ? 'drop-in' : 'shift',
      relation: rel?.relation || null,
      rank: rel?.rank ?? null,
      percent: delta.percent,
      reading: delta.reading,
      semitones,
      confidence,
      // The header chip's rule: under 60 the key gets a "~" rather than being hidden.
      lowConfidence: confidence != null && confidence < 60,
    });
  }

  scored.sort((a, b) => {
    if (a.bucket !== b.bucket) return a.bucket === 'drop-in' ? -1 : 1;
    if (a.bucket === 'drop-in') {
      if (a.rank !== b.rank) return a.rank - b.rank;
    } else {
      const sa = Math.abs(a.semitones), sb = Math.abs(b.semitones);
      if (sa !== sb) return sa - sb;
    }
    const pa = Math.abs(a.percent), pb = Math.abs(b.percent);
    if (pa !== pb) return pa - pb;
    return String(a.title || '').localeCompare(String(b.title || ''));
  });

  return limit ? scored.slice(0, limit) : scored;
}

/** "+2.1%" / "-0.8%" / "0%" */
export function formatPercent(percent) {
  if (percent == null || Number.isNaN(percent)) return '—';
  if (Math.abs(percent) < 0.05) return '0%';
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
}

/** "+2 st" / "-1 st" */
export function formatSemitones(semitones) {
  if (semitones == null) return '—';
  return `${semitones > 0 ? '+' : ''}${semitones} st`;
}

/** The search text that takes a library row into the Lab's import box. */
export function searchQueryFor(track) {
  return [track?.artist, track?.title].filter(Boolean).join(' ').trim();
}
