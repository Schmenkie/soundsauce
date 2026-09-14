import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchVault, saveVault, deleteVaultBlobs, readVaultCache } from '../lib/vault';
import { useAuth } from '../contexts/AuthContext';

/**
 * The Acapella Vault — every separated track, as a list you can search, filter,
 * restore, and prune. Loads from localStorage cache instantly, then refreshes from
 * /api/vault when the lab is unlocked. Writes are whole-index and serialised through
 * a ref so rapid keep/save updates don't race each other.
 */
export function useVault() {
  const { isSignedIn } = useAuth();
  const cached = readVaultCache();
  const [tracks, setTracks] = useState(cached?.tracks || []);
  const [storage, setStorage] = useState(cached?.storage || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const tracksRef = useRef(tracks);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  const saveChain = useRef(Promise.resolve());

  const refresh = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVault();
      setTracks(data.tracks);
      tracksRef.current = data.tracks;
      setStorage(data.storage || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => { refresh(); }, [refresh]);

  /** Persist the given track list (serialised). Optimistic: state updates first. */
  const persist = useCallback((nextTracks) => {
    setTracks(nextTracks);
    tracksRef.current = nextTracks;
    saveChain.current = saveChain.current
      .then(() => saveVault(nextTracks))
      .catch((err) => {
        console.error('Vault save failed:', err);
        setError(err.message);
      });
    return saveChain.current;
  }, []);

  /**
   * Insert or merge a track by id. `patch` may be partial; stems are merged per type.
   */
  const upsertTrack = useCallback((patch) => {
    if (!patch?.id) return null;
    const now = new Date().toISOString();
    const existing = tracksRef.current.find(t => t.id === patch.id);
    const merged = existing
      ? {
          ...existing,
          ...patch,
          stems: { ...(existing.stems || {}), ...(patch.stems || {}) },
          updatedAt: now,
        }
      : { createdAt: now, updatedAt: now, notes: '', tags: [], stems: {}, ...patch };
    const next = existing
      ? tracksRef.current.map(t => (t.id === patch.id ? merged : t))
      : [merged, ...tracksRef.current];
    persist(next);
    return merged;
  }, [persist]);

  /** Remove a track and (optionally) delete its blobs to free storage. */
  const removeTrack = useCallback(async (id, { deleteBlobs = true } = {}) => {
    const track = tracksRef.current.find(t => t.id === id);
    if (!track) return;
    const next = tracksRef.current.filter(t => t.id !== id);
    await persist(next);
    if (deleteBlobs) {
      const urls = [track.audioUrl, ...Object.values(track.stems || {}).map(s => s?.url)].filter(Boolean);
      try {
        await deleteVaultBlobs(urls);
        // Pull fresh storage numbers now that blobs are gone
        const data = await fetchVault();
        setStorage(data.storage || null);
      } catch (err) {
        console.warn('Blob cleanup failed:', err.message);
      }
    }
  }, [persist]);

  const getTrack = useCallback((id) => tracksRef.current.find(t => t.id === id) || null, []);

  return {
    tracks,
    storage,
    loading,
    error,
    refresh,
    upsertTrack,
    removeTrack,
    getTrack,
  };
}
