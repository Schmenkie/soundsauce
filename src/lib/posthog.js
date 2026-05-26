// PostHog analytics — fully crash-safe
// If posthog-js fails to load (ad blockers, network issues), all exports become no-ops
// Events fired before PostHog loads are queued and flushed once ready

let posthog = null;
let ready = false;
const eventQueue = []; // Buffered events before PostHog loads

// Initialize PostHog — called once in main.jsx
export function initPostHog() {
  if (typeof window === 'undefined') return;

  const apiKey = import.meta.env.VITE_POSTHOG_KEY;
  if (!apiKey) {
    console.warn('PostHog: VITE_POSTHOG_KEY not set, analytics disabled');
    return;
  }

  // Dynamic import so ad blockers can't crash the app
  import('posthog-js')
    .then((mod) => {
      posthog = mod.default;
      posthog.init(apiKey, {
        api_host: import.meta.env.VITE_POSTHOG_HOST || '/ingest',
        ui_host: 'https://us.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: false, // We handle this manually with React Router
        capture_pageleave: true,
        autocapture: false, // We track events explicitly for cleaner data
        persistence: 'localStorage+cookie',
        loaded: (ph) => {
          // Respect Do Not Track
          if (navigator.doNotTrack === '1') {
            ph.opt_out_capturing();
          }
          // Flush any events that were queued before PostHog loaded
          ready = true;
          flushQueue();
        },
      });
      // Tag every event so the multi-project data hub can filter by app
      posthog.register({ app: 'soundsauce' });
    })
    .catch((err) => {
      console.warn('PostHog: failed to load (likely blocked by ad blocker)', err);
      // Clear the queue since PostHog won't load — no point holding events
      eventQueue.length = 0;
    });
}

// Flush queued events/actions once PostHog is ready
function flushQueue() {
  while (eventQueue.length > 0) {
    const action = eventQueue.shift();
    try { action(); } catch { /* noop */ }
  }
}

// Safe capture — queues if PostHog isn't loaded yet, fires immediately if ready
function capture(event, properties) {
  if (ready && posthog) {
    try { posthog.capture(event, properties); } catch { /* noop */ }
  } else {
    eventQueue.push(() => posthog?.capture(event, properties));
  }
}

// Identify user after auth (links anonymous events to user)
export function identifyUser(user, profile) {
  if (!user) return;
  const doIdentify = () => {
    posthog?.identify(user.id, {
      email: user.email,
      username: profile?.username,
      display_name: profile?.display_name,
      subscription_tier: profile?.subscription_tier || 'free',
      skill_level: profile?.skill_level,
      daw_preference: profile?.daw_preference,
      created_at: user.created_at,
    });
  };
  if (ready && posthog) {
    try { doIdentify(); } catch { /* noop */ }
  } else {
    eventQueue.push(doIdentify);
  }
}

// Reset identity on sign out
export function resetUser() {
  if (ready && posthog) {
    try { posthog.reset(); } catch { /* noop */ }
  } else {
    eventQueue.push(() => posthog?.reset());
  }
}

// ─── Event Tracking Helpers ─────────────────────────────────────

// Auth events
export function trackSignUp(method) {
  capture('user_signed_up', { method }); // 'email' | 'google'
}

export function trackSignIn(method) {
  capture('user_signed_in', { method });
}

export function trackSignOut() {
  capture('user_signed_out');
}

// Core funnel: Upload → Analyze → Publish
export function trackAudioUpload(filename, fileSize) {
  capture('audio_uploaded', {
    filename,
    file_size_bytes: fileSize,
    file_type: filename?.split('.').pop()?.toLowerCase(),
  });
}

export function trackAnalysisStarted(options = {}) {
  capture('analysis_started', {
    has_region: !!options.regionStart,
    region_duration: options.regionEnd ? options.regionEnd - options.regionStart : null,
    stem_type: options.stemType || null,
  });
}

export function trackAnalysisCompleted(features = {}) {
  capture('analysis_completed', {
    detected_instrument: features.instrument,
    bpm: features.bpm,
    key: features.key,
    waveform_type: features.waveformType,
  });
}

export function trackRecipePublished(recipeId, tags) {
  capture('recipe_published', {
    recipe_id: recipeId,
    tag_count: tags?.length || 0,
    tags: tags,
  });
}

// Engagement events
export function trackRecipeLiked(recipeId) {
  capture('recipe_liked', { recipe_id: recipeId });
}

export function trackRecipeUnliked(recipeId) {
  capture('recipe_unliked', { recipe_id: recipeId });
}

export function trackUserFollowed(targetUserId) {
  capture('user_followed', { target_user_id: targetUserId });
}

export function trackUserUnfollowed(targetUserId) {
  capture('user_unfollowed', { target_user_id: targetUserId });
}

export function trackCommentPosted(recipeId, isReply) {
  capture('comment_posted', { recipe_id: recipeId, is_reply: isReply });
}

// Content interaction
export function trackRecipeViewed(recipeId) {
  capture('recipe_viewed', { recipe_id: recipeId });
}

export function trackPresetDownloaded(recipeId) {
  capture('preset_downloaded', { recipe_id: recipeId });
}

export function trackPresetPosted(recipeId) {
  capture('preset_posted', { recipe_id: recipeId });
}

export function trackRecreationUploaded(recipeId, matchScore) {
  capture('recreation_uploaded', {
    recipe_id: recipeId,
    match_score: matchScore,
  });
}

export function trackStemSeparationStarted() {
  capture('stem_separation_started');
}

export function trackStemSeparationCompleted() {
  capture('stem_separation_completed');
}

export function trackStemSelected(stemType) {
  capture('stem_selected', { stem_type: stemType });
}

// Export / Preset generation
export function trackPresetExported(instrument) {
  capture('preset_exported', { instrument });
}

// Search & Discovery
export function trackSearch(query, resultCount) {
  capture('search_performed', {
    query_length: query?.length,
    result_count: resultCount,
  });
}

export function trackDiscoverFiltered(sortBy, tags) {
  capture('discover_filtered', { sort_by: sortBy, tags });
}

// Subscription events
export function trackCheckoutStarted(tier) {
  capture('checkout_started', { tier });
}

export function trackUpgradePromptShown(feature) {
  capture('upgrade_prompt_shown', { blocked_feature: feature });
}

export function trackUpgradePromptClicked(feature) {
  capture('upgrade_prompt_clicked', { blocked_feature: feature });
}

export function trackSavePromptDismissed() {
  capture('save_prompt_dismissed');
}

// Page views (called from usePageTitle or route changes)
export function trackPageView(pageName, properties = {}) {
  capture('$pageview', {
    page_name: pageName,
    ...properties,
  });
}

// Profile events
export function trackProfileUpdated(fields) {
  capture('profile_updated', { fields_updated: fields });
}

export function trackAnthemSet() {
  capture('anthem_set');
}

// Onboarding
export function trackOnboardingStarted() {
  capture('onboarding_started');
}

export function trackOnboardingCompleted(preferences = {}) {
  capture('onboarding_completed', preferences);
}

export function trackOnboardingSkipped(step) {
  capture('onboarding_skipped', { step });
}

// Direct Messaging events
export function trackMessageSent(conversationId) {
  capture('message_sent', { conversation_id: conversationId });
}

export function trackConversationOpened(conversationId) {
  capture('conversation_opened', { conversation_id: conversationId });
}

export function trackConversationCreated(targetUserId) {
  capture('conversation_created', { target_user_id: targetUserId });
}

// Challenge events
export function trackChallengeCreated(challengeId) {
  capture('challenge_created', { challenge_id: challengeId });
}

export function trackChallengeViewed(challengeId) {
  capture('challenge_viewed', { challenge_id: challengeId });
}

export function trackChallengeSubmissionUploaded(challengeId, matchScore) {
  capture('challenge_submission_uploaded', {
    challenge_id: challengeId,
    match_score: matchScore,
  });
}

// Conversion funnel
export function trackHeroDemoClicked() {
  capture('hero_demo_clicked');
}

export function trackHeroDemoRevealed() {
  capture('hero_demo_revealed');
}

export function trackHeroCTAClicked(target) {
  capture('hero_cta_clicked', { target });
}

export function trackPricingPageViewed() {
  capture('pricing_page_viewed');
}

export function trackPricingPlanClicked(tier) {
  capture('pricing_plan_clicked', { tier });
}

export function trackSavePromptShown() {
  capture('save_prompt_shown');
}

export function trackSavePromptConverted() {
  capture('save_prompt_converted');
}

export function trackUsageBarShown(used, limit) {
  capture('usage_bar_shown', { used, limit });
}

// Web Vitals
export function trackWebVital(name, value, rating) {
  capture('web_vital', {
    metric_name: name,
    metric_value: value,
    metric_rating: rating,
  });
}

// Feedback
export function trackFeedbackSubmitted(type, page) {
  capture('feedback_submitted', {
    feedback_type: type,
    page,
  });
}

export function trackFeedbackOpened(page) {
  capture('feedback_opened', { page });
}

// Share
export function trackShareClicked(method, instrument) {
  capture('share_clicked', { method, instrument });
}
