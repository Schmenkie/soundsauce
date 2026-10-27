/**
 * Stem file naming + Remix Pack helpers.
 *
 * Every stem that leaves the app is stamped with the track's BPM and key so
 * Ableton's browser can find it by tempo/key later:
 *   "Daft Punk - One More Time - 123bpm - F#m - vocals.flac"
 */

import { barAtTime } from './sections';

/** Separation modes exposed in the UI, in display order. */
export const SEPARATION_MODES = [
  {
    id: 'vocals',
    label: 'Vocals + Instrumental',
    short: 'Vocals',
    description: 'Two-stem split — the remix default',
    stems: ['vocals', 'other'],
  },
  {
    id: 'stems4',
    label: '4 Stems',
    short: '4 stems',
    description: 'Vocals, drums, bass, other',
    stems: ['vocals', 'drums', 'bass', 'other'],
  },
  {
    id: 'stems6',
    label: '6 Stems',
    short: '6 stems',
    description: 'Adds guitar and piano (htdemucs_6s)',
    stems: ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other'],
  },
];

/** Human label for a stem key. In two-stem mode `other` is the instrumental. */
export function getStemLabel(stemType, mode = 'stems4') {
  if (mode === 'vocals' && stemType === 'other') return 'Instrumental';
  const labels = {
    vocals: 'Vocals',
    drums: 'Drums',
    bass: 'Bass',
    guitar: 'Guitar',
    piano: 'Piano',
    other: 'Other',
  };
  return labels[stemType] || stemType;
}

/** Filename-safe stem token (lowercase, no spaces). */
function stemToken(stemType, mode) {
  return getStemLabel(stemType, mode).toLowerCase().replace(/\s+/g, '-');
}

/** Strip characters that are illegal or annoying in filenames across macOS/Windows. */
export function sanitizeForFilename(value) {
  return String(value ?? '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Conventional enharmonic spelling. The detector reports sharps; musicians say Bb, Eb, Ab,
 * Db for those keys (and Eb/Bb minor), while C#, F#, G# minor stay sharp.
 */
const FLAT_SPELLING = {
  major: { 'C#': 'Db', 'D#': 'Eb', 'G#': 'Ab', 'A#': 'Bb' },
  minor: { 'D#': 'Eb', 'A#': 'Bb' },
};
export function displayKeyName(keyInfo) {
  if (!keyInfo?.key) return '';
  const table = FLAT_SPELLING[keyInfo.mode === 'minor' ? 'minor' : 'major'];
  return table[keyInfo.key] || keyInfo.key;
}

/**
 * Short key token for filenames: "Am", "F#", "Bbm".
 * @param {{ key?: string, mode?: string } | null} keyInfo
 */
export function formatKeyToken(keyInfo) {
  if (!keyInfo?.key) return null;
  const suffix = keyInfo.mode === 'minor' ? 'm' : '';
  return `${displayKeyName(keyInfo)}${suffix}`;
}

/**
 * Build a stamped filename for a stem.
 * @param {object} meta
 * @param {string} [meta.artist]
 * @param {string} [meta.title]
 * @param {number} [meta.bpm]
 * @param {{ key: string, mode: string }} [meta.key]
 * @param {string} stemType - 'vocals' | 'drums' | ...
 * @param {string} mode - separation mode id
 * @param {string} [ext='flac']
 */
export function buildStemFilename(meta, stemType, mode, ext = 'flac') {
  const parts = [];
  const artist = sanitizeForFilename(meta?.artist);
  const title = sanitizeForFilename(meta?.title) || 'Untitled';
  if (artist && !/^unknown artist$/i.test(artist)) parts.push(artist);
  parts.push(title);
  if (meta?.bpm) parts.push(`${Math.round(meta.bpm)}bpm`);
  const keyToken = formatKeyToken(meta?.key);
  if (keyToken) parts.push(keyToken);
  parts.push(stemToken(stemType, mode));
  return `${parts.join(' - ')}.${ext}`;
}

/** "Artist - Title" — the folder a track's stems live in under ~/Music/Remix Lab/Stems/ */
export function buildPackFolderName(meta) {
  const artist = sanitizeForFilename(meta?.artist);
  const title = sanitizeForFilename(meta?.title) || 'Untitled';
  return artist && !/^unknown artist$/i.test(artist) ? `${artist} - ${title}` : title;
}

/**
 * Folder for a tempo-locked export. Its own folder, not the track's: the locked stems
 * have a different tempo, key and notes.txt from the originals, and dropping both sets in
 * one folder would overwrite the notes and leave two sets of FLACs you can't tell apart.
 */
export function buildLockedFolderName(meta, targetBpm) {
  return `${buildPackFolderName(meta)} - locked ${Math.round(targetBpm * 100) / 100}`;
}

/** Filename for the Remix Pack zip. */
export function buildPackFilename(meta) {
  return `${buildPackFolderName(meta)} - Remix Pack.zip`;
}

/**
 * Contents of notes.txt inside a Remix Pack — everything you need when you drop
 * the stems into a project.
 */
/**
 * @param {object} meta   { artist, title, bpm, key, … }
 * @param {string[]} stemTypes
 * @param {string} mode
 * @param {{ sections?: { label: string, start: number }[], gridOffset?: number, lock?: object }} [extras]
 *   section labels (intro / breakdown / buildup / drop / outro) with bar numbers, and the
 *   planTempoLock() result when these stems were rendered onto a fixed grid
 */
export function buildPackNotes(meta, stemTypes, mode, extras = {}) {
  const lines = [];
  const artist = meta?.artist && !/^unknown artist$/i.test(meta.artist) ? meta.artist : null;
  lines.push(`${artist ? `${artist} - ` : ''}${meta?.title || 'Untitled'}`);
  lines.push('='.repeat(lines[0].length));
  lines.push('');

  if (meta?.bpm) {
    lines.push(`Tempo: ${Math.round(meta.bpm)} BPM${meta.bpmConfidence != null ? ` (confidence ${Math.round(meta.bpmConfidence * 100)}%)` : ''}`);
    if (meta.halfTempo || meta.doubleTempo) {
      const alts = [meta.halfTempo && `${Math.round(meta.halfTempo)}`, meta.doubleTempo && `${Math.round(meta.doubleTempo)}`].filter(Boolean);
      lines.push(`  Half/double: ${alts.join(' / ')} BPM`);
    }
  }
  if (meta?.key?.key) {
    lines.push(`Key: ${displayKeyName(meta.key)} ${meta.key.mode}${meta.key.camelot ? ` (Camelot ${meta.key.camelot})` : ''}${meta.key.confidence != null ? ` — confidence ${meta.key.confidence}%` : ''}`);
    if (Array.isArray(meta.key.alternatives) && meta.key.alternatives.length) {
      lines.push(`  Also plausible: ${meta.key.alternatives.map(a => `${displayKeyName(a)} ${a.mode}`).join(', ')}`);
    }
    if (Array.isArray(meta.key.compatibleKeys) && meta.key.compatibleKeys.length) {
      lines.push('  Compatible keys:');
      for (const ck of meta.key.compatibleKeys) {
        lines.push(`    ${ck.code}${ck.relation ? ` — ${ck.relation}` : ''}`);
      }
    }
  }
  const lock = extras.lock;
  if (lock) {
    const pct = v => `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(2)}%`;
    lines.push('');
    lines.push('LOCKED TO TEMPO — drop these in with Warp OFF.');
    lines.push(`  Original: ${lock.sourceBpm.toFixed(2)} BPM${lock.sourceRange ? ` (drifting ${lock.sourceRange.min.toFixed(1)}–${lock.sourceRange.max.toFixed(1)})` : ''}${lock.sourceKey?.key ? `, ${displayKeyName(lock.sourceKey)} ${lock.sourceKey.mode}` : ''}`);
    lines.push(`  Now:      ${lock.targetBpm} BPM exactly${lock.resultKey?.key ? `, ${displayKeyName(lock.resultKey)} ${lock.resultKey.mode}${lock.resultKey.camelot ? ` (Camelot ${lock.resultKey.camelot})` : ''}` : ''}`);
    lines.push(`  Pitch:    ${lock.semitones === 0 ? 'unchanged' : `${lock.semitones > 0 ? '+' : '-'}${Math.abs(lock.semitones)} semitone${Math.abs(lock.semitones) === 1 ? '' : 's'} by resampling (no time-stretch artefacts)`}`);
    lines.push(`  Stretch:  ${pct(lock.stretch.min)} to ${pct(lock.stretch.max)} (median ${pct(lock.stretch.median)}) — a plain stretch would have been ${pct(lock.naiveStretchPercent)}`);
    lines.push(`  Bar 1:    at 0:00 — ${lock.padSeconds.toFixed(3)}s of silence was added so the first downbeat lands on a bar line.`);
    lines.push('  Drop every stem at 1|1|1 with Warp off and they are in place.');
  }
  if (Array.isArray(extras.sections) && extras.sections.length) {
    const barSec = meta?.bpm ? 240 / meta.bpm : 0;
    const off = extras.gridOffset || 0;
    lines.push('');
    lines.push('Sections:');
    for (const sec of extras.sections) {
      const m = Math.floor(sec.start / 60), s = Math.floor(sec.start % 60);
      const bar = barSec ? `  bar ${barAtTime(sec.start, barSec, off)}` : '';
      lines.push(`  ${sec.label.padEnd(10)} ${m}:${String(s).padStart(2, '0')}${bar}`);
    }
  }
  lines.push('');
  lines.push('Stems:');
  for (const stemType of stemTypes) {
    lines.push(`  ${buildStemFilename(meta, stemType, mode)}`);
  }
  lines.push('');
  lines.push('Ableton tips:');
  if (lock) {
    lines.push(`  - Set the project to ${lock.targetBpm} BPM, drop all stems at 1|1|1 and turn Warp OFF.`);
    lines.push('  - Warp on would re-stretch audio that is already on the grid. Leave it off.');
    lines.push('  - The unlocked originals are still in the Vault if you want to warp them yourself.');
  } else {
    lines.push('  - Drop all stems onto the arrangement at once; Live warps them to the set tempo.');
    lines.push('  - Vocals: Complex Pro warp mode. Keep pitch/tempo shifts under ~10% for clean results.');
    lines.push('  - Instrumental: Complex or Complex Pro. Beats mode if you only need the transients.');
  }
  lines.push('');
  lines.push(`Separated with SoundSauce Remix Lab (Demucs, ${mode}) on ${new Date().toISOString().slice(0, 10)}`);
  return lines.join('\n');
}
