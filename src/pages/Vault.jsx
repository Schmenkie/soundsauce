import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Search, X, Download, Package, Trash2, FlaskConical, Lock, RefreshCw, Loader2, Music, Link2, Cloud, CloudOff, Calculator, FolderInput, Pencil, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useVault, usePageTitle, useHelper } from '../hooks';
import { useToast } from '../components/ui/Toast';
import { LabSignIn } from '../components/auth';
import { getStemLabel, displayKeyName } from '../utils/stemFiles';
import { stemColor } from '../utils/spectrum';
import { compatibleCamelot, tempoCompatible, BLOB_LIMIT_BYTES, formatMB } from '../lib/vault';
import { downloadRemixPackFromUrls, downloadStemFromUrl, saveStemsToLive, keepStemUrl } from '../utils/remixPack';
import { formatDuration } from '../lib/helper';

const STEM_ORDER = ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other'];


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

function TrackCard({ track, theme, t, isReference, onSetReference, onRemove, onPack, onSaveToLive, onStem, onKeep, onUpdate, busy }) {
  const isDark = theme === 'dark';
  const stems = STEM_ORDER.filter(k => track.stems?.[k]?.url);
  const keyName = track.key ? `${displayKeyName(track.key)} ${track.key.mode === 'minor' ? 'min' : 'maj'}` : null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: track.title || '', artist: track.artist || '' });
  const titleRef = useRef(null);
  const bytes = stems.reduce((sum, k) => sum + (track.stems[k].size || 0), 0);
  useEffect(() => { if (editing) titleRef.current?.focus(); }, [editing]);

  const commitEdit = () => {
    setEditing(false);
    const title = draft.title.trim();
    const artist = draft.artist.trim();
    if (!title) { setDraft({ title: track.title || '', artist: track.artist || '' }); return; }
    if (title !== track.title || artist !== (track.artist || '')) onUpdate(track, { title, artist: artist || null });
  };

  const iconBtn = `w-9 h-9 flex items-center justify-center rounded-md border transition-colors ${
    isDark ? 'border-transparent text-[#7C8794] hover:border-[#2A3039] hover:text-[#E8ECF1]' : 'border-transparent text-[#6B7280] hover:border-[#B8BEC7] hover:text-[#0F1216]'
  }`;
  const secondaryBtn = `h-10 px-3 flex items-center justify-center gap-1.5 rounded-md border font-mono text-[12px] whitespace-nowrap transition-colors disabled:opacity-50 ${
    isDark ? 'bg-[#14171C] border-[#1C2027] text-[#E8ECF1] hover:border-[#2A3039]' : 'bg-[#F5F6F8] border-[#D9DDE3] text-[#0F1216] hover:border-[#B8BEC7]'
  }`;
  const meta = [
    track.duration ? formatDuration(track.duration) : null,
    bytes ? formatMB(bytes) : null,
    track.source || null,
  ].filter(Boolean).join(' · ');

  return (
    <article
      className={`group relative rounded-lg border p-4 flex flex-col gap-3 transition-colors ${
        isReference
          ? isDark ? 'bg-[#14171C] border-ember-500 ring-signal' : 'bg-white border-ember-600 ring-signal'
          : isDark ? 'bg-[#0D0F12] border-[#1C2027] hover:border-[#2A3039]' : 'bg-white border-[#D9DDE3] hover:border-[#B8BEC7]'
      }`}
    >
      {/* Identity */}
      <div className="flex items-start gap-3">
        <div
          className={`w-14 h-14 rounded-md overflow-hidden flex-shrink-0 border flex items-center justify-center ${isDark ? 'bg-[#14171C] border-[#1C2027]' : 'bg-[#EDEFF3] border-[#D9DDE3]'}`}
          style={track.thumbnailUrl ? undefined : { backgroundImage: 'conic-gradient(from 200deg, #8B5CF6, #3B82F6, #22C55E, #FACC15, #EF4444, #8B5CF6)' }}
        >
          {track.thumbnailUrl ? <img src={track.thumbnailUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Music className="w-6 h-6 text-white drop-shadow" />}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <form onSubmit={(e) => { e.preventDefault(); commitEdit(); }} className="space-y-1">
              <input ref={titleRef} value={draft.title} onChange={(e) => setDraft(d => ({ ...d, title: e.target.value }))} onBlur={(e) => { if (!e.relatedTarget?.closest('form')) commitEdit(); }} onKeyDown={(e) => { if (e.key === 'Escape') { setDraft({ title: track.title || '', artist: track.artist || '' }); setEditing(false); } }} aria-label="Title" className={`w-full px-2 py-1 rounded border font-display font-bold uppercase text-[13px] outline-none ${isDark ? 'bg-[#0A0C0F] border-ember-500/60 text-[#E8ECF1]' : 'bg-white border-ember-600/60 text-[#0F1216]'}`} />
              <input value={draft.artist} onChange={(e) => setDraft(d => ({ ...d, artist: e.target.value }))} onBlur={(e) => { if (!e.relatedTarget?.closest('form')) commitEdit(); }} aria-label="Artist" placeholder="artist" className={`w-full px-2 py-1 rounded border font-mono text-[11px] outline-none ${isDark ? 'bg-[#0A0C0F] border-[#1C2027] text-[#E8ECF1]' : 'bg-white border-[#D9DDE3] text-[#0F1216]'}`} />
              <button type="submit" className="sr-only">Save</button>
            </form>
          ) : (
            <>
              <h3 className={`font-display font-bold uppercase tracking-tight text-[14px] leading-tight truncate ${t.text}`} title={track.title}>
                {track.title}
              </h3>
              <p className={`font-mono text-[11px] mt-0.5 truncate ${t.textMuted}`} title={track.artist || ''}>{track.artist || 'unknown artist'}</p>
            </>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {track.bpm && <Chip theme={theme} color={isDark ? '#FACC15' : '#A16207'}>{Math.round(track.bpm)} BPM</Chip>}
            {keyName && (
              <Chip theme={theme} color={isDark ? '#3B82F6' : '#1D4ED8'} title={track.key.confidence != null ? `confidence ${track.key.confidence}%` : undefined}>
                {track.key.confidence != null && track.key.confidence < 60 ? '~ ' : ''}{keyName}{track.key.camelot ? ` / ${track.key.camelot}` : ''}
              </Chip>
            )}
            {meta && <span className={`font-mono text-[10px] ${t.textDimmed}`}>{meta}</span>}
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => { setDraft({ title: track.title || '', artist: track.artist || '' }); setEditing(true); }}
            className={`${iconBtn} w-8 h-8 -mr-1 -mt-1 opacity-0 group-hover:opacity-100 focus:opacity-100`}
            aria-label={`Edit title and artist of ${track.title}`}
            title="Edit title / artist"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Stems */}
      <div className="flex flex-col gap-1.5">
        {stems.map((k) => {
          const c = stemColor(k);
          const info = track.stems[k];
          return (
            <div key={k} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${isDark ? 'border-[#1C2027] bg-[#0A0C0F]' : 'border-[#D9DDE3] bg-[#F5F6F8]'}`}>
              <span className="w-[3px] h-5 rounded" style={{ background: c.gradient || c.hex }} aria-hidden="true" />
              <span className={`font-display font-bold uppercase tracking-wide text-[11px] flex-1 ${t.text}`}>{getStemLabel(k, track.mode)}</span>
              {info.kept ? (
                <span className={`font-mono text-[10px] flex items-center gap-1 ${isDark ? 'text-[#34D399]' : 'text-[#059669]'}`} title="Saved permanently">
                  <Cloud className="w-3 h-3" /> kept
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onKeep(track, k)}
                  disabled={!!busy}
                  className={`font-mono text-[10px] flex items-center gap-1 ${t.textDimmed} hover:text-ember-500 disabled:opacity-40`}
                  title="Temporary — expires ~7 days after separation. Click to keep on your storage."
                >
                  {busy === `keep:${track.id}:${k}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudOff className="w-3 h-3" />} keep
                </button>
              )}
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

      {/* Primary + daily actions */}
      <div className="flex items-center gap-2 mt-auto">
        <Link
          to={`/?track=${encodeURIComponent(track.id)}`}
          className={`flex-1 h-10 flex items-center justify-center gap-1.5 px-3 rounded-md text-[12px] font-semibold whitespace-nowrap ${isDark ? 'bg-ember-500 text-[#1A1400] hover:bg-ember-400' : 'bg-ember-600 text-white hover:bg-ember-700'}`}
        >
          <FlaskConical className="w-3.5 h-3.5" /> Open in Lab
        </Link>
        {stems.length > 0 && onSaveToLive && (
          <button type="button" onClick={() => onSaveToLive(track)} disabled={!!busy} className={secondaryBtn} title="Write the stems into ~/Music/Remix Lab/Stems/ (Live's browser)">
            {busy === `live:${track.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderInput className="w-3.5 h-3.5" />} to live
          </button>
        )}
        {stems.length > 0 && (
          <button type="button" onClick={() => onPack(track)} disabled={!!busy} className={secondaryBtn} title="Download all stems + notes.txt as a zip">
            {busy === `pack:${track.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />} pack
          </button>
        )}
      </div>

      {/* Utility row — quiet icons, never wraps */}
      <div className={`flex items-center justify-between -mb-1 -mx-1 pt-2 border-t ${isDark ? 'border-[#1C2027]' : 'border-[#EDEFF3]'}`}>
        <div className="flex items-center">
          <Link to={`/calc?track=${encodeURIComponent(track.id)}`} className={iconBtn} title="Remix Calculator — transpose / tempo for your project" aria-label={`Open ${track.title} in the calculator`}><Calculator className="w-4 h-4" /></Link>
          <button
            type="button"
            onClick={() => onSetReference(isReference ? null : track)}
            className={`${iconBtn} ${isReference ? (isDark ? '!border-ember-500 !text-ember-500' : '!border-ember-600 !text-ember-600') : ''}`}
            title="Mixes with — show tracks in a compatible key and tempo"
            aria-pressed={isReference}
            aria-label={`Show tracks that mix with ${track.title}`}
          >
            <Link2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center">
          {track.sourceUrl && (
            <a href={track.sourceUrl} target="_blank" rel="noreferrer" className={iconBtn} title={track.sourceUrl.replace(/^https?:\/\/(www\.)?/, '')} aria-label="Open the original">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            type="button"
            onClick={() => onRemove(track)}
            disabled={!!busy}
            className={`${iconBtn} hover:!text-red-500 hover:!border-red-500/50 disabled:opacity-40`}
            aria-label={`Remove ${track.title} from the vault`}
            title="Remove from the vault and delete its files from storage"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
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
  const helper = useHelper();
  const { toast } = useToast();
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
      await downloadRemixPackFromUrls(urls, trackMeta(track), track.mode || 'stems4', undefined, { sections: track.sections, gridOffset: track.gridOffset });
      toast.success('Remix Pack downloaded');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }, [toast]);

  const handleUpdate = useCallback((track, patch) => {
    vault.upsertTrack({ id: track.id, ...patch });
  }, [vault]);

  const handleKeep = useCallback(async (track, stemType) => {
    setBusy(`keep:${track.id}:${stemType}`);
    try {
      const { url, size } = await keepStemUrl(track.stems[stemType].url, stemType, trackMeta(track), track.mode || 'stems4');
      vault.upsertTrack({ id: track.id, stems: { [stemType]: { ...track.stems[stemType], url, kept: true, size: size ?? track.stems[stemType].size } } });
      toast.success(`${getStemLabel(stemType, track.mode)} kept`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }, [vault, toast]);

  const unkeptCount = useMemo(() => vault.tracks.reduce((n, tr) => n + Object.values(tr.stems || {}).filter(st => st?.url && !st.kept).length, 0), [vault.tracks]);

  const handleKeepAll = useCallback(async () => {
    setBusy('keep-all');
    let done = 0, failed = 0;
    try {
      for (const track of vault.tracks) {
        for (const [stemType, info] of Object.entries(track.stems || {})) {
          if (!info?.url || info.kept) continue;
          try {
            const { url, size } = await keepStemUrl(info.url, stemType, trackMeta(track), track.mode || 'stems4');
            vault.upsertTrack({ id: track.id, stems: { [stemType]: { ...info, url, kept: true, size: size ?? info.size } } });
            done++;
          } catch (err) {
            console.warn(`keep ${track.title}/${stemType} failed:`, err.message);
            failed++;
          }
        }
      }
      if (done) toast.success(`${done} stem${done === 1 ? '' : 's'} kept${failed ? ` · ${failed} failed (expired?)` : ''}`);
      else if (failed) toast.error(`Couldn't keep ${failed} stem${failed === 1 ? '' : 's'} — they may have expired`);
    } finally {
      setBusy(null);
    }
  }, [vault, toast]);

  const handleSaveToLive = useCallback(async (track) => {
    setBusy(`live:${track.id}`);
    try {
      const urls = Object.fromEntries(Object.entries(track.stems || {}).map(([k, v]) => [k, v?.url]));
      const result = await saveStemsToLive(urls, trackMeta(track), track.mode || 'stems4', { sections: track.sections, gridOffset: track.gridOffset });
      toast.success(`${result.files.length - 1} stems saved to Remix Lab › Stems › ${result.dir.split('/').pop()}`);
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
            {vault.storage ? ` — ${formatMB(used)} of 1 GB used` : ''}
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
      <div className={`h-1 rounded-full overflow-hidden mb-6 ${isDark ? 'bg-[#14171C]' : 'bg-[#E1E5EA]'}`} title={`${formatMB(used)} of 1 GB`}>
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
            {unkeptCount > 0 && (
              <button
                type="button"
                onClick={handleKeepAll}
                disabled={!!busy}
                className={`px-3 py-2 rounded-md font-mono text-[12px] flex items-center gap-1.5 disabled:opacity-50 ${t.button}`}
                title="Re-host every temporary stem on your storage before it expires"
              >
                {busy === 'keep-all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />} keep all ({unkeptCount})
              </button>
            )}
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
                  onSaveToLive={helper.online ? handleSaveToLive : null}
                  onStem={handleStem}
                  onKeep={handleKeep}
                  onUpdate={handleUpdate}
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
