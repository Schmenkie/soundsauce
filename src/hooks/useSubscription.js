import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { trackCheckoutStarted } from '../lib/posthog';

/**
 * Tier limits configuration
 * Infinity means unlimited for that tier
 */
const TIER_LIMITS = {
  free:    { analyses: 10, stems: 2, publishes: 3, storage: 20 },
  pro:     { analyses: Infinity, stems: Infinity, publishes: Infinity, storage: Infinity },
};

/**
 * Get current period string (YYYY-MM format)
 */
function getCurrentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Hook for managing Stripe subscriptions, usage tracking, and tier limit enforcement.
 *
 * Tiers: free (10 analyses, 2 stems, 3 publishes, 20 storage),
 *        pro (all unlimited).
 *
 * Usage is tracked per-month in the usage_tracking table (YYYY-MM period).
 *
 * @returns {{ tier: string, limits: object, loading: boolean, usage: object|null, totalAnalyses: number, canAnalyze: function, canSeparateStems: function, canPublish: function, canSaveAnalysis: function, canCreateChallenge: function, analysesRemaining: number, stemsRemaining: number, publishesRemaining: number, storageRemaining: number, incrementAnalyses: function, incrementStems: function, incrementPublishes: function, startCheckout: function, openBillingPortal: function }}
 */
export function useSubscription() {
  const { user, tier } = useAuth();
  const [usage, setUsage] = useState(null);
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const [loading, setLoading] = useState(true);
  const usageRef = useRef(usage);

  // Keep ref in sync
  useEffect(() => {
    usageRef.current = usage;
  }, [usage]);

  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

  // Fetch current month's usage on mount and when user changes
  useEffect(() => {
    if (!user) {
      setUsage(null);
      setTotalAnalyses(0);
      setLoading(false);
      return;
    }

    async function fetchUsage() {
      setLoading(true);
      const period = getCurrentPeriod();

      // Fetch current month usage
      const { data: usageData } = await supabase
        .from('usage_tracking')
        .select('analyses_count, stems_count, publishes_count')
        .eq('user_id', user.id)
        .eq('period', period)
        .single();

      setUsage(usageData || { analyses_count: 0, stems_count: 0, publishes_count: 0 });

      // Fetch total analyses count for storage limit
      const { count } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setTotalAnalyses(count || 0);
      setLoading(false);
    }

    fetchUsage();
  }, [user]);

  // ========== Limit Check Functions ==========

  /**
   * Check if user can run another analysis this month.
   * @returns {boolean}
   */
  const canAnalyze = useCallback(() => {
    if (!user) return true; // Guests have no limits (localStorage only)
    if (limits.analyses === Infinity) return true;
    return (usageRef.current?.analyses_count || 0) < limits.analyses;
  }, [user, limits]);

  /**
   * Check if user can run another stem separation this month.
   * @returns {boolean}
   */
  const canSeparateStems = useCallback(() => {
    if (!user) return false; // Guests can't use stems (needs account)
    if (limits.stems === Infinity) return true;
    return (usageRef.current?.stems_count || 0) < limits.stems;
  }, [user, limits]);

  /**
   * Check if user can publish another Sound Sauce this month.
   * @returns {boolean}
   */
  const canPublish = useCallback(() => {
    if (!user) return false;
    if (limits.publishes === Infinity) return true;
    return (usageRef.current?.publishes_count || 0) < limits.publishes;
  }, [user, limits]);

  /**
   * Check if user can save another analysis (storage limit).
   * @returns {boolean}
   */
  const canSaveAnalysis = useCallback(() => {
    if (!user) return true; // Guests use localStorage
    if (limits.storage === Infinity) return true;
    return totalAnalyses < limits.storage;
  }, [user, limits, totalAnalyses]);

  /**
   * Check if user can create a weekly challenge (Pro only).
   * @returns {boolean}
   */
  const canCreateChallenge = useCallback(() => {
    if (!user) return false;
    return tier === 'pro';
  }, [user, tier]);

  // ========== Remaining Counts ==========

  const analysesRemaining = limits.analyses === Infinity
    ? Infinity
    : Math.max(0, limits.analyses - (usage?.analyses_count || 0));

  const stemsRemaining = limits.stems === Infinity
    ? Infinity
    : Math.max(0, limits.stems - (usage?.stems_count || 0));

  const publishesRemaining = limits.publishes === Infinity
    ? Infinity
    : Math.max(0, limits.publishes - (usage?.publishes_count || 0));

  const storageRemaining = limits.storage === Infinity
    ? Infinity
    : Math.max(0, limits.storage - totalAnalyses);

  // ========== Usage Increment Functions ==========

  /**
   * Increment a usage counter for the current month. Upserts the usage_tracking row.
   * @param {string} field - Column name to increment ('analyses_count'|'stems_count'|'publishes_count')
   * @returns {Promise<void>}
   */
  const incrementUsage = useCallback(async (field) => {
    if (!user) return;

    const period = getCurrentPeriod();

    // Upsert: create row if it doesn't exist, increment if it does
    const { data: existing } = await supabase
      .from('usage_tracking')
      .select('id, analyses_count, stems_count, publishes_count')
      .eq('user_id', user.id)
      .eq('period', period)
      .single();

    if (existing) {
      const updates = { [field]: (existing[field] || 0) + 1 };
      await supabase
        .from('usage_tracking')
        .update(updates)
        .eq('id', existing.id);

      setUsage(prev => prev ? { ...prev, ...updates } : { analyses_count: 0, stems_count: 0, publishes_count: 0, ...updates });
    } else {
      const newRow = {
        user_id: user.id,
        period,
        analyses_count: field === 'analyses_count' ? 1 : 0,
        stems_count: field === 'stems_count' ? 1 : 0,
        publishes_count: field === 'publishes_count' ? 1 : 0,
      };
      await supabase
        .from('usage_tracking')
        .insert(newRow);

      setUsage(newRow);
    }
  }, [user]);

  /** Increment the monthly analyses count. */
  const incrementAnalyses = useCallback(() => incrementUsage('analyses_count'), [incrementUsage]);
  /** Increment the monthly stem separations count. */
  const incrementStems = useCallback(() => incrementUsage('stems_count'), [incrementUsage]);
  /** Increment the monthly publishes count. */
  const incrementPublishes = useCallback(() => incrementUsage('publishes_count'), [incrementUsage]);

  // ========== Stripe Flows ==========

  /**
   * Start a Stripe Checkout session and redirect to the Stripe-hosted payment page.
   * @param {string} priceId - Stripe Price ID or tier name ('pro'|'premium')
   * @returns {Promise<void>}
   */
  const startCheckout = useCallback(async (priceId) => {
    if (!user) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ priceId }),
    });

    const data = await res.json();
    if (data.url) {
      trackCheckoutStarted(priceId);
      window.location.href = data.url;
    } else {
      console.error('Checkout error:', data.error);
    }
  }, [user]);

  /**
   * Open the Stripe billing portal for managing subscription (upgrade/downgrade/cancel).
   * Redirects to Stripe-hosted portal page.
   * @returns {Promise<void>}
   */
  const openBillingPortal = useCallback(async () => {
    if (!user) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/create-portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      console.error('Portal error:', data.error);
    }
  }, [user]);

  return {
    // Tier info
    tier,
    limits,
    loading,

    // Usage data
    usage,
    totalAnalyses,

    // Limit checks
    canAnalyze,
    canSeparateStems,
    canPublish,
    canSaveAnalysis,
    canCreateChallenge,

    // Remaining counts
    analysesRemaining,
    stemsRemaining,
    publishesRemaining,
    storageRemaining,

    // Increment functions
    incrementAnalyses,
    incrementStems,
    incrementPublishes,

    // Stripe flows
    startCheckout,
    openBillingPortal,
  };
}
