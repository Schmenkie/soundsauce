import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * Top recreations for a recipe, sorted by match_score.
 */
export function RecreationLeaderboard({ analysisId, theme }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data } = await supabase
        .from('recreations')
        .select('*, profiles:user_id(username, display_name, avatar_url)')
        .eq('analysis_id', analysisId)
        .order('match_score', { ascending: false })
        .limit(10);

      setEntries(data || []);
      setLoading(false);
    }

    fetchLeaderboard();
  }, [analysisId]);

  const t = theme === 'dark' ? {
    text: 'text-white',
    textMuted: 'text-zinc-400',
    textDimmed: 'text-zinc-500',
    row: 'bg-zinc-950 border-zinc-700 rounded-lg',
    avatar: 'bg-zinc-800 rounded-full',
  } : {
    text: 'text-stone-900',
    textMuted: 'text-stone-500',
    textDimmed: 'text-stone-400',
    row: 'bg-stone-50 border-stone-200 rounded-lg',
    avatar: 'bg-amber-50 rounded-full',
  };

  if (loading) return null;
  if (entries.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Trophy className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
        <h3 className={`text-lg font-bold ${t.text}`}>Recreation Leaderboard</h3>
      </div>
      <div className="space-y-2">
        {entries.map((entry, i) => {
          const profile = entry.profiles;
          const score = Math.round(entry.match_score || 0);
          return (
            <div
              key={entry.id}
              className={`flex items-center gap-3 p-3 border ${t.row}`}
            >
              {/* Rank */}
              <span className={`text-lg font-bold w-8 text-center ${
                i === 0 ? (theme === 'dark' ? 'text-ember-500' : 'text-ember-600') : t.textDimmed
              }`}>
                {i + 1}
              </span>

              {/* Avatar + Name */}
              <Link
                to={profile?.username ? `/user/${profile.username}` : '#'}
                className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-7 h-7 object-cover flex-shrink-0 rounded-full" />
                ) : (
                  <div className={`w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0 ${t.avatar} ${t.textMuted}`}>
                    {(profile?.display_name || profile?.username || '?')[0].toUpperCase()}
                  </div>
                )}
                <span className={`text-sm font-medium truncate ${t.text}`}>
                  {profile?.display_name || profile?.username || 'Anonymous'}
                </span>
              </Link>

              {/* Score */}
              <span className={`text-sm font-bold ${
                score >= 80 ? 'text-green-500'
                  : score >= 60 ? (theme === 'dark' ? 'text-ember-500' : 'text-ember-600')
                    : 'text-red-500'
              }`}>
                {score}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
