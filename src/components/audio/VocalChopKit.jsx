import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Scissors, Play, Square, Loader2, Package, FolderInput, Check } from 'lucide-react';
import { zipSync } from 'fflate';
import { detectPhrases, encodeWavSlice, buildChopFilename, CHOP_SENSITIVITY } from '../../utils/vocalChops';
import { buildStemFilename, buildPackFolderName } from '../../utils/stemFiles';
import { saveBlob } from '../../utils/remixPack';
import { helperPutFile } from '../../lib/helper';
import { SPECTRUM } from '../../utils/spectrum';

/**
 * VocalChopKit — slice the vocal stem into phrases at the gaps between lines.
 *
 * Runs detectPhrases() on the decoded vocal buffer the Stem Player already holds, lists
 * the chops with a bar number (from the BPM, bar 1 = 0:00), previews any of them, and
 * exports them all as stamped 16-bit WAVs — a zip in Downloads, or straight into
 * ~/Music/Remix Lab/Stems/<Artist - Title>/chops/ through the helper.
 *
 * @param {object} props
 * @param {() => AudioBuffer|null} props.getBuffer   vocal AudioBuffer (null until decoded)
 * @param {object} props.meta        { artist, title, bpm, key } for filenames
 * @param {string} props.mode        separation mode (for the base filename)
 * @param {boolean} props.helperOnline
 * @param {(time:number)=>void} [props.onSeek]   jump the Stem Player to a chop
 * @param {(msg:string)=>void} props.onToast
 * @param {(msg:string)=>void} props.onError
 */
export function VocalChopKit({ getBuffer, ready, meta, mode, helperOnline, onSeek, onToast, onError, theme, formatTime }) {
  const isDark = theme === 'dark';
  const [sensitivity, setSensitivity] = useState('normal');
  const [chops, setChops] = useState(null); // null = not run yet
  const [busy, setBusy] = useState(null);   // 'detect' | 'zip' | 'live'
  const [playingIndex, setPlayingIndex] = useState(null);
  const [saved, setSaved] = useState(false);
  const previewCtxRef = useRef(null);
  const previewSrcRef = useRef(null);

  const beat = meta?.bpm ? 60 / meta.bpm : 0;
  const bar = beat * 4;
  const barOf = useCallback((t) => (bar ? Math.floor(t / bar) + 1 : null), [bar]);

  // Detect whenever the sensitivity changes (and the first time the buffer is there)
  useEffect(() => {
    if (!ready) return;
    const buffer = getBuffer();
    if (!buffer) return;
    setBusy('detect');
    const opts = CHOP_SENSITIVITY[sensitivity];
    // Mono mixdown for the envelope
    const mono = new Float32Array(buffer.length);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < mono.length; i++) mono[i] += data[i] / buffer.numberOfChannels;
    }
    const found = detectPhrases(mono, buffer.sampleRate, opts);
    setChops(found);
    setSaved(false);
    setBusy(null);
  }, [ready, getBuffer, sensitivity]);

  const stopPreview = useCallback(() => {
    try { previewSrcRef.current?.stop(); } catch { /* already stopped */ }
    previewSrcRef.current = null;
    setPlayingIndex(null);
  }, []);

  const preview = useCallback(async (index) => {
    const buffer = getBuffer();
    const chop = chops?.[index];
    if (!buffer || !chop) return;
    if (playingIndex === index) { stopPreview(); return; }
    stopPreview();
    if (!previewCtxRef.current) previewCtxRef.current = new AudioContext();
    const ctx = previewCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onended = () => { if (previewSrcRef.current === src) { previewSrcRef.current = null; setPlayingIndex(null); } };
    src.start(0, chop.start, chop.end - chop.start);
    previewSrcRef.current = src;
    setPlayingIndex(index);
  }, [getBuffer, chops, playingIndex, stopPreview]);

  useEffect(() => () => {
    try { previewSrcRef.current?.stop(); } catch { /* ignore */ }
    previewCtxRef.current?.close().catch(() => {});
  }, []);

  const baseName = useMemo(() => buildStemFilename(meta, 'vocals', mode, 'wav').replace(/ - vocals\.wav$/i, ''), [meta, mode]);
  const folderName = useMemo(() => buildPackFolderName(meta), [meta]);

  const encodeAll = useCallback(() => {
    const buffer = getBuffer();
    return chops.map((chop, i) => ({
      name: buildChopFilename(baseName, i, barOf(chop.start)),
      bytes: encodeWavSlice(buffer, chop.start, chop.end),
    }));
  }, [getBuffer, chops, baseName, barOf]);

  const exportZip = useCallback(() => {
    if (!chops?.length) return;
    setBusy('zip');
    try {
      const entries = {};
      for (const f of encodeAll()) entries[f.name] = new Uint8Array(f.bytes);
      const zipped = zipSync(entries, { level: 0 });
      saveBlob(new Blob([zipped], { type: 'application/zip' }), `${folderName} - Vocal Chops.zip`);
      onToast?.(`${chops.length} chops zipped`);
    } catch (err) {
      onError?.(err.message || 'Could not build the zip');
    } finally {
      setBusy(null);
    }
  }, [chops, encodeAll, folderName, onToast, onError]);

  const exportToLive = useCallback(async () => {
    if (!chops?.length) return;
    setBusy('live');
    try {
      const files = encodeAll();
      for (const f of files) await helperPutFile(folderName, f.name, f.bytes, 'chops');
      setSaved(true);
      onToast?.(`${files.length} chops saved to Remix Lab › Stems › ${folderName} › chops`);
    } catch (err) {
      onError?.(err.message || 'Could not save the chops');
    } finally {
      setBusy(null);
    }
  }, [chops, encodeAll, folderName, onToast, onError]);

  const btn = `inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border font-mono text-[11px] lowercase transition-colors disabled:opacity-50 ${
    isDark ? 'bg-[#14171C] border-[#1C2027] text-[#E8ECF1] hover:border-[#2A3039]' : 'bg-[#F5F6F8] border-[#D9DDE3] text-[#0F1216] hover:border-[#B8BEC7]'
  }`;
  const muteText = isDark ? 'text-[#9AA4B0]' : 'text-[#4B5563]';
  const dimText = isDark ? 'text-[#7C8794]' : 'text-[#6B7280]';
  const total = chops?.reduce((s, c) => s + (c.end - c.start), 0) || 0;

  return (
    <section className={`rounded-lg border ${isDark ? 'bg-[#0D0F12] border-[#1C2027]' : 'bg-white border-[#D9DDE3]'}`} aria-label="Vocal chop kit">
      <div className={`flex flex-wrap items-center gap-3 px-4 py-3 ${chops?.length ? `border-b ${isDark ? 'border-[#1C2027]' : 'border-[#D9DDE3]'}` : ''}`}>
        <div className="flex items-center gap-2 mr-auto">
          <Scissors className="w-4 h-4" style={{ color: SPECTRUM.air }} />
          <h4 className={`font-display font-bold uppercase tracking-wide text-sm ${isDark ? 'text-[#E8ECF1]' : 'text-[#0F1216]'}`}>Vocal Chops</h4>
          <span className={`font-mono text-[11px] ${muteText}`}>
            {!ready ? 'waiting for the vocal stem…' : busy === 'detect' ? 'listening…' : chops ? `${chops.length} phrases · ${formatTime(total)} of vocal` : ''}
          </span>
        </div>

        <div className={`flex items-center rounded-md border overflow-hidden ${isDark ? 'border-[#1C2027]' : 'border-[#D9DDE3]'}`} role="radiogroup" aria-label="Chop sensitivity">
          {Object.entries(CHOP_SENSITIVITY).map(([id, s]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={sensitivity === id}
              onClick={() => setSensitivity(id)}
              className={`h-8 px-2.5 font-mono text-[11px] lowercase transition-colors ${
                sensitivity === id
                  ? 'bg-ember-500 text-[#0F1216]'
                  : isDark ? 'bg-[#14171C] text-[#9AA4B0] hover:text-[#E8ECF1]' : 'bg-[#F5F6F8] text-[#4B5563] hover:text-[#0F1216]'
              }`}
              title={`gap ≥ ${s.minGapMs} ms splits a phrase`}
            >{s.label}</button>
          ))}
        </div>

        <button type="button" onClick={exportZip} disabled={!chops?.length || !!busy} className={btn} title="Zip of 16-bit WAV chops with stamped names">
          {busy === 'zip' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />} zip
        </button>
        {helperOnline && (
          <button type="button" onClick={exportToLive} disabled={!chops?.length || !!busy} className={btn} title="Write the chops into ~/Music/Remix Lab/Stems/<track>/chops/ (Live's browser)">
            {busy === 'live' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <FolderInput className="w-3.5 h-3.5" />} to live
          </button>
        )}
      </div>

      {chops && chops.length === 0 && (
        <div className={`px-4 py-3 font-mono text-[12px] ${dimText}`}>No gaps found — try "tight", or this vocal is one continuous take.</div>
      )}

      {chops?.length > 0 && (
        <ul className="max-h-64 overflow-y-auto divide-y divide-[#1C2027]/60" aria-label="Vocal chops">
          {chops.map((chop, i) => {
            const b = barOf(chop.start);
            const isPlaying = playingIndex === i;
            return (
              <li key={i} className={`flex items-center gap-3 px-4 py-1.5 ${isDark ? 'hover:bg-[#14171C]' : 'hover:bg-[#F5F6F8]'}`}>
                <button
                  type="button"
                  onClick={() => preview(i)}
                  aria-label={isPlaying ? `Stop chop ${i + 1}` : `Play chop ${i + 1}`}
                  className={`w-7 h-7 flex items-center justify-center rounded-md border transition-colors ${
                    isPlaying ? 'bg-ember-500 border-ember-500 text-[#0F1216]' : isDark ? 'border-[#1C2027] text-[#9AA4B0] hover:border-[#2A3039]' : 'border-[#D9DDE3] text-[#4B5563] hover:border-[#B8BEC7]'
                  }`}
                >
                  {isPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
                <span className={`font-mono text-[12px] tabular-nums w-8 ${muteText}`}>{String(i + 1).padStart(2, '0')}</span>
                <button
                  type="button"
                  onClick={() => onSeek?.(chop.start)}
                  className={`font-mono text-[12px] tabular-nums text-left ${isDark ? 'text-[#E8ECF1]' : 'text-[#0F1216]'} hover:underline`}
                  title="Jump the Stem Player here"
                >
                  {formatTime(chop.start)}{b != null ? <span className={dimText}> · bar {b}</span> : null}
                </button>
                <span className={`font-mono text-[11px] tabular-nums ml-auto ${dimText}`}>{(chop.end - chop.start).toFixed(2)} s</span>
                <div className={`w-16 h-1 rounded-full overflow-hidden ${isDark ? 'bg-[#14171C]' : 'bg-[#E1E5EA]'}`} title={`${chop.peakDb} dB`}>
                  <div className="h-full" style={{ width: `${Math.max(6, 100 + chop.peakDb * 3)}%`, background: SPECTRUM.air }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
