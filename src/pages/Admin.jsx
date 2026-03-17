import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Users, UserPlus, BookOpen, Heart, Zap,
  BarChart3, MessageSquare, Music, Download, RefreshCw,
  Loader2, AlertCircle, FileText, Trophy, Search,
  ChevronDown, ChevronUp, Eye, EyeOff, Trash2, Activity,
  TrendingUp, UserCheck, Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks';
import { supabase } from '../lib/supabase';

// ─── Constants ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'content', label: 'Content', icon: FileText },
];

const TIME_RANGES = [
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
  { id: 'all', label: 'All' },
];

/**
 * Admin Dashboard — consolidated platform analytics with user management
 * and content moderation.
 * Only accessible to users with is_admin = true.
 */
export function Admin({ theme, t }) {
  usePageTitle('Admin');
  const { user, isAdmin, loading: authLoading } = useAuth();

  // Tab & filter state
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');

  // Data state per tab
  const [overviewData, setOverviewData] = useState(null);
  const [usersData, setUsersData] = useState(null);
  const [contentData, setContentData] = useState(null);

  // Loading & error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // User search state
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = useRef(null);

  // Action feedback
  const [actionLoading, setActionLoading] = useState(null); // 'changeTier:userId' | 'unpublish:id' | etc.

  // ─── API helpers ────────────────────────────────────────────────────────

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('No active session');
    return { Authorization: `Bearer ${session.access_token}` };
  }, []);

  const fetchTabData = useCallback(async (tab, range) => {
    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ tab });
      if (tab === 'users' && range) params.set('range', range);

      const res = await fetch(`/api/admin-stats?${params}`, { headers });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      if (tab === 'overview') setOverviewData(data);
      else if (tab === 'users') setUsersData(data);
      else if (tab === 'content') setContentData(data);

      setLastRefreshed(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Fetch data when tab or time range changes
  useEffect(() => {
    if (user && isAdmin) {
      fetchTabData(activeTab, timeRange);
    }
  }, [user, isAdmin, activeTab, timeRange, fetchTabData]);

  // ─── User search ──────────────────────────────────────────────────────

  const searchUsers = useCallback(async (query) => {
    if (!query.trim()) {
      setUserResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ tab: 'users', query: query.trim() });
      const res = await fetch(`/api/admin-stats?${params}`, { headers });
      const data = await res.json();
      setUserResults(data.users || []);
    } catch (err) {
      console.error('User search failed:', err);
    } finally {
      setSearchLoading(false);
    }
  }, [getAuthHeaders]);

  const handleSearchInput = useCallback((value) => {
    setUserQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => searchUsers(value), 300);
  }, [searchUsers]);

  // ─── Admin actions ────────────────────────────────────────────────────

  const executeAction = useCallback(async (actionBody) => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin-actions', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(actionBody),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Action failed (HTTP ${res.status})`);
    }
    return res.json();
  }, [getAuthHeaders]);

  const handleChangeTier = useCallback(async (userId, newTier, username) => {
    if (!window.confirm(`Change ${username}'s tier to ${newTier.toUpperCase()}?`)) return;

    const actionKey = `changeTier:${userId}`;
    setActionLoading(actionKey);
    try {
      await executeAction({ action: 'changeTier', userId, tier: newTier });
      // Update local state
      setUserResults(prev => prev.map(u =>
        u.id === userId ? { ...u, subscription_tier: newTier } : u
      ));
    } catch (err) {
      alert(`Failed to change tier: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }, [executeAction]);

  const handleUnpublish = useCallback(async (analysisId, title) => {
    if (!window.confirm(`Unpublish "${title || 'Untitled'}"? It will no longer be visible publicly.`)) return;

    const actionKey = `unpublish:${analysisId}`;
    setActionLoading(actionKey);
    try {
      await executeAction({ action: 'unpublish', analysisId });
      // Remove from local state
      setContentData(prev => prev ? {
        ...prev,
        recentContent: prev.recentContent.filter(c => c.id !== analysisId),
      } : prev);
    } catch (err) {
      alert(`Failed to unpublish: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }, [executeAction]);

  const handleDeleteComment = useCallback(async (commentId) => {
    if (!window.confirm('Permanently delete this comment?')) return;

    const actionKey = `deleteComment:${commentId}`;
    setActionLoading(actionKey);
    try {
      await executeAction({ action: 'deleteComment', commentId });
      // Remove from local state
      setContentData(prev => prev ? {
        ...prev,
        recentComments: prev.recentComments.filter(c => c.id !== commentId),
      } : prev);
    } catch (err) {
      alert(`Failed to delete comment: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }, [executeAction]);

  // ─── Auth gates ───────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className={`w-6 h-6 animate-spin ${t.textMuted}`} />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className={`p-8 border text-center rounded-lg ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
        }`}>
          <Shield className={`w-12 h-12 mx-auto mb-4 ${t.textDimmed}`} />
          <h2 className={`text-xl font-bold mb-2 ${t.text}`}>Not Authorized</h2>
          <p className={t.textMuted}>This page is restricted to administrators.</p>
        </div>
      </div>
    );
  }

  const cardClass = `p-6 border rounded-lg ${
    theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
  }`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className={`text-3xl font-bold flex items-center gap-3 ${t.text}`}>
            <Shield className={`w-7 h-7 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
            Admin Dashboard
          </h1>
          {lastRefreshed && (
            <p className={`text-sm mt-1 ${t.textDimmed}`}>
              Last refreshed: {lastRefreshed.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={() => fetchTabData(activeTab, timeRange)}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors rounded-md ${
            theme === 'dark'
              ? 'bg-zinc-800 text-white hover:bg-zinc-700'
              : 'border border-stone-200 text-stone-500 hover:border-ember-600 hover:text-ember-600'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className={`flex gap-1 border-b ${theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'}`}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === id
                ? theme === 'dark'
                  ? 'border-white text-white'
                  : 'border-ember-600 text-ember-600'
                : `border-transparent ${t.textMuted} ${theme === 'dark' ? 'hover:text-zinc-50' : 'hover:text-stone-900'}`
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Time Range Filter (Users tab only) */}
      {activeTab === 'users' && (
        <div className="flex items-center gap-2">
          <Calendar className={`w-4 h-4 ${t.textDimmed}`} />
          <span className={`text-sm ${t.textDimmed}`}>Period:</span>
          <div className="flex gap-1">
            {TIME_RANGES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTimeRange(id)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors rounded-md ${
                  timeRange === id
                    ? theme === 'dark'
                      ? 'bg-white text-black'
                      : 'bg-ember-600 text-white'
                    : theme === 'dark'
                      ? 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className={`p-4 border flex items-center gap-3 rounded-lg ${
          theme === 'dark'
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button
            onClick={() => fetchTabData(activeTab, timeRange)}
            className="ml-auto text-sm font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && !overviewData && !usersData && !contentData && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className={`w-8 h-8 animate-spin ${t.textMuted}`} />
        </div>
      )}

      {/* ─── Overview Tab ──────────────────────────────────────────────── */}
      {activeTab === 'overview' && overviewData && (
        <OverviewTab data={overviewData} theme={theme} t={t} cardClass={cardClass} />
      )}

      {/* ─── Users Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <UsersTab
          data={usersData}
          loading={loading}
          theme={theme}
          t={t}
          cardClass={cardClass}
          userQuery={userQuery}
          userResults={userResults}
          searchLoading={searchLoading}
          actionLoading={actionLoading}
          onSearchInput={handleSearchInput}
          onChangeTier={handleChangeTier}
        />
      )}

      {/* ─── Content Tab ───────────────────────────────────────────────── */}
      {activeTab === 'content' && (
        <ContentTab
          data={contentData}
          loading={loading}
          theme={theme}
          t={t}
          cardClass={cardClass}
          actionLoading={actionLoading}
          onUnpublish={handleUnpublish}
          onDeleteComment={handleDeleteComment}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Overview Tab (existing stats — extracted to component)
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewTab({ data, theme, t, cardClass }) {
  return (
    <>
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <OverviewCard icon={Users} label="Total Users" value={data.overview.totalUsers} sub={`+${data.overview.newUsersThisWeek} this week`} theme={theme} t={t} />
        <OverviewCard icon={UserPlus} label="New This Week" value={data.overview.newUsersThisWeek} theme={theme} t={t} />
        <OverviewCard icon={BookOpen} label="Published Recipes" value={data.overview.publishedRecipes} theme={theme} t={t} />
        <OverviewCard icon={Heart} label="Total Likes" value={data.overview.totalLikes} theme={theme} t={t} />
      </div>

      {/* Subscription Breakdown + Revenue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Subscription Breakdown */}
        <div className={cardClass}>
          <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
            <BarChart3 className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
            Subscriptions
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Free', count: data.subscriptions.free, color: theme === 'dark' ? 'bg-zinc-600' : 'bg-stone-200' },
              { label: 'Pro', count: data.subscriptions.pro, icon: Zap, color: theme === 'dark' ? 'bg-white' : 'bg-ember-600' },
            ].map(({ label, count, icon: Icon, color }) => {
              const total = data.overview.totalUsers || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className={`w-3.5 h-3.5 ${t.textMuted}`} />}
                      <span className={`text-sm font-medium ${t.text}`}>{label}</span>
                    </div>
                    <span className={`text-sm font-bold ${t.text}`}>{count} <span className={`text-xs font-normal ${t.textDimmed}`}>({pct}%)</span></span>
                  </div>
                  <div className={`w-full h-2 rounded-full ${theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-100'}`}>
                    <div className={`h-full transition-all rounded-full ${color}`} style={{ width: `${Math.max(pct, 1)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue */}
        <div className={cardClass}>
          <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
            <CreditCardIcon theme={theme} />
            Revenue
          </h2>
          <div className="space-y-4">
            <div>
              <div className={`text-sm ${t.textDimmed} mb-1`}>Monthly Recurring Revenue</div>
              <div className={`text-3xl font-bold ${t.text}`}>${data.revenue.mrr.toFixed(2)}</div>
            </div>
            <div className={`pt-3 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'}`}>
              <div className={`text-sm ${t.textDimmed} mb-1`}>Active Subscriptions</div>
              <div className={`text-2xl font-bold ${t.text}`}>{data.revenue.activeSubscriptions}</div>
            </div>
            <div className={`pt-3 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'}`}>
              <div className={`text-sm ${t.textDimmed} mb-1`}>Avg Revenue Per Subscriber</div>
              <div className={`text-lg font-bold ${t.text}`}>
                ${data.revenue.activeSubscriptions > 0
                  ? (data.revenue.mrr / data.revenue.activeSubscriptions).toFixed(2)
                  : '0.00'
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Stats */}
      <div className={cardClass}>
        <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
          <FileText className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
          Content Stats
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <ContentStat icon={BarChart3} label="Total Analyses" value={data.content.totalAnalyses} theme={theme} t={t} />
          <ContentStat icon={BookOpen} label="Public Recipes" value={data.content.publicRecipes} theme={theme} t={t} />
          <ContentStat icon={Music} label="Preset Posts" value={data.content.presetPosts} theme={theme} t={t} />
          <ContentStat icon={MessageSquare} label="Comments" value={data.content.totalComments} theme={theme} t={t} />
          <ContentStat icon={Trophy} label="Recreations" value={data.content.totalRecreations} theme={theme} t={t} />
          <ContentStat icon={Download} label="Downloads" value={data.content.totalDownloads} theme={theme} t={t} />
        </div>
      </div>

      {/* Top Content + Recent Signups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={cardClass}>
          <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
            <Heart className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
            Top Content
          </h2>
          {data.topContent.length > 0 ? (
            <div className="space-y-3">
              {data.topContent.map((item, i) => (
                <Link
                  key={item.id}
                  to={`/recipe/${item.id}`}
                  className={`block p-3 border transition-colors rounded-lg ${
                    theme === 'dark'
                      ? 'bg-zinc-950 border-zinc-700 hover:border-zinc-500'
                      : 'bg-stone-50 border-stone-200 hover:border-ember-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-lg font-bold ${t.textDimmed} w-6 text-center flex-shrink-0`}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className={`font-medium text-sm truncate ${t.text}`}>{item.title || 'Untitled'}</div>
                      <div className={`text-xs ${t.textDimmed}`}>by {item.profiles?.display_name || item.profiles?.username || 'Anonymous'}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs flex items-center gap-1 ${t.textDimmed}`}><Heart className="w-3 h-3" /> {item.like_count || 0}</span>
                        <span className={`text-xs flex items-center gap-1 ${t.textDimmed}`}><MessageSquare className="w-3 h-3" /> {item.comment_count || 0}</span>
                        <span className={`text-xs flex items-center gap-1 ${t.textDimmed}`}><Download className="w-3 h-3" /> {item.download_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${t.textMuted}`}>No published recipes yet.</p>
          )}
        </div>

        <div className={cardClass}>
          <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
            <UserPlus className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
            Recent Signups
          </h2>
          {data.recentSignups.length > 0 ? (
            <div className="space-y-2">
              {data.recentSignups.map((signup) => (
                <Link
                  key={signup.id}
                  to={signup.username ? `/user/${signup.username}` : '#'}
                  className={`flex items-center gap-3 p-2.5 transition-colors rounded-lg ${
                    theme === 'dark' ? 'hover:bg-zinc-950' : 'hover:bg-stone-50'
                  }`}
                >
                  <UserAvatar url={signup.avatar_url} name={signup.username} theme={theme} size="w-8 h-8" />
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium flex items-center gap-1.5 ${t.text}`}>
                      {signup.username || 'Unknown'}
                      <TierBadge tier={signup.subscription_tier} theme={theme} />
                    </div>
                    <div className={`text-xs ${t.textDimmed}`}>{new Date(signup.created_at).toLocaleDateString()}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${t.textMuted}`}>No users yet.</p>
          )}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Users Tab (engagement + management)
// ═══════════════════════════════════════════════════════════════════════════════

function UsersTab({
  data, loading, theme, t, cardClass,
  userQuery, userResults, searchLoading, actionLoading,
  onSearchInput, onChangeTier,
}) {
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className={`w-8 h-8 animate-spin ${t.textMuted}`} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Engagement Metrics */}
      {data && (
        <>
          {/* DAU / WAU / MAU */}
          <div className="grid grid-cols-3 gap-4">
            <OverviewCard icon={Activity} label="DAU" value={data.engagement.dau} sub="Daily active" theme={theme} t={t} />
            <OverviewCard icon={TrendingUp} label="WAU" value={data.engagement.wau} sub="Weekly active" theme={theme} t={t} />
            <OverviewCard icon={Users} label="MAU" value={data.engagement.mau} sub="Monthly active" theme={theme} t={t} />
          </div>

          {/* Activity Chart + Signup Growth */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActivityChart
              title="Daily Active Users"
              icon={Activity}
              data={data.engagement.activeUsersByDay}
              theme={theme}
              t={t}
              cardClass={cardClass}
            />
            <ActivityChart
              title="Daily Signups"
              icon={UserPlus}
              data={data.signupGrowth}
              theme={theme}
              t={t}
              cardClass={cardClass}
            />
          </div>

          {/* Onboarding + Conversion */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={cardClass}>
              <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
                <UserCheck className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
                Onboarding
              </h3>
              <div className={`text-3xl font-bold mb-1 ${t.text}`}>{data.onboarding.completionRate}%</div>
              <div className={`text-sm ${t.textDimmed}`}>
                {data.onboarding.completedOnboarding} of {data.onboarding.totalUsers} users completed onboarding
              </div>
              <div className={`mt-3 w-full h-3 rounded-full ${theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-100'}`}>
                <div
                  className={`h-full rounded-full transition-all ${theme === 'dark' ? 'bg-green-400' : 'bg-green-500'}`}
                  style={{ width: `${data.onboarding.completionRate}%` }}
                />
              </div>
            </div>

            <div className={cardClass}>
              <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
                <Zap className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
                Free to Pro Conversion
              </h3>
              <div className={`text-3xl font-bold mb-1 ${t.text}`}>{data.conversion.conversionRate}%</div>
              <div className={`text-sm ${t.textDimmed}`}>
                {data.conversion.proUsers} Pro users out of {data.conversion.totalUsers} total
              </div>
              <div className={`mt-3 w-full h-3 rounded-full ${theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-100'}`}>
                <div
                  className={`h-full rounded-full transition-all ${
                    theme === 'dark' ? 'bg-white' : 'bg-ember-600'
                  }`}
                  style={{ width: `${Math.max(data.conversion.conversionRate, 1)}%` }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* User Management */}
      <div className={cardClass}>
        <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
          <Search className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
          User Management
        </h2>

        {/* Search input */}
        <div className="relative mb-4">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textDimmed}`} />
          <input
            type="text"
            placeholder="Search users by username..."
            value={userQuery}
            onChange={(e) => onSearchInput(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 border text-sm rounded-md ${
              theme === 'dark'
                ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500'
                : 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400'
            }`}
          />
          {searchLoading && (
            <Loader2 className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin ${t.textMuted}`} />
          )}
        </div>

        {/* Search results */}
        {userResults.length > 0 && (
          <div className="space-y-1">
            {userResults.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                theme={theme}
                t={t}
                actionLoading={actionLoading}
                onChangeTier={onChangeTier}
              />
            ))}
          </div>
        )}

        {userQuery && !searchLoading && userResults.length === 0 && (
          <p className={`text-sm text-center py-4 ${t.textMuted}`}>No users found matching "{userQuery}"</p>
        )}

        {!userQuery && (
          <p className={`text-sm text-center py-4 ${t.textDimmed}`}>Type a username to search</p>
        )}
      </div>
    </div>
  );
}

// ─── Activity Chart (horizontal bars) ───────────────────────────────────────

function ActivityChart({ title, icon: Icon, data, theme, t, cardClass }) {
  if (!data || data.length === 0) {
    return (
      <div className={cardClass}>
        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
          <Icon className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
          {title}
        </h3>
        <p className={`text-sm ${t.textMuted}`}>No data for this period.</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const displayData = data.slice(0, 14); // Show max 14 days

  return (
    <div className={cardClass}>
      <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
        <Icon className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
        {title}
      </h3>
      <div className="space-y-1.5">
        {displayData.map(({ date, count }) => {
          const pct = (count / maxCount) * 100;
          const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return (
            <div key={date} className="flex items-center gap-2">
              <span className={`text-xs w-14 text-right flex-shrink-0 ${t.textDimmed}`}>{dateLabel}</span>
              <div className={`flex-1 h-5 rounded ${theme === 'dark' ? 'bg-zinc-950' : 'bg-stone-100'}`}>
                <div
                  className={`h-full rounded transition-all ${
                    theme === 'dark' ? 'bg-zinc-600' : 'bg-ember-600'
                  }`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className={`text-xs w-8 flex-shrink-0 font-medium ${t.text}`}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── User Row (expandable) ──────────────────────────────────────────────────

function UserRow({ user, theme, t, actionLoading, onChangeTier }) {
  const [expanded, setExpanded] = useState(false);
  const isChangingTier = actionLoading === `changeTier:${user.id}`;

  return (
    <div className={`border rounded-lg overflow-hidden ${
      theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
    }`}>
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
          theme === 'dark' ? 'hover:bg-zinc-950' : 'hover:bg-stone-50'
        }`}
      >
        <UserAvatar url={user.avatar_url} name={user.username} theme={theme} size="w-10 h-10" />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium flex items-center gap-2 ${t.text}`}>
            <Link
              to={`/user/${user.username}`}
              onClick={(e) => e.stopPropagation()}
              className={theme === 'dark' ? 'hover:underline' : 'hover:text-ember-600'}
            >
              {user.username || 'Unknown'}
            </Link>
            <TierBadge tier={user.subscription_tier} theme={theme} />
          </div>
          <div className={`text-xs ${t.textDimmed}`}>Joined {new Date(user.created_at).toLocaleDateString()}</div>
        </div>
        {expanded ? <ChevronUp className={`w-4 h-4 ${t.textDimmed}`} /> : <ChevronDown className={`w-4 h-4 ${t.textDimmed}`} />}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className={`px-3 pb-3 pt-1 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'}`}>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <div className={`text-xs ${t.textDimmed}`}>Analyses</div>
              <div className={`text-sm font-bold ${t.text}`}>{user.totalAnalyses}</div>
            </div>
            <div>
              <div className={`text-xs ${t.textDimmed}`}>Published</div>
              <div className={`text-sm font-bold ${t.text}`}>{user.totalRecipes}</div>
            </div>
            <div>
              <div className={`text-xs ${t.textDimmed}`}>Likes Received</div>
              <div className={`text-sm font-bold ${t.text}`}>{user.totalLikesReceived}</div>
            </div>
            <div>
              <div className={`text-xs ${t.textDimmed}`}>Last Active</div>
              <div className={`text-sm font-bold ${t.text}`}>
                {user.lastActivity ? getRelativeTime(user.lastActivity) : 'Never'}
              </div>
            </div>
          </div>

          {/* Tier change */}
          <div className="flex items-center gap-3">
            <label className={`text-sm font-medium ${t.text}`}>Tier:</label>
            <select
              value={user.subscription_tier || 'free'}
              onChange={(e) => onChangeTier(user.id, e.target.value, user.username)}
              disabled={isChangingTier}
              className={`px-3 py-1.5 text-sm border rounded-md ${
                theme === 'dark'
                  ? 'bg-zinc-950 border-zinc-700 text-white'
                  : 'bg-white border-stone-200 text-stone-900'
              } ${isChangingTier ? 'opacity-50' : ''}`}
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
            {isChangingTier && <Loader2 className={`w-4 h-4 animate-spin ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Content Tab (moderation)
// ═══════════════════════════════════════════════════════════════════════════════

function ContentTab({ data, loading, theme, t, cardClass, actionLoading, onUnpublish, onDeleteComment }) {
  const [contentOpen, setContentOpen] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(true);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className={`w-8 h-8 animate-spin ${t.textMuted}`} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Recent Public Content */}
      <div className={cardClass}>
        <button
          onClick={() => setContentOpen(!contentOpen)}
          className={`w-full text-lg font-bold flex items-center gap-2 ${t.text}`}
        >
          <Eye className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
          Recent Public Content
          <span className={`text-sm font-normal ${t.textDimmed}`}>({data.recentContent.length})</span>
          <span className="ml-auto">
            {contentOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {contentOpen && data.recentContent.length > 0 ? (
          <div className="space-y-2 mt-4">
            {data.recentContent.map((item) => {
              const isUnpublishing = actionLoading === `unpublish:${item.id}`;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg ${
                    theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        to={`/recipe/${item.id}`}
                        className={`text-sm font-medium truncate ${
                          theme === 'dark' ? 'text-white hover:underline' : 'text-ember-600 hover:underline'
                        }`}
                      >
                        {item.title || 'Untitled'}
                      </Link>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        item.post_type === 'preset'
                          ? theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                          : theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {item.post_type === 'preset' ? 'Preset' : 'Recipe'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs flex items-center gap-1 ${t.textDimmed}`}>
                        <UserAvatar url={item.profiles?.avatar_url} name={item.profiles?.username} theme={theme} size="w-4 h-4" />
                        {item.profiles?.username || 'Unknown'}
                      </span>
                      <span className={`text-xs ${t.textDimmed}`}>
                        <Heart className="w-3 h-3 inline mr-0.5" />{item.like_count || 0}
                      </span>
                      <span className={`text-xs ${t.textDimmed}`}>
                        <MessageSquare className="w-3 h-3 inline mr-0.5" />{item.comment_count || 0}
                      </span>
                      <span className={`text-xs ${t.textDimmed}`}>{getRelativeTime(item.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onUnpublish(item.id, item.title)}
                    disabled={isUnpublishing}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex-shrink-0 ${
                      theme === 'dark'
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'text-red-500 hover:bg-red-50'
                    } ${isUnpublishing ? 'opacity-50' : ''}`}
                  >
                    {isUnpublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
                    Unpublish
                  </button>
                </div>
              );
            })}
          </div>
        ) : contentOpen ? (
          <p className={`text-sm mt-4 ${t.textMuted}`}>No public content found.</p>
        ) : null}
      </div>

      {/* Recent Comments */}
      <div className={cardClass}>
        <button
          onClick={() => setCommentsOpen(!commentsOpen)}
          className={`w-full text-lg font-bold flex items-center gap-2 ${t.text}`}
        >
          <MessageSquare className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
          Recent Comments
          <span className={`text-sm font-normal ${t.textDimmed}`}>({data.recentComments.length})</span>
          <span className="ml-auto">
            {commentsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {commentsOpen && data.recentComments.length > 0 ? (
          <div className="space-y-2 mt-4">
            {data.recentComments.map((comment) => {
              const isDeleting = actionLoading === `deleteComment:${comment.id}`;
              return (
                <div
                  key={comment.id}
                  className={`flex items-start gap-3 p-3 border rounded-lg ${
                    theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
                  }`}
                >
                  <UserAvatar url={comment.profiles?.avatar_url} name={comment.profiles?.username} theme={theme} size="w-8 h-8" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${t.text}`}>{comment.profiles?.username || 'Unknown'}</span>
                      <span className={`text-xs ${t.textDimmed}`}>on</span>
                      {comment.analyses?.id ? (
                        <Link
                          to={`/recipe/${comment.analyses.id}`}
                          className={`text-xs truncate max-w-[200px] ${
                            theme === 'dark' ? 'text-white hover:underline' : 'text-ember-600 hover:underline'
                          }`}
                        >
                          {comment.analyses.title || 'Untitled'}
                        </Link>
                      ) : (
                        <span className={`text-xs ${t.textDimmed}`}>deleted recipe</span>
                      )}
                      <span className={`text-xs ${t.textDimmed}`}>{getRelativeTime(comment.created_at)}</span>
                    </div>
                    <p className={`text-sm ${t.textMuted} line-clamp-2`}>
                      {comment.content?.length > 150 ? comment.content.slice(0, 150) + '...' : comment.content}
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    disabled={isDeleting}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex-shrink-0 ${
                      theme === 'dark'
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'text-red-500 hover:bg-red-50'
                    } ${isDeleting ? 'opacity-50' : ''}`}
                  >
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        ) : commentsOpen ? (
          <p className={`text-sm mt-4 ${t.textMuted}`}>No comments found.</p>
        ) : null}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shared Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewCard({ icon: Icon, label, value, sub, theme, t }) {
  return (
    <div className={`p-4 border rounded-lg ${
      theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${theme === 'dark' ? 'text-zinc-400' : 'text-ember-600'}`} />
        <span className={`text-xs font-medium uppercase tracking-wider ${t.textDimmed}`}>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${t.text}`}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {sub && <div className={`text-xs mt-1 ${t.textDimmed}`}>{sub}</div>}
    </div>
  );
}

function ContentStat({ icon: Icon, label, value, theme, t }) {
  return (
    <div className={`p-3 border rounded-lg ${
      theme === 'dark' ? 'bg-zinc-950 border-zinc-700' : 'bg-stone-50 border-stone-200'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${t.textDimmed}`} />
        <span className={`text-xs ${t.textDimmed}`}>{label}</span>
      </div>
      <div className={`text-lg font-bold ${t.text}`}>{value.toLocaleString()}</div>
    </div>
  );
}

function UserAvatar({ url, name, theme, size = 'w-8 h-8' }) {
  if (url) {
    return <img src={url} alt="" className={`${size} object-cover flex-shrink-0 rounded-full`} />;
  }
  return (
    <div className={`${size} flex items-center justify-center text-xs font-bold flex-shrink-0 rounded-full ${
      theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-amber-50 text-ember-700'
    }`}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function TierBadge({ tier, theme }) {
  if (tier === 'pro') {
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        theme === 'dark' ? 'bg-white/10 text-white' : 'bg-ember-600/10 text-ember-600'
      }`}>
        <Zap className="w-2.5 h-2.5" /> PRO
      </span>
    );
  }
  return null;
}

function CreditCardIcon({ theme }) {
  return (
    <svg
      className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function getRelativeTime(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(dateStr).toLocaleDateString();
}
