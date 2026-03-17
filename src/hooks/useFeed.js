import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const FEED_COLUMNS = 'id, title, description, tags, instrument, post_type, vital_preset_url, is_featured, results, created_at, like_count, comment_count, download_count, profiles:user_id(username, display_name, avatar_url)';
const FEED_LIMIT = 10;

/**
 * Hook for the Home page activity feed.
 * Authenticated: recipes from followed users.
 * Guests: trending recipes (most liked in last 7 days).
 * Uses abort ref to prevent stale data from rapid sign-in/out.
 * Accepts optional followingIds from useFollows to avoid redundant DB queries.
 */
export function useFeed(externalFollowingIds) {
  const { user } = useAuth();
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(0);

  const fetchFeed = useCallback(async () => {
    const callId = ++abortRef.current;
    setLoading(true);

    if (user) {
      // Use externally provided followingIds if available, otherwise fetch
      let followedIds;
      if (externalFollowingIds && externalFollowingIds.size > 0) {
        followedIds = [...externalFollowingIds];
      } else {
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (callId !== abortRef.current) { setLoading(false); return; }

        followedIds = (follows || []).map(f => f.following_id);
      }

      if (followedIds.length > 0) {
        // Recipes from followed users
        const { data } = await supabase
          .from('analyses')
          .select(FEED_COLUMNS)
          .eq('is_public', true)
          .in('user_id', followedIds)
          .order('created_at', { ascending: false })
          .limit(FEED_LIMIT);

        if (callId !== abortRef.current) { setLoading(false); return; }

        if (data && data.length > 0) {
          setFeedItems(data);
          setLoading(false);
          return;
        }
      }

      // Fallback: if no followed content, show trending
    }

    if (callId !== abortRef.current) { setLoading(false); return; }

    // Trending: most liked in last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: trending } = await supabase
      .from('analyses')
      .select(FEED_COLUMNS)
      .eq('is_public', true)
      .gte('created_at', weekAgo)
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(FEED_LIMIT);

    if (callId !== abortRef.current) { setLoading(false); return; }

    // If nothing trending in the last week, just get the most recent
    if (!trending || trending.length === 0) {
      const { data: recent } = await supabase
        .from('analyses')
        .select(FEED_COLUMNS)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(FEED_LIMIT);

      if (callId !== abortRef.current) { setLoading(false); return; }

      setFeedItems(recent || []);
    } else {
      setFeedItems(trending);
    }

    setLoading(false);
  }, [user, externalFollowingIds]);

  // Listen for recipe-mutation events to refresh feed
  useEffect(() => {
    const handler = () => fetchFeed();
    window.addEventListener('recipe-mutation', handler);
    return () => window.removeEventListener('recipe-mutation', handler);
  }, [fetchFeed]);

  return {
    feedItems,
    loading,
    fetchFeed,
  };
}
