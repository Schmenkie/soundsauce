import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';
import { ArrowRight, Upload, Users, Clock, User, Loader, UserPlus, BarChart2, SlidersVertical, Sparkles, Play, Heart, Music, Headphones, Download, Zap } from 'lucide-react';
import { useFeed, useLikes, useFollows, useHistory, usePresetPost, usePageTitle } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { RecipeGrid, PresetPostModal } from '../components/recipe';
import { OnboardingModal, HeroBackground, AnimatedCounter } from '../components/ui';
import { RecipeCardSkeleton } from '../components/ui/Skeleton';
import { trackHeroDemoClicked, trackHeroDemoRevealed, trackHeroCTAClicked } from '../lib/posthog';

// Relative time formatter for history items
function formatRelativeTime(timestamp) {
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const seconds = Math.floor((Date.now() - time) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(time).toLocaleDateString();
}

/**
 * Home page - Landing and feed
 * Guests: Hero + feature cards + trending recipes
 * Auth'd users: Personalized greeting + recent analyses + feed
 */
export function Home({ theme, t }) {
  usePageTitle('Home');
  const isDark = theme === 'dark';
  const { user, profile, updateProfile } = useAuth();
  const { history } = useHistory();
  const { followingIds } = useFollows();
  const { feedItems, loading: feedLoading, fetchFeed } = useFeed(followingIds);
  const { isLiked, toggleLike } = useLikes();
  const { postPreset, status: presetStatus, error: presetError, reset: resetPreset } = usePresetPost();
  const navigate = useNavigate();

  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [followedProfiles, setFollowedProfiles] = useState([]);
  const [showDemoResults, setShowDemoResults] = useState(false);
  const [demoAnimating, setDemoAnimating] = useState(false);
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  // featuredLoading not shown in UI — fetch is fast enough
  const [, setFeaturedLoading] = useState(false);
  const [platformStats, setPlatformStats] = useState(null);
  const demoResultsRef = useRef(null);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Fetch profiles for followed users
  useEffect(() => {
    if (!user || followingIds.size === 0) {
      setFollowedProfiles([]);
      return;
    }

    async function fetchFollowedProfiles() {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .in('id', [...followingIds]);

      setFollowedProfiles(data || []);
    }

    fetchFollowedProfiles();
  }, [user, followingIds]);

  // Fetch platform stats for social proof (guests only)
  useEffect(() => {
    if (user) return;
    let cancelled = false;
    async function fetchStats() {
      try {
        const res = await fetch('/api/public-stats');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setPlatformStats(data);
        }
      } catch { /* silent fail */ }
    }
    fetchStats();
    return () => { cancelled = true; };
  }, [user]);

  // Fetch featured Sound Sauces for guests
  useEffect(() => {
    if (user) return; // Only for guests
    let cancelled = false;
    async function fetchFeatured() {
      setFeaturedLoading(true);
      const { data } = await supabase
        .from('analyses')
        .select('id, title, description, tags, results, created_at, like_count, comment_count, post_type, vital_preset_url, profiles:user_id(username, avatar_url)')
        .eq('is_public', true)
        .order('like_count', { ascending: false })
        .limit(6);
      if (!cancelled) {
        setFeaturedRecipes(data || []);
        setFeaturedLoading(false);
      }
    }
    fetchFeatured();
    return () => { cancelled = true; };
  }, [user]);

  // Show onboarding for new users
  useEffect(() => {
    if (user && profile && profile.onboarding_completed === false) {
      setShowOnboarding(true);
    }
  }, [user, profile]);

  async function handleOnboardingComplete(preferences) {
    const updates = { onboarding_completed: true };
    if (preferences.skill_level) updates.skill_level = preferences.skill_level;
    if (preferences.daw_preference) updates.daw_preference = preferences.daw_preference;
    await updateProfile(updates);
    setShowOnboarding(false);
  }

  async function handlePresetSubmit(data) {
    const newId = await postPreset(data);
    if (newId) {
      setShowPresetModal(false);
      resetPreset();
      navigate(`/recipe/${newId}`);
    }
  }

  // Hardcoded demo analysis results (pre-computed from the Cm7 demo chord)
  const DEMO_RESULTS = {
    instrument: 'Pad',
    key: 'C Minor',
    bpm: '—',
    waveform: 'Sawtooth',
    brightness: '42%',
    adsr: { attack: '150ms', decay: '80ms', sustain: '65%', release: '200ms' },
    filterSweep: 'Low-pass 200 Hz → 3,500 Hz',
    steps: [
      'Open Vital (free synth) — set OSC 1 to Sawtooth',
      'Filter: Low-pass, cutoff 800 Hz, resonance 15%',
      'ADSR: Attack 150ms, Sustain 65%, Release 200ms',
      'Add reverb (30% wet) + subtle chorus for width',
    ],
  };

  function handleDemoClick() {
    trackHeroDemoClicked();
    setDemoAnimating(true);
    // Short delay to simulate "analyzing" — feels more real
    setTimeout(() => {
      setDemoAnimating(false);
      setShowDemoResults(true);
      trackHeroDemoRevealed();
      // Auto-scroll to the revealed demo results
      setTimeout(() => {
        demoResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }, 1200);
  }

  return (
    <div className="max-w-6xl mx-auto">
      {user ? (
        /* ===== AUTHENTICATED USER EXPERIENCE ===== */
        <>
          {/* Personalized Greeting + Actions */}
          <section className="py-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 flex items-center justify-center flex-shrink-0 rounded-full overflow-hidden ${
                  theme === 'dark' ? 'bg-zinc-900' : 'bg-amber-50'
                }`}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-14 h-14 object-cover rounded-full" />
                  ) : (
                    <User className={`w-7 h-7 ${theme === 'dark' ? 'text-zinc-400' : 'text-ember-600'}`} />
                  )}
                </div>
                <div>
                  <h1 className={`text-2xl md:text-3xl font-bold ${t.text}`}>
                    Welcome back, {profile?.username || user.email?.split('@')[0]}
                  </h1>
                  <p className={`text-sm mt-1 ${t.textMuted}`}>
                    Ready to analyze some sounds?
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPresetModal(true)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors flex-shrink-0 rounded-md ${
                  theme === 'dark'
                    ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                    : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-500/20'
                }`}
              >
                <Upload className="w-4 h-4" />
                Post Preset
              </button>
            </div>
          </section>

          {/* Preset Post Modal */}
          <PresetPostModal
            isOpen={showPresetModal}
            onClose={() => { setShowPresetModal(false); resetPreset(); }}
            onSubmit={handlePresetSubmit}
            theme={theme}
            status={presetStatus}
            error={presetError}
          />

          {/* Onboarding Modal */}
          <OnboardingModal
            isOpen={showOnboarding}
            onComplete={handleOnboardingComplete}
            theme={theme}
          />

          {/* Pick Up Where You Left Off */}
          {history.length > 0 && (
            <section className="pb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className={`w-5 h-5 ${t.textMuted}`} />
                  <h2 className={`text-lg font-bold ${t.text}`}>Pick Up Where You Left Off</h2>
                </div>
                <Link
                  to="/analyze"
                  className={`text-sm font-medium flex items-center gap-1 ${
                    theme === 'dark'
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-ember-600 hover:text-ember-700'
                  }`}
                >
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {history.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    to={item.isCloud ? `/analyze?id=${item.id}` : '/analyze'}
                    className={`block p-4 border transition-all rounded-lg ${
                      theme === 'dark'
                        ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                        : 'bg-white border-stone-200 hover:border-ember-600 hover:shadow-lg hover:shadow-ember-500/10'
                    }`}
                  >
                    <div className={`font-medium truncate ${t.text}`}>
                      {item.title || 'Untitled'}
                    </div>
                    <div className={`text-sm mt-1 flex items-center gap-2 ${t.textMuted}`}>
                      <span className="capitalize">
                        {item.instrument && item.instrument !== 'full' ? item.instrument : 'Full Track'}
                      </span>
                      <span className={t.textDimmed}>·</span>
                      <span>{formatRelativeTime(item.timestamp || item.created_at)}</span>
                    </div>
                    {/* Feature preview */}
                    {(item.features?.bpm || item.features?.key) && (
                      <div className={`flex gap-3 mt-2 text-xs ${t.textDimmed}`}>
                        {item.features?.bpm?.bpm && (
                          <span>{Math.round(item.features.bpm.bpm)} BPM</span>
                        )}
                        {item.features?.key?.key && (
                          <span>{item.features.key.key}</span>
                        )}
                        {item.features?.brightness && (
                          <span>{(parseFloat(item.features.brightness) * 100).toFixed(0)}% bright</span>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Following */}
          {followedProfiles.length > 0 && (
            <section className="pb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className={`w-5 h-5 ${t.textMuted}`} />
                  <h2 className={`text-lg font-bold ${t.text}`}>Following</h2>
                  <span className={`text-sm ${t.textDimmed}`}>({followedProfiles.length})</span>
                </div>
                <Link
                  to="/search"
                  className={`text-sm font-medium flex items-center gap-1 ${
                    theme === 'dark'
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-ember-600 hover:text-ember-700'
                  }`}
                >
                  Find people <UserPlus className="w-4 h-4" />
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {followedProfiles.map((fp) => (
                  <Link
                    key={fp.id}
                    to={`/user/${fp.username}`}
                    className={`flex-shrink-0 flex items-center gap-3 p-3 border transition-all w-56 rounded-lg ${
                      theme === 'dark'
                        ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                        : 'bg-white border-stone-200 hover:border-ember-600 hover:shadow-lg hover:shadow-ember-500/10'
                    }`}
                  >
                    <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-full overflow-hidden ${
                      theme === 'dark' ? 'bg-zinc-800' : 'bg-amber-50'
                    }`}>
                      {fp.avatar_url ? (
                        <img src={fp.avatar_url} alt="" className="w-10 h-10 object-cover rounded-full" />
                      ) : (
                        <User className={`w-5 h-5 ${theme === 'dark' ? 'text-zinc-400' : 'text-ember-600'}`} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-sm font-medium truncate ${t.text}`}>
                        {fp.display_name || fp.username}
                      </div>
                      {fp.bio && (
                        <div className={`text-xs truncate ${t.textDimmed}`}>
                          {fp.bio}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Your Feed */}
          <section className="py-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${t.text}`}>Your Feed</h2>
              <Link
                to="/discover"
                className={`text-sm font-medium flex items-center gap-1 ${
                  theme === 'dark'
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-ember-600 hover:text-ember-700'
                }`}
              >
                Discover more <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {feedLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <RecipeCardSkeleton key={i} theme={theme} />
                ))}
              </div>
            ) : feedItems.length === 0 ? (
              <div className={`p-12 border-2 border-dashed text-center rounded-lg ${
                theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
              }`}>
                <p className={t.textMuted}>
                  No recipes in your feed yet. Follow other producers or check out what's trending!
                </p>
                <Link
                  to="/discover"
                  className={`inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium rounded-md ${
                    theme === 'dark'
                      ? 'bg-white text-black hover:bg-stone-200'
                      : 'bg-ember-600 text-white hover:bg-ember-700'
                  }`}
                >
                  Browse Sound Sauces <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <RecipeGrid
                recipes={feedItems}
                hasMore={false}
                loading={false}
                onLoadMore={() => {}}
                theme={theme}
                isLiked={isLiked}
                onToggleLike={toggleLike}
              />
            )}
          </section>
        </>
      ) : (
        /* ===== GUEST EXPERIENCE ===== */
        <>
          {/* Hero Section — Two-column: text left, product preview right */}
          <HeroBackground theme={theme}>
            <section className="pt-10 pb-10 md:pt-16 md:pb-14 lg:pt-20 lg:pb-16">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center px-4">
                {/* Left column — Copy + CTAs */}
                <div>
                  {/* Badge */}
                  <motion.div
                    initial={{ opacity: 0, filter: 'blur(12px)', y: 12 }}
                    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                    transition={{ type: 'spring', bounce: 0.3, duration: 1.5, delay: 0.2 }}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-6 md:mb-8 ${
                      isDark
                        ? 'bg-white/[0.03] border-white/[0.08]'
                        : 'bg-amber-50/60 border-amber-200/40'
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ember-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-ember-500" />
                    </span>
                    <span className={`text-sm tracking-wide ${isDark ? 'text-white/60' : 'text-stone-500'}`}>
                      Sound design made simple
                    </span>
                  </motion.div>

                  {/* Heading — word-by-word blur-in */}
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold mb-4 md:mb-5 tracking-tight leading-[1.1]">
                    {'Hear a sound you love?'.split(' ').map((word, i) => (
                      <motion.span
                        key={`l1-${i}`}
                        initial={{ opacity: 0, filter: 'blur(12px)', y: 10 }}
                        animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: 0.4 + i * 0.08,
                          ease: 'easeOut',
                        }}
                        className={`inline-block mr-[0.25em] bg-clip-text text-transparent ${
                          isDark
                            ? 'bg-gradient-to-b from-white to-white/80'
                            : 'bg-gradient-to-b from-stone-900 to-stone-700'
                        }`}
                      >
                        {word}
                      </motion.span>
                    ))}
                    <br />
                    {'Learn to make it.'.split(' ').map((word, i) => (
                      <motion.span
                        key={`l2-${i}`}
                        initial={{ opacity: 0, filter: 'blur(12px)', y: 10 }}
                        animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: 0.8 + i * 0.08,
                          ease: 'easeOut',
                        }}
                        className="inline-block mr-[0.25em] bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-amber-500 to-orange-500"
                      >
                        {word}
                      </motion.span>
                    ))}
                  </h1>

                  {/* Subheading */}
                  <motion.p
                    initial={{ opacity: 0, filter: 'blur(8px)', y: 10 }}
                    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                    transition={{ type: 'spring', bounce: 0.3, duration: 1.2, delay: 1.15 }}
                    className={`text-base sm:text-lg md:text-xl mb-6 leading-relaxed font-light tracking-wide max-w-lg ${
                      isDark ? 'text-zinc-400' : 'text-stone-500'
                    }`}
                  >
                    Upload any sound. Get step-by-step synth settings and a free Vital preset to recreate it.
                  </motion.p>

                  {/* CTAs */}
                  <motion.div
                    initial={{ opacity: 0, filter: 'blur(8px)', y: 10 }}
                    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                    transition={{ type: 'spring', bounce: 0.3, duration: 1.2, delay: 1.35 }}
                    className="flex flex-col sm:flex-row items-start gap-3 mb-6"
                  >
                    <Link
                      to="/analyze"
                      onClick={() => trackHeroCTAClicked('try_it_free')}
                      className={`group inline-flex items-center gap-2 px-7 py-3.5 text-base font-medium transition-all rounded-lg w-full sm:w-auto justify-center ${
                        isDark
                          ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600 shadow-lg shadow-ember-500/20 hover:shadow-ember-500/30'
                          : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-600/30 hover:shadow-ember-600/40'
                      }`}
                    >
                      Try It Free
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <button
                      onClick={handleDemoClick}
                      disabled={demoAnimating}
                      className={`inline-flex items-center gap-2 px-6 py-3.5 text-base font-medium transition-all rounded-lg w-full sm:w-auto justify-center border ${
                        isDark
                          ? 'border-zinc-700/50 text-white hover:bg-zinc-800/50 hover:border-zinc-600'
                          : 'border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-amber-50/50'
                      } disabled:opacity-50`}
                    >
                      {demoAnimating ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                      {demoAnimating ? 'Analyzing...' : 'See It In Action'}
                    </button>
                  </motion.div>

                  {/* Trust line + inline stats */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 1.6 }}
                    className="space-y-2"
                  >
                    <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>
                      Free to use &middot; No account needed &middot; Works with free plugins
                    </p>
                    {platformStats && (platformStats.totalAnalyses > 0 || platformStats.publicRecipes > 0) && (
                      <div className={`flex flex-wrap items-center gap-4 text-sm ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>
                        {platformStats.totalAnalyses > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Headphones className="w-3.5 h-3.5" />
                            <AnimatedCounter end={platformStats.totalAnalyses} duration={2000} suffix="+" className="font-semibold" /> analyzed
                          </span>
                        )}
                        {platformStats.publicRecipes > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Music className="w-3.5 h-3.5" />
                            <AnimatedCounter end={platformStats.publicRecipes} duration={2000} suffix="+" className="font-semibold" /> shared
                          </span>
                        )}
                        {platformStats.totalDownloads > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Download className="w-3.5 h-3.5" />
                            <AnimatedCounter end={platformStats.totalDownloads} duration={2000} suffix="+" className="font-semibold" /> downloads
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Right column — Product Preview (code-based mockup) */}
                <motion.div
                  initial={{ opacity: 0, x: 40, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 1.8, delay: 0.6 }}
                  className="hidden lg:block"
                >
                  <div className={`rounded-xl border overflow-hidden shadow-2xl ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-700/50 shadow-black/50'
                      : 'bg-white border-stone-200 shadow-stone-300/30'
                  }`}>
                    {/* Window chrome */}
                    <div className={`flex items-center gap-2 px-4 py-3 border-b ${
                      isDark ? 'border-zinc-800 bg-zinc-950' : 'border-stone-100 bg-stone-50'
                    }`}>
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                      </div>
                      <div className={`flex-1 text-center text-xs font-mono ${isDark ? 'text-zinc-600' : 'text-stone-400'}`}>
                        soundsauce.app/analyze
                      </div>
                    </div>
                    {/* Mock waveform */}
                    <div className="px-5 pt-5 pb-3">
                      <div className={`text-xs font-medium mb-2 ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>
                        808_bass_loop.wav
                      </div>
                      <div className="flex items-end gap-[2px] h-16 mb-1">
                        {[0.3,0.5,0.7,0.9,1,0.95,0.85,0.7,0.55,0.4,0.5,0.65,0.8,0.95,1,0.9,0.75,0.6,0.45,0.35,0.5,0.7,0.85,0.95,0.9,0.8,0.65,0.5,0.4,0.3,0.45,0.6,0.75,0.85,0.9,0.8,0.65,0.5,0.35,0.25].map((h, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-sm transition-all ${
                              i < 18
                                ? (isDark ? 'bg-ember-500' : 'bg-ember-600')
                                : (isDark ? 'bg-zinc-700' : 'bg-stone-300')
                            }`}
                            style={{ height: `${h * 100}%` }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-600' : 'text-stone-400'}`}>0:00</span>
                        <span className={`text-[10px] font-mono ${isDark ? 'text-ember-500' : 'text-ember-600'}`}>0:01.4</span>
                        <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-600' : 'text-stone-400'}`}>0:03</span>
                      </div>
                    </div>
                    {/* Mock analysis results */}
                    <div className={`px-5 pb-4 grid grid-cols-4 gap-2`}>
                      {[
                        { label: 'Key', value: 'C Minor' },
                        { label: 'Waveform', value: 'Sawtooth' },
                        { label: 'Brightness', value: '42%' },
                        { label: 'Filter', value: 'LP sweep' },
                      ].map(item => (
                        <div key={item.label} className={`p-2 rounded-md text-center ${
                          isDark ? 'bg-zinc-950' : 'bg-stone-50'
                        }`}>
                          <div className={`text-[10px] mb-0.5 ${isDark ? 'text-zinc-600' : 'text-stone-400'}`}>{item.label}</div>
                          <div className={`text-xs font-bold font-mono ${isDark ? 'text-zinc-200' : 'text-stone-800'}`}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    {/* Mock preset card */}
                    <div className={`mx-5 mb-5 p-3 rounded-lg border ${
                      isDark ? 'border-ember-500/20 bg-ember-500/[0.05]' : 'border-amber-200 bg-amber-50/50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Music className={`w-3.5 h-3.5 ${isDark ? 'text-ember-500' : 'text-ember-600'}`} />
                          <span className={`text-xs font-semibold ${isDark ? 'text-ember-500' : 'text-ember-700'}`}>Vital Preset Ready</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isDark ? 'bg-ember-500/15 text-ember-500' : 'bg-amber-100 text-amber-700'
                        }`}>Best Match 87%</span>
                      </div>
                      <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-stone-500'}`}>
                        Sub Bass &middot; Filter cutoff 320 Hz &middot; Attack 5ms
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>
          </HeroBackground>

          {/* Inline Demo Results (shown after "See It In Action") */}
          {showDemoResults && (
            <section ref={demoResultsRef} className={`mb-12 p-6 border rounded-lg max-w-2xl mx-auto animate-fade-in ${
              isDark
                ? 'bg-zinc-900 border-zinc-700/50'
                : 'bg-white border-stone-200 shadow-lg shadow-amber-500/5'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className={`w-5 h-5 ${isDark ? 'text-ember-500' : 'text-amber-600'}`} />
                <h3 className={`font-bold ${t.text}`}>Analysis Complete</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isDark ? 'bg-ember-500/15 text-ember-500' : 'bg-amber-50 text-amber-700'
                }`}>
                  {DEMO_RESULTS.instrument}
                </span>
              </div>
              {/* Results grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Key', value: DEMO_RESULTS.key },
                  { label: 'Waveform', value: DEMO_RESULTS.waveform },
                  { label: 'Brightness', value: DEMO_RESULTS.brightness },
                  { label: 'Filter', value: 'LP sweep' },
                ].map(item => (
                  <div key={item.label} className={`p-3 rounded-md text-center ${
                    isDark ? 'bg-zinc-950' : 'bg-stone-50 border border-stone-200'
                  }`}>
                    <div className={`text-xs mb-1 ${t.textDimmed}`}>{item.label}</div>
                    <div className={`text-sm font-bold ${t.text}`}>{item.value}</div>
                  </div>
                ))}
              </div>
              {/* Recipe steps */}
              <div className={`p-4 rounded-md mb-5 ${
                isDark ? 'bg-zinc-950' : 'bg-stone-50 border border-stone-200'
              }`}>
                <div className={`text-xs font-bold uppercase mb-2 ${t.textDimmed}`}>Sound Sauce</div>
                <div className="space-y-2">
                  {DEMO_RESULTS.steps.map((step, i) => (
                    <div key={i} className={`flex items-start gap-2 text-sm ${t.textMuted}`}>
                      <span className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                        isDark ? 'bg-zinc-800 text-ember-500' : 'bg-ember-600 text-white'
                      }`}>{i + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* CTA */}
              <div className="text-center">
                <Link
                  to="/analyze"
                  onClick={() => trackHeroCTAClicked('analyze_your_own')}
                  className={`inline-flex items-center gap-2 px-6 py-3 font-medium transition-all rounded-lg ${
                    isDark
                      ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
                      : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-amber-500/20'
                  }`}
                >
                  Try It With Your Sound
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </section>
          )}

          {/* What You Get — Transformation section */}
          <section className="py-12 mb-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <h2 className={`text-2xl md:text-3xl font-bold font-display mb-3 ${t.text}`}>
                From any sound to synth settings
              </h2>
              <p className={`text-sm max-w-lg mx-auto ${t.textMuted}`}>
                SoundSauce analyzes your audio and gives you everything you need to recreate it in your DAW.
              </p>
            </motion.div>

            {/* Before/After transformation row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto mb-12">
              {[
                {
                  step: 1,
                  icon: Upload,
                  title: 'Upload any sound',
                  items: ['WAV, MP3, or M4A', 'Drag and drop', 'Or try the demo sound'],
                  accent: false,
                },
                {
                  step: 2,
                  icon: BarChart2,
                  title: 'AI analyzes everything',
                  items: ['Key, BPM, waveform type', 'Filter envelope & ADSR', 'Instrument detection (Gemini AI)'],
                  accent: true,
                },
                {
                  step: 3,
                  icon: SlidersVertical,
                  title: 'Get your recipe',
                  items: ['Step-by-step synth settings', 'Free Vital preset download', 'DAW-specific tips'],
                  accent: false,
                },
              ].map(({ step, icon: StepIcon, title, items, accent }) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: step * 0.12 }}
                  className={`relative p-5 rounded-xl border transition-all duration-300 ${
                    accent
                      ? isDark
                        ? 'bg-ember-500/[0.06] border-ember-500/20 shadow-lg shadow-ember-500/5'
                        : 'bg-amber-50/80 border-amber-200/60 shadow-lg shadow-amber-500/10'
                      : isDark
                        ? 'bg-zinc-900/50 border-zinc-800'
                        : 'bg-white border-stone-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold flex-shrink-0 ${
                      accent
                        ? 'bg-ember-500 text-zinc-950'
                        : isDark
                          ? 'bg-zinc-800 text-zinc-400'
                          : 'bg-stone-100 text-stone-500'
                    }`}>
                      {step}
                    </div>
                    <StepIcon className={`w-4.5 h-4.5 ${
                      accent
                        ? isDark ? 'text-ember-500' : 'text-ember-600'
                        : isDark ? 'text-zinc-500' : 'text-stone-400'
                    }`} />
                  </div>
                  <h3 className={`font-semibold mb-3 ${t.text}`}>{title}</h3>
                  <ul className="space-y-1.5">
                    {items.map((item, i) => (
                      <li key={i} className={`text-sm flex items-center gap-2 ${t.textMuted}`}>
                        <Zap className={`w-3 h-3 flex-shrink-0 ${
                          accent
                            ? isDark ? 'text-ember-500' : 'text-ember-600'
                            : isDark ? 'text-zinc-600' : 'text-stone-300'
                        }`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {/* Arrow connector (desktop) */}
                  {step < 3 && (
                    <div className={`hidden md:flex absolute top-1/2 -right-3 w-6 items-center justify-center ${t.textDimmed}`}>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* CTA row below steps */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center"
            >
              <Link
                to="/analyze"
                onClick={() => trackHeroCTAClicked('how_it_works_cta')}
                className={`group inline-flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all rounded-lg ${
                  isDark
                    ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                    : 'bg-stone-900 text-white hover:bg-stone-800'
                }`}
              >
                Try it yourself
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </section>

          {/* Featured Sound Sauces — social proof for guests */}
          {featuredRecipes.length > 0 && (
            <section className="py-8 pb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="flex items-center justify-between mb-6"
              >
                <div>
                  <h2 className={`text-xl font-bold font-display ${t.text}`}>Featured Sound Sauces</h2>
                  <p className={`text-sm mt-1 ${t.textDimmed}`}>See what the community is creating</p>
                </div>
                <Link
                  to="/discover"
                  className={`text-sm font-medium flex items-center gap-1 ${
                    isDark ? 'text-zinc-400 hover:text-white' : 'text-ember-600 hover:text-ember-700'
                  }`}
                >
                  Browse all <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredRecipes.map((recipe, i) => {
                  const instrument = recipe.results?.instrument || recipe.results?.detectedInstruments?.[0]?.name;
                  const hasPreset = !!recipe.vital_preset_url;
                  return (
                    <motion.div
                      key={recipe.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                    >
                      <Link
                        to={`/recipe/${recipe.id}`}
                        className={`block p-4 border transition-all rounded-lg ${
                          isDark
                            ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                            : 'bg-white border-stone-200 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className={`font-semibold truncate ${t.text}`}>{recipe.title || 'Untitled'}</h3>
                          {hasPreset && (
                            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                              isDark ? 'bg-ember-500/15 text-ember-500' : 'bg-amber-50 text-amber-700'
                            }`}>
                              <Music className="w-3 h-3" />
                              Preset
                            </span>
                          )}
                        </div>
                        {recipe.description && (
                          <p className={`text-sm line-clamp-2 mb-3 ${t.textMuted}`}>{recipe.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {recipe.profiles?.avatar_url ? (
                              <img src={recipe.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <User className={`w-4 h-4 ${t.textDimmed}`} />
                            )}
                            <span className={`text-xs ${t.textDimmed}`}>{recipe.profiles?.username || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {instrument && (
                              <span className={`text-xs capitalize ${t.textDimmed}`}>{instrument}</span>
                            )}
                            {recipe.like_count > 0 && (
                              <span className={`flex items-center gap-1 text-xs ${t.textDimmed}`}>
                                <Heart className="w-3 h-3" /> {recipe.like_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Bottom CTA Banner */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`py-14 mb-8 text-center rounded-2xl border relative overflow-hidden ${
              isDark
                ? 'bg-gradient-to-b from-zinc-900 to-zinc-950 border-zinc-800'
                : 'bg-gradient-to-b from-amber-50/80 to-white border-amber-200/50'
            }`}
          >
            {/* Subtle glow */}
            <div className={`absolute inset-0 pointer-events-none ${
              isDark
                ? 'bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.06),transparent_70%)]'
                : 'bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.08),transparent_70%)]'
            }`} />
            <div className="relative z-10">
              <h2 className={`text-2xl md:text-3xl font-bold font-display mb-3 ${t.text}`}>
                Ready to recreate your first sound?
              </h2>
              <p className={`mb-8 max-w-md mx-auto ${t.textMuted}`}>
                10 free analyses. No credit card. No account needed.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/analyze"
                  onClick={() => trackHeroCTAClicked('bottom_cta')}
                  className={`group inline-flex items-center gap-2 px-8 py-4 text-lg font-medium transition-all rounded-lg ${
                    isDark
                      ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600 shadow-lg shadow-ember-500/20'
                      : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-600/30'
                  }`}
                >
                  Start Analyzing Free
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/pricing"
                  className={`inline-flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all rounded-lg ${
                    isDark
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  Compare plans <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.section>
        </>
      )}
    </div>
  );
}
