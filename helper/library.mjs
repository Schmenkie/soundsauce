/**
 * Apple Music library index — the "find me something to sample" half of the helper.
 *
 * Apple Music has no key field and there is no local .musiclibrary on this Mac (the
 * playlists are cloud-only), so the library gives us titles and artists and nothing
 * else: BPM and key have to be computed. That makes this two jobs.
 *
 *  1. SYNC — AppleScript over `osascript` pulls a playlist's rows into
 *     ~/Music/Remix Lab/library.json. Two traps, both found the hard way:
 *       · select a playlist by `persistent ID`, never by name — the emoji-named ones
 *         mis-resolve and you silently get a different playlist's tracks;
 *       · bulk property access (`artist of every track of p`) FAILS on cloud items with
 *         "Can't get artist of {shared track id ...}". Per-track access inside a
 *         `repeat` works and is fast — 2307 tracks in about 25 seconds.
 *
 *  2. ANALYSE — a resumable batch that, per un-analysed row: searches YouTube with
 *     yt-dlp, downloads the audio, decodes it with ffmpeg, runs detectBPM + detectKey
 *     straight out of src/workers/audio.worker.js, writes the numbers back to the index
 *     and DELETES the audio. Nothing is kept on disk and nothing goes near Blob
 *     storage. The index is written after every row, so stopping and restarting picks
 *     up where it left off; a row that fails three times is left alone.
 *
 * Tempos are folded into one octave on the way in (see FOLD_MIN): detectBPM reads a
 * house track at half time about two thirds of the time, and an index full of 63s
 * cannot be matched against a 132 BPM project.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LIBRARY_DIR = process.env.REMIX_LIBRARY_DIR || path.join(os.homedir(), 'Music', 'Remix Lab');
const LIBRARY_FILE = path.join(LIBRARY_DIR, 'library.json');
const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

export const INDEX_VERSION = 1;
/** Tempos live in [FOLD_MIN, FOLD_MIN * 2) — mirrors src/utils/sampleMatch.js. */
export const FOLD_MIN = 90;
/** Give up on a row after this many failed attempts (until it's explicitly retried). */
export const MAX_ATTEMPTS = 3;
/** Anything longer than this is a DJ mix or a live set, not the track. */
const MAX_TRACK_SECONDS = 900;
const ANALYSIS_SAMPLE_RATE = 44100;

const FS = String.fromCharCode(31); // field separator
const RS = String.fromCharCode(30); // record separator

function log(...args) {
  console.log(`[library ${new Date().toLocaleTimeString()}]`, ...args);
}

// ---------------------------------------------------------------------------
// the index on disk
// ---------------------------------------------------------------------------

function emptyIndex() {
  return { version: INDEX_VERSION, updatedAt: null, playlists: [], tracks: [] };
}

export function readIndex() {
  try {
    const parsed = JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf8'));
    return {
      ...emptyIndex(),
      ...parsed,
      playlists: Array.isArray(parsed.playlists) ? parsed.playlists : [],
      tracks: Array.isArray(parsed.tracks) ? parsed.tracks : [],
    };
  } catch {
    return emptyIndex();
  }
}

/** Atomic write — the batch saves after every track, so a crash must not shred the file. */
export function writeIndex(index) {
  fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  const next = { ...index, version: INDEX_VERSION, updatedAt: new Date().toISOString() };
  const tmp = `${LIBRARY_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next));
  fs.renameSync(tmp, LIBRARY_FILE);
  return next;
}

export function libraryFile() {
  return LIBRARY_FILE;
}

/** Fold a tempo into one octave. Mirrors canonicalBpm() in src/utils/sampleMatch.js. */
export function canonicalBpm(bpm, foldMin = FOLD_MIN) {
  const n = Number(bpm);
  if (!Number.isFinite(n) || n <= 0) return null;
  let v = n;
  for (let i = 0; i < 12 && v < foldMin; i++) v *= 2;
  for (let i = 0; i < 12 && v >= foldMin * 2; i++) v /= 2;
  return Math.round(v * 10) / 10;
}

export function indexStats(index) {
  const tracks = index.tracks || [];
  let analysed = 0, failed = 0, pending = 0;
  for (const t of tracks) {
    if (t.bpm && t.camelot) analysed++;
    else if ((t.attempts || 0) >= MAX_ATTEMPTS) failed++;
    else pending++;
  }
  return { total: tracks.length, analysed, failed, pending };
}

// ---------------------------------------------------------------------------
// AppleScript ingest
// ---------------------------------------------------------------------------

function osascript(script, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    execFile('osascript', ['-'], { maxBuffer: 256 * 1024 * 1024, timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) {
        const text = `${stderr || ''}${err.message || ''}`;
        if (/-1743|not authori[sz]ed|not allowed to send/i.test(text)) {
          return reject(new Error('macOS blocked the helper from talking to Music. Allow it under System Settings → Privacy & Security → Automation, then restart the helper.'));
        }
        if (/-1728|Can.t get/i.test(text)) {
          return reject(new Error(`Music couldn't return that playlist: ${text.split('\n')[0]}`));
        }
        return reject(new Error(text.split('\n').filter(Boolean)[0] || 'osascript failed'));
      }
      resolve(stdout);
    }).stdin.end(script);
  });
}

/** Every user playlist with its persistent ID — the only safe way to name one. */
export async function listPlaylists() {
  const script = `
tell application "Music"
  set fs to (character id 31)
  set rs to (character id 30)
  set out to ""
  repeat with p in (every user playlist)
    try
      set out to out & (persistent ID of p) & fs & (name of p) & fs & ((count of tracks of p) as string) & rs
    end try
  end repeat
  return out
end tell`;
  const stdout = await osascript(script, 120000);
  return stdout.split(RS).map(r => r.trim()).filter(Boolean).map(row => {
    const [persistentId, name, count] = row.split(FS);
    return { persistentId, name, count: Number(count) || 0 };
  }).filter(p => p.persistentId);
}

/**
 * One playlist's tracks. Per-track property access inside the repeat loop: bulk access
 * throws on Apple Music cloud items.
 */
export async function fetchPlaylistTracks(persistentId) {
  if (!/^[0-9A-F]{8,20}$/i.test(String(persistentId || ''))) {
    throw new Error('A playlist persistent ID is required');
  }
  const script = `
tell application "Music"
  set p to first user playlist whose persistent ID is "${persistentId}"
  set fs to (character id 31)
  set rs to (character id 30)
  set out to ""
  repeat with t in (every track of p)
    try
      set out to out & (persistent ID of t) & fs & (artist of t) & fs & (name of t) & fs & (album of t) & fs & ((duration of t) as string) & fs & ((played count of t) as string) & fs & ((year of t) as string) & rs
    end try
  end repeat
  return (name of p) & rs & out
end tell`;
  const stdout = await osascript(script, 300000);
  const records = stdout.split(RS);
  const name = (records.shift() || '').trim();
  const tracks = records.map(r => r.replace(/^[\r\n]+/, '')).filter(Boolean).map(row => {
    const [id, artist, title, album, duration, playCount, year] = row.split(FS);
    if (!id || !title) return null;
    return {
      id,
      artist: (artist || '').trim() || null,
      title: title.trim(),
      album: (album || '').trim() || null,
      duration: Number(duration) || null,
      playCount: Number(playCount) || 0,
      year: Number(year) || null,
    };
  }).filter(Boolean);
  return { name, tracks };
}

/**
 * Pull a playlist and merge it into the index. Re-syncing is the single action: rows
 * that are already analysed keep their numbers, new rows arrive pending, and rows that
 * left the playlist lose their membership (but stay in the index — the analysis cost
 * real time, and they may come back).
 */
export async function syncPlaylist(persistentId, onPhase = () => {}) {
  onPhase('reading Music', 5);
  const { name, tracks } = await fetchPlaylistTracks(persistentId);
  onPhase('merging', 70);

  const index = readIndex();
  const byId = new Map(index.tracks.map(t => [t.id, t]));
  const seen = new Set();
  let added = 0, updated = 0;

  for (const row of tracks) {
    seen.add(row.id);
    const existing = byId.get(row.id);
    if (existing) {
      // Metadata from Music wins; anything the batch computed is left alone.
      Object.assign(existing, row, {
        playlistIds: [...new Set([...(existing.playlistIds || []), persistentId])],
      });
      updated++;
    } else {
      const next = { ...row, playlistIds: [persistentId], attempts: 0 };
      index.tracks.push(next);
      byId.set(row.id, next);
      added++;
    }
  }

  let removed = 0;
  for (const t of index.tracks) {
    if (!t.playlistIds?.includes(persistentId) || seen.has(t.id)) continue;
    t.playlistIds = t.playlistIds.filter(p => p !== persistentId);
    removed++;
  }

  const playlists = index.playlists.filter(p => p.persistentId !== persistentId);
  playlists.push({ persistentId, name, count: tracks.length, syncedAt: new Date().toISOString() });
  index.playlists = playlists;

  writeIndex(index);
  onPhase('done', 100);
  log(`synced "${name}": ${tracks.length} tracks (${added} new, ${updated} updated, ${removed} no longer in the playlist)`);
  return { name, persistentId, count: tracks.length, added, updated, removed, stats: indexStats(index) };
}

// ---------------------------------------------------------------------------
// the detectors
// ---------------------------------------------------------------------------

/**
 * Run detectBPM + detectKey in a worker thread (helper/detect-worker.mjs).
 *
 * They are synchronous and take seconds. Called inline they stall the HTTP server for
 * long enough that the Lab's 3-second /health check times out and paste-a-link goes
 * dark halfway through a batch, so they get their own thread. The samples are copied
 * once and the buffer handed over, not cloned.
 */
function detect(samples, sampleRate) {
  const buffer = new Float32Array(samples).buffer;
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'detect-worker.mjs'), {
      workerData: { buffer, sampleRate },
      transferList: [buffer],
    });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(Object.assign(new Error('analysis timed out'), { code: 'TIMEOUT' }));
    }, 180000);
    worker.once('message', (msg) => { clearTimeout(timer); resolve(msg); });
    worker.once('error', (err) => { clearTimeout(timer); reject(err); });
    worker.once('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`analysis worker exited with code ${code}`));
    });
  });
}

// ---------------------------------------------------------------------------
// one track: search -> download -> analyse -> delete
// ---------------------------------------------------------------------------

/** Album-version noise that wrecks a YouTube search. Mix / remix / edit names are kept. */
function searchTitle(title) {
  return String(title || '')
    .replace(/\s*[([](?:remaster(?:ed)?[^)\]]*|deluxe[^)\]]*|bonus track[^)\]]*|explicit[^)\]]*|album version|single version|mono|stereo|from\s+"[^"]*"[^)\]]*)[)\]]/gi, '')
    .replace(/\s*-\s*(?:remaster(?:ed)?|single version|album version)\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim() || String(title || '').trim();
}

export function searchQueryFor(track) {
  return [track.artist, searchTitle(track.title)].filter(Boolean).join(' ').trim();
}

function runStep(cmd, args, { timeoutMs = 240000, maxBuffer = 512 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer, timeout: timeoutMs, encoding: 'buffer' }, (err, stdout, stderr) => {
      if (err) {
        const text = stderr?.toString() || err.message;
        err.detail = text.match(/ERROR:\s*(.+)/)?.[1]?.trim() || text.split('\n').filter(Boolean).pop() || err.message;
        if (err.code === 'ENOENT') err.detail = `${cmd} not found`;
        return reject(err);
      }
      resolve(stdout);
    });
  });
}

/**
 * Analyse one library row. Returns the numbers; the caller writes them to the index.
 * The working directory is removed before returning, whatever happens.
 */
export async function analyseTrack(track, workRoot, { signal } = {}) {
  const query = searchQueryFor(track);
  if (!query) throw Object.assign(new Error('no artist or title to search for'), { code: 'NO_QUERY' });

  const dir = fs.mkdtempSync(path.join(workRoot, 'an-'));
  const started = Date.now();
  try {
    // 1. search + download in one yt-dlp call. No re-encode: we decode it ourselves and
    //    throw it away, so bestaudio as-is is the cheapest thing that works.
    await runStep(YTDLP, [
      '--no-update', '--no-warnings', '--no-playlist', '--no-mtime',
      '-f', 'bestaudio/best',
      '--match-filter', `duration < ${MAX_TRACK_SECONDS}`,
      '--write-info-json',
      '--no-progress',
      '-o', path.join(dir, 'audio.%(ext)s'),
      `ytsearch1:${query}`,
    ], { timeoutMs: 240000 }).catch((err) => {
      throw Object.assign(new Error(err.detail || 'download failed'), { code: 'DOWNLOAD' });
    });
    if (signal?.aborted) throw Object.assign(new Error('stopped'), { code: 'STOPPED' });

    const files = fs.readdirSync(dir);
    const audio = files.find(f => f.startsWith('audio.') && !f.endsWith('.info.json'));
    if (!audio) throw Object.assign(new Error('nothing matched that search'), { code: 'NOT_FOUND' });
    const infoFile = files.find(f => f.endsWith('.info.json'));
    const info = infoFile ? JSON.parse(fs.readFileSync(path.join(dir, infoFile), 'utf8')) : {};

    // 2. decode to mono 44.1k float — the rate the key benchmark was measured at
    const pcm = await runStep(FFMPEG, [
      '-v', 'error', '-i', path.join(dir, audio),
      '-ac', '1', '-ar', String(ANALYSIS_SAMPLE_RATE), '-f', 'f32le', '-',
    ], { timeoutMs: 180000 }).catch((err) => {
      throw Object.assign(new Error(err.detail || 'could not decode the audio'), { code: 'DECODE' });
    });
    const samples = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 4));
    if (samples.length < ANALYSIS_SAMPLE_RATE * 20) {
      throw Object.assign(new Error('audio too short to analyse'), { code: 'SHORT' });
    }

    // 3. the same detectors the Lab runs, on a thread of their own
    const { bpm, key } = await detect(samples, ANALYSIS_SAMPLE_RATE);

    const foundDuration = info.duration ?? samples.length / ANALYSIS_SAMPLE_RATE;
    return {
      bpm: canonicalBpm(bpm.bpm),
      rawBpm: bpm.bpm ?? null,
      bpmConfidence: bpm.confidence ?? null,
      key: key.key || null,
      mode: key.mode || null,
      camelot: key.camelot || null,
      confidence: key.confidence ?? null,
      // A ytsearch1: download reports the search string as webpage_url, which is no use
      // as a link — build the real one from the id.
      sourceUrl: /^ytsearch/.test(info.webpage_url || '')
        ? (info.id ? `https://www.youtube.com/watch?v=${info.id}` : null)
        : (info.webpage_url || null),
      sourceTitle: info.title || null,
      foundDuration: Math.round(foundDuration) || null,
      // Apple says 3:04, YouTube handed us 9:12 -> we analysed the wrong thing. Recorded
      // rather than rejected, so the UI can mark it and Spencer can judge.
      durationMismatch: !!(track.duration && foundDuration
        && Math.abs(foundDuration - track.duration) > Math.max(30, track.duration * 0.25)),
      analysedAt: new Date().toISOString(),
      analysisSeconds: Math.round((Date.now() - started) / 100) / 10,
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// the batch
// ---------------------------------------------------------------------------

const batch = {
  running: false,
  startedAt: null,
  finishedAt: null,
  stopRequested: false,
  concurrency: 2,
  done: 0,
  failed: 0,
  planned: 0,
  current: [],       // what the workers are on right now
  recent: [],        // last few outcomes, for the UI
  error: null,
};

export function analysisState() {
  const stats = indexStats(readIndex());
  const elapsed = batch.startedAt ? (batch.finishedAt || Date.now()) - batch.startedAt : 0;
  const completed = batch.done + batch.failed;
  const perTrack = completed > 0 ? elapsed / completed / 1000 : null;
  const remaining = Math.max(0, batch.planned - completed);
  return {
    running: batch.running,
    stopRequested: batch.stopRequested,
    concurrency: batch.concurrency,
    planned: batch.planned,
    done: batch.done,
    failed: batch.failed,
    progress: batch.planned ? Math.round((completed / batch.planned) * 100) : 0,
    secondsPerTrack: perTrack ? Math.round(perTrack * 10) / 10 : null,
    etaSeconds: perTrack ? Math.round(perTrack * remaining) : null,
    elapsedSeconds: Math.round(elapsed / 1000),
    current: batch.current.slice(),
    recent: batch.recent.slice(0, 12),
    startedAt: batch.startedAt ? new Date(batch.startedAt).toISOString() : null,
    error: batch.error,
    stats,
  };
}

export function stopAnalysis() {
  if (!batch.running) return { running: false };
  batch.stopRequested = true;
  log('stop requested — workers will finish the track they are on');
  return { running: true, stopRequested: true };
}

/** Rows still worth attempting, play count first — the tracks he actually listens to. */
function pendingRows(index, { playlistId, retryFailed, maxAttempts = MAX_ATTEMPTS }) {
  return index.tracks
    .filter(t => !(t.bpm && t.camelot))
    .filter(t => !playlistId || t.playlistIds?.includes(playlistId))
    .filter(t => retryFailed || (t.attempts || 0) < maxAttempts)
    .sort((a, b) => (a.attempts || 0) - (b.attempts || 0) || (b.playCount || 0) - (a.playCount || 0));
}

/**
 * Walk the un-analysed rows. Resumable by construction: there is no queue to lose — it
 * re-reads the index, skips whatever already has numbers, and saves after every row.
 *
 * @param {object} [options]
 * @param {number} [options.concurrency=2]  keep it low: this is one Mac and yt-dlp is
 *                                          the slow part
 * @param {number} [options.limit]          stop after this many rows
 * @param {string} [options.playlistId]     only rows in this playlist
 * @param {boolean} [options.retryFailed]   give the given-up rows another go
 */
export function startAnalysis(options = {}) {
  if (batch.running) return { already: true, ...analysisState() };

  const concurrency = Math.max(1, Math.min(4, Number(options.concurrency) || 2));
  const limit = Number(options.limit) > 0 ? Number(options.limit) : Infinity;
  const { playlistId = null, retryFailed = false } = options;

  const workRoot = path.join(os.tmpdir(), 'remix-lab-library');
  fs.rmSync(workRoot, { recursive: true, force: true });
  fs.mkdirSync(workRoot, { recursive: true });

  const queue = pendingRows(readIndex(), { playlistId, retryFailed });
  if (retryFailed) {
    const index = readIndex();
    for (const row of index.tracks) {
      if (queue.some(q => q.id === row.id)) { row.attempts = 0; row.error = null; }
    }
    writeIndex(index);
  }

  Object.assign(batch, {
    running: true,
    stopRequested: false,
    startedAt: Date.now(),
    finishedAt: null,
    concurrency,
    done: 0,
    failed: 0,
    planned: Math.min(queue.length, limit === Infinity ? queue.length : limit),
    current: [],
    recent: [],
    error: null,
  });
  log(`analysis started: ${batch.planned} rows, concurrency ${concurrency}`);

  let cursor = 0;
  let taken = 0;

  /** Save one row's outcome. Re-reads the index so concurrent workers don't clobber. */
  const commit = (id, patch) => {
    const index = readIndex();
    const row = index.tracks.find(t => t.id === id);
    if (!row) return;
    Object.assign(row, patch);
    writeIndex(index);
  };

  const worker = async (slot) => {
    for (;;) {
      if (batch.stopRequested || taken >= limit || cursor >= queue.length) return;
      const track = queue[cursor++];
      taken++;
      const label = `${track.artist ? `${track.artist} — ` : ''}${track.title}`;
      batch.current[slot] = label;
      try {
        const result = await analyseTrack(track, workRoot, { signal: { aborted: false } });
        commit(track.id, { ...result, attempts: 0, error: null });
        batch.done++;
        batch.recent.unshift({ label, ok: true, bpm: result.bpm, camelot: result.camelot, confidence: result.confidence });
        log(`${label} -> ${result.bpm} BPM ${result.camelot} (conf ${result.confidence}) in ${result.analysisSeconds}s`);
      } catch (err) {
        const attempts = (track.attempts || 0) + 1;
        commit(track.id, { attempts, error: err.message, errorCode: err.code || null, failedAt: new Date().toISOString() });
        batch.failed++;
        batch.recent.unshift({ label, ok: false, error: err.message });
        log(`${label} FAILED (${attempts}/${MAX_ATTEMPTS}): ${err.message}`);
      } finally {
        batch.recent.length = Math.min(batch.recent.length, 40);
        batch.current[slot] = null;
      }
    }
  };

  (async () => {
    try {
      await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i)));
    } catch (err) {
      batch.error = err.message;
      log('analysis crashed:', err.message);
    } finally {
      batch.running = false;
      batch.stopRequested = false;
      batch.finishedAt = Date.now();
      batch.current = [];
      fs.rmSync(workRoot, { recursive: true, force: true });
      log(`analysis finished: ${batch.done} analysed, ${batch.failed} failed`);
    }
  })();

  return analysisState();
}

/**
 * What the matcher page needs — the full index would be most of a megabyte of album
 * names and play counts.
 */
export function matchRows(index = readIndex()) {
  return index.tracks
    .filter(t => t.bpm && t.camelot)
    .map(t => ({
      id: t.id,
      artist: t.artist,
      title: t.title,
      bpm: t.bpm,
      rawBpm: t.rawBpm,
      camelot: t.camelot,
      key: t.key,
      mode: t.mode,
      confidence: t.confidence,
      bpmConfidence: t.bpmConfidence,
      year: t.year,
      playCount: t.playCount,
      duration: t.duration,
      sourceUrl: t.sourceUrl,
      durationMismatch: t.durationMismatch || false,
    }));
}
