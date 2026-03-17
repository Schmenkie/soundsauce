import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const PAGE_SIZE = 12;
const DEBOUNCE_MS = 300;

const COLUMNS = 'id, title, description, tags, instrument, post_type, vital_preset_url, is_featured, results, created_at, like_count, comment_count, download_count, profiles:user_id(username, display_name, avatar_url)';

/**
 * Hook for fetching, searching, and filtering public Sound Sauces.
 * Uses cursor-based pagination for "recent" sort, offset-based for "popular".
 * Supports full-text search via Postgres tsvector and tag filtering via .contains().
 *
 * @returns {{ recipes: object[], loading: boolean, hasMore: boolean, searchQuery: string, selectedTags: string[], sortBy: string, setSortBy: function, fetchRecipes: function, fetchMore: function, search: function, toggleTag: function, clearTags: function }}
 */
export function useRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('recent');

  const cursorRef = useRef(null);
  const offsetRef = useRef(0);
  const abortRef = useRef(0);
  const debounceTimerRef = useRef(null);

  /**
   * Build a Supabase query with current search, tag, and sort filters applied.
   * @returns {object} Supabase query builder
   */
  const buildQuery = useCallback(() => {
    let query = supabase
      .from('analyses')
      .select(COLUMNS)
      .eq('is_public', true);

    // Full-text search
    if (searchQuery.trim()) {
      query = query.textSearch('search_vector', searchQuery.trim(), { type: 'websearch' });
    }

    // Tag filter (must have ALL selected tags)
    if (selectedTags.length > 0) {
      query = query.contains('tags', selectedTags);
    }

    // Sort
    if (sortBy === 'popular') {
      query = query.order('like_count', { ascending: false }).order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    return query;
  }, [searchQuery, selectedTags, sortBy]);

  /**
   * Fetch the first page of recipes, resetting all pagination state.
   * @returns {Promise<void>}
   */
  const fetchRecipes = useCallback(async () => {
    const callId = ++abortRef.current;
    setLoading(true);
    cursorRef.current = null;
    offsetRef.current = 0;

    const query = buildQuery().limit(PAGE_SIZE);

    const { data, error } = await query;

    if (callId !== abortRef.current) return;

    if (error) {
      console.error('Failed to fetch recipes:', error);
      setRecipes([]);
      setHasMore(false);
    } else {
      setRecipes(data || []);
      setHasMore((data || []).length === PAGE_SIZE);
      if (data && data.length > 0) {
        cursorRef.current = data[data.length - 1].created_at;
        offsetRef.current = data.length;
      }
    }
    setLoading(false);
  }, [buildQuery]);

  /**
   * Load the next page of recipes and append to the existing list.
   * Uses cursor-based pagination for "recent", offset-based for "popular".
   * @returns {Promise<void>}
   */
  const fetchMore = useCallback(async () => {
    if (loading) return;

    const callId = ++abortRef.current;
    setLoading(true);

    let query;
    if (sortBy === 'popular') {
      // Offset-based for popular sort (like_count not unique enough for cursors)
      query = buildQuery().range(offsetRef.current, offsetRef.current + PAGE_SIZE - 1);
    } else {
      // Cursor-based for recent sort
      if (!cursorRef.current) {
        setLoading(false);
        return;
      }
      query = buildQuery().lt('created_at', cursorRef.current).limit(PAGE_SIZE);
    }

    const { data, error } = await query;

    if (callId !== abortRef.current) return;

    if (error) {
      console.error('Failed to fetch more recipes:', error);
    } else {
      setRecipes(prev => [...prev, ...(data || [])]);
      setHasMore((data || []).length === PAGE_SIZE);
      if (data && data.length > 0) {
        cursorRef.current = data[data.length - 1].created_at;
        offsetRef.current += data.length;
      } else {
        setHasMore(false);
      }
    }
    setLoading(false);
  }, [buildQuery, sortBy, loading]);

  /**
   * Set search query text. Actual fetch is triggered by useEffect after debounce.
   * @param {string} query - Search text for full-text search
   */
  const search = useCallback((query) => {
    setSearchQuery(query);

    // Debounce the actual fetch
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchRecipes();
    }, 300);
  }, [fetchRecipes]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Listen for recipe-mutation events to invalidate cache
  useEffect(() => {
    const handler = () => fetchRecipes();
    window.addEventListener('recipe-mutation', handler);
    return () => window.removeEventListener('recipe-mutation', handler);
  }, [fetchRecipes]);

  /**
   * Toggle a tag in the active filter set. Adds if absent, removes if present.
   * @param {string} tag - Tag name to toggle
   */
  const toggleTag = useCallback((tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  /** Clear all selected tags from the filter. */
  const clearTags = useCallback(() => {
    setSelectedTags([]);
  }, []);

  return {
    recipes,
    loading,
    hasMore,
    searchQuery,
    selectedTags,
    sortBy,
    setSortBy,
    fetchRecipes,
    fetchMore,
    search,
    toggleTag,
    clearTags,
  };
}
