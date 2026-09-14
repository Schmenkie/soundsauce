import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { NotebookPen, Search, Globe, Lock, Save, Loader2, Check, ExternalLink, Music, Calculator, FlaskConical, Link2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useVault, usePageTitle } from '../hooks';
import { useToast } from '../components/ui/Toast';
import { displayKeyName } from '../utils/stemFiles';

/**
 * Remix Notes — the "write up what you learned" step.
 *
 * Unlocked: every vault track is a journal entry (what was pulled, what changed, what
 * was learned, link to the result) saved back onto the vault index. Locked / visitors:
 * a read-only portfolio of the entries marked public, served by /api/notes without auth.
 */

const FIELDS = [
  { id: 'pulled', label: 'what I pulled', hint: 'which stem(s), which section, chops…' },
  { id: 'changes', label: 'key / tempo changes', hint: 'e.g. Bb min → C min, +2 st, −3.1%, Complex Pro' },
  { id: 'lessons', label: 'what I learned', hint: 'the thing you want to remember next time' },
];

/** Older vault entries stored notes as a plain string — treat it as "lessons" */
function normalizeNotes(notes) {
  if (!notes) return { pulled: '', changes: '', lessons: '', resultUrl: '', public: false, updatedAt: null };
  if (typeof notes === 'string') return { pulled: '', changes: '', lessons: notes, resultUrl: '', public: false, updatedAt: null };
  return { pulled: '', changes: '', lessons: '', resultUrl: '', public: false, updatedAt: null, ...notes };
}

function hasContent(n) {
  return !!(n.pulled || n.changes || n.lessons || n.resultUrl);
}

function TrackHeader({ track, t, isDark, children }) {
  const keyName = track.key ? `${displayKeyName(track.key)} ${track.key.mode === 'minor' ? 'min' : 'maj'}` : null;
  return (
    <div className="flex items-start gap-3">
      <div className={`w-12 h-12 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center border ${isDark ? 'bg-[#14171C] border-[#1C2027]' : 'bg-[#EDEFF3] border-[#D9DDE3]'}`}>
        {track.thumbnailUrl ? <img src={track.thumbnailUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Music className={`w-5 h-5 ${t.textDimmed}`} />}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`font-display font-bold uppercase tracking-wide text-[13px] truncate ${t.text}`}>{track.title}</h3>
        <p className={`font-mono text-[11px] truncate ${t.textMuted}`}>
          {track.artist || 'Unknown artist'}
          {track.bpm ? ` · ${Math.round(track.bpm)} bpm` : ''}
          {keyName ? ` · ${keyName}${track.key?.camelot ? ` / ${track.key.camelot}` : ''}` : ''}
        </p>
      </div>
      {children}
    </div>
  );
}

function NoteEditor({ track, onSave, t, isDark, initiallyOpen }) {
  const [draft, setDraft] = useState(() => normalizeNotes(track.notes));
  const [open, setOpen] = useState(initiallyOpen || hasContent(normalizeNotes(track.notes)));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const saved = normalizeNotes(track.notes);
  const dirty = FIELDS.some(f => draft[f.id] !== saved[f.id]) || draft.resultUrl !== saved.resultUrl || !!draft.public !== !!saved.public;

  const save = async () => {
    setSaving(true);
    try {
      await onSave(track.id, { ...draft, updatedAt: new Date().toISOString() });
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  };

  const textarea = `w-full px-3 py-2 rounded-md border font-sans text-sm outline-none resize-y min-h-[64px] focus:ring-2 ${
    isDark ? 'bg-[#0A0C0F] border-[#1C2027] text-[#E8ECF1] focus:ring-ember-500/40 placeholder:text-[#4B5563]' : 'bg-[#F5F6F8] border-[#D9DDE3] text-[#0F1216] focus:ring-ember-600/30 placeholder:text-[#9AA4B0]'
  }`;

  return (
    <div className={`rounded-lg border p-4 ${t.card}`} id={`note-${track.id}`}>
      <TrackHeader track={track} t={t} isDark={isDark}>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {saved.public && <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-[#34D399]"><Globe className="w-3 h-3" /> public</span>}
          <Link to={`/?track=${encodeURIComponent(track.id)}`} className={`p-2 rounded-md ${t.button}`} title="Open in the Lab" aria-label="Open in the Lab"><FlaskConical className="w-3.5 h-3.5" /></Link>
          <Link to={`/calc?track=${encodeURIComponent(track.id)}`} className={`p-2 rounded-md ${t.button}`} title="Open in the Calculator" aria-label="Open in the Calculator"><Calculator className="w-3.5 h-3.5" /></Link>
          <button type="button" onClick={() => setOpen(o => !o)} className={`px-2.5 py-2 rounded-md font-mono text-[11px] ${t.button}`}>
            {open ? 'close' : hasContent(saved) ? 'edit' : 'write'}
          </button>
        </div>
      </TrackHeader>

      {open && (
        <div className="mt-4 space-y-3">
          {FIELDS.map(f => (
            <label key={f.id} className="block">
              <span className={`font-mono text-[10px] uppercase tracking-wider ${t.textDimmed}`}>{f.label}</span>
              <textarea
                value={draft[f.id]}
                onChange={(e) => setDraft(d => ({ ...d, [f.id]: e.target.value }))}
                placeholder={f.hint}
                className={`${textarea} mt-1`}
              />
            </label>
          ))}
          <label className="block">
            <span className={`font-mono text-[10px] uppercase tracking-wider ${t.textDimmed}`}>the result (SoundCloud / YouTube link)</span>
            <div className={`mt-1 flex items-center gap-2 px-3 rounded-md border ${isDark ? 'bg-[#0A0C0F] border-[#1C2027]' : 'bg-[#F5F6F8] border-[#D9DDE3]'}`}>
              <Link2 className={`w-3.5 h-3.5 ${t.textDimmed}`} />
              <input
                type="url"
                value={draft.resultUrl}
                onChange={(e) => setDraft(d => ({ ...d, resultUrl: e.target.value }))}
                placeholder="https://soundcloud.com/you/your-remix"
                className={`flex-1 py-2 bg-transparent font-mono text-[12px] outline-none ${t.text}`}
              />
            </div>
          </label>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <label className={`flex items-center gap-2 font-mono text-[11px] cursor-pointer ${t.textMuted}`}>
              <input type="checkbox" checked={!!draft.public} onChange={(e) => setDraft(d => ({ ...d, public: e.target.checked }))} className="accent-[#FACC15]" />
              <Globe className="w-3.5 h-3.5" /> show on the public notes page
            </label>
            <div className="ml-auto flex items-center gap-2">
              {savedAt && !dirty && <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#34D399]"><Check className="w-3 h-3" /> saved</span>}
              <button
                type="button"
                onClick={save}
                disabled={!dirty || saving}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold disabled:opacity-50 ${isDark ? 'bg-ember-500 text-[#1A1400] hover:bg-ember-400' : 'bg-ember-600 text-white hover:bg-ember-700'}`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {!open && hasContent(saved) && (
        <div className={`mt-3 text-sm whitespace-pre-wrap ${t.textMuted}`}>{saved.lessons || saved.pulled || saved.changes}</div>
      )}
    </div>
  );
}

function PublicEntry({ entry, t, isDark }) {
  const n = entry.notes;
  return (
    <article className={`rounded-lg border p-4 space-y-3 ${t.card}`}>
      <TrackHeader track={entry} t={t} isDark={isDark}>
        {n.resultUrl && (
          <a href={n.resultUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[11px] ${t.button}`}>
            hear the remix <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </TrackHeader>
      {FIELDS.filter(f => n[f.id]).map(f => (
        <div key={f.id}>
          <div className={`font-mono text-[10px] uppercase tracking-wider mb-0.5 ${t.textDimmed}`}>{f.label}</div>
          <p className={`text-sm whitespace-pre-wrap ${t.text}`}>{n[f.id]}</p>
        </div>
      ))}
      <div className={`font-mono text-[10px] ${t.textDimmed}`}>
        {entry.sourceUrl && <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">original</a>}
        {entry.sourceUrl && n.updatedAt ? ' · ' : ''}
        {n.updatedAt && new Date(n.updatedAt).toLocaleDateString()}
      </div>
    </article>
  );
}

export function Notes({ theme, t }) {
  usePageTitle('Remix Notes');
  const { isSignedIn } = useAuth();
  const vault = useVault();
  const { toast } = useToast();
  const isDark = theme === 'dark';
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get('track');
  const [query, setQuery] = useState('');
  const [publicEntries, setPublicEntries] = useState(null);
  const scrolledRef = useRef(false);

  // Visitors (or a locked lab) see the portfolio
  useEffect(() => {
    if (isSignedIn) return;
    let cancelled = false;
    fetch('/api/notes').then(r => r.json()).then(d => { if (!cancelled) setPublicEntries(d.entries || []); }).catch(() => { if (!cancelled) setPublicEntries([]); });
    return () => { cancelled = true; };
  }, [isSignedIn]);

  useEffect(() => {
    if (!focusId || scrolledRef.current) return;
    const el = document.getElementById(`note-${focusId}`);
    if (el) { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); scrolledRef.current = true; }
  }, [focusId, vault.tracks]);

  const tracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? vault.tracks.filter(tr => `${tr.title} ${tr.artist || ''} ${JSON.stringify(tr.notes || '')}`.toLowerCase().includes(q))
      : vault.tracks;
    // Entries with notes first, then the rest newest-first
    return [...list].sort((a, b) => {
      const an = hasContent(normalizeNotes(a.notes)) ? 1 : 0;
      const bn = hasContent(normalizeNotes(b.notes)) ? 1 : 0;
      if (an !== bn) return bn - an;
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
  }, [vault.tracks, query]);

  const handleSave = useCallback(async (id, notes) => {
    vault.upsertTrack({ id, notes });
    toast.success('Notes saved');
  }, [vault, toast]);

  const written = vault.tracks.filter(tr => hasContent(normalizeNotes(tr.notes))).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className={`font-display font-extrabold uppercase tracking-tight text-2xl flex items-center gap-2 ${t.text}`}>
            <NotebookPen className="w-6 h-6 text-ember-500" /> Remix Notes
          </h2>
          <p className={`font-mono text-[12px] mt-1 ${t.textMuted}`}>
            {isSignedIn
              ? `${written} of ${vault.tracks.length} tracks written up · what you pulled, what you changed, what you learned`
              : 'what was pulled, what changed, what was learned — one entry per remix'}
          </p>
        </div>
        {isSignedIn && (
          <div className={`flex items-center gap-2 px-3 rounded-md border ${isDark ? 'bg-[#0D0F12] border-[#1C2027]' : 'bg-white border-[#D9DDE3]'}`}>
            <Search className={`w-3.5 h-3.5 ${t.textDimmed}`} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="search notes…" aria-label="Search notes" className={`py-2 bg-transparent font-mono text-[12px] outline-none w-40 ${t.text}`} />
          </div>
        )}
      </div>

      {isSignedIn ? (
        <div className="space-y-3">
          {tracks.length === 0 && (
            <div className={`p-6 rounded-lg border text-center ${t.card}`}>
              <p className={`font-display font-bold uppercase tracking-wide text-sm ${t.text}`}>Nothing to write up yet</p>
              <p className={`font-mono text-[12px] mt-1 ${t.textMuted}`}>Grab a vocal in the <Link to="/" className="underline">Lab</Link> and it shows up here.</p>
            </div>
          )}
          {tracks.map(track => (
            <NoteEditor key={track.id} track={track} onSave={handleSave} t={t} isDark={isDark} initiallyOpen={track.id === focusId} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {publicEntries == null && <p className={`font-mono text-[12px] ${t.textMuted}`}>loading…</p>}
          {publicEntries?.length === 0 && (
            <div className={`p-6 rounded-lg border text-center ${t.card}`}>
              <Lock className="w-5 h-5 mx-auto mb-2 text-ember-500" />
              <p className={`font-mono text-[12px] ${t.textMuted}`}>No public notes yet.</p>
            </div>
          )}
          {publicEntries?.map(entry => <PublicEntry key={entry.id} entry={entry} t={t} isDark={isDark} />)}
        </div>
      )}
    </div>
  );
}
