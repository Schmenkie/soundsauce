import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * Ranked submissions leaderboard for a challenge.
 * Shows top submissions sorted by match_score.
 * Pattern: RecreationLeaderboard.jsx
 */
export function ChallengeLeaderboard({ challengeId, theme }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const dark = theme === 'dark';

  useEffect(() => {
    if (!challengeId) return;

    async function fetchLeaderboard() {
      const { data, error } = await supabase
        .from('challenge_submissions')
        .select('*, profiles:user_id(id, username, display_name, avatar_url)')
        .eq('challenge_id', challengeId)
        .order('match_score', { ascending: false })
        .limit(20);

      if (!error && data) {
        setSubmissions(data);
      }
      setLoading(false);
    }

    fetchLeaderboard();
  }, [challengeId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className={`w-5 h-5 animate-spin ${dark ? 'text-zinc-500' : 'text-stone-400'}`} />
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className={`p-8 text-center border-2 border-dashed rounded-lg ${
        dark ? 'border-zinc-700' : 'border-stone-200'
      }`}>
        <Trophy className={`w-8 h-8 mx-auto mb-3 ${dark ? 'text-zinc-500' : 'text-stone-400'}`} />
        <p className={`text-sm ${dark ? 'text-zinc-500' : 'text-stone-400'}`}>
          No submissions yet. Be the first!
        </p>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${
      dark ? 'border-zinc-700' : 'border-stone-200'
    }`}>
      {submissions.map((sub, index) => {
        const profile = sub.profiles;
        const rank = index + 1;

        return (
          <div
            key={sub.id}
            className={`flex items-center gap-3 px-4 py-3 ${
              index !== 0 ? `border-t ${dark ? 'border-zinc-700' : 'border-stone-200'}` : ''
            } ${
              rank <= 3
                ? dark ? 'bg-zinc-900' : 'bg-amber-50/50'
                : ''
            }`}
          >
            {/* Rank */}
            <div className={`w-7 h-7 flex items-center justify-center text-sm font-bold flex-shrink-0 rounded-full ${
              rank === 1
                ? 'bg-amber-500/20 text-amber-500'
                : rank === 2
                  ? 'bg-gray-300/20 text-gray-400'
                  : rank === 3
                    ? 'bg-orange-600/20 text-orange-500'
                    : dark ? 'text-zinc-500' : 'text-stone-400'
            }`}>
              {rank <= 3 ? (
                <Medal className="w-4 h-4" />
              ) : (
                rank
              )}
            </div>

            {/* Avatar */}
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                dark ? 'bg-zinc-700 text-zinc-400' : 'bg-amber-50 text-ember-600'
              }`}>
                {(profile?.display_name || profile?.username || '?')[0].toUpperCase()}
              </div>
            )}

            {/* Name */}
            <Link
              to={`/user/${profile?.username}`}
              className={`flex-1 text-sm font-medium truncate hover:underline ${
                dark ? 'text-white' : 'text-stone-900'
              }`}
            >
              {profile?.display_name || profile?.username || 'Anonymous'}
            </Link>

            {/* Score */}
            <span className={`text-sm font-bold flex-shrink-0 ${
              sub.match_score >= 90
                ? 'text-emerald-500'
                : sub.match_score >= 70
                  ? dark ? 'text-ember-500' : 'text-ember-600'
                  : dark ? 'text-zinc-400' : 'text-stone-500'
            }`}>
              {Math.round(sub.match_score)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
