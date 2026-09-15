import { useState, useEffect, useCallback, useRef } from 'react';
import { Link2, Search, Loader2, Download, Clipboard, ChevronDown, ChevronUp, Music, X, ListMusic, Check, Copy } from 'lucide-react';
import { extractMediaUrl, formatDuration } from '../../lib/helper';

/**
 * LinkImport — paste a YouTube / SoundCloud link (or type a song name) and pull the
 * audio through the local helper as a lossless FLAC with real artist/title metadata.
 *
 * Props come from useHelper(): online, health, checking, resolving, resolve, job, grab.
 * onImported({ arrayBuffer, meta }) hands the file to the Lab. A playlist / set URL
 * resolves to its entries — pick one.
 */
export function LinkImport({ helper, onImported, hero = false, theme, t }) {
  const { online, health, checking, resolving, resolve, job, grab } = helper;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [clipboardUrl, setClipboardUrl] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [grabbingUrl, setGrabbingUrl] = useState(null);
  const [copied, setCopied] = useState(false);
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

  // Paste anywhere: Cmd+V on the page (not inside another input) with a YouTube /
  // SoundCloud link grabs it immediately — no need to find the box first.
  const handleResolveRef = useRef(null);
  useEffect(() => {
    if (!online) return undefined;
    const onPaste = (e) => {
      const target = e.target;
      const inField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (inField && target !== inputRef.current) return;
      const url = extractMediaUrl(e.clipboardData?.getData('text'));
      if (!url) return;
      e.preventDefault();
      setQuery(url);
      handleResolveRef.current?.(url);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [online]);

  const handleResolve = async (q = query) => {
    const trimmed = q.trim();
    if (!trimmed || resolving) return;
    setError(null);
    setResults([]);
    try {
      const list = await resolve(trimmed);
      // list.notice = the helper couldn't use the link (DRM) and searched by name instead
      if (list.notice) setError(list.notice);
      else if (list.length === 0) setError('Nothing found for that.');
      setResults(list);
      // A pasted single-track URL resolves to exactly one result — go straight to grabbing
      if (list.length === 1 && extractMediaUrl(trimmed) && !list[0].isPlaylist && !list.notice) {
        await handleGrab(list[0]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  handleResolveRef.current = handleResolve;

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
      if (err.code === 'DRM') {
        // Offer the same track from elsewhere: search by name, YouTube results included
        const name = [item.artist || item.uploader, item.title].filter(Boolean).join(' ');
        if (name) {
          setGrabbingUrl(null);
          setQuery(name);
          try {
            const list = (await resolve(name)).filter(r => r.url !== item.url);
            setResults(list);
            if (list.length) setError(`${err.message} Here's what else is out there for "${name}":`);
          } catch { /* keep the DRM message */ }
        }
      }
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
  const copyCmd = async () => {
    try { await navigator.clipboard.writeText('npm run helper'); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };
  if (!online) {
    return (
      <div className={`p-4 mb-4 rounded-lg border border-dashed ${isDark ? 'border-[#2A3039] bg-[#0D0F12]/60' : 'border-[#B8BEC7] bg-[#F5F6F8]'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`w-9 h-9 rounded-md flex items-center justify-center border ${isDark ? 'bg-[#14171C] border-[#1C2027]' : 'bg-[#EDEFF3] border-[#D9DDE3]'}`}>
            <Link2 className={`w-4 h-4 ${t.textMuted}`} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className={`font-display font-bold uppercase tracking-wide text-[13px] ${t.text}`}>
              {checking ? 'Looking for the helper…' : health && !health.ok ? 'Helper found, but it needs yt-dlp + ffmpeg' : 'Paste-a-link is off'}
            </p>
            <p className={`font-mono text-[11px] mt-0.5 ${t.textDimmed}`}>
              {health && !health.ok
                ? 'brew install yt-dlp ffmpeg — then it just works'
                : window.location.protocol === 'https:'
                  ? 'Helper not reachable. If the menubar dot is green, Chrome is blocking local network access — see "How".'
                  : 'Run the helper on this Mac and YouTube / SoundCloud links turn into FLACs here.'}
            </p>
          </div>
          {!checking && !(health && !health.ok) && (
            <button type="button" onClick={copyCmd} className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] ${t.button}`} title="Copy the command, run it in a terminal in the project folder">
              {copied ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />} npm run helper
            </button>
          )}
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
            <pre className={`p-3 rounded-md font-mono text-[11px] leading-relaxed overflow-x-auto border ${isDark ? 'bg-[#0A0C0F] text-[#9AA4B0] border-[#1C2027]' : 'bg-white text-[#4B5563] border-[#D9DDE3]'}`}>
{`brew install yt-dlp ffmpeg
cd ~/audio-analyzer-pro
npm run helper            # keep this running while you work
# or install it as a login item:
npm run helper:install`}
            </pre>
            <p>Finished tracks are also saved to <span className="font-mono">~/Music/Remix Lab/Sources</span> — add that folder to Live's Places.</p>
            {window.location.protocol === 'https:' && (
              <p className={`p-3 rounded-md border ${isDark ? 'border-ember-500/40 bg-[#14171C]' : 'border-ember-600/40 bg-white'}`}>
                <span className={`font-display font-bold uppercase tracking-wide text-[11px] ${t.text}`}>Helper running but still "off"?</span><br />
                This site is on HTTPS and the helper is on <span className="font-mono">localhost</span>, so Chrome asks permission once (“access devices on your local network”). If it was dismissed: click the icon left of the address → <span className="font-mono">Site settings</span> → <span className="font-mono">Local network access</span> → Allow, then reload. Safari doesn't allow this at all — use Chrome, or run the Lab locally with <span className="font-mono">npm run dev:full</span>.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---- Online ----------------------------------------------------------------
  const isUrl = !!extractMediaUrl(query);
  return (
    <div className={`${hero ? 'p-5 sm:p-6' : 'p-3'} mb-4 rounded-lg border ${isDark ? 'border-[#1C2027] bg-[#0D0F12]' : 'border-[#D9DDE3] bg-white'}`}>
      {hero && (
        <div className="mb-4">
          <h3 className={`font-display font-extrabold uppercase tracking-tight text-xl ${t.text}`}>Paste a link. Get the file.</h3>
          <p className={`font-mono text-[12px] mt-1 ${t.textMuted}`}>YouTube or SoundCloud → lossless FLAC, loaded here and saved to <span className={t.text}>~/Music/Remix Lab/Sources</span>. Cmd+V anywhere on this page works too.</p>
        </div>
      )}
      <form
        onSubmit={(e) => { e.preventDefault(); handleResolve(); }}
        className="flex items-center gap-2"
      >
        <div className={`flex-1 flex items-center gap-2 px-3 rounded-md border ${isDark ? 'bg-[#0A0C0F] border-[#1C2027] focus-within:border-ember-500/70' : 'bg-[#F5F6F8] border-[#D9DDE3] focus-within:border-ember-600/60'}`}>
          <span className={`font-mono text-sm select-none ${isDark ? 'text-ember-500' : 'text-ember-600'}`} aria-hidden="true">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={hero ? 'https://soundcloud.com/… or youtube.com/watch?v=…' : 'paste a link, or type a track name'}
            disabled={!!grabbingUrl}
            aria-label="Track link or search"
            className={`flex-1 py-2.5 bg-transparent font-mono text-[13px] outline-none ${t.text} ${isDark ? 'placeholder:text-[#4B5563]' : 'placeholder:text-[#9AA4B0]'}`}
          />
          {query && !grabbingUrl && (
            <button type="button" onClick={() => { setQuery(''); setResults([]); setError(null); }} aria-label="Clear" className={t.textDimmed}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!query.trim() || resolving || !!grabbingUrl}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold whitespace-nowrap disabled:opacity-50 ${
            isDark ? 'bg-ember-500 text-[#1A1400] hover:bg-ember-400' : 'bg-ember-600 text-white hover:bg-ember-700'
          }`}
        >
          {resolving || grabbingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : isUrl || !query ? <Download className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          <span>{grabbingUrl ? 'Getting…' : resolving ? 'Looking…' : isUrl || !query ? 'Get file' : 'Search'}</span>
        </button>
      </form>

      {/* Clipboard suggestion */}
      {clipboardUrl && !grabbingUrl && !query && (
        <button
          type="button"
          onClick={useClipboard}
          className={`mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-md font-mono text-[11px] text-left border ${isDark ? 'bg-[#14171C] border-[#1C2027] hover:border-[#2A3039] text-[#9AA4B0]' : 'bg-[#F5F6F8] border-[#D9DDE3] hover:border-[#B8BEC7] text-[#4B5563]'}`}
        >
          <Clipboard className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-ember-500' : 'text-ember-600'}`} />
          <span className="truncate">Grab the link on your clipboard: <span className="font-mono">{clipboardUrl}</span></span>
        </button>
      )}

      {job && (
        <div className="mt-3">
          <div className={`flex items-center justify-between text-xs mb-1.5 ${t.textMuted}`}>
            <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> {phaseLabel[job.phase] || 'Working…'}</span>
            <span className="font-mono tabular-nums">{job.progress}%</span>
          </div>
          <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-[#14171C]' : 'bg-[#EDEFF3]'}`}>
            <div className="h-full transition-all duration-300 bg-spectrum" style={{ width: `${job.progress}%` }} />
          </div>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}

      {results.length > 0 && !grabbingUrl && (
        <ul className="mt-3 space-y-1.5 max-h-80 overflow-y-auto" aria-label="Search results">
          {results.map((r) => (
            <li key={r.url} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleGrab(r)}
                disabled={r.isPlaylist}
                className={`flex-1 min-w-0 flex items-center gap-3 p-2 rounded-md text-left transition-colors disabled:opacity-60 ${isDark ? 'hover:bg-[#14171C]' : 'hover:bg-[#F5F6F8]'}`}
              >
                <div className={`w-12 h-12 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center border ${isDark ? 'bg-[#14171C] border-[#1C2027]' : 'bg-[#EDEFF3] border-[#D9DDE3]'}`}>
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
                  <div className={`font-mono text-[11px] truncate ${t.textMuted}`}>
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
