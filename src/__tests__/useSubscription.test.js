import { describe, it, expect } from 'vitest';

// -----------------------------------------------------------
// Tier limits extracted from the source for direct unit testing
// -----------------------------------------------------------
const TIER_LIMITS = {
  free:    { analyses: 10, stems: 2, publishes: 3, storage: 20 },
  pro:     { analyses: Infinity, stems: Infinity, publishes: Infinity, storage: Infinity },
};

describe('Subscription tier limits (pure logic)', () => {
  describe('TIER_LIMITS configuration', () => {
    it('free tier has finite limits', () => {
      expect(TIER_LIMITS.free.analyses).toBe(10);
      expect(TIER_LIMITS.free.stems).toBe(2);
      expect(TIER_LIMITS.free.publishes).toBe(3);
      expect(TIER_LIMITS.free.storage).toBe(20);
    });

    it('pro tier has unlimited everything', () => {
      expect(TIER_LIMITS.pro.analyses).toBe(Infinity);
      expect(TIER_LIMITS.pro.stems).toBe(Infinity);
      expect(TIER_LIMITS.pro.publishes).toBe(Infinity);
      expect(TIER_LIMITS.pro.storage).toBe(Infinity);
    });
  });

  describe('canAnalyze logic', () => {
    function canAnalyze(tier, usage) {
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      if (limits.analyses === Infinity) return true;
      return (usage?.analyses_count || 0) < limits.analyses;
    }

    it('returns true when free tier user has no usage', () => {
      expect(canAnalyze('free', { analyses_count: 0 })).toBe(true);
    });

    it('returns true when free tier user is below limit', () => {
      expect(canAnalyze('free', { analyses_count: 9 })).toBe(true);
    });

    it('returns false when free tier user hits limit', () => {
      expect(canAnalyze('free', { analyses_count: 10 })).toBe(false);
    });

    it('returns false when free tier user exceeds limit', () => {
      expect(canAnalyze('free', { analyses_count: 15 })).toBe(false);
    });

    it('always returns true for pro tier', () => {
      expect(canAnalyze('pro', { analyses_count: 0 })).toBe(true);
      expect(canAnalyze('pro', { analyses_count: 1000 })).toBe(true);
    });

    it('handles null usage gracefully', () => {
      expect(canAnalyze('free', null)).toBe(true);
    });

    it('falls back to free limits for unknown tier', () => {
      expect(canAnalyze('unknown', { analyses_count: 10 })).toBe(false);
    });
  });

  describe('canSeparateStems logic', () => {
    function canSeparateStems(tier, usage) {
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      if (limits.stems === Infinity) return true;
      return (usage?.stems_count || 0) < limits.stems;
    }

    it('returns true when free tier user has 0 stem uses', () => {
      expect(canSeparateStems('free', { stems_count: 0 })).toBe(true);
    });

    it('returns true when free tier user has 1 stem use', () => {
      expect(canSeparateStems('free', { stems_count: 1 })).toBe(true);
    });

    it('returns false when free tier user hits 2 stem limit', () => {
      expect(canSeparateStems('free', { stems_count: 2 })).toBe(false);
    });

    it('always returns true for pro tier', () => {
      expect(canSeparateStems('pro', { stems_count: 100 })).toBe(true);
    });
  });

  describe('canPublish logic', () => {
    function canPublish(tier, usage) {
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      if (limits.publishes === Infinity) return true;
      return (usage?.publishes_count || 0) < limits.publishes;
    }

    it('returns true when free tier user has published 2 of 3', () => {
      expect(canPublish('free', { publishes_count: 2 })).toBe(true);
    });

    it('returns false when free tier user hits 3 publish limit', () => {
      expect(canPublish('free', { publishes_count: 3 })).toBe(false);
    });

    it('always returns true for pro tier', () => {
      expect(canPublish('pro', { publishes_count: 500 })).toBe(true);
    });

  });

  describe('canSaveAnalysis logic', () => {
    function canSaveAnalysis(tier, totalAnalyses) {
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      if (limits.storage === Infinity) return true;
      return totalAnalyses < limits.storage;
    }

    it('returns true when free tier user has 19 of 20 analyses saved', () => {
      expect(canSaveAnalysis('free', 19)).toBe(true);
    });

    it('returns false when free tier user hits 20 storage limit', () => {
      expect(canSaveAnalysis('free', 20)).toBe(false);
    });

    it('always returns true for pro tier', () => {
      expect(canSaveAnalysis('pro', 10000)).toBe(true);
    });
  });

  describe('remaining count calculations', () => {
    function analysesRemaining(tier, usage) {
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      return limits.analyses === Infinity
        ? Infinity
        : Math.max(0, limits.analyses - (usage?.analyses_count || 0));
    }

    function stemsRemaining(tier, usage) {
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      return limits.stems === Infinity
        ? Infinity
        : Math.max(0, limits.stems - (usage?.stems_count || 0));
    }

    function publishesRemaining(tier, usage) {
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      return limits.publishes === Infinity
        ? Infinity
        : Math.max(0, limits.publishes - (usage?.publishes_count || 0));
    }

    function storageRemaining(tier, totalAnalyses) {
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      return limits.storage === Infinity
        ? Infinity
        : Math.max(0, limits.storage - totalAnalyses);
    }

    it('calculates remaining analyses for free tier', () => {
      expect(analysesRemaining('free', { analyses_count: 3 })).toBe(7);
      expect(analysesRemaining('free', { analyses_count: 10 })).toBe(0);
      expect(analysesRemaining('free', { analyses_count: 15 })).toBe(0); // never negative
    });

    it('returns Infinity for pro tier analyses', () => {
      expect(analysesRemaining('pro', { analyses_count: 100 })).toBe(Infinity);
    });

    it('calculates remaining stems correctly', () => {
      expect(stemsRemaining('free', { stems_count: 1 })).toBe(1);
      expect(stemsRemaining('pro', { stems_count: 100 })).toBe(Infinity);
    });

    it('calculates remaining publishes correctly', () => {
      expect(publishesRemaining('free', { publishes_count: 2 })).toBe(1);
      expect(publishesRemaining('free', { publishes_count: 5 })).toBe(0); // clamped at 0
      expect(publishesRemaining('pro', { publishes_count: 100 })).toBe(Infinity);
    });

    it('calculates remaining storage correctly', () => {
      expect(storageRemaining('free', 10)).toBe(10);
      expect(storageRemaining('free', 25)).toBe(0); // clamped at 0
      expect(storageRemaining('pro', 999)).toBe(Infinity);
    });

    it('handles null usage gracefully', () => {
      expect(analysesRemaining('free', null)).toBe(10);
      expect(stemsRemaining('free', null)).toBe(2);
    });
  });
});
