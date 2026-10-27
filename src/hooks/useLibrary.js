import { useState, useEffect, useCallback, useRef } from 'react';
import {
  helperLibrary, helperPlaylists, helperStartSync, helperSyncJob,
  helperAnalysis, helperStartAnalysis, helperStopAnalysis,
} from '../lib/helper';

const CACHE_KEY = 'soundsauce_library_cache';
const POLL_MS = 2500;

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}

/**
 * The Apple Music index, from the local helper.
 *
 * The index lives on disk next to the stems (~/Music/Remix Lab/library.json), never on
 * Blob storage — it's 2,300 rows of someone's listening history and it costs nothing to
 * rebuild. A localStorage copy makes /sample usable the instant it opens, and while the
 * analysis batch is running the state is polled so the counts climb.
 */
export function useLibrary({ online } = {}) {
  const cached = readCache();
  const [tracks, setTracks] = useState(cached?.tracks || []);
  const [playlists, setPlaylists] = useState(cached?.playlists || []);
  const [stats, setStats] = useState(cached?.stats || null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [syncing, setSyncing] = useState(null); // { phase, progress }
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!online) { setLoading(false); return null; }
    try {
      const data = await helperLibrary();
      if (!mountedRef.current) return data;
      setTracks(data.tracks || []);
      setPlaylists(data.playlists || []);
      setStats(data.stats || null);
      setError(null);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ tracks: data.tracks, playlists: data.playlists, stats: data.stats }));
      } catch { /* over quota — the index still works, it just won't be instant next time */ }
      return data;
    } catch (err) {
      if (mountedRef.current) setError(err.message);
      return null;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [online]);

  useEffect(() => { load(); }, [load]);

  const refreshAnalysis = useCallback(async () => {
    if (!online) return null;
    try {
      const state = await helperAnalysis();
      if (mountedRef.current) setAnalysis(state);
      return state;
    } catch {
      return null;
    }
  }, [online]);

  useEffect(() => { refreshAnalysis(); }, [refreshAnalysis]);

  // While the batch runs, keep the counts moving — and reload the rows when it stops
  const running = !!analysis?.running;
  useEffect(() => {
    if (!running) return undefined;
    const interval = setInterval(async () => {
      const state = await refreshAnalysis();
      if (state && !state.running) load();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [running, refreshAnalysis, load]);

  const listPlaylists = useCallback(async () => {
    const { playlists: live } = await helperPlaylists();
    return live;
  }, []);

  const sync = useCallback(async (persistentId) => {
    setSyncing({ phase: 'starting', progress: 0 });
    try {
      const { id } = await helperStartSync(persistentId);
      for (;;) {
        await new Promise(r => setTimeout(r, 1200));
        const job = await helperSyncJob(id);
        if (mountedRef.current) setSyncing({ phase: job.phase, progress: job.progress });
        if (job.status === 'error') throw new Error(job.error || 'Sync failed');
        if (job.status === 'done') {
          await load();
          return job.result;
        }
      }
    } finally {
      if (mountedRef.current) setSyncing(null);
    }
  }, [load]);

  const startAnalysis = useCallback(async (opts) => {
    const state = await helperStartAnalysis(opts);
    if (mountedRef.current) setAnalysis(state);
    return state;
  }, []);

  const stopAnalysis = useCallback(async () => {
    await helperStopAnalysis();
    return refreshAnalysis();
  }, [refreshAnalysis]);

  return {
    tracks, playlists, stats, loading, error,
    analysis, syncing,
    reload: load, listPlaylists, sync, startAnalysis, stopAnalysis,
  };
}
