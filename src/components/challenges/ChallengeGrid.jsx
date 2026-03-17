import { useEffect, useRef, useCallback } from 'react';
import { ChallengeCard } from './ChallengeCard';
import { ChallengeCardSkeleton } from '../ui/Skeleton';

/**
 * Responsive grid of ChallengeCards with IntersectionObserver infinite scroll.
 * Pattern: RecipeGrid.jsx
 */
export function ChallengeGrid({ challenges, hasMore, loading, onLoadMore, theme }) {
  const sentinelRef = useRef(null);

  const handleIntersect = useCallback((entries) => {
    if (entries[0].isIntersecting && hasMore && !loading) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '200px',
    });
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [handleIntersect]);

  if (challenges.length === 0 && loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <ChallengeCardSkeleton key={i} theme={theme} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {challenges.map(challenge => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            theme={theme}
          />
        ))}
      </div>
      <div ref={sentinelRef} className="h-1" />
    </>
  );
}
