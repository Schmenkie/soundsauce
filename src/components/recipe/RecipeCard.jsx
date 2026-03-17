import { useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Music, Download, MessageSquare, Sliders, Award } from 'lucide-react';
import { LikeButton } from './LikeButton';
import { sanitize } from '../../utils/sanitize';

/**
 * Card component for displaying a published Sound Recipe.
 * Used in Discover page grid, user profile grids, and Home feed.
 *
 * Features cursor-tracking 3D tilt, radial glow, and parallax content layers.
 */
export function RecipeCard({ recipe, theme, liked, onToggleLike }) {
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  // Normalized -1 to 1 position for tilt calculation
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const isDark = theme === 'dark';

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
    // Normalize to -1..1 range from center
    setTilt({
      x: ((x / rect.width) - 0.5) * 2,
      y: ((y / rect.height) - 0.5) * 2,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  const t = isDark ? {
    card: 'bg-zinc-900 border-zinc-800 rounded-lg',
    text: 'text-zinc-50',
    textMuted: 'text-zinc-400',
    textDimmed: 'text-zinc-500',
    tag: 'bg-zinc-800 text-zinc-400',
    avatar: 'bg-zinc-800',
    accent: 'text-ember-500',
    accentBg: 'bg-ember-500/15 text-ember-500',
    borderHover: 'zinc-600',
  } : {
    card: 'bg-white border-stone-200 rounded-lg',
    text: 'text-stone-900',
    textMuted: 'text-stone-500',
    textDimmed: 'text-stone-400',
    tag: 'bg-amber-50 text-amber-700',
    avatar: 'bg-amber-50',
    accent: 'text-ember-600',
    accentBg: 'bg-amber-50 text-ember-600',
    borderHover: 'stone-300',
  };

  const profile = recipe.profiles;
  const timeAgo = getTimeAgo(recipe.created_at);

  // Radial glow follows cursor — amber in dark, subtle amber in light
  const glowStyle = isHovered ? {
    background: isDark
      ? `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(245,158,11,0.07), transparent 40%)`
      : `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(217,119,6,0.04), transparent 40%)`,
  } : {};

  const borderGlowStyle = isHovered ? {
    background: isDark
      ? `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(245,158,11,0.25), transparent 40%)`
      : `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(217,119,6,0.15), transparent 40%)`,
  } : {};

  // 3D tilt: rotate card subtly toward cursor, with parallax on content
  const cardTransform = isHovered
    ? `perspective(800px) rotateY(${tilt.x * 4}deg) rotateX(${-tilt.y * 4}deg) scale(1.02) translateY(-4px)`
    : 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1) translateY(0)';

  // Inner content shifts opposite to tilt for parallax depth
  const contentTransform = isHovered
    ? `translateX(${tilt.x * -3}px) translateY(${tilt.y * -3}px)`
    : 'translateX(0) translateY(0)';

  return (
    <Link
      to={`/recipe/${recipe.id}`}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`group relative block border overflow-hidden cursor-pointer ${t.card}`}
      style={{
        borderColor: isHovered
          ? (isDark ? 'rgba(245,158,11,0.3)' : 'rgba(217,119,6,0.25)')
          : undefined,
        transform: cardTransform,
        boxShadow: isHovered
          ? (isDark ? '0 20px 40px -12px rgba(245,158,11,0.15)' : '0 20px 40px -12px rgba(217,119,6,0.12)')
          : 'none',
        transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease, border-color 0.3s ease',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Border glow layer */}
      <div
        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={borderGlowStyle}
      />

      {/* Content glow layer — base color underneath */}
      <div
        className={`absolute inset-[1px] rounded-[7px] pointer-events-none ${isDark ? 'bg-zinc-900' : 'bg-white'}`}
      />
      {/* Content glow layer — radial gradient overlay */}
      <div
        className="absolute inset-[1px] rounded-[7px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={glowStyle}
      />

      {/* Content — shifts with parallax */}
      <div
        className="relative z-10 p-4 space-y-3"
        style={{
          transform: contentTransform,
          transition: 'transform 0.3s ease-out',
        }}
      >
        {/* Staff Pick badge */}
        {recipe.is_featured && (
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold rounded-full ${t.accentBg}`}>
            <Award className="w-3 h-3" />
            Staff Pick
          </div>
        )}

        {/* Title */}
        <h3 className={`font-bold font-display line-clamp-1 ${t.text}`}>{sanitize(recipe.title)}</h3>

        {/* Description */}
        {recipe.description && (
          <p className={`text-sm line-clamp-2 ${t.textMuted}`}>{sanitize(recipe.description)}</p>
        )}

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.tags.slice(0, 4).map(tag => (
              <span key={tag} className={`px-2 py-0.5 text-xs font-medium rounded-full ${t.tag}`}>
                {tag}
              </span>
            ))}
            {recipe.tags.length > 4 && (
              <span className={`px-2 py-0.5 text-xs ${t.textDimmed}`}>+{recipe.tags.length - 4}</span>
            )}
          </div>
        )}

        {/* Post type badge + Instrument badge + Vital badge */}
        <div className="flex items-center gap-3">
          {recipe.post_type === 'preset' ? (
            <div className="flex items-center gap-1.5">
              <Sliders className={`w-3.5 h-3.5 ${t.accent}`} />
              <span className={`text-xs font-medium ${t.accent}`}>
                Preset
              </span>
            </div>
          ) : (
            <>
              {recipe.instrument && recipe.instrument !== 'full' && (
                <div className="flex items-center gap-1.5">
                  <Music className={`w-3.5 h-3.5 ${t.textDimmed}`} />
                  <span className={`text-xs font-medium ${t.textDimmed}`}>
                    {recipe.instrument.charAt(0).toUpperCase() + recipe.instrument.slice(1)}
                  </span>
                </div>
              )}
            </>
          )}
          {recipe.vital_preset_url && (
            <div className="flex items-center gap-1">
              <Download className={`w-3 h-3 ${t.accent}`} />
              <span className={`text-xs font-medium ${t.accent}`}>
                Vital Preset
              </span>
            </div>
          )}
        </div>

        {/* Footer: Author + Date */}
        <div className={`flex items-center justify-between pt-2 border-t ${isDark ? 'border-zinc-800' : 'border-stone-100'}`}>
          <div className="flex items-center gap-2">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-6 h-6 object-cover rounded-full" />
            ) : (
              <div className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full ${t.avatar} ${t.textMuted}`}>
                {(profile?.display_name || profile?.username || '?')[0].toUpperCase()}
              </div>
            )}
            <span className={`text-sm ${t.textMuted}`}>{sanitize(profile?.display_name || profile?.username || 'Anonymous')}</span>
          </div>
          <div className="flex items-center gap-3">
            {onToggleLike && (
              <LikeButton
                liked={liked}
                likeCount={recipe.like_count || 0}
                onToggle={() => onToggleLike(recipe.id)}
                theme={theme}
              />
            )}
            {(recipe.comment_count > 0) && (
              <div className="flex items-center gap-1">
                <MessageSquare className={`w-3.5 h-3.5 ${t.textDimmed}`} />
                <span className={`text-xs ${t.textDimmed}`}>{recipe.comment_count}</span>
              </div>
            )}
            {(recipe.download_count > 0) && (
              <div className="flex items-center gap-1">
                <Download className={`w-3.5 h-3.5 ${t.textDimmed}`} />
                <span className={`text-xs ${t.textDimmed}`}>{recipe.download_count}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className={`w-3.5 h-3.5 ${t.textDimmed}`} />
              <span className={`text-xs ${t.textDimmed}`}>{timeAgo}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function getTimeAgo(dateString) {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(dateString).toLocaleDateString();
}
