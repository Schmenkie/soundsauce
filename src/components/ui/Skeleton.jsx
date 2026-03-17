/**
 * Reusable skeleton loading primitives.
 * All skeletons use consistent colors and animate-pulse.
 */

function skeletonColor(theme, subtle = false) {
  if (theme === 'dark') return subtle ? 'bg-zinc-800/60' : 'bg-zinc-800';
  return subtle ? 'bg-stone-100' : 'bg-stone-200';
}

/** A rounded rectangle skeleton block. */
export function SkeletonBlock({ theme, className = '', subtle = false }) {
  return (
    <div className={`rounded ${skeletonColor(theme, subtle)} ${className}`} />
  );
}

/** A circular skeleton (for avatars). */
export function SkeletonCircle({ theme, className = 'w-8 h-8' }) {
  return (
    <div className={`rounded-full ${skeletonColor(theme)} ${className}`} />
  );
}

/** A pill-shaped skeleton (for tags/badges). */
export function SkeletonPill({ theme, className = 'h-5 w-14', subtle = false }) {
  return (
    <div className={`rounded-full ${skeletonColor(theme, subtle)} ${className}`} />
  );
}

/** A card skeleton wrapper with border, padding, and pulse animation. */
export function SkeletonCard({ theme, children, className = '' }) {
  return (
    <div className={`p-4 border animate-pulse rounded-lg ${
      theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'
    } ${className}`}>
      {children}
    </div>
  );
}

/** A standard recipe/feed card skeleton. */
export function RecipeCardSkeleton({ theme }) {
  return (
    <SkeletonCard theme={theme}>
      <div className="flex items-center gap-2 mb-3">
        <SkeletonBlock theme={theme} className="h-4 w-2/3" />
        <SkeletonPill theme={theme} subtle />
      </div>
      <SkeletonBlock theme={theme} subtle className="h-3 w-full mb-2" />
      <SkeletonBlock theme={theme} subtle className="h-3 w-4/5 mb-3" />
      <div className="flex gap-1.5 mb-4">
        <SkeletonPill theme={theme} subtle className="h-5 w-12" />
        <SkeletonPill theme={theme} subtle className="h-5 w-16" />
      </div>
      <div className={`flex items-center justify-between pt-3 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-stone-100'}`}>
        <div className="flex items-center gap-2">
          <SkeletonCircle theme={theme} className="w-6 h-6" />
          <SkeletonBlock theme={theme} subtle className="h-3 w-20" />
        </div>
        <SkeletonBlock theme={theme} subtle className="h-4 w-8" />
      </div>
    </SkeletonCard>
  );
}

/** A standard challenge card skeleton. */
export function ChallengeCardSkeleton({ theme }) {
  return (
    <SkeletonCard theme={theme}>
      <div className="flex items-center justify-between mb-3">
        <SkeletonPill theme={theme} className="h-5 w-16" />
        <SkeletonBlock theme={theme} subtle className="h-3 w-20" />
      </div>
      <SkeletonBlock theme={theme} className="h-5 w-3/4 mb-3" />
      <SkeletonBlock theme={theme} subtle className="h-3 w-full mb-2" />
      <SkeletonBlock theme={theme} subtle className="h-3 w-2/3 mb-4" />
      <div className={`flex items-center gap-2 pt-2 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-stone-100'}`}>
        <SkeletonCircle theme={theme} className="w-6 h-6" />
        <SkeletonBlock theme={theme} subtle className="h-3 w-20" />
      </div>
    </SkeletonCard>
  );
}

/** A notification row skeleton. */
export function NotificationSkeleton({ theme }) {
  return (
    <div className="flex items-start gap-3 p-4 animate-pulse">
      <SkeletonBlock theme={theme} subtle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex items-start gap-2 flex-1">
        <SkeletonCircle theme={theme} className="w-8 h-8 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock theme={theme} subtle className="h-3.5 w-3/4" />
          <SkeletonBlock theme={theme} subtle className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  );
}
