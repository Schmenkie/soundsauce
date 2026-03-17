import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook for loading achievement badges.
 * Accepts an optional targetUserId to load badges for another user (e.g., public profiles).
 * When targetUserId is omitted, loads badges for the current authenticated user.
 */
export function useAchievements(targetUserId) {
  const { user } = useAuth();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = targetUserId || user?.id;

  useEffect(() => {
    if (!userId) {
      setBadges([]);
      setLoading(false);
      return;
    }

    async function loadBadges() {
      setLoading(true);
      const { data, error } = await supabase
        .from('achievements')
        .select('badge_type, earned_at')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (!error && data) {
        setBadges(data);
      }
      setLoading(false);
    }

    loadBadges();
  }, [userId]);

  // Check if a specific badge type has been earned
  const hasBadge = useCallback((type) => {
    return badges.some(b => b.badge_type === type);
  }, [badges]);

  // Most recently earned badge
  const recentBadge = badges[0] || null;

  return {
    badges,
    loading,
    hasBadge,
    recentBadge,
  };
}
