import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useStemPlayer — synced playback of every stem at once with per-stem mute / solo.
 *
 * Owns its own AudioContext (independent of useAudioProcessor's single-source player):
 * one AudioBufferSourceNode per stem → per-stem GainNode → master GainNode → destination,
 * all started on the same context timestamp so they stay sample-locked. Mute / solo only
 * touch the gains, so toggling never interrupts playback. Seeking and looping rebuild the
 * sources (Web Audio sources are one-shot).
 *
 * Also produces a lightweight min/max waveform per stem (WAVEFORM_COLUMNS columns) for the
 * arrangement map — computed synchronously right after decode, it's only ~1k columns.
 *
 * @param {object} args
 * @param {string[]} args.stemTypes            e.g. ['vocals', 'other'] or ['vocals','drums','bass','other']
 * @param {(type: string) => Promise<ArrayBuffer|null>} args.getStemAudio  resolves stem audio bytes
 * @param {() => void} [args.onPlay]           called when playback starts (stop other players)
 */
export const WAVEFORM_COLUMNS = 1200;

/** Effective gain for a stem given the mute / solo maps: solo wins, then mute */
export function stemGain(type, muted, soloed) {
  const anySolo = Object.values(soloed).some(Boolean);
  if (anySolo) return soloed[type] ? 1 : 0;
  return muted[type] ? 0 : 1;
}

export function useStemPlayer({ stemTypes, getStemAudio, onPlay }) {
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState({});
  const [soloed, setSoloed] = useState({});
  const [loop, setLoop] = useState(null); // { start, end } seconds, or null
  const [waveforms, setWaveforms] = useState({}); // { [type]: { mins: Float32Array, maxes: Float32Array } }

  const ctxRef = useRef(null);
  const buffersRef = useRef({});
  const sourcesRef = useRef({});
  const gainsRef = useRef({});
  const masterRef = useRef(null);
  const startCtxTimeRef = useRef(0);   // ctx.currentTime when the current run started
  const startOffsetRef = useRef(0);    // track position (s) at that moment
  const positionRef = useRef(0);       // last known position, read by the UI at 60fps
  const isPlayingRef = useRef(false);
  const loopRef = useRef(null);
  const loadedForRef = useRef('');     // stemTypes signature the buffers belong to
  const loadingRef = useRef(false);
  const onPlayRef = useRef(onPlay);
  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      masterRef.current = ctxRef.current.createGain();
      masterRef.current.connect(ctxRef.current.destination);
    }
    return ctxRef.current;
  }, []);

  // Push mute / solo changes into the live gains (click-free ramp)
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    for (const [type, gain] of Object.entries(gainsRef.current)) {
      const target = stemGain(type, muted, soloed);
      gain.gain.setTargetAtTime(target, ctx.currentTime, 0.012);
    }
  }, [muted, soloed]);

  const stopSources = useCallback(() => {
    for (const src of Object.values(sourcesRef.current)) {
      try { src.onended = null; src.stop(); src.disconnect(); } catch { /* already stopped */ }
    }
    sourcesRef.current = {};
  }, []);

  const currentPosition = useCallback(() => {
    if (!isPlayingRef.current || !ctxRef.current) return positionRef.current;
    const elapsed = ctxRef.current.currentTime - startCtxTimeRef.current;
    let pos = startOffsetRef.current + elapsed;
    const lp = loopRef.current;
    if (lp && lp.end > lp.start && pos >= lp.end) {
      pos = lp.start + ((pos - lp.start) % (lp.end - lp.start));
    }
    return pos;
  }, []);

  /** Build fresh sources for every stem and start them together at `offset` seconds */
  const startAt = useCallback((offset) => {
    const ctx = getContext();
    stopSources();
    const lp = loopRef.current;
    const when = ctx.currentTime + 0.03;
    let firstSource = null;
    for (const type of Object.keys(buffersRef.current)) {
      const buffer = buffersRef.current[type];
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      if (lp && lp.end > lp.start) {
        src.loop = true;
        src.loopStart = lp.start;
        src.loopEnd = Math.min(lp.end, buffer.duration);
      }
      let gain = gainsRef.current[type];
      if (!gain) {
        gain = ctx.createGain();
        gain.connect(masterRef.current);
        gainsRef.current[type] = gain;
      }
      gain.gain.value = stemGain(type, muted, soloed);
      src.connect(gain);
      src.start(when, Math.max(0, Math.min(offset, buffer.duration - 0.01)));
      sourcesRef.current[type] = src;
      if (!firstSource) firstSource = src;
    }
    startCtxTimeRef.current = when;
    startOffsetRef.current = offset;
    isPlayingRef.current = true;
    setIsPlaying(true);
    if (firstSource) {
      // Natural end of the track (loops never end on their own)
      firstSource.onended = () => {
        if (!isPlayingRef.current || sourcesRef.current[Object.keys(buffersRef.current)[0]] !== firstSource) return;
        isPlayingRef.current = false;
        setIsPlaying(false);
        positionRef.current = 0;
        stopSources();
      };
    }
  }, [getContext, stopSources, muted, soloed]);

  /** Decode every stem (once per stem set) */
  const load = useCallback(async () => {
    const signature = stemTypes.join(',');
    if (loadingRef.current || (loadedForRef.current === signature && status === 'ready')) return;
    loadingRef.current = true;
    setStatus('loading');
    setError(null);
    try {
      const ctx = getContext();
      const buffers = {};
      const shapes = {};
      let maxDuration = 0;
      for (const type of stemTypes) {
        const bytes = await getStemAudio(type);
        if (!bytes) throw new Error(`Couldn't load the ${type} stem`);
        const buffer = await ctx.decodeAudioData(bytes.slice(0));
        buffers[type] = buffer;
        shapes[type] = summarise(buffer);
        maxDuration = Math.max(maxDuration, buffer.duration);
      }
      buffersRef.current = buffers;
      loadedForRef.current = signature;
      setWaveforms(shapes);
      setDuration(maxDuration);
      positionRef.current = 0;
      setStatus('ready');
    } catch (err) {
      console.error('Stem player load failed:', err);
      setError(err.message || 'Failed to load stems');
      setStatus('error');
    } finally {
      loadingRef.current = false;
    }
  }, [stemTypes, getStemAudio, getContext, status]);

  const play = useCallback(async (from) => {
    if (status !== 'ready') return;
    const ctx = getContext();
    if (ctx.state === 'suspended') await ctx.resume();
    onPlayRef.current?.();
    const offset = from != null ? from : positionRef.current;
    startAt(offset >= duration - 0.05 ? 0 : offset);
  }, [status, getContext, startAt, duration]);

  const pause = useCallback(() => {
    if (!isPlayingRef.current) return;
    positionRef.current = currentPosition();
    isPlayingRef.current = false;
    setIsPlaying(false);
    stopSources();
  }, [currentPosition, stopSources]);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) pause(); else play();
  }, [pause, play]);

  const seek = useCallback((time) => {
    const t = Math.max(0, Math.min(duration, time));
    positionRef.current = t;
    if (isPlayingRef.current) startAt(t);
  }, [duration, startAt]);

  const toggleMute = useCallback((type) => {
    setMuted(prev => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const toggleSolo = useCallback((type) => {
    setSoloed(prev => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const clearMix = useCallback(() => { setMuted({}); setSoloed({}); }, []);

  /** Decoded AudioBuffer for a stem (null until loaded) — used by the chop kit */
  const getBuffer = useCallback((type) => buffersRef.current[type] || null, []);

  /** Set (or clear with null) a loop region; restarts sources if playing so the loop takes */
  const setLoopRegion = useCallback((region) => {
    const next = region && region.end - region.start > 0.05 ? region : null;
    loopRef.current = next;
    setLoop(next);
    if (isPlayingRef.current) {
      const pos = currentPosition();
      const inside = next && pos >= next.start && pos < next.end;
      startAt(next && !inside ? next.start : pos);
    }
  }, [currentPosition, startAt]);

  // Keep positionRef fresh while playing (cheap; the UI reads it from rAF)
  useEffect(() => {
    if (!isPlaying) return;
    let raf;
    const tick = () => { positionRef.current = currentPosition(); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, currentPosition]);

  // Stem set changed (new separation / reset) → drop everything
  useEffect(() => {
    const signature = stemTypes.join(',');
    if (loadedForRef.current && loadedForRef.current !== signature) {
      stopSources();
      isPlayingRef.current = false;
      setIsPlaying(false);
      buffersRef.current = {};
      loadedForRef.current = '';
      setWaveforms({});
      setDuration(0);
      setStatus('idle');
      setMuted({});
      setSoloed({});
      loopRef.current = null;
      setLoop(null);
      positionRef.current = 0;
    }
  }, [stemTypes, stopSources]);

  // Teardown
  useEffect(() => () => {
    stopSources();
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
  }, [stopSources]);

  return {
    status, error, isPlaying, duration, muted, soloed, loop, waveforms,
    positionRef,
    load, play, pause, togglePlay, seek, toggleMute, toggleSolo, clearMix, setLoopRegion, getBuffer,
  };
}

/** Min/max per column across all channels — enough for a lane-height waveform */
function summarise(buffer) {
  const mins = new Float32Array(WAVEFORM_COLUMNS);
  const maxes = new Float32Array(WAVEFORM_COLUMNS);
  const len = buffer.length;
  const step = len / WAVEFORM_COLUMNS;
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  // Sample at most ~64 points per column per channel — plenty for a silhouette
  for (let col = 0; col < WAVEFORM_COLUMNS; col++) {
    const start = Math.floor(col * step);
    const end = Math.min(len, Math.floor((col + 1) * step));
    const stride = Math.max(1, Math.floor((end - start) / 64));
    let mn = 0, mx = 0;
    for (const data of channels) {
      for (let i = start; i < end; i += stride) {
        const v = data[i];
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
    }
    mins[col] = mn;
    maxes[col] = mx;
  }
  return { mins, maxes };
}
