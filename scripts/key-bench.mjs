#!/usr/bin/env node
/**
 * Score the worker's detectKey() against a ground-truth list.
 *
 *   node scripts/key-bench.mjs [--dir "~/Desktop/Mixing Mersic"] [--truth scripts/key-truth.json]
 *                              [--seconds 0] [--jobs 4] [--params '{"bassBoost":1.6}'] [--verbose] [--out results.json]
 *
 * key-truth.json is [{ file, key }] where key is a Camelot code ("3A") as Rekordbox reports it
 * (scripts/key-truth.json was pulled from the Rekordbox 6 database via pyrekordbox). Each track is
 * decoded with ffmpeg to mono 44.1k, run through detectKey(), and bucketed as exact / relative
 * (same Camelot number, other letter) / neighbour (±1 on the wheel) / wrong. Relative and
 * neighbour matches still transpose cleanly for a remix, so the headline figure is "usable".
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const dir = opt('dir', '~/Desktop/Mixing Mersic').replace(/^~/, os.homedir());
const truthPath = opt('truth', 'scripts/key-truth.json');
const seconds = Number(opt('seconds', 0));
const jobs = Number(opt('jobs', 4));
const params = JSON.parse(opt('params', '{}'));
const verbose = args.includes('--verbose');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerSrc = fs.readFileSync(path.join(__dirname, '../src/workers/audio.worker.js'), 'utf8');
const fnBody = workerSrc.slice(0, workerSrc.indexOf('self.onmessage')) + '\nreturn { detectKey };';
const { detectKey } = new Function('self', fnBody)({ postMessage() {} });

const truth = JSON.parse(fs.readFileSync(truthPath, 'utf8'))
  .filter(t => t.key && fs.existsSync(path.join(dir, t.file)));

function decode(file) {
  return new Promise((resolve, reject) => {
    const ffArgs = ['-v', 'error', '-i', file];
    if (seconds) ffArgs.push('-t', String(seconds));
    ffArgs.push('-ac', '1', '-ar', '44100', '-f', 'f32le', '-');
    execFile('ffmpeg', ffArgs, { encoding: 'buffer', maxBuffer: 1024 * 1024 * 1024 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(new Float32Array(stdout.buffer, stdout.byteOffset, stdout.byteLength / 4));
    });
  });
}

const camelotNum = c => parseInt(c, 10);
const camelotLetter = c => c.slice(-1);
function bucket(got, want) {
  if (got === want) return 'exact';
  const n = camelotNum(got), m = camelotNum(want);
  if (n === m) return 'relative';
  const diff = Math.min((n - m + 12) % 12, (m - n + 12) % 12);
  if (diff === 1 && camelotLetter(got) === camelotLetter(want)) return 'neighbour';
  return 'wrong';
}

const results = [];
let next = 0;
async function runOne() {
  while (next < truth.length) {
    const t = truth[next++];
    try {
      const pcm = await decode(path.join(dir, t.file));
      const r = detectKey(pcm, 44100, params);
      const got = r ? r.camelot : '--';
      const b = r ? bucket(got, t.key) : 'wrong';
      results.push({ file: t.file, want: t.key, got, mode: r?.mode, key: r?.key, conf: r?.confidence, bucket: b, alts: r?.alternatives, chroma: r?.chroma.map(c => c.value), bass: r?.bassChroma, windows: r?.windows });
      if (verbose || b === 'wrong') {
        const alts = (r?.alternatives || []).map(a => `${a.key}${a.mode === 'minor' ? 'm' : ''}`).join('/');
        console.log(`${b.padEnd(9)} want ${t.key.padEnd(3)} got ${got.padEnd(3)} ${String(r?.key ?? '').padEnd(2)} ${String(r?.mode ?? '').padEnd(5)} conf ${String(r?.confidence ?? '').padStart(3)}  alts ${alts.padEnd(14)} ${t.file}`);
      }
    } catch (e) {
      console.error(`decode failed: ${t.file}: ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: jobs }, runOne));

const count = k => results.filter(r => r.bucket === k).length;
const n = results.length;
const pct = k => `${(100 * count(k) / n).toFixed(1)}%`;
const usable = count('exact') + count('relative') + count('neighbour');
console.log(`\n${n} tracks · exact ${count('exact')} (${pct('exact')}) · relative ${count('relative')} · neighbour ${count('neighbour')} · wrong ${count('wrong')} (${pct('wrong')}) · usable ${(100 * usable / n).toFixed(1)}%`);
const avgConf = k => { const s = results.filter(r => r.bucket === k); return s.length ? (s.reduce((a, r) => a + (r.conf || 0), 0) / s.length).toFixed(0) : '-'; };
console.log(`mean confidence — exact ${avgConf('exact')} · relative ${avgConf('relative')} · neighbour ${avgConf('neighbour')} · wrong ${avgConf('wrong')}`);
if (opt('out')) fs.writeFileSync(opt('out'), JSON.stringify(results, null, 1));
