import { Heart } from 'lucide-react';

/**
 * Heart icon button for liking/unliking a Sound Recipe.
 * Shows filled heart when liked, outline when not.
 * Displays like count beside the icon.
 */
export function LikeButton({ liked, likeCount, onToggle, theme }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={`flex items-center gap-1.5 transition-colors ${
        liked
          ? theme === 'dark'
            ? 'text-ember-500'
            : 'text-ember-600'
          : theme === 'dark'
            ? 'text-zinc-500 hover:text-ember-500'
            : 'text-stone-400 hover:text-ember-600'
      }`}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <Heart
        className="w-4 h-4"
        fill={liked ? 'currentColor' : 'none'}
      />
      {likeCount > 0 && (
        <span className="text-xs font-medium">{likeCount}</span>
      )}
    </button>
  );
}
