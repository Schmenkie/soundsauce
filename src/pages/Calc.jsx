import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calculator, ArrowRight, ArrowLeftRight, Archive, Music } from 'lucide-react';
import { useVault, usePageTitle } from '../hooks';
import { displayKeyName } from '../utils/stemFiles';
import { NOTE_NAMES, camelotOf, transposeSemitones, tempoChange, camelotRelation, warpAdvice, repitchSemitones, compatibleTargets } from '../utils/remixMath';

const PREFS_KEY = 'soundsauce_calc_target';

function readTargetPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || 'null'); } catch { return null; }
}

function keyLabel(k) {
  return k?.key ? `${displayKeyName(k)} ${k.mode === 'minor' ? 'min' : 'maj'}` : '—';
}

function fmtSigned(n, digits = 0) {
  if (n == null || Number.isNaN(n)) return '—';
  const v = digits ? n.toFixed(digits) : Math.round(n);
  return `${n > 0 ? '+' : ''}${v}`;
}

/** One side of the calculator: key + tempo inputs, optionally prefilled from a vault track. */
function SidePanel({ label, side, value, onChange, tracks, theme, t, accent }) {
  const isDark = theme === 'dark';
  const input = `w-full min-w-0 px-2 py-2 rounded-md border font-mono text-[13px] outline-none ${isDark ? 'bg-[#0A0C0F] border-[#1C2027] text-[#E8ECF1] focus:border-ember-500/70' : 'bg-white border-[#D9DDE3] text-[#0F1216] focus:border-ember-600/60'}`;
  const chosenTrack = value.trackId ? tracks.find(tr => tr.id === value.trackId) : null;

  const pickTrack = (id) => {
    const tr = tracks.find(x => x.id === id);
    if (!tr) return onChange({ ...value, trackId: null });
    onChange({
      trackId: id,
      key: tr.key?.key || value.key,
      mode: tr.key?.mode || value.mode,
      bpm: tr.bpm ? Math.round(tr.bpm) : value.bpm,
    });
  };

  return (
    <div className={`min-w-0 rounded-lg border p-4 flex flex-col gap-3 ${t.card}`} style={{ borderTopColor: accent, borderTopWidth: 3 }}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={`font-display font-bold uppercase tracking-wide text-[12px] ${t.text}`}>{label}</h3>
        {tracks.length > 0 && (
          <select
            value={value.trackId || ''}
            onChange={(e) => pickTrack(e.target.value)}
            aria-label={`${label}: pick a vault track`}
            className={`${input} !w-auto max-w-[60%] truncate`}
          >
            <option value="">{side === 'source' ? 'vault track…' : 'or a vault track…'}</option>
            {tracks.map(tr => (
              <option key={tr.id} value={tr.id}>{tr.artist ? `${tr.artist} — ` : ''}{tr.title}</option>
            ))}
          </select>
        )}
      </div>
      {chosenTrack && (
        <div className={`flex items-center gap-2 font-mono text-[11px] ${t.textMuted}`}>
          <Music className="w-3 h-3" style={{ color: accent }} />
          <span className="truncate">{chosenTrack.artist ? `${chosenTrack.artist} — ` : ''}{chosenTrack.title}</span>
        </div>
      )}
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
        <label className="flex flex-col gap-1 min-w-0">
          <span className={`font-mono text-[10px] uppercase tracking-wider ${t.textDimmed}`}>key</span>
          <select value={value.key} onChange={(e) => onChange({ ...value, key: e.target.value, trackId: null })} className={input} aria-label={`${label} key`}>
            {NOTE_NAMES.map(n => <option key={n} value={n}>{displayKeyName({ key: n, mode: value.mode })}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 min-w-0">
          <span className={`font-mono text-[10px] uppercase tracking-wider ${t.textDimmed}`}>mode</span>
          <select value={value.mode} onChange={(e) => onChange({ ...value, mode: e.target.value, trackId: null })} className={input} aria-label={`${label} mode`}>
            <option value="minor">minor</option>
            <option value="major">major</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 min-w-0">
          <span className={`font-mono text-[10px] uppercase tracking-wider ${t.textDimmed}`}>bpm</span>
          <input
            type="number" min="40" max="300" step="0.5" inputMode="decimal"
            value={value.bpm ?? ''}
            onChange={(e) => onChange({ ...value, bpm: e.target.value === '' ? null : Number(e.target.value), trackId: null })}
            className={`${input} tabular-nums`}
            aria-label={`${label} tempo`}
          />
        </label>
      </div>
      <div className={`font-mono text-[11px] ${t.textDimmed}`}>
        camelot <span style={{ color: accent }}>{camelotOf(value) || '—'}</span>
      </div>
    </div>
  );
}

function Readout({ label, value, sub, color, t, big }) {
  return (
    <div className={`rounded-lg border p-4 ${t.card}`}>
      <div className={`font-mono text-[10px] uppercase tracking-wider ${t.textDimmed}`}>{label}</div>
      <div className={`font-mono tabular-nums mt-1 ${big ? 'text-3xl' : 'text-xl'} font-medium`} style={{ color: color || undefined }}>{value}</div>
      {sub && <div className={`font-mono text-[11px] mt-1 ${t.textMuted}`}>{sub}</div>}
    </div>
  );
}

/**
 * Remix Calculator — "vocal is Bb minor at 128, my project is F minor at 124" → what to
 * do in Live. Source usually comes from the vault (/calc?track=<id>); the target is your
 * project and is remembered between visits.
 */
export function Calc({ theme, t }) {
  usePageTitle('Remix Calculator');
  const isDark = theme === 'dark';
  const vault = useVault();
  const [searchParams] = useSearchParams();

  const [source, setSource] = useState({ trackId: null, key: 'A', mode: 'minor', bpm: 120 });
  const [target, setTarget] = useState(() => readTargetPrefs() || { trackId: null, key: 'C', mode: 'minor', bpm: 124 });

  // Prefill source from ?track=<id> once the vault has loaded
  const trackParam = searchParams.get('track');
  useEffect(() => {
    if (!trackParam) return;
    const tr = vault.tracks.find(x => x.id === trackParam);
    if (!tr || source.trackId === tr.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSource({ trackId: tr.id, key: tr.key?.key || 'A', mode: tr.key?.mode || 'minor', bpm: tr.bpm ? Math.round(tr.bpm) : 120 });
  }, [trackParam, vault.tracks, source.trackId]);

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(target)); } catch { /* ignore */ }
  }, [target]);

  const swap = () => { const s = source; setSource(target); setTarget(s); };

  const result = useMemo(() => {
    const shift = transposeSemitones(source, target);
    const tempo = tempoChange(source.bpm, target.bpm);
    const relation = camelotRelation(source, target);
    const advice = tempo ? warpAdvice(tempo.best.percent) : null;
    const repitch = tempo ? repitchSemitones(tempo.best.ratio) : 0;
    return { shift, tempo, relation, advice, repitch };
  }, [source, target]);

  const targets = useMemo(() => compatibleTargets(source), [source]);
  const { shift, tempo, relation, advice, repitch } = result;

  const harmonic = relation === 'same key' || relation === 'relative' || /wheel/.test(relation || '');
  const semitoneColor = shift?.semitones === 0 ? (isDark ? '#34D399' : '#059669') : (isDark ? '#FACC15' : '#A16207');
  const tempoPct = tempo?.best.percent ?? 0;
  const tempoColor = Math.abs(tempoPct) <= 5 ? (isDark ? '#34D399' : '#059669') : Math.abs(tempoPct) <= 10 ? (isDark ? '#FACC15' : '#A16207') : '#EF4444';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-2">
        <h2 className={`font-display font-extrabold uppercase tracking-tight text-2xl flex items-center gap-2 ${t.text}`}>
          <Calculator className="w-6 h-6 text-ember-500" /> Remix Calculator
        </h2>
        <p className={`font-mono text-[12px] mt-1 ${t.textMuted}`}>what to do in Live to make a vocal sit in your project</p>
      </div>
      <div className="rule-spectrum mb-6 opacity-80" aria-hidden="true" />

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch mb-6">
        <SidePanel label="Vocal / source" side="source" value={source} onChange={setSource} tracks={vault.tracks} theme={theme} t={t} accent="#EF4444" />
        <div className="flex md:flex-col items-center justify-center gap-2">
          <ArrowRight className={`w-5 h-5 hidden md:block ${t.textDimmed}`} />
          <button type="button" onClick={swap} className={`p-2 rounded-md ${t.button}`} aria-label="Swap source and target" title="Swap">
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>
        <SidePanel label="Project / target" side="target" value={target} onChange={setTarget} tracks={vault.tracks} theme={theme} t={t} accent="#3B82F6" />
      </div>

      {/* Readouts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Readout
          big theme={theme} t={t} color={semitoneColor}
          label="transpose"
          value={shift ? `${fmtSigned(shift.semitones)} st` : '—'}
          sub={shift?.viaRelative
            ? `${keyLabel(source)} → ${keyLabel(shift.effectiveTarget)} (relative of ${keyLabel(target)})${shift.exact !== shift.semitones ? ` · tonic-to-tonic ${fmtSigned(shift.exact)}` : ''}`
            : `${keyLabel(source)} → ${keyLabel(target)}`}
        />
        <Readout
          big theme={theme} t={t} color={tempoColor}
          label="tempo"
          value={tempo ? `${fmtSigned(tempoPct, 1)}%` : '—'}
          sub={tempo ? `${source.bpm} → ${target.bpm} BPM${tempo.best.label !== 'straight' ? ` · read the vocal as ${tempo.best.label}` : ''}` : 'enter both tempos'}
        />
        <Readout
          theme={theme} t={t} color={harmonic ? (isDark ? '#34D399' : '#059669') : '#EF4444'}
          label="camelot"
          value={`${camelotOf(source) || '—'} → ${camelotOf(target) || '—'}`}
          sub={relation || ''}
        />
        <Readout
          theme={theme} t={t} color={isDark ? '#FACC15' : '#A16207'}
          label="warp mode"
          value={advice?.mode || '—'}
          sub={advice?.note}
        />
      </div>

      {/* Live recipe */}
      <div className={`rounded-lg border p-4 mb-6 ${t.card}`}>
        <h3 className={`font-display font-bold uppercase tracking-wide text-[12px] mb-3 ${t.text}`}>In Live</h3>
        <ol className={`font-mono text-[12px] space-y-1.5 list-decimal list-inside ${t.textMuted}`}>
          <li>Set the project to <span className={t.text}>{target.bpm || '—'} BPM</span>. Drop the vocal in; Live warps it to tempo{tempo && tempo.best.label !== 'straight' ? ` — double-click the clip and use ${tempo.best.label === 'half-time' ? ':2' : '*2'} on the warp segment so it reads as ${tempo.best.label}` : ''}.</li>
          <li>Warp mode <span className={t.text}>{advice?.mode || 'Complex Pro'}</span>{advice?.mode === 'Complex Pro' ? ' (Formants 0–20% for natural vocals)' : ''}.</li>
          <li>
            Clip Transpose: <span className={t.text}>{shift ? fmtSigned(shift.semitones) : '—'} st</span>
            {advice?.mode === 'Re-Pitch' && tempo ? ` — Re-Pitch already moves it ${fmtSigned(repitch, 1)} st, so set Transpose to ${fmtSigned((shift?.semitones ?? 0) - repitch, 1)} to land in key.` : ''}
            {shift?.semitones !== 0 && Math.abs(shift?.semitones ?? 0) > 3 ? ' — more than 3 st changes the vocal character; try the relative key or a 0-shift target below.' : ''}
          </li>
          {shift?.viaRelative && <li>Modes differ ({source.mode} vs {target.mode}): the notes match, but write the chords under the vocal's melody rather than the project's tonic.</li>}
        </ol>
      </div>

      {/* Zero-shift and near targets */}
      <div className={`rounded-lg border p-4 ${t.card}`}>
        <h3 className={`font-display font-bold uppercase tracking-wide text-[12px] mb-1 ${t.text}`}>Projects this vocal drops into</h3>
        <p className={`font-mono text-[11px] mb-3 ${t.textDimmed}`}>keys that mix with {keyLabel(source)} ({camelotOf(source)}) — click one to set it as the target</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {targets.map(opt => {
            const active = target.key === opt.key.key && target.mode === opt.key.mode;
            return (
              <button
                key={opt.camelot}
                type="button"
                onClick={() => setTarget({ ...target, key: opt.key.key, mode: opt.key.mode, trackId: null })}
                aria-pressed={active}
                className={`text-left p-3 rounded-md border transition-colors ${active ? (isDark ? 'border-ember-500 bg-[#14171C] ring-signal' : 'border-ember-600 bg-white ring-signal') : (isDark ? 'border-[#1C2027] hover:border-[#2A3039]' : 'border-[#D9DDE3] hover:border-[#B8BEC7]')}`}
              >
                <div className={`font-display font-bold uppercase tracking-wide text-[12px] ${t.text}`}>{keyLabel(opt.key)}</div>
                <div className={`font-mono text-[11px] ${t.textMuted}`}>{opt.camelot} · {opt.relation}</div>
                <div className="font-mono text-[11px] mt-1" style={{ color: opt.semitones === 0 ? (isDark ? '#34D399' : '#059669') : (isDark ? '#FACC15' : '#A16207') }}>{fmtSigned(opt.semitones)} st</div>
              </button>
            );
          })}
        </div>
      </div>

      {vault.tracks.length === 0 && (
        <p className={`font-mono text-[11px] mt-4 ${t.textDimmed}`}>
          <Archive className="w-3 h-3 inline mr-1" /> Tracks in the <Link to="/vault" className="underline hover:text-ember-500">vault</Link> show up in the pickers above.
        </p>
      )}
    </div>
  );
}
