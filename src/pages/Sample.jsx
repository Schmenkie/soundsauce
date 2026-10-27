import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Radar, RefreshCw, Play, Square, Download, AlertTriangle, ListMusic, Music } from 'lucide-react';
import { useHelper, useLibrary, usePageTitle } from '../hooks';
import { useToast } from '../components/ui/Toast';
import { displayKeyName } from '../utils/stemFiles';
import { NOTE_NAMES, camelotOf } from '../utils/remixMath';
import { rankSamples, formatPercent, formatSemitones, searchQueryFor } from '../utils/sampleMatch';
import { formatDuration } from '../lib/helper';

const PREFS_KEY = 'soundsauce_sample_target';
const TOLERANCES = [
  { pct: 0.03, label: '±3%' },
  { pct: 0.06, label: '±6%' },
  { pct: 0.08, label: '±8%' },
  { pct: 0.12, label: '±12%' },
];

function readPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || 'null'); } catch { return null; }
}

function relationColor(row, isDark) {
  if (row.bucket === 'shift') return isDark ? '#FACC15' : '#A16207';
  if (row.rank === 0) return isDark ? '#34D399' : '#059669';
  return isDark ? '#3B82F6' : '#2563EB';
}

/** One library row. Clicking it hands the Lab a search and starts the usual grab. */
function ResultRow({ row, isDark, t }) {
  const color = relationColor(row, isDark);
  const keyName = row.key ? `${displayKeyName({ key: row.key, mode: row.mode })}${row.mode === 'minor' ? 'm' : ''}` : row.camelot;
  return (
    <Link
      to={`/?find=${encodeURIComponent(searchQueryFor(row))}`}
      className={`group grid grid-cols-[3px_1fr_auto] gap-3 items-center p-3 rounded-md border transition-colors ${
        isDark ? 'border-[#1C2027] hover:border-[#2A3039] hover:bg-[#14171C]' : 'border-[#D9DDE3] hover:border-[#B8BEC7] hover:bg-white'
      }`}
    >
      <span className="h-full min-h-[34px] rounded-full" style={{ background: color }} aria-hidden="true" />
      <span className="min-w-0">
        <span className={`block font-display font-bold uppercase tracking-wide text-[12px] truncate ${t.text}`}>{row.title}</span>
        <span className={`block font-mono text-[11px] truncate ${t.textMuted}`}>
          {row.artist || 'unknown artist'}
          {row.year ? ` · ${row.year}` : ''}
          {row.duration ? ` · ${formatDuration(row.duration)}` : ''}
          {row.playCount ? ` · played ${row.playCount}×` : ''}
        </span>
      </span>
      <span className="flex items-center gap-3 font-mono text-[11px] tabular-nums shrink-0">
        <span className="text-right">
          <span className={`block ${t.text}`}>
            {row.lowConfidence && <span className={t.textDimmed} title={`key confidence ${row.confidence}`}>~</span>}
            {keyName} <span className={t.textDimmed}>{row.camelot}</span>
          </span>
          <span className="block" style={{ color }}>
            {row.bucket === 'shift' ? `shift ${formatSemitones(row.semitones)}` : row.relation}
          </span>
        </span>
        <span className="text-right w-[72px]">
          <span className={`block ${t.text}`}>{Math.round(row.bpm)} BPM</span>
          <span className={`block ${t.textMuted}`}>{formatPercent(row.percent)}</span>
        </span>
        {row.durationMismatch && (
          <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] shrink-0" title="The track we analysed was a very different length from the one in your library — the numbers may be from the wrong version." />
        )}
        <Download className={`w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-ember-500' : 'text-ember-600'}`} aria-hidden="true" />
      </span>
    </Link>
  );
}

/** Sync + batch controls. Lives under the results because it's a once-a-week thing. */
function LibraryPanel({ library, helper, isDark, t }) {
  const { toast } = useToast();
  const [playlistOptions, setPlaylistOptions] = useState(null);
  const [listing, setListing] = useState(false);
  const [busy, setBusy] = useState(false);
  const { analysis, stats, syncing } = library;
  const known = library.playlists;

  const loadPlaylists = async () => {
    setListing(true);
    try {
      setPlaylistOptions(await library.listPlaylists());
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setListing(false);
    }
  };

  const doSync = async (persistentId) => {
    setBusy(true);
    try {
      const result = await library.sync(persistentId);
      toast(`${result.name}: ${result.count} tracks (${result.added} new)`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const start = async (opts) => {
    setBusy(true);
    try {
      await library.startAnalysis({ concurrency: 2, ...opts });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const eta = analysis?.etaSeconds != null
    ? analysis.etaSeconds > 3600 ? `${(analysis.etaSeconds / 3600).toFixed(1)} h left` : `${Math.round(analysis.etaSeconds / 60)} min left`
    : null;

  return (
    <div className={`rounded-lg border p-4 ${t.card}`}>
      <h3 className={`font-display font-bold uppercase tracking-wide text-[12px] mb-1 ${t.text}`}>Your library</h3>
      <p className={`font-mono text-[11px] mb-3 ${t.textDimmed}`}>
        Apple Music has no key field, so every track&apos;s BPM and key is worked out here: searched, downloaded, analysed, deleted. Nothing is kept.
      </p>

      {!helper.online ? (
        <p className={`font-mono text-[11px] ${t.textMuted}`}>The helper isn&apos;t running — start it with <code className={isDark ? 'text-ember-500' : 'text-ember-600'}>npm run helper</code> (or click the menubar dot).</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {[
              ['in the index', stats?.total ?? 0],
              ['analysed', stats?.analysed ?? 0],
              ['still to do', stats?.pending ?? 0],
              ['given up on', stats?.failed ?? 0],
            ].map(([label, value]) => (
              <div key={label} className={`p-2 rounded-md border ${isDark ? 'border-[#1C2027]' : 'border-[#D9DDE3]'}`}>
                <div className={`font-mono text-[10px] uppercase tracking-wider ${t.textDimmed}`}>{label}</div>
                <div className={`font-mono tabular-nums text-lg ${t.text}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* Playlists already in the index */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {known.map(p => (
              <button
                key={p.persistentId}
                type="button"
                disabled={busy || !!syncing}
                onClick={() => doSync(p.persistentId)}
                className={`px-2.5 py-1.5 font-mono text-[11px] flex items-center gap-1.5 disabled:opacity-50 ${t.button}`}
                title={`Re-sync "${p.name}" from Music`}
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} /> {p.name} <span className={t.textDimmed}>{p.count}</span>
              </button>
            ))}
            <button
              type="button"
              disabled={listing || busy}
              onClick={loadPlaylists}
              className={`px-2.5 py-1.5 font-mono text-[11px] flex items-center gap-1.5 disabled:opacity-50 ${t.button}`}
            >
              <ListMusic className="w-3 h-3" /> {listing ? 'asking Music…' : known.length ? 'another playlist' : 'pick a playlist'}
            </button>
          </div>

          {syncing && (
            <p className={`font-mono text-[11px] mb-3 ${t.textMuted}`}>{syncing.phase}… {syncing.progress}%</p>
          )}

          {playlistOptions && (
            <div className={`mb-3 p-2 rounded-md border max-h-48 overflow-y-auto ${isDark ? 'border-[#1C2027]' : 'border-[#D9DDE3]'}`}>
              {playlistOptions.map(p => (
                <button
                  key={p.persistentId}
                  type="button"
                  disabled={busy || !!syncing}
                  onClick={() => { setPlaylistOptions(null); doSync(p.persistentId); }}
                  className={`w-full text-left px-2 py-1.5 rounded font-mono text-[11px] flex justify-between gap-2 disabled:opacity-50 ${isDark ? 'hover:bg-[#14171C]' : 'hover:bg-[#EDEFF3]'} ${t.text}`}
                >
                  <span className="truncate">{p.name}</span>
                  <span className={t.textDimmed}>{p.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* The batch */}
          <div className="flex flex-wrap items-center gap-2">
            {analysis?.running ? (
              <button type="button" onClick={library.stopAnalysis} className={`px-3 py-1.5 font-mono text-[11px] flex items-center gap-1.5 ${t.button}`}>
                <Square className="w-3 h-3" /> stop
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy || !stats?.pending}
                  onClick={() => start({})}
                  className={`px-3 py-1.5 text-[12px] flex items-center gap-1.5 disabled:opacity-50 ${t.buttonPrimary}`}
                >
                  <Play className="w-3.5 h-3.5" /> analyse all {stats?.pending ? `(${stats.pending})` : ''}
                </button>
                <button type="button" disabled={busy || !stats?.pending} onClick={() => start({ limit: 100 })} className={`px-3 py-1.5 font-mono text-[11px] disabled:opacity-50 ${t.button}`}>
                  just 100
                </button>
                {!!stats?.failed && (
                  <button type="button" disabled={busy} onClick={() => start({ retryFailed: true })} className={`px-3 py-1.5 font-mono text-[11px] disabled:opacity-50 ${t.button}`}>
                    retry the {stats.failed} that failed
                  </button>
                )}
              </>
            )}
          </div>

          {analysis?.running && (
            <div className="mt-3">
              <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#14171C]' : 'bg-[#EDEFF3]'}`}>
                <div className="h-full bg-spectrum transition-[width] duration-500" style={{ width: `${analysis.progress}%` }} />
              </div>
              <p className={`font-mono text-[11px] mt-2 ${t.textMuted}`}>
                {analysis.done + analysis.failed} of {analysis.planned}
                {analysis.secondsPerTrack ? ` · ${analysis.secondsPerTrack}s per track` : ''}
                {eta ? ` · ${eta}` : ''}
                {analysis.failed ? ` · ${analysis.failed} failed` : ''}
              </p>
              {analysis.current.filter(Boolean).map((label, i) => (
                <p key={i} className={`font-mono text-[11px] truncate ${t.textDimmed}`}>↳ {label}</p>
              ))}
            </div>
          )}

          {!analysis?.running && analysis?.recent?.length > 0 && (
            <ul className={`mt-3 font-mono text-[11px] space-y-0.5 ${t.textDimmed}`}>
              {analysis.recent.slice(0, 5).map((r, i) => (
                <li key={i} className="truncate">
                  {r.ok ? `${r.bpm} BPM ${r.camelot} · ${r.label}` : `failed · ${r.label} — ${r.error}`}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Find something to sample — "my project is 132 in C# minor, what in my own listening
 * library sits close enough to lift a vocal from?" The Rekordbox related-tracks idea,
 * against Apple Music.
 *
 * Results lead into the Lab's import box (/?find=…), so the next click is a FLAC and
 * the one after that is a vocal stem.
 */
export function Sample({ theme, t }) {
  usePageTitle('Find a sample');
  const isDark = theme === 'dark';
  const helper = useHelper();
  const library = useLibrary({ online: helper.online });
  const [target, setTarget] = useState(() => readPrefs() || { bpm: 132, key: 'C#', mode: 'minor' });
  const [tolerance, setTolerance] = useState(() => readPrefs()?.tolerance ?? 0.08);
  const [maxSemitones, setMaxSemitones] = useState(() => readPrefs()?.maxSemitones ?? 2);

  const update = useCallback((patch) => {
    setTarget(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify({ ...next, tolerance, maxSemitones })); } catch { /* ignore */ }
      return next;
    });
  }, [tolerance, maxSemitones]);

  const results = useMemo(
    () => rankSamples(library.tracks, target, { tolerancePct: tolerance, maxSemitones }),
    [library.tracks, target, tolerance, maxSemitones],
  );
  const dropIns = results.filter(r => r.bucket === 'drop-in');
  const shifts = results.filter(r => r.bucket === 'shift');

  const input = `px-2 py-2 rounded-md border font-mono text-[13px] outline-none ${isDark ? 'bg-[#0A0C0F] border-[#1C2027] text-[#E8ECF1] focus:border-ember-500/70' : 'bg-white border-[#D9DDE3] text-[#0F1216] focus:border-ember-600/60'}`;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-2">
        <h2 className={`font-display font-extrabold uppercase tracking-tight text-2xl flex items-center gap-2 ${t.text}`}>
          <Radar className="w-6 h-6 text-ember-500" /> Find a sample
        </h2>
        <p className={`font-mono text-[12px] mt-1 ${t.textMuted}`}>tracks from your own library that sit close to your project — click one to grab it</p>
      </div>
      <div className="rule-spectrum mb-6 opacity-80" aria-hidden="true" />

      {/* Target */}
      <div className={`rounded-lg border p-4 mb-4 ${t.card}`} style={{ borderTopColor: '#3B82F6', borderTopWidth: 3 }}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className={`font-mono text-[10px] uppercase tracking-wider ${t.textDimmed}`}>bpm</span>
            <input
              type="number" min="40" max="300" step="0.5" inputMode="decimal"
              value={target.bpm ?? ''}
              onChange={(e) => update({ bpm: e.target.value === '' ? null : Number(e.target.value) })}
              className={`${input} tabular-nums w-24`}
              aria-label="Project tempo"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={`font-mono text-[10px] uppercase tracking-wider ${t.textDimmed}`}>key</span>
            <select value={target.key} onChange={(e) => update({ key: e.target.value })} className={input} aria-label="Project key">
              {NOTE_NAMES.map(n => <option key={n} value={n}>{displayKeyName({ key: n, mode: target.mode })}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={`font-mono text-[10px] uppercase tracking-wider ${t.textDimmed}`}>mode</span>
            <select value={target.mode} onChange={(e) => update({ mode: e.target.value })} className={input} aria-label="Project mode">
              <option value="minor">minor</option>
              <option value="major">major</option>
            </select>
          </label>
          <div className={`font-mono text-[11px] pb-2 ${t.textDimmed}`}>
            camelot <span className="text-[#3B82F6]">{camelotOf(target) || '—'}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 mt-4">
          <div className="flex flex-col gap-1">
            <span className={`font-mono text-[10px] uppercase tracking-wider ${t.textDimmed}`}>tempo tolerance</span>
            <div className="flex gap-1" role="group" aria-label="Tempo tolerance">
              {TOLERANCES.map(opt => (
                <button
                  key={opt.pct}
                  type="button"
                  aria-pressed={tolerance === opt.pct}
                  onClick={() => setTolerance(opt.pct)}
                  className={`px-2.5 py-1.5 font-mono text-[11px] rounded-md border transition-colors ${
                    tolerance === opt.pct
                      ? isDark ? 'border-ember-500 bg-[#14171C] text-[#E8ECF1] ring-signal' : 'border-ember-600 bg-white text-[#0F1216] ring-signal'
                      : isDark ? 'border-[#1C2027] text-[#7C8794] hover:border-[#2A3039]' : 'border-[#D9DDE3] text-[#6B7280] hover:border-[#B8BEC7]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className={`font-mono text-[10px] uppercase tracking-wider ${t.textDimmed}`}>i&apos;ll shift my track up to</span>
            <select value={maxSemitones} onChange={(e) => setMaxSemitones(Number(e.target.value))} className={input} aria-label="How far you will transpose your own project">
              <option value={0}>not at all</option>
              <option value={1}>1 semitone</option>
              <option value={2}>2 semitones</option>
              <option value={3}>3 semitones</option>
            </select>
          </label>
        </div>
      </div>

      {/* Results */}
      {library.loading ? (
        <p className={`font-mono text-[12px] mb-6 ${t.textDimmed}`}>reading the index…</p>
      ) : library.stats?.analysed === 0 ? (
        <div className={`rounded-lg border p-6 mb-4 text-center ${t.card}`}>
          <Music className={`w-6 h-6 mx-auto mb-2 ${t.textDimmed}`} />
          <p className={`font-mono text-[12px] ${t.textMuted}`}>Nothing analysed yet. Sync a playlist below, then run the batch — it works through the list in the background and you can stop it any time.</p>
        </div>
      ) : (
        <div className="mb-6">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <h3 className={`font-display font-bold uppercase tracking-wide text-[12px] ${t.text}`}>
              Drops straight in <span className={t.textDimmed}>{dropIns.length}</span>
            </h3>
            <span className={`font-mono text-[11px] ${t.textDimmed}`}>of {library.stats?.analysed} analysed</span>
          </div>
          {dropIns.length === 0 ? (
            <p className={`font-mono text-[11px] mb-4 ${t.textDimmed}`}>Nothing in key at this tempo — widen the tolerance, or look at the shift list.</p>
          ) : (
            <div className="space-y-1.5 mb-6">
              {dropIns.map(row => <ResultRow key={row.id} row={row} isDark={isDark} t={t} />)}
            </div>
          )}

          {maxSemitones > 0 && (
            <>
              <h3 className={`font-display font-bold uppercase tracking-wide text-[12px] mb-1 ${t.text}`}>
                If you move your project <span className={t.textDimmed}>{shifts.length}</span>
              </h3>
              <p className={`font-mono text-[11px] mb-2 ${t.textDimmed}`}>tempo already fits; the number is how far to transpose your own track to meet it</p>
              {shifts.length === 0 ? (
                <p className={`font-mono text-[11px] ${t.textDimmed}`}>Nothing within {maxSemitones} semitone{maxSemitones === 1 ? '' : 's'}.</p>
              ) : (
                <div className="space-y-1.5">
                  {shifts.map(row => <ResultRow key={row.id} row={row} isDark={isDark} t={t} />)}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <LibraryPanel library={library} helper={helper} isDark={isDark} t={t} />

      <p className={`font-mono text-[11px] mt-4 ${t.textDimmed}`}>
        Measured against 117 Rekordbox-keyed tracks: the key is exactly right 65% of the time and usable (same, relative or a neighbour) 87%. A <span className={t.text}>~</span> marks a confidence under 60, where that falls to 62% — but three of the fifteen wrong answers scored 80+, so confidence is a hint, not a filter: nothing here is sorted or hidden on it. Once you&apos;ve grabbed a track, the <Link to="/calc" className="underline hover:text-ember-500">calculator</Link> works out the move.
      </p>
    </div>
  );
}
