import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { SPECTRUM } from '../../utils/spectrum';
import { SECTION_LABELS, SECTION_COLORS, barAtTime } from '../../utils/sections';

const STRIP_HEIGHT = 26;
const HANDLE_WIDTH = 8;

/**
 * SectionStrip — the arrangement at a glance: one coloured block per section over the
 * whole track (always 0 → duration, whatever the timeline below it is zoomed to).
 *
 * - click a block to jump to its start
 * - drag a block's left edge to move the boundary (snaps to bars)
 * - click the label to rename or remove it
 * - "+" adds a section at the playhead
 *
 * @param {object} props
 * @param {{ label: string, start: number }[]|null} props.sections  null while detecting
 * @param {number} props.duration
 * @param {number} props.barSec       0 when the tempo is unknown (snaps to whole seconds)
 * @param {number} [props.gridOffset] seconds — where bar 1 lands
 * @param {{ current: number }} props.positionRef   playhead, read at 60 fps
 * @param {(sections: object[]) => void} props.onChange
 * @param {(time: number) => void} props.onSeek
 * @param {(s: number) => string} props.formatTime
 * @param {'dark'|'light'} props.theme
 * @param {number} [props.gutterWidth]  left column (title + add button) — match the timeline below
 * @param {boolean} [props.detecting]
 * @param {string} [props.note]        small text under the title, e.g. "from stems"
 */
export function SectionStrip({
  sections, duration, barSec, gridOffset = 0, positionRef, onChange, onSeek, formatTime,
  theme, gutterWidth = 120, detecting = false, note,
}) {
  const isDark = theme === 'dark';
  const stripRef = useRef(null);
  const playheadRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [draft, setDraft] = useState(null);   // sections while a boundary is being dragged
  const [menu, setMenu] = useState(null);     // { index, x }
  const dragRef = useRef(null);

  const list = useMemo(() => draft || sections || [], [draft, sections]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)));
    ro.observe(el);
    setWidth(Math.floor(el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const timeToX = useCallback(t => duration > 0 ? (t / duration) * width : 0, [duration, width]);
  const xToTime = useCallback(x => duration > 0 ? Math.max(0, Math.min(duration, (x / width) * duration)) : 0, [duration, width]);
  const snap = useCallback(t => {
    const unit = barSec > 0 ? barSec : 1;
    const origin = barSec > 0 ? gridOffset : 0;
    return Math.max(0, Math.min(duration, origin + Math.round((t - origin) / unit) * unit));
  }, [barSec, gridOffset, duration]);

  // Playhead — a transform on one element, no re-render
  useEffect(() => {
    if (!positionRef || !width) return;
    let raf;
    const tick = () => {
      const el = playheadRef.current;
      if (el) el.style.transform = `translateX(${timeToX(positionRef.current)}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [positionRef, width, timeToX]);

  // Close the label menu on outside click / Escape
  useEffect(() => {
    if (!menu) return;
    const close = (e) => { if (!e.target.closest?.('[data-section-menu]')) setMenu(null); };
    const key = (e) => { if (e.key === 'Escape') setMenu(null); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', key); };
  }, [menu]);

  const commit = useCallback((next) => {
    const sorted = [...next].sort((a, b) => a.start - b.start);
    if (sorted.length && sorted[0].start > 0.05) sorted[0] = { ...sorted[0], start: 0 };
    onChange(sorted);
  }, [onChange]);

  // --- boundary drag ---
  const handleHandleDown = useCallback((e, index) => {
    e.stopPropagation();
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not a real pointer */ }
    dragRef.current = { index, moved: false };
  }, []);

  const handlePointerMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d) return;
    const rect = stripRef.current.getBoundingClientRect();
    const raw = xToTime(e.clientX - rect.left);
    const base = sections || [];
    const prev = base[d.index - 1], next = base[d.index + 1];
    const unit = barSec > 0 ? barSec : 1;
    const lo = prev ? prev.start + unit : 0;
    const hi = next ? next.start - unit : duration - unit;
    const t = Math.max(lo, Math.min(hi, snap(raw)));
    d.moved = true;
    setDraft(base.map((s, i) => i === d.index ? { ...s, start: t } : s));
  }, [sections, xToTime, snap, barSec, duration]);

  const handlePointerUp = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.moved && draft) commit(draft);
    setDraft(null);
  }, [draft, commit]);

  // --- label menu actions ---
  const relabel = useCallback((index, label) => {
    commit(list.map((s, i) => i === index ? { ...s, label } : s));
    setMenu(null);
  }, [list, commit]);

  const remove = useCallback((index) => {
    if (list.length <= 1) return;
    const next = list.filter((_, i) => i !== index);
    commit(next);
    setMenu(null);
  }, [list, commit]);

  const addAtPlayhead = useCallback(() => {
    const t = snap(positionRef?.current ?? 0);
    if (list.some(s => Math.abs(s.start - t) < 0.05)) return;
    const before = [...list].filter(s => s.start < t).pop();
    const label = before?.label === 'drop' ? 'breakdown' : 'drop';
    commit([...list, { label, start: t }]);
  }, [list, snap, positionRef, commit]);

  const colors = useMemo(() => ({
    bg: isDark ? '#0A0C0F' : '#F0F2F5',
    text: isDark ? '#E8ECF1' : '#0F1216',
    muted: isDark ? '#7C8794' : '#6B7280',
    border: isDark ? '#1C2027' : '#D9DDE3',
    menuBg: isDark ? '#14171C' : '#FFFFFF',
  }), [isDark]);

  const btn = `inline-flex items-center gap-1 h-6 px-1.5 rounded border font-mono text-[10px] lowercase transition-colors ${
    isDark ? 'bg-[#14171C] border-[#1C2027] text-[#9AA4B0] hover:text-[#E8ECF1] hover:border-[#2A3039]' : 'bg-[#F5F6F8] border-[#D9DDE3] text-[#4B5563] hover:text-[#0F1216] hover:border-[#B8BEC7]'
  }`;

  return (
    <div className="flex" role="group" aria-label="Song sections">
      {/* Gutter: title + add */}
      <div className="shrink-0 flex flex-col justify-center gap-0.5 pl-4 pr-2" style={{ width: gutterWidth, minHeight: STRIP_HEIGHT }}>
        <div className="flex items-center gap-1.5">
          <span className={`font-display font-bold uppercase tracking-wide text-[11px] ${isDark ? 'text-[#E8ECF1]' : 'text-[#0F1216]'}`}>Sections</span>
          <button type="button" onClick={addAtPlayhead} disabled={!sections || !duration} className={`${btn} px-1 disabled:opacity-40`} title="Add a section at the playhead" aria-label="Add a section at the playhead">
            <Plus className="w-3 h-3" />
          </button>
        </div>
        {(note || detecting) && (
          <span className="font-mono text-[10px] leading-none" style={{ color: colors.muted }}>
            {detecting ? <span className="inline-flex items-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" /> detecting…</span> : note}
          </span>
        )}
      </div>

      {/* Strip */}
      <div
        ref={stripRef}
        className="relative flex-1 min-w-0 select-none overflow-visible"
        style={{ height: STRIP_HEIGHT, background: colors.bg }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {!sections && !detecting && (
          <div className="absolute inset-0 flex items-center px-2 font-mono text-[10px]" style={{ color: colors.muted }}>
            {duration ? 'no sections yet' : ''}
          </div>
        )}
        {list.map((s, i) => {
          const end = i + 1 < list.length ? list[i + 1].start : duration;
          const x0 = timeToX(s.start), x1 = timeToX(end);
          const w = Math.max(0, x1 - x0);
          const color = SECTION_COLORS[s.label] || colors.muted;
          const bar = barAtTime(s.start, barSec, gridOffset);
          const showMeta = w > 96;
          const showLabel = w > 34;
          return (
            <div
              key={`${s.start}-${i}`}
              className="absolute top-0 bottom-0 cursor-pointer group"
              style={{ left: x0, width: w, background: `${color}${isDark ? '2E' : '3D'}`, borderLeft: i === 0 ? 'none' : `2px solid ${color}` }}
              onClick={() => onSeek(s.start)}
              title={`${s.label} · ${formatTime(s.start)}${bar ? ` · bar ${bar}` : ''} — click to jump`}
            >
              {showLabel && (
                <div className="absolute inset-y-0 left-1.5 right-1 flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                  <button
                    type="button"
                    data-section-menu
                    onClick={(e) => { e.stopPropagation(); setMenu(menu?.index === i ? null : { index: i, x: x0 }); }}
                    className="font-mono text-[10px] font-bold uppercase tracking-wide rounded px-0.5 -mx-0.5 hover:underline"
                    style={{ color }}
                    aria-label={`Rename or remove ${s.label} section`}
                  >
                    {s.label}
                  </button>
                  {showMeta && (
                    <span className="font-mono text-[10px] tabular-nums" style={{ color: colors.muted }}>
                      {formatTime(s.start)}{bar ? ` · ${bar}` : ''}
                    </span>
                  )}
                </div>
              )}
              {i > 0 && (
                <div
                  className="absolute top-0 bottom-0 cursor-col-resize"
                  style={{ left: -HANDLE_WIDTH / 2, width: HANDLE_WIDTH }}
                  onPointerDown={(e) => handleHandleDown(e, i)}
                  onClick={(e) => e.stopPropagation()}
                  title="Drag to move the boundary"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}

        {/* Playhead */}
        <div ref={playheadRef} className="absolute top-0 bottom-0 w-px pointer-events-none" style={{ left: 0, background: SPECTRUM.high }} aria-hidden="true" />

        {/* Label menu */}
        {menu && list[menu.index] && (
          <div
            data-section-menu
            className="absolute z-20 flex flex-col p-1 rounded-md border shadow-lg"
            style={{ top: STRIP_HEIGHT + 2, left: Math.max(0, Math.min(width - 120, menu.x)), background: colors.menuBg, borderColor: colors.border, minWidth: 120 }}
            role="menu"
          >
            {SECTION_LABELS.map(label => (
              <button
                key={label}
                type="button"
                role="menuitemradio"
                aria-checked={list[menu.index].label === label}
                onClick={() => relabel(menu.index, label)}
                className={`flex items-center gap-2 px-2 py-1 rounded text-left font-mono text-[11px] lowercase ${isDark ? 'hover:bg-[#1A1E25]' : 'hover:bg-[#F0F2F5]'}`}
                style={{ color: list[menu.index].label === label ? SECTION_COLORS[label] : colors.text }}
              >
                <span className="w-2 h-2 rounded-sm" style={{ background: SECTION_COLORS[label] }} aria-hidden="true" />
                {label}
              </button>
            ))}
            {menu.index > 0 && (
              <button
                type="button"
                role="menuitem"
                onClick={() => remove(menu.index)}
                className={`mt-1 px-2 py-1 rounded text-left font-mono text-[11px] lowercase border-t ${isDark ? 'border-[#1C2027] hover:bg-[#1A1E25]' : 'border-[#D9DDE3] hover:bg-[#F0F2F5]'}`}
                style={{ color: SPECTRUM.air }}
              >
                remove
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
