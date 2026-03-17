import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { trackRecipeLiked, trackRecipeUnliked } from '../lib/posthog';

/**
 * Hook for managing likes on Sound Recipes.
 * Provides optimistic updates and batch-fetching of like status.
 * Uses ref pattern for stable callbacks that don't recreate on likedIds change.
 */
export function useLikes() {
  const { user } = useAuth();
  const [likedIds, setLikedIds] = useState(new Set());
  const likedIdsRef = useRef(likedIds);

  // Keep ref in sync with state
  useEffect(() => {
    likedIdsRef.current = likedIds;
  }, [likedIds]);

  // Load all likes for the current user on mount/sign-in
  useEffect(() => {
    if (!user) {
      setLikedIds(new Set());
      return;
    }

    async function loadLikes() {
      const { data, error } = await supabase
        .from('likes')
        .select('analysis_id')
        .eq('user_id', user.id);

      if (!error && data) {
        setLikedIds(new Set(data.map(row => row.analysis_id)));
      }
    }

    loadLikes();
  }, [user]);

  // Check if a specific recipe is liked — reads from ref for stability
  const isLiked = useCallback((analysisId) => {
    return likedIdsRef.current.has(analysisId);
  }, []);

  // Toggle like/unlike with optimistic update — reads from ref to avoid dependency on likedIds
  const toggleLike = useCallback(async (analysisId) => {
    if (!user) return false;

    const wasLiked = likedIdsRef.current.has(analysisId);

    // Optimistic update
    setLikedIds(prev => {
      const next = new Set(prev);
      if (wasLiked) {
        next.delete(analysisId);
      } else {
        next.add(analysisId);
      }
      return next;
    });

    if (wasLiked) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('analysis_id', analysisId);

      if (error) {
        console.error('Failed to unlike:', error);
        // Revert optimistic update
        setLikedIds(prev => new Set([...prev, analysisId]));
        return false;
      }
      trackRecipeUnliked(analysisId);
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: user.id, analysis_id: analysisId });

      if (error) {
        console.error('Failed to like:', error);
        // Revert optimistic update
        setLikedIds(prev => {
          const next = new Set(prev);
          next.delete(analysisId);
          return next;
        });
        return false;
      }
      trackRecipeLiked(analysisId);
    }

    return true;
  }, [user]);

  return {
    isLiked,
    toggleLike,
    likedIds,
  };
}
