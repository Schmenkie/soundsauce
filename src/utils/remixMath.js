/**
 * Remix Calculator math — the arithmetic you do every time a vocal goes into a project.
 *
 * Everything here is pure and unit-tested. Keys are { key: 'A#', mode: 'minor' } using
 * the detector's sharp spelling; use displayKeyName() (stemFiles.js) for display.
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

export function noteIndex(note) {
  if (!note) return -1;
  const norm = FLAT_TO_SHARP[note] || note;
  return NOTE_NAMES.indexOf(norm);
}

// Camelot wheel: index by pitch class
const CAMELOT_MAJOR = ['8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B'];
const CAMELOT_MINOR = ['5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A'];

export function camelotOf(keyInfo) {
  const i = noteIndex(keyInfo?.key);
  if (i < 0) return null;
  return keyInfo.mode === 'minor' ? CAMELOT_MINOR[i] : CAMELOT_MAJOR[i];
}

export function keyFromCamelot(code) {
  const i = CAMELOT_MAJOR.indexOf(code);
  if (i >= 0) return { key: NOTE_NAMES[i], mode: 'major' };
  const j = CAMELOT_MINOR.indexOf(code);
  if (j >= 0) return { key: NOTE_NAMES[j], mode: 'minor' };
  return null;
}

/** Relative key: A minor <-> C major. */
export function relativeKey(keyInfo) {
  const i = noteIndex(keyInfo?.key);
  if (i < 0) return null;
  return keyInfo.mode === 'minor'
    ? { key: NOTE_NAMES[(i + 3) % 12], mode: 'major' }
    : { key: NOTE_NAMES[(i + 9) % 12], mode: 'minor' };
}

/** Wrap a semitone delta into [-6, +6] (prefer the shorter direction; ties go up). */
export function shortestShift(delta) {
  let d = ((delta % 12) + 12) % 12;
  if (d > 6) d -= 12;
  return d;
}

/**
 * Semitones to transpose `source` so it sits in `target`.
 *
 * When modes differ we compare against the target's relative key — a Bb-minor vocal over
 * a Db-major project needs 0 semitones, because those are the same seven notes. `exact`
 * is the tonic-to-tonic shift ignoring mode, in case the vocal should land on the tonic.
 */
export function transposeSemitones(source, target) {
  const s = noteIndex(source?.key);
  const t = noteIndex(target?.key);
  if (s < 0 || t < 0) return null;
  const sameMode = (source.mode || 'major') === (target.mode || 'major');
  const targetInSourceMode = sameMode ? target : relativeKey(target);
  const semitones = shortestShift(noteIndex(targetInSourceMode.key) - s);
  return {
    semitones,
    exact: shortestShift(t - s),
    sameMode,
    viaRelative: !sameMode,
    effectiveTarget: targetInSourceMode,
  };
}

/** Camelot relation between two keys, for a one-word label. */
export function camelotRelation(source, target) {
  const a = camelotOf(source);
  const b = camelotOf(target);
  if (!a || !b) return null;
  if (a === b) return 'same key';
  const na = parseInt(a), nb = parseInt(b);
  const la = a.slice(-1), lb = b.slice(-1);
  const diff = ((nb - na) % 12 + 12) % 12;
  if (la === lb && (diff === 1 || diff === 11)) return diff === 1 ? '+1 on the wheel' : '-1 on the wheel';
  if (na === nb && la !== lb) return 'relative';
  if (la === lb && (diff === 2 || diff === 10)) return '±2 — mostly works';
  return 'not harmonic — needs transposing';
}

/**
 * Tempo change from `from` to `to` BPM. Also reports whether a half- or double-time
 * reading of the source gets closer, which is often the right answer for 70 vs 140.
 */
export function tempoChange(from, to) {
  if (!from || !to) return null;
  const options = [
    { label: 'straight', ratio: to / from },
    { label: 'half-time', ratio: to / (from / 2) },
    { label: 'double-time', ratio: to / (from * 2) },
  ].map(o => ({ ...o, percent: (o.ratio - 1) * 100 }));
  const best = options.reduce((a, b) => (Math.abs(b.percent) < Math.abs(a.percent) ? b : a));
  return { straight: options[0], best, options };
}

/** Semitones a Re-Pitch warp would move the audio for a given tempo ratio. */
export function repitchSemitones(ratio) {
  if (!ratio || ratio <= 0) return 0;
  return 12 * Math.log2(ratio);
}

/**
 * Warp-mode advice for Ableton Live 12 given a tempo change (percent) on vocal material.
 */
export function warpAdvice(percent, material = 'vocals') {
  const p = Math.abs(percent || 0);
  if (p < 0.5) return { mode: 'Complex Pro', note: 'No real stretch — warp markers only.' };
  if (p <= 5) return { mode: 'Complex Pro', note: 'Clean. Formants stay natural.' };
  if (p <= 10) return { mode: 'Complex Pro', note: 'Fine for most vocals; check sibilants and long notes.' };
  if (p <= 18) return { mode: 'Complex Pro', note: material === 'vocals' ? 'Audible stretch. Turn Formants down or use Re-Pitch and re-tune with the transpose knob.' : 'Audible stretch — consider Beats mode for drums.' };
  return { mode: 'Re-Pitch', note: 'Too far to stretch cleanly. Re-Pitch it (pitch follows tempo) then transpose back, or use a half/double-time reading.' };
}

/**
 * Compatible target keys for a source key with how many semitones each needs.
 * Ordered: 0-shift options first (same key, relative), then Camelot neighbours.
 */
export function compatibleTargets(source) {
  const code = camelotOf(source);
  if (!code) return [];
  const n = parseInt(code), l = code.slice(-1);
  const wrap = (x) => ((x - 1 + 12) % 12) + 1;
  const codes = [
    { code, relation: 'same key' },
    { code: `${n}${l === 'A' ? 'B' : 'A'}`, relation: 'relative' },
    { code: `${wrap(n + 1)}${l}`, relation: '+1 on the wheel' },
    { code: `${wrap(n - 1)}${l}`, relation: '-1 on the wheel' },
  ];
  return codes.map(({ code: c, relation }) => {
    const key = keyFromCamelot(c);
    const shift = transposeSemitones(source, key);
    return { camelot: c, key, relation, semitones: shift?.semitones ?? 0 };
  });
}
