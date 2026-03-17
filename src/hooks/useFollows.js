import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { trackUserFollowed, trackUserUnfollowed } from '../lib/posthog';

/**
 * Hook for managing follow/unfollow relationships.
 * Loads user's follows on mount, provides optimistic toggle.
 * Uses ref pattern for stable callbacks that don't recreate on followingIds change.
 */
export function useFollows() {
  const { user } = useAuth();
  const [followingIds, setFollowingIds] = useState(new Set());
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const followingIdsRef = useRef(followingIds);

  // Keep ref in sync with state
  useEffect(() => {
    followingIdsRef.current = followingIds;
  }, [followingIds]);

  // Load all follows for the current user
  useEffect(() => {
    if (!user) {
      setFollowingIds(new Set());
      setFollowerCount(0);
      setFollowingCount(0);
      return;
    }

    async function loadFollows() {
      // Who I follow
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (following) {
        setFollowingIds(new Set(following.map(r => r.following_id)));
        setFollowingCount(following.length);
      }

      // Who follows me
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);

      setFollowerCount(count || 0);
    }

    loadFollows();
  }, [user]);

  const isFollowing = useCallback((userId) => {
    return followingIdsRef.current.has(userId);
  }, []);

  const toggleFollow = useCallback(async (targetUserId) => {
    if (!user || targetUserId === user.id) return false;

    const wasFollowing = followingIdsRef.current.has(targetUserId);

    // Optimistic update
    setFollowingIds(prev => {
      const next = new Set(prev);
      if (wasFollowing) {
        next.delete(targetUserId);
      } else {
        next.add(targetUserId);
      }
      return next;
    });
    setFollowingCount(prev => wasFollowing ? prev - 1 : prev + 1);

    if (wasFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);

      if (error) {
        console.error('Failed to unfollow:', error);
        setFollowingIds(prev => new Set([...prev, targetUserId]));
        setFollowingCount(prev => prev + 1);
        return false;
      }
      trackUserUnfollowed(targetUserId);
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: targetUserId });

      if (error) {
        console.error('Failed to follow:', error);
        setFollowingIds(prev => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
        setFollowingCount(prev => prev - 1);
        return false;
      }
      trackUserFollowed(targetUserId);
    }

    return true;
  }, [user]);

  // Fetch follower/following counts for a specific user (for profile pages)
  const fetchCounts = useCallback(async (userId) => {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
    return { followers: followers || 0, following: following || 0 };
  }, []);

  return {
    isFollowing,
    toggleFollow,
    followingIds,
    followerCount,
    followingCount,
    fetchCounts,
  };
}
