/**
 * Stem file naming + Remix Pack helpers.
 *
 * Every stem that leaves the app is stamped with the track's BPM and key so
 * Ableton's browser can find it by tempo/key later:
 *   "Daft Punk - One More Time - 123bpm - F#m - vocals.flac"
 */

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
 * Short key token for filenames: "Am", "F#", "Bbm".
 * @param {{ key?: string, mode?: string } | null} keyInfo
 */
export function formatKeyToken(keyInfo) {
  if (!keyInfo?.key) return null;
  const suffix = keyInfo.mode === 'minor' ? 'm' : '';
  return `${keyInfo.key}${suffix}`;
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

/** Filename for the Remix Pack zip. */
export function buildPackFilename(meta) {
  const artist = sanitizeForFilename(meta?.artist);
  const title = sanitizeForFilename(meta?.title) || 'Untitled';
  const base = artist && !/^unknown artist$/i.test(artist) ? `${artist} - ${title}` : title;
  return `${base} - Remix Pack.zip`;
}

/**
 * Contents of notes.txt inside a Remix Pack — everything you need when you drop
 * the stems into a project.
 */
export function buildPackNotes(meta, stemTypes, mode) {
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
    lines.push(`Key: ${meta.key.key} ${meta.key.mode}${meta.key.camelot ? ` (Camelot ${meta.key.camelot})` : ''}`);
    if (Array.isArray(meta.key.compatibleKeys) && meta.key.compatibleKeys.length) {
      lines.push('  Compatible keys:');
      for (const ck of meta.key.compatibleKeys) {
        lines.push(`    ${ck.code}${ck.relation ? ` — ${ck.relation}` : ''}`);
      }
    }
  }
  lines.push('');
  lines.push('Stems:');
  for (const stemType of stemTypes) {
    lines.push(`  ${buildStemFilename(meta, stemType, mode)}`);
  }
  lines.push('');
  lines.push('Ableton tips:');
  lines.push('  - Drop all stems onto the arrangement at once; Live warps them to the set tempo.');
  lines.push('  - Vocals: Complex Pro warp mode. Keep pitch/tempo shifts under ~10% for clean results.');
  lines.push('  - Instrumental: Complex or Complex Pro. Beats mode if you only need the transients.');
  lines.push('');
  lines.push(`Separated with SoundSauce Remix Lab (Demucs, ${mode}) on ${new Date().toISOString().slice(0, 10)}`);
  return lines.join('\n');
}
