import { useState, useEffect, useCallback, useRef } from 'react';
import { Link2, Search, Loader2, Download, Clipboard, ChevronDown, ChevronUp, Music, X, ListMusic } from 'lucide-react';
import { extractMediaUrl, formatDuration } from '../../lib/helper';

/**
 * LinkImport — paste a YouTube / SoundCloud link (or type a song name) and pull the
 * audio through the local helper as a lossless FLAC with real artist/title metadata.
 *
 * Props come from useHelper(): online, health, checking, resolving, resolve, job, grab.
 * onImported({ arrayBuffer, meta }) hands the file to the Lab.
 */
export function LinkImport({ helper, onImported, disabled, theme, t }) {
  const { online, health, checking, resolving, resolve, job, grab } = helper;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [clipboardUrl, setClipboardUrl] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [grabbingUrl, setGrabbingUrl] = useState(null);
  const inputRef = useRef(null);
  const isDark = theme === 'dark';

  // Offer whatever media link is on the clipboard when the tab regains focus
  const sniffClipboard = useCallback(async () => {
    if (!online || !navigator.clipboard?.readText || !document.hasFocus()) return;
    try {
      const text = await navigator.clipboard.readText();
      const url = extractMediaUrl(text);
      setClipboardUrl(url && url !== query ? url : null);
    } catch {
      // Permission denied / not supported — silently skip
    }
  }, [online, query]);

  useEffect(() => {
    sniffClipboard();
    window.addEventListener('focus', sniffClipboard);
    return () => window.removeEventListener('focus', sniffClipboard);
  }, [sniffClipboard]);

  const handleResolve = async (q = query) => {
    const trimmed = q.trim();
    if (!trimmed || resolving) return;
    setError(null);
    setResults([]);
    try {
      const list = await resolve(trimmed);
      if (list.length === 0) setError('Nothing found for that.');
      setResults(list);
      // A pasted single-track URL resolves to exactly one result — go straight to grabbing
      if (list.length === 1 && extractMediaUrl(trimmed) && !list[0].isPlaylist) {
        await handleGrab(list[0]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGrab = async (item) => {
    if (!item?.url || grabbingUrl) return;
    setError(null);
    setGrabbingUrl(item.url);
    try {
      const imported = await grab(item.url);
      onImported(imported);
      setResults([]);
      setQuery('');
      setClipboardUrl(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setGrabbingUrl(null);
    }
  };

  const useClipboard = () => {
    if (!clipboardUrl) return;
    setQuery(clipboardUrl);
    setClipboardUrl(null);
    handleResolve(clipboardUrl);
  };

  const phaseLabel = {
    starting: 'Contacting…',
    downloading: 'Downloading…',
    converting: 'Converting to FLAC…',
    finishing: 'Writing metadata…',
    done: 'Done',
    loading: 'Loading into the lab…',
  };

  // ---- Offline: compact hint + setup instructions ---------------------------
  if (!online) {
    return (
      <div className={`p-4 mb-4 rounded-lg border border-dashed ${isDark ? 'border-zinc-700 bg-zinc-900/40' : 'border-stone-300 bg-stone-50'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`w-9 h-9 rounded-md flex items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-stone-200'}`}>
            <Link2 className={`w-4 h-4 ${t.textMuted}`} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className={`text-sm font-medium ${t.text}`}>
              {checking ? 'Looking for the helper…' : health && !health.ok ? 'Helper found, but it needs yt-dlp + ffmpeg' : 'Paste YouTube / SoundCloud links'}
            </p>
            <p className={`text-xs ${t.textDimmed}`}>
              {health && !health.ok
                ? `brew install yt-dlp ffmpeg — then it just works`
                : 'Start the local helper to grab tracks by link or by name.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSetup(v => !v)}
            className={`text-xs flex items-center gap-1 ${isDark ? 'text-ember-500 hover:text-ember-400' : 'text-ember-600 hover:text-ember-700'}`}
          >
            {showSetup ? 'Hide' : 'How'} {showSetup ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
        {showSetup && (
          <div className={`mt-3 text-xs space-y-2 ${t.textMuted}`}>
            <p>The helper runs yt-dlp on your Mac (YouTube blocks cloud servers, so it can't live on Vercel). One-time setup:</p>
            <pre className={`p-3 rounded-md font-mono text-[11px] leading-relaxed overflow-x-auto ${isDark ? 'bg-zinc-950 text-zinc-300' : 'bg-white text-stone-700 border border-stone-200'}`}>
{`brew install yt-dlp ffmpeg
cd ~/audio-analyzer-pro
npm run helper            # keep this running while you work
# or install it as a login item:
npm run helper:install`}
            </pre>
            <p>Finished tracks are also saved to <span className="font-mono">~/Music/Remix Lab/Sources</span> — add that folder to Live's Places.</p>
          </div>
        )}
      </div>
    );
  }

  // ---- Online ----------------------------------------------------------------
  return (
    <div className={`p-4 mb-4 rounded-lg border ${isDark ? 'border-zinc-700 bg-zinc-900' : 'border-stone-200 bg-white'}`}>
      <form
        onSubmit={(e) => { e.preventDefault(); handleResolve(); }}
        className="flex items-center gap-2"
      >
        <div className={`flex-1 flex items-center gap-2 px-3 rounded-md border ${isDark ? 'bg-zinc-950 border-zinc-700 focus-within:border-ember-500/60' : 'bg-stone-50 border-stone-200 focus-within:border-ember-600/50'}`}>
          <Link2 className={`w-4 h-4 flex-shrink-0 ${t.textDimmed}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onPaste={(e) => {
              const url = extractMediaUrl(e.clipboardData.getData('text'));
              if (url) {
                e.preventDefault();
                setQuery(url);
                handleResolve(url);
              }
            }}
            placeholder="Paste a YouTube / SoundCloud link, or type a track name"
            disabled={disabled || !!grabbingUrl}
            aria-label="Track link or search"
            className={`flex-1 py-2.5 bg-transparent text-sm outline-none ${t.text} ${isDark ? 'placeholder:text-zinc-500' : 'placeholder:text-stone-400'}`}
          />
          {query && !grabbingUrl && (
            <button type="button" onClick={() => { setQuery(''); setResults([]); setError(null); }} aria-label="Clear" className={t.textDimmed}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={disabled || !query.trim() || resolving || !!grabbingUrl}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium disabled:opacity-50 ${
            isDark ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600' : 'bg-ember-600 text-white hover:bg-ember-700'
          }`}
        >
          {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : extractMediaUrl(query) ? <Download className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          <span className="hidden sm:inline">{resolving ? 'Looking…' : extractMediaUrl(query) ? 'Grab' : 'Search'}</span>
        </button>
      </form>

      {/* Clipboard suggestion */}
      {clipboardUrl && !grabbingUrl && !query && (
        <button
          type="button"
          onClick={useClipboard}
          className={`mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-left ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-amber-50 hover:bg-amber-100 text-stone-700'}`}
        >
          <Clipboard className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-ember-500' : 'text-ember-600'}`} />
          <span className="truncate">Grab the link on your clipboard: <span className="font-mono">{clipboardUrl}</span></span>
        </button>
      )}

      {/* Job progress */}
      {job && (
        <div className="mt-3">
          <div className={`flex items-center justify-between text-xs mb-1.5 ${t.textMuted}`}>
            <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> {phaseLabel[job.phase] || 'Working…'}</span>
            <span className="font-mono tabular-nums">{job.progress}%</span>
          </div>
          <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-stone-200'}`}>
            <div className={`h-full transition-all duration-300 ${isDark ? 'bg-ember-500' : 'bg-ember-600'}`} style={{ width: `${job.progress}%` }} />
          </div>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}

      {/* Results */}
      {results.length > 0 && !grabbingUrl && (
        <ul className="mt-3 space-y-1.5 max-h-80 overflow-y-auto" aria-label="Search results">
          {results.map((r) => (
            <li key={r.url}>
              <button
                type="button"
                onClick={() => handleGrab(r)}
                disabled={r.isPlaylist}
                className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors disabled:opacity-60 ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-stone-100'}`}
              >
                <div className={`w-12 h-12 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-stone-200'}`}>
                  {r.thumbnail ? (
                    <img src={r.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : r.isPlaylist ? (
                    <ListMusic className={`w-5 h-5 ${t.textDimmed}`} />
                  ) : (
                    <Music className={`w-5 h-5 ${t.textDimmed}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${t.text}`}>{r.title}</div>
                  <div className={`text-xs truncate ${t.textMuted}`}>
                    {r.artist || r.uploader}{r.isPlaylist && r.entryCount ? ` · ${r.entryCount} tracks` : ''}
                  </div>
                </div>
                <div className={`flex items-center gap-2 text-xs flex-shrink-0 ${t.textDimmed}`}>
                  {r.duration != null && <span className="font-mono tabular-nums">{formatDuration(r.duration)}</span>}
                  {r.source === 'youtube' && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-500">YouTube</span>}
                  {r.source === 'soundcloud' && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/15 text-orange-500">SoundCloud</span>}
                  {!r.isPlaylist && <Download className="w-4 h-4" />}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
