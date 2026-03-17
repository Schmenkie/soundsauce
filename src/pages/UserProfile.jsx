import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Music, Globe, Users, Download, Sparkles, Heart, Star, TrendingUp, Award, RefreshCw, Zap, MessageCircle, UtensilsCrossed, Trophy, MessageSquare, Shield, Ban, Loader, ChevronUp, ChevronDown, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RecipeGrid, FollowButton } from '../components/recipe';
import { SoundCloudEmbed } from '../components/ui';
import { useFollows, useLikes, usePageTitle, useAchievements, useConversations } from '../hooks';
import { BADGES } from '../data/badges';
import { useAuth } from '../contexts/AuthContext';

const BADGE_ICON_MAP = {
  Sparkles, Heart, Star, TrendingUp, Award, Users, RefreshCw, Zap, MessageCircle, ChefHat: UtensilsCrossed, Trophy,
};

/**
 * Public user profile page — /user/:username
 * Shows user info + their public Sound Recipes.
 */
export function UserProfile({ theme, t }) {
  const { username } = useParams();
  usePageTitle('User', username || undefined);
  const { user, isAdmin } = useAuth();
  const [profile, setProfile] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [activeTab, setActiveTab] = useState('recipes');
  const navigate = useNavigate();
  const { isFollowing, toggleFollow, fetchCounts } = useFollows();
  const { isLiked, toggleLike } = useLikes();
  const { badges: userBadges } = useAchievements(profile?.id);
  const { getOrCreateConversation } = useConversations();

  const [adminLoading, setAdminLoading] = useState(false);

  const handleMessage = async () => {
    if (!profile?.id) return;
    const conv = await getOrCreateConversation(profile.id);
    if (conv) navigate('/messages');
  };

  const handleChangeTier = async (tier) => {
    if (!window.confirm(`Change ${profile.username}'s tier to ${tier}?`)) return;
    setAdminLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');
      const res = await fetch('/api/admin-actions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'changeTier', userId: profile.id, tier }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to change tier');
      }
      setProfile(prev => ({ ...prev, subscription_tier: tier }));
    } catch (err) {
      alert(`Failed to change tier: ${err.message}`);
    }
    setAdminLoading(false);
  };

  const handleToggleSuspend = async () => {
    const newSuspended = !profile.is_suspended;
    if (!window.confirm(`${newSuspended ? 'Suspend' : 'Unsuspend'} ${profile.username}? ${newSuspended ? 'They will be flagged as suspended.' : 'They will be unflagged.'}`)) return;
    setAdminLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');
      const res = await fetch('/api/admin-actions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'toggleSuspend', userId: profile.id, isSuspended: newSuspended }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to toggle suspend');
      }
      setProfile(prev => ({ ...prev, is_suspended: newSuspended }));
    } catch (err) {
      alert(`Failed: ${err.message}`);
    }
    setAdminLoading(false);
  };

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);

      // Fetch profile by username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError || !profileData) {
        setError('User not found.');
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Fetch their public recipes
      const { data: recipeData } = await supabase
        .from('analyses')
        .select('id, title, description, tags, instrument, vital_preset_url, is_featured, like_count, comment_count, download_count, created_at, profiles:user_id(username, display_name, avatar_url)')
        .eq('user_id', profileData.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      setRecipes(recipeData || []);

      // Fetch follow counts
      const c = await fetchCounts(profileData.id);
      setCounts(c);

      setLoading(false);
    }

    if (username) loadProfile();
  }, [username]);

  if (loading) {
    const bg = theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200';
    const bgSubtle = theme === 'dark' ? 'bg-zinc-800/60' : 'bg-stone-100';
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`p-6 border rounded-lg animate-pulse ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
          {/* Header row: avatar + info + stats */}
          <div className="flex items-start gap-5 mb-6">
            <div className={`w-20 h-20 rounded-full ${bg} flex-shrink-0`} />
            <div className="flex-1 space-y-3">
              <div className={`h-6 w-40 rounded ${bg}`} />
              <div className={`h-3.5 w-64 rounded ${bgSubtle}`} />
              <div className="flex gap-6 mt-2">
                <div className={`h-4 w-16 rounded ${bgSubtle}`} />
                <div className={`h-4 w-16 rounded ${bgSubtle}`} />
                <div className={`h-4 w-16 rounded ${bgSubtle}`} />
              </div>
            </div>
          </div>
          {/* Bio */}
          <div className={`h-3 w-full rounded ${bgSubtle} mb-2`} />
          <div className={`h-3 w-3/4 rounded ${bgSubtle} mb-6`} />
          {/* Badge row */}
          <div className="flex gap-2">
            {[1, 2, 3].map(i => <div key={i} className={`h-7 w-20 rounded-full ${bgSubtle}`} />)}
          </div>
        </div>
        {/* Recipe grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {[1, 2, 3].map(i => (
            <div key={i} className={`p-4 border animate-pulse rounded-lg ${theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'}`}>
              <div className={`h-4 w-2/3 rounded ${bg} mb-3`} />
              <div className={`h-3 w-full rounded ${bgSubtle} mb-2`} />
              <div className={`h-3 w-4/5 rounded ${bgSubtle} mb-4`} />
              <div className={`flex items-center justify-between pt-3 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-stone-100'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full ${bg}`} />
                  <div className={`h-3 w-20 rounded ${bgSubtle}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className={`p-8 text-center border rounded-lg ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'
        }`}>
          <User className={`w-12 h-12 mx-auto mb-4 ${t.textDimmed}`} />
          <p className={`text-lg font-medium mb-2 ${t.text}`}>{error}</p>
          <Link
            to="/discover"
            className={`inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium rounded-md ${
              theme === 'dark'
                ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                : 'bg-ember-600 text-white hover:bg-ember-700'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Discover
          </Link>
        </div>
      </div>
    );
  }

  const publicCount = recipes.length;

  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* Profile Header */}
      <div className={`p-6 border mb-8 rounded-lg ${
        theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'
      }`}>
        <div className="flex items-start gap-5">
          {/* Avatar */}
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-20 h-20 object-cover flex-shrink-0 rounded-full" />
          ) : (
            <div className={`w-20 h-20 flex items-center justify-center text-2xl font-bold flex-shrink-0 rounded-full ${
              theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-50 text-ember-600'
            }`}>
              {(profile.display_name || profile.username || '?')[0].toUpperCase()}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className={`text-2xl font-bold ${t.text}`}>{profile.display_name || profile.username || 'Anonymous'}</h1>
              {user && user.id !== profile.id && (
                <>
                  <FollowButton
                    following={isFollowing(profile.id)}
                    onToggle={() => toggleFollow(profile.id)}
                    theme={theme}
                  />
                  <button
                    onClick={handleMessage}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      theme === 'dark'
                        ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                        : 'bg-stone-900 text-white hover:bg-stone-800'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Message
                  </button>
                </>
              )}
            </div>

            {profile.display_name && profile.username && (
              <p className={`text-sm ${t.textDimmed}`}>@{profile.username}</p>
            )}

            {profile.bio && (
              <p className={`mt-1 ${t.textMuted}`}>{profile.bio}</p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <span className={`flex items-center gap-1 text-sm ${t.textDimmed}`}>
                <Users className="w-3.5 h-3.5" />
                <strong className={t.text}>{counts.followers}</strong> follower{counts.followers !== 1 ? 's' : ''}
              </span>
              <span className={`text-sm ${t.textDimmed}`}>
                <strong className={t.text}>{counts.following}</strong> following
              </span>
              {profile.skill_level && (
                <span className={`text-sm px-2 py-0.5 rounded-full ${
                  theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-50 text-ember-600'
                }`}>
                  {profile.skill_level.charAt(0).toUpperCase() + profile.skill_level.slice(1)}
                </span>
              )}
              {profile.daw_preference && (
                <span className={`flex items-center gap-1 text-sm ${t.textDimmed}`}>
                  <Music className="w-3.5 h-3.5" />
                  {profile.daw_preference}
                </span>
              )}
              <span className={`flex items-center gap-1 text-sm ${t.textDimmed}`}>
                <Globe className="w-3.5 h-3.5" />
                {publicCount} recipe{publicCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Profile Anthem */}
            {profile.anthem_url && (
              <div className="mt-4">
                <SoundCloudEmbed url={profile.anthem_url} theme={theme} />
              </div>
            )}

            {/* Earned badges row */}
            {userBadges.length > 0 && (
              <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                {userBadges.map((earned) => {
                  const badge = BADGES[earned.badge_type];
                  if (!badge) return null;
                  const IconComponent = BADGE_ICON_MAP[badge.icon];
                  return (
                    <span
                      key={earned.badge_type}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium whitespace-nowrap rounded-full ${
                        theme === 'dark'
                          ? 'bg-zinc-800 text-ember-500'
                          : 'bg-amber-50 text-ember-600'
                      }`}
                      title={badge.description}
                    >
                      {IconComponent && <IconComponent className="w-3 h-3" />}
                      {badge.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Panel */}
      {isAdmin && profile && user?.id !== profile.id && (
        <div className={`p-5 border mb-8 rounded-lg ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <Shield className={`w-5 h-5 ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`} />
            <h2 className={`text-lg font-bold ${t.text}`}>Admin Controls</h2>
            {profile.is_suspended && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-red-500/10 text-red-500">
                <Ban className="w-3 h-3" />
                Suspended
              </span>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-zinc-950' : 'bg-stone-50'}`}>
              <div className={`text-xs font-medium mb-1 ${t.textDimmed}`}>Tier</div>
              <div className={`text-sm font-bold capitalize ${
                profile.subscription_tier === 'pro'
                  ? theme === 'dark' ? 'text-ember-500' : 'text-ember-600'
                  : t.text
              }`}>
                {profile.subscription_tier || 'free'}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-zinc-950' : 'bg-stone-50'}`}>
              <div className={`text-xs font-medium mb-1 ${t.textDimmed}`}>Signed Up</div>
              <div className={`text-sm font-bold ${t.text}`}>
                {new Date(profile.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-zinc-950' : 'bg-stone-50'}`}>
              <div className={`text-xs font-medium mb-1 ${t.textDimmed}`}>Recipes</div>
              <div className={`text-sm font-bold ${t.text}`}>{recipes.length}</div>
            </div>
            <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-zinc-950' : 'bg-stone-50'}`}>
              <div className={`text-xs font-medium mb-1 ${t.textDimmed}`}>Total Likes</div>
              <div className={`text-sm font-bold ${t.text}`}>
                {recipes.reduce((sum, r) => sum + (r.like_count || 0), 0)}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-zinc-950' : 'bg-stone-50'}`}>
              <div className={`text-xs font-medium mb-1 ${t.textDimmed}`}>Downloads</div>
              <div className={`text-sm font-bold ${t.text}`}>
                {recipes.reduce((sum, r) => sum + (r.download_count || 0), 0)}
              </div>
            </div>
          </div>

          {/* User ID (for debugging) */}
          <div className={`text-xs mb-4 ${t.textDimmed}`}>
            ID: <span className="font-mono">{profile.id}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {profile.subscription_tier !== 'pro' ? (
              <button
                onClick={() => handleChangeTier('pro')}
                disabled={adminLoading}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                  theme === 'dark'
                    ? 'bg-zinc-800 text-ember-500 hover:bg-zinc-700'
                    : 'bg-amber-50 text-ember-600 hover:bg-amber-100'
                }`}
              >
                {adminLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <ChevronUp className="w-3.5 h-3.5" />}
                Upgrade to Pro
              </button>
            ) : (
              <button
                onClick={() => handleChangeTier('free')}
                disabled={adminLoading}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                  theme === 'dark'
                    ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {adminLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Downgrade to Free
              </button>
            )}

            <button
              onClick={handleToggleSuspend}
              disabled={adminLoading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                profile.is_suspended
                  ? theme === 'dark'
                    ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                  : theme === 'dark'
                    ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                    : 'bg-red-50 text-red-500 hover:bg-red-100'
              }`}
            >
              {adminLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
              {profile.is_suspended ? 'Unsuspend User' : 'Suspend User'}
            </button>
          </div>
        </div>
      )}

      {/* Tabbed Content: Recipes / Presets */}
      <div className={`flex gap-0 border-b mb-6 ${
        theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
      }`}>
        {[
          { key: 'recipes', label: 'Recipes', count: recipes.length },
          { key: 'presets', label: 'Presets', count: recipes.filter(r => r.vital_preset_url).length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? theme === 'dark'
                  ? 'border-white text-white'
                  : 'border-ember-600 text-ember-600'
                : `border-transparent ${t.textDimmed} ${
                  theme === 'dark' ? 'hover:text-white' : 'hover:text-stone-900'
                }`
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 text-xs ${activeTab === tab.key ? '' : t.textDimmed}`}>
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Recipes tab */}
      {activeTab === 'recipes' && (
        recipes.length === 0 ? (
          <div className={`p-12 border-2 border-dashed text-center rounded-lg ${
            theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
          }`}>
            <p className={t.textMuted}>No published recipes yet.</p>
          </div>
        ) : (
          <RecipeGrid
            recipes={recipes}
            hasMore={false}
            loading={false}
            onLoadMore={() => {}}
            theme={theme}
            isLiked={isLiked}
            onToggleLike={toggleLike}
          />
        )
      )}

      {/* Presets tab */}
      {activeTab === 'presets' && (() => {
        const presetRecipes = recipes.filter(r => r.vital_preset_url);
        return presetRecipes.length === 0 ? (
          <div className={`p-12 border-2 border-dashed text-center rounded-lg ${
            theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
          }`}>
            <Download className={`w-8 h-8 mx-auto mb-3 ${t.textDimmed}`} />
            <p className={t.textMuted}>No presets shared yet.</p>
          </div>
        ) : (
          <RecipeGrid
            recipes={presetRecipes}
            hasMore={false}
            loading={false}
            onLoadMore={() => {}}
            theme={theme}
            isLiked={isLiked}
            onToggleLike={toggleLike}
          />
        );
      })()}
    </div>
  );
}
