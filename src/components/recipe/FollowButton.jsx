import { UserPlus, UserMinus } from 'lucide-react';

/**
 * Follow/Unfollow toggle button.
 * Shows "Follow" with UserPlus icon or "Following" with UserMinus icon.
 */
export function FollowButton({ following, onToggle, theme }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={following}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        following
          ? theme === 'dark'
            ? 'bg-zinc-800 text-white hover:bg-zinc-700'
            : 'bg-amber-50 text-ember-600 hover:bg-amber-100'
          : theme === 'dark'
            ? 'bg-white text-black hover:bg-zinc-200'
            : 'bg-ember-600 text-white hover:bg-ember-700'
      }`}
    >
      {following ? (
        <>
          <UserMinus className="w-4 h-4" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          Follow
        </>
      )}
    </button>
  );
}
