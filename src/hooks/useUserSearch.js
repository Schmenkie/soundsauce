import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook for searching users by username.
 * Debounced search with Supabase ilike query.
 */
export function useUserSearch() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const abortRef = useRef(0);

  const searchUsers = useCallback(async (searchQuery) => {
    const trimmed = searchQuery.trim();
    setQuery(trimmed);

    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const currentRequest = ++abortRef.current;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio')
      .ilike('username', `%${trimmed}%`)
      .limit(10);

    // Discard stale results
    if (currentRequest !== abortRef.current) return;

    if (error) {
      console.error('User search error:', error);
      setResults([]);
    } else {
      // Filter out the current user from results
      const filtered = user
        ? data.filter(p => p.id !== user.id)
        : data;
      setResults(filtered);
    }

    setLoading(false);
  }, [user]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setLoading(false);
    abortRef.current++;
  }, []);

  return {
    results,
    loading,
    query,
    searchUsers,
    clearSearch,
  };
}
