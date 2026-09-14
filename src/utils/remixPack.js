import { zipSync, strToU8 } from 'fflate';
import { buildStemFilename, buildPackFilename, buildPackNotes, buildPackFolderName } from './stemFiles';
import { helperSaveStems } from '../lib/helper';

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
 * @returns {Blob}
 */
export function buildRemixPackBlob(stems, meta, mode) {
  const stemTypes = Object.keys(stems);
  const entries = {};
  for (const stemType of stemTypes) {
    entries[buildStemFilename(meta, stemType, mode, stems[stemType].ext)] = new Uint8Array(stems[stemType].buffer);
  }
  entries['notes.txt'] = strToU8(buildPackNotes(meta, stemTypes, mode));
  return new Blob([zipSync(entries, { level: 0 })], { type: 'application/zip' });
}

/**
 * Fetch every stem URL, zip, and save. Used by the Vault where nothing is cached locally.
 * @param {Record<string, string>} stemUrls - keyed by stem type
 * @param {(loadedCount:number, total:number) => void} [onProgress]
 */
export async function downloadRemixPackFromUrls(stemUrls, meta, mode, onProgress) {
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
  saveBlob(buildRemixPackBlob(stems, meta, mode), buildPackFilename(meta));
}

/**
 * Send the stems to the local helper, which writes them into ~/Music/Remix Lab/Stems/
 * <Artist - Title>/ with stamped names + notes.txt — i.e. straight into Live's browser.
 * @param {Record<string, string>} stemUrls - keyed by stem type (Blob or Replicate URLs)
 * @returns {Promise<{ dir: string, files: string[] }>}
 */
export function saveStemsToLive(stemUrls, meta, mode) {
  const types = Object.keys(stemUrls).filter(k => stemUrls[k]);
  return helperSaveStems({
    folder: buildPackFolderName(meta),
    files: types.map(type => ({ name: buildStemFilename(meta, type, mode, extFromUrl(stemUrls[type])), url: stemUrls[type] })),
    notes: buildPackNotes(meta, types, mode),
  });
}

/** Fetch one stem URL and save it with a stamped filename. */
export async function downloadStemFromUrl(url, stemType, meta, mode) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status === 403 || res.status === 404 ? 'This stem has expired — re-separate the track.' : 'Failed to fetch stem');
  const ext = extFromUrl(url);
  saveBlob(new Blob([await res.arrayBuffer()], { type: mimeForExt(ext) }), buildStemFilename(meta, stemType, mode, ext));
}
