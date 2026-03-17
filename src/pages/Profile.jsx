import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Clock, Globe, Lock, Save, Loader2, Waves, Camera, Users, X, UserPlus, UserMinus, Pencil, Download, Zap, Sparkles, Heart, Star, TrendingUp, Award, RefreshCw, MessageCircle, UtensilsCrossed, Link as LinkIcon, Trophy, Search, Music } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFollows, useLikes, usePageTitle, useAchievements, useDownloadedPresets } from '../hooks';
import { CURATED_PRESETS } from '../data/vitalPresets';
// Lazy-loaded — only fetched when user downloads a preset
const getPresetGenerator = () => import('../services/vitalPresetGenerator');
import { BADGES } from '../data/badges';
import { AuthModal } from '../components/auth';
import { SoundCloudEmbed } from '../components/ui';
import { RecipeGrid } from '../components/recipe';
import { supabase } from '../lib/supabase';
import { trackProfileUpdated, trackAnthemSet } from '../lib/posthog';

// Badge progress thresholds — maps badge_type to { current: fn, target: number }
const BADGE_PROGRESS = {
  first_analysis: { target: 1, statKey: 'total' },
  first_recipe: { target: 1, statKey: 'public' },
  five_recipes: { target: 5, statKey: 'public' },
  first_like_given: { target: 1, statKey: 'likesGiven' },
  first_like_received: { target: 1, statKey: 'likesReceived' },
  first_follower: { target: 1, statKey: 'followers' },
  ten_followers: { target: 10, statKey: 'followers' },
  first_recreation: { target: 1, statKey: 'recreations' },
  first_comment: { target: 1, statKey: 'comments' },
  first_challenge: { target: 1, statKey: 'challengeSubmissions' },
};

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'professional'];
const DAW_OPTIONS = ['FL Studio', 'Ableton Live', 'Logic Pro', 'Bitwig', 'Reaper', 'Pro Tools', 'Other'];

const ICON_MAP = {
  Sparkles, Heart, Star, TrendingUp, Award, Users, RefreshCw, Zap, MessageCircle, ChefHat: UtensilsCrossed, Trophy,
};

function getRelativeTime(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffMonth > 0) return `${diffMonth}mo ago`;
  if (diffWeek > 0) return `${diffWeek}w ago`;
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'just now';
}

// Resize image to square using Canvas (no external library)
function resizeImage(file, size) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      // Crop to center square
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Resize failed')), 'image/jpeg', 0.85);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function FollowListFiltered({ followList, followSearchQuery, theme, t, user, isFollowing, toggleFollow, setFollowModal }) {
  const filtered = followSearchQuery.trim()
    ? followList.filter(p =>
        (p.username || '').toLowerCase().includes(followSearchQuery.toLowerCase()) ||
        (p.display_name || '').toLowerCase().includes(followSearchQuery.toLowerCase()) ||
        (p.bio || '').toLowerCase().includes(followSearchQuery.toLowerCase())
      )
    : followList;

  if (filtered.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className={t.textMuted}>No results for &quot;{followSearchQuery}&quot;</p>
      </div>
    );
  }

  return (
    <div>
      {filtered.map((person) => (
        <div
          key={person.id}
          className={`flex items-center gap-3 p-4 transition-colors ${
            theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-amber-50'
          }`}
        >
          <Link
            to={person.username ? `/user/${person.username}` : '#'}
            onClick={() => setFollowModal(null)}
            className="flex-shrink-0"
          >
            {person.avatar_url ? (
              <img src={person.avatar_url} alt="" className="w-10 h-10 object-cover rounded-full" />
            ) : (
              <div className={`w-10 h-10 flex items-center justify-center text-sm font-bold rounded-full ${
                theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-50 text-ember-700'
              }`}>
                {(person.username || '?')[0].toUpperCase()}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              to={person.username ? `/user/${person.username}` : '#'}
              onClick={() => setFollowModal(null)}
              className={`text-sm font-medium hover:underline ${t.text}`}
            >
              {person.username || 'Anonymous'}
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
              {person.bio && (
                <p className={`text-xs truncate max-w-[200px] ${t.textDimmed}`}>{person.bio}</p>
              )}
              {person.daw_preference && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-50 text-ember-700'
                }`}>
                  {person.daw_preference}
                </span>
              )}
            </div>
          </div>
          {person.id !== user?.id && (
            <button
              onClick={() => toggleFollow(person.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors flex-shrink-0 rounded-md ${
                isFollowing(person.id)
                  ? theme === 'dark'
                    ? 'bg-zinc-800 text-zinc-400 hover:bg-red-500/20 hover:text-red-400'
                    : 'bg-stone-100 text-stone-500 hover:bg-red-50 hover:text-red-500'
                  : theme === 'dark'
                    ? 'bg-white text-black hover:bg-stone-200'
                    : 'bg-ember-600 text-white hover:bg-ember-700'
              }`}
            >
              {isFollowing(person.id) ? (
                <>
                  <UserMinus className="w-3 h-3" />
                  Unfollow
                </>
              ) : (
                <>
                  <UserPlus className="w-3 h-3" />
                  Follow
                </>
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Profile page - User profile and settings
 * Shows sign-in prompt for guests, profile with edit toggle for authenticated users
 */
export function Profile({ theme, t }) {
  const { user, profile, loading: authLoading, updateProfile, isPro } = useAuth();
  usePageTitle('Profile', profile?.username || undefined);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [dawPreference, setDawPreference] = useState('');

  // Anthem state (SoundCloud URL)
  const [anthemUrl, setAnthemUrl] = useState('');

  // Avatar upload
  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Sync form with profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setSkillLevel(profile.skill_level || '');
      setDawPreference(profile.daw_preference || '');
      setAnthemUrl(profile.anthem_url || '');
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const { error } = await updateProfile({
      display_name: displayName || null,
      username: username || null,
      bio: bio || null,
      skill_level: skillLevel || null,
      daw_preference: dawPreference || null,
      anthem_url: anthemUrl || null,
    });
    setSaving(false);
    if (!error) {
      const updates = {
        display_name: displayName || null,
        username: username || null,
        bio: bio || null,
        skill_level: skillLevel || null,
        daw_preference: dawPreference || null,
        anthem_url: anthemUrl || null,
      };
      trackProfileUpdated(Object.keys(updates).filter(k => updates[k] !== (profile?.[k] || null)));
      if (anthemUrl && anthemUrl !== profile?.anthem_url) trackAnthemSet();
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleCancel = () => {
    // Reset form to current profile values
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setSkillLevel(profile.skill_level || '');
      setDawPreference(profile.daw_preference || '');
      setAnthemUrl(profile.anthem_url || '');
    }
    setEditing(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      // Resize image to 400x400 using Canvas
      const blob = await resizeImage(file, 400);
      const filePath = `${user.id}/avatar.jpg`;

      // Upload to Supabase Storage (upsert overwrites existing)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Save URL to profile (add cache buster so browser shows new image)
      await updateProfile({ avatar_url: `${publicUrl}?t=${Date.now()}` });
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Follows
  const { followerCount, followingCount, isFollowing, toggleFollow } = useFollows();
  const [followModal, setFollowModal] = useState(null); // 'followers' | 'following' | null
  const [followList, setFollowList] = useState([]);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [followSearchQuery, setFollowSearchQuery] = useState('');

  const openFollowModal = useCallback(async (type) => {
    if (!user) return;
    setFollowModal(type);
    setFollowListLoading(true);
    setFollowList([]);
    setFollowSearchQuery('');

    if (type === 'followers') {
      // People who follow me
      const { data } = await supabase
        .from('follows')
        .select('follower_id, profiles:follower_id(id, username, display_name, avatar_url, bio, daw_preference)')
        .eq('following_id', user.id)
        .order('created_at', { ascending: false });

      setFollowList((data || []).map(r => r.profiles).filter(Boolean));
    } else {
      // People I follow
      const { data } = await supabase
        .from('follows')
        .select('following_id, profiles:following_id(id, username, display_name, avatar_url, bio, daw_preference)')
        .eq('follower_id', user.id)
        .order('created_at', { ascending: false });

      setFollowList((data || []).map(r => r.profiles).filter(Boolean));
    }
    setFollowListLoading(false);
  }, [user]);

  // Fetch real stats from Supabase
  const [stats, setStats] = useState({ total: 0, public: 0, likesGiven: 0, likesReceived: 0, followers: 0, recreations: 0, comments: 0, challengeSubmissions: 0 });
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [publishedRecipes, setPublishedRecipes] = useState([]);
  const [profileTab, setProfileTab] = useState('sauces');
  const { isLiked, toggleLike } = useLikes();
  const { badges, loading: badgesLoading } = useAchievements();
  const { curatedDownloads, communityDownloads, loading: downloadsLoading } = useDownloadedPresets();

  // Count-up animation for stats
  const [animatedStats, setAnimatedStats] = useState({ total: 0, public: 0 });
  const statsAnimated = useRef(false);
  useEffect(() => {
    if (statsAnimated.current || (stats.total === 0 && stats.public === 0)) return;
    statsAnimated.current = true;
    const duration = 800;
    const startTime = performance.now();
    const targets = { total: stats.total, public: stats.public };
    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimatedStats({
        total: Math.round(targets.total * eased),
        public: Math.round(targets.public * eased),
      });
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [stats.total, stats.public]);

  useEffect(() => {
    if (!user) return;

    async function loadStats() {
      const [totalRes, publicRes, recentRes, recipesRes, likesGivenRes, likesReceivedRes, followersRes, recreationsRes, commentsRes, challengeSubsRes] = await Promise.all([
        supabase.from('analyses').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('analyses').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_public', true),
        supabase.from('analyses').select('id, title, instrument, stem_type, is_public, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('analyses').select('id, title, description, tags, instrument, vital_preset_url, like_count, comment_count, download_count, created_at, profiles:user_id(username, display_name, avatar_url)').eq('user_id', user.id).eq('is_public', true).order('created_at', { ascending: false }).limit(50),
        // Badge progress stats
        supabase.from('likes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('analyses').select('like_count').eq('user_id', user.id).eq('is_public', true),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('recreations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('comments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('challenge_submissions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      const totalLikesReceived = (likesReceivedRes.data || []).reduce((sum, r) => sum + (r.like_count || 0), 0);
      setStats({
        total: totalRes.count ?? 0,
        public: publicRes.count ?? 0,
        likesGiven: likesGivenRes.count ?? 0,
        likesReceived: totalLikesReceived,
        followers: followersRes.count ?? 0,
        recreations: recreationsRes.count ?? 0,
        comments: commentsRes.count ?? 0,
        challengeSubmissions: challengeSubsRes.count ?? 0,
      });
      setRecentAnalyses(recentRes.data ?? []);
      setPublishedRecipes(recipesRes.data ?? []);
    }
    loadStats();
  }, [user]);

  // Auth loading skeleton
  if (authLoading) {
    const bg = theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200';
    const bgSubtle = theme === 'dark' ? 'bg-zinc-800/60' : 'bg-stone-100';
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`p-6 border rounded-lg animate-pulse ${theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'}`}>
          <div className="flex items-start gap-5 mb-6">
            <div className={`w-20 h-20 rounded-full ${bg} flex-shrink-0`} />
            <div className="flex-1 space-y-3">
              <div className={`h-6 w-40 rounded ${bg}`} />
              <div className={`h-3.5 w-56 rounded ${bgSubtle}`} />
              <div className="flex gap-6 mt-2">
                <div className={`h-4 w-16 rounded ${bgSubtle}`} />
                <div className={`h-4 w-16 rounded ${bgSubtle}`} />
              </div>
            </div>
          </div>
          <div className={`h-3 w-full rounded ${bgSubtle} mb-2`} />
          <div className={`h-3 w-2/3 rounded ${bgSubtle}`} />
        </div>
      </div>
    );
  }

  // Guest view
  if (!authLoading && !user) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${t.text}`}>Profile</h1>
          <p className={t.textMuted}>Your public profile</p>
        </div>

        <div className={`p-8 border mb-8 rounded-lg ${
          theme === 'dark'
            ? 'bg-zinc-900 border-zinc-700'
            : 'bg-white border-stone-200'
        }`}>
          <div className="flex items-center gap-6 mb-6">
            <div className={`w-20 h-20 flex items-center justify-center rounded-full ${
              theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'
            }`}>
              <User className={`w-10 h-10 ${t.textMuted}`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${t.text}`}>Guest User</h2>
              <p className={t.textMuted}>Sign in to save your progress</p>
            </div>
          </div>

          <button
            onClick={() => setAuthModalOpen(true)}
            className={`w-full py-3 font-medium rounded-md ${
              theme === 'dark'
                ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
                : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-500/20'
            }`}
          >
            Sign In / Create Account
          </button>
        </div>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          theme={theme}
        />
      </div>
    );
  }

  const cardClass = theme === 'dark'
    ? 'bg-zinc-900 border-zinc-700'
    : 'bg-white border-stone-200';

  const inputClass = `w-full px-4 py-3 border outline-none transition-colors rounded-md ${
    theme === 'dark'
      ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 focus:border-zinc-400'
      : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400 focus:border-ember-600'
  }`;

  const selectClass = `w-full px-4 py-3 border outline-none transition-colors rounded-md ${
    theme === 'dark'
      ? 'bg-zinc-950 border-zinc-700 text-white focus:border-zinc-400'
      : 'bg-stone-50 border-stone-200 text-stone-900 focus:border-ember-600'
  }`;

  const primaryName = profile?.display_name || profile?.username || user?.email?.split('@')[0] || 'User';
  const showHandle = profile?.display_name && profile?.username && profile.display_name !== profile.username;

  // Authenticated view
  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Card — Hero with background visual */}
      <div className={`relative overflow-hidden border mb-6 rounded-lg ${cardClass}`}>
        {/* Background visual — subtle gradient + grid pattern */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute inset-0 ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-ember-500/5 via-transparent to-zinc-900'
              : 'bg-gradient-to-br from-amber-50 via-transparent to-white'
          }`} />
          <div className={`absolute inset-0 opacity-[0.03] ${
            theme === 'dark' ? '' : 'opacity-[0.06]'
          }`} style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }} />
        </div>

        <div className="relative p-6 md:p-8">
          {/* Top row: Avatar + Info + Stats */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left: Avatar + Name */}
            <div className="flex items-start gap-5 flex-1 min-w-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className={`relative flex items-center justify-center flex-shrink-0 group cursor-pointer rounded-full ${
                  isPro ? 'p-[3px]' : ''
                }`}
                style={isPro ? {
                  background: theme === 'dark'
                    ? 'linear-gradient(135deg, #F59E0B, #D97706, #F59E0B)'
                    : 'linear-gradient(135deg, #D97706, #B45309, #D97706)',
                } : undefined}
              >
                <div className={`relative w-20 h-20 overflow-hidden rounded-full ${
                  theme === 'dark' ? 'bg-zinc-800' : 'bg-amber-50'
                }`}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-20 h-20 object-cover rounded-full" />
                  ) : (
                    <div className="w-20 h-20 flex items-center justify-center">
                      <User className={`w-10 h-10 ${theme === 'dark' ? 'text-zinc-400' : 'text-ember-600'}`} />
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                    uploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  } ${theme === 'dark' ? 'bg-black/60' : 'bg-black/40'}`}>
                    {uploadingAvatar ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl font-bold font-display ${t.text} truncate`}>{primaryName}</h1>
                  {isPro && (
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-ember-500/20 to-ember-600/20 text-ember-500 border border-ember-500/30'
                        : 'bg-gradient-to-r from-ember-600/10 to-ember-700/10 text-ember-600 border border-ember-600/20'
                    }`}>
                      <Zap className="w-3 h-3" />
                      PRO
                    </span>
                  )}
                </div>
                {showHandle && (
                  <p className={`text-sm ${t.textDimmed}`}>@{profile.username}</p>
                )}
                <p className={`text-sm ${t.textMuted}`}>{user?.email}</p>
                {profile?.bio && !editing && (
                  <p className={`text-sm mt-2 ${t.textMuted} line-clamp-2`}>{profile.bio}</p>
                )}
                {/* Tags: skill level + DAW */}
                {!editing && (profile?.skill_level || profile?.daw_preference) && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.skill_level && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-50 text-ember-700'
                      }`}>
                        {profile.skill_level.charAt(0).toUpperCase() + profile.skill_level.slice(1)}
                      </span>
                    )}
                    {profile.daw_preference && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-50 text-ember-700'
                      }`}>
                        {profile.daw_preference}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Stats + Followers */}
            <div className="flex items-start gap-3 flex-shrink-0">
              {/* Analysis stats — count-up animated */}
              <div className={`text-center px-4 py-2 border rounded-lg ${cardClass}`}>
                <div className={`text-xl font-bold font-mono tabular-nums ${t.text}`}>{animatedStats.total}</div>
                <div className={`text-xs ${t.textMuted}`}>Analyses</div>
              </div>
              <div className={`text-center px-4 py-2 border rounded-lg ${cardClass}`}>
                <div className={`text-xl font-bold font-mono tabular-nums ${t.text}`}>{animatedStats.public}</div>
                <div className={`text-xs ${t.textMuted}`}>Public</div>
              </div>
              {/* Followers / Following */}
              <button
                onClick={() => openFollowModal('followers')}
                className={`text-center px-4 py-2 border transition-colors rounded-lg ${cardClass} ${
                  theme === 'dark' ? 'hover:border-zinc-500' : 'hover:border-ember-600'
                }`}
              >
                <div className={`text-xl font-bold font-mono tabular-nums ${t.text}`}>{followerCount}</div>
                <div className={`text-xs ${t.textMuted}`}>Followers</div>
              </button>
              <button
                onClick={() => openFollowModal('following')}
                className={`text-center px-4 py-2 border transition-colors rounded-lg ${cardClass} ${
                  theme === 'dark' ? 'hover:border-zinc-500' : 'hover:border-ember-600'
                }`}
              >
                <div className={`text-xl font-bold font-mono tabular-nums ${t.text}`}>{followingCount}</div>
                <div className={`text-xs ${t.textMuted}`}>Following</div>
              </button>
              {/* Edit button */}
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className={`p-2.5 border transition-colors rounded-md ${cardClass} ${
                    theme === 'dark' ? 'hover:border-zinc-500 text-zinc-400 hover:text-white' : 'hover:border-ember-600 text-stone-400 hover:text-ember-600'
                  }`}
                  title="Edit profile"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Profile Anthem — full-width below avatar row (non-edit mode) */}
          {!editing && profile?.anthem_url && (
            <div className="mt-4">
              <SoundCloudEmbed url={profile.anthem_url} theme={theme} />
            </div>
          )}

        {/* Edit form (collapsed by default) */}
        {editing && (
          <div className={`mt-6 pt-6 border-t space-y-5 ${
            theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
          }`}>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${t.textMuted}`}>Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                className={inputClass}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${t.textMuted}`}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                className={inputClass}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${t.textMuted}`}>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Anthem (SoundCloud) */}
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${t.textMuted}`}>Profile Anthem</label>
              <div className="space-y-3">
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                    theme === 'dark' ? 'text-zinc-500' : 'text-stone-400'
                  }`}>
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={anthemUrl}
                    onChange={(e) => setAnthemUrl(e.target.value)}
                    placeholder="https://soundcloud.com/artist/track"
                    className={`${inputClass} pl-10`}
                  />
                </div>
                {anthemUrl && (
                  <>
                    <SoundCloudEmbed url={anthemUrl} theme={theme} />
                    <button
                      type="button"
                      onClick={() => setAnthemUrl('')}
                      className={`text-sm font-medium ${theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600'}`}
                    >
                      Remove anthem
                    </button>
                  </>
                )}
                {!anthemUrl && (
                  <p className={`text-xs ${t.textDimmed}`}>
                    Paste a SoundCloud link to showcase a track on your profile
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.textMuted}`}>Skill Level</label>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select level</option>
                  {SKILL_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.textMuted}`}>DAW Preference</label>
                <select
                  value={dawPreference}
                  onChange={(e) => setDawPreference(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select DAW</option>
                  {DAW_OPTIONS.map((daw) => (
                    <option key={daw} value={daw}>{daw}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center justify-center gap-2 px-6 py-3 font-medium transition-all rounded-md ${
                  theme === 'dark'
                    ? 'bg-white text-black hover:bg-stone-200'
                    : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-500/20'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className={`px-6 py-3 font-medium transition-colors rounded-md ${
                  theme === 'dark'
                    ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                Cancel
              </button>
              {saved && (
                <span className={`text-sm ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                  Saved!
                </span>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Tabbed Content: Sound Sauces / Activity / Badges */}
      <div className="mb-8">
        {/* Tab bar */}
        <div className={`flex gap-0 border-b mb-6 ${
          theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
        }`}>
          {[
            { key: 'sauces', label: 'Sound Sauces', count: publishedRecipes.length },
            { key: 'activity', label: 'Activity', count: recentAnalyses.length + curatedDownloads.length + communityDownloads.length },
            { key: 'badges', label: 'Badges', count: badges.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setProfileTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                profileTab === tab.key
                  ? theme === 'dark'
                    ? 'border-white text-white'
                    : 'border-ember-600 text-ember-600'
                  : `border-transparent ${t.textDimmed} ${
                    theme === 'dark' ? 'hover:text-white' : 'hover:text-stone-900'
                  }`
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className={`ml-1.5 text-xs ${
                  profileTab === tab.key ? '' : t.textDimmed
                }`}>
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sound Sauces tab (merged recipes + presets) */}
        {profileTab === 'sauces' && (
          publishedRecipes.length === 0 ? (
            <div className={`p-12 border-2 border-dashed text-center rounded-lg ${
              theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
            }`}>
              <Globe className={`w-8 h-8 mx-auto mb-3 ${t.textDimmed}`} />
              <p className={`font-medium ${t.textMuted}`}>No published Sound Sauces yet</p>
              <p className={`text-sm mt-1 ${t.textDimmed}`}>
                Analyze audio and publish it as a Sound Sauce to share with others.
              </p>
              <Link
                to="/analyze"
                className={`inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  theme === 'dark'
                    ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
                    : 'bg-ember-600 text-white hover:bg-ember-700'
                }`}
              >
                <Waves className="w-4 h-4" />
                Start Analyzing
              </Link>
            </div>
          ) : (
            <RecipeGrid
              recipes={publishedRecipes}
              hasMore={false}
              loading={false}
              onLoadMore={() => {}}
              theme={theme}
              isLiked={isLiked}
              onToggleLike={toggleLike}
            />
          )
        )}

        {/* Activity tab (merged recent analyses + downloads) */}
        {profileTab === 'activity' && (
          <div className="space-y-8">
            {/* Recent Analyses */}
            <div>
              <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${t.textMuted}`}>
                <Clock className="w-4 h-4" />
                Recent Analyses
              </h3>
              {recentAnalyses.length === 0 ? (
                <div className={`p-8 border-2 border-dashed text-center rounded-lg ${
                  theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
                }`}>
                  <Waves className={`w-6 h-6 mx-auto mb-2 ${t.textDimmed}`} />
                  <p className={`text-sm ${t.textMuted}`}>No analyses yet</p>
                  <Link to="/analyze" className={`text-xs mt-1 inline-block ${theme === 'dark' ? 'text-ember-500 hover:text-ember-400' : 'text-ember-600 hover:text-ember-700'}`}>
                    Go to Analyzer
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentAnalyses.map((item) => (
                    <Link
                      key={item.id}
                      to={`/analyze?id=${item.id}`}
                      className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${cardClass} ${
                        theme === 'dark' ? 'hover:border-zinc-600' : 'hover:border-stone-300'
                      }`}
                    >
                      <div>
                        <div className={`font-medium ${t.text}`}>{item.title}</div>
                        <div className={`text-sm ${t.textMuted}`}>
                          {item.instrument}{item.stem_type ? ` (${item.stem_type})` : ''} · {getRelativeTime(item.created_at)}
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${t.textDimmed}`}>
                        {item.is_public ? (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5" /> Public
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" /> Private
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Downloaded Presets */}
            <div>
              <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${t.textMuted}`}>
                <Download className="w-4 h-4" />
                Downloaded Presets ({curatedDownloads.length + communityDownloads.length})
              </h3>
              {downloadsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className={`w-6 h-6 mx-auto animate-spin ${t.textMuted}`} />
                </div>
              ) : curatedDownloads.length + communityDownloads.length === 0 ? (
                <div className={`p-8 border-2 border-dashed text-center rounded-lg ${
                  theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
                }`}>
                  <Music className={`w-6 h-6 mx-auto mb-2 ${t.textDimmed}`} />
                  <p className={`text-sm ${t.textMuted}`}>No downloaded presets yet</p>
                  <Link to="/my-presets" className={`text-xs mt-1 inline-block ${theme === 'dark' ? 'text-ember-500 hover:text-ember-400' : 'text-ember-600 hover:text-ember-700'}`}>
                    Browse Presets
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Curated */}
                  {curatedDownloads.map((dl) => {
                    const presetDef = CURATED_PRESETS.find(p => p.id === dl.presetId);
                    return (
                      <div
                        key={dl.presetId}
                        className={`flex items-center justify-between p-4 border rounded-lg ${cardClass}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className={`font-medium text-sm ${t.text}`}>
                            {presetDef?.name || dl.presetName || dl.presetId}
                          </div>
                          <div className={`text-xs mt-0.5 ${t.textDimmed}`}>
                            {presetDef?.category && (
                              <span className={`inline-block px-1.5 py-0.5 rounded-full mr-1.5 ${
                                theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-50 text-ember-700'
                              }`}>
                                {presetDef.category.charAt(0).toUpperCase() + presetDef.category.slice(1)}
                              </span>
                            )}
                            {getRelativeTime(dl.downloadedAt)}
                          </div>
                        </div>
                        {presetDef && (
                          <button
                            onClick={async () => {
                              const { buildVitalPreset, downloadVitalPreset, buildPresetFilename } = await getPresetGenerator();
                              const categoryLabel = presetDef.category ? presetDef.category.charAt(0).toUpperCase() + presetDef.category.slice(1) : '';
                              const preset = buildVitalPreset(dl.presetId, {}, {
                                instrument: categoryLabel,
                                presetName: presetDef.name || 'SoundSauce Export',
                              });
                              const filename = buildPresetFilename({
                                instrument: categoryLabel,
                                presetName: presetDef.name,
                              });
                              downloadVitalPreset(preset, filename);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all flex-shrink-0 ml-3 ${
                              theme === 'dark'
                                ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                                : 'bg-ember-600 text-white hover:bg-ember-700'
                            }`}
                          >
                            <Download className="w-3 h-3" />
                            .vital
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {/* Community */}
                  {communityDownloads.map((dl) => {
                    const analysis = dl.analyses;
                    if (!analysis) return null;
                    return (
                      <div
                        key={dl.id}
                        className={`flex items-center justify-between p-4 border rounded-lg ${cardClass}`}
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/recipe/${analysis.id}`}
                            className={`font-medium text-sm hover:underline ${t.text}`}
                          >
                            {analysis.title || 'Untitled'}
                          </Link>
                          {analysis.profiles && (
                            <div className={`flex items-center gap-1.5 mt-0.5 ${t.textDimmed}`}>
                              {analysis.profiles.avatar_url ? (
                                <img src={analysis.profiles.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                              ) : (
                                <User className="w-3.5 h-3.5" />
                              )}
                              <span className="text-xs">{analysis.profiles.username || 'Anonymous'}</span>
                            </div>
                          )}
                          <div className={`text-xs mt-1 ${t.textDimmed}`}>
                            {getRelativeTime(dl.created_at)}
                          </div>
                        </div>
                        {analysis.vital_preset_url && (
                          <button
                            onClick={async () => {
                              const { downloadRemotePreset, buildPresetFilename } = await getPresetGenerator();
                              const filename = buildPresetFilename({ presetName: analysis.title });
                              downloadRemotePreset(analysis.vital_preset_url, filename, {
                                preset_name: analysis.title || 'Community Preset',
                                author: 'SoundSauce',
                                comments: `Community preset: ${analysis.title || 'Untitled'}. Downloaded from SoundSauce (soundsauce.app).`,
                              });
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all flex-shrink-0 ml-3 ${
                              theme === 'dark'
                                ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                                : 'bg-ember-600 text-white hover:bg-ember-700'
                            }`}
                          >
                            <Download className="w-3 h-3" />
                            .vital
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Badges tab — with progress bars on locked badges */}
        {profileTab === 'badges' && (
          badgesLoading ? (
            <div className="p-12 text-center">
              <Loader2 className={`w-6 h-6 mx-auto animate-spin ${t.textMuted}`} />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(BADGES).map(([type, badge]) => {
                const earned = badges.find(b => b.badge_type === type);
                const IconComponent = ICON_MAP[badge.icon];
                const progressDef = BADGE_PROGRESS[type];
                const currentProgress = progressDef ? (stats[progressDef.statKey] || 0) : 0;
                const progressPct = progressDef ? Math.min((currentProgress / progressDef.target) * 100, 100) : 0;
                return (
                  <div
                    key={type}
                    className={`p-4 border rounded-lg transition-colors ${
                      earned
                        ? theme === 'dark'
                          ? 'bg-zinc-900 border-ember-500/30'
                          : 'bg-white border-amber-200 shadow-sm'
                        : theme === 'dark'
                          ? 'bg-zinc-900 border-zinc-800'
                          : 'bg-white border-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {IconComponent && (
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                          earned
                            ? theme === 'dark' ? 'bg-ember-500/15' : 'bg-amber-50'
                            : theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-100'
                        }`}>
                          <IconComponent
                            className={`w-4 h-4 ${
                              earned
                                ? theme === 'dark' ? 'text-ember-500' : 'text-ember-600'
                                : theme === 'dark' ? 'text-zinc-500' : 'text-stone-400'
                            }`}
                          />
                        </div>
                      )}
                      <span className={`font-medium text-sm ${
                        earned ? t.text : theme === 'dark' ? 'text-zinc-400' : 'text-stone-500'
                      }`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className={`text-xs mb-2 ${
                      earned ? t.textMuted : theme === 'dark' ? 'text-zinc-500' : 'text-stone-400'
                    }`}>
                      {badge.description}
                    </p>
                    {earned ? (
                      <p className={`text-xs ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`}>
                        Earned {getRelativeTime(earned.earned_at)}
                      </p>
                    ) : progressDef ? (
                      <div>
                        <div className={`flex items-center justify-between text-xs mb-1 ${
                          theme === 'dark' ? 'text-zinc-500' : 'text-stone-400'
                        }`}>
                          <span>{currentProgress} / {progressDef.target}</span>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${
                          theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'
                        }`}>
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              progressPct >= 100
                                ? theme === 'dark' ? 'bg-ember-500' : 'bg-ember-600'
                                : progressPct > 0
                                  ? theme === 'dark' ? 'bg-zinc-500' : 'bg-stone-400'
                                  : ''
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className={`text-xs flex items-center gap-1 ${
                        theme === 'dark' ? 'text-zinc-500' : 'text-stone-400'
                      }`}>
                        <Lock className="w-3 h-3" />
                        Locked
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Followers / Following Modal */}
      {followModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setFollowModal(null)}
          />
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md max-h-[80vh] flex flex-col border rounded-lg ${
            theme === 'dark'
              ? 'bg-zinc-900 border-zinc-700'
              : 'bg-white border-stone-200'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${
              theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
            }`}>
              <h3 className={`text-lg font-bold ${t.text}`}>
                {followModal === 'followers' ? 'Followers' : 'Following'}
              </h3>
              <button
                onClick={() => setFollowModal(null)}
                className={`p-1 transition-colors ${
                  theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-stone-500 hover:text-black'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search bar */}
            {!followListLoading && followList.length > 0 && (
              <div className={`px-4 py-3 border-b ${
                theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
              }`}>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textDimmed}`} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={followSearchQuery}
                    onChange={(e) => setFollowSearchQuery(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-sm border outline-none rounded-md ${
                      theme === 'dark'
                        ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 focus:border-zinc-500'
                        : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400 focus:border-ember-600'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {followListLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className={`w-6 h-6 mx-auto animate-spin ${t.textMuted}`} />
                </div>
              ) : followList.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className={`w-8 h-8 mx-auto mb-3 ${t.textDimmed}`} />
                  <p className={t.textMuted}>
                    {followModal === 'followers'
                      ? 'No followers yet. Share your recipes to grow your audience!'
                      : 'Not following anyone yet. Discover producers on the Discover page!'}
                  </p>
                </div>
              ) : (
                <FollowListFiltered
                  followList={followList}
                  followSearchQuery={followSearchQuery}
                  theme={theme}
                  t={t}
                  user={user}
                  isFollowing={isFollowing}
                  toggleFollow={toggleFollow}
                  setFollowModal={setFollowModal}
                />
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
