import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const CURATED_DOWNLOADS_KEY = 'soundsauce_curated_downloads';

function getCuratedDownloads() {
  try {
    return JSON.parse(localStorage.getItem(CURATED_DOWNLOADS_KEY) || '[]');
  } catch { return []; }
}

function saveCuratedDownload(presetId, presetName) {
  const downloads = getCuratedDownloads();
  if (downloads.some(d => d.presetId === presetId)) return;
  downloads.unshift({ presetId, presetName, downloadedAt: new Date().toISOString() });
  localStorage.setItem(CURATED_DOWNLOADS_KEY, JSON.stringify(downloads));
}

/**
 * Hook to track and fetch user's downloaded presets.
 * Curated presets: localStorage (not tied to an analysis_id).
 * Community presets: Supabase downloads table.
 *
 * @returns {{ curatedDownloads: Array, communityDownloads: Array, loading: boolean, hasDownloadedPreset: (presetId: string) => boolean, trackCuratedDownload: (presetId: string, presetName: string) => void, hasCommunityDownload: (analysisId: string) => boolean, trackCommunityDownload: (analysisId: string) => Promise<void> }}
 */
export function useDownloadedPresets() {
  const { user } = useAuth();
  const [curatedDownloads, setCuratedDownloads] = useState(() => getCuratedDownloads());
  const [communityDownloads, setCommunityDownloads] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch community downloads from Supabase
  useEffect(() => {
    let cancelled = false;

    const fetchCommunityDownloads = async () => {
      if (!user) {
        setCommunityDownloads([]);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('downloads')
        .select('id, analysis_id, created_at, analyses:analysis_id(id, title, description, vital_preset_url, tags, profiles:user_id(username, avatar_url))')
        .eq('user_id', user.id)
        .not('analysis_id', 'is', null)
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (!error) {
        setCommunityDownloads(data || []);
      }
      setLoading(false);
    };

    fetchCommunityDownloads();
    return () => { cancelled = true; };
  }, [user]);

  /**
   * Check if a curated preset has been downloaded before.
   * @param {string} presetId - The curated preset ID (e.g., 'warm_bass')
   * @returns {boolean}
   */
  const hasDownloadedPreset = useCallback((presetId) => {
    return curatedDownloads.some(d => d.presetId === presetId);
  }, [curatedDownloads]);

  /**
   * Record a curated preset download in localStorage.
   * @param {string} presetId - The curated preset ID
   * @param {string} presetName - Human-readable preset name for display
   */
  const trackCuratedDownload = useCallback((presetId, presetName) => {
    saveCuratedDownload(presetId, presetName);
    setCuratedDownloads(getCuratedDownloads());
  }, []);

  /**
   * Check if a community preset has been downloaded before.
   * @param {string} analysisId - The analysis/recipe ID
   * @returns {boolean}
   */
  const hasCommunityDownload = useCallback((analysisId) => {
    return communityDownloads.some(d => d.analysis_id === analysisId);
  }, [communityDownloads]);

  // Ref for hasCommunityDownload to avoid stale closures in trackCommunityDownload
  const hasCommunityDownloadRef = useRef(hasCommunityDownload);
  useEffect(() => {
    hasCommunityDownloadRef.current = hasCommunityDownload;
  }, [hasCommunityDownload]);

  /**
   * Record a community preset download in Supabase.
   * Only inserts if the user hasn't already downloaded this preset.
   * @param {string} analysisId - The analysis/recipe ID
   */
  const trackCommunityDownload = useCallback(async (analysisId) => {
    if (!user) return;
    if (hasCommunityDownloadRef.current(analysisId)) return;

    await supabase
      .from('downloads')
      .insert({ analysis_id: analysisId, user_id: user.id });

    // Re-fetch community downloads to update state
    const { data } = await supabase
      .from('downloads')
      .select('id, analysis_id, created_at, analyses:analysis_id(id, title, description, vital_preset_url, tags, profiles:user_id(username, avatar_url))')
      .eq('user_id', user.id)
      .not('analysis_id', 'is', null)
      .order('created_at', { ascending: false });

    if (data) {
      setCommunityDownloads(data);
    }
  }, [user]);

  return { curatedDownloads, communityDownloads, loading, hasDownloadedPreset, trackCuratedDownload, hasCommunityDownload, trackCommunityDownload };
}
