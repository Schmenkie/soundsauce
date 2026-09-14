import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { getStemLabel, displayKeyName } from '../../utils/stemFiles';
import { stemColor, SPECTRUM_STOPS } from '../../utils/spectrum';

const CELL_H = 14;
const CELL_GAP = 1;
const BAND_LABELS = ['sub', 'low', 'mid', 'high', 'air'];

/**
 * TrackAnatomy — the "understand the original" study guide, built from the stems the
 * Stem Player already decoded. Three questions a remixer asks:
 *   1. where does each stem play? → structure grid (one cell per bar) + section changes
 *   2. what's the progression?     → chord per bar from the instrumental, root per bar from the bass,
 *                                    boiled down to the most common 4-bar loop
 *   3. what is each stem made of?  → band balance, loudness, drum density
 *
 * Analysis runs in the worker (ANALYZE_STEM_ANATOMY) once per stem set.
 */
export function TrackAnatomy({ player, stemTypes, mode, bpm, keyInfo, analyzeStemAnatomy, theme, formatTime }) {
  const isDark = theme === 'dark';
  const [results, setResults] = useState(null); // { [stemType]: anatomy }
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const gridRef = useRef(null);
  const [width, setWidth] = useState(0);
  const signature = stemTypes.join(',');
  const { status, getBuffer } = player;

  // Run once the buffers are there; re-run if the stem set or tempo changes
  useEffect(() => {
    if (status !== 'ready' || !analyzeStemAnatomy) return;
    let cancelled = false;
    (async () => {
      setResults(null);
      setError(null);
      const out = {};
      try {
        for (let i = 0; i < stemTypes.length; i++) {
          const type = stemTypes[i];
          const buffer = getBuffer(type);
          if (!buffer) continue;
          setProgress(`${getStemLabel(type, mode).toLowerCase()} (${i + 1}/${stemTypes.length})`);
          const mono = new Float32Array(buffer.length);
          for (let c = 0; c < buffer.numberOfChannels; c++) {
            const data = buffer.getChannelData(c);
            for (let s = 0; s < mono.length; s++) mono[s] += data[s] / buffer.numberOfChannels;
          }
          out[type] = await analyzeStemAnatomy(mono, buffer.sampleRate, { bpm: bpm || 0, gridOffset: 0, stemType: type });
          if (cancelled) return;
        }
        setResults(out);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Analysis failed');
      } finally {
        if (!cancelled) setProgress(null);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, signature, bpm, analyzeStemAnatomy]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(Math.floor(entries[0].contentRect.width)));
    ro.observe(el);
    setWidth(Math.floor(el.clientWidth));
    return () => ro.disconnect();
  }, [results]);

  const numBars = results ? Math.max(...Object.values(results).map(r => r.numBars)) : 0;

  // --- sections: 4-bar blocks where the set of active stems changes, or a stem's level
  //     jumps by more than LEVEL_STEP dB (a filtered breakdown keeps every stem "active") ---
  const LEVEL_STEP = 6;
  const sections = useMemo(() => {
    if (!results) return [];
    const blocks = Math.ceil(numBars / 4);
    const blockStats = (block) => stemTypes.map(type => {
      const bars = results[type]?.bars || [];
      let active = 0, sum = 0, n = 0;
      for (let b = block * 4; b < Math.min(numBars, block * 4 + 4); b++) {
        if (!bars[b]) continue;
        if (bars[b].active) active++;
        sum += bars[b].rmsDb; n++;
      }
      return { type, active: active >= 2, level: n ? sum / n : -120 };
    });
    const out = [];
    let prev = null;
    for (let blk = 0; blk < blocks; blk++) {
      const stats = blockStats(blk);
      const set = stats.filter(x => x.active).map(x => x.type);
      const key = set.join('+');
      let levelChange = null;
      if (prev) {
        for (const st of stats) {
          const before = prev.stats.find(x => x.type === st.type);
          if (st.active && before?.active && Math.abs(st.level - before.level) >= LEVEL_STEP) {
            levelChange = { type: st.type, delta: st.level - before.level };
            break;
          }
        }
      }
      if (!prev || key !== prev.key || levelChange) {
        out.push({ bar: blk * 4 + 1, stems: set, levelChange });
        prev = { key, stats };
      } else {
        prev = { key, stats };
      }
    }
    return out;
  }, [results, numBars, stemTypes]);

  const describeSection = (sec, i) => {
    const before = i > 0 ? sections[i - 1].stems : [];
    const label = (t) => getStemLabel(t, mode).toLowerCase();
    if (sec.stems.length === 0) return 'silence';
    if (i === 0) return sec.stems.map(label).join(' + ');
    const added = sec.stems.filter(t => !before.includes(t));
    const removed = before.filter(t => !sec.stems.includes(t));
    const parts = [];
    if (added.length) parts.push(`${added.map(label).join(' + ')} in`);
    if (removed.length) parts.push(`${removed.map(label).join(' + ')} out`);
    if (sec.levelChange) parts.push(`${label(sec.levelChange.type)} ${sec.levelChange.delta > 0 ? 'up' : 'down'} ${Math.abs(sec.levelChange.delta).toFixed(0)} dB`);
    // Only the rhythm section decides drop vs breakdown — a vocal getting louder is a chorus, not a drop
    const rhythmic = sec.levelChange && sec.levelChange.type !== 'vocals';
    const quieter = removed.includes('drums') || (rhythmic && sec.levelChange.delta < 0 && !added.length);
    const louder = added.includes('drums') || (rhythmic && sec.levelChange.delta > 0);
    const hint = quieter ? ' — breakdown?' : louder ? ' — drop?' : '';
    return `${parts.join(', ')}${hint}`;
  };

  // --- progression: the most common 4-bar loop of chords / bass roots ---
  const harmonicStem = ['other', 'piano', 'guitar'].find(t => results?.[t]);
  const bassStem = results?.bass ? 'bass' : null;
  const loopOf = (type, field) => {
    const bars = results?.[type]?.bars;
    if (!bars) return null;
    const counts = new Map();
    let total = 0;
    for (let b = 0; b + 4 <= bars.length; b += 4) {
      const seq = bars.slice(b, b + 4).map(x => x[field]);
      if (seq.some(v => !v)) continue;
      const key = seq.join(' · ');
      counts.set(key, (counts.get(key) || 0) + 1);
      total++;
    }
    if (!total) return null;
    const [seq, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const palette = new Map();
    for (const bar of bars) if (bar[field]) palette.set(bar[field], (palette.get(bar[field]) || 0) + 1);
    return { seq: seq.split(' · '), n, total, palette: [...palette.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6) };
  };
  const chordLoop = harmonicStem ? loopOf(harmonicStem, 'chord') : null;
  const bassLoop = bassStem ? loopOf(bassStem, 'bass') : null;

  // --- structure grid ---
  useEffect(() => {
    const canvas = gridRef.current?.querySelector('canvas');
    if (!canvas || !results || !width) return;
    const dpr = window.devicePixelRatio || 1;
    const rows = stemTypes.length;
    const height = rows * (CELL_H + CELL_GAP) + 14;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const cellW = width / numBars;
    ctx.font = '9px "DM Mono", ui-monospace, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isDark ? '#7C8794' : '#6B7280';
    const labelEvery = cellW * 4 >= 22 ? 4 : cellW * 8 >= 22 ? 8 : 16;
    for (let b = 0; b < numBars; b += labelEvery) ctx.fillText(String(b + 1), b * cellW + 1, 0);
    stemTypes.forEach((type, row) => {
      const r = results[type];
      if (!r) return;
      const y = 14 + row * (CELL_H + CELL_GAP);
      const hex = stemColor(type).hex;
      for (let b = 0; b < numBars; b++) {
        const bar = r.bars[b];
        const rel = bar ? Math.max(0, Math.min(1, (bar.rmsDb - (r.peakDb - 30)) / 30)) : 0;
        ctx.fillStyle = bar?.active ? hex : (isDark ? '#14171C' : '#E1E5EA');
        ctx.globalAlpha = bar?.active ? 0.35 + rel * 0.65 : 1;
        ctx.fillRect(b * cellW, y, Math.max(1, cellW - (cellW > 3 ? 1 : 0)), CELL_H);
      }
      ctx.globalAlpha = 1;
    });
    // section lines
    ctx.strokeStyle = isDark ? 'rgba(232,236,241,0.35)' : 'rgba(15,18,22,0.35)';
    for (const sec of sections) {
      const x = Math.round((sec.bar - 1) * cellW) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, 12); ctx.lineTo(x, height); ctx.stroke();
    }
  }, [results, width, numBars, stemTypes, sections, isDark]);

  const text = isDark ? 'text-[#E8ECF1]' : 'text-[#0F1216]';
  const muted = isDark ? 'text-[#9AA4B0]' : 'text-[#4B5563]';
  const dim = isDark ? 'text-[#7C8794]' : 'text-[#6B7280]';
  const card = `rounded-md border p-3 ${isDark ? 'bg-[#0A0C0F] border-[#1C2027]' : 'bg-[#F5F6F8] border-[#D9DDE3]'}`;
  const chip = `inline-flex items-center px-2 h-6 rounded font-mono text-[12px] ${isDark ? 'bg-[#14171C] text-[#E8ECF1]' : 'bg-white border border-[#D9DDE3] text-[#0F1216]'}`;

  return (
    <section className={`rounded-lg border ${isDark ? 'bg-[#0D0F12] border-[#1C2027]' : 'bg-white border-[#D9DDE3]'}`} aria-label="Anatomy of the track">
      <div className={`flex flex-wrap items-center gap-3 px-4 py-3 border-b ${isDark ? 'border-[#1C2027]' : 'border-[#D9DDE3]'}`}>
        <BookOpen className="w-4 h-4" style={{ color: SPECTRUM_STOPS[2] }} />
        <h4 className={`font-display font-bold uppercase tracking-wide text-sm ${text}`}>Anatomy</h4>
        <span className={`font-mono text-[11px] ${muted}`}>
          {progress ? `reading ${progress}…` : results ? `${numBars} bars${bpm ? ` at ${bpm} bpm` : ''}${keyInfo ? ` · ${displayKeyName(keyInfo)} ${keyInfo.mode}` : ''} · ${sections.length} sections` : status !== 'ready' ? 'waiting for stems…' : ''}
        </span>
        {progress && <Loader2 className={`w-3.5 h-3.5 animate-spin ${dim}`} />}
      </div>

      {error && <div className="px-4 py-3 font-mono text-[12px] text-red-500">{error}</div>}

      {results && (
        <div className="p-4 space-y-4">
          {/* 1. Structure */}
          <div>
            <div className={`font-display font-bold uppercase tracking-wide text-[11px] mb-2 ${muted}`}>Structure — where each stem plays</div>
            <div className="flex gap-2">
              <div className="shrink-0 pt-[14px]">
                {stemTypes.map(type => (
                  <div key={type} className="flex items-center gap-1.5 font-mono text-[10px] uppercase" style={{ height: CELL_H + CELL_GAP }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: stemColor(type).hex }} />
                    <span className={`${muted} w-16 truncate`}>{getStemLabel(type, mode)}</span>
                  </div>
                ))}
              </div>
              <div ref={gridRef} className="flex-1 min-w-0">
                <canvas className="block w-full" />
              </div>
            </div>
            <ol className="mt-2 grid gap-x-6 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((sec, i) => (
                <li key={sec.bar} className={`font-mono text-[11px] ${muted}`}>
                  <span className={text}>bar {sec.bar}</span>
                  <span className={dim}> · {formatTime((sec.bar - 1) * (results[stemTypes[0]]?.barSec || 2))}</span> — {describeSection(sec, i)}
                </li>
              ))}
            </ol>
          </div>

          {/* 2. Progression */}
          {(chordLoop || bassLoop) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {chordLoop && (
                <div className={card}>
                  <div className={`font-display font-bold uppercase tracking-wide text-[11px] mb-2 ${muted}`}>
                    Chords — most common 4-bar loop <span className={`font-mono normal-case tracking-normal font-normal ${dim}`}>({chordLoop.n} of {chordLoop.total} four-bar blocks)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {chordLoop.seq.map((c, i) => <span key={i} className={chip} style={{ borderLeft: `2px solid ${stemColor(harmonicStem).hex}` }}>{c}</span>)}
                  </div>
                  <div className={`font-mono text-[11px] ${dim}`}>
                    palette: {chordLoop.palette.map(([c, n]) => `${c} ×${n}`).join(' · ')}
                  </div>
                </div>
              )}
              {bassLoop && (
                <div className={card}>
                  <div className={`font-display font-bold uppercase tracking-wide text-[11px] mb-2 ${muted}`}>
                    Bass roots — most common 4-bar loop <span className={`font-mono normal-case tracking-normal font-normal ${dim}`}>({bassLoop.n} of {bassLoop.total})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {bassLoop.seq.map((c, i) => <span key={i} className={chip} style={{ borderLeft: `2px solid ${stemColor('bass').hex}` }}>{c}</span>)}
                  </div>
                  <div className={`font-mono text-[11px] ${dim}`}>
                    notes: {bassLoop.palette.map(([c, n]) => `${c} ×${n}`).join(' · ')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Stems */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stemTypes.map(type => {
              const r = results[type];
              if (!r) return null;
              const onsetBars = r.bars.filter(b => b.active && b.onsets != null);
              const hitsPerBar = onsetBars.length ? onsetBars.reduce((s, b) => s + b.onsets, 0) / onsetBars.length : null;
              const dominant = r.bands.indexOf(Math.max(...r.bands));
              return (
                <div key={type} className={`${card} relative pl-4`}>
                  <div className="absolute left-1.5 top-3 bottom-3 w-[3px] rounded-r" style={{ background: stemColor(type).gradient || stemColor(type).hex }} />
                  <div className={`font-display font-bold uppercase tracking-wide text-[12px] mb-2 ${text}`}>{getStemLabel(type, mode)}</div>
                  <div className="flex items-end gap-1 h-8 mb-1" aria-label="Band balance">
                    {r.bands.map((v, i) => (
                      <div key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(6, v * 100)}%`, background: SPECTRUM_STOPS[i], opacity: i === dominant ? 1 : 0.55 }} title={`${BAND_LABELS[i]} ${(v * 100).toFixed(0)}%`} />
                    ))}
                  </div>
                  <div className={`font-mono text-[10px] mb-2 ${dim}`}>mostly {BAND_LABELS[dominant]} · {(r.bands[dominant] * 100).toFixed(0)}%</div>
                  <dl className={`font-mono text-[11px] space-y-0.5 ${muted}`}>
                    <div className="flex justify-between gap-2"><dt className={dim}>plays</dt><dd>{r.activeBars} of {r.numBars} bars{r.activeFrom != null ? ` · in at ${r.activeFrom + 1}` : ''}</dd></div>
                    <div className="flex justify-between gap-2"><dt className={dim}>level</dt><dd>{r.rmsDb} dB rms · peak {r.peakDb}</dd></div>
                    {hitsPerBar != null && <div className="flex justify-between gap-2"><dt className={dim}>hits</dt><dd>~{hitsPerBar.toFixed(1)} per bar</dd></div>}
                  </dl>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
