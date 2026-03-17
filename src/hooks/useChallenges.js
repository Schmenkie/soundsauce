import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { trackChallengeCreated, trackChallengeViewed } from '../lib/posthog';

const PAGE_SIZE = 12;
const COLUMNS = 'id, title, description, sound_sauce_id, reference_audio_url, start_date, end_date, submission_count, created_at, creator:profiles!challenges_creator_id_fkey(id, username, display_name, avatar_url)';

/**
 * Derive challenge status from dates.
 */
function getChallengeStatus(challenge) {
  const now = new Date();
  const start = new Date(challenge.start_date);
  const end = new Date(challenge.end_date);
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}

/**
 * Hook for browsing, filtering, and creating weekly challenges.
 * Pattern: useRecipes.js (cursor-based pagination)
 */
export function useChallenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('all'); // all | active | upcoming | ended
  const cursorRef = useRef(null);
  const abortRef = useRef(0);
  const loadingRef = useRef(loading);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Build a base query with current filter
  const buildQuery = useCallback(() => {
    let query = supabase
      .from('challenges')
      .select(COLUMNS);

    const now = new Date().toISOString();

    if (filter === 'active') {
      query = query.lte('start_date', now).gte('end_date', now);
    } else if (filter === 'upcoming') {
      query = query.gt('start_date', now);
    } else if (filter === 'ended') {
      query = query.lt('end_date', now);
    }

    query = query.order('created_at', { ascending: false });

    return query;
  }, [filter]);

  // Initial fetch (resets pagination)
  const fetchChallenges = useCallback(async () => {
    const callId = ++abortRef.current;
    setLoading(true);
    cursorRef.current = null;

    const { data, error } = await buildQuery().limit(PAGE_SIZE);

    if (callId !== abortRef.current) return;

    if (error) {
      console.error('Failed to fetch challenges:', error);
      setChallenges([]);
      setHasMore(false);
    } else {
      const enriched = (data || []).map(c => ({ ...c, status: getChallengeStatus(c) }));
      setChallenges(enriched);
      setHasMore((data || []).length === PAGE_SIZE);
      if (data && data.length > 0) {
        cursorRef.current = data[data.length - 1].created_at;
      }
    }
    setLoading(false);
  }, [buildQuery]);

  // Load more
  const fetchMore = useCallback(async () => {
    if (loadingRef.current || !cursorRef.current) return;

    const callId = ++abortRef.current;
    setLoading(true);

    const { data, error } = await buildQuery()
      .lt('created_at', cursorRef.current)
      .limit(PAGE_SIZE);

    if (callId !== abortRef.current) return;

    if (error) {
      console.error('Failed to fetch more challenges:', error);
    } else {
      const enriched = (data || []).map(c => ({ ...c, status: getChallengeStatus(c) }));
      setChallenges(prev => [...prev, ...enriched]);
      setHasMore((data || []).length === PAGE_SIZE);
      if (data && data.length > 0) {
        cursorRef.current = data[data.length - 1].created_at;
      } else {
        setHasMore(false);
      }
    }
    setLoading(false);
  }, [buildQuery]);

  // Create a new challenge
  const createChallenge = useCallback(async ({ title, description, soundSauceId, referenceAudioUrl, startDate, endDate }) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('challenges')
      .insert({
        creator_id: user.id,
        title,
        description: description || '',
        sound_sauce_id: soundSauceId || null,
        reference_audio_url: referenceAudioUrl || null,
        start_date: startDate,
        end_date: endDate,
      })
      .select(COLUMNS)
      .single();

    if (error) {
      console.error('Failed to create challenge:', error);
      return null;
    }

    const enriched = { ...data, status: getChallengeStatus(data) };
    setChallenges(prev => [enriched, ...prev]);
    trackChallengeCreated(data.id);
    return enriched;
  }, [user]);

  // Fetch a single challenge by ID (for detail page)
  const fetchChallenge = useCallback(async (challengeId) => {
    const { data, error } = await supabase
      .from('challenges')
      .select(COLUMNS)
      .eq('id', challengeId)
      .single();

    if (error || !data) {
      console.error('Failed to fetch challenge:', error);
      return null;
    }

    trackChallengeViewed(challengeId);
    return { ...data, status: getChallengeStatus(data) };
  }, []);

  // Refetch when filter changes
  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  return {
    challenges,
    loading,
    hasMore,
    filter,
    setFilter,
    fetchChallenges,
    fetchMore,
    createChallenge,
    fetchChallenge,
    getChallengeStatus,
  };
}
