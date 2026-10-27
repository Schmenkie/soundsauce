import { zipSync, strToU8 } from 'fflate';
import { buildStemFilename, buildPackFilename, buildPackNotes, buildPackFolderName, buildLockedFolderName } from './stemFiles';
import { lockedSections } from './tempoLock';
import { helperSaveStems, helperStartLock, helperLockJob } from '../lib/helper';
import { upload } from '@vercel/blob/client';
import { labAuthHeaders } from '../lib/labAuth';

const MIME_TYPES = { mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', m4a: 'audio/mp4' };

/** File extension of a URL path, defaulting to flac. */
export function extFromUrl(url, fallback = 'flac') {
  try {
    const ext = new URL(url).pathname.split('.').pop()?.toLowerCase();
    return ext && ext.length <= 4 ? ext : fallback;
  } catch {
    return fallback;
  }
}

export function mimeForExt(ext) {
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/** Trigger a browser download of a Blob with a given filename. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Build the Remix Pack zip: every stem (stamped filename) + notes.txt. Stored with no
 * compression — FLAC is already compressed.
 * @param {Record<string, { buffer: ArrayBuffer, ext: string }>} stems - keyed by stem type
 * @param {object} meta - { artist, title, bpm, key, ... } (see buildPackNotes)
 * @param {string} mode - separation mode id
 * @param {{ sections?: object[], gridOffset?: number }} [extras] - section labels for notes.txt
 * @returns {Blob}
 */
export function buildRemixPackBlob(stems, meta, mode, extras) {
  const stemTypes = Object.keys(stems);
  const entries = {};
  for (const stemType of stemTypes) {
    entries[buildStemFilename(meta, stemType, mode, stems[stemType].ext)] = new Uint8Array(stems[stemType].buffer);
  }
  entries['notes.txt'] = strToU8(buildPackNotes(meta, stemTypes, mode, extras));
  return new Blob([zipSync(entries, { level: 0 })], { type: 'application/zip' });
}

/**
 * Fetch every stem URL, zip, and save. Used by the Vault where nothing is cached locally.
 * @param {Record<string, string>} stemUrls - keyed by stem type
 * @param {(loadedCount:number, total:number) => void} [onProgress]
 */
export async function downloadRemixPackFromUrls(stemUrls, meta, mode, onProgress, extras) {
  const types = Object.keys(stemUrls).filter(k => stemUrls[k]);
  const stems = {};
  let done = 0;
  for (const type of types) {
    const res = await fetch(stemUrls[type]);
    if (!res.ok) {
      const err = new Error(res.status === 403 || res.status === 404 ? 'A stem has expired — re-separate the track.' : `Failed to fetch ${type} stem`);
      err.code = res.status === 403 || res.status === 404 ? 'EXPIRED' : 'FETCH';
      throw err;
    }
    stems[type] = { buffer: await res.arrayBuffer(), ext: extFromUrl(stemUrls[type]) };
    done++;
    onProgress?.(done, types.length);
  }
  saveBlob(buildRemixPackBlob(stems, meta, mode, extras), buildPackFilename(meta));
}

/**
 * Send the stems to the local helper, which writes them into ~/Music/Remix Lab/Stems/
 * <Artist - Title>/ with stamped names + notes.txt — i.e. straight into Live's browser.
 * @param {Record<string, string>} stemUrls - keyed by stem type (Blob or Replicate URLs)
 * @param {{ sections?: object[], gridOffset?: number }} [extras] - section labels for notes.txt
 * @returns {Promise<{ dir: string, files: string[] }>}
 */
export function saveStemsToLive(stemUrls, meta, mode, extras) {
  const types = Object.keys(stemUrls).filter(k => stemUrls[k]);
  return helperSaveStems({
    folder: buildPackFolderName(meta),
    files: types.map(type => ({ name: buildStemFilename(meta, type, mode, extFromUrl(stemUrls[type])), url: stemUrls[type] })),
    notes: buildPackNotes(meta, types, mode, extras),
  });
}

/**
 * Same as saveStemsToLive, but the helper renders each stem onto a fixed grid first:
 * resample by whole semitones, then time-map the remainder plus the record's drift. The
 * files land in Live's browser already on the grid, so they go in with Warp off.
 *
 * @param {Record<string, string>} stemUrls keyed by stem type
 * @param {object} meta stamped-filename metadata (BPM/key should already be the locked ones)
 * @param {string} mode separation mode id
 * @param {object} plan a planTempoLock() result
 * @param {{ sections?: object[], gridOffset?: number }} [extras] for notes.txt
 * @param {(progress:number, phase:string) => void} [onProgress]
 * @returns {Promise<{ dir: string, files: string[] }>}
 */
export async function lockStemsToLive(stemUrls, meta, mode, plan, extras = {}, onProgress) {
  const types = Object.keys(stemUrls).filter(k => stemUrls[k]);
  // The files that come out are at the target tempo and in the shifted key — stamp them
  // that way, and move the section markers onto the new timeline (bar 1 is now 0:00).
  // The detector's confidence and half/double readings belong to the original tempo —
  // this one is exact, so drop them rather than repeat them against the new number.
  const lockedMeta = {
    ...meta,
    bpm: plan.targetBpm,
    key: plan.resultKey || meta.key,
    bpmConfidence: null,
    halfTempo: null,
    doubleTempo: null,
  };
  const { id } = await helperStartLock({
    folder: buildLockedFolderName(meta, plan.targetBpm),
    files: types.map(type => ({ name: buildStemFilename(lockedMeta, type, mode, 'flac'), url: stemUrls[type] })),
    lock: {
      sampleRate: plan.sampleRate,
      resampleRate: plan.resampleRate,
      padFrames: plan.padFrames,
      timeMap: plan.timeMap,
    },
    notes: buildPackNotes(lockedMeta, types, mode, {
      sections: lockedSections(plan, extras.sections),
      gridOffset: 0,
      lock: plan,
    }),
  });

  for (;;) {
    await new Promise(r => setTimeout(r, 1000));
    const state = await helperLockJob(id);
    onProgress?.(state.progress || 0, state.phase || '');
    if (state.status === 'error') throw new Error(state.error || 'Tempo lock failed');
    if (state.status === 'done') return state.result;
  }
}

/**
 * Re-host a stem on Vercel Blob so it outlives Replicate's ~7-day CDN (the Vault's "keep").
 * Same layout as useStemSeparation.keepStem: stems/<title>/<stamped name>.
 * @returns {Promise<{ url: string, size: number }>}
 */
export async function keepStemUrl(url, stemType, meta, mode) {
  if (/\.public\.blob\.vercel-storage\.com/.test(url)) return { url, size: undefined };
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(res.status === 403 || res.status === 404 ? 'This stem has expired — re-separate the track.' : 'Failed to fetch stem');
    err.code = res.status === 403 || res.status === 404 ? 'EXPIRED' : 'FETCH';
    throw err;
  }
  const buffer = await res.arrayBuffer();
  const ext = extFromUrl(url);
  const filename = buildStemFilename(meta, stemType, mode, ext);
  const folder = (meta?.title || 'untitled').replace(/[\\/:*?"<>|]/g, '').trim() || 'untitled';
  const file = new File([buffer], filename, { type: mimeForExt(ext) });
  const result = await upload(`stems/${folder}/${filename}`, file, { access: 'public', handleUploadUrl: '/api/upload-audio', headers: labAuthHeaders() });
  if (!result?.url) throw new Error('Upload returned no URL');
  return { url: result.url, size: buffer.byteLength };
}

/** Fetch one stem URL and save it with a stamped filename. */
export async function downloadStemFromUrl(url, stemType, meta, mode) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status === 403 || res.status === 404 ? 'This stem has expired — re-separate the track.' : 'Failed to fetch stem');
  const ext = extFromUrl(url);
  saveBlob(new Blob([await res.arrayBuffer()], { type: mimeForExt(ext) }), buildStemFilename(meta, stemType, mode, ext));
}
