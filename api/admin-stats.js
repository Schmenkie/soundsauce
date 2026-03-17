/**
 * Vercel Serverless Function: Admin Stats Endpoint
 *
 * Aggregates platform analytics from Supabase + Stripe.
 * Double-layer security: JWT auth + is_admin DB check.
 * Supports tab-based routing: ?tab=overview|users|content
 *
 * @param {object} req - Vercel request object (GET)
 * @param {string} req.headers.authorization - Bearer token (Supabase JWT)
 * @param {string} [req.query.tab] - 'overview' (default) | 'users' | 'content'
 * @param {string} [req.query.range] - '7d' | '30d' | '90d' | 'all' (for users tab)
 * @param {string} [req.query.query] - Username search query (for users tab)
 * @param {object} res - Vercel response object
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from './_rateLimit.js';
import { validateServerEnv } from './_validateEnv.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Anon client for JWT validation
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Service role client — bypasses RLS for admin queries
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/** Calculate cutoff date from range string */
function getCutoffDate(range) {
  const days = { '7d': 7, '30d': 30, '90d': 90 }[range];
  if (!days) return new Date('2020-01-01').toISOString(); // 'all'
  return new Date(Date.now() - days * 86400000).toISOString();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 10 requests per minute
  if (rateLimit(req, res, { limit: 10 })) return;

  if (validateServerEnv(res, ['STRIPE_SECRET_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'])) return;

  try {
    // --- Layer 1: JWT auth ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // --- Layer 2: Admin check ---
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // --- Route by tab ---
    const tab = req.query.tab || 'overview';

    switch (tab) {
      case 'overview':
        return handleOverview(res);
      case 'users':
        return handleUsers(req, res);
      case 'content':
        return handleContent(res);
      default:
        return res.status(400).json({ error: `Unknown tab: ${tab}` });
    }
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
}

// ─── Overview Tab (existing stats) ──────────────────────────────────────────

async function handleOverview(res) {
  const [
    totalUsersResult,
    newUsersResult,
    publicRecipesResult,
    totalLikesResult,
    subscriptionBreakdownResult,
    totalAnalysesResult,
    presetPostsResult,
    totalCommentsResult,
    totalRecreationsResult,
    totalDownloadsResult,
    recentSignupsResult,
    topContentResult,
  ] = await Promise.all([
    // Overview
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabaseAdmin.from('analyses').select('*', { count: 'exact', head: true })
      .eq('is_public', true),
    supabaseAdmin.from('analyses').select('like_count'),

    // Subscription breakdown
    supabaseAdmin.from('profiles').select('subscription_tier'),

    // Content stats
    supabaseAdmin.from('analyses').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('analyses').select('*', { count: 'exact', head: true })
      .eq('post_type', 'preset'),
    supabaseAdmin.from('comments').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('recreations').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('downloads').select('*', { count: 'exact', head: true }),

    // Recent signups
    supabaseAdmin.from('profiles')
      .select('id, username, avatar_url, subscription_tier, created_at')
      .order('created_at', { ascending: false })
      .limit(10),

    // Top content
    supabaseAdmin.from('analyses')
      .select('id, title, like_count, comment_count, download_count, profiles:user_id(username, display_name)')
      .eq('is_public', true)
      .order('like_count', { ascending: false })
      .limit(5),
  ]);

  const totalLikes = (totalLikesResult.data || []).reduce(
    (sum, row) => sum + (row.like_count || 0), 0
  );

  const tiers = (subscriptionBreakdownResult.data || []);
  const subscriptions = {
    free: tiers.filter(p => !p.subscription_tier || p.subscription_tier === 'free').length,
    pro: tiers.filter(p => p.subscription_tier === 'pro').length,
    premium: tiers.filter(p => p.subscription_tier === 'premium').length,
  };

  // Stripe revenue (non-fatal on error)
  let mrr = 0;
  let activeSubscriptions = 0;

  try {
    const stripeSubscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
    });

    activeSubscriptions = stripeSubscriptions.data.length;
    mrr = stripeSubscriptions.data.reduce((sum, sub) => {
      const amount = sub.items.data[0]?.price?.unit_amount || 0;
      return sum + amount / 100;
    }, 0);
  } catch (stripeErr) {
    console.error('Stripe API error (non-fatal):', stripeErr.message);
  }

  return res.status(200).json({
    overview: {
      totalUsers: totalUsersResult.count || 0,
      newUsersThisWeek: newUsersResult.count || 0,
      publishedRecipes: publicRecipesResult.count || 0,
      totalLikes,
    },
    subscriptions,
    content: {
      totalAnalyses: totalAnalysesResult.count || 0,
      publicRecipes: publicRecipesResult.count || 0,
      presetPosts: presetPostsResult.count || 0,
      totalComments: totalCommentsResult.count || 0,
      totalRecreations: totalRecreationsResult.count || 0,
      totalDownloads: totalDownloadsResult.count || 0,
    },
    revenue: {
      mrr,
      activeSubscriptions,
    },
    recentSignups: recentSignupsResult.data || [],
    topContent: topContentResult.data || [],
  });
}

// ─── Users Tab (engagement metrics + user search) ───────────────────────────

async function handleUsers(req, res) {
  const range = req.query.range || '30d';
  const query = req.query.query || '';
  const cutoffDate = getCutoffDate(range);

  // If searching for a user, return search results
  if (query.trim()) {
    return handleUserSearch(res, query.trim());
  }

  // Engagement metrics
  const [
    activeUsersByDayResult,
    signupsByDayResult,
    onboardingResult,
    conversionResult,
  ] = await Promise.all([
    // Active users per day (via RPC function)
    supabaseAdmin.rpc('get_active_users_by_day', { cutoff_date: cutoffDate }),

    // Signups per day in range
    supabaseAdmin.from('profiles')
      .select('created_at')
      .gte('created_at', cutoffDate)
      .order('created_at', { ascending: false }),

    // Onboarding stats (all-time)
    supabaseAdmin.from('profiles')
      .select('onboarding_completed'),

    // Conversion stats (all-time)
    supabaseAdmin.from('profiles')
      .select('subscription_tier'),
  ]);

  // Group signups by day
  const signupsByDay = {};
  for (const row of (signupsByDayResult.data || [])) {
    const date = row.created_at.split('T')[0];
    signupsByDay[date] = (signupsByDay[date] || 0) + 1;
  }
  const signupGrowth = Object.entries(signupsByDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Compute DAU/WAU/MAU from activeUsersByDay data
  const activeByDay = activeUsersByDayResult.data || [];
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];

  // DAU = users active today or yesterday (since today may not be complete)
  const todayStr = now.toISOString().split('T')[0];
  const todayData = activeByDay.find(d => d.activity_date === todayStr);
  const yesterdayData = activeByDay.find(d => d.activity_date === oneDayAgo);
  const dau = todayData?.user_count || yesterdayData?.user_count || 0;

  // WAU/MAU = sum unique users (approximate — each day's count may overlap)
  // For a more accurate count we'd need a dedicated query, but the bar chart
  // gives per-day breakdown which is the primary visual
  const wau = activeByDay
    .filter(d => d.activity_date >= sevenDaysAgo)
    .reduce((sum, d) => sum + Number(d.user_count), 0);
  const mau = activeByDay
    .filter(d => d.activity_date >= thirtyDaysAgo)
    .reduce((sum, d) => sum + Number(d.user_count), 0);

  // Onboarding
  const onboardingData = onboardingResult.data || [];
  const totalUsers = onboardingData.length;
  const completedOnboarding = onboardingData.filter(p => p.onboarding_completed).length;

  // Conversion
  const conversionData = conversionResult.data || [];
  const proUsers = conversionData.filter(p => p.subscription_tier === 'pro').length;
  const freeUsers = conversionData.filter(p => !p.subscription_tier || p.subscription_tier === 'free').length;

  return res.status(200).json({
    engagement: {
      dau: Number(dau),
      wau,
      mau,
      activeUsersByDay: activeByDay.map(d => ({
        date: d.activity_date,
        count: Number(d.user_count),
      })),
    },
    signupGrowth,
    onboarding: {
      totalUsers,
      completedOnboarding,
      completionRate: totalUsers > 0 ? Math.round((completedOnboarding / totalUsers) * 1000) / 10 : 0,
    },
    conversion: {
      totalUsers: conversionData.length,
      proUsers,
      freeUsers,
      conversionRate: conversionData.length > 0 ? Math.round((proUsers / conversionData.length) * 1000) / 10 : 0,
    },
  });
}

async function handleUserSearch(res, query) {
  // Escape SQL wildcard characters to prevent wildcard injection
  const escapedQuery = query.replace(/[%_]/g, '\\$&');

  // Find matching users
  const { data: users, error } = await supabaseAdmin
    .from('profiles')
    .select('id, username, display_name, avatar_url, subscription_tier, subscription_status, created_at')
    .ilike('username', `%${escapedQuery}%`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('User search error:', error);
    return res.status(500).json({ error: 'Failed to search users' });
  }

  if (!users || users.length === 0) {
    return res.status(200).json({ users: [] });
  }

  // Fetch per-user stats in parallel
  const usersWithStats = await Promise.all(
    users.map(async (user) => {
      const [analysesResult, recipesResult, likesResult, lastActivityResult] = await Promise.all([
        supabaseAdmin.from('analyses').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabaseAdmin.from('analyses').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('is_public', true),
        supabaseAdmin.from('analyses').select('like_count')
          .eq('user_id', user.id),
        // Last activity: latest analysis created
        supabaseAdmin.from('analyses').select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const totalLikesReceived = (likesResult.data || []).reduce(
        (sum, row) => sum + (row.like_count || 0), 0
      );

      return {
        ...user,
        totalAnalyses: analysesResult.count || 0,
        totalRecipes: recipesResult.count || 0,
        totalLikesReceived,
        lastActivity: lastActivityResult.data?.[0]?.created_at || null,
      };
    })
  );

  return res.status(200).json({ users: usersWithStats });
}

// ─── Content Tab (moderation data) ──────────────────────────────────────────

async function handleContent(res) {
  const [recentContentResult, recentCommentsResult] = await Promise.all([
    // Recent public content (last 50)
    supabaseAdmin.from('analyses')
      .select('id, title, post_type, like_count, comment_count, download_count, created_at, is_public, profiles:user_id(username, avatar_url)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50),

    // Recent comments (last 50)
    supabaseAdmin.from('comments')
      .select('id, content, created_at, profiles:user_id(username, avatar_url), analyses:analysis_id(id, title)')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return res.status(200).json({
    recentContent: recentContentResult.data || [],
    recentComments: recentCommentsResult.data || [],
  });
}
