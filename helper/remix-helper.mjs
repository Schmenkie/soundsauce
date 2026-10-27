#!/usr/bin/env node
/**
 * Remix Lab helper — local companion for pulling audio from YouTube / SoundCloud.
 *
 * Runs on your Mac (localhost:7331) and wraps yt-dlp + ffmpeg so the Lab can
 * "paste a link" (or search by name) and get a lossless FLAC with real metadata.
 * It has to be local: yt-dlp can't run on Vercel and YouTube blocks datacenter IPs.
 *
 *   npm run helper                  # start (or it's included in `npm run dev:full`)
 *   brew install yt-dlp ffmpeg      # prerequisites (rubber-band for "lock to tempo")
 *
 * Endpoints (CORS-restricted to the Lab's origins):
 *   GET  /health            -> { ok, ytdlp, ffmpeg, rubberband, sourcesDir }
 *   POST /resolve {query}   -> { results: [{ url, title, artist, duration, thumbnail, source, isPlaylist }] }
 *                              query = URL (YouTube / SoundCloud / playlist) or free text (searches both)
 *   POST /jobs {url}        -> { id }               start a download + FLAC conversion
 *   GET  /jobs/:id          -> { status, phase, progress, result?, error? }
 *   GET  /files/:id         -> the FLAC (audio/flac)
 *   GET  /files/:id/thumb   -> cover art (image/jpeg)
 *   POST /stems {folder, files:[{name,url}], notes}
 *                           -> { dir, files }     download stems into ~/Music/Remix Lab/Stems/<folder>/
 *   POST /lock {folder, files:[{name,url}], lock, notes}
 *                           -> { id }             same, but resampled + time-mapped onto a fixed grid
 *   GET  /lock/:id          -> { status, phase, progress, result?, error? }
 *   GET  /library           -> { playlists, tracks, stats }   the Apple Music index
 *   GET  /library/playlists -> { playlists }                  live from Music, by persistent ID
 *   POST /library/sync {persistentId}
 *                           -> { id }             pull a playlist into the index
 *   GET  /library/sync/:id  -> { status, phase, progress, result?, error? }
 *   GET  /library/analyse   -> batch state (progress, throughput, ETA, recent outcomes)
 *   POST /library/analyse {concurrency, limit, playlistId, retryFailed}
 *                           -> batch state        resumable BPM + key batch
 *   POST /library/analyse/stop -> { running, stopRequested }
 *
 * Finished files are also copied to ~/Music/Remix Lab/Sources/ (and stems land in
 * ~/Music/Remix Lab/Stems/) so they show up in Live's browser once ~/Music/Remix Lab
 * is added to Places.
 */

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  listPlaylists, syncPlaylist, readIndex, matchRows, indexStats,
  startAnalysis, stopAnalysis, analysisState, libraryFile,
} from './library.mjs';

const VERSION = '0.1.0';
const PORT = Number(process.env.REMIX_HELPER_PORT) || 7331;
const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';
const RUBBERBAND = process.env.RUBBERBAND_PATH || 'rubberband';
const SOURCES_DIR = process.env.REMIX_SOURCES_DIR || path.join(os.homedir(), 'Music', 'Remix Lab', 'Sources');
const STEMS_DIR = process.env.REMIX_STEMS_DIR || path.join(os.homedir(), 'Music', 'Remix Lab', 'Stems');
const WORK_DIR = path.join(os.tmpdir(), 'remix-lab-helper');
const JOB_TTL_MS = 60 * 60 * 1000; // scrub temp files after an hour
const SEARCH_LIMIT = 5;

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'https://soundsauce.app',
  'https://www.soundsauce.app',
]);

fs.mkdirSync(WORK_DIR, { recursive: true });
fs.mkdirSync(SOURCES_DIR, { recursive: true });
fs.mkdirSync(STEMS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// utils
// ---------------------------------------------------------------------------

const jobs = new Map(); // id -> job

function log(...args) {
  console.log(`[helper ${new Date().toLocaleTimeString()}]`, ...args);
}

function run(cmd, args, { timeoutMs = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024, timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) {
        err.stderr = stderr;
        return reject(err);
      }
      resolve({ stdout, stderr });
    });
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function sanitizeForFilename(value) {
  return String(value ?? '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function isUrl(s) {
  try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}

/**
 * Best-effort artist/title split. yt-dlp gives `artist`/`track` for SoundCloud and
 * music-tagged YouTube videos; for plain uploads we split "Artist - Title".
 */
function splitArtistTitle(info) {
  const rawTitle = (info.track || info.title || 'Untitled').trim();
  let artist = info.artist || info.creator || null;
  let title = rawTitle;

  const dash = rawTitle.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (artist) {
    // Platform gave us an artist, but titles are often still "Artist - Title" — and on
    // YouTube the platform artist is frequently "Label, Artist". If the title's prefix
    // shares a real word with the platform artist, trust the title's split.
    if (dash) {
      const words = (str) => new Set(str.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2));
      const prefixWords = words(dash[1]);
      const overlap = [...words(artist)].some(w => prefixWords.has(w));
      if (overlap) {
        artist = dash[1].trim();
        title = dash[2].trim();
      }
    }
  } else if (dash) {
    artist = dash[1].trim();
    title = dash[2].trim();
  } else {
    // YouTube auto-generated music channels are named "Artist - Topic"
    artist = (info.uploader || info.channel || null)?.replace(/\s+-\s+Topic$/i, '') || null;
  }

  // Strip "(Official Video)" style noise but keep mix names
  title = title.replace(/\s*[([](official\s*(music\s*)?video|official\s*audio|lyric\s*video|visuali[sz]er|hd|hq|4k)[)\]]\s*/gi, '').trim() || rawTitle;
  return { artist, title };
}

function sourceOf(info) {
  const key = (info.extractor_key || info.ie_key || info.extractor || '').toLowerCase();
  if (key.startsWith('youtube')) return 'youtube';
  if (key.startsWith('soundcloud')) return 'soundcloud';
  return key || 'unknown';
}

function bestThumbnail(info) {
  if (info.thumbnail) return info.thumbnail;
  const thumbs = Array.isArray(info.thumbnails) ? info.thumbnails : [];
  const sorted = [...thumbs].sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0]?.url || null;
}

function normalizeEntry(info) {
  const { artist, title } = splitArtistTitle(info);
  return {
    url: info.webpage_url || info.url || info.original_url,
    title,
    artist,
    rawTitle: info.title,
    uploader: info.uploader || info.channel || null,
    duration: info.duration ?? null,
    thumbnail: bestThumbnail(info),
    source: sourceOf(info),
    isPlaylist: info._type === 'playlist',
    entryCount: info._type === 'playlist' ? (info.playlist_count ?? info.entries?.length ?? null) : null,
  };
}

async function ytdlpJson(target, extraArgs = []) {
  const { stdout } = await run(YTDLP, ['--no-update', '--no-warnings', '-J', '--no-download', '--flat-playlist', ...extraArgs, target], { timeoutMs: 90000 });
  return JSON.parse(stdout);
}

// ---------------------------------------------------------------------------
// resolve: URL or search text -> candidate list
// ---------------------------------------------------------------------------

/** "https://soundcloud.com/jheneaiko/love-bomb?si=…" → "jheneaiko love bomb" */
function nameFromUrl(u) {
  try {
    const parts = new URL(u).pathname.split('/').filter(Boolean).filter(p => !/^(sets|tracks|watch|playlist)$/i.test(p));
    return parts.slice(-2).join(' ').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  } catch { return ''; }
}

async function resolve(query) {
  const q = String(query || '').trim();
  if (!q) return [];

  if (isUrl(q)) {
    let info;
    try {
      info = await ytdlpJson(q);
    } catch (err) {
      if (!/DRM/i.test(err.stderr || err.message || '')) throw err;
      // Protected stream (major-label SoundCloud upload). Turn the URL slug into a name
      // and search instead — the same track is usually on YouTube unprotected.
      const name = nameFromUrl(q);
      const alternatives = name ? (await resolve(name)).filter(r => r.url.split('?')[0] !== q.split('?')[0]) : [];
      const drmErr = new Error(`SoundCloud serves this one as a protected (DRM) stream — it can't be downloaded from there.${alternatives.length ? ` Here's what else is out there for "${name}":` : ''}`);
      drmErr.code = 'DRM';
      drmErr.alternatives = alternatives;
      throw drmErr;
    }
    if (info._type === 'playlist' && Array.isArray(info.entries)) {
      // Playlist / set / album: return the entries so the Lab can pick or queue
      return info.entries.slice(0, 50).map((e) => normalizeEntry({ ...e, extractor_key: e.ie_key || info.extractor_key }));
    }
    return [normalizeEntry(info)];
  }

  // Free text: search YouTube and SoundCloud in parallel
  const searches = [
    ytdlpJson(`ytsearch${SEARCH_LIMIT}:${q}`).catch(() => null),
    ytdlpJson(`scsearch${SEARCH_LIMIT}:${q}`).catch(() => null),
  ];
  const [yt, sc] = await Promise.all(searches);
  const results = [];
  for (const [res, key] of [[sc, 'Soundcloud'], [yt, 'Youtube']]) {
    for (const e of res?.entries || []) {
      results.push(normalizeEntry({ ...e, extractor_key: e.ie_key || key }));
    }
  }
  // Interleave so both platforms show near the top
  const scList = results.filter(r => r.source === 'soundcloud');
  const ytList = results.filter(r => r.source === 'youtube');
  const merged = [];
  for (let i = 0; i < Math.max(scList.length, ytList.length); i++) {
    if (scList[i]) merged.push(scList[i]);
    if (ytList[i]) merged.push(ytList[i]);
  }
  return merged;
}

// ---------------------------------------------------------------------------
// jobs: download + convert
// ---------------------------------------------------------------------------

function startJob(url) {
  const id = randomUUID();
  const dir = path.join(WORK_DIR, id);
  fs.mkdirSync(dir, { recursive: true });

  const job = {
    id,
    url,
    status: 'running', // running | done | error
    phase: 'starting', // starting | downloading | converting | finishing
    progress: 0,
    createdAt: Date.now(),
    dir,
    result: null,
    error: null,
    log: [],
  };
  jobs.set(id, job);

  const outTemplate = path.join(dir, 'audio.%(ext)s');
  const args = [
    '--no-update',
    '--newline',
    '--no-playlist',
    '--no-mtime',
    '-f', 'bestaudio/best',
    '-x', '--audio-format', 'flac', '--audio-quality', '0',
    '--embed-metadata',
    '--write-info-json',
    '--write-thumbnail', '--convert-thumbnails', 'jpg',
    '-o', outTemplate,
    url,
  ];

  log(`job ${id.slice(0, 8)} start: ${url}`);
  const child = spawn(YTDLP, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderrTail = '';

  const onLine = (line) => {
    if (!line) return;
    job.log.push(line);
    if (job.log.length > 200) job.log.shift();

    const dl = line.match(/^\[download\]\s+([\d.]+)%/);
    if (dl) {
      job.phase = 'downloading';
      // Download is 0-85% of the bar; conversion fills the rest
      job.progress = Math.min(85, Math.round(parseFloat(dl[1]) * 0.85));
      return;
    }
    if (/^\[ExtractAudio\]/.test(line)) {
      job.phase = 'converting';
      job.progress = Math.max(job.progress, 88);
      return;
    }
    if (/^\[(Metadata|ThumbnailsConvertor|EmbedThumbnail)\]/.test(line)) {
      job.phase = 'finishing';
      job.progress = Math.max(job.progress, 94);
    }
  };

  let buf = '';
  child.stdout.on('data', (d) => {
    buf += d.toString();
    const lines = buf.split(/\r?\n/);
    buf = lines.pop();
    lines.forEach(onLine);
  });
  child.stderr.on('data', (d) => {
    const text = d.toString();
    stderrTail = (stderrTail + text).slice(-2000);
    text.split(/\r?\n/).forEach(onLine);
  });

  child.on('error', (err) => {
    job.status = 'error';
    job.error = err.code === 'ENOENT'
      ? `yt-dlp not found. Install it with: brew install yt-dlp ffmpeg`
      : err.message;
    log(`job ${id.slice(0, 8)} spawn error:`, job.error);
  });

  child.on('close', async (code) => {
    if (job.status === 'error') return;
    try {
      if (code !== 0) {
        const friendly = stderrTail.match(/ERROR:\s*(.+)/)?.[1]?.trim();
        if (/DRM/i.test(stderrTail)) {
          // Major-label SoundCloud uploads are served as encrypted streams; yt-dlp (rightly)
          // won't touch them. The same track is usually on YouTube unprotected.
          const err = new Error('SoundCloud serves this one as a protected (DRM) stream — it can\'t be downloaded from there. Try the YouTube version.');
          err.code = 'DRM';
          throw err;
        }
        throw new Error(friendly || `yt-dlp exited with code ${code}`);
      }
      const files = fs.readdirSync(dir);
      const flac = files.find(f => f.endsWith('.flac'));
      if (!flac) throw new Error('No FLAC produced — is ffmpeg installed? (brew install ffmpeg)');
      const infoFile = files.find(f => f.endsWith('.info.json'));
      const info = infoFile ? JSON.parse(fs.readFileSync(path.join(dir, infoFile), 'utf8')) : {};
      const thumb = files.find(f => /\.(jpg|jpeg)$/i.test(f)) || null;

      const { artist, title } = splitArtistTitle(info);
      const stat = fs.statSync(path.join(dir, flac));
      const niceName = `${artist ? `${sanitizeForFilename(artist)} - ` : ''}${sanitizeForFilename(title) || 'Untitled'}.flac`;

      // Copy into the Sources folder for Live's browser (skip if identical name exists)
      const dest = path.join(SOURCES_DIR, niceName);
      try {
        if (!fs.existsSync(dest)) fs.copyFileSync(path.join(dir, flac), dest);
      } catch (copyErr) {
        log('Could not copy to Sources dir:', copyErr.message);
      }

      job.result = {
        fileId: id,
        filename: niceName,
        title,
        artist,
        uploader: info.uploader || info.channel || null,
        duration: info.duration ?? null,
        sourceUrl: info.webpage_url || url,
        source: sourceOf(info),
        size: stat.size,
        hasThumbnail: !!thumb,
        thumbnail: bestThumbnail(info), // remote artwork URL — outlives the helper's temp files
        savedTo: fs.existsSync(dest) ? dest : null,
        _flacPath: path.join(dir, flac),
        _thumbPath: thumb ? path.join(dir, thumb) : null,
      };
      job.phase = 'done';
      job.progress = 100;
      job.status = 'done';
      log(`job ${id.slice(0, 8)} done: ${niceName} (${(stat.size / 1048576).toFixed(1)} MB)`);
    } catch (err) {
      job.status = 'error';
      job.error = err.message;
      job.errorCode = err.code || null;
      log(`job ${id.slice(0, 8)} failed:`, err.message);
    }
  });

  return job;
}

function publicJob(job) {
  const { _flacPath, _thumbPath, ...result } = job.result || {};
  void _flacPath; void _thumbPath;
  return {
    id: job.id,
    status: job.status,
    phase: job.phase,
    progress: job.progress,
    result: job.result ? result : null,
    error: job.error,
    errorCode: job.errorCode || null,
  };
}

// Scrub old jobs + temp dirs
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) {
      fs.rmSync(job.dir, { recursive: true, force: true });
      jobs.delete(id);
    }
  }
}, 5 * 60 * 1000).unref();

// ---------------------------------------------------------------------------
// http
// ---------------------------------------------------------------------------

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Chrome's Private Network Access preflight for https -> localhost
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Max-Age', '600');
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

async function health() {
  let ytdlp = null;
  let ffmpeg = false;
  let rubberband = null;
  try { ytdlp = (await run(YTDLP, ['--version'], { timeoutMs: 10000 })).stdout.trim(); } catch { /* not installed */ }
  try { await run(FFMPEG, ['-version'], { timeoutMs: 10000 }); ffmpeg = true; } catch { /* not installed */ }
  // Only "lock to tempo" needs rubberband, so a missing one doesn't make the helper unhealthy
  // rubberband prints its version on stderr
  try {
    const out = await run(RUBBERBAND, ['--version'], { timeoutMs: 10000 });
    rubberband = (out.stdout.trim() || out.stderr.trim() || 'installed').split('\n')[0];
  } catch { /* optional — only "lock to tempo" needs it */ }
  return { ok: !!ytdlp && ffmpeg, version: VERSION, ytdlp, ffmpeg, rubberband, canLock: !!rubberband && ffmpeg, sourcesDir: SOURCES_DIR, stemsDir: STEMS_DIR };
}

// ---------------------------------------------------------------------------
// stems -> Live's browser
// ---------------------------------------------------------------------------

const STEM_HOSTS = /(^|\.)(public\.blob\.vercel-storage\.com|replicate\.delivery)$/;

/**
 * Download a set of stem URLs (Vercel Blob or Replicate CDN) into
 * ~/Music/Remix Lab/Stems/<folder>/ with the stamped filenames the Lab chose, plus
 * notes.txt. Same content as the Remix Pack zip, minus the zip and the Downloads folder.
 */
async function saveStems({ folder, files, notes }) {
  const dirName = sanitizeForFilename(folder).trim() || 'Untitled';
  const dir = path.join(STEMS_DIR, dirName);
  fs.mkdirSync(dir, { recursive: true });
  const written = [];
  for (const f of files) {
    const name = sanitizeForFilename(f.name).trim();
    let host;
    try { host = new URL(f.url).hostname; } catch { host = ''; }
    if (!name || !STEM_HOSTS.test(host)) throw new Error(`Refusing to fetch ${f.url}`);
    const res = await fetch(f.url);
    if (!res.ok) {
      const err = new Error(res.status === 403 || res.status === 404
        ? `${name}: stem has expired — re-separate the track`
        : `${name}: download failed (${res.status})`);
      throw err;
    }
    const tmp = path.join(dir, `.${name}.part`);
    await fs.promises.writeFile(tmp, Buffer.from(await res.arrayBuffer()));
    fs.renameSync(tmp, path.join(dir, name));
    written.push(name);
    log(`stem saved: ${dirName}/${name}`);
  }
  if (notes) {
    fs.writeFileSync(path.join(dir, 'notes.txt'), notes);
    written.push('notes.txt');
  }
  return { dir, files: written };
}

// ---------------------------------------------------------------------------
// lock to tempo -> Live's browser
// ---------------------------------------------------------------------------

/**
 * Render a stem onto a fixed grid. Three passes, and the order matters:
 *
 *   1. ffmpeg resample (varispeed) — does the whole-semitone part of the tempo move with
 *      no artefacts whatsoever, because it is just playing the record faster or slower.
 *   2. rubberband -3 with a time map — applies only what is left: a couple of percent,
 *      plus the drift of a record cut without a click.
 *   3. ffmpeg: prepend silence so the first downbeat is on a bar line, encode to FLAC.
 *
 * The trap, which fails silently: a time map needs an overall -t/-T/-D as well, and the
 * duration has to match the map's last target frame. If it doesn't, rubberband computes
 * a NaN ratio, warns, and passes the audio through completely unstretched. So -D is
 * derived here from the map itself rather than trusted from the request.
 */
function spawnStep(cmd, args, { onLine, timeoutMs = 30 * 60 * 1000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`${path.basename(cmd)} timed out`)); }, timeoutMs);
    const feed = (d) => {
      const text = d.toString();
      tail = (tail + text).slice(-4000);
      if (onLine) text.split(/[\r\n]+/).forEach(l => l && onLine(l));
    };
    child.stdout.on('data', feed);
    child.stderr.on('data', feed);
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err.code === 'ENOENT'
        ? new Error(`${path.basename(cmd)} not found. Install it with: brew install ${cmd === RUBBERBAND ? 'rubberband' : 'ffmpeg'}`)
        : err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(tail);
      else reject(new Error(tail.split(/\n/).filter(Boolean).pop() || `${path.basename(cmd)} exited with code ${code}`));
    });
  });
}

async function probeSampleRate(file) {
  const { stdout } = await run(FFPROBE, ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate', '-of', 'csv=p=0', file]);
  const rate = Number(stdout.trim().split(/\s+/)[0]);
  if (!(rate > 0)) throw new Error(`Could not read the sample rate of ${path.basename(file)}`);
  return rate;
}

/** Reject anything that would make rubberband misbehave, before we spend minutes on it. */
function validateLock(lock) {
  const sampleRate = Number(lock?.sampleRate);
  const resampleRate = Number(lock?.resampleRate);
  const map = lock?.timeMap;
  if (!(sampleRate > 0) || !(resampleRate > 0)) throw new Error('lock.sampleRate and lock.resampleRate are required');
  if (!Array.isArray(map) || map.length < 2) throw new Error('lock.timeMap needs at least two anchors');
  let prevSrc = 0, prevTgt = 0;
  for (const pair of map) {
    const s = Number(pair?.[0]), t = Number(pair?.[1]);
    if (!Number.isFinite(s) || !Number.isFinite(t) || s <= prevSrc || t <= prevTgt) {
      throw new Error('lock.timeMap must be strictly increasing in both columns');
    }
    prevSrc = s; prevTgt = t;
  }
  return {
    sampleRate,
    resampleRate,
    ratio: resampleRate / sampleRate,
    padFrames: Math.max(0, Math.round(Number(lock.padFrames) || 0)),
    map,
    // -D comes from the map, never from the caller: if they disagree, rubberband silently
    // does nothing at all.
    outputDuration: prevTgt / sampleRate,
  };
}

async function lockOneStem({ url, name, dir, workDir, lock, mapFile, onPhase }) {
  let host;
  try { host = new URL(url).hostname; } catch { host = ''; }
  if (!name || !STEM_HOSTS.test(host)) throw new Error(`Refusing to fetch ${url}`);

  onPhase('fetching', 0);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(res.status === 403 || res.status === 404
      ? `${name}: stem has expired — re-separate the track`
      : `${name}: download failed (${res.status})`);
  }
  const srcFile = path.join(workDir, 'source');
  await fs.promises.writeFile(srcFile, Buffer.from(await res.arrayBuffer()));

  // 1. varispeed: asetrate reinterprets the rate, aresample puts it back on the grid rate
  onPhase('resampling', 0);
  const inRate = await probeSampleRate(srcFile);
  const pitchedFile = path.join(workDir, 'pitched.wav');
  await spawnStep(FFMPEG, [
    '-v', 'error', '-i', srcFile,
    '-af', `asetrate=${Math.round(inRate * lock.ratio)},aresample=${lock.sampleRate}:filter_size=128`,
    '-c:a', 'pcm_s24le', '-y', pitchedFile,
  ]);

  // 2. the remainder + the drift, as a time map
  onPhase('stretching', 0);
  const lockedFile = path.join(workDir, 'locked.wav');
  await spawnStep(RUBBERBAND, [
    '-3',                                   // R3 engine — slower, much cleaner
    '-D', String(lock.outputDuration),      // must agree with the map's last target frame
    '-M', mapFile,
    pitchedFile, lockedFile,
  ], {
    onLine: (line) => {
      const m = line.match(/(\d{1,3})%\s*$/);
      if (m) onPhase('stretching', Math.min(99, Number(m[1])));
    },
  });

  // 3. pad to a bar line and encode
  onPhase('encoding', 0);
  const outTmp = path.join(workDir, 'out.flac');
  const encodeArgs = ['-v', 'error', '-i', lockedFile];
  if (lock.padFrames > 0) encodeArgs.push('-af', `adelay=${lock.padFrames}S:all=1`);
  encodeArgs.push('-c:a', 'flac', '-y', outTmp);
  await spawnStep(FFMPEG, encodeArgs);

  const dest = path.join(dir, name);
  await fs.promises.rename(outTmp, dest).catch(async () => {
    await fs.promises.copyFile(outTmp, dest);
    fs.rmSync(outTmp, { force: true });
  });
  for (const f of [srcFile, pitchedFile, lockedFile]) fs.rmSync(f, { force: true });
  return name;
}

/**
 * Lock a set of stems to a tempo and write them into ~/Music/Remix Lab/Stems/<folder>/.
 * Runs as a job: R3 is about 10x realtime, so four stems of a four-minute track is minutes.
 */
function startLockJob({ folder, files, lock, notes }) {
  const validated = validateLock(lock);
  const id = randomUUID();
  const workDir = path.join(WORK_DIR, id);
  fs.mkdirSync(workDir, { recursive: true });

  const dirName = sanitizeForFilename(folder).trim() || 'Untitled';
  const dir = path.join(STEMS_DIR, dirName);
  fs.mkdirSync(dir, { recursive: true });

  const mapFile = path.join(workDir, 'timemap.txt');
  fs.writeFileSync(mapFile, validated.map.map(([s, t]) => `${Math.round(s)} ${Math.round(t)}`).join('\n') + '\n');

  const job = {
    id,
    status: 'running',
    phase: 'starting',
    progress: 0,
    createdAt: Date.now(),
    dir: workDir,
    result: null,
    error: null,
    log: [],
  };
  jobs.set(id, job);

  (async () => {
    const written = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const name = sanitizeForFilename(files[i].name).trim();
        job.phase = `${name} (${i + 1}/${files.length})`;
        const base = (i / files.length) * 100;
        const span = 100 / files.length;
        written.push(await lockOneStem({
          url: files[i].url,
          name,
          dir,
          workDir,
          lock: validated,
          mapFile,
          // fetch 10% / resample 15% / stretch 70% / encode 5% of each file's slice
          onPhase: (stage, pct) => {
            const offsets = { fetching: 0, resampling: 0.1, stretching: 0.25, encoding: 0.95 };
            const widths = { fetching: 0.1, resampling: 0.15, stretching: 0.7, encoding: 0.05 };
            job.progress = Math.round(base + span * (offsets[stage] + widths[stage] * (pct / 100)));
          },
        }));
        log(`locked: ${dirName}/${name}`);
      }
      if (notes) {
        fs.writeFileSync(path.join(dir, 'notes.txt'), notes);
        written.push('notes.txt');
      }
      job.status = 'done';
      job.progress = 100;
      job.phase = 'done';
      job.result = { dir, files: written };
    } catch (err) {
      job.status = 'error';
      job.error = err.message;
      log(`lock job ${id.slice(0, 8)} failed:`, err.message);
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
      fs.mkdirSync(workDir, { recursive: true }); // the TTL scrubber expects job.dir to exist
    }
  })();

  return job;
}

// ---------------------------------------------------------------------------
// library: Apple Music ingest
// ---------------------------------------------------------------------------

/** AppleScript takes ~25s for 2300 tracks, so the sync runs as a job like the others. */
function startSyncJob(persistentId) {
  const id = randomUUID();
  const dir = path.join(WORK_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  const job = {
    id,
    status: 'running',
    phase: 'starting',
    progress: 0,
    createdAt: Date.now(),
    dir,
    result: null,
    error: null,
    log: [],
  };
  jobs.set(id, job);

  syncPlaylist(persistentId, (phase, progress) => {
    job.phase = phase;
    job.progress = progress;
  }).then((result) => {
    job.result = result;
    job.status = 'done';
    job.phase = 'done';
    job.progress = 100;
  }).catch((err) => {
    job.status = 'error';
    job.error = err.message;
    log(`library sync failed: ${err.message}`);
  });

  return job;
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;

  try {
    if (req.method === 'GET' && p === '/health') {
      return json(res, 200, await health());
    }

    if (req.method === 'POST' && p === '/resolve') {
      const { query } = await readBody(req);
      if (!query) return json(res, 400, { error: 'query required' });
      try {
        const results = await resolve(query);
        return json(res, 200, { results });
      } catch (err) {
        if (err.code !== 'DRM') throw err;
        return json(res, 200, { results: err.alternatives || [], notice: err.message, code: 'DRM' });
      }
    }

    if (req.method === 'POST' && p === '/jobs') {
      const { url: target } = await readBody(req);
      if (!target || !isUrl(target)) return json(res, 400, { error: 'A YouTube or SoundCloud URL is required' });
      const job = startJob(target);
      return json(res, 202, { id: job.id });
    }

    if (req.method === 'POST' && p === '/lock') {
      const body = await readBody(req);
      if (!body.folder || !Array.isArray(body.files) || body.files.length === 0) {
        return json(res, 400, { error: 'folder and files[] required' });
      }
      const h = await health();
      if (!h.rubberband) return json(res, 503, { error: 'rubberband is not installed — run: brew install rubberband' });
      let job;
      try { job = startLockJob(body); }
      catch (err) { return json(res, 400, { error: err.message }); }
      return json(res, 202, { id: job.id });
    }

    if (req.method === 'POST' && p === '/stems') {
      const body = await readBody(req);
      if (!body.folder || !Array.isArray(body.files) || body.files.length === 0) {
        return json(res, 400, { error: 'folder and files[] required' });
      }
      return json(res, 200, await saveStems(body));
    }

    if (req.method === 'GET' && p === '/library') {
      const index = readIndex();
      return json(res, 200, {
        playlists: index.playlists,
        updatedAt: index.updatedAt,
        tracks: matchRows(index),
        stats: indexStats(index),
        file: libraryFile(),
      });
    }

    if (req.method === 'GET' && p === '/library/playlists') {
      return json(res, 200, { playlists: await listPlaylists() });
    }

    if (req.method === 'POST' && p === '/library/sync') {
      const { persistentId } = await readBody(req);
      if (!persistentId) return json(res, 400, { error: 'persistentId required' });
      const job = startSyncJob(persistentId);
      return json(res, 202, { id: job.id });
    }

    if (req.method === 'GET' && p === '/library/analyse') {
      return json(res, 200, analysisState());
    }

    if (req.method === 'POST' && p === '/library/analyse') {
      const body = await readBody(req);
      return json(res, 202, startAnalysis(body));
    }

    if (req.method === 'POST' && p === '/library/analyse/stop') {
      return json(res, 200, stopAnalysis());
    }

    let m = p.match(/^\/library\/sync\/([0-9a-f-]{36})$/);
    if (req.method === 'GET' && m) {
      const job = jobs.get(m[1]);
      if (!job) return json(res, 404, { error: 'Job not found' });
      return json(res, 200, { status: job.status, phase: job.phase, progress: job.progress, result: job.result, error: job.error });
    }

    m = p.match(/^\/lock\/([0-9a-f-]{36})$/);
    if (req.method === 'GET' && m) {
      const job = jobs.get(m[1]);
      if (!job) return json(res, 404, { error: 'Job not found' });
      return json(res, 200, { status: job.status, phase: job.phase, progress: job.progress, result: job.result, error: job.error });
    }

    m = p.match(/^\/jobs\/([0-9a-f-]{36})$/);
    if (req.method === 'GET' && m) {
      const job = jobs.get(m[1]);
      if (!job) return json(res, 404, { error: 'Job not found' });
      return json(res, 200, publicJob(job));
    }

    m = p.match(/^\/files\/([0-9a-f-]{36})(\/thumb)?$/);
    if (req.method === 'GET' && m) {
      const job = jobs.get(m[1]);
      if (!job?.result) return json(res, 404, { error: 'File not ready' });
      const filePath = m[2] ? job.result._thumbPath : job.result._flacPath;
      if (!filePath || !fs.existsSync(filePath)) return json(res, 404, { error: 'Not found' });
      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': m[2] ? 'image/jpeg' : 'audio/flac',
        'Content-Length': stat.size,
        'Content-Disposition': m[2] ? 'inline' : `attachment; filename*=UTF-8''${encodeURIComponent(job.result.filename)}`,
        'Cache-Control': 'no-store',
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    json(res, 404, { error: 'Not found' });
  } catch (err) {
    const friendly = err.stderr?.match(/ERROR:\s*(.+)/)?.[1]?.trim();
    log('request error:', friendly || err.message);
    json(res, 500, { error: friendly || err.message });
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  const h = await health();
  log(`Remix Lab helper v${VERSION} on http://localhost:${PORT}`);
  log(`yt-dlp: ${h.ytdlp || 'MISSING'} · ffmpeg: ${h.ffmpeg ? 'ok' : 'MISSING'} · rubberband: ${h.rubberband || 'missing (no tempo lock)'}`);
  log(`sources folder: ${SOURCES_DIR}`);
  log(`stems folder:   ${STEMS_DIR}`);
  if (!h.ok) log('Install prerequisites: brew install yt-dlp ffmpeg');
});
