# CLAUDE.md - Audio Analyzer Pro

This file provides context for AI assistants working on this project.

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Language | JavaScript (JSX) | ES2020+ |
| Framework | React | 19.2.0 |
| Build Tool | Vite | 7.2.4 |
| Styling | Tailwind CSS | 4.1.18 |
| Audio Processing | Web Audio API | Native |
| Icons | lucide-react | - |
| Analytics | PostHog | posthog-js 1.345+ |
| Testing | Vitest + Playwright | 4.0.18 / 1.58.2 |
| Error Monitoring | Sentry | @sentry/react 10.38+ |
| Input Sanitization | DOMPurify | 3.3+ |
| Linting | ESLint | 9.39.1 |
| Deployment | Vercel | CLI 50.4.6 |

### Key Dependencies
- `@vitejs/plugin-react` - React Fast Refresh support
- `@vercel/blob` - Client-side uploads for large audio files
- `@supabase/supabase-js` - Supabase client (auth, DB, storage)
- `posthog-js` - PostHog product analytics, web analytics, session replay (dynamic import for crash safety)
- `@sentry/react` - Error monitoring with session replay (dynamic import for crash safety)
- `dompurify` - HTML sanitization for user-generated content (zero-tag whitelist)
- `web-vitals` - Core Web Vitals measurement (LCP/INP/CLS/TTFB → PostHog)
- `postcss` + `autoprefixer` - CSS processing pipeline
- `eslint-plugin-react-hooks` - Hooks linting rules
- `stripe` - Stripe API client (server-side, subscriptions + payments)
- `vitest` + `@testing-library/react` + `jsdom` - Testing framework (~115 tests across 6 files)
- `@playwright/test` - E2E testing framework (smoke tests)
- `jest-axe` - Accessibility testing (automated ARIA/label/heading checks)
- `rollup-plugin-visualizer` - Bundle size visualization (`npm run build:analyze`)
- `motion/react` - Animation library for Dock magnification, HeroBackground shapes, page transitions

## Project Structure

```
audio-analyzer-pro/
├── .github/
│   └── workflows/
│       └── ci.yml                     # GitHub Actions CI (lint + test + build on push/PR)
├── api/                           # Vercel Serverless Functions
│   ├── _rateLimit.js              # In-memory sliding window rate limiter (shared)
│   ├── _validateEnv.js            # Env var validation helper (shared)
│   ├── upload-audio.js            # Handle audio uploads to Vercel Blob
│   ├── upload-preset.js           # Handle Vital preset uploads to Vercel Blob
│   ├── separate-stems.js          # Start stem separation (Replicate API)
│   ├── check-stems.js             # Poll separation status
│   ├── create-checkout.js         # Create Stripe checkout session
│   ├── create-portal.js           # Create Stripe billing portal session
│   ├── stripe-webhook.js          # Stripe webhook handler (subscription lifecycle)
│   ├── admin-stats.js             # Admin dashboard stats aggregation (Supabase + Stripe)
│   ├── admin-actions.js           # Admin write operations (change tier, unpublish, delete comment)
│   ├── public-stats.js            # Public platform stats (no auth, cached, rate limited)
│   ├── instrument.js              # Gemini AI instrument detection (POST-only, synchronous)
│   └── send-feedback.js           # Send user feedback emails via Resend API
├── e2e/                           # Playwright E2E tests
│   └── smoke.spec.js              # Smoke tests (homepage, navigation, upload)
├── supabase/                      # Supabase SQL scripts
│   ├── config.toml                # Supabase CLI configuration
│   ├── MIGRATIONS.md              # Migration documentation + run order
│   ├── schema.sql                 # DB schema (profiles, analyses, RLS, triggers)
│   ├── storage.sql                # Avatar storage bucket + policies
│   ├── seeds/
│   │   └── seed_sound_sauces.sql  # 25 seed Sound Sauces (iconic synth sounds)
│   └── migrations/                # Phase migration scripts (22 files)
│       ├── phase2a_publish.sql    # description, tags, search_vector on analyses
│       ├── phase2c_likes.sql      # likes table, like_count trigger
│       ├── phase2d_follows.sql    # follows table with RLS
│       ├── phase2e_recreations.sql # recreations table with match scores
│       ├── phase3a_comments.sql   # comments table with threading + denormalized count
│       ├── phase3b_vital_presets.sql # vital_preset_url column on analyses
│       ├── phase3c_standalone_presets.sql # post_type column on analyses
│       ├── phase3d_google_oauth_trigger.sql # Updated handle_new_user trigger for Google OAuth + backfill
│       ├── phase3e_download_tracking.sql  # downloads table, download_count trigger
│       ├── phase4a_subscriptions.sql      # subscription_tier, stripe_customer_id, usage_tracking table
│       ├── phase4b_onboarding.sql         # onboarding_completed flag on profiles
│       ├── phase4c_admin.sql              # is_admin flag on profiles
│       ├── phase5a_notifications.sql      # notifications table, triggers, create_notification helper
│       ├── phase5b_achievements.sql       # achievements table, badge check triggers
│       ├── phase6a_direct_messages.sql    # conversations, messages tables, mutual follow triggers
│       ├── phase6b_weekly_challenges.sql  # challenges, challenge_submissions tables, badge triggers
│       ├── phase4d_remove_premium.sql     # Simplify tiers: merge Premium into Pro (free/pro only)
│       └── phase7b_resume_analysis.sql    # stem_urls JSONB column on analyses for session restore
├── src/
│   ├── lib/
│   │   ├── supabase.js            # Supabase client singleton
│   │   ├── posthog.js             # PostHog analytics (dynamic import, event queue, 36+ tracking helpers)
│   │   ├── sentry.js              # Sentry error monitoring (dynamic import, crash-safe init)
│   │   └── webVitals.js           # Core Web Vitals tracking (LCP/INP/CLS/TTFB → PostHog)
│   ├── contexts/
│   │   └── AuthContext.jsx        # Auth provider + useAuth hook
│   ├── components/
│   │   ├── ui/                    # Reusable UI components
│   │   │   ├── Tooltip.jsx        # Hover tooltip component
│   │   │   ├── FeatureCard.jsx    # Analysis feature display card
│   │   │   ├── UpgradePrompt.jsx  # Subscription upgrade prompt
│   │   │   ├── OnboardingModal.jsx # Post-signup onboarding flow (3-step)
│   │   │   ├── ErrorBoundary.jsx  # React error boundary with themed fallback UI
│   │   │   ├── SoundCloudEmbed.jsx # Profile anthem player (glassmorphic card, SoundCloud Widget API, vinyl grooves, EQ bars, seek bar)
│   │   │   ├── FeedbackModal.jsx  # Bug report / feature request / general feedback modal
│   │   │   ├── HeroBackground.jsx # Floating glassmorphic pill shapes (motion/react, landing page ambient)
│   │   │   └── index.js
│   │   ├── settings/              # Settings components
│   │   │   ├── AvatarCreator.jsx  # Avatar selection/upload component
│   │   │   └── index.js
│   │   ├── auth/                  # Authentication components
│   │   │   ├── AuthModal.jsx      # Sign in/up/forgot password modal
│   │   │   └── index.js
│   │   ├── layout/                # Page layout components
│   │   │   ├── Header.jsx         # App header with theme toggle (legacy)
│   │   │   ├── Sidebar.jsx        # Navigation sidebar with auth (desktop + mobile)
│   │   │   ├── Dock.jsx           # macOS-style dock navigation (motion/react magnification, glassmorphic, auto-hide on modal via dock-visibility event)
│   │   │   ├── PageLayout.jsx     # Page wrapper with sidebar
│   │   │   └── index.js
│   │   ├── audio/                 # Audio playback & visualization
│   │   │   ├── WaveformVisualizer.jsx    # Waveform with zoom/loop/seek
│   │   │   ├── PlaybackControls.jsx      # Play/pause, progress, volume
│   │   │   ├── SpectrumAnalyzer.jsx      # Real-time frequency bars
│   │   │   ├── AudioUploadSection.jsx    # Upload + drag-drop
│   │   │   ├── AnalyzeSection.jsx         # Region indicator + analyze button (pre-analysis CTA)
│   │   │   ├── InstrumentSelector.jsx    # Post-analysis instrument picker + re-analyze
│   │   │   ├── StemSelector.jsx          # Stem separation UI + selection
│   │   │   └── index.js
│   │   ├── analysis/              # Analysis result displays
│   │   │   ├── ADSREnvelope.jsx   # SVG envelope visualization
│   │   │   ├── ResultsTabs.jsx    # Tabbed interface for results (sticky tabs)
│   │   │   ├── QuickCompare.jsx   # Client-side recreation comparison (no auth)
│   │   │   └── index.js
│   │   ├── comparison/            # A/B comparison features
│   │   │   ├── ComparisonPanel.jsx  # Spectral match & band comparison
│   │   │   ├── ExportToolbar.jsx    # Export/copy/compare buttons
│   │   │   └── index.js
│   │   ├── recipe/                # Sound Sauce components
│   │   │   ├── PublishModal.jsx         # Publish modal (title, description, tags)
│   │   │   ├── RecipeCard.jsx           # Card for browse grids
│   │   │   ├── RecipeDetail.jsx         # Full recipe view with author info
│   │   │   ├── RecipeGrid.jsx           # Responsive grid + infinite scroll
│   │   │   ├── LikeButton.jsx           # Heart icon like toggle
│   │   │   ├── FollowButton.jsx         # Follow/unfollow toggle
│   │   │   ├── RecreationUpload.jsx     # Upload dropzone for recreation attempts
│   │   │   ├── RecreationResult.jsx     # Match score + per-band bars
│   │   │   ├── RecreationLeaderboard.jsx # Top recreations sorted by score
│   │   │   ├── CommentsSection.jsx      # Threaded comments with replies
│   │   │   ├── PresetPostModal.jsx      # Standalone preset posting modal
│   │   │   ├── UserSearch.jsx           # User search with dropdown + follow buttons
│   │   │   └── index.js
│   │   ├── messages/              # Direct messaging components
│   │   │   ├── ConversationList.jsx     # Inbox/Requests tabs with unread badges
│   │   │   ├── MessageThread.jsx        # Chat thread with date separators + auto-scroll
│   │   │   ├── MessageInput.jsx         # Send message input (Enter to send, Shift+Enter newline)
│   │   │   └── index.js
│   │   ├── challenges/            # Weekly challenge components
│   │   │   ├── ChallengeCard.jsx        # Challenge card with status badge + countdown
│   │   │   ├── ChallengeGrid.jsx        # Responsive grid + infinite scroll
│   │   │   ├── ChallengeLeaderboard.jsx # Ranked submissions with medal icons
│   │   │   ├── ChallengeSubmission.jsx  # Upload dropzone + spectral match scoring
│   │   │   └── index.js
│   │   └── history/               # Analysis history
│   │       ├── HistoryPanel.jsx   # Saved analyses list + publish/public/private toggle
│   │       └── index.js
│   ├── hooks/
│   │   ├── useAudioProcessor.js   # Core audio processing (~800 lines)
│   │   ├── useAudioWorker.js      # Web Worker integration
│   │   ├── useTheme.js            # Theme state management
│   │   ├── useHistory.js          # Hybrid analysis history (Supabase + localStorage)
│   │   ├── useRecording.js        # Microphone recording logic (unused, kept for future)
│   │   ├── useStemSeparation.js   # Stem separation workflow
│   │   ├── useRecipes.js          # Recipe browsing, search, filter, pagination
│   │   ├── useLikes.js            # Like/unlike with optimistic updates
│   │   ├── useFollows.js          # Follow/unfollow with optimistic updates
│   │   ├── useFocusTrap.js        # Shared focus trap for modal dialogs
│   │   ├── useFeed.js             # Home page feed (followed users + trending)
│   │   ├── useRecreation.js       # Recreation upload + spectral match
│   │   ├── useComments.js         # Threaded comments for recipes
│   │   ├── usePresetPost.js       # Standalone preset posting workflow
│   │   ├── useUserSearch.js       # Search users by username
│   │   ├── useSubscription.js     # Stripe subscription management + usage tracking
│   │   ├── usePageTitle.js        # Dynamic document.title per page
│   │   ├── useNotifications.js    # Notification fetching, mark as read, delete
│   │   ├── useAchievements.js     # Achievement badge loading for any user
│   │   ├── useConversations.js    # DM conversation list, inbox/requests, getOrCreate
│   │   ├── useMessages.js         # Message thread, send with optimistic UI, 4s polling
│   │   ├── useChallenges.js       # Challenge browsing, filtering, creation
│   │   ├── useChallengeSubmission.js # Challenge submission upload + spectral match
│   │   ├── useDownloadedPresets.js # Track curated + community preset downloads
│   │   └── index.js               # Barrel exports for all hooks
│   ├── workers/
│   │   └── audio.worker.js        # Heavy DSP operations (off main thread)
│   ├── services/
│   │   └── vitalPresetGenerator.js # Vital synth preset builder (curated presets + tuning overrides + downloadRemotePreset helper)
│   ├── data/
│   │   ├── vitalPresets.js        # 40 curated Vital presets across 10 categories (bass/lead/pad/pluck/kick/drums/keys/guitar/brass/woodwind), featureProfile per preset, scorePresetMatch(), SEED_PRESET_MAP, findCuratedPresetForRecipe()
│   │   ├── vitalInitTemplate.json # Base Vital preset template
│   │   ├── badges.js              # Achievement badge definitions (12 badges)
│   │   └── avatars.js             # Avatar preset definitions (icons, colors)
│   ├── utils/
│   │   ├── constants.js           # Theme classes, instrument labels
│   │   ├── recommendations.js     # Instrument-specific synthesis recommendations (DAW suggestions, effects, tips)
│   │   ├── demoSoundGenerator.js  # Web Audio API synth demo (Cm7 pad, 3s WAV) + preset audio preview generator
│   │   ├── validateEnv.js         # Frontend env var validation (production only)
│   │   └── sanitize.js            # DOMPurify wrapper for user content sanitization
│   ├── __tests__/                 # Vitest test suite (~115 tests)
│   │   ├── setup.js               # Test environment setup
│   │   ├── AuthContext.test.jsx   # Auth provider tests (13 tests)
│   │   ├── useSubscription.test.js # Tier limits + usage tests (30 tests)
│   │   ├── audioProcessor.test.js # DSP algorithm tests (26 tests)
│   │   ├── vitalPresetGenerator.test.js # Curated preset tests (valid JSON, all 40 presets build, tuning params, categories)
│   │   ├── useHistory.test.js     # History + publish tests (15 tests)
│   │   └── a11y.test.jsx          # Accessibility tests (4 tests — jest-axe, ARIA names, labels, headings)
│   ├── pages/                     # Route page components
│   │   ├── Home.jsx               # Landing page with hero + following section + activity feed + preset posting
│   │   ├── Analyze.jsx            # Audio analyzer (main tool)
│   │   ├── Discover.jsx           # Browse/search/filter Sound Sauces
│   │   ├── Search.jsx             # Unified search for users + recipes + trending
│   │   ├── Profile.jsx            # User profile (hero with dot grid, Pro glow ring, count-up stats, 3 tabs: Sound Sauces/Activity/Badges)
│   │   ├── Recipe.jsx             # /recipe/:id - Sound Sauce detail page
│   │   ├── UserProfile.jsx        # /user/:username - Public user profile
│   │   ├── Settings.jsx           # Account settings, subscription billing, preferences
│   │   ├── Admin.jsx              # Admin dashboard (Supabase + Stripe analytics)
│   │   ├── Notifications.jsx      # Notifications page (filter tabs: All/Likes/Comments/Followers, grouped by time, mark as read, excludes message notifications)
│   │   ├── Messages.jsx           # /messages - Direct messaging (master-detail layout)
│   │   ├── Challenges.jsx         # /challenges - Browse/create weekly challenges
│   │   ├── ChallengeDetail.jsx    # /challenge/:id - Challenge detail + submission + leaderboard
│   │   ├── MyPresets.jsx           # /my-presets - Browse all 40 curated presets + community downloads
│   │   ├── Pricing.jsx            # /pricing - Pricing comparison (Free/Pro)
│   │   ├── Privacy.jsx            # /privacy - Privacy policy
│   │   ├── Terms.jsx              # /terms - Terms of service
│   │   ├── NotFound.jsx           # 404 catch-all page
│   │   └── index.js               # Page exports
│   ├── App.jsx                    # Router + layout wrapper
│   ├── main.jsx                   # React entry point (BrowserRouter + AuthProvider)
│   └── index.css                  # Tailwind imports
├── public/                        # Static assets
│   ├── favicon.svg                # SoundSauce logo (amber-to-dark-amber gradient with wave bars)
│   ├── logo-120.png               # 120x120 PNG logo for Google OAuth consent screen
│   ├── og-image.png               # 1200x630 OG social sharing image (branded)
│   ├── og-image.svg               # SVG source for OG image
│   ├── robots.txt                 # SEO: crawler rules (allow public, disallow api/settings/admin/messages)
│   └── sitemap.xml                # SEO: sitemap for search engines (5 main routes)
├── clap-model/                    # Legacy CLAP Cog model package (replaced by Gemini 2.5 Flash)
│   ├── cog.yaml                   # Cog configuration (Python 3.11, CUDA, model dependencies)
│   └── predict.py                 # CLAP inference predictor (laion/larger_clap_music, zero-shot classification)
├── dist/                          # Production build output
├── .env.local                     # Supabase credentials (gitignored)
├── .vercel/                       # Vercel deployment config
├── vercel.json                    # Vercel config (SPA rewrites + security headers)
├── playwright.config.js           # Playwright E2E test configuration
├── vite.config.js                 # Vite configuration (+ rollup-plugin-visualizer)
├── tailwind.config.js             # Tailwind configuration
├── postcss.config.js              # PostCSS plugins
├── eslint.config.js               # ESLint flat config
└── package.json
```

## Architecture

The application follows a **modular architecture** with separation of concerns:

### Component Architecture

**UI Components (`/src/components/ui/`)**
- `Tooltip` - Hover tooltip with customizable position
- `FeatureCard` - Displays analysis features with label, value, and optional description
- `UpgradePrompt` - Subscription upgrade prompt shown when free tier limits hit
- `OnboardingModal` - Post-signup 3-step onboarding (Quick Demo → Personalize → Get Started). DAW preference pre-selects Ableton Live (Ableton-first strategy), DAW options ordered with Ableton first
- `SoundCloudEmbed` - Profile anthem player: glassmorphic card with album art blurred background (backdrop-filter blur 32px), larger vinyl record (56px) with conic gradient grooves and album art center label, animated EQ bars (5 amber bars with staggered `eq-bounce` CSS animation when playing), ambient ember glow on card edges when playing, clickable progress bar with seek support and scrubber dot on hover, time display (current/duration in mono font), `rounded-2xl` corners. Hidden SoundCloud iframe + Widget API for playback control. Uses ref-based animation (no getElementById) for multiple instance support
- `FeedbackModal` - Bug report / feature request / general feedback modal. Three type chips (Bug Report, Feature Request, General), textarea with 2000 char limit, optional email reply-to. Sends to `/api/send-feedback`. PostHog tracking on open + submit. Accessible from PageLayout header (MessageSquarePlus icon)
- `HeroBackground` - Floating glassmorphic pill shapes for landing page ambient decoration. Uses `motion/react` infinite loop animations with staggered delays. `ElegantShape` sub-component with `backdropFilter: blur`, gradient fills, rotation + float motion. Renders behind hero content via absolute positioning

**Settings Components (`/src/components/settings/`)**
- `AvatarCreator` - Avatar selection/upload with preview

**Auth Components (`/src/components/auth/`)**
- `AuthModal` - Sign in/sign up/forgot password modal with email auth (username required, 2-30 chars) and Google OAuth button (fully functional)

**Layout Components (`/src/components/layout/`)**
- `Header` - App title, keyboard shortcuts display, theme toggle button
- `Sidebar` - Navigation with user info (avatar, email), sign in/out button, AuthModal integration. Recent analyses sub-tab under Analyze only appears on `/analyze` page, starts collapsed, hides when navigating away. Recent items (limit 5) show stem type indicator (Music icon), instrument label, time ago, and scissors icon when stems are available. Clicking a recent item navigates to `/analyze?id=xxx` for full session restore
- `Dock` - macOS-style dock navigation bar. Uses `motion/react` for icon magnification on hover (1→1.4 scale with spring physics). Glassmorphic background (`backdrop-blur-xl bg-zinc-900/60` dark, `bg-white/70` light). `DockIcon` sub-component with cursor-tracking amber glow via radial gradient that follows mouse position. Contains all nav items (Home, Analyze, Discover, Search, Notifications, Profile, Settings, Messages, Challenges). Fixed to bottom of viewport on desktop, hidden on mobile. Tooltip labels appear above icons on hover. Auto-hides with spring slide-down animation when modals are open (via `hidden` prop driven by `dock-visibility` custom event from PageLayout)

**Audio Components (`/src/components/audio/`)**
- `WaveformVisualizer` - Canvas-based DAW-style waveform with mirrored rendering (positive/negative amplitudes), 64x zoom, minimap scrollbar with drag-to-pan, 60fps playhead animation, click-to-seek, drag-to-select loop, scroll-to-pan, Ctrl+scroll-to-zoom, pinch-to-zoom (mobile). Three-layer Canvas architecture: static waveform, animated overlay, interaction handler. Uses hi-res min/max data from Web Worker for deep zoom detail
- `PlaybackControls` - Play/pause button, progress bar with loop markers, time display, volume slider
- `SpectrumAnalyzer` - Real-time 64-bar frequency spectrum (monochrome)
- `AudioUploadSection` - File upload button (WAV/MP3/M4A), drag-and-drop zone, demo sound button, welcome banner for first-time users
- `AnalyzeSection` - Region selection indicator (green bar showing selected time range) + Analyze button. Shown BEFORE analysis as the main call-to-action. Shows scissors icon + "Analyze Selection (3.0s)" when region selected, sparkles icon + "Analyze" when no region
- `InstrumentSelector` - Post-analysis instrument picker: detected instruments shown as selectable chips with confidence scores, frequency band breakdown. Detection pre-fills the top instrument as "smart default" — tapping a different instrument instantly regenerates recommendations without re-running DSP (no separate button needed). Header: "What instrument is this?" with "Tap to change" hint. Checkmark shows current selection. **Full mix guidance**: When a full mix is detected (isFullMix or smart heuristic), shows a `FullMixGuidance` banner with two action cards — "Separate Stems" (scrolls to stem section) and "Select a Region" (scrolls to waveform) — instead of the instrument grid. Instrument grid hidden behind "Show detected instruments anyway" toggle
- `StemSelector` - Stem separation trigger, progress display, stem cards (vocals/drums/bass/other) with per-stem Analyze/play/download buttons. Analysis state props: `onAnalyzeStem`, `analyzingStem`, `analyzedStem`

**Analysis Components (`/src/components/analysis/`)**
- `ADSREnvelope` - SVG visualization of attack/decay/sustain/release envelope (Serum/Vital style)
- `ResultsTabs` - Tabbed interface for 3 tabs: Vital Preset (browse presets & synthesis tips), DAW Recipe (plugin recommendations & detailed settings), Full Analysis. Dynamic DAW label from user preference (defaults to "Ableton Live Recipe" when no preference set). Sticky tab bar (`sticky top-0 z-10`) stays visible while scrolling through content. Contextual descriptions per tab
- `QuickCompare` - Client-side recreation comparison for the Analyze page. Upload a recreation file → decode both AudioBuffers → Web Worker `calculateSpectralMatch()` → display `RecreationResult`. No auth required, no Supabase, no uploads — runs entirely in the browser. Collapsible section with drag-and-drop, file validation, error handling
- `SoundSauce` - DAW-specific synthesis recipe component. Accepts `showVitalSection` prop (default `true`). When `false` (DAW tab): shows VitalBridgeCard pointing to Vital tab, numbered DAW integration tips from `getDAWIntegrationTips()` as primary content (load preset, effects chain, mixing tip, layering), collapsible "Alternative: Build from scratch" section with original plugin recipe. When `true`: full recipe with sound ID, DAW recipe, Vital recipe, download button
- `VitalGuide` - Vital-specific synthesis tips: generates step-by-step recreation instructions from analysis features (waveform type, filter settings, ADSR, modulation). Exported from `SoundRecipe.jsx` for standalone use in the Vital tab

**Comparison Components (`/src/components/comparison/`)**
- `ComparisonPanel` - A/B spectral match score, band-by-band comparison bars, EQ suggestions
- `ExportToolbar` - Copy button for analysis results

**Recipe Components (`/src/components/recipe/`)** (user-facing branding: "Sound Sauce")
- `PublishModal` - Modal with title, description textarea, tag chips (predefined + custom), publish button
- `RecipeCard` - Card for browse grids: title, description, instrument, author avatar+name, tags, date, LikeButton
- `RecipeDetail` - Full recipe view reusing analysis components in read-only mode + author info, LikeButton, FollowButton. Community download deduplication: `hasCommunityDownload` prop checks if preset already downloaded, shows "Already in your library" badge, skips count increment on re-download (file still downloads). Fallback preset support: when `vital_preset_url` is missing, `findCuratedPresetForRecipe(recipe)` finds the best curated preset match — download button builds the preset client-side via `buildVitalPreset()` (no server needed). Button label shows preset name: "Vital Preset (808 Bass)". Collapsible analysis sections: 4 content cards (Sound Sauce, Analysis Details, Detected Instruments, Mix Tips) use local `CollapsibleSection` component with ChevronDown toggle, all collapsed by default. Header card (title, author, tags, preset download) stays fully visible
- `RecipeGrid` - Responsive grid (1/2/3 cols) with IntersectionObserver infinite scroll, passes like props through
- `LikeButton` - Heart icon (filled/outlined), shows count, prevents event propagation
- `FollowButton` - UserPlus/UserMinus toggle, gradient styling in light mode
- `RecreationUpload` - File upload dropzone for recreation attempts, 4-step progress indicator (Upload → Decode → Compare → Save) with circles + connecting lines, auth gate for guests. Steps show checkmark when complete, spinner when active, number when pending
- `RecreationResult` - Overall match score %, per-band comparison bars (6 bands), EQ suggestions
- `RecreationLeaderboard` - Top 10 recreations sorted by match_score with avatar, username, rank
- `CommentsSection` - Threaded comment display with reply UI, auth gate for posting, delete own comments
- `PresetPostModal` - Modal for posting standalone Vital presets: file upload dropzone (drag-and-drop .vital), title (auto-fills from filename), description, tags, loading/error states
- `PresetSelector` - Curated Vital preset browser: category pills (10 tabs), preset cards, tuning sliders (8 params), community presets section, A/B comparison panel, **audio preview**, "Open in Vital" tip. **Analysis-based scoring**: accepts `analysisFeatures` prop, scores presets via `scorePresetMatch()`, sorts by match score descending, auto-selects best preset on mount (if score >= 40%), shows gradient "Best Match 87%" badge on top preset and subtle "72%" scores on others. Auto-selects category from detected instrument. Remounts via `key={selectedInstrument}` prop from parent to reset category/selection/sliders on instrument change. `CATEGORY_TO_TAG` maps category IDs to tag labels for querying community presets from `analyses` table (`post_type='preset'`, `is_public=true`, matching tag, ordered by `like_count DESC`, limit 10). Community section shows compact cards with title, author avatar+username, description, download button, like/download counts. **A/B comparison**: `comparePresetId` state, ArrowLeftRight button on each unselected preset card, two-column panel shows name/description/matchReason/parameters side by side with differing values highlighted in accent color, "Keep This" vs "Select This" buttons. **Audio preview**: Volume2 play button on each preset card generates a 2-second preview via `generatePresetPreview()` in `demoSoundGenerator.js` (OfflineAudioContext → WAV → decode → play). Single AudioContext shared across previews, decoded AudioBuffers cached in ref map for instant replays. Only one preview plays at a time — clicking another stops the current one. Pulsing animation on active play button. Stops on preset select or category change. **Vital tip**: After curated preset download, shows instructional card "Double-click the downloaded .vital file to open in Vital" with vital.audio link, auto-dismisses after 8s. All user text sanitized via DOMPurify. Used in Analyze page and RecipeDetail
- `UserSearch` - User search input with dropdown results: debounced Supabase `ilike` query, avatar + username + bio display, FollowButton per result, click-to-navigate to `/user/:username`, click-outside-to-close

**History Components (`/src/components/history/`)**
- `HistoryPanel` - Saved analyses list with load/delete, publish button (opens PublishModal), public/private toggle (Globe/Lock icons), cloud-aware

**Messages Components (`/src/components/messages/`)**
- `ConversationList` - Inbox/Requests tabs with count badges, conversation rows (avatar, name, preview text, relative time, unread badge), empty states per tab
- `MessageThread` - Chat thread with sent messages right-aligned (accent gradient), received left-aligned, date separators (Today/Yesterday/Weekday/Full date), auto-scroll to bottom on new messages, "Load older messages" button at top
- `MessageInput` - Textarea with auto-resize, Enter to send, Shift+Enter for newline, disabled state with "Follow this user back to reply" placeholder, Send button with gradient styling

**Challenges Components (`/src/components/challenges/`)**
- `ChallengeCard` - Status badge (Active green/Upcoming yellow/Ended gray), time remaining/until start display, Trophy icon, title, description, creator info, submission count
- `ChallengeGrid` - Responsive grid with IntersectionObserver infinite scroll, skeleton loading cards (pattern from RecipeGrid)
- `ChallengeLeaderboard` - Ranked submissions with Medal icons for top 3, avatar + username link, match score with color coding (90%+ green, 70%+ accent, below gray)
- `ChallengeSubmission` - Auth gate, active gate, reference audio gate, dropzone upload (drag and drop + click), processing state with progress bar, result display (score %, per-band bars), re-submit button, error state with Try Again

### Auth & Data Layer

**`src/lib/supabase.js`** - Supabase client singleton
- Created with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars

**`src/contexts/AuthContext.jsx`** - Auth state management
- `AuthProvider` wraps the app (in `main.jsx` inside `BrowserRouter`)
- `useAuth()` hook exposes: `user`, `profile`, `loading`, `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle`, `signOut`, `resetPassword`, `updateProfile`, `updateEmail`, `updatePassword`, `tier`, `isSubscribed`, `isPro`, `isAdmin`, `unreadMessages`, `refreshProfile`
- `signUpWithEmail(email, password, username)` passes username as `raw_user_meta_data` + sets `emailRedirectTo` to `window.location.origin` (fixes localhost redirect in confirmation emails)
- Pattern: `onAuthStateChange` sets user + loading only; profile fetched in separate `useEffect` (see Memory notes)

### Custom Hooks

**`useAudioProcessor`** - Core audio processing with Web Audio API. Exposes `generateWaveformData` in the return object (proxies to `worker.generateWaveformData` for generating hi-res min/max waveform pairs from channel data, used by Analyze.jsx for stem waveform rendering)
**`useAudioWorker`** - Web Worker integration for background DSP
**`useTheme`** - Theme state with localStorage persistence
**`useHistory`** - Hybrid analysis history (Supabase when authenticated, localStorage fallback for guests). Includes `publishRecipe(id, { description, tags })` for publishing analyses as Sound Sauces. Serializes `audioUrl`, `audioFilename`, `stemUrls` via `toSupabaseRow()`/`fromSupabaseRow()` for session restore
**`useRecording`** - MediaRecorder for microphone input (unused, kept for future)
**`useStemSeparation`** - Stem separation workflow with Replicate API polling. `blobUrl` state persists the Vercel Blob upload URL. `restoreStems(savedStems, savedBlobUrl)` restores stem cards from saved URLs without re-running separation. Expired Replicate CDN URLs (~7 day TTL) detected via 403/404 → `status='expired'` with re-separate banner. Exports: `blobUrl`, `restoreStems`, `isExpired` in addition to existing API
**`useRecipes`** - Fetching, searching, filtering public Sound Sauces. Cursor-based pagination for "recent" sort, offset-based for "popular". Full-text search via Postgres `tsvector`. Tag filter via `.contains()` (AND logic). `buildQuery` wrapped in `useCallback` for stable deps. Uses `debounceTimerRef` for search debouncing. Exports: `recipes`, `loading`, `hasMore`, `searchQuery`, `selectedTags`, `sortBy`, `setSortBy`, `fetchRecipes`, `fetchMore`, `search`, `toggleTag`, `clearTags`
**`useLikes`** - Like/unlike recipes with optimistic UI updates. Loads all user likes on mount. Provides `isLiked(id)` and `toggleLike(id)`. Uses `likedIdsRef` pattern for stable callbacks — `toggleLike` only depends on `[user]`
**`useFollows`** - Follow/unfollow users with optimistic updates. Provides `isFollowing(userId)`, `toggleFollow(targetUserId)`, `fetchCounts(userId)`. Prevents self-follow. Uses `followingIdsRef` pattern for stable callbacks
**`useFocusTrap`** - Shared focus trap for modal dialogs. Traps Tab/Shift+Tab within container, auto-focuses first focusable element on open, restores focus to previous element on close. Used by all 7 modal components.
**`useFeed`** - Home page activity feed. Auth'd users: recipes from followed users. Fallback/guests: trending (most liked in last 7 days), then most recent. Uses abort ref counter to prevent race conditions on rapid auth changes
**`useRecreation`** - Recreation upload + spectral match. Flow: upload to Vercel Blob → decode both audio → worker spectral match → save to `recreations` table. Status: 'idle' | 'uploading' | 'analyzing' | 'saving' | 'done' | 'error'
**`useComments`** - Fetch threaded comments for a recipe, add comments (with optional `parent_id` for replies), delete own comments. Builds tree structure from flat DB rows. Uses functional setState updater for safe optimistic rollback snapshots (avoids stale closure bug)
**`usePresetPost`** - Standalone preset posting. States: `idle → validating → uploading → saving → done | error`. Reads `.vital` file as text, validates JSON, uploads to Vercel Blob via `/api/upload-preset`, inserts into `analyses` with `post_type='preset'`. Returns new row ID for navigation
**`useUserSearch`** - Search users by username via Supabase `ilike` query. Debounce-safe with abort ref pattern to discard stale results. Filters out the current user. Returns up to 10 matches with `id`, `username`, `avatar_url`, `bio`. Exports: `results`, `loading`, `query`, `searchUsers`, `clearSearch`
**`useSubscription`** - Stripe subscription management. Provides `tier`, `limits`, `usage`, `loading`. Limit checks: `canAnalyze()`, `canSeparateStems()`, `canPublish()`, `canSaveAnalysis()`. Remaining counts: `analysesRemaining`, `stemsRemaining`, `publishesRemaining`, `storageRemaining`. Increment functions: `incrementAnalyses()`, `incrementStems()`, `incrementPublishes()`. Stripe flows: `startCheckout(priceId)`, `openBillingPortal()`. Usage tracked per month in `usage_tracking` table.
**`usePageTitle`** - Dynamic document.title per page. Sets "subtitle — title | SoundSauce" format. Cleanup resets to "SoundSauce" on unmount. Used by all 13 page components.
**`useNotifications`** - Notification fetching and management. Loads notifications on mount with actor profile join (FK hint syntax `profiles!notifications_actor_id_fkey`). Excludes `new_message` type (messages have their own inbox). Polls every 30s for new notifications using `notificationsRef` to avoid interval teardown — only fetches notifications newer than the latest existing one (`gt('created_at', latestTime)`), deduplicates by ID. Calls `refreshProfile()` on new notifications to update sidebar badge count. Abort ref counter pattern for race conditions. `markAsRead(id)` and `markAllAsRead()` with optimistic updates + functional setState snapshot rollback. `deleteNotification(id)` with optimistic filter. Exports: `notifications`, `unreadCount`, `loading`, `markAsRead`, `markAllAsRead`, `deleteNotification`, `refreshNotifications`
**`useAchievements`** - Achievement badge loading for any user. Accepts optional `targetUserId` param (falls back to current user). Fetches from `achievements` table ordered by `earned_at DESC`. `hasBadge(type)` check, `recentBadge` (most recently earned). Exports: `badges`, `loading`, `hasBadge`, `recentBadge`
**`useConversations`** - DM conversation management. `CONVERSATION_QUERY` constant deduplicates the select string. Fetches conversations with FK hint syntax (`profiles!conversations_user_a_id_fkey`, `profiles!conversations_user_b_id_fkey`). Splits into `inbox` (is_request=false) and `requests` (is_request=true). `getOrCreateConversation(targetUserId)` via Supabase RPC with canonical user ordering. `markConversationRead(conversationId)` with optimistic update + `Promise.all` for parallel updates (marks messages read + decrements profile unread count). Helper functions: `getUnreadCount(conv)`, `getOtherUser(conv)`. `updateConversationPreview(conversationId, previewText)` optimistically updates preview text + timestamp and re-sorts so updated conversation floats to top. Abort ref counter pattern. Exports: `conversations`, `inbox`, `requests`, `loading`, `getOrCreateConversation`, `markConversationRead`, `updateConversationPreview`, `getUnreadCount`, `getOtherUser`, `refreshConversations`
**`useMessages`** - Message thread management. Takes `conversationId`, fetches newest 50 messages reversed for chronological display. `MESSAGE_QUERY` constant deduplicates the select string. `sendMessage(content)` with optimistic insert (temporary `optimistic-{timestamp}` ID, sender profile filled from current user's profile data) + snapshot rollback on error. `pollForNewMessages` via 4s `setInterval` using `messagesRef` pattern (stable interval, no teardown on new messages), deduplicates by existing IDs. `fetchOlderMessages()` for scroll-up pagination. FK hint: `profiles!messages_sender_id_fkey`. Exports: `messages`, `loading`, `sending`, `sendMessage`, `fetchOlderMessages`, `hasOlder`
**`useChallenges`** - Challenge browsing and creation. `getChallengeStatus(challenge)` derives active/upcoming/ended from dates (not stored). Browse with filter (all/active/upcoming/ended), cursor-based pagination. `fetchActiveChallenge()` for Home page featured section. `createChallenge({title, description, soundSauceId, referenceAudioUrl, startDate, endDate})` for Pro users. `fetchChallenge(challengeId)` for detail page. FK hint: `profiles!challenges_creator_id_fkey`. Exports: `challenges`, `activeChallenge`, `loading`, `hasMore`, `filter`, `setFilter`, `fetchMore`, `createChallenge`, `fetchChallenge`, `getChallengeStatus`
**`useChallengeSubmission`** - Challenge submission with spectral match. Pattern identical to `useRecreation.js` but with UPSERT instead of INSERT. Flow: upload to Vercel Blob → decode both AudioBuffers → Web Worker spectral match → UPSERT to `challenge_submissions` (`onConflict: 'user_id,challenge_id'` for re-submissions). AudioContext cleanup in finally block. Status: 'idle' | 'uploading' | 'analyzing' | 'saving' | 'done' | 'error'. Exports: `submit`, `status`, `progress`, `result`, `error`, `leaderboard`, `fetchLeaderboard`
**`useDownloadedPresets`** - Track curated and community preset downloads. Curated presets tracked in localStorage (key: `soundsauce_curated_downloads`) since they have no `analysis_id`. Community preset downloads tracked via existing Supabase `downloads` table. `trackCuratedDownload(presetId, presetName)` records curated download. `hasDownloadedPreset(presetId)` checks curated. `hasCommunityDownload(analysisId)` checks community downloads array. `trackCommunityDownload(analysisId)` inserts into downloads table only if not already downloaded (deduplication), then re-fetches state. Uses `hasCommunityDownloadRef` pattern (ref synced via useEffect) for stable closure in trackCommunityDownload — same pattern as useLikes/useFollows. Exports: `curatedDownloads`, `communityDownloads`, `loading`, `hasDownloadedPreset`, `trackCuratedDownload`, `hasCommunityDownload`, `trackCommunityDownload`

### Web Worker (`/src/workers/audio.worker.js`)
Offloads heavy DSP operations to background thread:
- `calculateAudioFeatures()` - Full analysis pipeline
- `detectBPM()` - Tempo detection
- `detectKey()` - Key/scale detection
- `detectModulation()` - LFO/tremolo/vibrato detection
- `generateSpectrogram()` - Time-frequency data
- `detectWaveformType()` - Oscillator classification
- `analyzeFilterEnvelope()` - Filter sweep detection
- `detectHarmonics()` - Frequency peak detection
- `detectInstruments()` - Instrument classification (uses temporal centroid, pitch envelope, MFCCs, spectral contrast, frequency bands, envelope analysis)
- `analyzeTemporalCentroid()` - Amplitude energy distribution over time (0-1 scale)
- `analyzePitchEnvelope()` - Pitch stability/sweep detection via autocorrelation
- `computeMFCCs()` - 13 mel-frequency cepstral coefficients + spectral contrast
- `createMelFilterbank()` - Triangular mel-spaced filter construction helper
- `calculateSpectralMatch()` - A/B comparison
- `extractMLFeaturesFromAudio()` - ML-ready feature vectors (28 features)
- `generateWaveformData()` - Hi-res min/max pairs (~1 per 64 samples) for Canvas waveform deep zoom

### Vercel Serverless API (`/api/`)
Backend functions for file uploads and stem separation:

**`/api/upload-audio.js`** - Handle audio uploads
- Uses `@vercel/blob` client for large file uploads
- Validates audio file types (wav, mp3, m4a)
- Max file size: 100MB
- Generates unique filenames with `addRandomSuffix`
- Returns public Blob URL for Replicate

**`/api/upload-preset.js`** - Handle Vital preset uploads (authenticated)
- Validates JWT auth token via Supabase `auth.getUser()` (returns 401 if missing/invalid)
- Receives preset JSON string + filename from frontend
- Validates that preset data is valid JSON
- Uploads to Vercel Blob under `presets/` prefix with `.vital` extension
- Returns public Blob URL for storage in `analyses.vital_preset_url`

**`/api/separate-stems.js`** - Start stem separation
- Receives Vercel Blob URL from frontend
- Validates URL format
- Calls Replicate API with Demucs model (`cjwbw/demucs:htdemucs`)
- Returns prediction ID for polling
- Config: 60 second max duration

**`/api/check-stems.js`** - Poll separation status
- Receives prediction ID as query param
- Polls Replicate for status updates
- Returns progress estimate based on elapsed time
- When complete, returns stem URLs (vocals, drums, bass, other)
- Handles various Demucs output formats

**`/api/create-checkout.js`** - Create Stripe checkout session (authenticated)
- Validates JWT auth token via Supabase `auth.getUser()`
- Accepts tier name ('pro'/'premium') or direct Stripe Price ID
- Creates or looks up Stripe customer, saves `stripe_customer_id` to profile
- Returns Stripe checkout URL for client-side redirect
- Success/cancel redirects to `/settings?checkout=success|canceled`

**`/api/create-portal.js`** - Create Stripe billing portal session (authenticated)
- Validates JWT auth token
- Returns Stripe billing portal URL for managing subscription

**`/api/stripe-webhook.js`** - Stripe webhook handler
- Verifies Stripe signature with raw body parsing
- Uses Supabase service role client to bypass RLS
- Handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Maps Stripe price IDs to tier names, Stripe statuses to app statuses

**`/api/admin-stats.js`** - Admin dashboard stats aggregation (authenticated + admin-only)
- Double-layer security: JWT auth + `is_admin` DB check
- Tab-based routing via `?tab=overview|users|content` query parameter
- Time range filtering via `?range=7d|30d|90d|all` (users tab)
- Overview tab: user counts, subscription breakdown, content stats, Stripe MRR, recent signups, top content
- Users tab: DAU/WAU/MAU engagement metrics (via `get_active_users_by_day()` RPC), signup growth, onboarding completion rate, conversion rate, user search (`?query=username`)
- Content tab: recent public content with profile joins, recent comments with profile + analysis joins

**`/api/admin-actions.js`** - Admin write operations (authenticated + admin-only)
- Double-layer security: JWT auth + `is_admin` DB check (same as admin-stats)
- Rate limited via `_rateLimit.js` (10 req/min)
- POST-only endpoint with action routing via `req.body.action`
- Actions: `changeTier` (update user subscription_tier), `unpublish` (set is_public=false), `deleteComment` (delete from comments table)
- Uses Supabase service role client to bypass RLS

**`/api/public-stats.js`** - Public platform stats for social proof
- No auth required (public endpoint)
- Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
- In-memory cache with 5-minute TTL (reuses pattern from `_rateLimit.js`)
- Rate limited via `_rateLimit.js` (30 req/min)
- Runs 3 parallel COUNT queries on analyses and downloads tables
- Returns: `{ totalAnalyses, publicRecipes, totalDownloads }`
- Available for social proof display (currently unused after Home page simplification)

**`/api/instrument.js`** - Gemini AI instrument detection (synchronous)
- POST-only endpoint — sends audio to Google Gemini 2.5 Flash for zero-shot instrument classification
- Receives `audioUrl` (Vercel Blob URL) + `labels` (array of text labels for zero-shot classification)
- Fetches audio from Vercel Blob, sends inline (base64) to Gemini with structured JSON response schema
- Returns results directly as `[{ label, score }]` array — no polling needed (~2-5 seconds)
- Rate limited via `_rateLimit.js` (10 req/min)
- Requires `GEMINI_API_KEY` env var
- ~$0.001 per inference (10-50x cheaper than previous CLAP/Replicate approach)

**`/api/send-feedback.js`** - Send user feedback emails via Resend API
- POST-only endpoint, no auth required
- Receives `type` ('bug' | 'feature' | 'general'), `message` (max 2000 chars), optional `email` (reply-to), `page`, `username`
- Sends branded HTML email to soundsauceapp@gmail.com via Resend HTTP API
- Rate limited via `_rateLimit.js` (3 req/min — strict to prevent abuse)
- Requires `RESEND_API_KEY` env var

### `/src/hooks/useStemSeparation.js` (Stem Separation Hook)
Manages the complete stem separation workflow:

- **State Management**
  - `stems` - Object with stem URLs `{ vocals, drums, bass, other }`
  - `stemAudioData` - Downloaded stem ArrayBuffers
  - `status` - 'idle' | 'uploading' | 'processing' | 'downloading' | 'ready' | 'expired' | 'error'
  - `progress` - 0-100 percentage
  - `error` - Error message if any
  - `blobUrl` - Vercel Blob URL of uploaded audio (persists indefinitely, used for re-separation)

- **Actions**
  - `separateStems(audioData, filename)` - Upload to Vercel Blob, send URL to Replicate, start polling
  - `restoreStems(savedStems, savedBlobUrl)` - Restore stem cards from saved URLs without re-running separation (for session restore)
  - `getStemAudio(stemType)` - Download and cache individual stem (detects expired URLs via 403/404 → sets status='expired')
  - `downloadAllStems()` - Download all stems at once
  - `clearStems()` - Reset all state (including blobUrl)
  - `cancelSeparation()` - Stop polling (prediction continues on Replicate)

- **Computed**
  - `isProcessing` - True during upload or processing
  - `isReady` - True when stems are available
  - `isExpired` - True when stem URLs have expired (Replicate CDN ~7 day TTL)
  - `hasStems` - True if stems object exists
  - `hasStem(type)` - Check if specific stem available
  - `isStemDownloaded(type)` - Check if stem cached locally

### `/src/hooks/useAudioProcessor.js` (Audio Processing Hook)
Custom hook encapsulating all Web Audio API logic with proper memory leak prevention:

- **AudioContext Lifecycle Management**
  - `getAudioContext()` - Lazy initialization with autoplay policy handling
  - `cleanup()` - Proper disposal of audio nodes and context on unmount

- **FFT Implementation**
  - `fft(real, imag)` - Cooley-Tukey radix-2 DIT algorithm for O(n log n) spectral analysis
  - `computeMagnitudeSpectrum(data, windowSize)` - FFT with Hann windowing

- **Audio Analysis Engine**
  - `calculateAudioFeatures(channelData, sampleRate)` - Core DSP analysis (returns all features)
  - `analyzeAudio(audioFileData, options?)` - High-level analysis API with buffer caching. Accepts optional `{ regionStart, regionEnd }` to analyze a specific time region instead of the default first 30 seconds
  - `findAttackTime(data, sampleRate)` - Envelope detection algorithm

- **Sound Design Analysis**
  - `detectWaveformType(channelData, sampleRate)` - Identifies sine/saw/square/triangle/pulse/complex waveforms by analyzing harmonic ratios
  - `analyzeFilterEnvelope(channelData, sampleRate)` - Tracks spectral centroid over time to detect filter movement, cutoff, resonance
  - `detectModulation(channelData, sampleRate)` - Detects LFO rate, tremolo, vibrato, chorus/detune

- **Buffer Preparation**
  - `prepareAudioBuffer(audioFileData)` - Decodes audio to AudioBuffer, generates waveform data (200 points), caches buffer, sets duration. Does NOT run instrument detection — used on upload so waveform/playback is available immediately

- **Instrument Detection**
  - `detectInstrumentsFromAudioData(audioFileData)` - Quick detection from raw audio (legacy, no longer called on upload)
  - `detectInstruments(channelData, sampleRate)` - Heuristic-based instrument classification
  - `analyzeFrequencyBands(channelData, sampleRate)` - 6-band frequency analysis (sub-bass to high), multi-window averaging (up to 6 windows spread across entire audio)
  - `analyzeEnvelope(channelData, sampleRate)` - Temporal envelope analysis (decay, sustain, percussive)
  - Detects: Kick, Bass, Sub-bass, Guitar, Lead, Pad, Pluck with confidence scores

- **Playback System**
  - `togglePlayback(audioFileData)` - Play/pause with error handling
  - `playAudioBuffer(buffer, startTime)` - Low-level playback with loop support
  - `visualize()` - Real-time 64-bar spectrum analyzer (throttled state updates)
  - `skipTime(seconds)` / `seek(time)` - Navigation controls

- **Waveform & Visualization**
  - `generateWaveform(buffer)` - Downsamples audio to 200 points
  - Returns `spectrumData` and `waveformData` for UI rendering
  - Real-time refs (`spectrumDataRef`, `brightnessRef`, `playbackTimeRef`) for 60fps animations

- **Loop Controls**
  - `setLoopStart/setLoopEnd/setLoopEnabled` - Loop region management
  - `clearLoop()` - Reset loop state

- **Feature Extraction** (returned by `analyzeAudio`)
  - RMS Level - Root Mean Square for loudness
  - Brightness - Normalized spectral centroid (0-1)
  - Spectral Centroid - Frequency center of mass in Hz
  - Harmonicity - Zero-crossing rate analysis
  - Attack Time - Time to reach peak amplitude
  - BPM - Tempo detection with half/double tempo and Camelot notation
  - Key/Scale - Musical key with Camelot wheel code, scale notes, compatible keys
  - ADSR Envelope - Attack, Decay, Sustain, Release timing analysis
  - Filter Envelope - Cutoff, resonance, sweep direction
  - Modulation - LFO rate, tremolo, vibrato, chorus/detune detection
  - Waveform Type - Sine/saw/square/triangle/pulse/complex with harmonic profile
  - Spectrogram - Time-frequency representation data
  - Harmonics - Detected frequency peaks with note names

- **Advanced Analysis Algorithms**
  - `detectBPM(channelData, sampleRate)` - Tempo detection with harmonic validation (half/double tempo checking)
  - `detectKey(channelData, sampleRate)` - Key detection using Pearson correlation with Krumhansl-Schmuckler profiles
  - `calculateADSR(channelData, sampleRate)` - Envelope stage timing (attack, decay, sustain, release)
  - `generateSpectrogram(channelData, sampleRate)` - Time-frequency heatmap data using FFT
  - `detectHarmonics(channelData, sampleRate)` - Peak frequency detection with note name conversion
  - `frequencyToNote(frequency)` - Converts Hz to musical note name (e.g., "A4")

### `/src/pages/Analyze.jsx` (Main Analyzer Page)
Central page component that orchestrates the analysis workflow:

- **Workflow**: Upload → Listen/Browse waveform → Select region → Analyze → Show detected instruments → Pick instrument to refine
- **Buffer Preparation**: On upload, calls `prepareAudioBuffer()` to decode audio and render waveform immediately (no instrument detection)
- **Analysis**: `runAnalysis()` sends audio (or selected region) to Web Worker, receives features + instrument detection together
- **Re-analyze**: `reAnalyzeWithInstrument(instrument)` regenerates recommendations without re-running DSP (unless switching to a stem, which needs full re-analysis)
- **Gemini AI Enhancement**: After worker-based analysis, runs server-side Gemini 2.5 Flash detection in the background. Heuristic results shown instantly; Gemini refines in ~2-5 seconds. Audio uploaded to Vercel Blob, then sent to `/api/instrument` (POST) for Gemini inference. Results mapped via `AI_LABEL_MAP` (18 text labels to app instrument categories). Abort ref counter (`aiAbortRef`) prevents stale results. Source tracked as `'gemini'`.
- **Dynamic Synth Recommendations** - `generateInstrumentRecommendations(instrument, features)` uses actual analysis data
- **Stem Waveform State**: `activeStemView` (string|null — which stem's waveform is displayed), `stemWaveformDataRef` (cached decoded waveform data per stem type), `stemWaveformPreview` (200-point preview for active stem), `stemWaveformHiResRef` (hi-res min/max ref for active stem), `stemLoopRegions` (per-stem loop region state object). `prepareStemWaveform(stemType)` decodes stem audio via temporary AudioContext, generates preview + hi-res data via Web Worker, caches in `stemWaveformDataRef`. Stem-aware loop handlers: `handleViewLoopRegionChange`, `handleToggleViewLoop`, `handleClearViewLoop` delegate to stem or full mix state based on `activeStemView`.

**JSX Layout Order (when audio loaded):**
1. Audio metadata header (title/artist) — inline JSX
2. WaveformVisualizer — browse and select region
3. SpectrumAnalyzer — real-time frequency during playback
4. PlaybackControls — play/pause, seek, volume
5. Action Area (conditional, replaces fixed AnalyzeSection + StemSelector):
   - Short audio (≤15s) or loop region selected: `AnalyzeSection` + `StemSelector` (original layout)
   - Long audio (>15s), no stems: Stem-first guidance card ("Separate Stems" primary + "Analyze Full Track" secondary)
   - Stems processing/ready: `StemSelector` with per-stem Analyze buttons
6. InstrumentSelector (ONLY after analysis) — detected instruments + re-analyze
7. ExportToolbar + ResultsTabs (after analysis)

**Keyboard Shortcuts:**
- Space - Toggle playback
- Enter - Run analysis
- Arrow keys - Skip forward/backward 5 seconds
- L - Toggle loop
- Esc - Clear loop

**Accessibility & Mobile:**
- ARIA labels on all interactive elements
- Touch-friendly button sizes (min 44-52px)
- Responsive grids that stack on small screens

## Preferred Coding Style

### Paradigm: Functional Programming
- Use **functional components** with React Hooks (no class components)
- Favor **immutable state patterns** with useState
- Use **useCallback** for event handlers that are passed as props
- Use **useRef** for values that shouldn't trigger re-renders (audio nodes, animation frames)

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `FeatureCard`, `HistoryPanel` |
| Functions | camelCase | `generateWaveform`, `handleDragEnter` |
| State variables | camelCase | `audioFileData`, `isPlaying` |
| Constants | SCREAMING_SNAKE_CASE | `STATE_UPDATE_INTERVAL` |
| Event handlers | `handle` prefix | `handleWaveformMouseDown` |

### Styling Guidelines
- Use **Tailwind CSS utility classes** exclusively
- Use the `themeClasses` object pattern for dark/light mode support
- Only use inline style objects for truly dynamic values (e.g., bar heights)
- Keep responsive design in mind (use `md:`, `sm:` breakpoints)
- Minimum touch targets of 44px for mobile

### Design System

**Theme: Obsidian Ember** — Two distinct themes unified by amber/gold accent:
- **Dark Mode:** True black with warm amber/gold accent (Obsidian Ember)
- **Light Mode:** Warm stone tones with amber accent

**Typography:**
| Role | Font | Source |
|------|------|--------|
| Display/Headings | Satoshi | Fontshare |
| Body/UI | General Sans | Fontshare |
| Code/Data | JetBrains Mono | Google Fonts |
| Fallback | DM Sans | Google Fonts |

Tailwind classes: `font-display` (Satoshi), `font-sans` (General Sans), `font-mono` (JetBrains Mono)

**Color Palette:**
| Element | Dark Theme | Light Theme |
|---------|-----------|-------------|
| Background | `#09090B` (zinc-950) | `#FAFAF9` (stone-50) |
| Card/Surface | `#18181B` (zinc-900) | `#FFFFFF` (white) |
| Elevated Surface | `#27272A` (zinc-800) | `#F5F5F4` (stone-100) |
| Border | `#3F3F46` (zinc-700) | `#E7E5E4` (stone-200) |
| Border Subtle | `#27272A` (zinc-800) | `#F5F5F4` (stone-100) |
| Text Primary | `#FAFAFA` (zinc-50) | `#1C1917` (stone-900) |
| Text Muted | `#A1A1AA` (zinc-400) | `#57534E` (stone-500) |
| Text Dimmed | `#71717A` (zinc-500) | `#A8A29E` (stone-400) |
| Accent | `#F59E0B` (ember-500) | `#D97706` (ember-600) |
| Accent Hover | `#D97706` (ember-600) | `#B45309` (ember-700) |
| Accent Subtle | `rgba(245, 158, 11, 0.15)` | `rgba(217, 119, 6, 0.1)` |
| Success | `#22C55E` | `#16A34A` |
| Error | `#EF4444` | `#DC2626` |

**Custom Tailwind Colors:** `ember-50` through `ember-900` (amber-based), `zinc-50` through `zinc-950`. Defined in `tailwind.config.js`.

**Design Principles:**
- **Rounded corners (Resend-inspired)** - Cards: `rounded-lg` (8px), buttons: `rounded-md` (6px), inputs: `rounded-md`, tags/badges: `rounded-full` (pill), avatars: `rounded-full`, modals: `rounded-lg`. Exceptions: waveform canvas + spectrum analyzer stay squared (DAW-style)
- **No emojis** - Use lucide-react icons instead
- **Dark mode:** True black (#09090B) with zinc surfaces, amber accent for interactive elements
- **Light mode:** Warm stone tones with amber-600 accent for primary actions
- **Sidebar active state:** Softer highlight with `rounded-lg` — dark: `bg-zinc-800 text-zinc-50`, light: `bg-amber-50 text-amber-700`
- **Sidebar nav icon animations:** Each nav item has a unique CSS hover animation on the icon (`index.css`). Home: wiggle/tilt, Waves: scaleY pulse, Compass: 45deg rotation, Search: scale zoom, Bell: ring/swing, User: bounce, Settings: 90deg rotation, Admin: pulse/scale, Messages: wiggle/tilt, Trophy: lift+scale. Active state plays a single `nav-active-pop` scale animation on mount. Class pattern: `nav-icon-{name}` on the `NavLink`, `.nav-icon-target` on the `Icon` element.

**Button Styles:**
```jsx
// Default button (dark theme)
className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700 rounded-md"

// Primary button (dark theme) - amber accent
className="bg-ember-500 text-zinc-950 hover:bg-ember-600 rounded-md font-medium"

// Primary button (light theme) - amber accent
className="bg-ember-600 text-white hover:bg-ember-700 rounded-md font-medium"

// Secondary button (light theme)
className="bg-stone-900 text-white hover:bg-stone-800 rounded-md"
```

**Card Styles:**
```jsx
// Dark theme
className="bg-zinc-900 border-zinc-700 rounded-lg"

// Light theme
className="bg-white border-stone-200 rounded-lg"
```

**Navigation Active State:**
```jsx
// Dark theme
className="bg-zinc-800 text-zinc-50 rounded-lg"

// Light theme
className="bg-amber-50 text-amber-700 rounded-lg"
```

### Code Organization
- Group related useState hooks together
- Place useEffect hooks after state declarations
- Define helper functions before the component return
- Keep component definitions (like `Tooltip`, `FeatureCard`) near where they're used

### Best Practices
- Always clean up event listeners and animation frames in useEffect return
- Use proper dependency arrays in useEffect/useCallback
- Prefer descriptive variable names over comments
- Handle audio context resume for autoplay policy compliance
- Throttle high-frequency state updates (visualization runs at 60fps refs, 20fps state)

## Commands

```bash
# Development
npm run dev          # Start dev server with HMR

# Build
npm run build        # Production build to /dist
npm run build:analyze # Bundle analysis visualization (opens HTML report)

# Preview
npm run preview      # Preview production build locally

# Lint
npm run lint         # Run ESLint

# Test
npm run test         # Run Vitest in watch mode
npm run test:run     # Run Vitest once (CI mode, ~115 tests)
npm run test:e2e     # Run Playwright E2E tests (requires dev server running)
npm run test:e2e:ui  # Run Playwright in interactive UI mode

# Deploy (Vercel)
vercel build --prod && vercel deploy --prebuilt --prod   # Build + deploy (includes serverless functions)
```

## Deployment

The app is deployed on Vercel at: **https://soundsauce.app** (custom domain, primary) / **https://audio-analyzer-pro.vercel.app** (legacy Vercel subdomain)

### Environment Variables

**Local development (`.env.local`, gitignored):**

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL (e.g., `https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (JWT format `eyJ...`) |
| `VITE_POSTHOG_KEY` | PostHog project API key (`phc_...`) |
| `VITE_SENTRY_DSN` | Sentry DSN (optional, `https://...@sentry.io/...`) |

**Vercel (set in Dashboard → Project Settings → Environment Variables):**

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Same Supabase URL as local |
| `VITE_SUPABASE_ANON_KEY` | Same Supabase anon key as local |
| `VITE_POSTHOG_KEY` | PostHog project API key (`phc_...`) — baked into JS at build time |
| `REPLICATE_API_TOKEN` | Replicate API token for Demucs stem separation (`r8_...`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token (auto-configured when Blob store is connected) |
| `STRIPE_SECRET_KEY` | Stripe live secret key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe live webhook signing secret (`whsec_...`) |
| `STRIPE_PRO_PRICE_ID` | Stripe live Price ID for Pro tier (`price_...`) |
| `STRIPE_PREMIUM_PRICE_ID` | Stripe live Price ID for legacy Premium tier — webhook maps to 'pro' for backwards compat (`price_...`) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe live publishable key (`pk_live_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only, bypasses RLS) |
| `GEMINI_API_KEY` | Google AI Studio API key for Gemini 2.5 Flash instrument detection (`AIza...`) |
| `RESEND_API_KEY` | Resend API key for feedback emails (`re_...`) |
| `VITE_SENTRY_DSN` | Sentry DSN for error monitoring (optional, `https://...@sentry.io/...`) |

**Vercel Blob Setup:**
1. Go to Vercel Dashboard → Storage → Create Database → Blob
2. Connect to your project
3. `BLOB_READ_WRITE_TOKEN` is automatically added to your project

### Deployment Notes
- **IMPORTANT**: Use `vercel build --prod && vercel deploy --prebuilt --prod` — NOT `npm run build`
  - `npm run build` only runs Vite (frontend assets) — serverless functions in `/api/` will NOT be included
  - `vercel build --prod` compiles both frontend AND serverless functions into `.vercel/output/`
- The prebuilt deployment uses `.vercel/output` directory
- `vercel.json` provides SPA rewrite rules so client-side routes (`/discover`, `/recipe/:id`, etc.) serve `index.html` instead of 404
- `vercel.json` also configures security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) applied to all routes
- Build artifacts split into vendor chunks: `vendor-react` (47KB), `vendor-supabase` (171KB), `vendor-posthog` (175KB), `index` (321KB), `Analyze` (405KB). Gzipped total: ~290KB initial (reduced from ~400KB after removing ONNX Runtime Web)
- API routes in `/api/` are deployed as serverless functions (12 functions + 2 shared helpers: upload-audio, upload-preset, separate-stems, check-stems, create-checkout, create-portal, stripe-webhook, admin-stats, admin-actions, public-stats, instrument, send-feedback, plus _rateLimit.js and _validateEnv.js)
- GitHub Actions CI pipeline runs lint + test + build on every push/PR to main

## Platform Vision

**SoundSauce** - A community learning platform for music producers

### Core Value Proposition
"Hear a sound you like → learn how to make it yourself"

### Two-Sided Marketplace

**Learners (Beginners)**
- Upload audio, get Sound Sauces (step-by-step recreation guides)
- Learn using free tools (FL Studio stock plugins + Vital)
- Track progress, earn achievements
- Connect with mentors and other learners
- Join challenges, get feedback

**Teachers (Experienced Producers)**
- Create "Sound Breakdown" tutorials tied to specific analyses
- Record video/audio walkthroughs of recreating sounds
- Build reputation and following
- Earn revenue through:
  - Revenue share from platform subscriptions
  - Sell individual tutorials or courses
  - Paid 1:1 mentorship sessions

### Target Users
- **Primary:** Beginner FL Studio producer who hears sounds they like but doesn't know where to start
- **Secondary:** Experienced producers who want to teach and monetize their knowledge

### Revenue Model
- Freemium subscriptions (Free / Pro $10/mo)
- Teacher revenue share (% of subscription attributed to their content)
- Course sales (teachers set prices, platform takes %)
- Mentorship fees (hourly rates, platform takes %)

---

## UI Design System

### Navigation
- **Desktop:** Fixed left sidebar with icon + label navigation
- **Mobile:** Collapsible slide-in sidebar (swipe or hamburger to open)
- **Avoids:** Bottom tab bars (too monotonous/social media standard)

### Page Structure
```
/                 → Home (landing/feed — followed users' recipes or trending)
/analyze          → Analyzer tool (dedicated page with room to breathe)
/discover         → Browse Sound Sauces, search, filter, infinite scroll
/search           → Unified search (users + recipes), trending + recent suggestions
/profile          → User profile, avatar, stats, recent analyses, settings
/recipe/:id       → Sound Sauce detail + recreation upload + leaderboard
/user/:username   → Public user profile with published recipes
/settings         → Account settings, subscription billing, preferences
/notifications    → Notifications (filter tabs: All/Likes/Comments/Followers, grouped by time, mark as read, excludes message notifications)
/messages         → Direct messaging (authenticated only, master-detail layout). `handleSendMessage` wrapper calls `sendMessage` then `updateConversationPreview` to keep conversation list preview in sync. Follow-back from request banner triggers `handleFollowBack`: toggles follow → waits 500ms for DB trigger → refreshes conversations → optimistically sets `is_request` to false, promoting the conversation from Requests tab to Inbox
/challenges       → Weekly challenges (browse + create for Pro)
/challenge/:id    → Challenge detail + submission upload + leaderboard
/admin            → Admin dashboard (admin-only, Supabase + Stripe analytics)
/pricing          → Pricing comparison page (Free/Pro tiers)
/privacy          → Privacy policy page
/terms            → Terms of service page
*                 → 404 Not Found (catch-all)
```

### Color Scheme — Obsidian Ember
- **Dark mode:** True black with warm amber/gold accent
  - Background: #09090B (zinc-950)
  - Cards: #18181B (zinc-900)
  - Elevated: #27272A (zinc-800)
  - Borders: #3F3F46 (zinc-700)
  - Text: #FAFAFA / #A1A1AA / #71717A (zinc-50 / zinc-400 / zinc-500)
  - Accent: #F59E0B (ember-500, amber/gold)

- **Light mode:** Warm stone tones with amber accent
  - Background: #FAFAF9 (stone-50)
  - Cards: white with #E7E5E4 borders (stone-200)
  - Elevated: #F5F5F4 (stone-100)
  - Text: #1C1917 / #57534E / #A8A29E (stone-900 / stone-500 / stone-400)
  - Accent: #D97706 (ember-600)
  - Tags: bg-amber-50 with ember-700 text

### Home Page Layout
**Guest (not signed in):**
- Centered hero: pitch headline + "Try It Free" / "See It In Action" CTAs + trust line
- Inline demo results (shown after "See It In Action" click — pre-computed, no bundle cost)
- "How It Works" compact 3-step section (Upload → Get the breakdown → Recreate it)

**Authenticated:**
- Following section: horizontally scrollable row of followed users' profiles (avatar, username, bio) linking to `/user/:username`. Only visible when following at least one person. "Find people" link to Search page
- Activity feed: followed users' recipes for auth'd users, trending for guests
- Weekly challenge preview: featured active challenge card with countdown timer, submission count, link to `/challenge/:id`

### Component Library
- Sidebar navigation component
- Page layout wrapper
- Card components (Recipe card, User card, Challenge card)
- Consistent button styles across pages

---

## Platform Roadmap

### Phase 0: UI Restructure (COMPLETED)
Navigation shell and page structure

- [x] Install React Router
- [x] Create sidebar navigation component (`Sidebar.jsx`)
- [x] Create page layout wrapper (`PageLayout.jsx`)
- [x] Set up routes (Home, Analyze, Discover, Profile)
- [x] Move current analyzer to /analyze page (`Analyze.jsx`)
- [x] Create Home page with placeholder content (`Home.jsx`)
- [x] Create Discover page placeholder (`Discover.jsx`)
- [x] Create Profile page placeholder (`Profile.jsx`)
- [x] Implement mobile sidebar (slide-in with hamburger menu)
- [x] Update light mode with colorful theme (originally pink/orange, now Obsidian Ember amber/gold)

### Phase 1: Auth + Cloud (COMPLETED)
*The blocker. Everything depends on this.*

- [x] Supabase project setup (auth, DB, storage)
- [x] Email sign-in/sign-up with AuthModal
- [x] Google OAuth (fully functional — Google Cloud Console credentials + Supabase provider configured)
- [x] User profiles (username, avatar, bio, skill level, DAW preference)
- [x] Avatar upload (Canvas resize to 400x400, Supabase Storage)
- [x] Cloud analysis history (Supabase when signed in, localStorage fallback)
- [x] Migration helper for existing localStorage data (one-time on first sign-in)
- [x] Private/public toggle for analyses (Globe/Lock icons)
- [x] Auth state management (AuthContext + useAuth hook)
- [x] Profile page with real stats (total/public/private counts, recent analyses)
- [x] Removed mic recording from Analyze page (untested feature)
- [x] Add Supabase env vars to Vercel for production deployment

**Tech:** Supabase (Auth + PostgreSQL + Storage)

### Phase 2: Sharing + Discovery (COMPLETED)
*Create the content flywheel.*

- [x] Publish analyses as "Sound Sauces" (title, description, tags)
- [x] Browse/search/filter on Discover page (full-text search, tag filter, infinite scroll)
- [x] Likes + follows (optimistic UI, denormalized like_count with triggers)
- [x] Activity feed (followed users' recipes for auth'd, trending for guests)
- [x] User public profiles at `/user/:username` (avatar, bio, stats, recipes)
- [x] Recreation uploads with spectral match scoring (reuses existing `calculateSpectralMatch` via Web Worker)

**Tech:** Supabase (PostgreSQL with FTS, GIN indexes, RLS, triggers) + Vercel Blob (recreation audio uploads)

### Phase 3: Monetization + Engagement (COMPLETED)
*Get revenue flowing before building expensive features.*

**Monetization:**
- [x] Stripe subscription integration (Free / Pro $10 — simplified from original 3-tier Free/Pro $7/Premium $15)
- [x] Tier enforcement (analysis limits, stem separation limits, storage caps)
- [x] Usage tracking + limit display in UI
- [x] Billing management (upgrade/downgrade/cancel)

**Engagement:**
- [x] Comments on recipes + reply threads
- [x] Direct messaging between users (DM outside of post comments, enables DAW-based collaboration)
- [x] Weekly challenges (time-limited sound recreation contests)
- [x] Basic leaderboards
- [x] Achievement badges (first analysis, first recipe, streak milestones)

**Vital Preset Sharing:**
- [x] Improve Vital preset generator accuracy (waveform analysis, harmonic mapping, per-feature reliability, key transpose)
- [x] Attach generated .vital preset to published Sound Sauces (store in Vercel Blob)
- [x] Download preset button on Recipe detail pages
- [x] "Vital Preset included" badge on recipe cards
- [x] Standalone preset posting (post .vital presets directly without analyzing audio)
- [x] Download count tracking per recipe

### Launch Prep (COMPLETED)
*Get the app ready for marketing and first users.*

- [x] 404 Not Found page (catch-all route)
- [x] OG social sharing image (1200x630 branded PNG)
- [x] Privacy Policy page at `/privacy`
- [x] Terms of Service page at `/terms`
- [x] Sidebar legal footer links
- [x] Analyze page tooltips (11 new definitions, 7 feature labels wrapped)
- [x] Vital explainer + download link (3 locations)
- [x] web-vitals FID deprecation fix

### Phase 4A: Instrument Detection Overhaul (STABLE — 3 of 4 sub-phases complete)
*Make detection trustworthy, reliable, consistent, and accurate — stop the back-and-forth tuning.*

**Phase 4A-1: Better Feature Extraction (audio.worker.js)** (COMPLETED)
- [x] Temporal centroid — where the amplitude "center of gravity" sits (kick=10-20%, bass=30-50%)
- [x] Pitch envelope detection — track fundamental frequency across first 100ms (kick=pitch sweep, bass=stable pitch)
- [x] MFCCs (13 coefficients) — mel filterbank + DCT from existing FFT, the #1 feature for timbre discrimination. `computeMFCCs()` computes coefficients + spectral contrast; all 11 instrument scoring blocks now use MFCC features: mfccs[0] (energy density), mfccs[1] (spectral tilt — THE bass vs kick discriminator), |mfccs[2]| (spectral peakiness — pad vs lead discriminator), mfcc34variance (inharmonicity/formant indicator — guitar vs synth, vocal identification)
- [x] Spectral contrast — peak-vs-valley in spectrum, separates harmonic vs noise-based sounds
- [x] Rewrite `detectInstruments()` to use new features instead of raw band energies + ad-hoc scoring

**Phase 4A-2: ML Instrument Detection** (COMPLETED — replaced by server-side AI in Phase 4A-4)
- [x] ~~EfficientAT mn04 via ONNX Runtime Web~~ (removed — replaced by server-side AI detection)
- [x] Mapped instrument categories for ML detection
- [x] Deleted `mlInstrumentDetection.js` and `useMLDetection.js` (no longer needed)

**Phase 4A-3: Essentia.js + MTG-Jamendo Instrument Model (Gold Standard)**
- [ ] Add Essentia.js WASM core (~2MB) for research-grade feature extraction
- [ ] Load EffNet-Discogs embedding model (~18MB, lazy-loaded)
- [ ] Load MTG-Jamendo instrument classification head (~1-3MB, 40 instrument classes)
- [ ] 40 classes include pad, synthesizer, bass, drums, guitar as first-class categories
- [ ] Trained specifically on musical instruments (not general audio like YAMNet/AudioSet)

**Phase 4A-4: Server-Side AI Instrument Detection** (COMPLETED — CLAP replaced by Gemini 2.5 Flash)
- [x] ~~Deployed CLAP on Replicate via Cog~~ → Replaced with Google Gemini 2.5 Flash (synchronous, no model deployment needed)
- [x] Zero-shot classification with 18 text labels ("808 bass", "supersaw lead", "analog pad", etc.)
- [x] Synchronous flow: single POST request, results in ~2-5 seconds (was async polling ~10-15s with CLAP)
- [x] `AI_LABEL_MAP` in Analyze.jsx maps 18 text labels to app instrument categories
- [x] Removed `onnxruntime-web`, `mlInstrumentDetection.js`, `useMLDetection.js` — smaller frontend bundle
- [x] ~$0.001 per inference via Gemini (was ~$0.01-0.05 via Replicate)
- [x] Structured JSON output via `response_schema` — guaranteed valid JSON responses
- [x] Detection is active and enabled (was disabled when using CLAP due to Replicate E8765 errors)

**Research Findings (Feb 2026):**
| Model | Format | Classes | Size | mAP/Accuracy | Browser-Ready? |
|-------|--------|---------|------|-------------|----------------|
| ~~YAMNet (replaced)~~ | ~~TF.js~~ | ~~521 general audio~~ | ~~~1.1MB~~ | ~~~30 mAP~~ | ~~Yes~~ |
| ~~EfficientAT mn04 (replaced)~~ | ~~ONNX Runtime Web~~ | ~~527 audio events~~ | ~~4.1MB + 109KB runtime~~ | ~~43.2 mAP~~ | ~~Yes~~ |
| EfficientAT mn10 | PyTorch→ONNX | 527 audio events | ~19MB | ~46 mAP | Marginal |
| Essentia EffNet+Jamendo | TF.js/ONNX | 40 instruments | ~20MB total | ROC-AUC (research-grade) | Yes (lazy-load) |
| PANNs CNN14 | PyTorch | 527 audio events | ~300MB | 43.1 mAP | No (too large) |
| AST | PyTorch | 527 audio events | ~340MB | 48.5 mAP | No (too large) |
| ~~CLAP (replaced)~~ | ~~Replicate Cog (server-side)~~ | ~~Zero-shot (any text)~~ | ~~\~1.1GB~~ | ~~Best for instruments~~ | ~~Server-only~~ |
| Gemini 2.5 Flash (current) | Google AI API (server-side) | Zero-shot (any text) | Cloud API | Native audio understanding | Server-only |

**All 4 key heuristic features now implemented and integrated into scoring:**
1. **MFCCs** — 13 coefficients from mel filterbank + DCT. mfccs[0-2] used for energy/tilt/shape, mfcc34variance for inharmonicity. Integrated into all 11 instrument scoring blocks.
2. **Temporal centroid** — Where amplitude energy is concentrated (0-1 scale). Single best kick vs bass discriminator.
3. **Pitch envelope** — Fundamental frequency trajectory via autocorrelation. Kicks sweep, bass notes are stable.
4. **Spectral contrast** — Peak-to-valley ratio across mel bands. Separates harmonic (synth) from inharmonic (guitar) sounds.

### Phase 5: Design Overhaul + Marketing Readiness (PRE-LAUNCH)
*Make SoundSauce look professionally designed before marketing push. Leverage AI design tools (Nano Banana 2, 21st.dev Magic, UI UX Pro Max) for production-grade polish.*

**Phase 5A: Design System Foundation** (COMPLETED)
- [x] UI UX Pro Max audit — chose Obsidian Ember palette (true black + amber/gold accent)
- [x] Font pairing — Satoshi (display) + General Sans (body) + JetBrains Mono (code) loaded via Fontshare/Google Fonts
- [x] Color system foundation — CSS variables (`index.css`), Tailwind config (`ember`/`zinc` scales), `themeClasses` object rewritten
- [x] **Tailwind v4 @theme fix** — `tailwind.config.js` is NOT read by Tailwind v4. Custom ember colors and font families must be defined via `@theme` block in `src/index.css`. Without this, all `bg-ember-*`/`text-ember-*` classes render as transparent (invisible buttons). Fixed by adding `@theme { --color-ember-50 through --color-ember-900, --font-display, --font-sans, --font-mono }` to index.css.
- [x] Layout components updated — Sidebar.jsx (~40 color values), PageLayout.jsx (backgrounds + feedback button)
- [x] Full color sweep — replaced all ~730 hardcoded hex values across 52 files with Obsidian Ember Tailwind classes
- [x] macOS-style Dock navigation — `Dock.jsx` with `motion/react` icon magnification, glassmorphic background, cursor-tracking amber glow
- [x] HeroBackground — floating glassmorphic pill shapes with `motion/react` animations for landing page
- [x] Cursor-tracking amber glow on RecipeCards, polished upload drop zone, animated Pricing page
- [x] Design + security audit — 14 design issues + 23 code/security issues fixed (Gemini API key exposure, missing rate limits, CSP font-src, XSS in email, Sentry dynamic import, reduced motion support)
- [x] Button visibility verified in both dark and light mode across all pages
- [ ] Micro-interaction pass — add subtle transitions to tab switches, card hovers, like button animations, modal open/close (→ Phase 5B/5C with 21st.dev)

**Phase 5B: Landing Page Overhaul (Highest Marketing ROI)**
- [ ] AI-generated hero illustration via Nano Banana 2 — "waveform → synth preset" concept visual
- [ ] 21st.dev polished hero section component — animated, conversion-optimized
- [ ] 21st.dev animated stats counter component — social proof with number transitions
- [ ] AI-generated "How It Works" step illustrations (Upload, Analyze, Recreate)
- [ ] 21st.dev modern pricing table component — replace hand-built Pricing.jsx
- [ ] Testimonial/social proof section (prepare for early user quotes)
- [ ] Optimize above-the-fold for conversion — CTA hierarchy, visual weight, trust signals

**Phase 5C: Component Polish (Fix the "5/10 Polish" Score)**
- [ ] 21st.dev polished modal components — replace AuthModal, PublishModal, FeedbackModal, PresetPostModal
- [ ] 21st.dev modern card components — upgrade RecipeCard, ChallengeCard, preset cards
- [ ] 21st.dev sidebar navigation pattern — better animations, modern feel
- [ ] 21st.dev form components — upgrade Settings page, Onboarding flow
- [ ] 21st.dev toast/notification components — replace inline feedback messages
- [ ] Loading skeleton polish — consistent skeleton patterns across all pages
- [ ] Empty state illustrations via Nano Banana 2 — "no results", "no presets", "no followers"

**Phase 5D: Core Product UX (Analyze Page)** (COMPLETED)
- [x] FullMixGuidance CTA visual hierarchy (ember primary + outlined secondary)
- [x] Region indicator amber color (matches waveform loop overlay)
- [x] Waveform drag hint for first-time users (amber, disappears after interaction)
- [x] Preset match scores visibility (text-xs + ember tint ≥70%)
- [x] Tuning sliders collapsed by default with ChevronDown/Up toggle
- [x] Spectrum analyzer amber bars (ember accent color + opacity ramp)
- [x] Time display font-mono tabular-nums at consistent 14px
- [x] Keyboard shortcut badges (L for loop, Esc for clear, desktop only)
- Note: AI-generated illustrations (instrument categories, preset headers) and 21st.dev component upgrades (ResultsTabs, slider/knob) deferred — current implementations are functional and polished

**Phase 5E: Marketing Asset Generation + Distribution**
- [ ] Deploy latest site to production (vercel build --prod && vercel deploy --prebuilt --prod)
- [ ] Update OG image to Obsidian Ember palette (current og-image.png uses old pink/orange colors)
- [ ] Reddit marketing creatives — still images showing real analysis output, before/after workflow
- [ ] Instagram ad creatives (1080x1080 square + 1080x1920 story) — "Hear a sound → Learn to make it" messaging
- [ ] TikTok still image posts / carousels — sound design tips with SoundSauce branding
- [ ] AI-generated Product Hunt launch assets (gallery images, branded logo)
- [ ] Per-page OG images — Discover, Pricing, Challenges (currently one generic OG image)
- [ ] "App in action" product screenshot/mockup for marketing materials
- [ ] Logo/wordmark exploration — current favicon (SVG bars) is weak for marketing contexts
- [ ] Evaluate Okara AI CMO ($99/mo) — SEO/GEO agents for organic discovery (keep Reddit/HN agents OFF)

**Phase 5F: Mobile & Responsive Polish** (COMPLETED — core fixes shipped, remaining items deferred)
- [x] P0: AuthModal crash fix — `motion` import missing, blocked ALL sign-ins on mobile
- [x] Responsive Dock — 5 core icons on mobile (Home, Analyze, Discover, Search, Sign In/Avatar), overflow items (Messages, My Presets, Challenges, Settings, Admin) moved to avatar popover menu
- [x] Dock tooltip hover fix — `hidden md:block` prevents sticky CSS hover on touch devices
- [x] PresetSelector header wrap — `flex-wrap` layout, shortened button text on small screens
- [x] SaucyHelper hidden on mobile — `hidden md:block` prevents floating button overlap
- [x] Theme toggle on mobile — Sun/Moon toggle added to Dock avatar popover menu, threaded `onToggleTheme` prop through App → PageLayout → Dock
- [ ] Mobile waveform interaction improvements (pinch-to-zoom, scroll behavior) — deferred, functional as-is
- [ ] Touch interaction audit for remaining pages — deferred until user feedback warrants it

**Tools:**
- **Nano Banana 2 (mcp-image)** — AI image generation via Gemini for illustrations, marketing assets, OG images
- **21st.dev Magic** — Production-ready React component library for polished UI replacements
- **UI UX Pro Max Skill** — Design intelligence (67 styles, 96 palettes, 57 font pairings) for audits, reviews, and design decisions

### Phase 4B: Teaching Platform (MVP)
*Start lean, expand based on demand.*

- [ ] Teacher profiles (specialties, experience)
- [ ] Attach video/audio walkthrough to any Sound Sauce
- [ ] Teacher dashboard (basic analytics: views, likes, follower count)
- [ ] Student ratings/reviews on tutorials
- [ ] Pro gate: only Pro users can become teachers

### Deferred (add based on user demand)
- PWA (Progressive Web App) — manifest.json, service worker, home screen install. Adds "app on home screen" UX with no app store needed. Not worth it until there are ~100+ recurring users (retention optimization, not acquisition). Revisit when PostHog shows repeat visitors dropping off.
- Course builder (bundle tutorials into structured courses)
- 1:1 mentorship system + scheduling
- Teacher payouts + revenue share
- Collaboration features (shared projects, collab finder)
- Project files sharing
- Supabase Realtime (replace polling for notifications/messages)

---

## Subscription Tiers

| Feature | Free | Pro ($10/mo) |
|---------|------|-------------|
| Analyses/month | 10 | Unlimited |
| Stem separation | 2/month | Unlimited |
| Cloud storage | 20 analyses | Unlimited |
| Share recipes | 3/month | Unlimited |
| Weekly challenges | Participate | Participate + create |
| Become a teacher | No | Yes |

---

## Tech Stack (Current + Planned)

| Component | Current | Planned |
|-----------|---------|---------|
| Frontend | React 19 + Vite 7 | Same |
| Styling | Tailwind CSS 4 | Same |
| State | React hooks + Supabase client state | Same |
| Database | Supabase PostgreSQL + localStorage fallback | Same |
| Auth | Supabase Auth (email + Google OAuth, both fully functional) | Same |
| File Storage | Vercel Blob (audio) + Supabase Storage (avatars) | Same |
| Payments | Stripe (subscriptions, checkout, billing portal, webhooks) | Same |
| Analytics | PostHog (product analytics, web analytics, session replay) | Same |
| Testing | Vitest + Playwright + jest-axe (~115 tests) | Same |
| Real-time | None | Supabase Realtime |
| Serverless | Vercel Functions | Same |
| Instrument Detection | Gemini 2.5 Flash (Google AI, zero-shot) + heuristic scoring | Same |
| Feature Extraction | FFT bands + envelope + MFCCs + temporal centroid + pitch envelope + spectral contrast | Essentia.js additional features |
| AI Image Gen | Nano Banana 2 (MCP, Gemini-powered) | Illustrations, marketing assets, OG images |
| UI Components | 21st.dev Magic (MCP) | Component library for polished UI replacements |
| Design System | UI UX Pro Max (Claude Skill) | Design audits, palettes, font pairings, style guidance |

---

## AI Design Tooling (MCP Integrations)

Three MCP tools are available for design work and marketing asset generation:

### Nano Banana 2 (`mcp__mcp-image__generate_image`)
- **What**: AI image generation powered by Gemini
- **Use for**: Hero illustrations, instrument category artwork, empty state illustrations, achievement badge art, OG social images, marketing creatives (social media ads, Product Hunt assets), tutorial headers
- **Capabilities**: Aspect ratio control (1:1 to 21:9), resolution up to 4K, image-to-image variations, character consistency, world knowledge for realistic contexts
- **Quality tiers**: `fast` (drafts/iteration), `balanced` (moderate detail), `quality` (final deliverables)
- **Best practices**: Use `purpose` field for context-appropriate generation (e.g., "app hero illustration", "social media ad"). English prompts recommended for optimal results

### 21st.dev Magic (`mcp__magic__*`)
- **What**: Production-ready React component library with 4 tools
- **Tools**:
  - `21st_magic_component_builder` — Generate new UI components matching a search query
  - `21st_magic_component_inspiration` — Browse existing components for design ideas
  - `21st_magic_component_refiner` — Improve/redesign existing components
  - `logo_search` — Find company logos in JSX/TSX/SVG format
- **Use for**: Replacing hand-built modals, cards, navigation, forms, pricing tables, hero sections, toast notifications with polished production components
- **Integration**: Returns React component code snippets — must be edited into the codebase after generation

### UI UX Pro Max (Claude Skill)
- **What**: Design intelligence with comprehensive design knowledge
- **Capabilities**: 67 design styles, 96 color palettes, 57 font pairings, 25 chart types, 13 tech stacks
- **Use for**: Full design system audits, color palette refinement, typography selection, accessibility reviews, layout optimization, animation design, responsive design guidance
- **Actions**: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, check
- **Styles**: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, flat design
- **Auto-activates**: Triggers automatically on UI/UX design work

---

## Current Goals

### In Progress
- **Phase 5E: Marketing Asset Generation** — Creating marketing assets and launching distribution. Reddit → Instagram ads → TikTok. Still images first (easier to produce), video content later.

### Up Next (priority order)
1. [x] **Phase 5A: Design System Foundation** — Complete.
2. [x] **Phase 5B/5C: Component Polish** — Complete. Hero blur-in, RecipeCard parallax, modal transitions, Profile revamp, SoundCloud redesign.
3. [x] **Phase 5D: Core Product UX** — Complete. All 8 items shipped: FullMixGuidance CTA hierarchy, amber region indicator, waveform drag hint, preset match score visibility, collapsible tuning sliders, amber spectrum bars, mono time display, keyboard shortcut badges.
4. [ ] **Phase 5E: Marketing Asset Generation** — In progress. Reddit posts, Instagram ad creatives, OG image refresh
5. [x] **Phase 5F: Mobile & Responsive Polish** — Complete. P0 AuthModal crash fix, responsive Dock (5 icons mobile + popover overflow menu), tooltip hover fix, PresetSelector header wrap, SaucyHelper hidden on mobile, theme toggle in Dock menu. Deployed to production.

### Marketing Strategy (Phase 5E)
**Distribution channels (priority order):**
1. **Reddit** — Organic posts in r/edmproduction, r/synthesizers, r/musicproduction, r/vitalsynth. Show real value (demo analysis results, preset downloads). No astroturfing.
2. **Instagram** — Paid ad creatives (still images). Test with small budget to validate traffic generation.
3. **TikTok** — Still image posts initially (carousels/slideshows). Video content later if traction warrants it.
4. **Product Hunt** — Launch page with gallery images when ready for broader awareness.

**Tools under evaluation:**
- **Okara AI CMO** ($99/mo) — AI agent suite for SEO audits, GEO tracking (AI search visibility), Reddit/HN/X monitoring, content writing. Launched March 2026. SEO + GEO agents are low-risk and useful. Reddit/HN auto-comment agents are HIGH RISK for music production communities — those subreddits will detect and ban AI-generated self-promotion. Verdict: worth a 1-month trial for SEO/GEO insights, but keep community engagement manual.

### Post-Launch (prioritize based on user analytics)
- [ ] Phase 4A-3: Essentia.js + MTG-Jamendo instrument model (if detection accuracy needs improvement based on user feedback)
- [ ] Run `supabase/migrations/phase7a_indexes.sql` in Supabase SQL Editor (performance optimization for downloads + challenge leaderboards)
- [ ] Supabase Realtime for notifications/messages (replace polling — do when scale demands it)

### Known Issues
- ~53 ESLint issues (35 errors + 18 warnings): React 19 `set-state-in-effect` style preferences (functionally correct), test file unused vars, intentional exhaustive-deps suppressions, React compiler/refresh structural warnings. Zero production bugs.

### Completed
- [x] **Post Preset Fix + Dock Auto-Hide on Modal** (Mar 2026)
  - **P0 — PresetPostModal crash**: `motion` was used in JSX but only `AnimatePresence` was imported from `motion/react`. Clicking "Post Preset" on the Home page crashed the entire app via ErrorBoundary. Same bug pattern as the AuthModal crash fixed in Phase 5F. Fix: added `motion` to the import.
  - **P1 — Auth token validation in usePresetPost**: `getSession()` returns a cached token that may be expired, and the code silently fell back to sending unauthenticated requests (no Authorization header). Server returned 401 → generic "Failed to upload preset" error. Fix: throw clear error ("Your session has expired") when session token is missing, and always send the Authorization header.
  - **Dock auto-hide on modal open**: Dock covered the bottom of the PresetPostModal form. Added `dock-visibility` custom event system: any modal dispatches `new CustomEvent('dock-visibility', { detail: { hidden: true/false } })`. `PageLayout` listens and passes `hidden` prop to `Dock`. Dock's `<nav>` → `<motion.nav>` with spring slide-down animation (`y: 100, opacity: 0` when hidden). Reusable by any future modal.
  - **Deployed to production** via `vercel build --prod && vercel deploy --prebuilt --prod`.
  - Files modified: `src/components/recipe/PresetPostModal.jsx` (motion import, dock-visibility event), `src/hooks/usePresetPost.js` (session validation), `src/components/layout/Dock.jsx` (hidden prop, motion.nav animation), `src/components/layout/PageLayout.jsx` (dock-visibility listener, dockHidden state)
- [x] **Phase 5F: Mobile Responsive Polish + Production Deploy** (Mar 2026)
  - **P0 — AuthModal crash**: `motion` was used in JSX but only `AnimatePresence` was imported from `motion/react`. On mobile, the Dock Sign In button was the ONLY way to sign in, so this completely blocked authentication. Fix: added `motion` to the import statement.
  - **P1 — Dock responsive layout**: Auth'd users had 12+ icons crammed into 375px width. Split into core nav (5 icons: Home, Analyze, Discover, Search, Sign In/Avatar) shown on mobile, with remaining items (Messages, My Presets, Challenges, Settings, Admin) accessible through avatar popover menu via `hidden md:contents` / `md:hidden` responsive classes.
  - **P1 — Dock tooltips stuck on mobile**: CSS `group-hover:opacity-100` triggers on touch and stays visible. Fix: `hidden md:block` on tooltip divs.
  - **P1 — PresetSelector header overlap**: "Vital Presets" title + "Get Vital" link + "Download .vital" button competed for space on 375px. Fix: `flex-wrap` + `gap-2`, shortened button text on small screens via `hidden sm:inline` / `sm:hidden`.
  - **P1 — SaucyHelper floating button overlap**: Fix: `hidden md:block` on the fixed container.
  - **P2 — No theme toggle on mobile**: Theme toggle was only in Sidebar (hidden on mobile). Fix: Added Sun/Moon toggle to Dock avatar popover menu, threaded `onToggleTheme` prop from App.jsx → PageLayout → Dock.
  - **Deployed to production** via `vercel build --prod && vercel deploy --prebuilt --prod`.
  - Files modified: `src/components/auth/AuthModal.jsx` (motion import), `src/components/layout/Dock.jsx` (responsive icons, tooltips, popover menu items, theme toggle), `src/components/layout/PageLayout.jsx` (onToggleTheme prop), `src/App.jsx` (handleThemeToggle prop), `src/components/audio/PresetSelector.jsx` (wrapping header), `src/components/ui/SaucyHelper.jsx` (hidden on mobile)
- [x] **Launch Readiness Fixes (11 items)** (Mar 2026)
  - **Blockers (5)**: Terms of Service updated to current pricing (Free / Pro $10/mo, removed Premium references). Privacy Policy added Google AI (Gemini) and Resend as data processors. Fixed 4 broken dynamic Tailwind hover classes (`hover:${t.text}` → explicit theme conditionals) in Privacy.jsx, Terms.jsx, Admin.jsx, ChallengeDetail.jsx. Added user-facing error state on Pricing.jsx when `VITE_STRIPE_PRO_PRICE_ID` is missing (was silent failure). Removed stale "Premium" tier row from Admin dashboard subscription breakdown.
  - **Polish (5)**: Added `/pricing`, `/privacy`, `/terms` to sitemap.xml (5→8 routes). Added `<link rel="canonical">` to index.html for soundsauce.app. ErrorBoundary raw error message hidden behind "Show details" toggle. Updated stale "Pro/Premium" comment in Challenges.jsx. Confirmed "How It Works" guest section already renders (false alarm from audit).
  - Files modified: `src/pages/Terms.jsx`, `src/pages/Privacy.jsx`, `src/pages/Admin.jsx`, `src/pages/ChallengeDetail.jsx`, `src/pages/Pricing.jsx`, `src/pages/Challenges.jsx`, `src/utils/validateEnv.js`, `src/components/ui/ErrorBoundary.jsx`, `public/sitemap.xml`, `index.html`
- [x] **Codebase Audit: Security, Code Health, Accessibility (45 fixes)** (Mar 2026)
  - **Tier 1 — ESLint + Security Foundations**:
    - Rewrote `eslint.config.js` with separate environment blocks for browser (src/) and Node.js (api/) — fixed 99 false-positive errors from missing Node.js globals
    - SSRF protection on `api/instrument.js` and `api/separate-stems.js` — domain whitelist for Vercel Blob URLs
    - Email format validation in `api/send-feedback.js` with CRLF/null byte rejection
    - Fixed React 19 ref-during-render violations in `WaveformVisualizer.jsx`, `useMessages.js`, `useNotifications.js`
    - Removed ~431 lines of dead code from `useAudioProcessor.js` (4 sync analysis functions superseded by Web Worker)
    - Cleaned ~20 unused variable/import lint errors across production code
  - **P0 Security**:
    - `check-stems.js` — Added Supabase JWT auth + prediction ID format validation (prevents enumeration of other users' stem URLs)
    - `separate-stems.js` — Added Supabase JWT auth (prevents unauthenticated access to costly Replicate API)
    - `create-checkout.js` + `create-portal.js` — Origin header validated against allowlist (prevents open redirect via attacker-controlled Origin)
    - `useStemSeparation.js` — Frontend now sends auth tokens with stem API calls
  - **P0 Code Bugs**:
    - `useStemSeparation.js` — Safety timeout stored in ref, cleared on cancel/clear/unmount; added useEffect unmount cleanup for poll interval; `downloadStem`/`getStemAudio` use `stemAudioDataRef` instead of stale closure
    - `useConversations.js` — `markConversationRead` uses `conversationsRef` pattern instead of stale closure
  - **P0 Accessibility**:
    - Created shared `useFocusTrap.js` hook — traps Tab/Shift+Tab, auto-focuses first element, restores focus on close
    - 7 modals (AuthModal, FeedbackModal, OnboardingModal, PublishModal, PresetPostModal, UpgradePrompt, Dock menu) — added `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Escape handlers, focus trapping
    - ~33 form inputs across 8 files — added `htmlFor`/`id` pairs or `aria-label` for programmatic label association
    - 6 clickable divs (StemCard, drop zones, progress bars) — added `role="button"`/`role="progressbar"`, `tabIndex`, keyboard handlers, ARIA values
  - **P1 Security**:
    - `upload-preset.js` — Size check moved before `JSON.parse` (prevents OOM on oversized input)
    - `instrument.js` — Labels array validated (max 30 items, max 100 chars each)
    - `stripe-webhook.js` — Generic error message instead of leaking Stripe internals
    - `separate-stems.js` — Generic error message instead of leaking Replicate details
    - `admin-stats.js` — SQL wildcards (`%`, `_`) escaped in admin user search
    - `send-feedback.js` — CRLF + null byte + length check on email reply_to field
  - **P1 Code Health**:
    - `useFeed.js` — `setLoading(false)` added to all 5 abort paths (fixes stuck spinner)
    - `useNotifications.js` — `refreshProfile` stored in ref to prevent Realtime subscription churn
    - `useAudioWorker.js` — Removed dead `detectBPM`/`detectKey` exports
    - `useChallenges.js` — `fetchMore` uses `loadingRef` to stabilize reference
    - `useRecipes.js` — Search debounce now actually triggers fetch after 300ms
  - **P1 Accessibility**:
    - `role="alert"` on error/success messages in AuthModal, FeedbackModal, PresetPostModal, Settings
    - `aria-pressed` on LikeButton and FollowButton toggle buttons
    - `aria-label` on 6 icon-only buttons in CommentsSection
    - Dock user menu: `aria-expanded`, `aria-haspopup`, `role="menu"`/`role="menuitem"`, Escape handler
    - Fixed 3 broken dynamic Tailwind hover classes in OnboardingModal and Settings (replaced `hover:${var}` with explicit conditionals)
  - Files created: `src/hooks/useFocusTrap.js`
  - Files modified: `eslint.config.js`, `api/check-stems.js`, `api/separate-stems.js`, `api/create-checkout.js`, `api/create-portal.js`, `api/upload-preset.js`, `api/instrument.js`, `api/stripe-webhook.js`, `api/admin-stats.js`, `api/send-feedback.js`, `src/hooks/useStemSeparation.js`, `src/hooks/useConversations.js`, `src/hooks/useFeed.js`, `src/hooks/useNotifications.js`, `src/hooks/useAudioWorker.js`, `src/hooks/useChallenges.js`, `src/hooks/useRecipes.js`, `src/hooks/useAudioProcessor.js`, `src/hooks/index.js`, `src/components/auth/AuthModal.jsx`, `src/components/ui/FeedbackModal.jsx`, `src/components/ui/OnboardingModal.jsx`, `src/components/ui/UpgradePrompt.jsx`, `src/components/recipe/PublishModal.jsx`, `src/components/recipe/PresetPostModal.jsx`, `src/components/recipe/CommentsSection.jsx`, `src/components/recipe/LikeButton.jsx`, `src/components/recipe/FollowButton.jsx`, `src/components/audio/StemSelector.jsx`, `src/components/audio/PlaybackControls.jsx`, `src/components/audio/WaveformVisualizer.jsx`, `src/components/analysis/QuickCompare.jsx`, `src/components/messages/MessageInput.jsx`, `src/components/layout/Dock.jsx`, `src/components/ui/SoundCloudEmbed.jsx`, `src/pages/Notifications.jsx`, `src/pages/Pricing.jsx`, `src/pages/Messages.jsx`, `src/pages/Settings.jsx`, `src/workers/audio.worker.js`, `src/lib/posthog.js`, `src/lib/webVitals.js`, `src/main.jsx`, `src/data/flStudioPlugins.js`
- [x] **Profile Page Revamp + SoundCloud Player Redesign** (Mar 2026)
  - **Profile hero redesign**: Background visual with radial gradient dot grid pattern. Pro glow ring (amber gradient border) around avatar for Pro subscribers. Count-up animation on stats (analyses, public recipes, followers, following) using `requestAnimationFrame` with ease-out cubic easing. Stats row uses `font-mono tabular-nums` for aligned numeric displays.
  - **Tab consolidation (5 → 3 tabs)**: Sound Sauces (published recipes), Activity (Recent Analyses + Downloaded Presets combined), Badges (all badges with progress tracking). Cleaner information architecture — fewer tabs, more content per tab.
  - **Badge progress bars**: Added `BADGE_PROGRESS` mapping constant that maps badge types to Supabase count queries. 6 parallel COUNT queries fetch progress stats (`likesGiven`, `likesReceived`, `followers`, `recreations`, `comments`, `challengeSubmissions`). Progress bars show amber fill when earned, gray fill when in progress with "X/Y" count, "Locked" label for non-trackable badges (`high_match`, `challenge_winner`).
  - **Follower/following modal search**: Added search bar with client-side filtering by username/display_name/bio. Extracted `FollowListFiltered` component (was inline IIFE that broke Vite HMR's Babel parser).
  - **SoundCloud player redesign**: Complete rewrite of `SoundCloudEmbed.jsx`. Album art blurred background with glassmorphic overlay (`backdrop-filter: blur(32px)`). Larger vinyl record (40px → 56px) with conic gradient grooves, groove ring details, album art center label. Animated EQ bars — 5 amber bars with staggered CSS `eq-bounce` animation when playing. Ambient ember glow radiates from card edges when playing. Clickable progress bar with seek support (click to jump), scrubber dot on hover, gradient fill. Time display (current time and duration) in mono font. `rounded-2xl` corners matching Dock navigation style. Removed `username` prop (no longer needed). Better loading skeleton and error states.
  - Files modified: `src/pages/Profile.jsx` (hero redesign, tab consolidation, badge progress, follower search, stats animation), `src/components/ui/SoundCloudEmbed.jsx` (complete redesign), `src/pages/UserProfile.jsx` (removed username prop from SoundCloudEmbed), `src/index.css` (added eq-bounce keyframes)
- [x] **Phase 5A Fixes: Tailwind v4 @theme + Design/Security Audit** (Mar 2026)
  - **CRITICAL FIX — Invisible ember buttons**: Root cause discovered: Tailwind CSS v4 with `@tailwindcss/postcss` does NOT auto-load `tailwind.config.js`. Custom `ember` colors defined there were never applied to CSS output — all `bg-ember-500`, `text-ember-600`, etc. rendered as transparent. Default colors like `zinc` worked because they're built into Tailwind v4. Fix: Added `@theme` block in `src/index.css` with ember color scale (ember-50 through ember-900) and font family definitions (font-display, font-sans, font-mono). This is the Tailwind v4 way to define custom theme values. The `tailwind.config.js` file still exists but is NOT read by the build system.
  - **Design audit fixes (14 items from UI UX Pro Max review)**:
    - Home.jsx: Fixed subheading contrast (`text-white/40` → `text-zinc-400`), fixed trust line contrast (`text-zinc-600` → `text-zinc-500`), removed fake testimonials section (~70 lines including Quote icon import)
    - Analyze.jsx: Fixed broken dynamic Tailwind class at line 1506 (`hover:${t.text}` → explicit theme conditional), made error banner theme-aware, fixed no-op hover on "Analyze Full Track" button (`hover:bg-zinc-800` same as bg → `hover:bg-zinc-700`), fixed stem guidance icon blending (`bg-zinc-800` same as parent → `bg-zinc-700`), fixed RMS display format
    - Pricing.jsx: Subtitle text contrast improvements
  - **Security audit fixes (23 items)**:
    - `api/instrument.js`: Moved Gemini API key from URL query parameter to `x-goog-api-key` request header (was exposed in logs/URLs)
    - `api/check-stems.js`: Added missing rate limiting (`rateLimit(req, res, { limit: 60 })`)
    - `api/public-stats.js`: Fixed rateLimit call (was passing bare number instead of options object), fixed inverted validateServerEnv check (returned early when env vars WERE valid)
    - `api/send-feedback.js`: Added HTML entity escaping (`escapeHtml()`) to prevent XSS in email body for userName, userPage, userEmail fields
    - `src/lib/sentry.js`: Complete rewrite from static `import * as Sentry` to dynamic `import('@sentry/react')` pattern for ad-blocker resilience. Added exported `captureException()` wrapper
    - `src/components/ui/ErrorBoundary.jsx`: Updated to use new `captureException` import from sentry.js
    - `vercel.json`: Fixed CSP `font-src` directive — added `https://api.fontshare.com https://cdn.fontshare.com https://fonts.gstatic.com` (custom fonts were blocked in production)
    - `index.html`: Fixed stale theme-color meta tag (`#ff4d8d` old pink → `#09090B` zinc-950)
  - **Accessibility**: Added `prefers-reduced-motion: reduce` media query in `src/index.css` — disables all animations/transitions for users who prefer reduced motion. App uses `motion/react` extensively but had ZERO support for this before.
  - **Verified**: All buttons visible in both dark and light mode. Upload Audio button (ember-500/ember-600), Try Demo Sound (zinc-800/stone-100), all interactive elements across Analyze, Discover, Pricing, Home pages confirmed working.
  - Files modified: `src/index.css`, `vercel.json`, `src/pages/Analyze.jsx`, `src/pages/Home.jsx`, `api/public-stats.js`, `api/send-feedback.js`, `api/instrument.js`, `api/check-stems.js`, `src/lib/sentry.js`, `src/components/ui/ErrorBoundary.jsx`, `index.html`
- [x] **Phase 5A: Design System Foundation — Obsidian Ember** (Mar 2026)
  - **Problem**: App used two incompatible color systems — dark mode was monochrome Ableton-inspired (#0d0d0d/#1a1a1a/#333333) with orange accent (#ff764d), light mode was vibrant pink/orange (#ff4d8d/#ff6b35 gradients). Typography was default Tailwind system fonts. No cohesive design language. ~730 hardcoded hex color values across 52 files.
  - **Solution**: Unified both themes under "Obsidian Ember" palette with amber/gold accent. Added custom typography stack via Fontshare + Google Fonts. Complete color sweep replaced all hardcoded hex values with Tailwind classes. Added motion/react animations for navigation and landing page.
  - **Palette**: Dark: true black #09090B (zinc-950) bg, #18181B/#27272A surfaces, #3F3F46 borders, #F59E0B amber accent. Light: warm stone #FAFAF9 bg, white cards, #E7E5E4 borders, #D97706 amber accent.
  - **Typography**: Satoshi (display/headings), General Sans (body/UI), JetBrains Mono (code/data), DM Sans (fallback). Loaded via `<link>` tags in index.html.
  - **Color sweep mapping**: `#0d0d0d`→zinc-950, `#1a1a1a`→zinc-900, `#333333`→zinc-800, `#444444`→zinc-700, `#666666`→zinc-500, `#999999`→zinc-400, `#e0e0e0`→stone-200, `#f5f5f5`/`#f0f0f0`→stone-100, `#ff4d8d`→ember-500/ember-600, `#ff6b35`→ember-600, `#ff764d`→ember-500. Canvas inline hex equivalents: zinc-950=#09090B, zinc-900=#18181B, zinc-800=#27272A, zinc-600=#52525B, zinc-500=#71717A, zinc-400=#A1A1AA, ember-500=#F59E0B, ember-600=#D97706.
  - **New components**: `Dock.jsx` — macOS-style dock navigation with `motion/react` icon magnification (1→1.4 scale), glassmorphic background (`backdrop-blur-xl bg-zinc-900/60`), cursor-tracking amber glow via radial gradient. `HeroBackground.jsx` — floating glassmorphic pill shapes with `motion/react` infinite loop animations for landing page ambient decoration.
  - **UI polish**: Cursor-tracking amber glow on RecipeCards (radial gradient follows mouse position), polished AudioUploadSection drop zone (border animation, icon scaling), animated Pricing page with staggered card reveals.
  - **Files modified (foundation)**: `src/index.css` (CSS variables rewritten), `tailwind.config.js` (ember/zinc color scales + font families), `src/utils/constants.js` (themeClasses object rewritten — propagates to ~70% of components), `src/components/layout/Sidebar.jsx` (~40 hardcoded colors replaced), `src/components/layout/PageLayout.jsx` (backgrounds + feedback button), `index.html` (font loading links)
  - **Files modified (color sweep)**: All 52 component files with hardcoded hex values replaced — including Home.jsx, AuthModal.jsx, Discover.jsx, Pricing.jsx, SoundRecipe.jsx (26 occurrences), WaveformVisualizer.jsx (Canvas colors), HistoryPanel.jsx, AnalyzeSection.jsx, ExportToolbar.jsx, InstrumentSelector.jsx, PresetSelector.jsx, PlaybackControls.jsx, SpectrumAnalyzer.jsx, StemSelector.jsx, ADSREnvelope.jsx, ComparisonPanel.jsx, RecipeCard.jsx, RecipeDetail.jsx, Profile.jsx, UserProfile.jsx, Settings.jsx, Admin.jsx, and more
  - **Files created**: `src/components/layout/Dock.jsx`, `src/components/ui/HeroBackground.jsx`
- [x] **Ableton-First Default Experience** (Feb 2026)
  - **Problem**: Default DAW fallback was FL Studio, but the target audience is the Ableton/EDM/house music community. Users who skipped onboarding got FL Studio-flavored content (Sytrus, 3xOsc suggestions).
  - **Solution**: Shifted the entire default experience to Ableton Live across 6 files:
    - Changed default DAW fallback from `'FL Studio'` to `'Ableton Live'` in `recommendations.js`, `SoundRecipe.jsx`, `dawPlugins.js`, and `ResultsTabs.jsx`
    - Pre-selected "Ableton Live" in OnboardingModal DAW dropdown (was blank placeholder)
    - Reordered DAW_OPTIONS in both OnboardingModal and Settings page to list Ableton Live first
    - Removed empty "Select your DAW" placeholder from OnboardingModal (Ableton pre-selected, zero effort for target audience)
    - Tab label now shows "Ableton Live Recipe" by default instead of generic "DAW" when no preference set
  - Users who prefer other DAWs can still change it during onboarding or in Settings — the full DAW list remains available.
  - All 104 tests pass, build succeeds.
  - Files modified: `src/utils/recommendations.js`, `src/components/analysis/SoundRecipe.jsx`, `src/data/dawPlugins.js`, `src/components/analysis/ResultsTabs.jsx`, `src/components/ui/OnboardingModal.jsx`, `src/pages/Settings.jsx`
- [x] **Collapsible Analysis Sections on Recipe Detail Pages** (Feb 2026)
  - **Problem**: Sound Sauce detail pages (e.g., `/recipe/:id` for OB-XD Brass) required excessive scrolling through 4 full-height analysis cards before reaching comments at the bottom. Made the page feel endlessly long and buried social/interactive content.
  - **Solution**: Converted the 4 analysis content cards into collapsible sections using a local `CollapsibleSection` component. All sections collapsed by default, bringing comments much closer to the top without any reordering.
  - **CollapsibleSection component**: Local component in RecipeDetail.jsx with `useState` toggle, clickable header row (icon + title + chevron), `rotate-180` CSS transition on ChevronDown icon, conditional content rendering. Accepts `defaultOpen` prop (all default to false).
  - **Sections made collapsible**: Sound Sauce (synth type recommendations), Analysis Details (BPM, Key, Brightness, etc.), Detected Instruments, Mix Tips. Header card (title, author, tags, preset download, Vital explainer) remains fully visible and non-collapsible.
  - All 104 tests pass, build succeeds, deployed to production.
  - Files modified: `src/components/recipe/RecipeDetail.jsx` (added ChevronDown import, CollapsibleSection component, converted 4 analysis sections)
- [x] **Browser UX Audit Fixes: 7 Improvements** (Feb 2026)
  - **Context**: A browser-based UX audit agent navigated the live site, tested all major flows, and provided brutally honest feedback (Visual Design 7/10, UX Flow 6/10, Feature Completeness 8/10, Polish 5/10). All findings were fixed in a single batch.
  - **Fix 1 — BPM tempo labels wrong**: 94 BPM was labeled "slow" due to incorrect thresholds. Fixed in `audio.worker.js`: <90="slow", <120="moderate", <150="upbeat", <180="fast", else "very fast".
  - **Fix 2 — Texture/Harmonicity contradictory recommendation**: Low harmonicity said "blend with noise" which contradicted its own label. Rewrote: low → "Noise-heavy — try noise oscillator, FM, or granular synthesis", mid → "Some inharmonic content — try FM or wavetable synthesis", high → "Clean pitched sound — use Saw/Square oscillators". Badge labels: "Noisy"→"Inharmonic", "Mixed"→"Complex".
  - **Fix 3 — Auto-scroll to demo results**: Added `demoResultsRef` and `scrollIntoView({ behavior: 'smooth', block: 'center' })` after "See It In Action" reveals demo results on homepage. Users no longer miss the demo output.
  - **Fix 4 — Enriched guest homepage**: Added "Featured Sound Sauces" section for guests — fetches top 6 public analyses by `like_count DESC` from Supabase, displays 3-column card grid with title, preset badge, description, author avatar/name, instrument, like count. Gives guests immediate content to browse.
  - **Fix 5 — Hide stem separation for short audio**: Wrapped StemSelector in `{!isShortAudio && (...)}` condition. Audio ≤15s no longer shows the irrelevant "Separate Stems" UI. AnalyzeSection still shown.
  - **Fix 6 — Search placeholder branding**: Changed "Search recipes by title or description..." to "Search Sound Sauces by title or description..." in Discover.jsx.
  - **Fix 7 — DAW tab label for guests**: Changed fallback from `'FL Studio'` to `'DAW'` in ResultsTabs.jsx. Guests with no DAW preference now see "DAW Recipe" instead of "FL Studio Recipe".
  - All 104 tests pass, build succeeds, deployed to production.
  - Files modified: `src/workers/audio.worker.js` (BPM thresholds), `src/pages/Analyze.jsx` (texture recommendations, hide StemSelector), `src/pages/Discover.jsx` (search placeholder), `src/components/analysis/ResultsTabs.jsx` (DAW fallback label), `src/pages/Home.jsx` (auto-scroll, featured Sound Sauces, branding fix)
- [x] **UX Audit Fixes: Dead Code, Stale Closures, Accessibility, Display Formatting** (Feb 2026)
  - **Problem**: Code-based UX audit identified 18 issues across PresetSelector, ResultsTabs, and Analyze.jsx. Ranked P0 (bugs) through P3 (code quality) — prioritized critical bugs and user-facing UX issues.
  - **P0 — Dead showVitalTip code**: State (`showVitalTip`, `vitalTipTimerRef`) and 6 references (cleanup effect, handleSelectPreset, executeDownload timer) remained after JSX rendering was deleted in a previous session. Caused unnecessary re-renders. Removed all dead code entirely.
  - **P0 — handlePlayPreview stale closure**: `previewingId` in useCallback deps caused callback recreation every play/stop and potential race condition where audio plays but icon doesn't update. Fixed with `previewingIdRef` synced via useEffect (same pattern as `useLikes`/`useFollows`), reading from ref instead of state in callback, removing `previewingId` from dependency array.
  - **P1 — Preview play button too small**: Increased touch target from ~28px (`p-1.5` + `w-4 h-4`) to ~44px (`p-2.5` + `w-5 h-5`) per WCAG minimum. Replaced `VolumeX` icon (communicates "muted") with `Square` (standard "stop" icon). Added `Loader2` spinner with `animate-spin` for loading state, replacing invisible `animate-pulse` on text color.
  - **P1 — ResultsTabs mobile labels**: Replaced `.split(' ')[0]` (produced gibberish for "FL Studio" → "FL", "Pro Tools" → "Pro") with explicit `shortLabel` property per tab ("Vital", "Recipe", "Analysis"). Added full ARIA tab pattern: `role="tablist"`, `role="tab"` with `aria-selected`/`aria-controls`/`id`, `role="tabpanel"` with `id`/`aria-labelledby`. Fixed variable shadowing: `tabs.find(t => ...)` using `t` (same name as theme classes) → extracted to `activeTabObj`.
  - **P1 — Raw RMS float display**: RMS value was shown as raw float (e.g., `0.2834567`). Converted to dBFS format: `(20 * Math.log10(rmsVal)).toFixed(1)` with "dBFS" unit label. Also extracted all repeated `parseFloat()` calls (brightness, centroid, harmonicity, rms — 16 calls total) to pre-parsed variables with shared CSS class variables for the 4-card grid.
  - All 104 tests pass, build succeeds, no new lint errors.
  - Files modified: `src/components/audio/PresetSelector.jsx` (dead code removal, ref pattern, button size/icons), `src/components/analysis/ResultsTabs.jsx` (shortLabel, ARIA, variable shadowing), `src/pages/Analyze.jsx` (RMS dBFS format, parseFloat extraction, shared card classes)
- [x] **Analyzer UX Improvements: Enriched Analysis, QuickCompare, Preset Preview, Polish** (Feb 2026)
  - **Problem**: Multiple UX friction points identified during browser audit: (1) Full Analysis tab was nearly empty — only 4 basic FeatureCards while BPM, Key, ADSR, Waveform Type data was computed but hidden. (2) Tab bar scrolled out of view. (3) No guidance after analysis. (4) No way to test recreations without auth/publishing. (5) Users picked from 40 presets with only text descriptions, no audio preview. (6) Frequency distribution bars nearly invisible.
  - **Phase 1A — Sticky tab bar**: Added `sticky top-0 z-10` to ResultsTabs tab navigation. Updated tab descriptions to be contextual guidance (e.g., "Pick a preset that matches your sound, then fine-tune with the sliders below").
  - **Phase 1B — Enriched Full Analysis tab**: Added BPM card (value + confidence badge + half/double tempo pills + Camelot code), Key card (key name + mode + scale notes + compatible keys list), Waveform Type card (type + confidence % + fundamental freq + synth recommendation), ADSR Envelope (reused existing `<ADSREnvelope>` component). Original 4 FeatureCards kept in responsive grid.
  - **Phase 1C — Post-analysis Next Steps CTA**: Gradient banner after ResultsTabs with 3 action chips: "Try recreating this sound" (scrolls to QuickCompare), "Browse similar Sound Sauces" (links to `/discover?tag={instrument}`), "Download the preset" (scrolls to Vital tab). Styled as soft gradient card with Compass icon.
  - **Phase 2 — QuickCompare component**: New `src/components/analysis/QuickCompare.jsx`. Client-side recreation comparison — upload file → decode both AudioBuffers via temporary AudioContext → Web Worker `calculateSpectralMatch()` → display `RecreationResult`. No auth required, no Supabase, no Vercel Blob uploads. Collapsible section (collapsed by default), drag-and-drop + click-to-browse, file type validation (WAV/MP3/M4A), loading states (decoding/comparing), error handling, reset button.
  - **Phase 3 — Preset audio preview**: Added `generatePresetPreview(presetId, duration)` to `demoSoundGenerator.js`. Uses OfflineAudioContext to render a 2-second audio approximation mapping Vital settings to Web Audio nodes: `waveFrameToOscType()` (0-10=sine, 11-48=triangle, 49-80=saw, 81+=square), `vitalCutoffToHz()` (MIDI-like to Hz), ADSR envelope, filter with resonance, second oscillator with transpose, unison voices with detune spread. Category-appropriate note frequency (bass=C2, lead=E4, pad=C3, etc.). In PresetSelector: Volume2 play button on each preset card, single AudioContext for playback, decoded AudioBuffer cache in ref map, `previewingId` state, pulsing CSS animation on active button, auto-stop on preset select/category change. Dynamic import of `demoSoundGenerator.js` for code-splitting.
  - **Phase 4 — Polish**: Frequency distribution bars in InstrumentSelector: container height increased from `h-8` to `h-12`, minimum bar height raised from 4% to 10% with `minHeight: 4px` for non-zero values, added `rounded-sm` styling.
  - Files created: `src/components/analysis/QuickCompare.jsx`
  - Files modified: `src/components/analysis/ResultsTabs.jsx` (sticky + descriptions), `src/pages/Analyze.jsx` (enriched Full Analysis tab, Next Steps CTA, QuickCompare integration), `src/components/analysis/index.js` (QuickCompare export), `src/utils/demoSoundGenerator.js` (generatePresetPreview + helpers), `src/components/audio/PresetSelector.jsx` (preview playback UI/handlers), `src/components/audio/InstrumentSelector.jsx` (frequency bar improvements), `src/index.css` (preset-preview-pulse animation)
- [x] **Analyzer Fine-Tuning: Preset Recommendations, DAW Recipe Simplification, Seed Presets** (Feb 2026)
  - **Problem**: The analyzer detected instruments but didn't bridge to specific presets — a beginner saw 7 bass presets with no guidance on which to choose. The DAW recipe tab showed 6 generic synthesis steps without explaining WHERE controls are in the DAW. The 25 seed Sound Sauces had no .vital preset files attached.
  - **Phase 1 — Analysis-Based Preset Recommendations**: Added `featureProfile` metadata (brightness, waveformTypes, attack, spectralCentroid, sustain, filterCutoff, hasChorus ranges with weights) to all 40 `CURATED_PRESETS`. Created `scorePresetMatch(preset, features)` weighted scoring function (78pts across 7 dimensions with linear falloff). PresetSelector now sorts presets by match score when analysis features are available, auto-selects best match (score >= 40%) on mount via `useMemo` initial state, shows gradient "Best Match X%" badge on top preset and subtle score on others.
  - **Phase 2 — DAW Recipe Simplification**: Created `getDAWIntegrationTips(daw, soundType)` in `dawPlugins.js` returning 3-4 concise tips per DAW (load preset, effects chain, mixing tip, layering). Restructured SoundRecipe.jsx DAW tab: VitalBridgeCard at top pointing to Vital Preset tab, numbered integration tips as primary content, original 6-step synthesis recipe moved to collapsible "Alternative: Build from scratch" section.
  - **Phase 3 — Seed Sound Sauce Preset Downloads**: Created `SEED_PRESET_MAP` (25 entries mapping seed titles to curated preset IDs) and `findCuratedPresetForRecipe(recipe)` with title map → instrument → category → best-scoring fallback chain. RecipeDetail.jsx shows download button when `findCuratedPresetForRecipe()` finds a match — builds preset client-side via `buildVitalPreset()` (no server/DB changes needed). Button shows preset name: "Vital Preset (808 Bass)".
  - Files modified: `src/data/vitalPresets.js` (featureProfile on 40 presets, scorePresetMatch, scoreRange, SEED_PRESET_MAP, findCuratedPresetForRecipe), `src/components/audio/PresetSelector.jsx` (scored sorting, auto-select, Best Match badge), `src/pages/Analyze.jsx` (analysisFeatures prop), `src/data/dawPlugins.js` (getDAWIntegrationTips), `src/components/analysis/SoundRecipe.jsx` (VitalBridgeCard, integration tips, collapsible scratch section), `src/components/recipe/RecipeDetail.jsx` (fallback preset lookup + client-side download)
- [x] **Resume Analysis Sessions + Sidebar Recent Enhancement** (Feb 2026)
  - **Problem**: Users had to re-upload audio and re-separate stems every time they returned to a previous analysis. No way to pick up where you left off.
  - **Solution**: Full session restore via URL params (`/analyze?id=xxx`). `loadAnalysis(analysisId)` fetches the complete analysis row from Supabase, restores analysis results/metadata, fetches audio ArrayBuffer from Vercel Blob URL (persists indefinitely), and restores stem cards via `restoreStems()`. Replicate CDN stem URLs expire after ~7 days — graceful "expired" status with re-separate banner.
  - **Session restore flow**: `useSearchParams` reads `?id=` param → `loadAnalysis` fetches row + audio + stems → clears param after load. Effect depends on `searchParams` (not mount-only) so clicking different recent items while already on `/analyze` works correctly. `lastLoadedIdRef` guard prevents double-loading.
  - **useStemSeparation additions**: `blobUrl` state persists Vercel Blob upload URL. `restoreStems(savedStems, savedBlobUrl)` sets stem state from saved URLs without re-running separation. Expired URL detection (403/404 from Replicate CDN) → `status='expired'` with informative banner and "Re-separate" button.
  - **useHistory additions**: `toSupabaseRow()`/`fromSupabaseRow()` now serialize `audioUrl`, `audioFilename`, `stemUrls` for persistence.
  - **Sidebar Recent sub-tab**: Fetches 5 recent items (up from 3) with `audio_url, stem_urls` columns. Shows stem type indicator (Music icon + name), instrument label, relative time, and scissors icon when stems are available. Clicking items navigates to `/analyze?id=xxx` for full session restore — works both on initial navigation and while already on the Analyze page.
  - **Home page**: "Pick up where you left off" items link to `/analyze?id=xxx` for cloud items.
  - **StemSelector**: Expired stems banner with warning styling and "Re-separate" button.
  - **DB migration**: `phase7b_resume_analysis.sql` adds `stem_urls` JSONB column to `analyses` table.
  - Files created: `supabase/migrations/phase7b_resume_analysis.sql`
  - Files modified: `src/hooks/useStemSeparation.js` (blobUrl, restoreStems, expired detection), `src/hooks/useHistory.js` (audio/stem URL serialization), `src/pages/Analyze.jsx` (loadAnalysis, searchParams effect, session loading UI), `src/pages/Home.jsx` (resume links), `src/components/layout/Sidebar.jsx` (enhanced recent sub-tab with stem info + clickable restore), `src/components/audio/StemSelector.jsx` (expired banner)
- [x] **Gemini AI Instrument Detection (Replace CLAP)** (Feb 2026)
  - **Problem**: CLAP deployment on Replicate via custom Cog package was unreliable (E8765 errors). The async polling architecture (upload → start prediction → poll every 2s → get results) added complexity and 10-15 second latency.
  - **Solution**: Replaced with Google Gemini 2.5 Flash via direct API call. Synchronous — single POST to `/api/instrument` fetches audio from Vercel Blob, sends inline (base64) to Gemini with 18 text labels + structured JSON schema, returns results directly in ~2-5 seconds.
  - **Frontend simplification**: Removed polling loop (`clapPollRef`, `setInterval`, `pollForResults`). `runAIDetection` is now ~60 lines vs ~150 for `runClapDetection`. Abort ref pattern preserved for stale request cancellation.
  - **Cost**: ~$0.001 per classification (10-50x cheaper than CLAP on Replicate). Free tier: 250 requests/day.
  - **Accuracy**: Gemini natively understands audio and music instruments. Zero-shot classification with same 18 text labels. Structured JSON output guaranteed via `response_schema`.
  - Files modified: `api/instrument.js` (complete rewrite — Replicate → Gemini), `src/pages/Analyze.jsx` (runClapDetection → runAIDetection, removed polling, re-enabled detection), `src/components/audio/InstrumentSelector.jsx` (clapStatus → aiDetectionStatus)
  - Env vars: Removed `CLAP_MODEL_VERSION`, added `GEMINI_API_KEY`
- [x] **Home Page Simplification + Full-Mix Detection Fix** (Feb 2026)
  - **Problem 1 (Home page)**: Guest landing page had 8 sections (stats bar, two-column hero with preview card, demo results, How It Works cards, category pills, challenge teaser, Featured Sound Sauces grid, bottom CTA) — overwhelming for first-time visitors with too much visual noise.
  - **Solution**: Streamlined to 3 focused sections. Centered hero (no preview card), inline demo results, compact "How It Works" (inline number+text format instead of large cards). Removed: social proof stats bar, static 808 Bass preview card, category browsing pills, weekly challenge teaser, Featured Sound Sauces grid (often empty), bottom CTA banner. Removed `useChallenges` import and platform stats API call from guest flow.
  - **Problem 2 (Detection)**: Demo synth chord (3-second Cm7 sawtooth) was being flagged as "full mix", destroying trust in the analyzer for first-time users.
  - **Solution**: Three-layer fix: (1) Worker duration guard — audio ≤10 seconds is NEVER flagged as full mix. (2) Entropy method harmonic guard — if top 3 scoring instruments are all harmonic/pitched types (pad, lead, bass, etc.), entropy method skips full-mix flag (Methods 2 and 3 already had this guard). (3) Frontend duration guard — `shouldShowMixGuidance` now requires `isLongAudio` (>10s) for ANY mix guidance to show.
  - Files modified: `src/pages/Home.jsx` (major guest section rewrite, removed 5 sections + unused imports), `src/workers/audio.worker.js` (duration guard + entropy harmonic guard), `src/pages/Analyze.jsx` (frontend duration guard on shouldShowMixGuidance)
- [x] **Vital Preset Filename Cleanup + Feedback Widget + Function Consolidation** (Feb 2026)
  - **Preset naming**: Added `sanitizeFilename()` and `buildPresetFilename()` to `vitalPresetGenerator.js`. Presets now download as clean names like "SoundSauce - My Song (Bass - Sub Bass).vital" instead of "warm_pad_1707816234567.vital". Metadata inside Vital (preset_name, author, comments) is also populated. Updated all 8 download locations (PresetSelector, MyPresets 2 tabs, Profile 2 sections, RecipeDetail, PublishModal). `downloadRemotePreset()` accepts `patchMeta` parameter to patch community preset metadata.
  - **Feedback widget**: Created `FeedbackModal` component (Bug/Feature/General types, message textarea, optional email for guests, success state). Created `/api/send-feedback.js` serverless function using Resend HTTP API to send formatted HTML emails to soundsauceapp@gmail.com (rate limited 3/min). Added `trackFeedbackSubmitted` and `trackFeedbackOpened` PostHog helpers. Floating feedback pill button (MessageCircle icon) fixed to bottom-right of every page via `PageLayout.jsx`. Also accessible from sidebar footer.
  - **Function consolidation**: Merged `api/detect-instrument.js` + `api/check-instrument.js` into single `api/instrument.js` with POST/GET method routing to stay within Vercel Hobby 12-function limit after adding `send-feedback.js`.
  - Files created: `src/components/ui/FeedbackModal.jsx`, `api/send-feedback.js`, `api/instrument.js`
  - Files deleted: `api/detect-instrument.js`, `api/check-instrument.js`
  - Files modified: `src/services/vitalPresetGenerator.js`, `src/components/audio/PresetSelector.jsx`, `src/pages/MyPresets.jsx`, `src/pages/Profile.jsx`, `src/components/recipe/RecipeDetail.jsx`, `src/components/recipe/PublishModal.jsx`, `src/components/ui/index.js`, `src/lib/posthog.js`, `src/components/layout/Sidebar.jsx`, `src/components/layout/PageLayout.jsx`, `src/pages/Analyze.jsx`
- [x] **Polish Batch: 7 Improvements** (Feb 2026)
  - **VitalGuide bug fix**: `SoundRecipe.jsx` read `features.waveformType` but worker returns `features.waveform`. Fixed 3 property paths. VitalGuide now generates 8-15+ dynamic tips instead of 4 generic ones.
  - **Copy button fix**: Moved feedback from invisible top-of-page toast to inline "Copied!" text next to the button in `ExportToolbar.jsx`. Removed `exportSuccess` state from `Analyze.jsx`.
  - **Removed frequency distribution sections**: Removed Waveform Detection + Harmonic Profile bars + Filter Envelope visualization from Full Analysis tab. Kept 4 FeatureCards (Tone, Frequency Center, Texture, Level).
  - **My Presets tabs**: Added "Starter Presets" / "My Collection" tab toggle to `MyPresets.jsx`. Starter tab shows 40 curated presets with category pills. Collection tab shows downloaded curated presets + community presets separately.
  - **Supabase Realtime**: Replaced `setInterval` polling in `useMessages.js` (was 4s) and `useNotifications.js` (was 30s) with `supabase.channel().on('postgres_changes')` subscriptions. Automatic polling fallback on `CHANNEL_ERROR`/`TIMED_OUT`.
  - **Bundle size reduction**: Lazy-loaded `vitalPresetGenerator.js` (174KB / 102KB gzip) via dynamic `import()` in 5 files (PresetSelector, RecipeDetail, PublishModal, Profile, MyPresets). Now loads on-demand when user first downloads a preset instead of being in the initial bundle.
  - **Database indexes**: Created `phase7a_indexes.sql` with 2 indexes: `downloads(user_id, analysis_id)` for dedup checks, `challenge_submissions(challenge_id, match_score DESC)` for leaderboard queries.
  - Files modified: `SoundRecipe.jsx`, `ExportToolbar.jsx`, `Analyze.jsx`, `MyPresets.jsx`, `useMessages.js`, `useNotifications.js`, `PresetSelector.jsx`, `RecipeDetail.jsx`, `PublishModal.jsx`, `Profile.jsx`
  - Files created: `supabase/migrations/phase7a_indexes.sql`
- [x] **Admin Dashboard Expansion** (Feb 2026)
  - **Problem**: Admin page was a basic stats overview with no actionable capabilities — couldn't manage users, moderate content, or view engagement metrics.
  - **Solution**: Expanded into a full 3-tab admin panel (Overview / Users / Content) with time range filtering and admin actions.
  - **Overview tab**: Existing stats (unchanged functionality) — user counts, subscription breakdown, content stats, Stripe MRR, recent signups, top content.
  - **Users tab**: Engagement metrics (DAU/WAU/MAU computed from activity across analyses/comments/likes/recreations tables), signup growth chart (horizontal bars), onboarding completion rate, free→pro conversion rate. User search by username with expandable rows showing per-user stats (total analyses, public recipes, likes received, last activity) and tier change dropdown.
  - **Content tab**: Recent public content list with Unpublish action, recent comments list with Delete action. Both sections collapsible via ChevronUp/ChevronDown toggle.
  - **Time range filter**: Preset buttons (7d / 30d / 90d / All) on Users tab, filtering engagement and growth metrics.
  - **Admin actions API**: New `api/admin-actions.js` POST endpoint with double-layer auth. Three actions: `changeTier` (update subscription_tier), `unpublish` (set is_public=false), `deleteComment` (delete from comments). Optimistic UI updates on success, `window.confirm()` for destructive actions.
  - **SQL function**: `get_active_users_by_day(cutoff_date)` — UNION of activity across analyses, comments, likes, recreations tables, grouped by date, SECURITY DEFINER.
  - **Patterns used**: Tab navigation from Notifications.jsx, expandable rows from ConversationList.jsx, debounced search from UserSearch.jsx, horizontal bar charts via pure CSS/Tailwind.
  - Files created: `api/admin-actions.js`, SQL function `get_active_users_by_day()`
  - Files modified: `api/admin-stats.js` (rewritten with tab routing), `src/pages/Admin.jsx` (rewritten with 3 tabs + engagement + management + moderation)
- [x] **Phase 4A-1 Complete: MFCC Integration into Instrument Scoring** (Feb 2026)
  - **Problem**: `computeMFCCs()` was already implemented and computing 13 coefficients, but the MFCC values were completely unused in `detectInstruments()` scoring — only the `spectralContrast` byproduct was wired in. MFCCs are the #1 feature for timbre discrimination in audio ML research.
  - **Solution**: Integrated 4 MFCC-derived features into all 11 instrument scoring blocks:
    - `mfccs[0]` (spectral energy density): Pads/chords score high (dense detuned oscillators), kicks score low (short transients)
    - `mfccs[1]` (spectral slope/tilt): THE bass vs kick discriminator — bass has strongly negative tilt (energy concentrated low), kicks have near-zero tilt (noise-like flat spectrum). Also separates bright instruments (brass/vocal, positive tilt) from dark (bass/sub-bass, negative tilt)
    - `|mfccs[2]|` (spectral shape peakiness): THE pad vs lead discriminator — pads have low values (smooth, broad spectrum from detuned oscillators), leads have high values (peaky, focused harmonics). Also used for pluck detection (sharp attack transient creates peaky spectrum)
    - `mfcc34variance` = `|mfccs[3]| + |mfccs[4]|` (inharmonicity/formant indicator): High variance = inharmonic partials (guitar string vibration) or formant peaks (vocal). Low variance = clean synth harmonics. Separates guitar from synth lead, and vocals from instruments
  - **Instrument-specific MFCC scoring highlights**:
    - Kick: +2 for near-zero mfccs[1] (flat/noisy), -2 for strongly negative mfccs[1] (that's bass)
    - Bass: +2.5 for strongly negative mfccs[1] (low-tilted), -1.5 for positive (bright instrument)
    - Lead vs Pad: Lead gets +2 for high |mfccs[2]|, pad gets +2 for low |mfccs[2]| and -1.5 for very high
    - Guitar: +2 for high mfcc34variance (inharmonic partials), -1 for very low (clean synth)
    - Vocal: +2 for high mfcc34variance (formant peaks), -1.5 for very low (instrument, not voice)
  - All 104 tests pass, build succeeds, no new lint errors
  - Files modified: `src/workers/audio.worker.js` (MFCC scoring in all 11 instrument blocks + precomputed mfcc34variance)
- [x] **UX Batch: Tabs Restructure, Download Dedup, Preset Library, A/B Audition, Recreation Progress** (Feb 2026)
  - **Feature 1: Community download deduplication**: Added `hasCommunityDownload(analysisId)` and `trackCommunityDownload(analysisId)` to `useDownloadedPresets` hook. Uses `hasCommunityDownloadRef` pattern for stable closures. RecipeDetail checks before inserting into downloads table — skips count increment on re-download but still triggers file download. "Already in your library" badge with CheckCircle icon. Recipe.jsx passes dedup props to RecipeDetail.
  - **Feature 2: All 40 starter presets in My Presets**: Removed empty state from MyPresets.jsx. Always renders all 40 `CURATED_PRESETS` with category filter pills (All + 10 categories). Each preset shows name, category badge, description, matchReason. Downloaded presets get green "Downloaded" badge. Download/Re-download button per preset.
  - **Feature 3: Merge Vital tab (4→3 tabs)**: ResultsTabs reduced from 4 tabs to 3: Vital Preset & Recipe, DAW Recipe, Full Analysis. Removed `settings` tab entirely. Vital tab now shows PresetSelector + VitalGuide synthesis tips on same scrollable view. VitalGuide exported from SoundRecipe.jsx. Settings content (VSTs, oscillator, filter, envelope, modulation, EQ, effects) moved into DAW tab.
  - **Feature 4: DAW-specific recipe tab**: DAW tab label uses `dawPreference` (e.g., "FL Studio Recipe"). When no DAW preference set, shows prompt card with Settings icon linking to `/settings`. SoundSauce receives `showVitalSection={false}` to hide Vital sections in DAW tab.
  - **Feature 5: A/B preset audition**: Added `comparePresetId` state and ArrowLeftRight compare button on each unselected preset card. Two-column comparison panel: Column A (Current, Star icon, "Keep This" secondary button) vs Column B ("Select This" primary/gradient button). All 8 TUNING_PARAMS displayed side-by-side with differing values highlighted in accent color. Close button (X icon) to dismiss. Selecting B sets it as the active preset.
  - **Feature 6: Recreation step progress indicator**: Replaced single progress bar with 4-step horizontal indicator: Upload (< 30%) → Decode (30-60%) → Compare (60-85%) → Save (85-100%). Circles connected by lines, completed steps show Check icon with accent color, active step shows Loader spinner, pending steps show step number dimmed.
  - **Feature 7: Open in Vital guidance tip**: After curated preset download in PresetSelector, shows instructional card: "Double-click the downloaded .vital file to open it in Vital" with HelpCircle icon + vital.audio link. Auto-dismisses after 8 seconds or on next preset selection.
  - Files modified: `src/hooks/useDownloadedPresets.js`, `src/components/recipe/RecipeDetail.jsx`, `src/pages/Recipe.jsx`, `src/components/analysis/ResultsTabs.jsx`, `src/components/analysis/SoundRecipe.jsx`, `src/components/analysis/index.js`, `src/pages/Analyze.jsx`, `src/components/audio/PresetSelector.jsx`, `src/pages/MyPresets.jsx`, `src/components/recipe/RecreationUpload.jsx`
- [x] **Preset System Enhancements** (Feb 2026)
  - **Auto-update PresetSelector on instrument change**: Added `key={selectedInstrument}` to `<PresetSelector>` in Analyze.jsx so React unmounts/remounts the component when the detected instrument changes. This cleanly resets category selection, preset selection, and tuning sliders without useEffect sync. Removed the old useEffect-based category sync approach from PresetSelector.jsx. JSDoc updated to document the key prop pattern.
  - **10 new curated presets (30 to 40 total)**: Added to `vitalPresets.js` — Bass: wobble_bass (dubstep LFO filter), fm_bass (metallic FM harmonics). Lead: square_lead (retro chiptune), screech_lead (high resonance), vocal_lead (formant-like). Pad: shimmer_pad (bright reverb), evolving_pad (filter movement), choir_pad (thick detuned unison). Kick: 808_kick (long sub tail, trap), punchy_kick (tight clicky, house/techno). Data-driven tests auto-cover all 40 presets with zero test changes.
  - **Community presets in PresetSelector**: Added `CATEGORY_TO_TAG` constant mapping preset category IDs to tag labels. On category change, fetches public standalone presets (`post_type='preset'`, `is_public=true`) matching the category tag from `analyses` table, ordered by `like_count DESC`, limit 10, with FK hint `profiles:user_id(username, avatar_url)`. Community section appears between curated preset cards and tuning sliders — shows section header with count, skeleton loading, compact cards with title, author avatar+username, description, download button (.vital link), like/download counts. All user text sanitized via DOMPurify. Stale request cancellation via `cancelled` flag in useEffect cleanup.
  - Files modified: `src/pages/Analyze.jsx` (key prop on PresetSelector), `src/components/audio/PresetSelector.jsx` (removed useEffect sync, added community presets fetch/UI, added CATEGORY_TO_TAG, imports for supabase/sanitize/icons), `src/data/vitalPresets.js` (10 new presets)
- [x] **Preset System UX Enhancements** (Feb 2026)
  - **Vital tab first in ResultsTabs**: Moved Vital Preset tab to first position in the post-analysis tabbed interface, renamed "Sound Sauce" tab to "DAW Recipe". Default active tab changed from 'quick' to 'vital'. Added Music icon import.
  - **Preset tuning slider descriptions**: Added `description` field to all 10 `TUNING_PARAMS` in `vitalPresets.js` explaining what each parameter does (e.g., "Controls the filter frequency — lower values create a darker, more muffled sound"). Displayed as muted text below each slider range input in PresetSelector.
  - **Preset match reasons**: Added `matchReason` field to all 40 `CURATED_PRESETS` in `vitalPresets.js` explaining why each preset sounds the way it does (e.g., "Detuned saws create rich stereo width; the filter envelope adds motion"). Displayed on selected preset cards in PresetSelector.
  - **Download tracking and library**: Created `useDownloadedPresets` hook (`src/hooks/useDownloadedPresets.js`) — tracks curated preset downloads in localStorage, community preset downloads via Supabase `downloads` table. Added Downloads tab to Profile page with curated + community sections and re-download buttons. Added duplicate download detection in PresetSelector with warning UI ("Already in your library").
  - **Community preset download fix**: Fixed bug where downloading community presets showed raw JSON code instead of triggering a `.vital` file download. Root cause: `api/upload-preset.js` used `contentType: 'application/json'` and `<a href download>` doesn't work cross-origin. Fix: changed upload contentType to `application/octet-stream`, created `downloadRemotePreset()` helper in `vitalPresetGenerator.js` that fetches and triggers client-side download. Applied to all 3 download locations: PresetSelector, RecipeDetail, Profile Downloads tab.
  - Files created: `src/hooks/useDownloadedPresets.js`
  - Files modified: `src/components/analysis/ResultsTabs.jsx` (Vital tab first, renamed Sound Sauce to DAW Recipe), `src/data/vitalPresets.js` (description on TUNING_PARAMS, matchReason on all 40 CURATED_PRESETS), `src/components/audio/PresetSelector.jsx` (slider descriptions, matchReason display, duplicate download warning, community download fix), `src/pages/Profile.jsx` (Downloads tab, downloadRemotePreset import), `src/pages/Analyze.jsx` (useDownloadedPresets integration, removed dead state), `src/services/vitalPresetGenerator.js` (downloadRemotePreset helper), `api/upload-preset.js` (contentType fix), `src/components/recipe/RecipeDetail.jsx` (downloadRemotePreset, changed <a> to <button>), `src/hooks/index.js` (useDownloadedPresets export)
- [x] **Phase 4A-4: CLAP Server-Side Instrument Detection → Replaced by Gemini 2.5 Flash** (Feb 2026)
  - **Problem**: Client-side EfficientAT (ONNX Runtime Web) added 109KB JS runtime + 5.8MB WASM to the frontend bundle. AudioSet's 527 general audio classes were not ideal for music instrument detection. Model loaded on-demand but added latency to first inference.
  - **Solution (original)**: Replaced with server-side CLAP (`laion/larger_clap_music`) deployed on Replicate via custom Cog package. CLAP is a zero-shot audio classifier — given audio + text labels like "synth pad", "808 bass", it returns similarity scores without any training on those specific categories.
  - **CLAP was later replaced by Gemini 2.5 Flash** — see "Gemini AI Instrument Detection (Replace CLAP)" completed entry above. CLAP suffered from Replicate Cog E8765 deployment errors and required an async polling architecture. Gemini is synchronous, cheaper (~$0.001 vs $0.01-0.05), and faster (~2-5s vs ~10-15s).
  - **Bundle size reduction** (from EfficientAT removal): Removed `onnxruntime-web` dependency, deleted `src/services/mlInstrumentDetection.js` and `src/hooks/useMLDetection.js`. Vendor chunks reduced from 4 to 3 (removed `vendor-onnx`). Frontend gzipped total reduced from ~400KB to ~290KB. No more 5.8MB WASM download.
  - **CSP cleanup**: Removed `jsdelivr CDN` from `script-src` (was for ONNX WASM). Removed `unsafe-eval` (was required for ONNX WASM execution).
  - Files created: `clap-model/cog.yaml`, `clap-model/predict.py`, `api/detect-instrument.js`, `api/check-instrument.js`
  - Files deleted: `src/services/mlInstrumentDetection.js`, `src/hooks/useMLDetection.js`
  - Files modified: `src/pages/Analyze.jsx` (CLAP async flow, CLAP_LABEL_MAP, clapAbortRef), `package.json` (removed onnxruntime-web), `vite.config.js` (removed vendor-onnx chunk), `vercel.json` (CSP cleanup)
- [x] **Stem Waveform Display + Region Selection** (Feb 2026)
  - **Problem**: Users could only trim/select regions on the full mix waveform. After stem separation, clicking "Analyze" on a stem analyzed the entire stem (~3-4 min), producing low-reliability results identical to analyzing a full mix.
  - **Solution**: When a user clicks a stem card, the main waveform swaps to display that stem's audio. Users can then drag-to-select a specific region on the stem and analyze just that trimmed section — exactly the same workflow as the full mix.
  - **Stem indicator bar**: Shows "Viewing: [Stem] stem" with a "Back to Full Mix" button above the waveform when a stem is active.
  - **Independent loop regions**: Each stem maintains its own loop region state, preserved when switching between stems. Switching back to full mix restores the full mix's loop region.
  - **Stem waveform data pipeline**: `prepareStemWaveform()` decodes stem audio via a temporary AudioContext, generates both 200-point preview and hi-res min/max data via the Web Worker (same two-tier pattern as full mix). Data is cached in `stemWaveformDataRef` per stem type.
  - **Analysis integration**: `runAnalysis()` checks stem loop regions first — if a stem is active with a selected region, it passes `{ regionStart, regionEnd }` to `analyzeAudio()` for that stem. This produces high-reliability analysis results (1.0 vs 0.2 for full tracks).
  - **Auto-activation**: Both `handleSelectStem` and `handleAnalyzeStem` auto-activate the stem waveform view, preparing waveform data before switching.
  - **AnalyzeSection for stems**: When viewing a stem with a loop region selected, an AnalyzeSection button appears above the StemSelector, allowing direct analysis of the trimmed stem region.
  - Files modified: `src/hooks/useAudioProcessor.js` (exposed `generateWaveformData` in return), `src/pages/Analyze.jsx` (stem waveform state, prepareStemWaveform, stem-aware loop handlers, conditional waveform/AnalyzeSection props, stem indicator bar, stem loop integration in runAnalysis, state reset on new upload)
- [x] **Phase 4A-1: Advanced Feature Extraction for Instrument Detection** (Feb 2026)
  - **Problem**: Heuristic instrument detection relied only on frequency band energy, envelope shape, and basic spectral features. These were insufficient to reliably distinguish similar instruments (kick vs bass, pad vs lead, guitar vs strings). Research identified 4 key missing features used in audio ML: MFCCs, temporal centroid, pitch envelope, and spectral contrast.
  - **New feature functions added to `audio.worker.js`**:
    - `analyzeTemporalCentroid(channelData, sampleRate)` — computes where amplitude energy is concentrated on a 0-1 scale using RMS energy per 5ms window. Kick drums = 0.05-0.15 (energy at impact), bass = 0.25-0.50 (sustained), pads = 0.40-0.60 (slow build). Single best kick vs bass discriminator.
    - `analyzePitchEnvelope(channelData, sampleRate)` — tracks fundamental frequency via autocorrelation across first 150ms in 15ms windows with 5ms hop. Returns `{ isStable, sweepRatio, fundamentalHz }`. Kicks have characteristic pitch sweep (sweepRatio > 1.5), bass/pads have stable pitch (sweepRatio ~1.0). Most reliable kick identifier.
    - `computeMFCCs(channelData, sampleRate)` — 13 mel-frequency cepstral coefficients via 26-band mel filterbank + DCT, averaged across up to 6 windows. Also computes spectral contrast (peak-to-valley ratio across mel bands). MFCCs are the #1 feature for timbre discrimination in audio ML research.
    - `createMelFilterbank(numBands, fftSize, sampleRate)` — helper that creates triangular mel-spaced filters with Hz-to-mel conversion.
  - **Scoring overhaul in `detectInstruments()`**: All 11 instrument types (kick, sub-bass, bass, lead, pad, pluck, guitar, strings, brass, woodwind, vocal) now use temporal centroid, pitch envelope stability/sweep, and spectral contrast in their scoring. Key examples: kick gets +5 for pitch sweep >2.0 and +3 for early centroid (<0.10); bass gets +3 for stable pitch and +2 for later centroid (>0.20); pad gets +2 for late centroid (>0.40) and -2 for early centroid.
  - Files modified: `src/workers/audio.worker.js` (4 new functions + scoring overhaul in detectInstruments)
- [x] **Phase 4A-2: Replace YAMNet with EfficientAT mn04 via ONNX Runtime Web** (Feb 2026)
  - **Problem**: YAMNet (TensorFlow.js, ~15MB model, ~30 mAP on AudioSet, 521 classes) was the weakest link — trained on general audio, not music. TF.js runtime added 1.1MB to the vendor JS bundle. Tensor shape warnings in console.
  - **Solution**: Replaced with EfficientAT mn04_as (MobileNetV3-based, 0.98M params, 43.2 mAP = 43% better accuracy, 527 AudioSet classes) running via ONNX Runtime Web (~109KB gzipped JS runtime vs TF.js 1.1MB).
  - **Python export script**: Created `scripts/export_efficientat.py` — clones EfficientAT repo, loads mn04_as pretrained weights, wraps mel spectrogram preprocessor (AugmentMelSTFT, 128 mel bands, 32kHz, hop=320, window=800) + classification model into a single ONNX graph. Raw audio in → sigmoid scores out. Export uses opset 17 (required for STFT operator), dynamic axes for variable batch/length. Output: `mn04_as.onnx` (4.1MB), `audioset_labels.json` (527 classes).
  - **Model hosting**: Uploaded to Vercel Blob at `https://vkczteqznkljau3r.public.blob.vercel-storage.com/models/mn04_as.onnx`. Fetched with progress tracking on first use.
  - **Class index remapping**: EfficientAT uses the full 527-class AudioSet ontology with DIFFERENT indices than YAMNet's 521-class subset (e.g., "Singing" = index 27 in EfficientAT vs 24 in YAMNet). All 18 instrument categories in `INSTRUMENT_CLASS_MAP` remapped by cross-referencing `audioset_labels.json`. Key mappings: Bass drum→168, Snare→165, Hi-hat→172, Bass guitar→142, Guitar→140, Synthesizer→158, Piano→153, Brass→185, Singing→27.
  - **ONNX Runtime Web integration**: Lazy-loaded via `import('onnxruntime-web')`. WASM backend files (~5.8MB gzipped) loaded from jsdelivr CDN via `ort.env.wasm.wasmPaths`. Session created with `executionProviders: ['wasm']` and `graphOptimizationLevel: 'all'`. Warm-up with 1s silence tensor.
  - **Inference pipeline**: Same multi-segment strategy as before (5s segments at beginning, 1/3, 2/3, end). Audio resampled to 32kHz (was 16kHz for YAMNet). Input: `ort.Tensor('float32', audioData, [1, audioData.length])`. Output: `[1, 527]` sigmoid scores. MAX aggregation across segments.
  - **Confidence calibration**: Adjusted for EfficientAT's better-calibrated sigmoid outputs — gentler power curve (0.7 exponent vs 0.5) and lower scaling (1.2x vs 1.5x).
  - **Blend weights**: Default ML weight increased from 0.6 to 0.7 (EfficientAT is more reliable). Adaptive weighting threshold raised (heuristic override at 85% vs 80%).
  - **Bundle size reduction**: `vendor-onnx` chunk is 109KB gzipped (vs `vendor-tensorflow` 1.1MB = ~10x smaller JS). Removed `chunkSizeWarningLimit: 1200` from vite.config.js.
  - **CSP cleanup**: Removed `https://tfhub.dev` and `https://www.kaggle.com` from connect-src and script-src in vercel.json. `https://*.blob.vercel-storage.com` already covers the model URL.
  - Files created: `scripts/export_efficientat.py`, `scripts/mn04_as.onnx` (4.1MB), `scripts/audioset_labels.json` (527 classes)
  - Files modified: `src/services/mlInstrumentDetection.js` (complete rewrite), `package.json` (removed @tensorflow/tfjs, added onnxruntime-web), `vite.config.js` (vendor-onnx chunk, removed chunkSizeWarningLimit), `vercel.json` (CSP cleanup)
- [x] **Bass vs Kick Detection Accuracy Fix** (Feb 2026)
  - **Problem**: Bass stem (pluck bass) was detected as "kick 94%" instead of bass. Drums stem (kick drum) was only detected as kick at 71% confidence. Root cause: kick scoring relied too heavily on `isPercussive` (+4 bonus) which pluck bass triggers, and didn't differentiate based on decay time or harmonicity. Bass scoring was penalized when `isPercussive` was true, losing points unfairly for pluck-style bass.
  - **Kick scoring fixes**: Reduced `isPercussive` bonus from +4 to +3. Added decay time as THE critical differentiator: <100ms gets +4, <200ms +2.5, <400ms +0.5 (was flat +3 for <200ms). Added harmonicity penalty: kicks are noise-like, so harmonic content >0.6 gets -3, >0.4 gets -1.5. Added long-decay penalty: >300ms gets -2.5, >200ms -1.5. Tightened low-sustain bonus to require <20% instead of <30% for full points.
  - **Bass scoring fixes**: Added harmonicity bonus: >0.5 gets +2.5, >0.3 gets +1.5 (bass notes have clear pitch). Added decay time bonus: >200ms gets +2, >100ms +1. Increased lowMid band weight from 1.5 to 2. Reduced isPercussive penalty from -2 to -1 (pluck bass can trigger isPercussive but is still bass). Added very-fast-decay penalty: <100ms gets -2 (that's kick territory).
  - **Sub-bass fixes**: Added harmonicity bonus (+1.5 for >0.3). Added very-fast-decay penalty (-2 for <100ms).
  - **Confidence scaling improvement**: Changed base confidence formula from `(score / 10) * 100` to `(score / 8) * 100` for more generous high-score mapping. Added dominance bonus: +5 when instrument is >90% of max score, +3 for >70%.
  - Files modified: `src/workers/audio.worker.js` (kick scoring, bass scoring, sub-bass scoring, confidence calculation)
- [x] **User-Driven Instrument Selection + Auth Duplicate Email Fix + SoundCloud Player Width** (Feb 2026)
  - **User-driven instrument selection (Option 3)**: Restructured the post-analysis flow so instrument detection serves as a "smart default" rather than a gatekeeper. After analysis, the top detected instrument (or stem-mapped instrument for known stems) is auto-selected and recommendations generate instantly. Users can tap any detected instrument to immediately switch — recommendations update without a separate "Re-analyze" button click. `InstrumentSelector` header changed from "Detected Instruments" to "What instrument is this?" with "Tap to change" hint. ML badge renamed from "ML Enhanced" to "AI Suggested." Checkmark indicators show the currently selected instrument.
  - **Smart stem-to-instrument mapping**: When analyzing known stems, auto-maps: bass→'bass', drums→'drums', vocals→'vocal'. The "other" stem uses the top detection result as its smart default. For non-stem analysis, uses the top detected instrument instead of 'full'.
  - **Instant re-analysis**: `onSelectInstrument` in `InstrumentSelector` now directly calls `reAnalyzeWithInstrument()` instead of `handleSelectStem()`. Tapping a different instrument immediately regenerates recommendations via `generateInstrumentRecommendations()` without re-running DSP. Removed the "Re-analyze as [X]" button — no longer needed.
  - **Auth duplicate email handling**: When signing up with an already-registered email, Supabase returns a fake user with empty `identities` array. Added detection in `signUpWithEmail()` that checks `data.user.identities?.length === 0` and returns a clear error: "An account with this email already exists. Try signing in instead." AuthModal shows a "Go to Sign In →" link within the error message for quick navigation.
  - **SoundCloud player width**: Moved the SoundCloud player from inside the avatar+name flex row to a full-width position below the entire top row (avatar + info + stats) in the Profile card. Removed `max-w-[120px]` constraint on artist name and `shrink-0` on the title/artist container so song info is fully visible.
  - Files modified: `src/pages/Analyze.jsx` (smart instrument auto-selection, `onSelectInstrument` → `reAnalyzeWithInstrument`), `src/components/audio/InstrumentSelector.jsx` (removed `onReAnalyze`/`currentAnalysisInstrument` props, added checkmarks, updated header text, removed Re-analyze button), `src/contexts/AuthContext.jsx` (duplicate email detection in `signUpWithEmail`), `src/components/auth/AuthModal.jsx` (inline "Go to Sign In" link on duplicate error), `src/pages/Profile.jsx` (SoundCloud player moved to full-width), `src/components/ui/SoundCloudEmbed.jsx` (removed artist name width cap)
- [x] **Stem-First UX Restructure + Stem Analysis Bug Fixes** (Feb 2026)
  - **P0 Bug — analyzeAudio() ignoring stem data**: `analyzeAudio()` in `useAudioProcessor.js` always reused the cached full-mix AudioBuffer (line 1437: `if (audioBufferRef.current)` was always true after upload). ALL analysis — DSP, instrument detection, AND ML — ran on the full mix, not the selected stem. Fix: source-aware buffer caching using `audioBufferSourceRef` — compares incoming raw ArrayBuffer against the cached source before reusing. Stem buffers are ephemeral (not cached into `audioBufferRef`) to preserve waveform/playback.
  - **ML detection on wrong audio**: ML detection (YAMNet) in `Analyze.jsx` used `audio.audioBuffer` (always the full mix) instead of the stem data. Fix: when analyzing a stem, decodes the stem's ArrayBuffer into a temporary AudioBuffer for ML detection via `new AudioContext()` with try/finally cleanup. Skips region slicing for stems.
  - **Stem-first UX restructure**: For long audio (>15s), the Analyze page now shows a stem-first guidance card with two CTAs: "Separate Stems" (primary, gradient) and "Analyze Full Track" (secondary). Short audio (≤15s) or when a loop region is selected still shows the original `AnalyzeSection` button. After stems are ready, each stem card has its own prominent "Analyze" button as the primary action.
  - **Per-stem Analyze buttons**: Added `onAnalyze`, `isAnalyzing`, `isAnalyzed` props to `StemCard` in `StemSelector.jsx`. Each stem card shows an Analyze button (gradient in light mode) as the primary action, with Play and Download as secondary actions. Analyzed stems show a checkmark indicator.
  - **`runAnalysis(stemTypeOverride)` parameter**: `runAnalysis` now accepts an optional `stemTypeOverride` to directly trigger analysis on a specific stem without waiting for state propagation. `handleAnalyzeStem(stemType)` callback passes through to `runAnalysis(stemType)`.
  - **`analyzingStemType` state**: Tracks which stem is currently being analyzed for accurate UI indicators on stem cards (fixes race condition where `selectedInstrument` wasn't yet updated during async analysis).
  - Files modified: `src/hooks/useAudioProcessor.js` (source-aware buffer caching in `analyzeAudio()`), `src/pages/Analyze.jsx` (ML fix, `stemTypeOverride` param, `handleAnalyzeStem` callback, `analyzingStemType` state, conditional action area layout), `src/components/audio/StemSelector.jsx` (per-stem Analyze buttons, analysis state props)
- [x] **Full Mix Guidance UX + Stem Separation CSP Fix** (Feb 2026)
  - **Problem 1 (UX)**: When users upload a full song (like "Greyhound" by Palace), the analyzer would show a single instrument (e.g., "Pad 71%") with no guidance on how to get better results. Users didn't know they should separate stems or select a specific region.
  - **Solution**: Added `FullMixGuidance` component to `InstrumentSelector.jsx`. When a full mix is detected, shows a banner with two action cards: "Separate Stems" (scrolls to stem separation section) and "Select a Region" (scrolls to waveform for drag-to-select). Instrument grid hidden behind collapsible "Show detected instruments anyway" toggle.
  - **Smart mix detection**: Worker's `isFullMix` flag often missed full mixes (clean winner bypass). Added `instrumentsAboveThreshold` metric to worker return value — counts instruments above minScore before filtering. Analyze.jsx computes `shouldShowMixGuidance` from EITHER `isFullMix` OR (full track analyzed + audio >10s + ≥3 instruments above threshold).
  - **Problem 2 (CSP)**: Stem separation upload stalled at 5% and timed out after 2 minutes. Root cause: `@vercel/blob` client `upload()` sends files directly to `https://vercel.com/api/blob`, but CSP `connect-src` only allowed `https://*.blob.vercel-storage.com` (read URLs). The token request to `/api/upload-audio` succeeded, but the actual file upload was silently blocked by CSP.
  - **Fix**: Added `https://vercel.com` to CSP `connect-src` in `vercel.json`. Also increased upload timeout from 2min to 3min for large audio files, and added better error logging around the blob upload step.
  - Files modified: `src/components/audio/InstrumentSelector.jsx` (FullMixGuidance component, collapsible grid), `src/pages/Analyze.jsx` (scroll refs, smart mix detection, InstrumentSelector props), `src/workers/audio.worker.js` (instrumentsAboveThreshold return), `vercel.json` (CSP connect-src + vercel.com), `src/hooks/useStemSeparation.js` (timeout increase, error logging)
- [x] **Pricing Simplification: 3 Tiers → 2 Tiers** (Feb 2026)
  - **Problem**: Three tiers (Free / Pro $7 / Premium $15) where the only real difference between Pro and Premium was stem separations (20/mo vs unlimited). Created decision paralysis and Premium wasn't compelling enough.
  - **Solution**: Simplified to Free / Pro $10/mo with everything unlimited. All existing Premium subscribers automatically become Pro.
  - **Core logic**: Removed `premium` from `TIER_LIMITS` in useSubscription.js, changed Pro stems from 20 to Infinity. Removed `isPremium` from AuthContext. `canCreateChallenge()` simplified to `tier === 'pro'`.
  - **API**: Removed premium from `create-checkout.js` TIER_TO_PRICE mapping. `stripe-webhook.js` maps `STRIPE_PREMIUM_PRICE_ID` → `'pro'` for backwards compat with existing subscribers.
  - **UI**: Pricing.jsx updated to 2-column grid (Free + Pro $10/mo). UpgradePrompt.jsx updated to single Pro plan at $10/mo. Settings.jsx simplified current plan display and upgrade cards. Sidebar/Profile removed Crown "PRO+"/"PREMIUM" badges, simplified to Zap "PRO" badge. Challenges.jsx fixed pre-existing bug (destructured isPro/isPremium from useSubscription which doesn't export those — changed to `canCreateChallenge()`).
  - **DB migration**: `phase4d_remove_premium.sql` — migrates premium→pro users, updates CHECK constraint to (free/pro), updates challenges RLS policy.
  - **Tests**: Removed premium test cases from useSubscription.test.js and AuthContext.test.jsx, updated Pro stems assertions to Infinity.
  - Files created: `supabase/migrations/phase4d_remove_premium.sql`
  - Files modified: `src/hooks/useSubscription.js`, `src/contexts/AuthContext.jsx`, `api/create-checkout.js`, `api/stripe-webhook.js`, `src/pages/Pricing.jsx`, `src/components/ui/UpgradePrompt.jsx`, `src/pages/Settings.jsx`, `src/components/layout/Sidebar.jsx`, `src/pages/Profile.jsx`, `src/pages/Challenges.jsx`, `src/__tests__/useSubscription.test.js`, `src/__tests__/AuthContext.test.jsx`
- [x] **Guitar Instrument Detection + Pad Scoring Fix** (Feb 2026)
  - **Problem**: Uploading "Greyhound" by Palace (an acoustic guitar song) returned "Pad 95%". Root cause: no guitar category in heuristic detector, pad scoring rewarded guitar-like characteristics (sustain + broad harmonics), and YAMNet mapped guitar to ambiguous categories.
  - **Heuristic fix (audio.worker.js)**: Added `guitar` to scores initialization and full scoring block with 12 criteria: mid-range focus (mid*3, lowMid*2.5, highMid*2), body resonance (bass*1.5), fast attack bonus (<80ms: +2), spectral flux for strumming transients (>0.08: +1.5), harmonicity bonus (>0.5: +1.5), penalties for percussive (-2), sub-bass (-2), flat sustain >70% (-2), crest factor bonus (3-8: +1), decay time bonus (100-2000ms: +1).
  - **Pad scoring tightened**: Added penalties for fast attack (`attackTime < 80 ? -2`) and high spectral flux (`spectralFlux > 0.1 ? -1.5`) — real pads have slow attacks and smooth spectra.
  - **Strings bass penalty reduced**: `subBass*4 → subBass*2.5`, `bass*2.5 → bass*1.5` to allow guitar body resonance.
  - **Full mix guard for guitar**: Lowered clean winner threshold from 1.5x to 1.2x when top instrument is guitar, preventing solo guitar from being flagged as "full mix" due to broad spectrum.
  - **ML detection**: Added `guitar: [138, 139, 140, 141]` to INSTRUMENT_CLASS_MAP (Acoustic/Steel/Clean/Jazz guitar). Moved guitar classes out of `lead` (now just [136]) and `pluck`. Added `'guitar'` to INSTRUMENT_CATEGORIES.
  - **Preset routing**: Added `guitar: 'guitar'` to INSTRUMENT_TO_CATEGORY in vitalPresets.js (guitar preset category already exists with 3 presets).
  - **UI**: Added `guitar: { label: 'Guitar', icon: 'Music2' }` to instrumentLabels in constants.js.
  - Files modified: `src/workers/audio.worker.js`, `src/services/mlInstrumentDetection.js`, `src/data/vitalPresets.js`, `src/utils/constants.js`
- [x] **First-Visit Conversion Experience Overhaul** (Feb 2026)
  - **Home page hero redesign**: Replaced static text hero with two-column layout. Left: social proof stats bar (fetches from `/api/public-stats`), gradient H1 "Hear a sound you love? Learn to make it.", dual CTAs ("Try It Free" + "See It In Action"), trust line. Right: static 808 Bass preview card showing actual analysis output format. "See It In Action" reveals pre-computed demo results with staggered animation.
  - **"How It Works" section**: 3 numbered step cards (Upload → Analyze → Recreate) with mini visuals, replacing generic feature cards.
  - **Social proof**: Platform stats bar (N sounds analyzed · N Sound Sauces · N presets downloaded), category browsing pills linking to `/discover?tag=`, weekly challenge teaser from active challenge data, improved "Featured Sound Sauces" section.
  - **Pricing page**: New `src/pages/Pricing.jsx` at `/pricing`. Three-column grid (Free/Pro/Premium) with Pro highlighted as "Most Popular" (center-stage effect, anchoring). FAQ accordion (4 items). Bottom CTA. PostHog tracking on view and plan click. Handles Stripe checkout for authenticated users.
  - **Onboarding modal rewrite**: Value-first 3-step flow replacing generic welcome. Step 1: "Quick Demo" with hardcoded analysis results (staggered badge reveal animation). Step 2: "Personalize" (DAW + skill level). Step 3: "Get Started" with action cards (Upload a Sound → /analyze, Browse Sound Sauces → /discover) + "10 free analyses" reminder.
  - **Upgrade nudges** (4 subtle touchpoints): (A) Usage progress bar on Analyze page after analysis for free-tier users with link to /pricing. (B) Zap icon tier badges on StemSelector ("2/mo free") and HistoryPanel publish button ("3/mo free") for free users. (C) Guest "save your work" prompt after analysis with AuthModal trigger. (D) Weekly challenge teaser on Home page.
  - **Integration points**: "Compare all plans" link added to UpgradePrompt modal footer. "Compare plans" link added to Settings subscription section for free users.
  - **PostHog conversion funnel events**: 8 new tracking helpers (trackHeroDemoClicked, trackHeroDemoRevealed, trackHeroCTAClicked, trackPricingPageViewed, trackPricingPlanClicked, trackSavePromptShown, trackSavePromptConverted, trackUsageBarShown). Enables funnel: homepage → demo → cta → analysis → save_prompt → signup → checkout.
  - **Public stats API**: New `api/public-stats.js` serverless endpoint. No auth required, uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS. In-memory cache with 5-minute TTL. Rate limited (30/min). Returns totalAnalyses, publicRecipes, totalDownloads counts.
  - **CSS animation**: Added `animate-fade-in` utility class (keyframes fade-in with translateY) to `index.css`.
  - Files created: `src/pages/Pricing.jsx`, `api/public-stats.js`
  - Files modified: `src/pages/Home.jsx` (major guest section rewrite), `src/components/ui/OnboardingModal.jsx` (complete rewrite), `src/pages/Analyze.jsx` (usage bar + save prompt + AuthModal), `src/components/audio/StemSelector.jsx` (freeTierLabel badge), `src/components/history/HistoryPanel.jsx` (freeTierPublishLabel badge), `src/components/ui/UpgradePrompt.jsx` (Compare all plans link), `src/pages/Settings.jsx` (Compare plans link), `src/lib/posthog.js` (8 tracking helpers), `src/App.jsx` (Pricing route), `src/pages/index.js` (Pricing export), `src/components/layout/Sidebar.jsx` (Pricing footer link), `src/index.css` (fade-in animation)
- [x] **SoundCloud Anthem Redesign + File Format Restriction** (Feb 2026)
  - **SoundCloud player redesign**: Rewrote `SoundCloudEmbed.jsx` from chunky multi-row card (~100px+ tall) to slim single-row horizontal bar (~48px tall). Vinyl record shrunk from 64px to 40px, title/artist/progress bar all inline in one flex row, removed "What {username} has been listening to lately" header. Play/pause overlay on hover over vinyl.
  - **getElementById collision fix**: Replaced `document.getElementById('vinyl-disc')` with `useRef(vinylRef)` for the vinyl spin animation. Old pattern would break if multiple SoundCloudEmbed instances existed on the same page (e.g., Profile edit preview + display).
  - **CSP headers for SoundCloud**: Updated `vercel.json` CSP to allow SoundCloud domains across 5 directives: `script-src` (w.soundcloud.com), `connect-src` (api-v2.soundcloud.com), `img-src` (i1.sndcdn.com), `frame-src` (w.soundcloud.com), `media-src` (*.sndcdn.com).
  - **File format restriction**: Narrowed accepted audio formats from 7 (mp3, wav, flac, ogg, m4a, aac, webm) to 3 (wav, mp3, m4a). Updated `<input accept>` attributes in AudioUploadSection.jsx (both welcome and compact variants) and MIME type validation in `api/upload-audio.js`. Support text updated to "Supports WAV, MP3, and M4A".
  - Files modified: `src/components/ui/SoundCloudEmbed.jsx` (complete redesign), `src/components/audio/AudioUploadSection.jsx` (accept attribute + support text), `api/upload-audio.js` (MIME type validation), `vercel.json` (CSP headers for SoundCloud)
- [x] **Launch Prep (Phase A)** (Feb 2026)
  - **404 Not Found page**: `src/pages/NotFound.jsx` with themed styling, "Go Home" + "Go Back" buttons. Catch-all `<Route path="*">` in App.jsx. Prevents blank screens on invalid URLs.
  - **OG social sharing image**: `public/og-image.png` (1200x630) with SoundSauce branding — logo, title, tagline, feature pills, URL. SVG source at `public/og-image.svg`. `index.html` OG meta tags already referenced this path.
  - **Privacy Policy page**: `src/pages/Privacy.jsx` at `/privacy`. Covers data collection, usage, sharing, storage, cookies, user rights. Lists actual service providers (Supabase, Stripe, PostHog, Sentry, Replicate). Contact: soundsauceapp@gmail.com.
  - **Terms of Service page**: `src/pages/Terms.jsx` at `/terms`. Covers accounts, user content, subscriptions ($7/$15 tiers), acceptable use, third-party services, disclaimers. Contact: soundsauceapp@gmail.com.
  - **Sidebar legal links**: Privacy + Terms links added to sidebar footer (bottom of every page).
  - **Analyze page tooltips**: Added 11 tooltip definitions to `constants.js` (BPM, Key, Waveform, RMS Level, Tone, Frequency Center, Texture, Level, Filter Envelope, Harmonic Profile). Wrapped 7 feature labels in Detailed Analysis tab with `<Tooltip>` components.
  - **Vital explainer + download link**: Added "Get Vital (Free)" link to vital.audio in 3 locations: PresetSelector header (Analyze page), RecipeDetail standalone preset card, RecipeDetail inline banner for regular recipes with presets. Explains what Vital is for beginners.
  - **web-vitals FID fix**: Removed deprecated `onFID` import (FID replaced by INP in web-vitals v4). Fixed pre-existing build error.
  - Files created: `src/pages/NotFound.jsx`, `src/pages/Privacy.jsx`, `src/pages/Terms.jsx`, `public/og-image.svg`, `public/og-image.png`
  - Files modified: `src/App.jsx` (3 routes + 3 lazy imports), `src/pages/index.js` (3 exports), `src/components/layout/Sidebar.jsx` (legal links), `src/utils/constants.js` (11 tooltip definitions), `src/pages/Analyze.jsx` (7 Tooltip wrappers), `src/components/recipe/RecipeDetail.jsx` (Vital explainer + download link), `src/components/audio/PresetSelector.jsx` (Vital link), `src/lib/webVitals.js` (removed FID)
- [x] **Production Hardening (13 items)** (Feb 2026)
  - **P0 — Security & Reliability**: Sentry error monitoring (`src/lib/sentry.js`, `@sentry/react`, dynamic import for crash safety, 10% traces, 100% error session replays). CSP security headers + X-Frame-Options + X-Content-Type-Options + Referrer-Policy + Permissions-Policy in `vercel.json`. In-memory sliding window rate limiting (`api/_rateLimit.js`) on all API endpoints (10/min stems, 30/min uploads, 5/min checkout). DOMPurify input sanitization (`src/utils/sanitize.js`, zero-tag whitelist) in CommentsSection, RecipeCard, RecipeDetail, MessageThread.
  - **P1 — Development Process**: GitHub Actions CI/CD (`.github/workflows/ci.yml` — lint + test + build on push/PR to main). Playwright E2E smoke tests (`playwright.config.js`, `e2e/smoke.spec.js` — 5 tests: homepage, navigation, upload section). Environment variable validation (`src/utils/validateEnv.js` frontend prod-only, `api/_validateEnv.js` server-side per-endpoint). Supabase CLI migration automation (`supabase/config.toml`, `supabase/MIGRATIONS.md`, 21 tracked migration files).
  - **P2 — Growth & SEO**: SEO basics (`public/robots.txt`, `public/sitemap.xml`, OG + Twitter Card meta tags in `index.html`). Web Vitals tracking (`src/lib/webVitals.js`, `web-vitals` package, LCP/INP/CLS/TTFB → PostHog).
  - **P3 — Code Quality & Polish**: Bundle analysis (`rollup-plugin-visualizer`, `npm run build:analyze`). Accessibility testing (`src/__tests__/a11y.test.jsx`, 4 tests with `jest-axe`). JSDoc documentation (26+ blocks in useAudioProcessor, hook-level + function-level JSDoc on useRecipes/useSubscription/useHistory, all API endpoints documented with @param/@returns).
  - Files created: `src/lib/sentry.js`, `src/lib/webVitals.js`, `src/utils/validateEnv.js`, `src/utils/sanitize.js`, `api/_rateLimit.js`, `api/_validateEnv.js`, `.github/workflows/ci.yml`, `playwright.config.js`, `e2e/smoke.spec.js`, `public/robots.txt`, `public/sitemap.xml`, `supabase/config.toml`, `supabase/MIGRATIONS.md`, `src/__tests__/a11y.test.jsx`
  - Files modified: `vercel.json` (security headers), `src/main.jsx` (Sentry init, env validation, web vitals init), `src/components/ui/ErrorBoundary.jsx` (Sentry integration), `src/components/recipe/CommentsSection.jsx`, `src/components/recipe/RecipeCard.jsx`, `src/components/recipe/RecipeDetail.jsx`, `src/components/messages/MessageThread.jsx` (DOMPurify sanitization), `package.json` (new deps + scripts), `vite.config.js` (visualizer plugin)
- [x] **Acoustic Instrument Preset Expansion** (Feb 2026)
  - **Problem**: Detection system already identified acoustic instruments (brass, woodwind, strings, guitar, vocal) via ML/YAMNet, but the preset system routed them all to generic synth categories (brass→lead, woodwind→lead). A trumpet got recommended a Supersaw Lead preset.
  - **Solution**: Added 3 new preset categories (Guitar, Brass, Woodwind) with 9 new curated presets, bringing totals from 21→30 presets and 7→10 categories.
  - **New presets**: `acoustic_guitar` (triangle-saw blend, plucky ADSR), `clean_electric` (saw with slight detune), `distorted_guitar` (saw+square, heavy distortion), `trumpet` (saw+square blend, open filter, fast attack), `trombone` (saw, lower filter, medium attack), `french_horn` (saw+triangle, slow attack, rich reverb), `flute` (sine+noise layer), `saxophone` (saw, resonant filter), `clarinet` (triangle base, moderate filter)
  - **Updated routing**: `INSTRUMENT_TO_CATEGORY` now maps brass→'brass', woodwind→'woodwind' (both were→'lead')
  - **Recommendations expanded**: Added DAW instrument maps and recommendation blocks for guitar, brass, woodwind, strings, vocal in `recommendations.js` with DAW-specific plugin suggestions across FL Studio, Ableton, Logic Pro, Reaper, Pro Tools. Includes Spitfire LABS tips for realism.
  - **Publish tags expanded**: Added Brass, Woodwind, Guitar to `PREDEFINED_TAGS` in PublishModal
  - Files modified: `src/data/vitalPresets.js`, `src/utils/recommendations.js`, `src/components/recipe/PublishModal.jsx`
- [x] **Curated Vital Preset System (Replace Dynamic Generator)** (Feb 2026)
  - **Problem**: The old dynamic preset generator (`vitalPresetGenerator.js`) tried to reverse-engineer analysis data into Vital parameters (harmonic profiles → wavetable frames, filter envelopes → cutoff values). This was fragile — full mixes got 0.2 reliability, the harmonic-to-waveframe mapping was imprecise, and presets often sounded wrong because small analysis errors cascaded into bad synthesis settings.
  - **Solution**: Replaced the entire dynamic generator with a curated preset system. 40 hand-tuned presets across 10 categories that sound good by default. Users pick one that matches their analysis, then fine-tune with intuitive sliders.
  - **Architecture**: `vitalPresets.js` contains sparse settings objects (only non-default values). `buildVitalPreset(presetId, tuningOverrides, metadata)` deep-clones the init template, spreads the curated settings, applies user slider values, and returns a complete .vital file.
  - **Tuning sliders**: 8 adjustable parameters (`TUNING_PARAMS`): filter_cutoff, filter_resonance, attack, decay, sustain, release, reverb, chorus — each with min/max/default/step/vitalKey/linkedToggle.
  - **PresetSelector component**: Category pills (10 tabs) → preset cards (name + description) → click to select → tuning sliders appear. Auto-selects category based on detected instrument via `INSTRUMENT_TO_CATEGORY` mapping.
  - **Kick drum special handling**: `postProcess: 'kick'` flag triggers `applyKickLFOEnvelopes()` which injects sine wavetable + 3 factory LFO shapes (pitch/volume/distortion) extracted from Vital's "Kick Drum 1" preset.
  - **Data-driven tests**: Tests iterate over `CURATED_PRESETS` and `PRESET_CATEGORIES` dynamically — adding new presets requires zero test changes. Currently covers all 40 presets.
  - Files created: `src/data/vitalPresets.js` (new), `src/components/recipe/PresetSelector.jsx` (new)
  - Files modified: `src/services/vitalPresetGenerator.js` (complete rewrite — 500→90 lines), `src/__tests__/vitalPresetGenerator.test.js` (complete rewrite), `src/pages/Analyze.jsx` (PresetSelector integration), `src/components/comparison/ExportToolbar.jsx` (simplified to copy-only), `src/components/recipe/RecipeDetail.jsx` (preset display)
- [x] **Instrument Detection Accuracy Fix: Multi-Window Band Analysis + Envelope Fix** (Feb 2026)
  - **Problem**: `analyzeFrequencyBands()` only analyzed the first 4096 samples (~93ms) of audio. For any sound with a filter sweep or slow attack (like the demo Cm7 synth chord), this captured a completely unrepresentative snapshot — the demo sound's filter starts at 200Hz so the first 93ms was all sub-bass/bass energy, causing kick/sub-bass/bass/pluck detection instead of lead/pad.
  - **Fix 1: Multi-window frequency analysis**: `analyzeFrequencyBands()` now averages up to 6 FFT windows spread evenly across the entire audio. Short audio gets zero-padded instead of skipped. This captures the full timbral evolution (filter sweeps, attacks, sustain).
  - **Fix 2: Smarter instrument scoring**: Added precomputed energy ratios (`lowEnergy`, `midEnergy`, `broadEnergy`, `spectralSpread`). Bass/sub-bass/kick now get penalized for broad harmonic content (synth chords). Lead/pad get bonuses for spectral spread. Lead penalty changed from absolute subBass energy to ratio-based (only penalized when low completely dominates mid). Pluck penalized for high sustain.
  - **Fix 3: Full mix false positive prevention**: Method 4 (`kick-plus-content`) now requires percussive kick detection, not just bass energy + mid content. Method 2 (broad spectrum) thresholds raised to avoid triggering on rich synth sounds with natural harmonic spread.
  - **Fix 4: `analyzeEnvelope` false positives**: `isPercussive` now requires BOTH early peak AND low sustain (<40%) — a pad with fast attack peaks early but sustains, so it's not percussive. `decayTime` threshold lowered from 50% to 30% of peak, and if the sound never drops below 30%, decayTime reports the full remaining duration (sustained) instead of near-zero.
  - **Fix 5: Lead/pad scoring for low-register synths**: Lead multipliers increased (`mid*4`, `highMid*3`, `lowMid*2.5`), plus bonus for sustained harmonic sounds with broad energy. Pad gets stronger sustain/attack bonuses and broadEnergy bonus. Pluck gated behind `isPercussive` — sustained sounds get hard -3 penalty, and the fast-decay bonus only applies when actually percussive.
  - Verified with Node.js simulation: demo Cm7 sawtooth chord now scores pad=8.88, lead=3.71, kick=-4.52, pluck=-4.68
  - Files modified: `src/workers/audio.worker.js` (analyzeFrequencyBands rewrite, analyzeEnvelope fix, detectInstruments scoring overhaul, full mix detection tightening)
- [x] **Notification & Messaging Refinements** (Feb 2026)
  - Notifications page: added filter tabs (All / Likes / Comments / Followers) with tab-specific unread counts. Message notifications (`new_message` type) excluded entirely — messages have their own dedicated inbox
  - `useNotifications`: polls every 30s for new notifications using `notificationsRef` to avoid interval teardown. Only fetches newer than latest existing (`gt('created_at', latestTime)`), deduplicates by ID. Calls `refreshProfile()` on new notifications to update sidebar badge count
  - `useMessages`: polling uses `messagesRef` pattern (stable interval, no teardown on new messages). Optimistic sender profile filled from current user's profile data instead of placeholder. `MESSAGE_QUERY` constant deduplicates the select string
  - `useConversations`: `markConversationRead` uses `Promise.all` for parallel updates (cleaned up from nested await). `CONVERSATION_QUERY` constant deduplicates the select string
  - Messages page: follow-back from request banner triggers `handleFollowBack` which toggles follow → waits 500ms for DB trigger → refreshes conversations → optimistically sets `is_request` to false, promoting the conversation from Requests tab to Inbox
  - Files modified: `src/pages/Notifications.jsx`, `src/hooks/useNotifications.js`, `src/hooks/useMessages.js`, `src/hooks/useConversations.js`, `src/pages/Messages.jsx`
- [x] **Direct Messaging + Weekly Challenges** (Feb 2026)
  - **Direct Messaging**: 1:1 conversations between users. `conversations` table with canonical user ordering (`user_a_id < user_b_id`), `is_request` boolean for mutual follow gating, per-user unread counts (`unread_a`, `unread_b`). `messages` table (2000 char limit). `are_mutual_follows()` helper function, `get_or_create_conversation()` RPC. Triggers: auto-promote on follow (`update_conversations_on_follow`), auto-demote on unfollow (`update_conversations_on_unfollow`), `notify_on_message`. `useConversations` hook (inbox/requests split, mark read with optimistic updates). `useMessages` hook (optimistic send, 4s polling for new messages, scroll-up pagination). Messages page at `/messages` with master-detail layout (conversation list left, thread right), mobile responsive (list OR thread with back button). Request banner: "[User] wants to message you. Follow them back to reply." with inline FollowButton. Message button on UserProfile pages. `unreadMessages` exposed via AuthContext for sidebar badge. MessageSquare icon in sidebar nav.
  - **Weekly Challenges**: Time-limited sound recreation contests. `challenges` table with `creator_id`, `sound_sauce_id` (FK to analyses), date range with CHECK constraints. `challenge_submissions` table with `UNIQUE(user_id, challenge_id)` for re-submissions via UPSERT. Status derived from dates (active/upcoming/ended), not stored. RLS: everyone can view, Pro/Premium can create, auth users can submit to active challenges. Triggers: `update_challenge_submission_count`, `notify_on_challenge_submission`, `check_challenge_badges` (first_challenge, challenge_winner). `useChallenges` hook (browse with filter, cursor-based pagination, create, fetchActiveChallenge for Home page). `useChallengeSubmission` hook (upload to Vercel Blob → decode AudioBuffers → Web Worker spectral match → UPSERT). Challenges page at `/challenges` with filter tabs (All/Active/Upcoming/Ended) + create form. ChallengeDetail page at `/challenge/:id` with submission upload + leaderboard (ranked scores with medal icons). `canCreateChallenge()` added to `useSubscription` (Pro/Premium gate). Trophy icon in sidebar nav.
  - **Shared Changes**: 2 new notification types (`new_message`, `challenge_submission`) in Notifications page with click handlers. 2 new achievement badges (`first_challenge`, `challenge_winner`) in badges.js (10→12). 6 new PostHog tracking helpers (36+ total). `canCreateChallenge()` in useSubscription. Trophy icon in Profile/UserProfile BADGE_ICON_MAP. Sidebar nav icon hover animations added for Messages (`nav-message-wiggle` — gentle tilt) and Challenges (`nav-trophy-lift` — lift and scale) in `index.css`.
  - Files created: `supabase/migrations/phase6a_direct_messages.sql`, `supabase/migrations/phase6b_weekly_challenges.sql`, `src/hooks/useConversations.js`, `src/hooks/useMessages.js`, `src/hooks/useChallenges.js`, `src/hooks/useChallengeSubmission.js`, `src/components/messages/ConversationList.jsx`, `src/components/messages/MessageThread.jsx`, `src/components/messages/MessageInput.jsx`, `src/components/messages/index.js`, `src/components/challenges/ChallengeCard.jsx`, `src/components/challenges/ChallengeGrid.jsx`, `src/components/challenges/ChallengeLeaderboard.jsx`, `src/components/challenges/ChallengeSubmission.jsx`, `src/components/challenges/index.js`, `src/pages/Messages.jsx`, `src/pages/Challenges.jsx`, `src/pages/ChallengeDetail.jsx`
  - Files modified: `src/App.jsx` (3 routes), `src/pages/index.js` (3 exports), `src/hooks/index.js` (4 exports), `src/contexts/AuthContext.jsx` (unreadMessages), `src/components/layout/Sidebar.jsx` (Messages + Challenges nav, unread badge), `src/pages/Notifications.jsx` (2 type configs + click handlers), `src/data/badges.js` (2 new badges), `src/lib/posthog.js` (6 tracking helpers), `src/pages/UserProfile.jsx` (Message button, Trophy icon), `src/pages/Profile.jsx` (Trophy icon), `src/hooks/useSubscription.js` (canCreateChallenge), `src/index.css` (nav-message-wiggle + nav-trophy-lift hover animations)
- [x] **PostHog Analytics + Seed Content + Tests + Architecture Cleanup** (Feb 2026)
  - **PostHog Analytics**: Full product analytics integration with `posthog-js`. Dynamic `import()` prevents ad blockers from crashing the app. Event queue buffers events fired before async load completes, then flushes once ready. 30+ tracking helpers (`trackAudioUpload`, `trackAnalysisCompleted`, `trackRecipePublished`, `trackCheckoutStarted`, etc.). User identification via `identifyUser()` links anonymous events to authenticated users. `trackPageView()` fires on every React Router route change in `App.jsx`. PostHog configured for Product Analytics, Web Analytics, and Session Replay. `VITE_POSTHOG_KEY` env var on both local and Vercel production. API host: `us.i.posthog.com`.
  - **Seed Content**: 25 iconic Sound Sauces seeded via `supabase/seeds/seed_sound_sauces.sql`. Covers: 808 Bass (Trap), Reese Bass (DnB), Supersaw Lead (EDM), Pluck Synth (Future Bass), Wobble Bass (Dubstep), Pad Synth (Ambient), Acid Bass (Techno), Trap Hi-Hat Roll, Vinyl Piano (Lo-Fi), Talking Synth (Funk), Hardstyle Kick, Portamento Lead (R&B), Arp Sequence (Synthwave), Sub Bass (House), Vocal Chop (Pop), FM Bell (Ambient), Growl Bass (Riddim), String Pad (Cinematic), Drill 808 Slide, Flute Lead (Latin Trap), Phonk Cowbell, Jersey Club Kick Pattern, Detuned Chord Stab (Garage), OB-Xd Brass (Synthwave), Granular Texture (Experimental). Each entry has full `results` JSONB with features and recommendations. Dates staggered for natural-looking content.
  - **Demo Sound on Analyze Page**: `demoSoundGenerator.js` uses `OfflineAudioContext` to programmatically generate a 3-second Cm7 synth pad (sawtooth oscillators, filter sweep, ADSR envelope, subtle detune). Outputs WAV ArrayBuffer passed to `prepareAudioBuffer`. "Try Demo Sound" button on `AudioUploadSection.jsx`. Welcome card shown when no audio loaded.
  - **Test Suite (~115 tests)**: Vitest + @testing-library/react + jsdom. Config in `vite.config.js` `test` block. 6 test files: `AuthContext.test.jsx` (13 tests — sign in/out, profile fetch, tier helpers), `useSubscription.test.js` (30 tests — tier limits, canAnalyze/canPublish/canSeparateStems, remaining counts, free vs pro vs premium), `audioProcessor.test.js` (26 tests — frequencyToNote, BPM range, key format, ADSR), `vitalPresetGenerator.test.js` (curated presets valid JSON, all 40 presets build correctly, tuning params clamp, categories map, kick LFO), `useHistory.test.js` (15 tests — publish flow, error handling), `a11y.test.jsx` (4 tests — jest-axe accessibility checks for ARIA names, form labels, alt text, heading hierarchy).
  - **Error Boundaries**: `ErrorBoundary.jsx` class component wraps entire app (top-level catch-all in `App.jsx`) + wraps Analyze page specifically. Shows themed fallback card with AlertTriangle icon, error message, and "Reload" button. Uses `themeClasses` for dark/light mode support.
  - **Bundle Splitting**: `vite.config.js` `manualChunks` splits into 3 vendor chunks: `vendor-react` (47KB), `vendor-supabase` (171KB), `vendor-posthog` (175KB). Better long-term caching — vendor chunks rarely change. (Previously 4 chunks — `vendor-onnx` removed when CLAP replaced client-side ML detection.)
  - **Collapsible Avatar Presets**: `AvatarCreator.jsx` preset grid now hidden behind a "Choose a preset avatar" toggle button with ChevronDown/ChevronUp. Upload Photo button stays visible.
  - Files created: `src/lib/posthog.js`, `src/utils/demoSoundGenerator.js`, `src/components/ui/ErrorBoundary.jsx`, `supabase/seeds/seed_sound_sauces.sql`, `src/__tests__/setup.js`, `src/__tests__/AuthContext.test.jsx`, `src/__tests__/useSubscription.test.js`, `src/__tests__/audioProcessor.test.js`, `src/__tests__/vitalPresetGenerator.test.js`, `src/__tests__/useHistory.test.js`
  - Files modified: `src/main.jsx` (PostHog init), `src/App.jsx` (ErrorBoundary wrapping, trackPageView), `src/components/audio/AudioUploadSection.jsx` (demo button), `src/pages/Analyze.jsx` (demo flow, welcome CTA), `src/components/settings/AvatarCreator.jsx` (collapsible presets), `src/components/ui/index.js` (ErrorBoundary export), `vite.config.js` (manualChunks, test config), `package.json` (test scripts, vitest deps), `.env.local` (VITE_POSTHOG_KEY)
- [x] **Notifications + Achievement Badges + Resend-Inspired UI Theme** (Feb 2026)
  - **Notifications System**: Full notification system with DB triggers that auto-create notifications on likes, follows, comments, and recreations. `notifications` table with RLS (users see only own), `unread_notifications` denormalized count on profiles with trigger. `create_notification()` SECURITY DEFINER helper prevents self-notifications. `useNotifications` hook with optimistic markAsRead/markAllAsRead + abort ref pattern. Notifications page at `/notifications` grouped by time (Today/This Week/Earlier), click-to-navigate + mark as read. Bell icon in sidebar with red unread badge. `unreadNotifications` exposed via AuthContext for fast sidebar rendering.
  - **Achievement Badges**: 10 badges (first_analysis, first_recipe, first_like_given, first_like_received, first_follower, five_recipes, ten_followers, first_recreation, high_match, first_comment). `achievements` table with composite PK `(user_id, badge_type)`. `check_and_award_badge()` idempotent function creates `badge_earned` notifications. Badge check triggers on analyses/likes/follows/recreations/comments. `useAchievements` hook loads badges for any user. Profile page has Badges tab (4-col grid, earned colored, unearned grayed/locked). UserProfile page shows earned badges as horizontal pills.
  - **Resend-Inspired UI Theme**: Replaced squared edges (Ableton-style) with rounded corners throughout. Updated `themeClasses` in constants.js: cards `rounded-lg`, buttons `rounded-md`, inputs `rounded-md`, tags `rounded-full`. Sidebar nav items now use `rounded-lg` with softer active states. Updated 25+ component files (143 rounded corner additions). Exceptions: WaveformVisualizer + SpectrumAnalyzer stay squared (Canvas components).
  - Files created: `supabase/migrations/phase5a_notifications.sql`, `supabase/migrations/phase5b_achievements.sql`, `src/hooks/useNotifications.js`, `src/hooks/useAchievements.js`, `src/pages/Notifications.jsx`, `src/data/badges.js`
  - Files modified: `src/contexts/AuthContext.jsx` (unreadNotifications), `src/components/layout/Sidebar.jsx` (Bell icon + rounded nav), `src/App.jsx` (route), `src/pages/index.js`, `src/hooks/index.js`, `src/utils/constants.js` (rounded themeClasses), `src/pages/Profile.jsx` (Badges tab), `src/pages/UserProfile.jsx` (earned badges row), and 25+ component files for rounded corners
- [x] **Stripe Live Mode + Google OAuth Branding + Custom SMTP** (Feb 2026)
  - **Stripe Live**: Switched from test to live mode — created live secret key, products (Pro $7/mo, Premium $15/mo), webhook endpoint. All Vercel env vars updated to live keys (`STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_PREMIUM_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`). Real payments now active.
  - **Google OAuth Branding**: Updated Google Cloud Console OAuth consent screen — app name changed to "SoundSauce", uploaded custom logo (`public/logo-120.png` generated from favicon SVG). Google sign-in popup now shows "Share your data with SoundSauce" instead of "Supabase".
  - **Custom SMTP (Resend)**: Set up Resend account with `soundsauce.app` domain. Added DNS records (DKIM, SPF, DMARC) on Namecheap. Configured Supabase SMTP settings (host: `smtp.resend.com`, port: 465, sender: `noreply@soundsauce.app` / "SoundSauce"). Signup confirmation and password reset emails now branded as SoundSauce.
  - Files created: `public/logo-120.png`
- [x] **Admin Dashboard** (Feb 2026)
  - Admin-only `/admin` page with consolidated Supabase + Stripe analytics
  - `api/admin-stats.js` serverless endpoint: double-layer security (JWT + is_admin DB check), aggregates user counts, subscription breakdown, content stats, Stripe MRR, recent signups, top content
  - `is_admin` boolean column on profiles, exposed as `isAdmin` in AuthContext
  - Sidebar shows Shield icon "Admin" nav item only for admin users
  - Dashboard sections: overview cards (4-col grid), subscription breakdown with bar visualization, revenue (MRR + active subs + avg per subscriber), content stats (6-item grid), top content (top 5 by likes), recent signups (last 10 with tier badges)
  - Files created: `supabase/migrations/phase4c_admin.sql`, `api/admin-stats.js`, `src/pages/Admin.jsx`
  - Files modified: `src/contexts/AuthContext.jsx` (isAdmin), `src/App.jsx` (route), `src/pages/index.js` (export), `src/components/layout/Sidebar.jsx` (conditional admin nav)
- [x] **Onboarding Flow + Download Count Tracking** (Feb 2026)
  - **Onboarding Modal**: 3-step post-signup flow (Welcome → How It Works → Preferences). `onboarding_completed` boolean on profiles, backfills existing users as true. Integrated into Home.jsx, triggers when `profile.onboarding_completed === false`. Collects optional skill_level + daw_preference.
  - **Download Tracking**: `downloads` table with dedup partial index `(user_id, analysis_id) WHERE user_id IS NOT NULL`. `download_count` column on analyses with trigger (same pattern as like_count). Optimistic UI in RecipeDetail, count display in RecipeCard footer.
  - Files created: `supabase/migrations/phase4b_onboarding.sql`, `supabase/migrations/phase3e_download_tracking.sql`, `src/components/ui/OnboardingModal.jsx`
  - Files modified: `src/components/ui/index.js`, `src/pages/Home.jsx`, `src/components/recipe/RecipeDetail.jsx`, `src/components/recipe/RecipeCard.jsx`, `src/hooks/useRecipes.js`, `src/hooks/useFeed.js`, `src/pages/Profile.jsx`, `src/pages/UserProfile.jsx`
- [x] **Favicon + Dynamic Tab Titles** (Feb 2026)
  - Custom SoundSauce favicon (`public/favicon.svg`) — amber-to-dark-amber gradient square with sound wave bars, replaces default Vite logo
  - `usePageTitle` hook for dynamic document.title — all 9 page components use it (e.g., "Sound Sauce — Talking Synth | SoundSauce")
  - Sidebar logo: inline SVG matching favicon, always amber-to-dark-amber gradient regardless of theme
  - Updated `index.html` with favicon, meta description, theme-color
  - Files created: `public/favicon.svg`, `src/hooks/usePageTitle.js`
  - Files modified: `index.html`, `src/hooks/index.js`, all page components, `src/components/layout/Sidebar.jsx`
- [x] **Stripe Subscription Integration** (Feb 2026)
  - **DB**: `subscription_tier` (free/pro/premium), `subscription_status` (none/active/past_due/canceled/trialing), `stripe_customer_id` on profiles. `usage_tracking` table for monthly limits.
  - **Serverless**: `api/create-checkout.js` (Stripe Checkout), `api/create-portal.js` (billing portal), `api/stripe-webhook.js` (subscription lifecycle events)
  - **Frontend**: `useSubscription` hook with tier limits, usage tracking, limit enforcement. Settings page with billing section, usage stats, upgrade cards, manage subscription button. `UpgradePrompt` component for limit-hit UX.
  - **Tier Limits**: Free (10 analyses, 2 stems, 3 publishes, 20 storage), Pro (unlimited analyses, 20 stems, unlimited publishes/storage), Premium (all unlimited)
  - **Auth Context**: Added `tier`, `isSubscribed`, `isPro`, `isPremium`, `refreshProfile` to useAuth()
  - Sidebar shows tier badges (Zap for Pro, Crown for Premium)
  - Files created: `supabase/migrations/phase4a_subscriptions.sql`, `api/create-checkout.js`, `api/create-portal.js`, `api/stripe-webhook.js`, `src/hooks/useSubscription.js`, `src/components/ui/UpgradePrompt.jsx`, `src/pages/Settings.jsx`, `src/components/settings/AvatarCreator.jsx`
  - Files modified: `src/contexts/AuthContext.jsx`, `src/components/layout/Sidebar.jsx`, `src/App.jsx`, `src/pages/index.js`, `src/hooks/index.js`
- [x] **Home Page: Following Section** (Feb 2026)
  - Added "Following" section showing followed users' profiles (avatar, username, bio) on the Home page
  - Horizontally scrollable row of user cards linking to `/user/:username`
  - Fetches profile data from Supabase for all followed user IDs
  - "Find people" link to Search page when following nobody or as a footer link
  - Only visible when following at least one person
  - Placed between "Pick Up Where You Left Off" and "Your Feed" sections
  - Files modified: `src/pages/Home.jsx`
- [x] **Sidebar: Recent Analyses Visibility** (Feb 2026)
  - Recent analyses sub-tab under Analyze now only appears when on the `/analyze` page
  - Starts collapsed — user clicks to expand
  - Collapses and hides when navigating away from Analyze
  - Files modified: `src/components/layout/Sidebar.jsx`
- [x] **SoundRecipe -> SoundSauce Rebrand** (Feb 2026)
  - All user-facing "SoundRecipe" text changed to "SoundSauce" across the entire app
  - Custom domain purchased: soundsauce.app (Namecheap, $12/year)
  - Vercel custom domain configured (A record + CNAME)
  - Google OAuth credentials updated for new domain (JS origins + redirect URIs)
  - Supabase redirect URLs updated for new domain
  - Component export renamed: `SoundRecipe` -> `SoundSauce` in `SoundRecipe.jsx` and `analysis/index.js`
  - Files modified: `index.html`, `Sidebar.jsx`, `Home.jsx`, `Search.jsx`, `Discover.jsx`, `Profile.jsx`, `Settings.jsx`, `ResultsTabs.jsx`, `HistoryPanel.jsx`, `PublishModal.jsx`, `RecipeDetail.jsx`, `SoundRecipe.jsx`, `analysis/index.js`, `Analyze.jsx`
- [x] **Google OAuth + Auth Hardening** (Feb 2026)
  - **Google OAuth fully functional**: Google Cloud Console OAuth credentials created, Supabase Google provider enabled, redirect URLs configured
  - **DB trigger updated for multi-provider auth**: `handle_new_user` trigger now uses COALESCE fallback chains for `username` (username → full_name → name → email prefix) and `avatar_url` (avatar_url → picture) to handle both email and Google OAuth signups
  - **Username required at signup**: AuthModal username input now has `required`, `minLength={2}`, `maxLength={30}` validation
  - **Backfill migration**: `phase3d_google_oauth_trigger.sql` updates existing NULL usernames/avatars from auth metadata
  - Files created: `supabase/migrations/phase3d_google_oauth_trigger.sql`
  - Files modified: `supabase/schema.sql` (trigger update), `src/components/auth/AuthModal.jsx` (username validation)
- [x] **Code Audit: 15 Remaining Issues Fixed** (Feb 2026)
  - **HIGH: useComments stale closure** — Fixed optimistic rollback in `editComment`/`deleteComment` to capture snapshots via functional setState updater instead of closing over stale `comments` state
  - **HIGH: Dead useRecording barrel export** — Removed unused `export { useRecording }` from `src/hooks/index.js`
  - **HIGH: useMLDetection callback recreation** — Added `modelStatusRef` to read status without depending on state. `ensureModelLoaded`, `detectWithML`, `preloadModel` now have stable/minimal deps (note: useMLDetection.js later deleted when CLAP replaced client-side ML)
  - **MEDIUM: useLikes callback instability** — Added `likedIdsRef` synced via useEffect. `isLiked` and `toggleLike` read from ref, only depend on `[user]`
  - **MEDIUM: useFollows callback instability** — Same ref pattern. Added `followingIdsRef`. `isFollowing` and `toggleFollow` read from ref
  - **MEDIUM: Duplicate AudioContext in Analyze.jsx** — ML detection now reuses `audio.audioBuffer` instead of creating/closing a separate AudioContext
  - **MEDIUM: useRecipes buildQuery not memoized** — Wrapped `buildQuery()` in `useCallback` with proper deps. Added `debounceTimerRef` with cleanup
  - **MEDIUM: useFeed race condition** — Added `abortRef` counter pattern with `callId` checks after every async operation
  - **SEC-1: upload-preset.js no auth** — Added Supabase JWT validation (`auth.getUser(token)`). Returns 401 for missing/invalid tokens. Frontend callers (`usePresetPost.js`, `PublishModal.jsx`) now include auth token
  - **LOW: Deleted unused App.css** — Default Vite template CSS, not imported anywhere
  - Files deleted: `src/App.css`
  - Files modified: `src/hooks/useComments.js`, `src/hooks/index.js`, `src/hooks/useMLDetection.js`, `src/hooks/useLikes.js`, `src/hooks/useFollows.js`, `src/hooks/useRecipes.js`, `src/hooks/useFeed.js`, `src/pages/Analyze.jsx`, `api/upload-preset.js`, `src/hooks/usePresetPost.js`, `src/components/recipe/PublishModal.jsx`
- [x] **Instrument Detection Accuracy Improvements** (Feb 2026)
  - **Problem**: Analyzing a ~1 second bass synth loop returned brass, strings, vocal, etc. alongside bass. Two root causes: (1) non-bass instruments had weak penalties for bass-heavy signals — brass only subtracted `subBass * 2` while gaining points from harmonics/attack, (2) the "full mix" detector was absurdly sensitive — `highMid > 0.03` triggered broad-spectrum detection for any synth with overtones, which disabled the aggressive isolated-sound filtering.
  - **Fixes**:
    - Doubled/tripled sub-bass and bass energy penalties on brass, strings, woodwind, vocal
    - Added hard -3 penalty when low frequencies dominate mid frequencies (bass-heavy signals can't be brass/strings/etc.)
    - Raised `minScore` thresholds: brass 1.5→2.5, strings 1.0→2.0, woodwind 1.5→2.0, vocal 1.5→2.0
    - Raised broad-spectrum detection thresholds: `highMid > 0.03` → `> 0.08`, `mid > 0.05` → `> 0.12`
    - Multi-instrument full-mix detection now requires 3rd-place score to be ≥40% of top score
    - Isolated-sound score gap filter tightened from 1.5x to 1.3x, results capped at 3 max
  - Files modified: `src/workers/audio.worker.js` (detectInstruments function)
- [x] **Canvas-Based Waveform Overhaul** (Feb 2026)
  - **Problem**: Waveform used 200 `<div>` bars in flexbox — blocky, low resolution, max 4x zoom. Not suitable for sound design work where you need to see individual transients.
  - **Solution**: Complete Canvas-based rewrite with DAW-style rendering.
  - **New features**:
    - Mirrored waveform (positive + negative amplitudes from center line)
    - 64x zoom (up from 4x) with continuous scroll-wheel zoom
    - Hi-res data: Web Worker generates min/max pairs per ~64 samples (vs. 200 total points)
    - Three-layer Canvas: static waveform (redraws on zoom/scroll), animated overlay (60fps playhead), interaction handler
    - Minimap scrollbar with drag-to-pan (smooth horizontal scrolling)
    - Time markers that adapt precision to zoom level (minutes → seconds → milliseconds)
    - Auto-scroll follows playhead during zoomed playback
    - Ctrl/Cmd+scroll to zoom centered on cursor, Shift+drag to pan, pinch-to-zoom on mobile
    - Zoom reset button, retina/DPR-aware rendering
  - **Architecture**: Zoom/pan/interaction state managed internally by component (self-contained). Analyze.jsx passes `onSeek` and `onLoopRegionChange` callbacks instead of raw mouse handlers.
  - **Two-tier data**: 200-point preview (instant on upload, used for minimap) + hi-res min/max pairs from worker (enables deep zoom)
  - Files created: none (rewrite of existing)
  - Files modified: `src/components/audio/WaveformVisualizer.jsx` (complete rewrite, 150→~500 lines), `src/workers/audio.worker.js` (added GENERATE_WAVEFORM_DATA), `src/hooks/useAudioWorker.js` (added generateWaveformData), `src/hooks/useAudioProcessor.js` (added waveformHiResRef, trigger in prepareAudioBuffer), `src/pages/Analyze.jsx` (simplified props, removed mouse handlers)
- [x] **Analyze Workflow Reorder + Code Health Fixes** (Feb 2026)
  - **Problem**: Workflow was backwards — auto-detected instruments on upload (analyzing full mix, wasteful compute, 0.2 reliability), then asked user to pick instrument, then analyze. Detection ran on the wrong audio (full mix vs selected region).
  - **Solution**: Reordered to Upload → Listen/Browse waveform → Select region → Analyze → Show detected instruments → Pick instrument. Detection now runs on the exact region the user selected, making it both faster and dramatically more accurate.
  - **New workflow**:
    - On upload: `prepareAudioBuffer()` decodes audio + renders waveform immediately (no detection)
    - User browses waveform, selects region, clicks "Analyze"
    - Worker returns features + instrument detection together (on the selected region)
    - Gemini AI enhancement runs server-side in the background (~2-5s); heuristic results shown instantly
    - User can pick a different instrument → `reAnalyzeWithInstrument()` regenerates recommendations without re-running DSP
  - **New component**: `AnalyzeSection.jsx` — region indicator (green bar) + analyze button, shown before analysis
  - **Refactored component**: `InstrumentSelector.jsx` — now post-analysis only, removed metadata header + analyze button, added re-analyze button
  - **Code health fixes** (from parallel codebase audit of 21 issues):
    - CRITICAL: Fixed `bandComparison` → `bandDifferences` bug in `useRecreation.js` and `RecreationResult.jsx` (recreation per-band scores were completely broken)
    - HIGH: Fixed AudioContext leak in ML detection (try/finally pattern)
    - HIGH: Fixed `audio` object reference instability in `runAnalysis` dependency array (replaced with specific properties)
    - HIGH: Deleted dead `featureExtraction.js` (248 lines, never imported)
    - MEDIUM: Removed 3 debug console.log statements from `audio.worker.js`
    - MEDIUM: Removed unused sync analysis functions from `useAudioProcessor.js` return object (`calculateSpectralMatch`, `analyzeFilterEnvelope`, `detectModulation`, `detectWaveformType`)
  - Files created: `src/components/audio/AnalyzeSection.jsx`
  - Files deleted: `src/services/featureExtraction.js`
  - Files modified: `src/pages/Analyze.jsx` (major refactor), `src/hooks/useAudioProcessor.js` (added prepareAudioBuffer, cleanup), `src/components/audio/InstrumentSelector.jsx` (rewrite), `src/components/audio/index.js` (exports), `src/hooks/useRecreation.js` (bug fix), `src/components/recipe/RecreationResult.jsx` (bug fix), `src/workers/audio.worker.js` (cleanup)
- [x] **Region-Based Analysis (Analyze Selected Region)** (Feb 2026)
  - **Problem**: Analyzer always used the first 30 seconds of audio, ignoring the loop region. For full songs, `assessFeatureReliability()` dropped to 0.2 (20%), making Vital presets inaccurate.
  - **Solution**: When users select a loop region on the waveform (drag-to-select), clicking "Analyze" now analyzes only that region instead of the first 30 seconds.
  - **How it works**: `analyzeAudio(audioFileData, { regionStart, regionEnd })` slices the AudioBuffer to the selected region before sending to the Web Worker. Short, isolated sounds get reliability 1.0 across all features.
  - **UI changes**:
    - Green indicator bar shows "Analyzing selected region: 0:15 - 0:18 (3.0s)" above the analyze button when a loop is active (now in `AnalyzeSection.jsx`)
    - Analyze button changes to "Analyze Selection (3.0s)" with scissors icon (now in `AnalyzeSection.jsx`)
    - History entries include time range in title (e.g., "Song Name (0:15-0:18)")
  - Files modified: `src/hooks/useAudioProcessor.js` (region slicing), `src/pages/Analyze.jsx` (pass loop region)
- [x] **Search Page + Auth Fixes** (Feb 2026)
  - **Search Page (`/search`)**: Unified search for users and recipes with dedicated sidebar nav tab
    - Search bar with 300ms debounce searches both users (Supabase `ilike`) and recipes (Postgres FTS) simultaneously
    - Filter tabs: All / Recipes / Users to narrow results
    - When no query: shows Trending recipes (from `useFeed`) and Recent recipes (from `useRecipes`) as suggestions
    - User results: card grid with avatar, username, bio, inline FollowButton, click-to-navigate to `/user/:username`
    - Recipe results: reuses `RecipeGrid` with infinite scroll
    - Files created: `src/pages/Search.jsx`
    - Files modified: `src/App.jsx` (route), `src/pages/index.js` (export), `src/components/layout/Sidebar.jsx` (nav item)
  - **Auth: Email confirmation redirect fix**: `signUpWithEmail()` now passes `emailRedirectTo: window.location.origin` so confirmation emails redirect to the production app instead of localhost
  - **Auth: Username saved on signup**: `signUpWithEmail()` now accepts a `username` parameter, passes it as `raw_user_meta_data` so the DB trigger (`handle_new_user`) populates `profiles.username` automatically on signup
  - Files modified: `src/contexts/AuthContext.jsx`, `src/components/auth/AuthModal.jsx`
- [x] **Home Page: Post Preset** (Feb 2026)
  - Added "Post Preset" button to Home page header (top-right, matching Discover page style)
  - `PresetPostModal` integration on Home page with navigate-to-recipe on success
  - `useUserSearch` hook: Supabase `ilike` query on `profiles.username`, abort ref for stale request handling, filters out current user, returns up to 10 results
  - `UserSearch` component: debounced search input, dropdown with avatar/username/bio, inline `FollowButton` per result, click-to-navigate to `/user/:username`, click-outside-to-close
  - Files created: `src/hooks/useUserSearch.js`, `src/components/recipe/UserSearch.jsx`
  - Files modified: `src/pages/Home.jsx`, `src/hooks/index.js`, `src/components/recipe/index.js`
- [x] **Phase 3: Comments, Vital Presets, Standalone Presets** (Feb 2026)
  - **3A: Comments on Recipes**
    - DB: `comments` table with `parent_id` for threading, RLS policies, denormalized `comment_count` trigger
    - `useComments` hook: fetch comments tree, add comment, delete own comments
    - `CommentsSection` component: threaded comment display, reply UI, auth gate
    - Integrated into Recipe detail page
    - Files created: `supabase/migrations/phase3a_comments.sql`, `src/hooks/useComments.js`, `src/components/recipe/CommentsSection.jsx`
  - **3B: Vital Preset Sharing**
    - DB: Added `vital_preset_url` column to `analyses` table
    - Upload flow: Vital preset uploaded to Vercel Blob via `/api/upload-preset` endpoint
    - Download button on RecipeDetail page for recipes with attached presets
    - "Vital Preset" badge on RecipeCard when preset is available
    - Files created: `supabase/migrations/phase3b_vital_presets.sql`
  - **3C: Standalone Preset Posts**
    - DB: Added `post_type` column (`'recipe'` | `'preset'`) to `analyses` table with index
    - `usePresetPost` hook: states `idle → validating → uploading → saving → done | error`, reads `.vital` file, validates JSON, uploads to Vercel Blob, inserts into analyses
    - `PresetPostModal` component: file upload dropzone (drag-and-drop), title auto-fill from filename, description, tags, loading/error states
    - RecipeCard: "Preset" badge with Sliders icon for `post_type === 'preset'`
    - RecipeDetail: prominent download card for preset posts, analysis sections hidden when no analysis data
    - Discover page: "Post Preset" button (authenticated users only), opens PresetPostModal, navigates to new recipe on success
    - Reuses existing `/api/upload-preset` endpoint — zero new serverless functions
    - Files created: `supabase/migrations/phase3c_standalone_presets.sql`, `src/hooks/usePresetPost.js`, `src/components/recipe/PresetPostModal.jsx`
    - Files modified: `src/hooks/useRecipes.js`, `src/hooks/useFeed.js`, `src/components/recipe/RecipeCard.jsx`, `src/components/recipe/RecipeDetail.jsx`, `src/pages/Discover.jsx`, barrel exports
- [x] **Vercel Deployment Fix: SPA Routing + Serverless Functions** (Feb 2026)
  - Added `vercel.json` with SPA rewrite rule: all non-API routes → `index.html` (fixes 404 on `/discover`, `/recipe/:id`, etc.)
  - Fixed deploy command: `vercel build --prod` (compiles serverless functions) instead of `npm run build` (Vite only, missing `/api/` endpoints)
  - Confirmed all 4 serverless functions deployed: `upload-audio`, `upload-preset`, `separate-stems`, `check-stems`
  - Files created: `vercel.json`
- [x] **Vital Preset Accuracy Overhaul v3 — Filter Sweep + Brightness Fix** (Feb 2026)
  - **Problem**: Vital presets for the demo Cm7 pad sounded terrible — wrong filter cutoff, no filter movement, wrong waveform base. Root causes identified via Node.js simulation of the full analysis pipeline.
  - **Fix 1: Multi-window brightness/spectral centroid**: `calculateAudioFeatures()` now averages spectral centroid across up to 6 FFT windows instead of only the first 93ms. For a sound with a filter sweep starting at 200Hz, the old code reported brightness=0.03/centroid=353Hz; the new code captures the full sweep and reports the true average.
  - **Fix 2: Filter envelope sweep detection**: `analyzeFilterEnvelope()` now detects `bandpass` sweep direction (opens then closes) by comparing middle brightness vs first/last quarter. Previously only compared first vs last quarter, so a filter that goes 200→3500→600Hz was reported as "stable" since start and end are both dark. Also detects significant brightness movement via max-min range as a fallback. New return values: `peakCutoff`, `minCutoff`, `peakPosition` for better filter modulation routing.
  - **Fix 3: Pad foundation preset**: Changed `osc_1_wave_frame` from 48 (tri-saw blend) to 64 (sawtooth) — most pads are saw-based. OSC 2 also uses saw. Attack reduced to 0.3s, sustain raised to 0.75 for more typical pad shape.
  - **Fix 4: Smart filter cutoff for sweeps**: `adjustFilter()` now sets base cutoff based on sweep direction — bandpass/opening uses minCutoff as base (modulation sweeps up), closing uses peakCutoff. This means the base filter position is correct and env_2 recreates the sweep movement.
  - **Fix 5: Bandpass filter modulation**: `applyModulation()` handles `bandpass` sweep direction with env_2 attack/decay timed to match the peak position in the source audio. Modulation depth calculated from actual cutoff range (peakCutoff - minCutoff in semitones).
  - **Fix 6: OSC 2 wave frame sync**: `adjustOscillator()` now syncs OSC 2's wave frame with OSC 1 when both are active and using the same waveform family, ensuring both oscillators match the detected waveform.
  - Files modified: `src/workers/audio.worker.js` (brightness multi-window, filter sweep detection), `src/services/vitalPresetGenerator.js` (pad foundation, filter cutoff, bandpass modulation, osc sync)
- [x] **Vital Preset Generator Accuracy Overhaul v2** (Feb 2026)
  - Worker: `detectWaveformType()` skips attack transients (uses ADSR attack time + 10ms safety margin)
  - Worker: Lowered fundamental frequency search from 80 Hz to 30 Hz (fixes kick detection)
  - Worker: Multi-window FFT averaging (3-4 windows after attack) for more stable waveform classification
  - Worker: Fixed `analyzeFilterEnvelope()` cutoff formula to use actual frequency resolution instead of hardcoded 8kHz cap
  - Worker: Reordered `calculateAudioFeatures()` so ADSR runs before waveform detection (provides attack time)
  - Preset: `harmonicProfileToWaveFrame()` computes continuous wave frames (0-127) from harmonic density, odd/even balance, and rolloff rate
  - Preset: Per-feature reliability (`assessFeatureReliability()`) replaces single scalar — filter/effects stay reliable even for full mixes
  - Preset: `applyHarmonicsData()` uses detected harmonic peaks for OSC 2 interval tuning and unison detune from peak clustering
  - Preset: `applyKeyTranspose()` transposes oscillators so C4 plays the detected root note
  - Analyze.jsx: Now passes `analysis.features.harmonics` to preset generator
  - Files modified: `src/workers/audio.worker.js`, `src/services/vitalPresetGenerator.js`, `src/pages/Analyze.jsx`
- [x] **Profile Page Enhancements** (Feb 2026)
  - Added followers/following lists with modal (clickable stats grid, user list with avatars, follow/unfollow buttons)
  - Re-added DAW preference selector to profile page (2-column grid with Skill Level)
  - Fixed sidebar Recent sub-tab by decoupling from `useHistory` hook (fetches directly from Supabase)
  - Files modified: `src/pages/Profile.jsx`, `src/components/layout/Sidebar.jsx`
- [x] **Phase 2: Sharing + Discovery** (Feb 2026)
  - **2A: Publish Flow + Recipe Detail Page**
    - DB: Added `description`, `tags` (text[]), `search_vector` (tsvector) columns on analyses with GIN indexes
    - `PublishModal` component: title, description, predefined tag chips (Bass, Lead, Pad, Pluck, Kick, Drums, Strings, Vocal, FX) + custom tags
    - `RecipeDetail` component: full recipe view with author info, read-only analysis display
    - `RecipeCard` component: card for browse grids with title, description snippet, instrument, author, tags, date
    - `/recipe/:id` route: fetches public analysis by ID with profile FK join
    - Publish button added to `HistoryPanel` for unpublished cloud analyses (opens PublishModal)
    - `useHistory.publishRecipe(id, { description, tags })` sets `is_public` + metadata in one Supabase update
  - **2B: Discover Page (Browse, Search, Filter)**
    - `useRecipes` hook: cursor-based pagination (recent) + offset-based (popular), debounced FTS via `textSearch()`, tag filter via `.contains()`
    - `RecipeGrid` component: responsive grid (1/2/3 cols) with IntersectionObserver infinite scroll
    - Full `Discover.jsx` rewrite: search bar, clickable tag chips, sort toggle (Recent/Popular), loading skeletons, empty states
  - **2C: Likes + Public Profiles**
    - DB: `likes` table (composite PK), RLS policies, denormalized `like_count` on analyses, trigger function `update_like_count()`
    - `useLikes` hook: optimistic updates, loads all user likes on mount, `isLiked(id)` + `toggleLike(id)`
    - `LikeButton` component: heart icon filled/outlined with count
    - `UserProfile` page at `/user/:username`: avatar, bio, stats, follower/following counts, public recipe grid
    - "Popular" sort enabled on Discover (sorts by `like_count DESC`)
  - **2D: Follows + Activity Feed**
    - DB: `follows` table (composite PK, self-follow CHECK constraint), RLS policies
    - `useFollows` hook: optimistic updates, `isFollowing(userId)` + `toggleFollow(targetUserId)` + `fetchCounts(userId)`
    - `FollowButton` component: UserPlus/UserMinus toggle
    - `useFeed` hook: auth'd users see followed users' recipes, guests see trending (most liked in 7 days)
    - `Home.jsx` updated with real activity feed replacing placeholder content
  - **2E: Recreation Uploads + Spectral Match**
    - DB: `recreations` table with `match_score`, `band_scores` (jsonb), RLS policies
    - `useRecreation` hook: upload to Vercel Blob → client-side AudioContext decode → Web Worker `calculateSpectralMatch` → save to DB
    - `RecreationUpload` component: file dropzone with progress bar, auth gate
    - `RecreationResult` component: overall match score %, per-band bars (6 bands), EQ suggestions
    - `RecreationLeaderboard` component: top 10 recreations sorted by score
    - Recipe page updated with recreation section + leaderboard
  - Files created: `supabase/migrations/phase2a_publish.sql`, `phase2c_likes.sql`, `phase2d_follows.sql`, `phase2e_recreations.sql`, `src/hooks/useRecipes.js`, `useLikes.js`, `useFollows.js`, `useFeed.js`, `useRecreation.js`, `src/components/recipe/PublishModal.jsx`, `RecipeCard.jsx`, `RecipeDetail.jsx`, `RecipeGrid.jsx`, `LikeButton.jsx`, `FollowButton.jsx`, `RecreationUpload.jsx`, `RecreationResult.jsx`, `RecreationLeaderboard.jsx`, `src/pages/Recipe.jsx`, `UserProfile.jsx`
  - Files modified: `App.jsx` (routes), `Home.jsx` (feed), `Discover.jsx` (full rewrite), `Recipe.jsx` (likes/follows/recreation), `HistoryPanel.jsx` (publish button), `Analyze.jsx` (publishRecipe prop), `RecipeDetail.jsx` (like/follow), `RecipeCard.jsx` (like), barrel exports
- [x] **Phase 1: Auth + Cloud** (Feb 2026)
  - Supabase project setup (auth, PostgreSQL, storage)
  - Email sign-in/sign-up via AuthModal component (username required, 2-30 chars)
  - Google OAuth fully functional (Google Cloud Console + Supabase provider configured)
  - AuthContext + useAuth hook for auth state management
  - DB schema: `profiles` table (auto-created via trigger on signup) + `analyses` table with RLS policies
  - Avatar upload with Canvas-based 400x400 center-crop resize to Supabase Storage
  - Supabase Storage bucket (`avatars`) with per-user folder RLS policies
  - Hybrid `useHistory` hook: Supabase when authenticated, localStorage fallback for guests
  - One-time localStorage → Supabase migration on first sign-in (tracked by `audioAnalyzerHistory_migrated` key)
  - Public/private toggle on analyses (Globe/Lock icons in HistoryPanel)
  - Profile page: editable username/bio/skill level/DAW preference, avatar, stats, recent analyses
  - Sidebar: user avatar + email display, sign in/out button
  - Auth gating at feature level (save/publish), not route level — all pages accessible to guests
  - Removed mic recording from AudioUploadSection (untested feature, hook kept for future)
  - Files created: `src/lib/supabase.js`, `src/contexts/AuthContext.jsx`, `src/components/auth/AuthModal.jsx`, `supabase/schema.sql`, `supabase/storage.sql`, `.env.local`
  - Files modified: `main.jsx`, `Sidebar.jsx`, `Profile.jsx`, `Analyze.jsx`, `useHistory.js`, `HistoryPanel.jsx`, `AudioUploadSection.jsx`
- [x] **Phase 0: UI Restructure** (Feb 2026)
  - React Router navigation with sidebar
  - Pages: Home, Analyze, Discover, Profile
  - Mobile slide-in sidebar with hamburger menu
  - Colorful light mode (pink #ff4d8d + orange #ff6b35 gradients)
  - Updated 10+ components with theme-aware styling
- [x] **Code Cleanup** (~1,315 lines removed)
  - Removed Mix Reference Tool
  - Removed A/B Comparison features
  - Removed PDF/Text export (kept Vital export)
- [x] **Improved Instrument Detection for Full Mixes**
  - Multiple full mix detection methods (entropy, broad spectrum, multi-instrument)
  - Lowered score thresholds for better detection
  - Fixed ML model tensor shape errors
- [x] **Kick Pitch Envelope for Vital Presets**
  - Added pitch modulation (env_2 → osc_1_transpose) for characteristic "click to thump" sound
  - Base pitch set to -24 semitones (2 octaves down)
  - Fast pitch envelope decay (80ms) creates the pitch drop
  - 36 semitone modulation range (3 octaves)
  - Enabled distortion, compressor, EQ for punch
  - Filter turned OFF (not needed for kicks)
  - Files modified: `src/services/vitalPresetGenerator.js`
- [x] **Improved Heuristic Detection**
  - Added spectral flux feature for better drum/transient detection
  - Added crest factor feature for percussive vs sustained classification
  - Added 4 new instruments: strings, brass, woodwind, vocal (10 total heuristic instruments)
  - Improved polyphony detection using entropy-based approach
  - Added instrument profiles with idealAttack and idealBands for confidence tuning
  - UI now supports 19 instrument categories (including ML-detected types)
- [x] **Ableton-Inspired UI Redesign**
  - [x] Implemented clean, minimal aesthetic matching Ableton's design language
  - [x] Removed all emojis, replaced with lucide-react icons
  - [x] Removed all border-radius (squared edges throughout)
  - [x] Removed all color gradients (solid colors only)
  - [x] Removed purple/cyan/colorful accents (monochrome black/white/gray)
  - [x] Updated color palette: near-black backgrounds, white text, gray borders
  - [x] Orange accent (`#ff764d`) used only for waveform playhead
  - [x] Waveform shows orange for played portion during playback
  - [x] Updated all 16 components for consistent styling
  - [x] Updated constants.js theme system with new color values
  - [x] Updated index.css with CSS variables
  - [x] Files modified: constants.js, index.css, Header.jsx, AudioUploadSection.jsx, PlaybackControls.jsx, WaveformVisualizer.jsx, FeatureCard.jsx, InstrumentSelector.jsx, StemSelector.jsx, SpectrumAnalyzer.jsx, ADSREnvelope.jsx, ResultsTabs.jsx, ExportToolbar.jsx, ComparisonPanel.jsx, HistoryPanel.jsx, Tooltip.jsx, App.jsx
- [x] **Vital Preset Accuracy Overhaul**
  - [x] Fixed broken data pipeline (App.jsx:903-910) — correct property paths
  - [x] Fixed worker string returns (`lfoRate` via `.toFixed()` → `parseFloat()`)
  - [x] Rewrote `vitalPresetGenerator.js` with "instrument foundation + analysis tweaks" architecture
  - [x] Added curated instrument foundation presets (bass, lead, pad, pluck, kick, drums)
  - [x] Added analysis reliability detection (full track vs stem)
  - [x] Reliability-weighted adjustments: oscillator, filter, envelope, modulation, effects
  - [x] Harmonic profile → continuous wavetable frame mapping
  - [x] LFO/tremolo/vibrato → Vital mod matrix routing
  - [x] Filter cutoff from cascading sources (filterEnvelope → spectralCentroid → brightness)
  - [x] Second oscillator layering (sub for bass, detune for pads, harmonic for leads)
  - [x] Effects chain (chorus, reverb, distortion, EQ, compressor based on instrument/analysis)
- [x] **Mix Reference Tool - Phase 1**
  - [x] `useMixReference` hook for dual track state management
  - [x] `MixReferenceTool` component with dual upload dropzones
  - [x] Parallel stem separation for both tracks
  - [x] App mode toggle (Sound Analyzer / Mix Reference Tool)
  - [x] Progress tracking for both tracks independently
- [x] **Stem Separation (Replicate API + Demucs)**
  - [x] Vercel serverless API routes (`/api/separate-stems.js`, `/api/check-stems.js`)
  - [x] Replicate API integration with Demucs `htdemucs_ft` model
  - [x] `useStemSeparation` hook with polling, progress tracking, error handling
  - [x] `StemSelector` component with separation trigger, progress bar, stem cards
  - [x] Preview playback for individual stems (vocals, drums, bass, other)
  - [x] Download individual stems as MP3
  - [x] Analysis integration - selecting a stem analyzes isolated audio
  - [x] History entries track which stem was analyzed
  - [x] Cost: ~$0.05-0.10 per song via Replicate pay-per-use
- [x] **Phase 1 UI Improvements**
  - [x] Removed analysis button blocking during instrument detection (users can analyze immediately)
  - [x] Added tabbed results interface (Quick Recipe / Full Analysis / Synth Settings)
  - [x] Added mobile volume control with expandable slider
  - [x] Changed "Full Mix" terminology to "Whole Track" for clarity
  - [x] Created ResultsTabs component for organized results display
- [x] **UI Simplification for New Producers**
  - [x] Removed Key/Camelot Wheel section (overwhelming for beginners)
  - [x] Removed Spectrogram visualization (technical, not actionable)
  - [x] Removed Modulation Detection section (LFO, tremolo, vibrato, chorus)
  - [x] Removed duplicate Detected Instruments panel post-analysis
  - [x] Kept Filter Envelope (actionable synthesis info)
  - [x] Deleted unused Spectrogram.jsx and HarmonicSeries.jsx components
- [x] **Code Splitting & Performance**
  - [x] Lazy-load TensorFlow.js (dynamic import on first audio upload)
  - [x] Initial bundle reduced from 1,366KB to 320KB (76% smaller)
  - [x] TensorFlow loads on-demand (1,107KB only when needed)
- [x] **Vital Synth Preset Export**
  - [x] Created vitalPresetGenerator.js service with full preset template
  - [x] Maps analysis data to Vital parameters (oscillator, filter, ADSR, etc.)
  - [x] Waveform type → wavetable frame mapping
  - [x] Filter envelope → modulation routing
  - [x] Instrument-specific presets (bass, pad, pluck, lead, drums)
  - [x] Download button in Export menu generates .vital files
- [x] **ML Instrument Detection Improvements**
  - [x] Fixed YAMNet class mapping (old indices were completely wrong - 400s instead of 100-200s)
  - [x] Added correct AudioSet class indices for all instrument categories
  - [x] Added woodwind and electronic genre categories
  - [x] Multi-segment analysis (4 segments: beginning, 1/3, 2/3, end instead of first 10s only)
  - [x] Confidence calibration (power curve + RMS weighting for meaningful 15-95% scores)
- [x] **Component Architecture Refactor**
  - [x] Split App.jsx into modular components (2,737 → 1,640 lines, 40% reduction)
  - [x] Created component folders: ui, layout, audio, analysis, comparison, history
  - [x] Extracted 13 reusable components with clear responsibilities
  - [x] Organized hooks: useTheme, useHistory, useRecording, useAudioWorker
- [x] **Web Workers for Background Processing**
  - [x] Created audio.worker.js for heavy DSP operations
  - [x] Moved all CPU-intensive analysis off main thread
  - [x] Added progress callbacks for analysis status
- [x] **ML-based Instrument Detection (TensorFlow.js + YAMNet → EfficientAT → CLAP → Gemini 2.5 Flash)**
  - [x] ~~YAMNet (TF.js) → EfficientAT mn04 (ONNX Runtime Web) → CLAP (Replicate)~~ → Gemini 2.5 Flash (Google AI)
  - [x] ~~mlInstrumentDetection.js + useMLDetection.js~~ (deleted — AI detection is server-side only)
  - [x] Gemini zero-shot classification with 18 text labels, synchronous background refinement (~2-5s)
  - [x] "AI Suggested" badge shows when Gemini refines detection
  - [x] Heuristic results shown instantly; Gemini refines in ~2-5s
- [x] **Sound Design Blueprint UI**
  - [x] Synth Recipe module (oscillator, filter cutoff, character from analysis)
  - [x] Translation Layer on feature cards (raw values → actionable synth instructions)
  - [x] Mix Cheat Sheet (high-pass, body boost, clarity boost suggestions)
  - [x] SVG ADSR envelope visualization (Serum/Vital style curve)
  - [x] BPM confidence polish (highlights suggested tempo when confidence < 50%)
- [x] **Sound Replication Features**
  - [x] Waveform detection (sine/saw/square/triangle/pulse/complex) with harmonic profile
  - [x] Filter envelope analysis (cutoff, resonance, sweep direction)
  - [x] Modulation detection (LFO rate, tremolo, vibrato, chorus/detune)
  - [x] A/B spectral matching with match score and EQ suggestions
  - [x] Dynamic recommendations based on actual analysis (not just instrument category)
- [x] **Performance Optimizations**
  - [x] FFT implementation (Cooley-Tukey radix-2) - ~300x faster than DFT
  - [x] Throttled visualization state updates (60fps refs, 20fps React state)
  - [x] Audio buffer caching (avoid re-decoding on repeat analysis)
- [x] **Mobile & Accessibility**
  - [x] Mobile responsive layout (touch targets, stacked grids)
  - [x] Touch events for waveform interaction
  - [x] ARIA labels and keyboard navigation
- [x] **DJ Features**
  - [x] Camelot wheel notation for harmonic mixing
  - [x] Compatible keys display
  - [x] Half/double tempo suggestions
- [x] A/B comparison mode (compare two audio files side-by-side)
- [x] ~~Harmonic series display~~ (removed - cluttered UI for beginners)
- [x] ~~Spectrogram visualization~~ (removed - technical, not actionable)
- [x] ~~Key/Camelot wheel display~~ (removed - overwhelming for beginners)
- [x] ~~Modulation detection UI~~ (removed - too technical)
- [x] Zoomable waveform (1x-4x zoom with scroll)
- [x] ~~Microphone recording input~~ (removed - untested, hook kept for future)
- [x] Copy recommendations to clipboard button
- [x] ADSR envelope analysis and visualization graph
- [x] Key/Scale detection (Krumhansl-Schmuckler algorithm with Pearson correlation)
- [x] BPM detection (onset detection + autocorrelation + harmonic validation)
- [x] Keyboard shortcuts (Space, Enter, Arrow keys, L, Esc)
- [x] Click-to-seek on waveform (single click seeks, drag creates loop)
- [x] Dynamic instrument selector (shows only detected instruments + Full Mix)
- [x] Auto-detect instruments on audio upload
- [x] Frequency band analysis (sub-bass, bass, low-mid, mid, high-mid, high)
- [x] Real-time brightness (spectral centroid) for dynamic visualization
- [x] Refactor core audio logic into `useAudioProcessor.js` custom hook
- [x] Memory leak prevention for AudioContext lifecycle
- [x] Dark/light theme support
- [x] Export functionality (PDF/Text)
- [x] Analysis history with localStorage persistence

---

## Notes for Development

### Supabase Setup
- **Project URL**: Set in `.env.local` as `VITE_SUPABASE_URL`
- **Anon Key**: Set in `.env.local` as `VITE_SUPABASE_ANON_KEY` (JWT format `eyJ...`)
- **DB Schema**: Run `supabase/schema.sql` in SQL Editor (profiles table, analyses table, RLS policies, triggers)
- **Storage**: Run `supabase/storage.sql` in SQL Editor (avatars bucket with per-user folder policies)
- **Migrations**: Run all files in `supabase/migrations/` in order (phase2a → phase2c → phase2d → phase2e → phase3a → phase3b → phase3c → phase3d → phase3e → phase4a → phase4b → phase4c → phase5a → phase5b → phase6a → phase6b → phase4d_remove_premium → phase7b_resume_analysis)
- **Auth providers**: Email enabled by default; Google OAuth fully configured (Supabase Dashboard → Authentication → Sign In / Providers → Google → enabled with Google Cloud Console OAuth credentials). Custom SMTP configured via Resend (`smtp.resend.com`) — emails sent from `noreply@soundsauce.app` as "SoundSauce"
- **Redirect URLs**: In Supabase Dashboard → Authentication → URL Configuration, set Site URL to `https://soundsauce.app` and add it (plus `https://audio-analyzer-pro.vercel.app`) to Redirect URLs. Without this, email confirmation links redirect to localhost
- **Username on signup**: `signUpWithEmail()` passes username as `raw_user_meta_data`, which the `handle_new_user` trigger reads to populate `profiles.username` automatically
- **RLS**: All tables (`profiles`, `analyses`, `likes`, `follows`, `recreations`, `comments`, `downloads`, `usage_tracking`) have Row Level Security enabled
- **Auto-profile creation**: A database trigger (`handle_new_user`) automatically creates a profile row when a user signs up. Uses COALESCE fallback chain: username from `username` → `full_name` → `name` → email prefix; avatar from `avatar_url` → `picture`. This handles both email signups (which pass `username`) and Google OAuth (which provides `name`/`full_name`/`picture`)
- **Like count trigger**: `update_like_count()` function auto-increments/decrements `analyses.like_count` on likes table changes
- **Comment count trigger**: `update_comment_count()` function auto-increments/decrements `analyses.comment_count` on comments table changes
- **Download count trigger**: `update_download_count()` function auto-increments/decrements `analyses.download_count` on downloads table changes
- **Unread notification count trigger**: `update_unread_notification_count()` maintains `profiles.unread_notifications` on notification INSERT/UPDATE/DELETE
- **Auto-notification triggers**: `notify_on_like()`, `notify_on_follow()`, `notify_on_comment()`, `notify_on_recreation()`, `notify_on_message()`, `notify_on_challenge_submission()` — automatically create notifications when users interact with content. Uses `create_notification()` SECURITY DEFINER helper that prevents self-notifications
- **Badge check triggers**: `check_analysis_badges()`, `check_publish_badges()`, `check_like_badges()`, `check_follow_badges()`, `check_recreation_badges()`, `check_comment_badges()` — automatically award badges when milestones are hit. Uses `check_and_award_badge()` idempotent function (ON CONFLICT DO NOTHING) that creates `badge_earned` notifications
- **Admin engagement RPC**: `get_active_users_by_day(cutoff_date)` — SQL function (SECURITY DEFINER) that UNIONs activity across analyses, comments, likes, and recreations tables, grouped by date. Used by `admin-stats.js` Users tab for DAU/WAU/MAU computation. Must be created manually in Supabase SQL Editor.

### Database Tables
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles (auto-created on signup) | `id`, `username`, `avatar_url`, `bio`, `skill_level`, `daw_preference`, `subscription_tier`, `subscription_status`, `stripe_customer_id`, `onboarding_completed`, `is_admin`, `unread_notifications` |
| `analyses` | Audio analyses / Sound Sauces / Presets | `id`, `user_id`, `title`, `description`, `tags`, `is_public`, `like_count`, `comment_count`, `download_count`, `post_type`, `vital_preset_url`, `audio_url`, `stem_urls` (JSONB), `results`, `search_vector` |
| `likes` | Recipe likes (composite PK) | `user_id`, `analysis_id`, `created_at` |
| `follows` | User follows (composite PK, no self-follow) | `follower_id`, `following_id`, `created_at` |
| `recreations` | Recreation attempts with match scores | `id`, `user_id`, `analysis_id`, `audio_url`, `match_score`, `band_scores` |
| `comments` | Recipe comments with threading | `id`, `user_id`, `analysis_id`, `parent_id`, `content`, `created_at` |
| `downloads` | Preset download tracking | `id`, `user_id` (nullable), `analysis_id`, `created_at` |
| `usage_tracking` | Monthly usage counters per user | `id`, `user_id`, `period`, `analyses_count`, `stems_count`, `publishes_count`, `created_at`, `updated_at` |
| `notifications` | User notifications (likes, follows, comments, messages, challenges, etc.) | `id`, `user_id`, `actor_id`, `type`, `reference_id`, `reference_title`, `is_read`, `created_at` |
| `achievements` | Achievement badges (composite PK, one per user per type) | `user_id`, `badge_type`, `earned_at` |
| `conversations` | DM conversations (canonical ordering, mutual follow gating) | `id`, `user_a_id`, `user_b_id`, `is_request`, `last_message_at`, `last_message_preview`, `unread_a`, `unread_b`, `created_at` |
| `messages` | Direct messages within conversations | `id`, `conversation_id`, `sender_id`, `content` (2000 char), `is_read`, `created_at` |
| `challenges` | Weekly sound recreation challenges | `id`, `creator_id`, `title`, `description`, `sound_sauce_id`, `reference_audio_url`, `start_date`, `end_date`, `submission_count`, `created_at` |
| `challenge_submissions` | User submissions to challenges (UNIQUE per user per challenge) | `id`, `user_id`, `challenge_id`, `audio_url`, `match_score`, `band_scores`, `created_at` |

### Audio Context Considerations
- AudioContext is lazily created via `getAudioContext()` in the hook
- Browser autoplay policy is handled automatically (resume on suspended)
- All audio nodes are properly cleaned up on unmount via `cleanup()` function
- Decoded AudioBuffers are cached in `audioBufferRef` to avoid re-decoding

### Memory Leak Prevention
The `useAudioProcessor` hook implements comprehensive cleanup:
- `cleanup()` function disposes of all audio resources
- Animation frames are cancelled on pause/stop/unmount
- BufferSource nodes are stopped and disconnected before disposal
- AudioContext is closed when no longer needed

### Performance Optimizations
- **Web Worker**: Heavy DSP runs in background thread, keeping UI responsive
- **FFT**: Cooley-Tukey radix-2 algorithm replaces O(n²) DFT calculations
- **Throttled State**: Visualization updates refs at 60fps but React state at ~20fps (50ms interval)
- **Buffer Caching**: `audioBufferRef` stores decoded audio to avoid re-decoding
- **Waveform Downsampling**: 200 points for efficient rendering
- **Spectrogram Limiting**: Max 100 frames for performance
- **Analysis Limiting**: First 30 seconds analyzed for long files

### Architecture Decisions
- **Component-Based Architecture**: UI split into focused, reusable components by domain (audio, analysis, auth, comparison)
- **Separation of Concerns**: DSP in worker, audio control in hooks, UI in components, orchestration in App.jsx
- **Custom Hook Pattern**: Domain-specific hooks (useAudioProcessor, useTheme, useHistory, useStemSeparation)
- **Web Worker Pattern**: Heavy DSP offloaded to background thread via useAudioWorker
- **No External Audio Libraries**: Web Audio API used directly for full control
- **Hybrid Storage**: Analysis history uses Supabase when authenticated, localStorage fallback for guests
- **Auth Gating at Feature Level**: All pages accessible to guests; save/publish require sign-in
- **Supabase Auth Pattern**: `onAuthStateChange` ONLY sets user state + loading; profile fetching in separate `useEffect` (DB queries inside callback break because client may not be ready)
- **One-Time Migration**: localStorage → Supabase migration runs on first sign-in, tracked by `audioAnalyzerHistory_migrated` key
- **Ref Pattern for Stable Functions**: Hook functions stored in refs to avoid useEffect dependency issues
- **Prebuilt Deployment**: Local builds deployed to Vercel to avoid remote build issues
- **Serverless API Pattern**: Stem separation uses Vercel Functions as a proxy to Replicate API (keeps API keys secure)
- **Optimistic UI Updates**: Likes/follows update local state immediately, revert on Supabase error
- **Composite Primary Keys**: `likes(user_id, analysis_id)` and `follows(follower_id, following_id)` prevent duplicates at DB level
- **Denormalized Counts**: `analyses.like_count` maintained by PostgreSQL trigger for fast "Popular" sort without COUNT queries
- **Dual Pagination Strategy**: Cursor-based for "Recent" sort (unique `created_at`), offset-based for "Popular" sort (non-unique `like_count`)
- **Full-Text Search**: PostgreSQL `tsvector` generated column with weighted A (title) + B (description) fields, GIN indexed
- **Client-Side Spectral Match**: Recreation comparison runs entirely client-side (AudioContext decode → Web Worker FFT) to avoid server costs
- **Stale Request Handling**: `useRecipes` uses abort counter ref to discard results from superseded fetch calls
- **PostgREST FK Hint Syntax**: When querying `analyses` with profile joins, must use `profiles:user_id(username, avatar_url)` instead of `profiles(username, avatar_url)` because multiple tables (`likes`, `follows`, `recreations`) also reference `profiles`, causing PostgREST HTTP 300 ambiguity errors
- **SPA Routing on Vercel**: `vercel.json` has a rewrite rule sending all non-API routes to `index.html` for React Router. Without this, direct navigation to `/discover`, `/recipe/:id`, etc. returns 404
- **`vercel build` vs `npm run build`**: MUST use `vercel build --prod` for deployments — `npm run build` (Vite only) does NOT compile serverless functions, causing missing `/api/` endpoints in production
- **Region-Based Analysis for Accuracy**: `analyzeAudio` accepts `{ regionStart, regionEnd }` options to slice the AudioBuffer to a user-selected loop region. This is critical for accuracy: full songs get 0.2 reliability in `assessFeatureReliability()`, but isolated 2-5 second regions of a specific instrument get 1.0 reliability, dramatically improving Vital preset accuracy. The existing waveform loop UI (drag-to-select, 1x-4x zoom) is reused — no new UI paradigm needed.
- **Deferred Instrument Detection**: On upload, only `prepareAudioBuffer()` runs (decode + waveform), NOT instrument detection. Detection happens inside `runAnalysis()` on the selected region, so it's both faster (no wasted compute on full mix) and more accurate (analyzes exactly what the user selected). The `detectInstrumentsFromAudioData()` function still exists but is no longer called on upload.
- **Quick Re-analyze Pattern**: When user picks a different instrument post-analysis, `reAnalyzeWithInstrument()` only regenerates recommendations via `generateInstrumentRecommendations()` — no DSP re-run needed since the audio region hasn't changed. Exception: selecting a stem type triggers full re-analysis because it's different audio data.
- **Full Mix Guidance UX**: When a full mix is detected, `InstrumentSelector` shows a `FullMixGuidance` banner instead of the instrument grid. Two action cards: "Separate Stems" (scrolls to stem section via ref) and "Select a Region" (scrolls to waveform via ref). Instrument grid hidden behind collapsible toggle. Smart detection in `Analyze.jsx` uses an IIFE to compute `shouldShowMixGuidance` from EITHER worker's `isFullMix` flag OR (full track analyzed + audio >10s + ≥3 `instrumentsAboveThreshold`). The `instrumentsAboveThreshold` metric (added to worker return) counts instruments passing minScore BEFORE aggressive filtering, catching cases where a dominant instrument (e.g., pad at 71%) triggers `hasCleanWinner` and bypasses all 4 full-mix detection methods.
- **Stem-First UX**: The Analyze page action area adapts based on audio duration and stem state. Short audio (≤15s) or a selected loop region shows the original `AnalyzeSection` + `StemSelector` layout. Long audio (>15s) without stems shows a stem-first guidance card with "Separate Stems" as the primary CTA (gradient button) and "Analyze Full Track" as secondary. After stems are ready, each stem card has its own Analyze button via `onAnalyzeStem` prop. `runAnalysis(stemTypeOverride)` accepts an optional stem type to directly trigger analysis without waiting for `setSelectedInstrument` state propagation. `analyzingStemType` state tracks which stem is being analyzed during the async operation for accurate UI indicators.
- **Ephemeral Stem Buffers**: When `analyzeAudio()` decodes a stem's ArrayBuffer, it does NOT cache the result into `audioBufferRef` — that ref belongs to the full mix and is used by waveform rendering, playback controls, and the spectrum analyzer. Source identity is tracked via `audioBufferSourceRef` to determine cache validity. If `audioFileData !== audioBufferSourceRef.current`, the data is decoded fresh. Only the initial full-mix decode populates `audioBufferRef`.
- **User-Driven Instrument Selection (Smart Defaults)**: After analysis completes, the top detected instrument is auto-selected as a "smart default" and recommendations generate immediately. For known stem types, auto-mapping applies: bass→'bass', drums→'drums', vocals→'vocal'. The "other" stem and non-stem analysis use the top heuristic/ML detection result. `InstrumentSelector.onSelectInstrument` calls `reAnalyzeWithInstrument()` directly — tapping a different instrument instantly regenerates recommendations without re-running DSP. No "Re-analyze" button needed. Detection is a suggestion, not a gatekeeper.
- **Supabase Duplicate Email Detection**: Supabase's `signUp` with an already-registered email (when email confirmation is enabled) returns `{ data: { user: { identities: [] } }, error: null }` — no error, but an empty identities array. `signUpWithEmail()` checks `data.user.identities?.length === 0` and returns a synthetic error to prevent phantom user creation in analytics.
- **Ref Pattern for Stable Hook Functions**: `prepareAudioBuffer` and other hook functions are stored in refs (`prepareAudioBufferRef`) in `Analyze.jsx` to avoid useEffect dependency instability. The ref is synced in a separate useEffect, and the main effect reads from the ref.
- **Three-Layer Canvas Architecture**: WaveformVisualizer uses 3 stacked canvases: (1) static waveform layer redrawn only on zoom/scroll/resize/theme change, (2) overlay layer redrawn at 60fps during playback for playhead + played portion + loop region, (3) interaction div on top for mouse/touch events. This ensures expensive waveform rendering doesn't run every frame — only the lightweight overlay animates.
- **Two-Tier Waveform Data**: 200-point preview (`waveformData` state) renders instantly on upload for the minimap and quick fallback. Hi-res min/max pairs (`waveformHiResRef` ref) are generated asynchronously in the Web Worker with ~1 pair per 64 source samples, enabling 64x zoom. The ref is polled by the Canvas component until data arrives, avoiding React state updates.
- **Self-Contained Waveform Component**: All zoom/pan/interaction state is managed internally by `WaveformVisualizer.jsx`. Parent (`Analyze.jsx`) only passes semantic callbacks (`onSeek`, `onLoopRegionChange`) instead of raw mouse handlers. This eliminated `waveformZoom`, `isSettingLoop`, `loopDragStart`, `waveformRef` from Analyze.jsx.
- **Transferable Buffers for Worker Data**: The `GENERATE_WAVEFORM_DATA` worker message uses `postMessage(..., [mins.buffer, maxes.buffer])` for zero-copy ArrayBuffer transfer. This avoids serialization overhead for the ~1MB hi-res data.
- **Functional setState for Safe Optimistic Rollback**: In `useComments`, optimistic updates use `setComments(prev => { snapshot = prev; return prev.map/filter(...) })` to capture the rollback snapshot atomically. The previous pattern (`const prev = comments; setComments(...)`) was a stale closure bug — `comments` captured the value at callback creation time, not at execution time.
- **Ref Pattern for Set/Map State in Callbacks**: Hooks that expose callbacks reading from Set/Map state (`useLikes`, `useFollows`) use a synced ref (`likedIdsRef`, `followingIdsRef`) so the callback doesn't depend on the Set in its dependency array (which would cause instability since Sets are new objects on every update). The ref is synced via `useEffect(() => { ref.current = state }, [state])`.
- **Abort Ref Counter for Race Conditions**: `useFeed` and `useRecipes` use an `abortRef = useRef(0)` counter. Each fetch increments it and captures the `callId`. After every `await`, it checks `if (callId !== abortRef.current) return` to discard stale results from superseded calls.
- **Serverless Function Auth Validation**: `/api/upload-preset.js` validates JWT tokens server-side using `supabase.auth.getUser(token)`. Frontend callers include the token via `Authorization: Bearer ${session.access_token}`. This prevents unauthenticated users from uploading files to Vercel Blob.
- **Google OAuth Metadata Handling**: The `handle_new_user` DB trigger uses COALESCE chains because different auth providers send different metadata keys. Email signups send `username` in `raw_user_meta_data`, Google OAuth sends `name`/`full_name`/`picture`. The trigger normalizes both into `profiles.username` and `profiles.avatar_url`.
- **Google OAuth Configuration**: Requires three pieces: (1) Google Cloud Console OAuth Client ID (Web application type) with redirect URI `https://<project-ref>.supabase.co/auth/v1/callback` and JS origins including `https://soundsauce.app`, (2) Client ID + Secret entered in Supabase Dashboard → Authentication → Sign In / Providers → Google, (3) Redirect URLs in Supabase URL Configuration including `https://soundsauce.app`, production Vercel URL, and localhost. OAuth consent screen branding set to "SoundSauce" with custom logo (`public/logo-120.png`) so Google sign-in popup shows app name instead of "Supabase".
- **Custom SMTP via Resend**: Supabase's built-in email service has a 4 emails/hour rate limit and shows "Supabase" as sender. Configured Resend SMTP (`smtp.resend.com:465`, username `resend`, password is Resend API key) in Supabase → Authentication → Email → SMTP Settings. Sender: `noreply@soundsauce.app` / "SoundSauce". Requires DNS records on `soundsauce.app`: DKIM (TXT `resend._domainkey`), SPF (MX + TXT on `send` subdomain), optional DMARC.
- **Stripe Live Mode**: All Stripe environment variables use live keys (`sk_live_`, `pk_live_`, live `price_` IDs, live `whsec_` webhook secret). Live product: Pro $10/mo (simplified from original 3-tier model). `STRIPE_PREMIUM_PRICE_ID` env var kept for backwards compat — webhook maps it to 'pro'. Webhook endpoint: `https://www.soundsauce.app/api/stripe-webhook` listening for 3 events. Admin can manually set user tiers via Supabase SQL: `UPDATE profiles SET subscription_tier = 'pro' WHERE username = '...';`
- **Stripe Subscription Architecture**: Three serverless endpoints handle the Stripe lifecycle: `create-checkout` creates Checkout Sessions with `client_reference_id` for user mapping, `stripe-webhook` processes subscription events (checkout completed, subscription updated/deleted) using raw body parsing for signature verification and a service role Supabase client to bypass RLS, `create-portal` generates billing portal URLs. Stripe Price IDs are mapped to tier names via env vars (`STRIPE_PRO_PRICE_ID`; `STRIPE_PREMIUM_PRICE_ID` kept for backwards compat, maps to 'pro').
- **Usage Tracking Pattern**: `usage_tracking` table uses `(user_id, period)` unique constraint where period is `YYYY-MM` format. `useSubscription` hook auto-creates or upserts the current period row. Limit checks are derived: `canAnalyze()` compares `usage.analyses_count` against `limits.analyses`. Monthly reset is implicit — new month creates new row.
- **Admin Dashboard Security**: Double-layer access control. Layer 1: JWT auth via anon Supabase client (`auth.getUser(token)`). Layer 2: Admin check via service role client (`profiles.is_admin`). Frontend also gates on `isAdmin` from AuthContext, but server-side check prevents API abuse.
- **Onboarding Backfill Pattern**: Migration adds `onboarding_completed DEFAULT false` then immediately runs `UPDATE profiles SET onboarding_completed = true`. This ensures existing users skip onboarding while new signups (who get the default `false`) see it.
- **Download Deduplication**: `downloads` table has a unique partial index `(user_id, analysis_id) WHERE user_id IS NOT NULL` — authenticated users can only count once per recipe, but anonymous downloads (null user_id) are always tracked. The trigger maintains `analyses.download_count` for fast display.
- **Notification Architecture**: Notifications are created server-side by PostgreSQL triggers (SECURITY DEFINER), not by frontend code. When a user likes/follows/comments/recreates, the trigger on that table calls `create_notification()` which inserts into the notifications table. The `create_notification()` helper prevents self-notifications (actor = recipient → no-op). RLS ensures users can only SELECT/UPDATE/DELETE their own notifications — no INSERT policy exists for regular users. The `unread_notifications` count on profiles is maintained by a separate trigger on the notifications table, giving O(1) badge rendering in the sidebar.
- **Achievement Badge Idempotency**: `check_and_award_badge()` uses `INSERT ... ON CONFLICT DO NOTHING` — calling it multiple times for the same badge is safe. Badge check triggers run on every INSERT to the relevant table but only award on milestone counts (1st, 5th, 10th, etc.). When a badge is newly awarded, it creates a `badge_earned` notification — but since `create_notification()` prevents self-notifications (actor = recipient for badges), these are silently skipped. The `useAchievements` hook accepts an optional `targetUserId` so it can load badges for any user (used on public UserProfile pages).
- **Resend-Inspired UI Theme**: The `themeClasses` object in `constants.js` now includes rounded corner classes (`rounded-lg`, `rounded-md`, `rounded-full`) in card/button/input/tag values. This propagates to ~70% of components automatically since they read from `t.card`, `t.button`, etc. The remaining 30% of components that hardcode Tailwind classes were updated individually. Intentional exceptions: `WaveformVisualizer.jsx` and `SpectrumAnalyzer.jsx` (Canvas-based DAW-style components) keep squared edges.
- **PostHog Dynamic Import Pattern**: `posthog-js` is loaded via `import('posthog-js')` inside `initPostHog()` (not a static top-level import). This prevents ad blockers or privacy extensions from crashing the entire app — if the module fails to load, the `.catch()` handler logs a warning and clears the event queue. All tracking functions use a null-safe `capture()` wrapper. The `VITE_POSTHOG_KEY` env var is baked into the JS bundle at build time by Vite.
- **PostHog Event Queue**: Events fired before PostHog finishes loading asynchronously are pushed to an `eventQueue` array. Once PostHog's `loaded` callback fires, `flushQueue()` replays all buffered events. This ensures the first pageview (which fires in `App.jsx useEffect` before the dynamic import resolves) is never lost. The queue also handles `identify()` and `reset()` calls.
- **PostHog Capture Endpoint Gotcha**: PostHog's `/capture` and `/batch` endpoints ALWAYS return `{"status":"Ok"}` with HTTP 200, even with an invalid API key. This is by design (CDN edge nodes accept events without validation). Only the `/decide` endpoint validates the key — use it to diagnose key issues. The `/decide` endpoint returns 401 for invalid keys.
- **Error Boundary Architecture**: `ErrorBoundary` is a class component (React requirement). Two instances: (1) top-level in `App.jsx` wrapping everything inside `PageLayout` — catches catastrophic errors, (2) wrapping the `<Analyze />` route specifically since it's the most complex page with Web Audio API, Web Workers, and Canvas rendering. Fallback UI shows themed card with AlertTriangle icon and Reload button.
- **Vendor Chunk Splitting**: `vite.config.js` `manualChunks` separates vendor dependencies into 3 chunks: `vendor-react` (React + Router), `vendor-supabase` (Supabase client), `vendor-posthog` (PostHog). These change independently of app code, so browsers cache them separately. The previous `vendor-onnx` chunk was removed when server-side AI detection (CLAP, later Gemini) replaced client-side ML detection.
- **Gemini AI Server-Side Instrument Detection**: Replaced CLAP (Replicate Cog) with Google Gemini 2.5 Flash for zero-shot instrument classification. Gemini natively understands audio — no custom model deployment needed. Synchronous architecture: single POST to `/api/instrument` fetches audio from Vercel Blob, sends base64-encoded audio inline to Gemini with 18 text labels and a structured JSON `response_schema`, returns `[{ label, score }]` directly in ~2-5 seconds. Results mapped via `AI_LABEL_MAP` in Analyze.jsx (18 text labels to app instrument categories). Abort ref counter pattern (`aiAbortRef`) prevents stale results from overwriting newer detections. Fallback: if Gemini fails, heuristic results remain. Benefits: dramatically more accurate than heuristic-only detection, handles any instrument description (zero-shot), no model deployment/maintenance, ~$0.001 per inference (10-50x cheaper than CLAP on Replicate), guaranteed valid JSON via response schema, ~2-5s latency (was ~10-15s with CLAP polling). The legacy CLAP Cog model package still lives in `clap-model/` at project root but is no longer used.
- **Demo Sound Generator**: `demoSoundGenerator.js` uses `OfflineAudioContext` (not real-time `AudioContext`) to render a 3-second Cm7 synth pad. Sawtooth oscillators with subtle detuning, low-pass filter sweep (200Hz → 2000Hz), ADSR amplitude envelope. Output is converted to 16-bit PCM WAV ArrayBuffer via `audioBufferToWav()`. This WAV data is passed directly to `prepareAudioBuffer()` as if the user uploaded a file. Also exports `generatePresetPreview(presetId, duration)` which renders a 2-second audio preview of any curated Vital preset — maps preset settings to Web Audio nodes (oscillator type from `osc_1_wave_frame`, filter from cutoff/resonance, ADSR envelope, second oscillator with transpose, unison voices with detune). Used by PresetSelector for audition playback.
- **Preset Audio Preview Architecture**: PresetSelector uses a single real-time `AudioContext` (created lazily, shared across all previews) for playback. Generated AudioBuffers are cached in a `previewCacheRef` map keyed by preset ID — first play generates and decodes (~50ms render time), subsequent plays are instant from cache. Only one preview plays at a time (`previewingId` state). `stopPreview()` is called on preset select, category change, and component unmount. The `onended` callback on `BufferSourceNode` clears state only if the source is still the current one (prevents stale cleanup from a previously stopped source).
- **Test Framework**: Vitest configured in `vite.config.js` `test` block (not a separate config file). Uses `jsdom` environment for React component tests. `globals: true` enables `describe`/`it`/`expect` without imports. Setup file at `src/__tests__/setup.js`. Tests mock Supabase, Stripe, and Web Audio API. Run with `npm run test:run` (single pass) or `npm run test` (watch mode). Accessibility testing via `jest-axe` in `a11y.test.jsx`. E2E smoke tests via Playwright in `e2e/smoke.spec.js` (`npm run test:e2e`).
- **Seed Data Pattern**: `supabase/seeds/seed_sound_sauces.sql` uses a `DO $$ DECLARE seed_user_id uuid := '...'; BEGIN ... END $$;` anonymous block. User must replace the UUID with their own Supabase user ID before running. Each entry inserts into `analyses` with `is_public = true`, full `results` JSONB (features + recommendations + detectedInstruments), and staggered `created_at` dates. Single quotes inside JSON strings are escaped as `''` (PostgreSQL convention).
- **Canonical User Ordering for Conversations**: `conversations` table enforces `user_a_id < user_b_id` via CHECK constraint. `get_or_create_conversation()` RPC sorts the two user IDs before inserting, preventing duplicate 1:1 conversations. Queries use `WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)` but with canonical ordering this simplifies to a single condition.
- **DM Request/Inbox Gating**: `is_request` boolean on conversations is set by `BEFORE INSERT` trigger using `are_mutual_follows()`. When a follow is created, `update_conversations_on_follow` trigger promotes any existing request conversations to inbox (is_request=false). When a follow is deleted, `update_conversations_on_unfollow` demotes conversations back to request status. This means the UI automatically updates without any frontend logic.
- **Per-User Unread Counts on Conversations**: `unread_a` and `unread_b` on conversations track unread counts per user (determined by canonical ordering). `update_conversation_on_message` trigger increments the recipient's unread count. `unread_messages` on profiles is maintained by a separate trigger for O(1) sidebar badge rendering. `markConversationRead()` resets the user's unread count and bulk-updates `messages.is_read`.
- **Polling-Based Messaging**: Messages use 4s `setInterval` polling instead of Supabase Realtime. Polls only fetch messages newer than the latest existing message, deduplicates by ID. This avoids the complexity of Realtime subscriptions and works reliably across all network conditions.
- **Challenge Status Derived from Dates**: Challenges have `start_date` and `end_date` columns (with CHECK constraint `end_date > start_date`). Status (active/upcoming/ended) is computed client-side by `getChallengeStatus(challenge)` rather than stored, eliminating the need for cron jobs or status update triggers.
- **Challenge Re-Submissions via UPSERT**: `challenge_submissions` has `UNIQUE(user_id, challenge_id)` constraint. Submissions use `onConflict: 'user_id,challenge_id'` with UPSERT so users can re-submit and improve their score. The `update_challenge_submission_count` trigger uses `COUNT(DISTINCT user_id)` to maintain an accurate unique participant count.
- **Challenge Spectral Match Reuse**: Challenge submission scoring reuses the exact same client-side pipeline as recreation scoring: upload to Vercel Blob → decode both AudioBuffers → Web Worker `calculateSpectralMatch` → save score. Zero new server-side infrastructure needed.
- **Challenge Creation Gating**: RLS policy on `challenges` restricts INSERT to users with `subscription_tier = 'pro'` by joining to `profiles`. Frontend `canCreateChallenge()` in `useSubscription` mirrors this check. Free users can browse and submit but not create challenges.
- **Notification Polling Pattern**: `useNotifications` polls every 30s for new notifications using `notificationsRef` to avoid interval teardown. Only fetches notifications newer than the latest existing one (`gt('created_at', latestTime)`), deduplicates by ID, and calls `refreshProfile()` to update the sidebar badge count. Message notifications (`new_message` type) are excluded from the Notifications page entirely since messages have their own dedicated inbox with unread badges.
- **Request-to-Inbox Promotion**: When a user follows back from the DM request banner, `handleFollowBack` toggles the follow, waits 500ms for the PostgreSQL `update_conversations_on_follow` trigger to flip `is_request` to false, then refreshes the conversation list. The active conversation's `is_request` is also optimistically set to false so the UI updates immediately.
- **Multi-Window Frequency Band Analysis**: `analyzeFrequencyBands()` averages up to 6 FFT windows spread across the entire audio duration, with hop size calculated as `(length - fftSize) / (numWindows - 1)`. This replaced the old single-window approach that only analyzed the first 93ms, which completely missed filter sweeps, slow attacks, and evolving timbre. For very short audio (< one FFT window), the function zero-pads the data instead of returning zeros. The multi-window approach is critical for accurate instrument detection — a sawtooth chord with a filter sweep starting at 200Hz needs its full spectral evolution captured, not just the dark initial transient.
- **Multi-Window Brightness/Spectral Centroid**: `calculateAudioFeatures()` now averages spectral centroid across up to 6 FFT windows instead of only the first 4096 samples. Previously, a sound with a filter starting at 200Hz would report brightness=0.03 even if the filter sweeps to 3500Hz. The multi-window approach captures the true average brightness across the sound's full duration. Same pattern as `analyzeFrequencyBands()`.
- **Filter Envelope Bandpass Detection**: `analyzeFilterEnvelope()` detects three sweep directions: `opening` (gets brighter), `closing` (gets darker), and `bandpass` (opens then closes). The bandpass case was previously missed because the algorithm only compared first-quarter vs last-quarter brightness averages — a filter sweeping 200→3500→600Hz has similar start/end points so it read as "stable." The fix compares middle brightness to both endpoints, and also checks max-min brightness range as a fallback. Returns `peakCutoff`, `minCutoff`, and `peakPosition` for the preset generator to set appropriate filter modulation routing.
- **Curated Preset Architecture**: Replaced the old dynamic analysis-based Vital preset generator with a curated preset system. 40 hand-tuned presets across 10 categories (`vitalPresets.js`) are defined as sparse settings objects — only non-default Vital parameters are specified. `buildVitalPreset(presetId, tuningOverrides, metadata)` deep-clones the init template, spreads curated settings, applies user slider overrides (clamped to param ranges), and returns a complete .vital file. This is dramatically more reliable than trying to reverse-engineer analysis data into synthesis parameters.
- **Curated Preset Tuning Sliders**: 8 user-adjustable parameters (`TUNING_PARAMS`): filter_cutoff, filter_resonance, attack, decay, sustain, release, reverb, chorus. Each defines `id`, `label`, `min`, `max`, `default`, `step`, `unit`, `vitalKey` (the actual Vital settings key), and optional `linkedToggle` (e.g., reverb dry_wet > 0 → reverb_on = 1). Slider values are clamped to param ranges before applying.
- **Instrument-to-Category Routing**: `INSTRUMENT_TO_CATEGORY` in `vitalPresets.js` maps detection output to preset categories. Acoustic instruments route to dedicated categories (brass→'brass', woodwind→'woodwind'), while some share existing ones (strings→'pad' since string_pad handles it well, vocal→'lead' since Vital lacks formant synthesis). Guitar detection outputs 'lead' or 'pluck' from the ML model — guitar presets are discoverable via manual browsing in PresetSelector.
- **PresetSelector Component Pattern**: Category pills → curated preset cards → community presets → tuning sliders. Auto-selects category based on detected instrument. Uses `PRESET_CATEGORIES` for pills and `CURATED_PRESETS.filter(p => p.category === selectedCategory)` for cards. Community presets fetched from `analyses` table via `CATEGORY_TO_TAG` mapping (queries `post_type='preset'`, `is_public=true`, matching tag, `like_count DESC`, limit 10). Remounts via `key={selectedInstrument}` prop from parent — when detected instrument changes, React unmounts/remounts the component, resetting category selection, preset selection, and tuning sliders cleanly (replaces old useEffect sync approach). Parent only receives the final preset via callback.
- **Kick LFO Special Handling**: Kick presets use `postProcess: 'kick'` flag which triggers `applyKickLFOEnvelopes()`. This replaces OSC 1's wavetable with a pure sine and injects 3 factory LFO shapes (pitch envelope for "click to thump", volume shaping, distortion envelope) extracted from Vital's own "Kick Drum 1" preset. These LFO shapes are stored as serialized JSON in `KICK_LFO_SHAPES`.
- **Data-Driven Preset Tests**: `vitalPresetGenerator.test.js` iterates over `CURATED_PRESETS` and `PRESET_CATEGORIES` arrays dynamically. Adding new presets or categories requires zero test code changes — the tests auto-validate structure, JSON validity, build correctness, and tuning param clamping for all 40 presets.
- **Cross-Origin Download Fix**: HTML5 `download` attribute on `<a>` tags only works for same-origin URLs. Vercel Blob URLs are cross-origin, so browsers ignore `download` and respect the server's Content-Type header instead. `downloadRemotePreset()` in `vitalPresetGenerator.js` fetches the file, creates a local Blob with `application/octet-stream`, and triggers download via `createElement('a')`. Applied to all 3 download locations (PresetSelector, RecipeDetail, Profile Downloads tab).
- **Curated Preset Download Tracking**: Curated presets tracked in localStorage (key: `soundsauce_curated_downloads`) since they don't have `analysis_id` — they're built client-side from `vitalPresets.js` data, not stored in Supabase. Community preset downloads tracked via the existing Supabase `downloads` table (same table used for recipe download counting). `useDownloadedPresets` hook manages both sources, providing a unified interface for duplicate detection and the Profile Downloads tab.
- **Acoustic Instrument Recommendations**: `recommendations.js` generates DAW-specific synthesis tips for 10+ instrument types. Uses a `dawInstrumentMap` object mapping instrument→DAW→suggestion (FL Studio, Ableton, Logic Pro, Reaper, Pro Tools). Acoustic instruments (guitar, brass, woodwind, strings) include Spitfire LABS (free sample library) tips to manage expectations about synth approximation vs. realism.
- **Sentry Dynamic Import Pattern**: `src/lib/sentry.js` uses dynamic `import('@sentry/react')` with crash-safe initialization — if Sentry fails to load (ad blockers, network issues), the app continues normally. Configured with 10% traces sample rate (cost control) and 100% error session replay (captures full context on crashes). `VITE_SENTRY_DSN` env var is optional — if missing, Sentry simply doesn't initialize. `ErrorBoundary.jsx` calls `Sentry.captureException()` in `componentDidCatch()` for automatic error reporting.
- **CSP Header Strategy**: `vercel.json` configures Content-Security-Policy with explicit trusted origins for each directive: `script-src` allows PostHog, Stripe, SoundCloud Widget API; `connect-src` allows Supabase (HTTP+WSS), PostHog, Replicate, Stripe, Sentry, SoundCloud API, Vercel Blob CDN (`*.blob.vercel-storage.com`) and Vercel API (`vercel.com` — required for `@vercel/blob` client uploads which PUT files directly to `https://vercel.com/api/blob`); `img-src` allows Supabase Storage, Vercel Blob, Replicate CDN, Google avatar URLs, SoundCloud CDN (i1.sndcdn.com); `frame-src` allows Stripe (payment forms) and SoundCloud (hidden player iframe); `media-src` allows SoundCloud CDN (*.sndcdn.com) for audio streaming. `unsafe-inline` required for Tailwind CSS. Additional headers: `X-Frame-Options: DENY` (anti-clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` disables camera/mic/geolocation.
- **In-Memory Rate Limiting**: `api/_rateLimit.js` implements a sliding window rate limiter for Vercel Serverless Functions. Per-IP tracking using `x-forwarded-for` headers, 60-second windows, automatic cleanup of expired records. Returns `429 Too Many Requests` with `Retry-After` header. Applied to all API endpoints with per-route limits: 10/min on stems (expensive Replicate API), 30/min on uploads, 5/min on checkout/portal. In-memory store is per-instance (not distributed across Vercel instances) — sufficient for single-origin burst protection.
- **DOMPurify Zero-Tag Whitelist**: `src/utils/sanitize.js` wraps DOMPurify with `{ ALLOWED_TAGS: [] }` — strips ALL HTML tags, making it safe for both text rendering and attribute contexts. Used in CommentsSection, RecipeCard, RecipeDetail, MessageThread for all user-generated content (comments, titles, descriptions, usernames, bios, messages). Handles non-string inputs gracefully (returns empty string).
- **Environment Variable Validation Pattern**: Two-layer approach. Frontend (`src/utils/validateEnv.js`): runs ONLY in production (`import.meta.env.PROD`), called first in `main.jsx` before React initialization, logs errors for missing required vars (Supabase), warnings for optional vars (PostHog, Sentry, Stripe). Server-side (`api/_validateEnv.js`): helper function `validateServerEnv(res, requiredVars)` returns 500 with descriptive error if any required var is missing, used in all 8 API endpoints with endpoint-specific required vars.
- **Web Vitals → PostHog Pipeline**: `src/lib/webVitals.js` uses the `web-vitals` package to measure all 5 Core Web Vitals (LCP, INP, CLS, FID, TTFB). Each metric is sent to PostHog via `trackWebVital(name, value, rating)`. CLS values are multiplied by 1000 for millisecond normalization. Lazy-loads PostHog capture function to avoid circular dependencies. Initialized in `main.jsx` with try/catch for crash safety.
- **GitHub Actions CI Pattern**: `.github/workflows/ci.yml` runs on every push to main and all PRs targeting main. Single job: checkout → Node 20 setup with npm cache → `npm ci` → lint → test → build. Build step uses placeholder env vars for Supabase (required at build time for Vite). Blocks merges if any step fails.
- **Playwright E2E Smoke Tests**: `e2e/smoke.spec.js` provides 5 basic navigation tests (homepage loads, navigate to analyze/discover/search, upload section visible). Configured via `playwright.config.js` with `baseURL: http://localhost:5173`, trace/screenshot capture on failure. Serves as a foundation — critical path E2E tests (signup → publish → like flow) can be added incrementally.
- **Stem Waveform Swap Pattern**: When a stem is selected, the main `WaveformVisualizer` receives the stem's waveform data instead of the full mix's. This avoids rendering a second waveform component — the existing three-layer Canvas architecture, zoom/pan controls, and interaction handlers all work seamlessly with stem data. The swap is controlled by `activeStemView` state: when non-null, conditional props feed stem data (`stemWaveformPreview`, `stemWaveformHiResRef`, stem duration) to the same component. Full mix data remains cached and is restored immediately when the user clicks "Back to Full Mix."
- **Per-Stem Loop Region State**: `stemLoopRegions` is a `{ [stemType]: { start, end, enabled } }` object that stores independent loop regions for each stem. This is separate from the full mix's `audio.loopStart/loopEnd/loopEnabled` state managed by `useAudioProcessor`. Three stem-aware handlers (`handleViewLoopRegionChange`, `handleToggleViewLoop`, `handleClearViewLoop`) delegate to either the stem state or full mix state based on `activeStemView`. This means a user can select a region on the bass stem, switch to drums, select a different region, and switch back to bass — their original selection is preserved.
- **Stem Waveform Data Caching**: `stemWaveformDataRef` caches decoded waveform data (preview + hi-res + duration) per stem type. Once a stem's waveform is decoded, switching back to it is instant (no re-decode). The hi-res data is generated asynchronously via the Web Worker and attached to the cache entry when ready, using the same two-tier pattern as the full mix.
- **Ephemeral Stem AudioContext**: `prepareStemWaveform()` creates a temporary `AudioContext({ sampleRate: 48000 })` to decode stem audio, then closes it in a `finally` block. This is necessary because the main AudioContext in `useAudioProcessor` is tied to the full mix playback. The decoded buffer is used only to extract waveform data — it's not retained (same ephemeral pattern as stem analysis).
- **Admin Tab Routing Pattern**: `admin-stats.js` uses query parameter routing (`?tab=overview|users|content`) instead of separate endpoints. This keeps the admin API surface minimal (2 endpoints: stats for reads, actions for writes) while supporting different data shapes per tab. Each tab handler runs its own parallel queries — the overview doesn't slow down when the users tab adds engagement computations.
- **DAU/WAU/MAU Without last_active_at**: Active users computed via SQL function that UNIONs activity from analyses, comments, likes, and recreations tables. This avoids adding a `last_active_at` column that would need updating on every user action. The RPC function runs as SECURITY DEFINER to access all tables regardless of RLS.
- **Session Restore via URL Params**: `/analyze?id=xxx` triggers `loadAnalysis(analysisId)` which fetches the full analysis row from Supabase and restores audio (from Vercel Blob URL — persists indefinitely) + stems (from Replicate CDN URLs — expire after ~7 days) + results/metadata. The `useSearchParams` effect depends on `searchParams` (not mount-only `[]`) so clicking different recent sidebar items while already on `/analyze` triggers a new load. `lastLoadedIdRef` guard prevents double-loading the same ID. After loading completes, `setSearchParams({}, { replace: true })` clears the `?id=` param so refreshing doesn't re-trigger. Stem URLs are saved as JSONB in `analyses.stem_urls` column via `useHistory.toSupabaseRow()`.
- **Expired Stem URL Graceful Degradation**: Replicate CDN stem URLs expire after ~7 days. When `getStemAudio()` encounters a 403/404, it sets `status='expired'` which triggers a banner in `StemSelector` with a "Re-separate" button. Audio playback still works since the Vercel Blob URL (used for both playback and re-separation) persists indefinitely. The `blobUrl` is saved in `useStemSeparation` state and passed to `restoreStems()` so re-separation can reuse the existing upload.
- **Preset Feature Scoring Pattern**: `scorePresetMatch(preset, features)` in `vitalPresets.js` scores presets against analysis features using 7 weighted dimensions (brightness 20pts, waveform 15pts, attack 12pts, spectralCentroid 10pts, sustain 8pts, filterCutoff 8pts, chorus 5pts = 78pts max). Each `featureProfile` defines `{ min, max, weight }` ranges for numeric features — `scoreRange()` returns 1.0 inside the range and linear falloff outside (relative to range width). Waveform matching uses exact type check against `waveformTypes` array. Chorus uses boolean match/mismatch/null-don't-care. Gracefully skips missing features (only scores dimensions present in both preset and analysis). PresetSelector uses `useMemo` to compute initial best preset synchronously (avoids `setState-in-effect` lint violation) and passes it as `useState` initial value.
- **DAW Integration Tips Pattern**: `getDAWIntegrationTips(daw, soundType)` in `dawPlugins.js` returns 3-4 concise tips specific to the user's DAW and detected sound type. Tips cover: load instructions (DAW-specific file import steps), effects chain (DAW + sound-type specific insert effects), mixing tip (sound-type specific — e.g., bass: sidechain to kick, pad: send to reverb bus), optional layering tip. Sound types are normalized (sub-bass→bass, supersaw→lead, etc.) for lookup. SoundRecipe.jsx renders these as numbered cards when `showVitalSection={false}` (DAW tab), with VitalBridgeCard pointing users to the Vital Preset tab first. Original 6-step synthesis recipe moved to collapsible "Build from scratch" section.
- **Seed Preset Fallback Pattern**: `SEED_PRESET_MAP` maps 25 seed Sound Sauce titles to curated preset IDs (e.g., `'808 Bass (Trap)': '808_bass'`). `findCuratedPresetForRecipe(recipe)` checks: (1) title map, (2) instrument → category → first preset in category, (3) best-scoring preset via `scorePresetMatch()` against recipe features. RecipeDetail.jsx computes `fallbackPreset` via `useMemo` — when no `vital_preset_url` exists but a curated match is found, the download button builds the preset client-side via dynamic `import()` of `vitalPresetGenerator.js`. No database changes, no API endpoints, no Vercel Blob uploads needed.
- **Shared Focus Trap Hook**: `useFocusTrap(isOpen)` returns a ref to attach to the modal panel. On open: saves `document.activeElement`, queries focusable elements, focuses the first one, adds keydown listener for Tab cycling. On close: removes listener, restores focus to previously focused element. All 7 modals use this instead of duplicating focus management logic.
- **Auth on Stem Separation APIs**: `check-stems.js` and `separate-stems.js` require Supabase JWT auth tokens. Frontend passes `Authorization: Bearer {token}` from the current Supabase session. This prevents unauthenticated access to costly Replicate API calls and prevents prediction ID enumeration attacks.
- **Origin Allowlist for Stripe Redirects**: `create-checkout.js` and `create-portal.js` validate the request Origin header against `ALLOWED_ORIGINS` before using it in Stripe redirect URLs. Unknown origins fall back to `https://soundsauce.app`. Localhost origins are allowed in development.

### Stem Separation Architecture

**User Flow:**
1. User uploads full track → shown "Separate Stems" button
2. Click triggers: audio → Vercel Blob upload → Blob URL sent to `/api/separate-stems` → Replicate API
3. Prediction ID returned, frontend polls `/api/check-stems` every 2 seconds
4. Progress bar updates based on elapsed time (Demucs typically 30-90 seconds)
5. When complete, stem URLs returned (hosted on Replicate's CDN)
6. Stem cards appear with play/download buttons
7. Selecting a stem → analysis runs on isolated audio instead of full mix

**API Architecture:**
```
Frontend                    Vercel Blob           Vercel Functions              Replicate
   │                              │                      │                          │
   │ POST /api/upload-audio       │                      │                          │
   │ (multipart file)             │                      │                          │
   │─────────────────────────────►│                      │                          │
   │◄─────────────────────────────│                      │                          │
   │ { url: blob-url }            │                      │                          │
   │                              │                      │                          │
   │ POST /api/separate-stems     │                      │                          │
   │ { audioUrl: blob-url }       │                      │                          │
   │─────────────────────────────────────────────────────►│                          │
   │                              │                      │ POST /v1/predictions     │
   │                              │                      │ (Demucs model + blob-url)│
   │                              │                      │─────────────────────────►│
   │                              │                      │◄─────────────────────────│
   │◄─────────────────────────────────────────────────────│ { predictionId }         │
   │ { predictionId }             │                      │                          │
   │                              │                      │                          │
   │ GET /api/check-stems?id=...  │                      │                          │
   │─────────────────────────────────────────────────────►│                          │
   │                              │                      │ GET /v1/predictions/{id} │
   │                              │                      │─────────────────────────►│
   │                              │                      │◄─────────────────────────│
   │◄─────────────────────────────────────────────────────│ { status, stems }        │
   │ { status, progress, stems }  │                      │                          │
```

**Why Vercel Blob?**
- Vercel Functions have ~4.5MB payload limit (too small for audio files)
- Blob storage handles files up to 100MB
- Client-side upload with progress tracking
- Public URLs work directly with Replicate API

**Cost:**
- Vercel Blob: Free tier includes 1GB storage, 1GB/month bandwidth
- Replicate Demucs: ~$0.05-0.10 per song
- Vercel Functions: Free tier eligible

### Audio Analysis Algorithms

**FFT (Fast Fourier Transform)**
- Cooley-Tukey radix-2 decimation-in-time algorithm
- Bit-reversal permutation followed by butterfly operations
- Hann windowing applied before transform
- Returns magnitude spectrum (sqrt of real² + imag²)

**BPM Detection**
- Uses onset detection to find energy peaks (20ms windows)
- Applies autocorrelation to find repeating patterns
- Searches BPM range 60-200 with harmonic validation
- Checks half and double tempo for accuracy
- Returns confidence score, suggested tempo, and tempo range

**Key Detection**
- Calculates 12-bin chroma features using FFT
- Uses Pearson correlation (not just dot product) for accuracy
- Correlates against Krumhansl-Schmuckler major/minor profiles
- Energy-weighted windows for better accuracy
- Returns key, mode, Camelot code, scale notes, compatible keys, confidence

**Waveform Detection**
- Skips attack transient (uses ADSR attack time + 10ms safety margin)
- Multi-window averaging: analyzes 3-4 non-overlapping FFT windows after attack
- Searches fundamental frequency down to 30 Hz (catches kick fundamentals)
- Analyzes first 8 harmonics relative to fundamental across averaged windows
- Compares against known patterns (sine, saw, square, triangle, pulse)
- Sine: fundamental only
- Saw: all harmonics with 1/n amplitude falloff
- Square: odd harmonics only with 1/n falloff
- Triangle: odd harmonics with 1/n² falloff
- Returns type, confidence, harmonic profile, synth recommendation

**Filter Envelope Analysis**
- Tracks spectral centroid over time using windowed FFT
- Detects filter sweep direction (opening/closing/bandpass/stable)
- Bandpass detection: middle brightness > 1.3x both first and last quarter
- Fallback: max-min brightness range > 40% of average triggers detection via peak position
- Estimates cutoff frequency using actual frequency resolution (no artificial cap)
- Returns: estimatedCutoff (average), peakCutoff (maximum), minCutoff (minimum), peakPosition (0-1), filter attack, decay, sweep direction, resonance

**Modulation Detection**
- Analyzes amplitude variation for tremolo (autocorrelation for LFO rate)
- Analyzes pitch variation for vibrato
- Analyzes spectral width for chorus/detune
- Returns LFO rate, tremolo depth, vibrato depth, chorus amount

**Spectral Matching**
- Computes normalized magnitude spectra for both signals
- Calculates overall correlation (dot product / norms)
- Per-band comparison (sub-bass, bass, low-mid, mid, high-mid, high)
- Generates EQ suggestions for bands with low similarity
- Returns match %, band differences, EQ suggestions, verdict

**ADSR Envelope Analysis**
- Downsamples to ~100 points per second for envelope detection
- Attack: Time from start to reach 90% of peak
- Decay: Time from peak to reach sustain level
- Sustain: Average level during middle portion
- Release: Time from sustain to reach 10% of sustain level

**Spectrogram Generation**
- FFT with Hann windowing (1024 samples)
- 50% overlap between frames (512 hop)
- Limited to 100 frames for performance
- Returns 2D array of normalized magnitudes

**Harmonic Detection**
- Peak detection in FFT magnitude spectrum (8192 samples)
- Filters peaks by prominence and frequency range (80Hz - 8000Hz)
- Converts frequencies to musical note names
- Returns top 8 strongest harmonics with frequency and amplitude
