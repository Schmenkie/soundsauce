#!/usr/bin/env node
/**
 * Run the worker's key + tempo detection against a real audio file.
 *
 *   node scripts/key-check.mjs "~/Music/Remix Lab/Sources/Artist - Title.flac" [--seconds 120]
 *
 * Decodes with ffmpeg to mono 44.1k float PCM, then evaluates detectKey()/detectBPM()
 * straight out of src/workers/audio.worker.js (no browser needed). Useful when a track's
 * key comes back wrong — compare against what you hear in Live.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
if (!file) { console.error('usage: node scripts/key-check.mjs <audio file> [--seconds N] [--offset N]'); process.exit(1); }
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? Number(args[i + 1]) : def; };
const seconds = opt('seconds', 0);   // 0 = whole file
const offset = opt('offset', 0);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerSrc = fs.readFileSync(path.join(__dirname, '../src/workers/audio.worker.js'), 'utf8');

// Pull just the function declarations out of the worker module (it has top-level
// self.onmessage wiring we don't want) and expose the ones we need.
const fnBody = workerSrc.slice(0, workerSrc.indexOf('self.onmessage')) +
  '\nreturn { detectKey, detectBPM, computeMagnitudeSpectrum };';
const { detectKey, detectBPM } = new Function('self', fnBody)({ postMessage() {} });

const ffArgs = ['-v', 'error'];
if (offset) ffArgs.push('-ss', String(offset));
ffArgs.push('-i', file.replace(/^~/, process.env.HOME));
if (seconds) ffArgs.push('-t', String(seconds));
ffArgs.push('-ac', '1', '-ar', '44100', '-f', 'f32le', '-');
const pcm = execFileSync('ffmpeg', ffArgs, { maxBuffer: 1024 * 1024 * 1024 });
const samples = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
console.log(`${path.basename(file)} — ${(samples.length / 44100).toFixed(1)}s analysed${offset ? ` from ${offset}s` : ''}`);

const key = detectKey(samples, 44100);
const bpm = detectBPM(samples, 44100);
console.log(`key:  ${key.key} ${key.mode}  (${key.camelot})  confidence ${key.confidence}`);
console.log(`alts: ${key.alternatives.map(a => `${a.key} ${a.mode} ${a.corr}`).join(' · ')}`);
console.log(`bpm:  ${bpm.bpm}  confidence ${bpm.confidence}  (half ${bpm.halfTempo} / double ${bpm.doubleTempo})`);
console.log('chroma:', key.chroma.map(c => `${c.note}:${c.value.toFixed(2)}`).join(' '));
