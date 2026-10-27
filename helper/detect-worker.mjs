/**
 * detectBPM + detectKey off the helper's main thread.
 *
 * Both are synchronous and chew through a few seconds of CPU on a four-minute track.
 * Run inline, they stall the HTTP server long enough that /health times out and the Lab
 * decides the helper has gone away mid-batch. In a worker thread the event loop stays
 * free and paste-a-link keeps working while the library is being analysed.
 *
 * The worker source is evaluated the same way scripts/key-check.mjs does it — which is
 * why src/workers/audio.worker.js must stay free of `import`s.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parentPort, workerData } from 'node:worker_threads';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'workers', 'audio.worker.js'), 'utf8');
const body = `${src.slice(0, src.indexOf('self.onmessage'))}\nreturn { detectKey, detectBPM };`;
const { detectKey, detectBPM } = new Function('self', body)({ postMessage() {} });

const { buffer, sampleRate } = workerData;
const samples = new Float32Array(buffer);
parentPort.postMessage({
  bpm: detectBPM(samples, sampleRate),
  key: detectKey(samples, sampleRate),
});
