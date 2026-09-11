import { useState, useEffect, useCallback, useRef } from 'react';
import { helperHealth, helperResolve, helperStartJob, helperJob, helperFileUrl, helperThumbUrl } from '../lib/helper';

const HEALTH_INTERVAL_MS = 15000;
const POLL_MS = 700;

/**
 * Talks to the local Remix Lab helper (yt-dlp companion).
 *
 * - Detects whether the helper is running (on mount, on focus, every 15s)
 * - resolve(query): URL or search text -> candidates
 * - grab(url): download + convert, polling progress, returns { arrayBuffer, meta }
 */
export function useHelper() {
  const [health, setHealth] = useState(null); // null = unknown/offline, object = online
  const [checking, setChecking] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [job, setJob] = useState(null); // { id, status, phase, progress, error }
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const check = useCallback(async () => {
    const h = await helperHealth();
    if (!mountedRef.current) return;
    setHealth(h?.ok ? h : (h ? { ...h, ok: false } : null));
    setChecking(false);
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, HEALTH_INTERVAL_MS);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [check]);

  const resolve = useCallback(async (query) => {
    setResolving(true);
    try {
      const { results } = await helperResolve(query);
      return results || [];
    } finally {
      if (mountedRef.current) setResolving(false);
    }
  }, []);

  /**
   * Download a track through the helper.
   * @returns {Promise<{ arrayBuffer: ArrayBuffer, meta: object }>}
   */
  const grab = useCallback(async (url) => {
    const { id } = await helperStartJob(url);
    setJob({ id, status: 'running', phase: 'starting', progress: 0, error: null });

    let state;
    for (;;) {
      await new Promise(r => setTimeout(r, POLL_MS));
      state = await helperJob(id);
      if (mountedRef.current) setJob({ id, ...state });
      if (state.status === 'done' || state.status === 'error') break;
    }
    if (state.status === 'error') {
      throw new Error(state.error || 'Download failed');
    }

    // Pull the FLAC into memory so the Lab can decode it like an uploaded file
    if (mountedRef.current) setJob(prev => ({ ...prev, phase: 'loading', progress: 100 }));
    const res = await fetch(helperFileUrl(id));
    if (!res.ok) throw new Error('Could not read the downloaded file from the helper');
    const arrayBuffer = await res.arrayBuffer();

    const meta = {
      ...state.result,
      thumbnailUrl: state.result?.hasThumbnail ? helperThumbUrl(id) : null,
    };
    if (mountedRef.current) setJob(null);
    return { arrayBuffer, meta };
  }, []);

  const clearJob = useCallback(() => setJob(null), []);

  return {
    online: !!health?.ok,
    health,
    checking,
    recheck: check,
    resolving,
    resolve,
    job,
    grab,
    clearJob,
  };
}
