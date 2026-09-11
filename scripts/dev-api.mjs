/**
 * Local runner for the Vercel serverless functions in /api.
 *
 * `npm run dev` only serves the Vite frontend; this mounts each api/*.js handler
 * on http://localhost:3001 with a minimal Vercel-compatible req/res shim, and
 * vite.config.js proxies /api/* here in development.
 *
 * Env: loads .env.local then .env.local.vercel (pulled production vars) — the
 * latter is only read here, never bundled.
 *
 *   npm run dev:api          # API only
 *   npm run dev:full         # API + Vite together
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const API_DIR = path.join(ROOT, 'api');
const PORT = Number(process.env.DEV_API_PORT) || 3001;

// --- env -------------------------------------------------------------------
function loadEnvFile(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return 0;
  let count = 0;
  for (const raw of fs.readFileSync(full, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
      count++;
    }
  }
  return count;
}
const loaded = loadEnvFile('.env.local') + loadEnvFile('.env.local.vercel');
console.log(`[dev-api] loaded ${loaded} env vars`);

// --- vercel req/res shim -----------------------------------------------------
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', () => resolve(Buffer.alloc(0)));
  });
}

function decorateRes(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
    return res;
  };
  res.send = (body) => {
    if (typeof body === 'object' && !Buffer.isBuffer(body)) return res.json(body);
    res.end(body);
    return res;
  };
  return res;
}

const handlerCache = new Map();
async function loadHandler(name) {
  const file = path.join(API_DIR, `${name}.js`);
  if (!fs.existsSync(file)) return null;
  // Bust the import cache on every request so edits to api/*.js are picked up
  const stat = fs.statSync(file);
  const key = `${file}:${stat.mtimeMs}`;
  if (!handlerCache.has(key)) {
    const mod = await import(`${pathToFileURL(file).href}?t=${stat.mtimeMs}`);
    handlerCache.set(key, mod);
  }
  return handlerCache.get(key);
}

const server = http.createServer(async (req, res) => {
  decorateRes(res);
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const match = url.pathname.match(/^\/api\/([a-zA-Z0-9_-]+)\/?$/);
  if (!match || match[1].startsWith('_')) {
    return res.status(404).json({ error: 'Not found' });
  }

  const started = Date.now();
  try {
    const mod = await loadHandler(match[1]);
    if (!mod?.default) return res.status(404).json({ error: `No handler for ${match[1]}` });

    req.query = Object.fromEntries(url.searchParams.entries());
    const raw = await readBody(req);
    const contentType = req.headers['content-type'] || '';
    if (raw.length && contentType.includes('application/json')) {
      try { req.body = JSON.parse(raw.toString('utf8')); } catch { req.body = {}; }
    } else if (raw.length) {
      req.body = raw;
    } else {
      req.body = {};
    }

    await mod.default(req, res);
    if (!res.writableEnded) res.end();
  } catch (err) {
    console.error(`[dev-api] ${match[1]} threw:`, err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else res.end();
  } finally {
    console.log(`[dev-api] ${req.method} ${url.pathname} -> ${res.statusCode} (${Date.now() - started}ms)`);
  }
});

server.listen(PORT, () => {
  console.log(`[dev-api] serving /api/* from ${API_DIR} on http://localhost:${PORT}`);
});
