import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Clock, Users, User, ExternalLink } from 'lucide-react';
import { useChallenges, useChallengeSubmission, usePageTitle } from '../hooks';
import { ChallengeSubmission, ChallengeLeaderboard } from '../components/challenges';

function getTimeRemaining(endDate) {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;
  if (diff <= 0) return 'Challenge ended';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

function getTimeUntilStart(startDate) {
  const now = new Date();
  const start = new Date(startDate);
  const diff = start - now;
  if (diff <= 0) return 'Starting now';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `Starts in ${days}d ${hours}h`;
  return `Starts in ${hours}h`;
}

const STATUS_CONFIG = {
  active: { label: 'Active', dark: 'bg-emerald-900/30 text-emerald-400', light: 'bg-emerald-100 text-emerald-700' },
  upcoming: { label: 'Upcoming', dark: 'bg-amber-900/30 text-amber-400', light: 'bg-amber-100 text-amber-700' },
  ended: { label: 'Ended', dark: 'bg-zinc-800 text-zinc-400', light: 'bg-stone-100 text-zinc-500' },
};

/**
 * Challenge detail page — /challenge/:id
 * Shows challenge header with countdown, linked Sound Sauce,
 * submission upload area, and leaderboard.
 */
export function ChallengeDetail({ theme, t }) {
  const { id } = useParams();
  const { fetchChallenge } = useChallenges();
  const submission = useChallengeSubmission();

  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  usePageTitle('Challenge', challenge?.title || undefined);

  const dark = theme === 'dark';

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await fetchChallenge(id);
      if (data) {
        setChallenge(data);
      } else {
        setError('Challenge not found.');
      }
      setLoading(false);
    }
    if (id) load();
  }, [id, fetchChallenge]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="space-y-4">
          <div className={`h-8 w-48 rounded-lg ${dark ? 'bg-zinc-900' : 'bg-stone-100'} animate-pulse`} />
          <div className={`h-40 rounded-lg ${dark ? 'bg-zinc-900' : 'bg-stone-100'} animate-pulse`} />
        </div>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className={`p-8 text-center border rounded-lg ${
          dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'
        }`}>
          <Trophy className={`w-12 h-12 mx-auto mb-4 ${t.textDimmed}`} />
          <p className={`text-lg font-medium mb-2 ${t.text}`}>{error || 'Challenge not found.'}</p>
          <Link
            to="/challenges"
            className={`inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium rounded-md ${
              dark
                ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                : 'bg-ember-600 text-white hover:opacity-90'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Challenges
          </Link>
        </div>
      </div>
    );
  }

  const status = challenge.status;
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.ended;
  const creator = challenge.creator;

  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* Back link */}
      <Link
        to="/challenges"
        className={`inline-flex items-center gap-1.5 text-sm mb-6 ${t.textDimmed} ${theme === 'dark' ? 'hover:text-zinc-50' : 'hover:text-stone-900'}`}
      >
        <ArrowLeft className="w-4 h-4" />
        All Challenges
      </Link>

      {/* Challenge header */}
      <div className={`p-6 border rounded-lg mb-8 ${
        dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'
      }`}>
        {/* Status + Time */}
        <div className="flex items-center justify-between mb-4">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${dark ? statusCfg.dark : statusCfg.light}`}>
            {statusCfg.label}
          </span>
          <span className={`flex items-center gap-1.5 text-sm ${t.textDimmed}`}>
            <Clock className="w-4 h-4" />
            {status === 'active' ? getTimeRemaining(challenge.end_date) :
             status === 'upcoming' ? getTimeUntilStart(challenge.start_date) :
             'Challenge ended'}
          </span>
        </div>

        {/* Title */}
        <h1 className={`text-2xl font-bold mb-2 ${t.text}`}>{challenge.title}</h1>

        {/* Description */}
        {challenge.description && (
          <p className={`mb-4 ${t.textMuted}`}>{challenge.description}</p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Creator */}
          <Link
            to={`/user/${creator?.username}`}
            className="flex items-center gap-2 hover:opacity-80"
          >
            {creator?.avatar_url ? (
              <img src={creator.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                dark ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-50 text-ember-600'
              }`}>
                {(creator?.display_name || creator?.username || '?')[0].toUpperCase()}
              </div>
            )}
            <span className={`text-sm ${t.textMuted}`}>
              {creator?.display_name || creator?.username || 'Anonymous'}
            </span>
          </Link>

          <span className={`flex items-center gap-1 text-sm ${t.textDimmed}`}>
            <Users className="w-3.5 h-3.5" />
            {challenge.submission_count} submission{challenge.submission_count !== 1 ? 's' : ''}
          </span>

          {/* Link to reference Sound Sauce */}
          {challenge.sound_sauce_id && (
            <Link
              to={`/recipe/${challenge.sound_sauce_id}`}
              className={`flex items-center gap-1 text-sm font-medium ${
                dark ? 'text-ember-500 hover:text-ember-400' : 'text-ember-600 hover:text-ember-500'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Reference Sound Sauce
            </Link>
          )}
        </div>
      </div>

      {/* Two-column layout: Submission + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submit your recreation */}
        <div>
          <h2 className={`text-lg font-bold mb-4 ${t.text}`}>Submit Your Recreation</h2>
          <ChallengeSubmission
            challengeStatus={status}
            referenceAudioUrl={challenge.reference_audio_url}
            challengeId={challenge.id}
            status={submission.status}
            progress={submission.progress}
            result={submission.result}
            error={submission.error}
            onSubmit={submission.submitEntry}
            onReset={submission.reset}
            isProcessing={submission.isProcessing}
            theme={theme}
          />
        </div>

        {/* Leaderboard */}
        <div>
          <h2 className={`text-lg font-bold mb-4 ${t.text}`}>Leaderboard</h2>
          <ChallengeLeaderboard challengeId={challenge.id} theme={theme} />
        </div>
      </div>
    </div>
  );
}
