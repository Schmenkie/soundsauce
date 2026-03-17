import { useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, Trophy } from 'lucide-react';

function getTimeRemaining(endDate) {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${mins}m left`;
}

function getTimeUntilStart(startDate) {
  const now = new Date();
  const start = new Date(startDate);
  const diff = start - now;
  if (diff <= 0) return 'Starting now';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `Starts in ${days}d ${hours}h`;
  if (hours > 0) return `Starts in ${hours}h`;
  return `Starts in ${Math.floor((diff % 3600000) / 60000)}m`;
}

const STATUS_STYLES = {
  active: { dark: 'bg-emerald-900/30 text-emerald-400', light: 'bg-emerald-100 text-emerald-700' },
  upcoming: { dark: 'bg-amber-900/30 text-amber-400', light: 'bg-amber-100 text-amber-700' },
  ended: { dark: 'bg-zinc-800 text-zinc-400', light: 'bg-stone-100 text-stone-500' },
};

/**
 * Card component for displaying a challenge.
 * Shows title, description, creator, time remaining/status badge, submission count.
 * Features cursor-tracking radial glow on hover (same pattern as RecipeCard).
 */
export function ChallengeCard({ challenge, theme }) {
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const dark = theme === 'dark';
  const status = challenge.status;
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.ended;

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const t = dark ? {
    card: 'bg-zinc-900 border-zinc-800 rounded-lg',
    text: 'text-white',
    textMuted: 'text-zinc-400',
    textDimmed: 'text-zinc-500',
    avatar: 'bg-zinc-800',
  } : {
    card: 'bg-white border-stone-200 rounded-lg',
    text: 'text-stone-900',
    textMuted: 'text-stone-500',
    textDimmed: 'text-stone-400',
    avatar: 'bg-amber-50',
  };

  const creator = challenge.creator;

  const glowStyle = isHovered ? {
    background: dark
      ? `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(245,158,11,0.06), transparent 40%)`
      : `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(217,119,6,0.04), transparent 40%)`,
  } : {};

  return (
    <Link
      to={`/challenge/${challenge.id}`}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative block border overflow-hidden ${t.card}`}
      style={{
        borderColor: isHovered
          ? (dark ? 'rgba(245,158,11,0.25)' : 'rgba(217,119,6,0.2)')
          : undefined,
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered
          ? (dark ? '0 12px 24px -8px rgba(245,158,11,0.1)' : '0 12px 24px -8px rgba(217,119,6,0.08)')
          : 'none',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
      }}
    >
      {/* Cursor-tracking glow */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={glowStyle}
      />

      <div className="relative z-10 p-4 space-y-3">
        {/* Status badge + Time */}
        <div className="flex items-center justify-between">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${dark ? statusStyle.dark : statusStyle.light}`}>
            {status === 'active' ? 'Active' : status === 'upcoming' ? 'Upcoming' : 'Ended'}
          </span>
          <span className={`flex items-center gap-1 text-xs ${t.textDimmed}`}>
            <Clock className="w-3 h-3" />
            {status === 'active' ? getTimeRemaining(challenge.end_date) :
             status === 'upcoming' ? getTimeUntilStart(challenge.start_date) :
             'Ended'}
          </span>
        </div>

        {/* Title */}
        <h3 className={`font-bold font-display line-clamp-1 ${t.text}`}>
          <Trophy className={`inline w-4 h-4 mr-1.5 ${dark ? 'text-ember-500' : 'text-ember-600'}`} />
          {challenge.title}
        </h3>

        {/* Description */}
        {challenge.description && (
          <p className={`text-sm line-clamp-2 ${t.textMuted}`}>{challenge.description}</p>
        )}

        {/* Footer: Creator + Submissions */}
        <div className={`flex items-center justify-between pt-2 border-t ${dark ? 'border-zinc-800' : 'border-stone-100'}`}>
          <div className="flex items-center gap-2">
            {creator?.avatar_url ? (
              <img src={creator.avatar_url} alt="" className="w-6 h-6 object-cover rounded-full" />
            ) : (
              <div className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full ${t.avatar} ${t.textMuted}`}>
                {(creator?.display_name || creator?.username || '?')[0].toUpperCase()}
              </div>
            )}
            <span className={`text-sm ${t.textMuted}`}>{creator?.display_name || creator?.username || 'Anonymous'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className={`w-3.5 h-3.5 ${t.textDimmed}`} />
            <span className={`text-xs ${t.textDimmed}`}>
              {challenge.submission_count} submission{challenge.submission_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
