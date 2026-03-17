import { useEffect, useRef, useCallback } from 'react';
import { RecipeCard } from './RecipeCard';
import { RecipeCardSkeleton } from '../ui/Skeleton';

/**
 * Responsive grid of RecipeCards with IntersectionObserver for infinite scroll.
 * Calls onLoadMore when the sentinel element enters the viewport.
 */
export function RecipeGrid({ recipes, hasMore, loading, onLoadMore, theme, isLiked, onToggleLike }) {
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

  // Show skeleton cards on initial load (no recipes yet, still loading)
  if (recipes.length === 0 && loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <RecipeCardSkeleton key={i} theme={theme} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recipes.map(recipe => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            theme={theme}
            liked={isLiked ? isLiked(recipe.id) : false}
            onToggleLike={onToggleLike}
          />
        ))}
      </div>

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-1" />
    </>
  );
}
