# CLAUDE.md - SoundSauce Remix Lab

This file provides context for AI assistants working on this project.

## Workflow Rules

- **Auto-update CLAUDE.md**: After completing any task, todo, fix, or feature, update this file — add completed items to `### Completed` and update any relevant architecture notes or file descriptions. Do not wait to be asked.
- **Single user**: This is Spencer's personal tool. No multi-tenant concerns, no signup funnels, no tiers. Optimise for daily use in an Ableton Live 12 (Standard) remix workflow on an Intel Mac.

## What This Is

**SoundSauce Remix Lab** — a browser tool at **https://soundsauce.app** for remixing other people's tracks. Core loop:

> find a track → pull the vocal → understand the original → remix it → write up what you learned

It started life as a community "learn to recreate any sound" platform (Discover, likes, follows, DMs, challenges, Stripe tiers, Supabase). That version is preserved in git at commit **`c28e4f0`** ("Checkpoint: SoundSauce social platform before Remix Lab pivot") — restore any piece with `git checkout c28e4f0 -- <path>`. In September 2026 it was cut down to a single-user lab because the social layer never found users and the only feature in daily use was stem separation (Live 12 Standard lacks Suite's built-in separation).

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | JavaScript (JSX), ES2020+ |
| Framework | React 19 + Vite 7 |
| Styling | Tailwind CSS 4 (custom theme in `src/index.css` `@theme` — **not** `tailwind.config.js`) |
| Audio | Web Audio API + Web Worker DSP (`src/workers/audio.worker.js`) |
| Stem separation | Demucs on Replicate (`cjwbw/demucs`, models `htdemucs_ft` / `htdemucs` / `htdemucs_6s`), FLAC output |
| Storage | Vercel Blob (source uploads + kept stems). ~1 GB on Hobby |
| Auth | Single lab password → HMAC session token (`api/_auth.js`). No Supabase, no accounts |
| Instrument detection | Heuristic scoring in the worker + Gemini 2.5 Flash refinement (`api/instrument.js`) |
| Presets | Curated Vital preset library (`src/data/vitalPresets.js`, 100 presets) + `.vital` builder |
| Zip | `fflate` (Remix Pack) |
| Animation | `motion/react` (Dock, Step, modals) |
| Icons | `lucide-react` (must stay in `package.json` deps — a missing entry broke Vercel builds in May 2026) |
| Analytics | PostHog via `/ingest` reverse proxy (shared cross-project "data-hub" key); Sentry optional |
| Testing | Vitest (51 tests) + Playwright smoke tests |
| Deploy | Vercel (`vercel build --prod && vercel deploy --prebuilt --prod`) |

## Project Structure

```
audio-analyzer-pro/
├── api/                         # Vercel Serverless Functions
│   ├── _auth.js                 # Lab password gate: checkPassword, issueToken, verifyToken, requireLab, signPredictionId
│   ├── _rateLimit.js            # In-memory sliding-window rate limiter (per instance)
│   ├── _validateEnv.js          # Env var presence check helper
│   ├── _posthog.js              # Server-side PostHog client
│   ├── auth.js                  # POST {password} → {token, expiresAt}; GET verifies a token
│   ├── upload-audio.js          # @vercel/blob client-upload token endpoint (wav/mp3/m4a/flac, 100 MB)
│   ├── separate-stems.js        # Start Demucs prediction: mode vocals|stems4|stems6, quality best|fast, FLAC
│   ├── check-stems.js           # Poll prediction; returns whatever stem keys the mode produced
│   └── instrument.js            # Gemini zero-shot instrument labels; deletes its Blob upload after reading it
├── scripts/
│   └── dev-api.mjs              # Local runner for api/*.js on :3001 (Vite proxies /api there)
├── e2e/smoke.spec.js            # Playwright smoke tests (lab loads, /analyze redirect, settings, sign-in dialog)
├── src/
│   ├── lib/
│   │   ├── labAuth.js           # getLabToken, labAuthHeaders, labSignIn, labVerify, labSignOut (localStorage)
│   │   ├── posthog.js           # PostHog init + tracking helpers (many are legacy no-ops now)
│   │   ├── sentry.js            # Optional error monitoring
│   │   └── webVitals.js         # Core Web Vitals → PostHog
│   ├── contexts/AuthContext.jsx # AuthProvider/useAuth: { isSignedIn, loading, signIn, signOut, prefs, updatePrefs }
│   ├── components/
│   │   ├── auth/LabSignIn.jsx   # Password modal (focus trap, dock auto-hide)
│   │   ├── layout/Dock.jsx      # Vertical dock: Lab, Settings, theme, lock/unlock
│   │   ├── layout/PageLayout.jsx
│   │   ├── audio/               # AudioUploadSection, WaveformVisualizer, PlaybackControls, SpectrumAnalyzer,
│   │   │                        # AnalyzeSection, InstrumentSelector, StemSelector, PresetSelector
│   │   ├── analysis/            # AnalysisStepFlow, StepFlow, Step, ADSREnvelope, ResultsTabs, SoundRecipe (SoundSauce + VitalGuide)
│   │   ├── comparison/ExportToolbar.jsx
│   │   ├── history/HistoryPanel.jsx   # Recent analyses (localStorage) — interim until the Vault lands
│   │   └── ui/                  # Tooltip, FeatureCard, ErrorBoundary, Toast, SynthKnob, Skeleton, SaucyHelper, …
│   ├── hooks/
│   │   ├── useAudioProcessor.js # Web Audio playback + analysis orchestration (+ detectTempoAndKey proxy)
│   │   ├── useAudioWorker.js    # Worker RPC (analyzeAudio, detectInstruments, detectTempoAndKey, spectral match, …)
│   │   ├── useStemSeparation.js # Separation workflow, keep-to-Blob, stamped downloads, Remix Pack zip
│   │   ├── useHistory.js        # localStorage recent analyses
│   │   ├── useTheme.js, usePageTitle.js, useFocusTrap.js
│   ├── pages/
│   │   ├── Analyze.jsx          # The Lab (route "/") — upload, waveform, stems, analysis step flow
│   │   ├── Settings.jsx         # Theme, DAW, artist name, lab lock, storage note
│   │   └── NotFound.jsx
│   ├── utils/
│   │   ├── stemFiles.js         # SEPARATION_MODES, getStemLabel, buildStemFilename, buildPackFilename, buildPackNotes
│   │   ├── constants.js, recommendations.js, demoSoundGenerator.js, validateEnv.js
│   ├── data/                    # vitalPresets.js, vitalInitTemplate.json, dawPlugins.js, flStudioPlugins.js
│   ├── services/vitalPresetGenerator.js
│   └── workers/audio.worker.js  # All heavy DSP
├── .claude/launch.json          # "dev" (Vite only) and "full" (Vite + dev-api) preview configs
├── vercel.json                  # SPA rewrite, /ingest PostHog proxy, CSP + security headers
└── vite.config.js               # /api → :3001 proxy in dev, vendor chunks, vitest config
```

## Architecture

### Auth: lab password

There is one user. Auth exists only to gate spend (Replicate GPU, Blob uploads, Gemini).

- `LAB_PASSWORD` env var (Vercel + `.env.local`). Optional `LAB_SESSION_SECRET` for token signing (falls back to the password).
- `POST /api/auth {password}` → constant-time compare → `{ token, expiresAt }` (30-day HMAC-SHA256 token: `base64url(payload).sig`). Rate limited 5/min.
- Every paid route calls `requireLab(req, res)` from `api/_auth.js` and returns 401 if the Bearer token is missing/invalid.
- Frontend stores the token in `localStorage['soundsauce_lab_session']`; `labAuthHeaders()` is spread into fetch headers. `AuthProvider` verifies it once on mount via `GET /api/auth`.
- `signPredictionId(id)` binds Replicate prediction IDs so `check-stems` can't be enumerated (replaces the old per-user HMAC).
- UI: lock icon in the Dock and an "Unlock" button in Settings open `LabSignIn`. Attempting separation while locked opens it with a reason.

### Preferences (was "profile")

`useAuth().prefs` = `{ dawPreference, artistName }` in `localStorage['soundsauce_prefs']`. `updatePrefs(patch)` merges.

### Stem separation pipeline

```
Browser                         Vercel Blob        api/*                        Replicate (Demucs)
  │ upload(file) ── client token ──► upload-audio                                  │
  │◄── blob URL                                                                    │
  │ POST separate-stems {audioUrl, mode, quality} ───────────────────────────────► create prediction
  │◄── {predictionId, token}                                                       │
  │ GET check-stems?id&token  (2s poll) ────────────────────────────────────────► status
  │◄── {status, progress, stems:{vocals, other, …}}  (FLAC URLs, ~7 day TTL)       │
  │ keepStem(): fetch FLAC → upload to Blob `stems/<title>/<stamped name>.flac`  (auto in vocals mode)
  │ downloadStemFile(): fetch → stamped local save
  │ downloadRemixPack(): all stems + notes.txt → zip (fflate, level 0)
```

- **Modes** (`SEPARATION_MODES` in `utils/stemFiles.js` and `api/separate-stems.js`): `vocals` (two-stem, `stem: 'vocals'`, output `{ vocals, other }` where `other` = instrumental), `stems4`, `stems6` (guitar + piano, `htdemucs_6s` only).
- **Quality**: `best` = `htdemucs_ft` (fine-tuned, ~2–4 min), `fast` = `htdemucs` (~1 min). 6-stem has one model.
- **Output**: always FLAC (lossless, Ableton-native, ~half of WAV — matters for the 1 GB Blob cap).
- **Filenames**: `Artist - Title - 128bpm - Em - vocals.flac` via `buildStemFilename(meta, stemType, mode, ext)`. Instrumental is labelled `instrumental` in vocals mode.
- **Keep**: unkept stems expire from Replicate's CDN after ~7 days (403/404 → `status='expired'`). `keepStem` re-hosts on Blob and swaps the URL. Auto for vocals mode; per-card / "Keep all" buttons otherwise.
- **Quick tempo/key**: `Analyze.jsx` runs `detectTempoAndKey` (worker `DETECT_BPM` + `DETECT_KEY`) on the first 90 s right after decode, shown as a header chip and used for filename stamping before any full analysis. Full analysis overrides it.
- `useStemSeparation` exports: `stems, stemTypes, mode, stemAudioData, blobUrl, status, progress, error, keepStatus, isProcessing, isReady, isExpired, isKeeping, separateStems(audioData, filename, {mode, quality, autoKeep, meta}), restoreStems(stems, blobUrl, mode), downloadStem, downloadAllStems, downloadStemFile(stemType, meta), downloadRemixPack(meta), keepStem(stemType, meta), keepAllStems(meta), getStemAudio, clearStems, cancelSeparation, hasStem, isStemDownloaded`.

### The Lab page (`src/pages/Analyze.jsx`)

Route `/` (legacy `/analyze` redirects). Flow: upload → waveform (drag-to-select region, 64× zoom) → header BPM/key chip → `StemSelector` (mode picker → progress → stem cards) → `AnalyzeSection` → post-analysis `AnalysisStepFlow` (Identify → Preset → Recreate → Full Analysis). Stem waveform swap, per-stem loop regions, stem-aware playback and Gemini refinement are unchanged from the original analyzer (see `CLAUDE.md` at `c28e4f0` for the deep-dive). Recent analyses persist in localStorage via `useHistory`/`HistoryPanel` until the Vault replaces them.

### Local development

`npm run dev:full` runs Vite (:5173) and `scripts/dev-api.mjs` (:3001) together; Vite proxies `/api/*`. The API runner loads `.env.local` then `.env.local.vercel` (pulled production vars — never bundled) and hot-reloads `api/*.js` per request. The `/ingest` PostHog proxy 404s locally by design. The Browser-pane launch config is `full`.

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
npm run dev          # Vite only (no /api) — fine for UI work
npm run dev:api      # Serverless functions on :3001 (loads .env.local + .env.local.vercel)
npm run dev:full     # Both, with Vite proxying /api → :3001 (Browser-pane config: "full")
npm run build        # Production build to /dist (frontend only)
npm run lint         # ESLint
npm run test:run     # Vitest once (51 tests: DSP algorithms, curated presets, a11y)
npm run test:e2e     # Playwright smoke tests (needs dev server)
vercel build --prod && vercel deploy --prebuilt --prod   # Deploy (includes /api functions)
```

## Deployment

Vercel, custom domain **https://soundsauce.app**. Always deploy with `vercel build --prod && vercel deploy --prebuilt --prod` — `npm run build` alone skips the `/api` functions. The Vercel CLI login expired in Sep 2026; run `vercel login` before the next deploy.

### Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `LAB_PASSWORD` | Vercel + `.env.local` | Lab password gate (**required**). Local dev value is in `.env.local` |
| `LAB_SESSION_SECRET` | Vercel (optional) | HMAC secret for session tokens; falls back to `LAB_PASSWORD` |
| `REPLICATE_API_TOKEN` | Vercel | Demucs stem separation |
| `BLOB_READ_WRITE_TOKEN` | Vercel | Vercel Blob (auto-added when the store is connected) |
| `GEMINI_API_KEY` | Vercel | Gemini instrument detection |
| `VITE_POSTHOG_KEY` | Vercel + `.env.local` | PostHog (shared data-hub project key) |
| `VITE_SENTRY_DSN` | optional | Sentry |
| `POSTHOG_PERSONAL_API_KEY` | `.env.local` only | Was used by the deleted daily report script |

Removed with the pivot (safe to delete from Vercel): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*`, `VITE_STRIPE_*`, `RESEND_API_KEY`.

### Storage budget

Vercel Hobby includes ~1 GB of Blob storage. Audit/purge with the `@vercel/blob` SDK (`list()` / `del()`) using `BLOB_READ_WRITE_TOKEN` — no CLI login needed. In Sep 2026 the store held 542 MB of orphaned files (394 MB of Gemini `ai-analysis-*.wav` uploads that were never deleted, 143 MB of re-uploaded source MP3s); everything was wiped and `api/instrument.js` now deletes its upload after use. A two-stem FLAC grab costs ~55 MB, so the store fits ~15 kept tracks — the Vault should show usage and offer deletion.

## Remix Lab Roadmap

Core loop: *find a track → pull the vocal → understand the original → remix it → write up what you learned.*

| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 1 | **Vocal Grab** | ✅ Done | Modes, FLAC, Keep-to-Blob, stamped filenames, Remix Pack zip, quick BPM/key chip |
| 2 | **Strip the site + drop Supabase** | ✅ Done | 160 files deleted; lab password auth; localStorage prefs |
| 3 | **Acapella Vault** (`/vault`, `/vault/:id`) | Next | Index of every kept track as `vault/index.json` on Blob (single user → read-modify-write is fine). Search by artist/title, filter by Camelot key / BPM range, re-download, delete (frees Blob), "find compatible". Save an entry at separation time; restore a session from a vault item (replaces the deleted Supabase `?id=` restore). Reuse Discover's grid/filter UI from `c28e4f0` |
| 4 | **Remix Calculator** (`/calc`) | Planned | Source key/BPM → target key/BPM → semitones, tempo %, warp-mode advice (<10% Complex Pro), Camelot alternatives. Prefill from a vault item |
| 5 | **Stem Player + Arrangement Map** | Planned | Synced mute/solo of all stems; stacked stem waveforms with a bar grid from BPM (stem waveform data is already cached per stem in Analyze) |
| 6 | **Anatomy of a Track** | Planned | Run the analysis pipeline per stem and present it as a study guide (reframes InstrumentSelector / ADSR / feature cards) |
| 7 | **Remix Notes** (`/notes`) | Planned | Journal per vault item: source, what was pulled, key/tempo changes, lessons, SoundCloud link of the result. Public-facing portfolio |
| 8 | **Compatibility Finder** | Planned | Camelot neighbours ± tempo window over the vault, client-side |
| — | Later | Ideas | Vocal chop kit (onset slicing of the vocal stem), mashup preview (playbackRate + SoundTouch), reference A/B (calculateSpectralMatch exists), `.als` generation (gzipped XML from a Live 12 template) |

## Known Issues / Debt

- ESLint: ~10 React-19 `set-state-in-effect` style warnings and 2 pre-existing errors (`Step.jsx`/`Toast.jsx` Fast Refresh export shape, `vitalPresets.js` unused var). Zero runtime bugs.
- `src/lib/posthog.js` still exports ~30 tracking helpers for deleted features. Harmless; trim when convenient.
- `PresetSelector.jsx` is ~1,400 lines and still carries the A/B compare panel and auto-optimize sweep from the preset-accuracy work. Useful for recreating bass/lead stems; leave unless it gets in the way.
- Vercel CLI needs `vercel login` before deploying.

## Completed

- [x] **Remix Lab pivot — Phases 1 & 2** (Sep 2026)
  - **Checkpoint**: full social platform committed as `c28e4f0` before any deletion. A hardcoded PostHog personal API key found in `scripts/daily-posthog-report.mjs` was moved to `.env.local` first so it never entered git.
  - **Vocal Grab** (`api/separate-stems.js`, `api/check-stems.js`, `useStemSeparation.js`, `StemSelector.jsx`, `utils/stemFiles.js`): separation modes `vocals` / `stems4` / `stems6` with a `best`/`fast` quality toggle, FLAC output, dynamic stem keys (two-stem returns `{ vocals, other }` — verified against the predictor source at `github.com/chenxwh/demucs`), Keep-to-Blob re-hosting (auto in vocals mode), BPM/key-stamped filenames, Remix Pack zip with `notes.txt` (Camelot, compatible keys, Ableton warp tips), 10-minute safety timeout. Measured: `htdemucs_ft` on a 2:40 track = 34 s predict time on Replicate.
  - **Quick tempo/key**: `detectTempoAndKey` added to `useAudioWorker`/`useAudioProcessor`; `Analyze.jsx` runs it on decode and shows a `128 BPM · E maj · 12B` chip in the header. Source filename extension is preserved for the Blob upload MIME type.
  - **Supabase removed**: project was paused and couldn't be restored (free-tier 2-project cap). Replaced with `api/_auth.js` + `api/auth.js` (password → 30-day HMAC token), `src/lib/labAuth.js`, a rewritten `AuthContext` (`isSignedIn`, `prefs`), `LabSignIn` modal. `check-stems` IDOR guard now uses `signPredictionId()`. `@supabase/supabase-js`, `stripe`, `dompurify` uninstalled.
  - **Deleted** (160 files): 15 pages, recipe/messages/challenges/settings components, 17 hooks, 8 API routes, `supabase/`, `marketing/`, `reports/`, `clap-model/`, legacy ONNX export artifacts, Sidebar/Header, Home/Discover/Search/Profile/etc. Dock rewritten (Lab, Settings, theme, lock). Settings rewritten (theme, DAW, artist name, lab lock, storage note). `HistoryPanel`/`useHistory` reduced to localStorage. `PresetSelector` lost the community-presets section and auth gating. `AnalysisStepFlow` lost the save prompt and takes `dawPreference` instead of `profile`.
  - **Local dev**: `scripts/dev-api.mjs` + Vite `/api` proxy + `npm run dev:full` (the Vercel CLI token had expired, so `vercel dev` wasn't an option). `fflate` and `concurrently` added.
  - **Blob purge**: 112 orphaned blobs / 542 MB deleted; `api/instrument.js` now deletes its analysis upload after Gemini reads it.
  - **Verified end to end locally**: unlock → upload → `htdemucs_ft` two-stem → both FLACs auto-kept to Blob (25.4 MB vocals + 28.6 MB instrumental) → Remix Pack zip built with 3 entries and correct stamped names.
  - CSP in `vercel.json` trimmed to PostHog / Replicate / Blob / Sentry; `frame-src 'none'`. `validateEnv` no longer requires any `VITE_` vars. E2E smoke tests rewritten for the new routes.
- **Everything before Sep 2026** — see `CLAUDE.md` at commit `c28e4f0` for the full history of the social platform (Phases 0–5, instrument detection overhaul, preset accuracy work, marketing, audits).

---

## Notes for Development

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
