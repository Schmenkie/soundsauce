#!/usr/bin/env node
/**
 * Score the sample finder's library index against the Rekordbox ground truth.
 *
 *   node scripts/library-check.mjs
 *
 * Pairs rows in ~/Music/Remix Lab/library.json with scripts/key-truth.json and buckets the
 * key as exact / relative / neighbour / wrong, plus how close the octave-folded BPM is.
 * This measures the whole pipeline — YouTube search, rip, decode, detect — not just
 * detectKey, which is what scripts/key-bench.mjs does on local files.
 *
 * STRICT PAIRING ON PURPOSE.
 *
 * A loose token match reported 42% of keys wrong; nearly all of those were mis-pairings —
 * it had matched "be-free.mp3" to "…The Free Nationals…" on a single shared token.
 * A pair now needs: a token shared with the library TITLE, a token shared with the library
 * ARTIST, and symmetric Jaccard >= 0.5. Conservative — it throws away correct pairs whose
 * truth filename is a bare title ("Pumpin'.mp3") — but what survives is trustworthy.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const libPath = process.argv[2] || path.join(os.homedir(), 'Music', 'Remix Lab', 'library.json');
const lib = JSON.parse(fs.readFileSync(libPath, 'utf8'));
const truth = JSON.parse(fs.readFileSync(path.join(__dirname, 'key-truth.json'), 'utf8')).filter(t => t.key);
const STOP = new Set(['the','feat','ft','and','original','mix','extended','remix','edit','version','prod','radio','club']);
const toks = s => new Set(String(s||'').toLowerCase().replace(/\.(mp3|wav|flac|m4a)$/,'').replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w.length>2 && !STOP.has(w)));
const inter = (a,b)=>[...a].filter(x=>b.has(x)).length;

const num=c=>parseInt(c,10), letter=c=>c.slice(-1);
const bucket=(got,want)=>{ if(got===want) return 'exact';
  if(num(got)===num(want)&&letter(got)!==letter(want)) return 'relative';
  const d=((num(got)-num(want))%12+12)%12;
  if(letter(got)===letter(want)&&(d===1||d===11)) return 'neighbour';
  return 'wrong'; };

const pairs=[];
for (const t of truth) {
  const tt = toks(t.file);
  if (tt.size < 2) continue;
  let best=null, bs=0;
  for (const l of lib.tracks) {
    if (!l.camelot || !l.artist) continue;
    const ta = toks(l.title), aa = toks(l.artist);
    if (inter(ta,tt) < 1 || inter(aa,tt) < 1) continue;
    const all = new Set([...ta,...aa]);
    const j = inter(all,tt) / new Set([...all,...tt]).size;
    if (j > bs) { bs=j; best=l; }
  }
  if (best && bs >= 0.5) pairs.push({ t, l: best, j: bs });
}

console.log(`${pairs.length} confidently-paired rows\n`);
const counts={}; let bpmOk=0, bpmN=0;
for (const {t,l,j} of pairs) {
  const b = bucket(l.camelot, t.key); counts[b]=(counts[b]||0)+1;
  let bpmNote='';
  if (t.bpm) { bpmN++; const ok=Math.abs(l.bpm-t.bpm)<=2; if(ok) bpmOk++; bpmNote = `  bpm ${String(l.bpm).padStart(5)} vs ${String(t.bpm).padStart(6)} ${ok?'ok ':'OFF'}`; }
  console.log(`  ${b.padEnd(9)} want ${t.key.padEnd(3)} got ${l.camelot.padEnd(3)} conf ${String(l.confidence).padStart(3)}${bpmNote}  ${l.artist} — ${l.title.slice(0,34)}${l.durationMismatch?'  [len mismatch]':''}`);
}
const n=pairs.length, pc=k=>`${counts[k]||0} (${Math.round((counts[k]||0)/n*100)}%)`;
console.log(`\nkey: exact ${pc('exact')} · relative ${pc('relative')} · neighbour ${pc('neighbour')} · wrong ${pc('wrong')}`);
const usable=(counts.exact||0)+(counts.relative||0)+(counts.neighbour||0);
console.log(`usable: ${usable}/${n} = ${Math.round(usable/n*100)}%`);
console.log(`bpm within 2 BPM after folding: ${bpmOk}/${bpmN} = ${Math.round(bpmOk/bpmN*100)}%`);
const avg=k=>{const s=pairs.filter(p=>bucket(p.l.camelot,p.t.key)===k); return s.length?Math.round(s.reduce((a,b)=>a+(b.l.confidence||0),0)/s.length):'—';};
console.log(`mean key confidence — exact ${avg('exact')} · relative ${avg('relative')} · neighbour ${avg('neighbour')} · wrong ${avg('wrong')}`);
