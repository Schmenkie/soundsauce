import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'audioAnalyzerHistory';
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Storage full or blocked — history just won't persist this session
  }
}

/**
 * Recent analysis history, kept in localStorage.
 *
 * Interim storage for the Remix Lab: the Vault (Vercel Blob-backed index of
 * separated tracks) supersedes this for anything you want to keep.
 */
export function useHistory() {
  const [history, setHistory] = useState(loadLocalHistory);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    saveLocalHistory(history);
  }, [history]);

  /**
   * Save an analysis entry (newest first, capped at MAX_HISTORY_ITEMS).
   * @param {object} entry
   */
  const addToHistory = useCallback((entry) => {
    setHistory(prev => [entry, ...prev].slice(0, MAX_HISTORY_ITEMS));
  }, []);

  /**
   * Delete an analysis entry by ID.
   * @param {string} id
   */
  const deleteFromHistory = useCallback((id) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  }, []);

  /** Remove every entry. */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

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
  };
}
