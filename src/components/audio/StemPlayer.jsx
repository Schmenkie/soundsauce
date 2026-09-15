import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Loader2, Repeat, X, Layers, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { getStemLabel } from '../../utils/stemFiles';
import { stemColor, SPECTRUM } from '../../utils/spectrum';
import { WAVEFORM_COLUMNS, stemGain } from '../../hooks/useStemPlayer';
import { SectionStrip } from './SectionStrip';

const LANE_HEIGHT = 60;
const LANE_GAP = 2;
const RULER_HEIGHT = 18;
const LABEL_WIDTH = 120;

/**
 * StemPlayer — the Arrangement Map. Every stem stacked as a colour-coded lane over a bar
 * grid derived from the track's BPM, with synced mute / solo playback. This is the
 * "understand the original" step: solo the drums to hear the groove, mute the vocal to
 * hear what's under it, loop eight bars of the drop and see which stems carry it.
 *
 * - click a lane to seek · drag to loop (snaps to bars when the tempo is known)
 * - M / S per stem, "clear" resets the mix
 * - bar 1 defaults to 0:00; "set bar 1 here" pins the grid to the playhead, ◀ ▶ nudge it
 *   a beat either way for tracks with a pickup or a long intro (the offset lives in the
 *   page so section detection and the vault see it too)
 * - the SectionStrip above the lanes shows intro / breakdown / buildup / drop / outro
 *
 * @param {object} props
 * @param {ReturnType<import('../../hooks/useStemPlayer').useStemPlayer>} props.player
 * @param {string[]} props.stemTypes
 * @param {string} props.mode  separation mode (for stem labels)
 * @param {number|null} props.bpm
 * @param {number} props.gridOffset  seconds — where bar 1 lands
 * @param {(offset:number)=>void} props.onGridOffsetChange
 * @param {object[]|null} props.sections  [{ label, start }] or null while detecting
 * @param {(sections:object[])=>void} props.onSectionsChange
 * @param {boolean} [props.sectionsDetecting]
 * @param {string} [props.sectionsNote]
 * @param {'dark'|'light'} props.theme
 * @param {(s:number)=>string} props.formatTime
 */
export function StemPlayer({ player, stemTypes, mode, bpm, gridOffset, onGridOffsetChange, sections, onSectionsChange, sectionsDetecting, sectionsNote, theme, formatTime }) {
  const isDark = theme === 'dark';
  const { status, error, isPlaying, duration, muted, soloed, loop, waveforms, positionRef } = player;

  const [hoverTime, setHoverTime] = useState(null);
  const [drag, setDrag] = useState(null); // { start, end } while dragging
  const [width, setWidth] = useState(0);

  const containerRef = useRef(null);
  const lanesCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const dragRef = useRef(null);
  const timeReadoutRef = useRef(null);
  const barReadoutRef = useRef(null);

  const beat = bpm ? 60 / bpm : 0;
  const bar = beat * 4;
  const lanesHeight = stemTypes.length * (LANE_HEIGHT + LANE_GAP) - LANE_GAP;
  const totalHeight = RULER_HEIGHT + lanesHeight;

  // Auto-load the stems the first time the player is shown
  const { load } = player;
  useEffect(() => {
    if (status === 'idle') load();
  }, [status, load]);

  // Track container width (device-pixel aware canvases)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(Math.floor(entries[0].contentRect.width));
    });
    ro.observe(el);
    setWidth(Math.floor(el.clientWidth));
    return () => ro.disconnect();
  }, [status]);

  const timeToX = useCallback((t) => duration > 0 ? (t / duration) * width : 0, [duration, width]);
  const xToTime = useCallback((x) => duration > 0 ? Math.max(0, Math.min(duration, (x / width) * duration)) : 0, [duration, width]);

  const snapToBar = useCallback((t) => {
    if (!bar) return t;
    return gridOffset + Math.round((t - gridOffset) / bar) * bar;
  }, [bar, gridOffset]);

  const barAt = useCallback((t) => bar ? Math.floor((t - gridOffset) / bar) + 1 : null, [bar, gridOffset]);

  const colors = useMemo(() => ({
    ruler: isDark ? '#7C8794' : '#6B7280',
    barLine: isDark ? 'rgba(232,236,241,0.07)' : 'rgba(15,18,22,0.08)',
    phraseLine: isDark ? 'rgba(232,236,241,0.16)' : 'rgba(15,18,22,0.18)',
    sectionLine: isDark ? 'rgba(232,236,241,0.28)' : 'rgba(15,18,22,0.3)',
    laneBg: isDark ? '#0A0C0F' : '#F0F2F5',
    centre: isDark ? 'rgba(232,236,241,0.06)' : 'rgba(15,18,22,0.06)',
    playhead: SPECTRUM.high,
    loopFill: isDark ? 'rgba(250,204,21,0.08)' : 'rgba(250,204,21,0.16)',
    loopEdge: SPECTRUM.high,
    hover: isDark ? 'rgba(232,236,241,0.25)' : 'rgba(15,18,22,0.25)',
  }), [isDark]);

  // === Static layer: lanes + waveforms + bar grid ===
  useEffect(() => {
    const canvas = lanesCanvasRef.current;
    if (!canvas || !width || status !== 'ready') return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = totalHeight * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, totalHeight);

    // Lanes
    stemTypes.forEach((type, i) => {
      const y = RULER_HEIGHT + i * (LANE_HEIGHT + LANE_GAP);
      ctx.fillStyle = colors.laneBg;
      ctx.fillRect(0, y, width, LANE_HEIGHT);
      const wf = waveforms[type];
      if (!wf) return;
      const gain = stemGain(type, muted, soloed);
      const c = stemColor(type).hex;
      const mid = y + LANE_HEIGHT / 2;
      const amp = LANE_HEIGHT / 2 - 3;
      ctx.strokeStyle = colors.centre;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, mid + 0.5); ctx.lineTo(width, mid + 0.5); ctx.stroke();

      ctx.fillStyle = gain > 0 ? c : (isDark ? 'rgba(124,135,148,0.35)' : 'rgba(107,114,128,0.35)');
      ctx.globalAlpha = gain > 0 ? 0.85 : 1;
      ctx.beginPath();
      for (let px = 0; px < width; px++) {
        const c0 = Math.floor((px / width) * WAVEFORM_COLUMNS);
        const c1 = Math.max(c0 + 1, Math.floor(((px + 1) / width) * WAVEFORM_COLUMNS));
        let mn = 0, mx = 0;
        for (let k = c0; k < c1 && k < WAVEFORM_COLUMNS; k++) {
          if (wf.mins[k] < mn) mn = wf.mins[k];
          if (wf.maxes[k] > mx) mx = wf.maxes[k];
        }
        const top = mid - Math.max(0.6, mx * amp);
        const bottom = mid + Math.max(0.6, -mn * amp);
        ctx.rect(px, top, 1, bottom - top);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Bar grid + ruler
    ctx.font = '10px "DM Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.ruler;
    if (bar && duration > 0) {
      const firstBar = Math.floor((0 - gridOffset) / bar);
      const lastBar = Math.ceil((duration - gridOffset) / bar);
      const pxPerBar = timeToX(bar);
      const labelEvery = pxPerBar >= 48 ? 4 : pxPerBar >= 14 ? 8 : pxPerBar >= 7 ? 16 : 32;
      for (let b = firstBar; b <= lastBar; b++) {
        const t = gridOffset + b * bar;
        if (t < 0 || t > duration) continue;
        const x = Math.round(timeToX(t)) + 0.5;
        const n = b + 1; // bar number shown to the user
        const isSection = (n - 1) % 16 === 0;
        const isPhrase = (n - 1) % 4 === 0;
        ctx.strokeStyle = isSection ? colors.sectionLine : isPhrase ? colors.phraseLine : colors.barLine;
        if (!isPhrase && pxPerBar < 5) continue; // too dense to draw every bar
        ctx.beginPath();
        ctx.moveTo(x, isPhrase ? 0 : RULER_HEIGHT);
        ctx.lineTo(x, totalHeight);
        ctx.stroke();
        if ((n - 1) % labelEvery === 0 && n >= 1) {
          ctx.fillText(String(n), x + 3, RULER_HEIGHT / 2);
        }
      }
    } else {
      // No tempo: time ruler every 30 s
      for (let t = 0; t < duration; t += 30) {
        const x = Math.round(timeToX(t)) + 0.5;
        ctx.strokeStyle = colors.phraseLine;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, totalHeight); ctx.stroke();
        ctx.fillText(formatTime(t), x + 3, RULER_HEIGHT / 2);
      }
    }
  }, [width, status, stemTypes, waveforms, muted, soloed, bar, gridOffset, duration, totalHeight, colors, timeToX, formatTime, isDark]);

  // === Overlay: playhead, loop, hover, drag — 60fps from positionRef ===
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || !width || status !== 'ready') return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = totalHeight * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let raf;
    let lastReadout = '';
    const draw = () => {
      ctx.clearRect(0, 0, width, totalHeight);
      const region = drag || loop;
      if (region) {
        const x0 = timeToX(Math.min(region.start, region.end));
        const x1 = timeToX(Math.max(region.start, region.end));
        ctx.fillStyle = colors.loopFill;
        ctx.fillRect(x0, 0, x1 - x0, totalHeight);
        ctx.strokeStyle = colors.loopEdge;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(x0) + 0.5, 0); ctx.lineTo(Math.round(x0) + 0.5, totalHeight);
        ctx.moveTo(Math.round(x1) + 0.5, 0); ctx.lineTo(Math.round(x1) + 0.5, totalHeight);
        ctx.stroke();
      }
      if (hoverTime != null && !drag) {
        const x = Math.round(timeToX(hoverTime)) + 0.5;
        ctx.strokeStyle = colors.hover;
        ctx.beginPath(); ctx.moveTo(x, RULER_HEIGHT); ctx.lineTo(x, totalHeight); ctx.stroke();
      }
      const pos = positionRef.current;
      const x = Math.round(timeToX(pos)) + 0.5;
      ctx.strokeStyle = colors.playhead;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, totalHeight); ctx.stroke();
      ctx.fillStyle = colors.playhead;
      ctx.beginPath(); ctx.moveTo(x - 4, 0); ctx.lineTo(x + 4, 0); ctx.lineTo(x, 5); ctx.closePath(); ctx.fill();

      // Readouts (DOM text, but only touched when it changes)
      const readout = formatTime(pos);
      if (readout !== lastReadout) {
        lastReadout = readout;
        if (timeReadoutRef.current) timeReadoutRef.current.textContent = readout;
        if (barReadoutRef.current) {
          const b = barAt(pos);
          barReadoutRef.current.textContent = b != null ? `bar ${Math.max(1, b)}` : '';
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [width, status, totalHeight, colors, timeToX, drag, loop, hoverTime, positionRef, formatTime, barAt]);

  // === Pointer interaction: click = seek, drag = loop ===
  const pointerTime = useCallback((e) => {
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    return xToTime(e.clientX - rect.left);
  }, [xToTime]);

  const handlePointerDown = useCallback((e) => {
    if (status !== 'ready') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = pointerTime(e);
    dragRef.current = { origin: t, moved: false };
  }, [status, pointerTime]);

  const handlePointerMove = useCallback((e) => {
    if (status !== 'ready') return;
    const t = pointerTime(e);
    setHoverTime(t);
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved && Math.abs(timeToX(t) - timeToX(d.origin)) < 4) return;
    d.moved = true;
    setDrag({ start: snapToBar(Math.min(d.origin, t)), end: snapToBar(Math.max(d.origin, t)) });
  }, [status, pointerTime, timeToX, snapToBar]);

  const handlePointerUp = useCallback((e) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    const t = pointerTime(e);
    if (d.moved) {
      const region = { start: snapToBar(Math.min(d.origin, t)), end: snapToBar(Math.max(d.origin, t)) };
      setDrag(null);
      if (region.end - region.start < 0.05) {
        player.setLoopRegion(null);
      } else {
        player.setLoopRegion(region);
        player.seek(region.start);
      }
    } else {
      player.seek(t);
    }
  }, [pointerTime, snapToBar, player]);

  const handlePointerLeave = useCallback(() => setHoverTime(null), []);

  const nudgeGrid = useCallback((beats) => {
    if (!beat) return;
    onGridOffsetChange((((gridOffset + beats * beat) % bar) + bar) % bar);
  }, [beat, bar, gridOffset, onGridOffsetChange]);

  const setBarOneHere = useCallback(() => {
    if (!bar) return;
    onGridOffsetChange(((positionRef.current % bar) + bar) % bar);
  }, [bar, positionRef, onGridOffsetChange]);

  const seekAndPlay = useCallback((time) => { player.seek(time); if (!isPlaying) player.play(time); }, [player, isPlaying]);

  // Space toggles play while the map is focused
  const handleKeyDown = useCallback((e) => {
    if (e.key === ' ') { e.preventDefault(); player.togglePlay(); }
  }, [player]);

  const hasMix = Object.values(muted).some(Boolean) || Object.values(soloed).some(Boolean);
  const btn = `inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border font-mono text-[11px] lowercase transition-colors ${
    isDark ? 'bg-[#14171C] border-[#1C2027] text-[#E8ECF1] hover:border-[#2A3039]' : 'bg-[#F5F6F8] border-[#D9DDE3] text-[#0F1216] hover:border-[#B8BEC7]'
  }`;
  const muteText = isDark ? 'text-[#9AA4B0]' : 'text-[#4B5563]';

  return (
    <section
      className={`rounded-lg border overflow-hidden ${isDark ? 'bg-[#0D0F12] border-[#1C2027]' : 'bg-white border-[#D9DDE3]'}`}
      aria-label="Stem player and arrangement map"
    >
      {/* Header / transport */}
      <div className={`flex flex-wrap items-center gap-3 px-4 py-3 border-b ${isDark ? 'border-[#1C2027]' : 'border-[#D9DDE3]'}`}>
        <div className="flex items-center gap-2 mr-auto">
          <Layers className="w-4 h-4" style={{ color: SPECTRUM.low }} />
          <h4 className={`font-display font-bold uppercase tracking-wide text-sm ${isDark ? 'text-[#E8ECF1]' : 'text-[#0F1216]'}`}>Stem Player</h4>
          <span className={`font-mono text-[11px] ${muteText}`}>
            {bpm ? `${bpm} bpm · 4/4 grid` : 'no tempo — time ruler'}
          </span>
        </div>

        <button
          type="button"
          onClick={player.togglePlay}
          disabled={status !== 'ready'}
          className={`inline-flex items-center justify-center w-11 h-9 rounded-md font-bold transition-colors ${
            status === 'ready' ? 'bg-ember-500 text-[#0F1216] hover:bg-ember-400' : isDark ? 'bg-[#14171C] text-[#7C8794]' : 'bg-[#EDEFF3] text-[#6B7280]'
          }`}
          aria-label={isPlaying ? 'Pause stems' : 'Play stems'}
        >
          {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <div className={`font-mono text-sm tabular-nums ${isDark ? 'text-[#E8ECF1]' : 'text-[#0F1216]'}`}>
          <span ref={timeReadoutRef}>0:00</span>
          <span className={muteText}> / {formatTime(duration)}</span>
          <span ref={barReadoutRef} className={`ml-2 ${muteText}`} />
        </div>

        {loop && (
          <button type="button" onClick={() => player.setLoopRegion(null)} className={`${btn} border-ember-500 ring-signal`} title="Clear loop">
            <Repeat className="w-3.5 h-3.5" style={{ color: SPECTRUM.high }} />
            {bar ? `${Math.max(1, Math.round((loop.end - loop.start) / bar))} bars` : `${formatTime(loop.start)}–${formatTime(loop.end)}`}
            <X className="w-3 h-3" />
          </button>
        )}
        {hasMix && (
          <button type="button" onClick={player.clearMix} className={btn}>clear mix</button>
        )}
        {bar > 0 && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => nudgeGrid(-1)} className={`${btn} px-1.5`} title="Nudge grid back one beat"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={setBarOneHere} className={btn} title="Put bar 1 at the playhead"><MapPin className="w-3.5 h-3.5" /> bar 1 here</button>
            <button type="button" onClick={() => nudgeGrid(1)} className={`${btn} px-1.5`} title="Nudge grid forward one beat"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>

      {status === 'error' && (
        <div className="px-4 py-3 font-mono text-[12px]" style={{ color: SPECTRUM.air }}>
          {error} <button type="button" onClick={player.load} className="underline ml-2">retry</button>
        </div>
      )}

      {status === 'loading' && (
        <div className={`px-4 py-6 font-mono text-[12px] flex items-center gap-2 ${muteText}`}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> decoding {stemTypes.length} stems…
        </div>
      )}

      {status === 'ready' && (
        <div className={`py-1.5 border-b ${isDark ? 'border-[#1C2027]' : 'border-[#D9DDE3]'}`}>
          <SectionStrip
            sections={sections}
            duration={duration}
            barSec={bar}
            gridOffset={gridOffset}
            positionRef={positionRef}
            onChange={onSectionsChange}
            onSeek={seekAndPlay}
            formatTime={formatTime}
            theme={theme}
            gutterWidth={LABEL_WIDTH}
            detecting={sectionsDetecting}
            note={sectionsNote}
          />
        </div>
      )}

      {status === 'ready' && (
        <div className="flex">
          {/* Lane labels + M/S */}
          <div className="shrink-0" style={{ width: LABEL_WIDTH, paddingTop: RULER_HEIGHT }}>
            {stemTypes.map((type, i) => {
              const c = stemColor(type);
              const gain = stemGain(type, muted, soloed);
              return (
                <div
                  key={type}
                  className="relative flex flex-col justify-center gap-1 pl-4 pr-2"
                  style={{ height: LANE_HEIGHT, marginTop: i === 0 ? 0 : LANE_GAP, opacity: gain > 0 ? 1 : 0.5 }}
                >
                  <div className="absolute left-1.5 top-2 bottom-2 w-[3px] rounded-r" style={{ background: c.gradient || c.hex }} aria-hidden="true" />
                  <div className={`min-w-0 font-display font-bold uppercase tracking-wide text-[11px] truncate ${isDark ? 'text-[#E8ECF1]' : 'text-[#0F1216]'}`} title={getStemLabel(type, mode)}>
                    {getStemLabel(type, mode)}
                  </div>
                  <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => player.toggleMute(type)}
                    aria-pressed={!!muted[type]}
                    aria-label={`Mute ${getStemLabel(type, mode)}`}
                    className={`w-6 h-6 rounded font-mono text-[11px] font-bold border transition-colors ${
                      muted[type]
                        ? 'bg-ember-500 border-ember-500 text-[#0F1216]'
                        : isDark ? 'border-[#1C2027] text-[#9AA4B0] hover:border-[#2A3039]' : 'border-[#D9DDE3] text-[#4B5563] hover:border-[#B8BEC7]'
                    }`}
                  >M</button>
                  <button
                    type="button"
                    onClick={() => player.toggleSolo(type)}
                    aria-pressed={!!soloed[type]}
                    aria-label={`Solo ${getStemLabel(type, mode)}`}
                    className={`w-6 h-6 rounded font-mono text-[11px] font-bold border transition-colors ${
                      soloed[type]
                        ? 'text-[#0F1216]'
                        : isDark ? 'border-[#1C2027] text-[#9AA4B0] hover:border-[#2A3039]' : 'border-[#D9DDE3] text-[#4B5563] hover:border-[#B8BEC7]'
                    }`}
                    style={soloed[type] ? { background: c.hex, borderColor: c.hex } : undefined}
                  >S</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Map */}
          <div
            ref={containerRef}
            className="relative flex-1 min-w-0 select-none cursor-crosshair outline-none focus-visible:ring-1 focus-visible:ring-ember-500"
            style={{ height: totalHeight }}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            role="group"
            aria-label="Arrangement map — click to seek, drag to loop"
          >
            <canvas ref={lanesCanvasRef} className="absolute inset-0" style={{ width, height: totalHeight }} />
            <canvas ref={overlayCanvasRef} className="absolute inset-0" style={{ width, height: totalHeight }} />
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div className={`px-4 py-2 border-t font-mono text-[11px] ${isDark ? 'border-[#1C2027] text-[#7C8794]' : 'border-[#D9DDE3] text-[#6B7280]'}`}>
          click to seek · drag to loop{bar ? ' (snaps to bars)' : ''} · M mute · S solo · space play/pause · sections: click to jump, drag edges, click a label to rename
        </div>
      )}
    </section>
  );
}
