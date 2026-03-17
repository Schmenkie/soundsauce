import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { trackRecipePublished } from '../lib/posthog';

const STORAGE_KEY = 'audioAnalyzerHistory';
const MIGRATED_KEY = 'audioAnalyzerHistory_migrated';
const MAX_HISTORY_ITEMS = 50;

/**
 * Load saved analysis history from localStorage.
 * @returns {object[]} Array of history entries
 */
function loadLocalHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * Persist history array to localStorage.
 * @param {object[]} history - History entries to save
 */
function saveLocalHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

/**
 * Convert a local history entry to Supabase analyses row format.
 * @param {object} entry - Local history entry
 * @param {string} userId - Supabase user UUID
 * @returns {object} Supabase-compatible row object
 */
function toSupabaseRow(entry, userId) {
  return {
    user_id: userId,
    title: entry.title || 'Untitled',
    instrument: entry.instrument || null,
    stem_type: entry.analyzedStem || null,
    results: {
      features: entry.features || {},
      recommendations: entry.recommendations || {},
      detectedInstruments: entry.detectedInstruments || {},
    },
    audio_url: entry.audioUrl || null,
    audio_filename: entry.audioFilename || null,
    stem_urls: entry.stemUrls || null,
    is_public: false,
    created_at: entry.timestamp ? new Date(entry.timestamp).toISOString() : new Date().toISOString(),
  };
}

/**
 * Convert a Supabase analyses row to the history entry format used by components.
 * @param {object} row - Supabase row from analyses table
 * @returns {object} Normalized history entry
 */
function fromSupabaseRow(row) {
  return {
    id: row.id,
    title: row.title,
    instrument: row.instrument,
    timestamp: new Date(row.created_at).getTime(),
    features: row.results?.features || {},
    recommendations: row.results?.recommendations || {},
    detectedInstruments: row.results?.detectedInstruments || {},
    analyzedStem: row.stem_type,
    audioUrl: row.audio_url || null,
    audioFilename: row.audio_filename || null,
    stemUrls: row.stem_urls || null,
    isPublic: row.is_public || false,
    isCloud: true,
  };
}

/**
 * Hook for managing analysis history with hybrid storage.
 * Uses Supabase when authenticated, falls back to localStorage for guests.
 * Migrates existing localStorage data to Supabase on first sign-in.
 *
 * @returns {{ history: object[], isOpen: boolean, setIsOpen: function, toggleOpen: function, addToHistory: function, deleteFromHistory: function, clearHistory: function, togglePublic: function, publishRecipe: function, cloudLoaded: boolean }}
 */
export function useHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState(loadLocalHistory);
  const [isOpen, setIsOpen] = useState(false);
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const migrating = useRef(false);
  const historyRef = useRef(history);
  useEffect(() => { historyRef.current = history; }, [history]);

  // When user signs in: load cloud history and migrate local data
  useEffect(() => {
    if (!user) {
      // Guest mode: load from localStorage
      setHistory(loadLocalHistory());
      setCloudLoaded(false);
      return;
    }

    let cancelled = false;

    async function loadCloud() {
      // Fetch user's analyses from Supabase
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(MAX_HISTORY_ITEMS);

      if (cancelled) return;

      if (error) {
        console.error('Failed to load cloud history:', error);
        // Fall back to localStorage
        setHistory(loadLocalHistory());
      } else {
        setHistory(data.map(fromSupabaseRow));
      }
      setCloudLoaded(true);

      // Migrate localStorage data if not done yet
      if (!migrating.current && !localStorage.getItem(MIGRATED_KEY)) {
        await migrateLocalToCloud(user.id);
      }
    }

    loadCloud();
    return () => { cancelled = true; };
  }, [user]);

  /**
   * Migrate existing localStorage history to Supabase (one-time on first sign-in).
   * @param {string} userId - Supabase user UUID
   * @returns {Promise<void>}
   */
  async function migrateLocalToCloud(userId) {
    const localHistory = loadLocalHistory();
    if (localHistory.length === 0) {
      localStorage.setItem(MIGRATED_KEY, 'true');
      return;
    }

    migrating.current = true;
    const rows = localHistory.map(entry => toSupabaseRow(entry, userId));

    const { error } = await supabase
      .from('analyses')
      .insert(rows);

    if (!error) {
      localStorage.setItem(MIGRATED_KEY, 'true');
      // Reload from cloud to get proper UUIDs
      const { data } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(MAX_HISTORY_ITEMS);

      if (data) setHistory(data.map(fromSupabaseRow));
    } else {
      console.error('Migration failed:', error);
    }
    migrating.current = false;
  }

  // Save to localStorage for guests (no-op when signed in)
  useEffect(() => {
    if (!user) {
      saveLocalHistory(history);
    }
  }, [history, user]);

  /**
   * Save an analysis entry. Cloud save when authenticated, localStorage for guests.
   * @param {object} entry - Analysis entry with title, features, recommendations, etc.
   * @returns {Promise<void>}
   */
  const addToHistory = useCallback(async (entry) => {
    if (user) {
      // Cloud save
      const row = toSupabaseRow(entry, user.id);
      const { data, error } = await supabase
        .from('analyses')
        .insert(row)
        .select()
        .single();

      if (!error && data) {
        setHistory(prev => [fromSupabaseRow(data), ...prev].slice(0, MAX_HISTORY_ITEMS));
      } else {
        console.error('Failed to save analysis:', error);
      }
    } else {
      // Local save
      setHistory(prev => [entry, ...prev].slice(0, MAX_HISTORY_ITEMS));
    }
  }, [user]);

  /**
   * Delete an analysis entry by ID from Supabase or localStorage.
   * @param {string} id - Analysis entry ID
   * @returns {Promise<void>}
   */
  const deleteFromHistory = useCallback(async (id) => {
    if (user) {
      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', id);

      if (!error) {
        setHistory(prev => prev.filter(item => item.id !== id));
      } else {
        console.error('Failed to delete analysis:', error);
      }
    } else {
      setHistory(prev => prev.filter(item => item.id !== id));
    }
  }, [user]);

  /**
   * Clear the history panel. For auth'd users, clears local view only (data remains in Supabase).
   * For guests, permanently removes from localStorage.
   * @returns {Promise<void>}
   */
  const clearHistory = useCallback(async () => {
    if (user) {
      // For authenticated users: just clear the local panel view.
      // Data remains in Supabase (visible on Profile, discoverable via Discover, etc.)
      if (!window.confirm('Clear analysis history from this panel? Your analyses are still saved to your account.')) return;
      setHistory([]);
    } else {
      // For guests: actually remove from localStorage since that's the only copy
      if (!window.confirm('Are you sure you want to clear all history? This cannot be undone.')) return;
      setHistory([]);
    }
  }, [user]);

  /**
   * Toggle an analysis between public and private visibility.
   * @param {string} id - Analysis entry ID
   * @returns {Promise<void>}
   */
  const togglePublic = useCallback(async (id) => {
    if (!user) return; // Only available for authenticated users

    const currentItem = historyRef.current.find(h => h.id === id);
    if (!currentItem) return;

    const newValue = !currentItem.isPublic;
    const { error } = await supabase
      .from('analyses')
      .update({ is_public: newValue })
      .eq('id', id);

    if (!error) {
      setHistory(prev => prev.map(h =>
        h.id === id ? { ...h, isPublic: newValue } : h
      ));
    } else {
      console.error('Failed to toggle public:', error);
    }
  }, [user]);

  /**
   * Publish an analysis as a public Sound Sauce with metadata.
   * Sets is_public=true and updates title, description, tags, and optional preset URL.
   * @param {string} id - Analysis entry ID
   * @param {{ title?: string, description?: string, tags?: string[], vitalPresetUrl?: string }} metadata - Publish metadata
   * @returns {Promise<boolean>} True if published successfully
   */
  const publishRecipe = useCallback(async (id, { title, description, tags, vitalPresetUrl }) => {
    if (!user) return false;

    const updates = {
      is_public: true,
      description: description || null,
      tags: tags || [],
    };
    if (title) updates.title = title;
    if (vitalPresetUrl) updates.vital_preset_url = vitalPresetUrl;

    const { error } = await supabase
      .from('analyses')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setHistory(prev => prev.map(h =>
        h.id === id ? { ...h, isPublic: true, title: title || h.title } : h
      ));
      trackRecipePublished(id, tags || []);
      // Notify listeners that a recipe was published (cache invalidation)
      window.dispatchEvent(new CustomEvent('recipe-mutation', { detail: { type: 'publish', id } }));
      return true;
    } else {
      console.error('Failed to publish recipe:', error);
      return false;
    }
  }, [user]);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    history,
    isOpen,
    setIsOpen,
    toggleOpen,
    addToHistory,
    deleteFromHistory,
    clearHistory,
    togglePublic,
    publishRecipe,
    cloudLoaded,
  };
}
