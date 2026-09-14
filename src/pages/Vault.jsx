import { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Search, X, Download, Package, Trash2, FlaskConical, Lock, RefreshCw, Loader2, Music, Link2, Cloud, CloudOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useVault, usePageTitle } from '../hooks';
import { useToast } from '../components/ui/Toast';
import { LabSignIn } from '../components/auth';
import { getStemLabel, displayKeyName } from '../utils/stemFiles';
import { stemColor } from '../utils/spectrum';
import { compatibleCamelot, tempoCompatible } from '../lib/vault';
import { downloadRemixPackFromUrls, downloadStemFromUrl } from '../utils/remixPack';
import { formatDuration } from '../lib/helper';

const BLOB_LIMIT_BYTES = 1024 * 1024 * 1024; // Vercel Hobby
const STEM_ORDER = ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other'];

function fmtMB(bytes) {
  return `${(bytes / 1048576).toFixed(0)} MB`;
}

/** Chip in one of the spectrum colours */
function Chip({ children, color, theme, title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center px-2 py-0.5 rounded border font-mono text-[11px] tabular-nums ${theme === 'dark' ? 'bg-[#0A0C0F] border-[#1C2027]' : 'bg-white border-[#D9DDE3]'}`}
      style={{ color }}
    >
      {children}
    </span>
  );
}

function TrackCard({ track, theme, t, isReference, onSetReference, onRemove, onPack, onStem, busy }) {
  const isDark = theme === 'dark';
  const stems = STEM_ORDER.filter(k => track.stems?.[k]?.url);
  const keyName = track.key ? `${displayKeyName(track.key)} ${track.key.mode === 'minor' ? 'min' : 'maj'}` : null;

  return (
    <article
      className={`relative rounded-lg border p-4 flex flex-col gap-3 transition-colors ${
        isReference
          ? isDark ? 'bg-[#14171C] border-ember-500 ring-signal' : 'bg-white border-ember-600 ring-signal'
          : isDark ? 'bg-[#0D0F12] border-[#1C2027] hover:border-[#2A3039]' : 'bg-white border-[#D9DDE3] hover:border-[#B8BEC7]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-14 h-14 rounded-md overflow-hidden flex-shrink-0 border flex items-center justify-center ${isDark ? 'bg-[#14171C] border-[#1C2027]' : 'bg-[#EDEFF3] border-[#D9DDE3]'}`}
          style={track.thumbnailUrl ? undefined : { backgroundImage: 'conic-gradient(from 200deg, #8B5CF6, #3B82F6, #22C55E, #FACC15, #EF4444, #8B5CF6)' }}
        >
          {track.thumbnailUrl ? <img src={track.thumbnailUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Music className="w-6 h-6 text-white drop-shadow" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-display font-bold uppercase tracking-tight text-[14px] leading-tight ${t.text} line-clamp-2`}>{track.title}</h3>
          <p className={`font-mono text-[11px] mt-0.5 truncate ${t.textMuted}`}>
            {track.artist || 'unknown artist'}{track.duration ? ` — ${formatDuration(track.duration)}` : ''}{track.source ? ` — ${track.source}` : ''}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {track.bpm && <Chip theme={theme} color={isDark ? '#FACC15' : '#A16207'}>{Math.round(track.bpm)} BPM</Chip>}
            {keyName && (
              <Chip theme={theme} color={isDark ? '#3B82F6' : '#1D4ED8'} title={track.key.confidence != null ? `confidence ${track.key.confidence}%` : undefined}>
                {track.key.confidence != null && track.key.confidence < 70 ? '~ ' : ''}{keyName}{track.key.camelot ? ` / ${track.key.camelot}` : ''}
              </Chip>
            )}
          </div>
        </div>
      </div>

      {/* Stem strips */}
      <div className="flex flex-col gap-1.5">
        {stems.map((k) => {
          const c = stemColor(k);
          const info = track.stems[k];
          return (
            <div key={k} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${isDark ? 'border-[#1C2027] bg-[#0A0C0F]' : 'border-[#D9DDE3] bg-[#F5F6F8]'}`}>
              <span className="w-[3px] h-5 rounded" style={{ background: c.gradient || c.hex }} aria-hidden="true" />
              <span className={`font-display font-bold uppercase tracking-wide text-[11px] flex-1 ${t.text}`}>{getStemLabel(k, track.mode)}</span>
              <span className={`font-mono text-[10px] flex items-center gap-1 ${info.kept ? (isDark ? 'text-[#34D399]' : 'text-[#059669]') : t.textDimmed}`} title={info.kept ? 'Saved permanently' : 'Temporary — expires ~7 days after separation'}>
                {info.kept ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
                {info.kept ? 'kept' : 'temp'}
              </span>
              <button
                type="button"
                onClick={() => onStem(track, k)}
                disabled={!!busy}
                className={`p-1 rounded ${t.textMuted} hover:text-ember-500 disabled:opacity-40`}
                aria-label={`Download ${getStemLabel(k, track.mode)}`}
                title="Download stamped FLAC"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
        {stems.length === 0 && <p className={`font-mono text-[11px] ${t.textDimmed}`}>no stems — open in the lab to separate</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        <Link
          to={`/?track=${encodeURIComponent(track.id)}`}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-semibold ${isDark ? 'bg-ember-500 text-[#1A1400] hover:bg-ember-400' : 'bg-ember-600 text-white hover:bg-ember-700'}`}
        >
          <FlaskConical className="w-3.5 h-3.5" /> Open in Lab
        </Link>
        {stems.length > 0 && (
          <button
            type="button"
            onClick={() => onPack(track)}
            disabled={!!busy}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] disabled:opacity-50 ${t.button}`}
            title="Download all stems + notes.txt"
          >
            {busy === `pack:${track.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">pack</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onSetReference(isReference ? null : track)}
          className={`px-3 py-2 rounded-md font-mono text-[12px] ${isReference ? (isDark ? 'bg-[#14171C] border border-ember-500 text-ember-500' : 'bg-white border border-ember-600 text-ember-600') : t.button}`}
          title="Show tracks that mix with this one (Camelot neighbours, ±8% tempo)"
          aria-pressed={isReference}
        >
          <Link2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(track)}
          disabled={!!busy}
          className={`px-3 py-2 rounded-md font-mono text-[12px] disabled:opacity-50 ${t.button} hover:!border-red-500/60 hover:!text-red-500`}
          aria-label={`Remove ${track.title} from the vault`}
          title="Remove and delete its files"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {track.sourceUrl && (
        <a href={track.sourceUrl} target="_blank" rel="noreferrer" className={`font-mono text-[10px] truncate ${t.textDimmed} hover:text-ember-500`}>
          {track.sourceUrl.replace(/^https?:\/\/(www\.)?/, '')}
        </a>
      )}
    </article>
  );
}

/**
 * Vault — every track you've separated: search, filter by key/tempo, find compatible
 * tracks, re-download stems or a Remix Pack, restore a track into the Lab, or delete it.
 */
export function Vault({ theme, t }) {
  usePageTitle('Vault');
  const { isSignedIn } = useAuth();
  const vault = useVault();
  const toast = useToast();
  const isDark = theme === 'dark';

  const [query, setQuery] = useState('');
  const [keyFilter, setKeyFilter] = useState(null); // Camelot code
  const [sort, setSort] = useState('newest');
  const [reference, setReference] = useState(null); // track for compatibility mode
  const [busy, setBusy] = useState(null);
  const [signInOpen, setSignInOpen] = useState(false);

  const camelotCounts = useMemo(() => {
    const counts = {};
    for (const tr of vault.tracks) if (tr.key?.camelot) counts[tr.key.camelot] = (counts[tr.key.camelot] || 0) + 1;
    return Object.entries(counts).sort((a, b) => {
      const pa = parseInt(a[0]), pb = parseInt(b[0]);
      return pa === pb ? a[0].localeCompare(b[0]) : pa - pb;
    });
  }, [vault.tracks]);

  const visible = useMemo(() => {
    let list = vault.tracks;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(tr => `${tr.title} ${tr.artist || ''} ${tr.key ? displayKeyName(tr.key) : ''} ${tr.key?.camelot || ''}`.toLowerCase().includes(q));
    if (keyFilter) list = list.filter(tr => tr.key?.camelot === keyFilter);
    if (reference) {
      const codes = compatibleCamelot(reference.key?.camelot);
      list = list.filter(tr => tr.id !== reference.id && (
        (codes.length === 0 || codes.includes(tr.key?.camelot)) &&
        (!reference.bpm || !tr.bpm || tempoCompatible(tr.bpm, reference.bpm))
      ));
    }
    const sorted = [...list];
    if (sort === 'newest') sorted.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    if (sort === 'bpm') sorted.sort((a, b) => (a.bpm || 0) - (b.bpm || 0));
    if (sort === 'key') sorted.sort((a, b) => (parseInt(a.key?.camelot || '99') - parseInt(b.key?.camelot || '99')) || (a.key?.camelot || '').localeCompare(b.key?.camelot || ''));
    if (sort === 'title') sorted.sort((a, b) => (a.artist || a.title || '').localeCompare(b.artist || b.title || ''));
    return sorted;
  }, [vault.tracks, query, keyFilter, reference, sort]);

  const trackMeta = (track) => ({
    artist: track.artist, title: track.title, bpm: track.bpm,
    key: track.key ? { ...track.key } : null,
  });

  const handlePack = useCallback(async (track) => {
    setBusy(`pack:${track.id}`);
    try {
      const urls = Object.fromEntries(Object.entries(track.stems || {}).map(([k, v]) => [k, v?.url]));
      await downloadRemixPackFromUrls(urls, trackMeta(track), track.mode || 'stems4');
      toast.success('Remix Pack downloaded');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }, [toast]);

  const handleStem = useCallback(async (track, stemType) => {
    setBusy(`stem:${track.id}:${stemType}`);
    try {
      await downloadStemFromUrl(track.stems[stemType].url, stemType, trackMeta(track), track.mode || 'stems4');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }, [toast]);

  const handleRemove = useCallback(async (track) => {
    const ok = window.confirm(`Remove "${track.title}" from the vault and delete its stems and source upload? This frees the storage they use.`);
    if (!ok) return;
    setBusy(`remove:${track.id}`);
    try {
      await vault.removeTrack(track.id, { deleteBlobs: true });
      if (reference?.id === track.id) setReference(null);
      toast.success('Removed');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }, [vault, reference, toast]);

  const used = vault.storage?.usedBytes || 0;
  const usedPct = Math.min(100, (used / BLOB_LIMIT_BYTES) * 100);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
        <div>
          <h2 className={`font-display font-extrabold uppercase tracking-tight text-2xl flex items-center gap-2 ${t.text}`}>
            <Archive className="w-6 h-6 text-ember-500" /> Vault
          </h2>
          <p className={`font-mono text-[12px] mt-1 ${t.textMuted}`}>
            {vault.tracks.length} track{vault.tracks.length === 1 ? '' : 's'}
            {vault.storage ? ` — ${fmtMB(used)} of 1 GB used` : ''}
            {vault.loading ? ' — syncing…' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={vault.refresh} className={`px-3 py-2 rounded-md font-mono text-[12px] flex items-center gap-1.5 ${t.button}`} aria-label="Refresh vault">
            <RefreshCw className={`w-3.5 h-3.5 ${vault.loading ? 'animate-spin' : ''}`} /> sync
          </button>
        </div>
      </div>
      {/* Storage bar */}
      <div className={`h-1 rounded-full overflow-hidden mb-6 ${isDark ? 'bg-[#14171C]' : 'bg-[#E1E5EA]'}`} title={`${fmtMB(used)} of 1 GB`}>
        <div className="h-full bg-spectrum transition-all" style={{ width: `${usedPct}%` }} />
      </div>

      {!isSignedIn && (
        <div className={`p-6 rounded-lg border text-center ${t.card}`}>
          <Lock className="w-6 h-6 mx-auto mb-2 text-ember-500" />
          <p className={`font-display font-bold uppercase tracking-wide text-sm ${t.text}`}>The vault is locked</p>
          <p className={`font-mono text-[12px] mt-1 ${t.textMuted}`}>Unlock the lab to see your tracks.</p>
          <button type="button" onClick={() => setSignInOpen(true)} className={`mt-4 px-4 py-2 rounded-md text-sm font-semibold ${isDark ? 'bg-ember-500 text-[#1A1400] hover:bg-ember-400' : 'bg-ember-600 text-white hover:bg-ember-700'}`}>Unlock</button>
        </div>
      )}

      {isSignedIn && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className={`flex-1 min-w-[220px] flex items-center gap-2 px-3 rounded-md border ${isDark ? 'bg-[#0A0C0F] border-[#1C2027] focus-within:border-ember-500/70' : 'bg-white border-[#D9DDE3] focus-within:border-ember-600/60'}`}>
              <span className={`font-mono text-sm select-none ${isDark ? 'text-ember-500' : 'text-ember-600'}`} aria-hidden="true">&gt;</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search title, artist, key…"
                aria-label="Search vault"
                className={`flex-1 py-2 bg-transparent font-mono text-[13px] outline-none ${t.text} ${isDark ? 'placeholder:text-[#4B5563]' : 'placeholder:text-[#9AA4B0]'}`}
              />
              {query ? (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className={t.textDimmed}><X className="w-4 h-4" /></button>
              ) : <Search className={`w-4 h-4 ${t.textDimmed}`} />}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort"
              className={`px-3 py-2 rounded-md border font-mono text-[12px] outline-none ${isDark ? 'bg-[#0A0C0F] border-[#1C2027] text-[#E8ECF1]' : 'bg-white border-[#D9DDE3] text-[#0F1216]'}`}
            >
              <option value="newest">newest</option>
              <option value="bpm">bpm</option>
              <option value="key">key</option>
              <option value="title">artist</option>
            </select>
          </div>

          {/* Key chips */}
          {camelotCounts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Filter by key">
              {camelotCounts.map(([code, n]) => {
                const active = keyFilter === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setKeyFilter(active ? null : code)}
                    aria-pressed={active}
                    className={`px-2 py-1 rounded border font-mono text-[11px] tabular-nums ${
                      active
                        ? isDark ? 'border-ember-500 text-ember-500 bg-[#14171C]' : 'border-ember-600 text-ember-700 bg-white'
                        : isDark ? 'border-[#1C2027] text-[#9AA4B0] hover:border-[#2A3039]' : 'border-[#D9DDE3] text-[#4B5563] hover:border-[#B8BEC7]'
                    }`}
                  >
                    {code} <span className="opacity-60">×{n}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Compatibility mode banner */}
          {reference && (
            <div className={`flex flex-wrap items-center gap-3 p-3 mb-4 rounded-md border font-mono text-[12px] ${isDark ? 'bg-[#0D0F12] border-ember-500/50 text-[#9AA4B0]' : 'bg-white border-ember-600/50 text-[#4B5563]'}`}>
              <Link2 className="w-4 h-4 text-ember-500" />
              <span>
                mixes with <span className={t.text}>{reference.artist ? `${reference.artist} — ` : ''}{reference.title}</span>
                {reference.key?.camelot ? ` · ${compatibleCamelot(reference.key.camelot).join(' / ')}` : ''}
                {reference.bpm ? ` · ${Math.round(reference.bpm)} BPM ±8% (or half/double)` : ''}
              </span>
              <button type="button" onClick={() => setReference(null)} className="ml-auto flex items-center gap-1 hover:text-ember-500"><X className="w-3.5 h-3.5" /> clear</button>
            </div>
          )}

          {vault.error && <p role="alert" className="text-sm text-red-500 mb-4">{vault.error}</p>}

          {/* Grid */}
          {visible.length === 0 ? (
            <div className={`p-10 rounded-lg border text-center ${t.card}`}>
              <Archive className={`w-8 h-8 mx-auto mb-3 ${t.textDimmed}`} />
              <p className={`font-display font-bold uppercase tracking-wide text-sm ${t.text}`}>
                {vault.tracks.length === 0 ? 'Nothing in the vault yet' : 'No tracks match'}
              </p>
              <p className={`font-mono text-[12px] mt-1 ${t.textMuted}`}>
                {vault.tracks.length === 0
                  ? 'Grab vocals in the lab and every track lands here with its stems, tempo and key.'
                  : reference ? 'Nothing else in the vault is in a compatible key and tempo.' : 'Try a different search or clear the key filter.'}
              </p>
              {vault.tracks.length === 0 && (
                <Link to="/" className={`inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-md text-sm font-semibold ${isDark ? 'bg-ember-500 text-[#1A1400] hover:bg-ember-400' : 'bg-ember-600 text-white hover:bg-ember-700'}`}>
                  <FlaskConical className="w-4 h-4" /> Go to the Lab
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visible.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  theme={theme}
                  t={t}
                  isReference={reference?.id === track.id}
                  onSetReference={setReference}
                  onRemove={handleRemove}
                  onPack={handlePack}
                  onStem={handleStem}
                  busy={busy}
                />
              ))}
            </div>
          )}
        </>
      )}

      <LabSignIn isOpen={signInOpen} onClose={() => setSignInOpen(false)} theme={theme} />
    </div>
  );
}
