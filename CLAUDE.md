# CLAUDE.md - SoundSauce Remix Lab

This file provides context for AI assistants working on this project.

## Workflow Rules

- **Auto-update CLAUDE.md**: After completing any task, todo, fix, or feature, update this file — add completed items to `### Completed` and update any relevant architecture notes or file descriptions. Do not wait to be asked.
- **Single user**: This is Spencer's personal tool. No multi-tenant concerns, no signup funnels, no tiers. Optimise for daily use in an Ableton Live 12 (Standard) remix workflow on an Intel Mac.

## What This Is

**SoundSauce Remix Lab** — a browser tool at **https://soundsauce.app** for remixing other people's tracks. Core loop:

> find a track → pull the vocal → understand the original → remix it → write up what you learned

It started life as a community "learn to recreate any sound" platform (Discover, likes, follows, DMs, challenges, Stripe tiers, Supabase). That version is preserved in git at commit **`c28e4f0`** ("Checkpoint: SoundSauce social platform before Remix Lab pivot") — restore any piece with `git checkout c28e4f0 -- <path>`. In September 2026 it was cut down to a single-user lab because the social layer never found users and the only feature in daily use was stem separation (Live 12 Standard lacks Suite's built-in separation).

## Where Things Stand (handoff — updated 2026-09-14, end of session)

**Deployed**: production at https://www.soundsauce.app still runs commit `9bd3d28`. **Everything in this session (the whole 8-item queue) is committed locally but not deployed** — run `vercel build --prod && vercel deploy --prebuilt --prod` (CLI login `scurnow24-2856` is valid). On the Mac, run `npm run menubar:install` once: it puts the 🟢 status dot in the menu bar and (re)starts the helper with the new `/stems` endpoints.

**Daily workflow now**: menubar dot green → Lab → Cmd+V a link (or a set/playlist → tick → "Grab vocals from N") → FLAC in the Lab + `~/Music/Remix Lab/Sources/` → Grab Vocals → auto-kept, in `/vault` → **To Live** drops stems into `~/Music/Remix Lab/Stems/<Artist - Title>/` → **Stem Player** to solo/mute/loop bars, **Anatomy** for structure + chords, **Vocal Chops** → chops folder → `/calc` for transpose/tempo → `/notes` to write it up (tick "public" to show it on the portfolio page).

**The queue is finished.** Nothing is left from the 2026-09-14 list. Suggested next things, in rough value order:

1. **Deploy + a real-use pass** — Spencer should use it for a remix and log friction. Things I'd watch: the Stem Player's grid assumes bar 1 = 0:00 (use "bar 1 here"); the Anatomy's chord labels are triad templates on a whole bar (good for one-chord house, rough on busy harmony); vocal chop sensitivity was tuned on one Demucs stem.
2. **Vault delete → also delete chops/stems on disk?** No — local files are Spencer's; leave them.
3. **Blob budget reality**: a 6:36 track costs ~215 MB (source FLAC + two stems); the "~N more tracks fit" estimate assumes 55 MB. Consider not keeping the source upload for long tracks, or showing the per-track size (now on Vault cards) in the estimate.
4. **Batch grab options** — quality toggle (`fast` for big sets), skip tracks already in the vault by `sourceUrl`.
5. Fun ideas still parked: mashup preview in-browser (the Stem Player's multi-source engine + playbackRate is most of it), Vault as a Camelot wheel, reference A/B, `.als` generation, restyle `AnalysisStepFlow` content cards to Signal Deck.

**Gotchas for whoever picks this up**
- The Browser pane in Claude Code is a fresh profile: unlock with the `LAB_PASSWORD` from `.env.local` (POST `/api/auth`, store `{token, expiresAt}` in `localStorage.soundsauce_lab_session`). In that pane, **Enter doesn't submit forms and `form_input` doesn't fire React onChange** — click buttons / `form.requestSubmit()` when verifying.
- Vercel Blob is at ~500 MB / 1 GB (two vault tracks: Tell Me What You Want, Lauren — plus a few orphans from earlier tests). The Vault's delete button frees space.
- The helper must be running on the Mac for link import, To Live and chops; the deployed site can't do it alone. An orphaned helper from an earlier session may hold :7331 (`pkill -f remix-helper.mjs`; the menubar app then restarts it).
- `motion/react` welcome animations render blank in hidden Browser-pane screenshots; it's not a bug.
- Key detection ground truth: `scripts/key-truth.json` (117 tracks, Camelot codes from Rekordbox via `pyrekordbox` reading `~/Library/Pioneer/rekordbox/master.db`). Re-run `node scripts/key-bench.mjs` after touching `detectKey`; the numbers to beat are in the comment above `KEY_DETECT_DEFAULTS`.
- `useToast()` returns `{ toast }` — destructure it (Vault.jsx had `const toast = useToast()` for a while and every toast there silently threw).

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | JavaScript (JSX), ES2020+ |
| Framework | React 19 + Vite 7 |
| Styling | Tailwind CSS 4 — **Signal Deck** theme in `src/index.css` `@theme` (not `tailwind.config.js`); colour system in `src/utils/spectrum.js` |
| Audio | Web Audio API + Web Worker DSP (`src/workers/audio.worker.js`) |
| Track import | **Local helper** (`helper/remix-helper.mjs`, yt-dlp + ffmpeg on the Mac, `localhost:7331`) — paste a YouTube/SoundCloud link, a playlist, or search by name → FLAC + metadata; also writes stems into Live's browser. `helper/menubar/` is a Python `rumps` status-dot app that supervises it |
| Stem separation | Demucs on Replicate (`cjwbw/demucs`, models `htdemucs_ft` / `htdemucs` / `htdemucs_6s`), FLAC output |
| Storage | Vercel Blob (source uploads + kept stems). ~1 GB on Hobby |
| Auth | Single lab password → HMAC session token (`api/_auth.js`). No Supabase, no accounts |
| Instrument detection | Heuristic scoring in the worker + Gemini 2.5 Flash refinement (`api/instrument.js`) |
| Presets | Curated Vital preset library (`src/data/vitalPresets.js`, 100 presets) + `.vital` builder |
| Zip | `fflate` (Remix Pack) |
| Animation | `motion/react` (Dock, Step, modals) |
| Icons | `lucide-react` (must stay in `package.json` deps — a missing entry broke Vercel builds in May 2026) |
| Analytics | PostHog via `/ingest` reverse proxy (shared cross-project "data-hub" key); Sentry optional |
| Testing | Vitest (60 tests) + Playwright smoke tests |
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
│   ├── _vaultIndex.js           # Shared reader for vault/index.json (used by vault.js and notes.js)
│   ├── vault.js                 # Vault index: GET (tracks + Blob usage) / PUT (replace) / DELETE (blobs of a removed track)
│   ├── notes.js                 # Public GET: tracks whose notes are marked public, safe fields only (no auth)
│   ├── separate-stems.js        # Start Demucs prediction: mode vocals|stems4|stems6, quality best|fast, FLAC
│   ├── check-stems.js           # Poll prediction; returns whatever stem keys the mode produced
│   └── instrument.js            # Gemini zero-shot instrument labels; deletes its Blob upload after reading it
├── helper/
│   ├── remix-helper.mjs         # Local yt-dlp companion (localhost:7331): /health, /resolve, /jobs, /files, /stems
│   ├── install-launchagent.sh   # Installs the helper alone as a LaunchAgent (npm run helper:install)
│   └── menubar/                 # rumps menubar app (status dot, supervises the helper) + install.sh (npm run menubar:install)
├── scripts/
│   ├── dev-api.mjs              # Local runner for api/*.js on :3001 (Vite proxies /api there)
│   ├── key-check.mjs            # Run detectKey/detectBPM on one file
│   ├── key-bench.mjs            # Score detectKey against key-truth.json (exact / relative / neighbour / wrong)
│   └── key-truth.json           # 117 tracks from ~/Desktop/Mixing Mersic with Rekordbox Camelot keys
├── e2e/smoke.spec.js            # Playwright smoke tests (lab loads, /analyze redirect, settings, sign-in dialog)
├── src/
│   ├── lib/
│   │   ├── helper.js            # Client for the local helper (health, resolve, jobs, file URLs, clipboard URL sniffing)
│   │   ├── vault.js             # Vault client: fetch/save/deleteBlobs, vaultIdFor(), Camelot + tempo compatibility helpers
│   │   ├── labAuth.js           # getLabToken, labAuthHeaders, labSignIn, labVerify, labSignOut (localStorage)
│   │   ├── posthog.js           # PostHog init + tracking helpers (many are legacy no-ops now)
│   │   ├── sentry.js            # Optional error monitoring
│   │   └── webVitals.js         # Core Web Vitals → PostHog
│   ├── contexts/AuthContext.jsx # AuthProvider/useAuth: { isSignedIn, loading, signIn, signOut, prefs, updatePrefs }
│   ├── components/
│   │   ├── auth/LabSignIn.jsx   # Password modal (focus trap, dock auto-hide)
│   │   ├── layout/Dock.jsx      # Vertical dock: Lab, Settings, theme, lock/unlock
│   │   ├── layout/PageLayout.jsx
│   │   ├── audio/               # LinkImport (paste link / search / playlist batch), AudioUploadSection, WaveformVisualizer, PlaybackControls,
│   │   │                        # SpectrumAnalyzer, AnalyzeSection, InstrumentSelector, StemSelector, StemPlayer (arrangement map),
│   │   │                        # TrackAnatomy (study guide), VocalChopKit, PresetSelector
│   │   ├── analysis/            # AnalysisStepFlow, StepFlow, Step, ADSREnvelope, ResultsTabs, SoundRecipe (SoundSauce + VitalGuide)
│   │   ├── comparison/ExportToolbar.jsx
│   │   ├── history/HistoryPanel.jsx   # Recent analyses (localStorage) — interim until the Vault lands
│   │   └── ui/                  # Tooltip, FeatureCard, ErrorBoundary, Toast, SynthKnob, Skeleton, SaucyHelper, …
│   ├── hooks/
│   │   ├── useAudioProcessor.js # Web Audio playback + analysis orchestration (+ detectTempoAndKey proxy)
│   │   ├── useAudioWorker.js    # Worker RPC (analyzeAudio, detectInstruments, detectTempoAndKey, spectral match, …)
│   │   ├── useStemSeparation.js # Separation workflow, keep-to-Blob, stamped downloads, Remix Pack zip
│   │   ├── useStemPlayer.js     # Synced multi-stem playback (own AudioContext, per-stem gains, loop), lane waveforms
│   │   ├── useVault.js          # Vault state: cached load, serialised whole-index saves, upsertTrack/removeTrack
│   │   ├── useHelper.js         # Helper availability (15s poll + focus), resolve(query), grab(url) with job progress
│   │   ├── useHistory.js        # localStorage recent analyses
│   │   ├── useTheme.js, usePageTitle.js, useFocusTrap.js
│   ├── pages/
│   │   ├── Calc.jsx             # /calc — Remix Calculator: transpose / tempo / warp advice, vault pickers, 0-shift targets
│   │   ├── Vault.jsx            # /vault — track grid, search, Camelot + tag chips, "mixes with", inline edit, keep / keep all, pack / to live / 4-stem, delete
│   │   ├── Notes.jsx            # /notes — Remix Notes journal per vault track (unlocked) / public portfolio (visitors)
│   │   ├── Analyze.jsx          # The Lab (route "/") — upload, waveform, stems, analysis step flow
│   │   ├── Settings.jsx         # Theme, DAW, artist name, lab lock, storage note
│   │   └── NotFound.jsx
│   ├── utils/
│   │   ├── remixMath.js         # Pure calculator math: camelotOf, relativeKey, transposeSemitones, tempoChange, warpAdvice, compatibleTargets
│   │   ├── remixPack.js         # buildRemixPackBlob / downloadRemixPackFromUrls / downloadStemFromUrl / saveStemsToLive / keepStemUrl (shared by Lab + Vault)
│   │   ├── vocalChops.js        # detectPhrases (adaptive gate), encodeWavSlice, buildChopFilename — pure, tested
│   │   ├── spectrum.js          # Signal Deck colour system
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

### Track import via the local helper

yt-dlp cannot run on Vercel (Python + ffmpeg, and YouTube blocks datacenter IPs), so link import is a **companion process on the Mac**: `helper/remix-helper.mjs`, started with `npm run helper` (also part of `npm run dev:full`) or installed as a login item with `npm run helper:install`. Prereqs: `brew install yt-dlp ffmpeg`.

- Browsers exempt `http://localhost` from mixed-content blocking, so the deployed HTTPS site can call it. CORS is restricted to the Lab origins; the helper answers Chrome's Private Network Access preflight (`Access-Control-Allow-Private-Network: true`). `vercel.json` CSP allows `http://localhost:7331` in `connect-src`/`img-src`.
- `POST /resolve {query}` — URL → single track (or playlist entries); free text → `ytsearch5` + `scsearch5` interleaved. yt-dlp's SoundCloud extractor covers SoundCloud, no cobalt needed.
- `POST /jobs {url}` → `yt-dlp -f bestaudio -x --audio-format flac --embed-metadata --write-info-json --write-thumbnail`; `GET /jobs/:id` reports `phase` (downloading/converting/finishing) + progress parsed from `--newline` output; `GET /files/:id` streams the FLAC, `/files/:id/thumb` the cover.
- Metadata: `splitArtistTitle()` prefers yt-dlp's `artist`/`track`, else splits "Artist - Title", else uses the uploader; strips "(Official Video)" noise. Files are also copied to `~/Music/Remix Lab/Sources/<Artist - Title>.flac` for Live's browser.
- Frontend: `useHelper()` polls `/health`; `LinkImport` shows a setup card when offline (with a copyable `npm run helper`), otherwise a paste/search box. With no audio loaded it renders as the Lab's hero ("Paste a link. Get the file."). A document-level `paste` listener means **Cmd+V anywhere on the page** with a media URL starts the grab; the button reads "Get file" for URLs and "Search" for text. After import the header shows a `save file` button (downloads the FLAC from memory) and the toast names the file saved under `~/Music/Remix Lab/Sources/`. `Analyze.handleImported()` loads the FLAC exactly like an upload and sets `audioMetadata` (artist, title, thumbnailUrl, sourceUrl) — the header shows the artwork and stem filenames get the real artist.
- Keep yt-dlp current (`brew upgrade yt-dlp`) — YouTube breaks old versions every few months; the helper's `/health` reports the version (the menubar app has an "Update yt-dlp" item).
- **`PUT /stems/:folder/:name[?sub=chops]`** — raw body → `~/Music/Remix Lab/Stems/<folder>/[sub/]<name>` (vocal chops; 200 MB cap). Client: `helperPutFile()`.
- **`POST /stems {folder, files:[{name,url}], notes}`** — the helper fetches each stem URL (only `*.public.blob.vercel-storage.com` / `replicate.delivery` hosts) into `~/Music/Remix Lab/Stems/<folder>/` and writes `notes.txt`. Client: `saveStemsToLive(stemUrls, meta, mode)` in `utils/remixPack.js`; "To Live" button in the Lab's stems-ready panel and "to live" on Vault cards (only rendered while `helper.online`). Add `~/Music/Remix Lab/` to Live → Places once.
- **Batch grab**: a playlist / set URL resolves to its entries; `LinkImport` shows checkboxes + "Grab vocals from N". `Analyze.jsx` runs an effect-driven queue (`batch` state: grab → `load` waits for `trackInfo` so filenames get stamped, 15 s fallback → `separate` (vocals/best) → `keep` waits for every stem `saved` → next), with a progress strip and per-track log; "stop" cancels. Requires the lab to be unlocked. Verified on `soundcloud.com/oden_and_fatzo/tracks`.
- **Menubar app** (`helper/menubar/remix_menubar.py`, Python `rumps`): 🟢 healthy / 🟡 missing yt-dlp or ffmpeg / 🔴 offline, polls `/health` every 10 s, starts the helper if nothing answers (and restarts it after a crash), menu: Open the Lab, Open Sources/Stems folder, Update yt-dlp (brew), Restart helper, Show log. `npm run menubar:install` creates a venv in `~/Library/Application Support/Remix Lab/`, installs rumps, writes the `app.soundsauce.remix-menubar` LaunchAgent and removes the older helper-only agent so they don't fight over :7331.

### The Vault

One JSON document, `vault/index.json` on Vercel Blob, read/written only through `/api/vault` (lab-gated). Single user → whole-index replace on every save; `useVault` serialises saves through a promise chain and keeps a localStorage cache for instant loads.

- **Track id** = the random suffix of the source upload's Blob URL (`vaultIdFor(audioUrl)`), so re-separating the same upload updates rather than duplicates.
- **Auto-save**: an effect in `Analyze.jsx` upserts the track whenever `separationStatus === 'ready'`, and again as `keepStatus` changes (so `kept` flags and permanent URLs land). Fields: title, artist, source, sourceUrl, thumbnailUrl (the platform artwork URL from the helper — not the helper's temp file), duration, bpm, key `{ key, mode, camelot, confidence }`, audioUrl, mode, `stems: { [type]: { url, kept, size } }`, notes, tags.
- **Restore**: `/?track=<id>` — the Lab fetches `audioUrl`, resets state, sets metadata, and calls `restoreStems(urls, audioUrl, mode)`. Replaces the Supabase-era `?id=` restore.
- **Delete** removes the entry and `del()`s its stem + source blobs, then refreshes the Blob usage summary (shown as a spectrum bar against the 1 GB Hobby cap).
- **Compatibility mode** ("mixes with"): `compatibleCamelot()` (same, ±1, relative) and `tempoCompatible()` (±8%, or half/double) in `lib/vault.js`.
- Downloads from the Vault go through `utils/remixPack.js`, which fetches stem URLs and zips client-side (expired Replicate URLs surface as "re-separate the track").
- **Polish (Sep 14)**: hover the title → pencil → inline title/artist edit (Enter/blur saves, Esc cancels); `#tags` per card with a tag-filter row in the toolbar; temp stems have a per-stem **keep** and the toolbar a **keep all (N)** (`keepStemUrl()` re-hosts on Blob and upserts `{ url, kept, size }`); cards show the stems' bytes; the layers button opens `/?track=<id>&mode=stems4` — the Lab restores the source and calls `separateStems({ existingUrl })`, which skips the upload so the vault id (and entry) stays the same.
- **Notes** live on the track as `notes: { pulled, changes, lessons, resultUrl, public, updatedAt }` (older entries had a string — `normalizeNotes()` in `Notes.jsx` treats it as `lessons`). `GET /api/notes` (no auth) returns only public ones with safe fields; `/notes` renders the editor when unlocked and the portfolio otherwise.

### Remix Calculator (`/calc`)

`utils/remixMath.js` is pure and tested (`remixMath.test.js`). Source = the vocal (prefilled from `/calc?track=<id>` or a vault picker), target = the project (remembered in `localStorage['soundsauce_calc_target']`).

- **Transpose**: shortest shift in [-6, +6]. When modes differ, the target is replaced by its relative key first (Bb min → Db maj = 0 st, same seven notes); `exact` keeps the tonic-to-tonic shift.
- **Tempo**: straight, half-time and double-time readings; the smallest |%| wins and is what the warp advice and Live recipe use.
- **Warp advice**: ≤5% clean Complex Pro, ≤10% fine, ≤18% audible, beyond that Re-Pitch (with the pitch it introduces — `repitchSemitones(ratio)` — subtracted from the transpose figure).
- **Compatible targets**: same / relative / ±1 on the Camelot wheel, each with its semitone cost; zero-shift options first. Clicking one sets the target.
- Vault cards link to `/calc?track=<id>`.

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

Route `/` (legacy `/analyze` redirects). Flow: upload → waveform (drag-to-select region, 64× zoom) → header BPM/key chip → `StemSelector` (mode picker → progress → stem cards) → **`StemPlayer`** (when stems are ready) → `AnalyzeSection` → post-analysis `AnalysisStepFlow` (Identify → Preset → Recreate → Full Analysis).

### Stem Player + Arrangement Map

`useStemPlayer({ stemTypes, getStemAudio, onPlay })` owns a second AudioContext: every stem decoded once, one `AudioBufferSourceNode` per stem → per-stem `GainNode` → master, all started on the same timestamp. Mute/solo (`stemGain(type, muted, soloed)` — solo wins) only touch gains; seek and loop rebuild the sources; `positionRef` is read by the UI at 60 fps. It is mutually exclusive with the single-source player: `onPlay` pauses `useAudioProcessor`, and `handleTogglePlayback` / `handlePlayStem` call `stemPlayer.pause()`.

`StemPlayer.jsx` draws one lane per stem (min/max from `summarise()`, 1200 columns, stem colour, greyed when silent) under a ruler, plus a bar grid from the header BPM (every bar faint, every 4 bars = phrase, every 16 = section; labels thin out with width). Click = seek, drag = loop snapped to bars, "bar 1 here" pins the downbeat to the playhead and ◀ ▶ nudge it a beat. Space toggles play when the map is focused. `getBuffer(type)` hands the decoded stems to the two panels below it.

### Anatomy of a Track

`TrackAnatomy.jsx` + worker `ANALYZE_STEM_ANATOMY` (`analyzeStemAnatomy`): per stem, per bar (bar length from the BPM, bar 1 = 0:00): RMS + "active" (within 18 dB of the loudest bar), chord (triad templates over a peak chroma 80–2 kHz, harmonic stems only), bass root (32k-point FFT chroma 35–250 Hz, **bass stem only** — in two-stem mode the instrumental's kick masquerades as a root), drum onsets (energy flux), plus a 5-band balance. The panel shows a structure grid (one cell per bar, alpha = level), section changes (the active-stem set changes, or a stem moves ≥ 6 dB between 4-bar blocks — "drop?/breakdown?" hints only from non-vocal stems), the most common 4-bar chord / bass loop with a palette, and a card per stem (band balance, plays N of M bars, level, hits/bar).

### Vocal chop kit

`utils/vocalChops.js` (pure, tested): `detectPhrases(mono, sampleRate, { minGapMs, minPhraseMs })` builds a 10 ms RMS envelope, gates it at an **adaptive threshold** (55% of the way from the stem's p10 floor to its p75 singing level, clamped −40…−14 dB — Demucs stems carry residue so a fixed low gate calls everything singing), closes gaps shorter than `minGapMs`, drops runs shorter than `minPhraseMs`, adds 15 ms preroll / 60 ms release. `CHOP_SENSITIVITY` tight/normal/loose = 120/250/500 ms gaps → on Tell Me What You Want 53/32/17 chops, medians 2.3/3.8/5.3 s. `encodeWavSlice()` writes 16-bit WAV at the stem's channel count with 5 ms fades. `VocalChopKit.jsx` lists chops with bar numbers, previews on its own AudioContext, jumps the Stem Player, and exports a zip or PUTs each file to the helper (`PUT /stems/:folder/:name?sub=chops`) → `~/Music/Remix Lab/Stems/<Artist - Title>/chops/`. Stem waveform swap, per-stem loop regions, stem-aware playback and Gemini refinement are unchanged from the original analyzer (see `CLAUDE.md` at `c28e4f0` for the deep-dive). Recent analyses persist in localStorage via `useHistory`/`HistoryPanel` until the Vault replaces them.

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

### Design System — Signal Deck

**Concept: colour is frequency.** Five hues map to five regions of the spectrum, low → high, and every coloured thing in the app derives from that mapping (`src/utils/spectrum.js`):

| Region | Hue | Hex | Used for |
|---|---|---|---|
| sub / bass | violet | `#8B5CF6` | bass stems, low-end readouts |
| low-mids | blue | `#3B82F6` | piano / instrumental stems, key chip |
| mids | green | `#22C55E` | guitar stems, "kept/done" is the one semantic green (`#34D399`) |
| high-mids | yellow | `#FACC15` | drums stems, **the single accent** (`ember-*` scale now points here), BPM chip, playhead, primary buttons |
| air | red | `#EF4444` | vocal stems, errors |

- **Waveforms are coloured by spectral centroid** — the worker's `GENERATE_WAVEFORM_COLORS` returns one t∈[0,1] per column: up to 6 × 2048-pt FFTs averaged per column, then a ~1.2 s moving average, mapped on a log scale from 120 Hz to 8 kHz (a full mix sits green–yellow, a filtered breakdown goes blue). `WaveformVisualizer` draws unplayed columns as the neutral grey pulled 35% toward the spectrum colour (`UNPLAYED_SPECTRUM_MIX`) and the played portion in full colour — colour is revealed by playing. The earlier one-FFT-per-column version read as confetti. Stem waveforms get their own map.
- **SpectrumAnalyzer** bars wear the colour of their frequency; the ruler under it is the legend for the whole system. `MiniSpectrum` (5-band meter, one bar per hue) sits in every stem card and animates from `spectrumDataRef` while that stem plays.
- **Stem strips** (`StemSelector`): left colour stripe from `stemColor(type)`, Syne uppercase title, mono readout grid (`format` / `state`), live meter, mono lowercase buttons.
- **Ground**: near-black `#050607` with a 40px hairline grid (`.bg-grid-dark` / `.bg-grid-light`); panels `#0D0F12`, elevated `#14171C`, hairlines `#1C2027`. Light theme: `#F5F6F8` ground, white panels, `#D9DDE3` hairlines. Neutrals are blue-biased; `zinc-*` / `stone-*` / `amber-*` Tailwind tokens are **re-pointed in `@theme`** so legacy classes re-skin automatically.
- **Utilities** (`index.css`): `.bg-spectrum`, `.bg-spectrum-v`, `.text-spectrum`, `.rule-spectrum` (2px gradient rule — under headers, along the Analyze button's bottom edge), `.ring-signal` (active control glow).
- **Typography**: Syne (display — uppercase, bold, tracked; titles, step names, card headers), Albert Sans (body), DM Mono (all numbers, readouts, secondary buttons, placeholders). Tailwind: `font-display`, `font-sans`, `font-mono`. Loaded from Google Fonts in `index.html`.
- **Shape**: `rounded-md` (6px) controls, `rounded-lg` panels, hairline borders instead of shadows. Waveform canvas + analyzer stay squared.
- **Not Ableton-themed** — explicitly. Instrument-like and data-driven, but its own thing.
- The old Obsidian Ember amber/zinc palette lives at `c28e4f0` and in the `Remix Lab Directions` artifact (`https://claude.ai/code/artifact/476424f9-9c06-4a98-9488-51c87cb306d2`, which also holds the two rejected directions).

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
npm run dev:full     # Vite + API + helper together (Browser-pane config: "full")
npm run helper       # Local yt-dlp companion only (localhost:7331)
npm run helper:install  # Install the helper alone as a macOS LaunchAgent (starts at login)
npm run menubar         # Run the status-dot menubar app in the foreground (needs `pip install rumps`)
npm run menubar:install # Install the menubar app (+ helper supervision) as a login item
node scripts/key-check.mjs "<file>"      # Key + BPM for one file
node scripts/key-bench.mjs [--verbose]   # Score detectKey against scripts/key-truth.json
npm run build        # Production build to /dist (frontend only)
npm run lint         # ESLint
npm run test:run     # Vitest once (60 tests: DSP, curated presets, remix math, a11y)
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
| 2b | **Link import (local helper)** | ✅ Done | yt-dlp companion; paste a YouTube/SoundCloud link or search by name; FLAC + artist/title/artwork |
| 2c | **Signal Deck UI** | ✅ Foundation done | Chosen from 3 mock directions. Tokens, fonts, grid, Dock, header, frequency-coloured waveform, spectrum analyzer, stem channel strips with live meters. Remaining: AnalysisStepFlow content cards, Settings polish |
| 3 | **Acapella Vault** (`/vault`) | ✅ Done | Index of every kept track as `vault/index.json` on Blob (single user → read-modify-write is fine). Search by artist/title, filter by Camelot key / BPM range, re-download, delete (frees Blob), "find compatible". Save an entry at separation time; restore a session from a vault item (replaces the deleted Supabase `?id=` restore). Reuse Discover's grid/filter UI from `c28e4f0` |
| 4 | **Remix Calculator** (`/calc`) | ✅ Done | Source key/BPM → target key/BPM → semitones, tempo %, warp-mode advice (<10% Complex Pro), Camelot alternatives. Prefill from a vault item |
| 5 | **Stem Player + Arrangement Map** | ✅ Done | `useStemPlayer` + `StemPlayer`: synced mute/solo, stacked lanes, bar grid, drag-to-loop |
| 6 | **Anatomy of a Track** | ✅ Done | `TrackAnatomy` + worker `ANALYZE_STEM_ANATOMY`: structure grid, sections, chord / bass loops, per-stem cards |
| 7 | **Remix Notes** (`/notes`) | ✅ Done | Journal per vault track (pulled / changes / lessons / result link / public) + public portfolio via `/api/notes` |
| 8 | **Compatibility Finder** | ✅ Done | Lives in the Vault as "mixes with" (Camelot neighbours ± 8% tempo) |
| 9 | **Vocal chop kit** | ✅ Done | `utils/vocalChops.js` + `VocalChopKit`: adaptive phrase detection, preview, zip / chops folder |
| — | Later | Ideas | Mashup preview (Stem Player engine + playbackRate), reference A/B (calculateSpectralMatch exists), `.als` generation (gzipped XML from a Live 12 template), Vault as a Camelot wheel |

## Known Issues / Debt

- ESLint: ~10 React-19 `set-state-in-effect` style warnings and 2 pre-existing errors (`Step.jsx`/`Toast.jsx` Fast Refresh export shape, `vitalPresets.js` unused var). Zero runtime bugs.
- `src/lib/posthog.js` still exports ~30 tracking helpers for deleted features. Harmless; trim when convenient.
- `PresetSelector.jsx` is ~1,400 lines and still carries the A/B compare panel and auto-optimize sweep from the preset-accuracy work. Useful for recreating bass/lead stems; leave unless it gets in the way.
- Vercel CLI login is valid as of Sep 14 2026.
- `e2e/smoke.spec.js` doesn't cover `/notes` or the Stem Player yet.

## Completed

- [x] **Queue items 5–8** (Sep 14 2026, same session)
  - **Vocal chop kit** — `src/utils/vocalChops.js` (+6 tests), `VocalChopKit.jsx`, helper `PUT /stems/:folder/:name`, `helperPutFile()`, `useStemPlayer.getBuffer()`. Verified: 32 stereo WAVs into `…/chops/`.
  - **Anatomy of a Track** — worker `analyzeStemAnatomy` / `ANALYZE_STEM_ANATOMY`, `useAudioWorker.analyzeStemAnatomy`, `TrackAnatomy.jsx`. Verified on Tell Me What You Want: A#m ×62 of 86 bars, 9 sections. Bass roots restricted to a real bass stem after the instrumental's kick read as "E".
  - **Remix Notes** — `pages/Notes.jsx`, `api/notes.js`, `api/_vaultIndex.js`, Dock item, notes link on Vault cards. Verified: save → `/api/notes` → visitor view. Fixed `useToast()` destructuring in `Vault.jsx`.
  - **Vault polish** — inline edit, tags + filter, keep / keep all (`keepStemUrl`), size on cards, re-separate as 4-stem (`separateStems({ existingUrl })`, `?mode=stems4`). Inline edit and tags verified in the browser; keep-all and 4-stem re-separation are code-reviewed but not exercised live (they spend Blob / GPU).
- [x] **Queue items 1–4** (Sep 14 2026, evening session)
  - **Waveform colouring rework** — `GENERATE_WAVEFORM_COLORS` averages several FFTs per column and smooths ~1.2 s, range narrowed to 120 Hz–8 kHz; unplayed = neutral + 35% tint, played = full colour.
  - **Key confidence hardening** — ground truth pulled from Rekordbox's SQLCipher DB with `pyrekordbox` (117 of the Mixing Mersic tracks); `scripts/key-bench.mjs`; extractor rewritten (top-12 peaks, window normalisation, tuning correction, no harmonic voting) and profiles learned from the library. 46% → 65% exact, 35% → 13% wrong; confidence now separates wrong (avg 67) from right (avg 81). Tell Me What You Want → Bb minor 3A still.
  - **Stem Player + Arrangement Map** — `src/hooks/useStemPlayer.js`, `src/components/audio/StemPlayer.jsx`, wired under `StemSelector` in `Analyze.jsx`; `stemTypes` in `useStemSeparation` is now memoised.
  - **To Live** — helper `POST /stems` + `saveStemsToLive()`; buttons in Lab + Vault. Verified: two FLACs + notes.txt in `~/Music/Remix Lab/Stems/…` in ~2 s.
  - **Batch grab** — playlist checkboxes + queue state machine in `Analyze.jsx`; verified on a SoundCloud artist page with one track ("Lauren" is now in the vault).
  - **Menubar app** — `helper/menubar/` (rumps) + `npm run menubar`, `menubar:install`.
  - **Blob budget in Settings** — `describeStorage()` / `formatMB()` / `BLOB_LIMIT_BYTES` in `lib/vault.js` (shared with the Vault header); Settings shows "305 MB of 1 GB used · ~13 more tracks fit".
- [x] **Paste-a-link UX pass** (Sep 14 2026) — `LinkImport` hero mode, global Cmd+V paste, "Get file" CTA, copyable helper command when offline; `Analyze` keeps `savedTo`/`importFilename` in `audioMetadata`, header `save file` button, clearer toast; upload card becomes "Or drop a file".
- [x] **Remix Calculator** (Sep 2026) — `utils/remixMath.js` (+9 tests), `pages/Calc.jsx`, Dock item, vault card link, SaucyHelper tips. Verified: Bb min vocal → C min project = +2 st / −3.1%; → Db maj = 0 st via relative.
- [x] **Key detection fix** (Sep 2026) — `detectKey` analysed only the first ~1.4 s, mislabelled pitch classes by 9 semitones, and inverted the K-S rotation. Now: 200 windows across the whole track, harmonic pitch-class profile from spectral peaks (f/1..f/4, bass boost), confidence + alternatives. Tell Me What You Want → Bb minor 3A (was E/G#/F#m). `scripts/key-check.mjs` runs the detector on any file. Conventional flat spellings via `displayKeyName()`.
- [x] **Acapella Vault** (Sep 2026) — `api/vault.js`, `lib/vault.js`, `useVault`, `pages/Vault.jsx`, `utils/remixPack.js`; auto-save on stems ready / keep; `/?track=<id>` restore; Dock item; SaucyHelper tips.
- [x] **Signal Deck UI — foundation** (Sep 2026)
  - Direction chosen from the `Remix Lab Directions` mock deck (Neon Playground / Riso Studio / Signal Deck) with the spectrum widened to purple → blue → green → yellow → red.
  - `src/utils/spectrum.js` (SPECTRUM, spectrumColor/Rgb, hzToSpectrumT, STEM_COLORS, BAND_COLORS); `@theme` tokens for spec-* colours, ember re-pointed to yellow, zinc/stone/amber re-pointed to blue-biased neutrals; Syne / Albert Sans / DM Mono replace Satoshi / General Sans / JetBrains Mono.
  - Worker `GENERATE_WAVEFORM_COLORS` + `useAudioWorker.generateWaveformColors` + `waveformColorRef` on `useAudioProcessor` (and per-stem `stemWaveformColorRef` in Analyze); `WaveformVisualizer` takes `waveformColorRef` and strokes columns in spectrum colour via a run-batched `strokeColumns` helper (dim unplayed / full played), yellow playhead, spectrum-tinted loop.
  - `SpectrumAnalyzer` rewritten (bars coloured by frequency, legend rule); `MiniSpectrum` five-band meter (rAF, no React re-render); `StemSelector` channel strips (colour stripe, mono readout, meter, `spectrumDataRef` prop from Analyze); mode picker shows stem colour strips.
  - Dock, PageLayout grid (`bg-grid-dark/light`), Lab header (Syne title, mono line, BPM/key chips), `AnalyzeSection` (spectrum rule edge), `PlaybackControls` (spectrum progress, yellow play), `LinkImport` (`>` prompt, mono), `Step` typography.
  - Verified in both themes with a live stem playing.
- [x] **Link import via local helper** (Sep 2026)
  - `helper/remix-helper.mjs`: Node server wrapping yt-dlp + ffmpeg on localhost:7331 with CORS + PNA headers; `/resolve` handles URLs, playlists and free-text search across YouTube and SoundCloud; `/jobs` downloads to FLAC with embedded metadata, cover art and `info.json`, reports phase/progress, copies the result to `~/Music/Remix Lab/Sources/`. `helper/install-launchagent.sh` for a login item.
  - Frontend: `src/lib/helper.js`, `useHelper` hook, `LinkImport` component (offline setup card, paste/search, clipboard suggestion, results with artwork + platform badge, progress). `Analyze.handleImported()` + shared `resetForNewAudio()`; header shows artwork; `audioMetadata` gains `thumbnailUrl`/`sourceUrl`/`source`.
  - `npm run helper`, `npm run helper:install`; `dev:full` now runs Vite + API + helper. CSP allows localhost:7331. Lucide v1 has no brand icons — platform badges are text pills.
  - Verified locally: `ytsearch`/`scsearch` both resolve "Tell Me What You Want" (YouTube extended mix 4:18, SoundCloud original 2:40). yt-dlp upgraded 2026.03.17 → 2026.08.19 via Homebrew (old version warned >90 days).
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

**Key Detection** (`detectKey(channelData, sampleRate, options)` — options default to `KEY_DETECT_DEFAULTS`)
- 200 × 8192-pt windows spread over the whole track; per window the 12 loudest spectral peaks between 65 Hz and 2.1 kHz (parabolic interpolation) vote for their pitch class; each window's chroma is max-normalised before averaging so loud sections don't dominate; near-silent windows are skipped
- Tuning correction: circular mean of the peaks' fractional-semitone offsets is folded out before binning (`tuningCents` in the result) — pitched edits and old records aren't at A440
- Pearson correlation against the `lab` profiles: 75% learned from the 117-track library (mean standardised chroma rotated to the Rekordbox tonic) + 25% standardised Krumhansl-Schmuckler (restores the third enough to break tonic/dominant ties). `ks` and `temperley` profiles are still selectable via `options.profiles`
- Confidence ≈ `-40 + 140·corr` (+ up to 10 for margin): below ~60 the header chip shows `~`. On the benchmark corr < 0.7 was usable only half the time, ≥ 0.7 about 90%
- Benchmark (`scripts/key-bench.mjs`): 65% exact · 87% usable (exact / relative / ±1 Camelot) · 13% wrong, leave-one-out 64 / 87 / 13. Was 46 / 65 / 35 with K-S profiles + the old extractor. Tried and rejected (documented above `KEY_DETECT_DEFAULTS`): harmonic sub-voting, 16k/32k windows, bass-only chroma, per-segment voting, discriminatively trained profiles
- Returns key, mode, Camelot code, scale notes, compatible keys, confidence, alternatives, chroma

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
