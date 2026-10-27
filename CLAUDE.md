# CLAUDE.md - SoundSauce Remix Lab

This file provides context for AI assistants working on this project.

## Workflow Rules

- **Auto-update CLAUDE.md**: After completing any task, todo, fix, or feature, update this file — add completed items to `### Completed` and update any relevant architecture notes or file descriptions. Do not wait to be asked.
- **Single user**: This is Spencer's personal tool. No multi-tenant concerns, no signup funnels, no tiers. Optimise for daily use in an Ableton Live 12 (Standard) remix workflow on an Intel Mac.

## What This Is

**SoundSauce Remix Lab** — a browser tool at **https://soundsauce.app** that does exactly four things for a track Spencer wants to remix:

> paste a link → **stems** · **key** · **BPM** · **section labels** (intro / breakdown / buildup / drop / outro)

That's the whole product as of 2026-09-15. Everything else that used to be here — the sound-design analyzer and Vital preset flow, Track Anatomy, the vocal chop kit, Remix Notes, tags, batch grab, Gemini instrument detection — was cut on Spencer's instruction ("we've got too much going on"). It's all in git: the social platform at **`c28e4f0`**, the full-featured Remix Lab at tag **`checkpoint-before-simplify`** — restore any piece with `git checkout checkpoint-before-simplify -- <path>`.

## Where Things Stand (handoff — updated 2026-09-15)

**Deployed**: https://www.soundsauce.app runs `07b2be6` (the simplification) as of 2026-09-15. Deploy with `vercel build --prod && vercel deploy --prebuilt --prod` (CLI login `scurnow24-2856` was valid on Sep 14). The menubar app (`app.soundsauce.remix-menubar` LaunchAgent) supervises the helper on :7331.

**Daily workflow**: menubar dot green → Lab → Cmd+V a link (a DRM'd SoundCloud link → pick the YouTube result it offers) → FLAC in the Lab + `~/Music/Remix Lab/Sources/` → BPM / key chips + a first **sections** strip appear within seconds → Grab Vocals → auto-kept, in `/vault` → the **Stem Player** replaces the waveform, sections re-detected from the stems → fix any label by dragging / clicking → **To Live** → `~/Music/Remix Lab/Stems/<Artist - Title>/` (stems + `notes.txt` with the sections and bar numbers), or **Lock to tempo** → type your project BPM → stems rendered onto an exact grid in `…/<Artist - Title> - locked <bpm>/`, drop them at 1|1|1 with Warp off → `/calc` if the key needs moving.

**Direction decisions Spencer made (don't re-litigate)**:
- 2026-09-15: **"I just want a tool that gives me stems, what key, bpm, and labels for the different sections of the song."** Keep: stems, Stem Player, Calculator, Vault (with "mixes with"). Cut: the preset / recreate flow, Anatomy, Vocal Chop Kit, Notes, tags, 4-stem re-separate from the Vault, batch grab. Sections: auto-detect then edit, DJ vocabulary, shown on the Lab timeline; once stems are ready the Stem Player is the only timeline.
- 2026-09-14: single user, local helper, password-gated GPU. No analytics. Ableton only.

**Not deployed yet**: lock to tempo (Oct 26 2026) is on `main` but the live site is still `07b2be6`. It needs no new env vars; the helper side only needs `brew install rubberband` on this Mac.

**Suggested next things**:
1. **Section detector tuning** — it's an energy heuristic (see below). Judge it on real tracks over a week; the knobs are the band weights, the 0.2 novelty step, the p80 − 0.25 drop cut and the buildup rise threshold in `detectSections()`. Keep a few hand-labelled tracks as a fixture before tuning (the vault's `sections` with `sectionsSource: 'manual'` are exactly that).
2. **Blob budget reality** — long tracks cost ~120–215 MB, not 55; consider not keeping the source upload.
3. **Helper title cleanup** — YouTube titles like "Lauren (Official Visualiser) | Ministry of Sound" get through `splitArtistTitle()`; strip `| Label` suffixes and "(Official Visualiser)".
4. **Sample finder accuracy** — key is the weak link (one in eight wrong); the octave-folded
   BPM was right on all 7 confidently-paired rows. Worth re-measuring with
   `scripts/library-check.mjs` once the whole playlist is analysed and the overlap is bigger.
   `DETECT_BEATS` (the tempo-lock beat tracker) is more accurate than `detectBPM` if tempo ever
   does prove to be the problem.
5. **Lock to tempo from the Vault** — the button only exists in the Lab today; the Vault would have to fetch and decode a stem to beat-track it.
6. Parked: mashup preview (Stem Player engine + playbackRate), Vault as a Camelot wheel, `.als` generation with locators from the sections.

**Gotchas for whoever picks this up**
- The Browser pane in Claude Code is a fresh profile: unlock with the `LAB_PASSWORD` from `.env.local` (POST `/api/auth`, store `{token, expiresAt}` in `localStorage.soundsauce_lab_session`). In that pane **Enter doesn't submit forms and `form_input` doesn't fire React onChange** — set the value with the native setter + an `input` event, then click buttons. Its screenshots render at quarter size; use `read_page` / `get_page_text` / `javascript_tool` for facts. Synthetic `PointerEvent`s do drive the section strip (there's a try/catch around `setPointerCapture`).
- **Chrome Local Network Access**: the deployed HTTPS site reaching `http://localhost:7331` needs Chrome's per-site "local network" permission (138+). If the dot is green but the Lab says off: site info → Site settings → Local network access → Allow. Safari never allows it. The offline card explains this.
- **DRM**: major-label SoundCloud uploads are encrypted streams; yt-dlp refuses them (correctly — don't work around it). `/resolve` derives a name from the URL slug and returns a search instead.
- Vercel Blob is at ~711 MB / 1 GB (four vault tracks). The Vault's delete button frees space.
- `npm run dev:full` starts a second helper that loses the fight for :7331 to the menubar one — harmless, the first one answers. An orphan can be cleared with `pkill -f remix-helper.mjs`.
- Key detection ground truth: `scripts/key-truth.json` (117 tracks, Camelot codes from Rekordbox). Re-run `node scripts/key-bench.mjs` after touching `detectKey`; the numbers to beat are in the comment above `KEY_DETECT_DEFAULTS`. Both scripts eval the worker source directly, so the worker must stay free of `import`s.
- `useToast()` returns `{ toast }` — destructure it.
- **AppleScript into Music**: match playlists by `persistent ID`, never by name, and read
  properties per track inside a `repeat` — bulk access (`artist of every track of p`) throws on
  Apple Music cloud items. If the helper is started as a LaunchAgent and `osascript` returns
  -1743, allow it under System Settings → Privacy & Security → Automation.
- **Never run worker DSP inline in the helper.** `detectBPM`/`detectKey` block the event loop
  for seconds; during the first library batch that made `/health` time out and the Lab showed
  "paste-a-link is off" while the helper was perfectly alive. They live in
  `helper/detect-worker.mjs` now.
- **rubberband time maps fail silently.** A `-M` map needs an overall `-D` matching the map's last target frame, or it emits NaN and passes the audio through unstretched (exit 0). Never write a `0 0` anchor either — it's a 0/0 segment with the same warning. Also: this Mac's ffmpeg has no soxr, so `aresample=…:resampler=soxr` errors out; use `filter_size=`.
- Beat tracking (`DETECT_BEATS`) must never be run on a vocal stem — it tracks half-tempo and is wrong. Confidence under 40 means "we were handed the wrong stem".
- `src/data/helperGuide.js` is the in-app manual — **update it whenever a button is added, renamed or moved.**
- The Playwright guide test force-clicks the floating icon (it idles on an infinite animation).

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | JavaScript (JSX), ES2020+ |
| Framework | React 19 + Vite 7 |
| Styling | Tailwind CSS 4 — **Signal Deck** theme in `src/index.css` `@theme` (not `tailwind.config.js`); colour system in `src/utils/spectrum.js` |
| Audio | Web Audio API + Web Worker DSP (`src/workers/audio.worker.js`: BPM, key, sections, waveform data/colours — 750 lines) |
| Track import | **Local helper** (`helper/remix-helper.mjs`, yt-dlp + ffmpeg on the Mac, `localhost:7331`) — paste a YouTube/SoundCloud link, a playlist, or search by name → FLAC + metadata; also writes stems into Live's browser. `helper/menubar/` is a Python `rumps` status-dot app that supervises it |
| Stem separation | Demucs on Replicate (`cjwbw/demucs`, models `htdemucs_ft` / `htdemucs` / `htdemucs_6s`), FLAC output |
| Storage | Vercel Blob (source uploads + kept stems). ~1 GB on Hobby |
| Auth | Single lab password → HMAC session token (`api/_auth.js`). No Supabase, no accounts |
| Zip | `fflate` (Remix Pack) |
| Animation | `motion/react` (Dock, modals) |
| Icons | `lucide-react` (must stay in `package.json` deps — a missing entry broke Vercel builds in May 2026) |
| Tempo lock | `rubberband` 4 + ffmpeg on the Mac, driven by the helper (`brew install rubberband`) |
| Sample finder | Apple Music playlists via `osascript` → `~/Music/Remix Lab/library.json`; BPM + key computed by a resumable helper batch (yt-dlp → ffmpeg → `detect-worker.mjs`) |
| Testing | Vitest (84 tests: DSP helpers, remix math, tempo lock, sample matching, a11y) + Playwright smoke tests (`e2e/smoke.spec.js`: routes, helper guide, sign-in dialog) |
| Deploy | Vercel (`vercel build --prod && vercel deploy --prebuilt --prod`) |

## Project Structure

```
audio-analyzer-pro/
├── api/                         # Vercel Serverless Functions
│   ├── _auth.js                 # Lab password gate: checkPassword, issueToken, verifyToken, requireLab, signPredictionId
│   ├── _rateLimit.js            # In-memory sliding-window rate limiter (per instance)
│   ├── _validateEnv.js          # Env var presence check helper
│   ├── auth.js                  # POST {password} → {token, expiresAt}; GET verifies a token
│   ├── upload-audio.js          # @vercel/blob client-upload token endpoint (wav/mp3/m4a/flac, 100 MB)
│   ├── vault.js                 # Vault index: GET (tracks + Blob usage) / PUT (replace) / DELETE (blobs of a removed track)
│   ├── separate-stems.js        # Start Demucs prediction: mode vocals|stems4|stems6, quality best|fast, FLAC
│   └── check-stems.js           # Poll prediction; returns whatever stem keys the mode produced
├── helper/
│   ├── remix-helper.mjs         # Local yt-dlp companion (localhost:7331): /health, /resolve, /jobs, /files, POST /stems, POST /lock, /library*
│   ├── library.mjs              # Apple Music index: osascript ingest + the resumable BPM/key batch (~/Music/Remix Lab/library.json)
│   ├── detect-worker.mjs        # detectBPM + detectKey on a worker thread, so the batch can't stall the HTTP server
│   ├── install-launchagent.sh   # Installs the helper alone as a LaunchAgent (npm run helper:install)
│   └── menubar/                 # rumps menubar app (status dot, supervises the helper) + install.sh (npm run menubar:install)
├── scripts/
│   ├── dev-api.mjs              # Local runner for api/*.js on :3001 (Vite proxies /api there)
│   ├── key-check.mjs            # Run detectKey/detectBPM on one file
│   ├── key-bench.mjs            # Score detectKey against key-truth.json (exact / relative / neighbour / wrong)
│   ├── library-check.mjs        # Score the sample finder's library.json against key-truth.json (whole pipeline, strict pairing)
│   └── key-truth.json           # 117 tracks from ~/Desktop/Mixing Mersic with Rekordbox Camelot keys
├── e2e/smoke.spec.js            # Playwright smoke tests (lab loads, /analyze redirect, settings, vault, calc, sample, guide, sign-in dialog)
├── src/
│   ├── lib/
│   │   ├── helper.js            # Client for the local helper (health, resolve, jobs, file URLs, saveStems, clipboard URL sniffing)
│   │   ├── vault.js             # Vault client: fetch/save/deleteBlobs, vaultIdFor(), Camelot + tempo compatibility, storage helpers
│   │   └── labAuth.js           # getLabToken, labAuthHeaders, labSignIn, labVerify, labSignOut (localStorage)
│   │                            # (helper.js also carries the /library client: playlists, sync, analyse, stop)
│   ├── contexts/AuthContext.jsx # AuthProvider/useAuth: { isSignedIn, loading, signIn, signOut }
│   ├── components/
│   │   ├── auth/LabSignIn.jsx   # Password modal (focus trap, dock auto-hide)
│   │   ├── layout/Dock.jsx      # Vertical dock: Lab, Vault, Calculator, Settings, theme, lock/unlock
│   │   ├── layout/PageLayout.jsx
│   │   ├── audio/               # LinkImport (paste link / search / DRM fallback), AudioUploadSection (drop zone; one line once loaded),
│   │   │                        # WaveformVisualizer, PlaybackControls, SpectrumAnalyzer (all three only until stems are ready),
│   │   │                        # StemSelector (mode picker → progress → stem rows), StemPlayer (arrangement map), SectionStrip (section labels),
│   │   │                        # TempoLock (target BPM → semitone/stretch readout → locked FLACs)
│   │   └── ui/                  # ErrorBoundary, Toast, SaucyHelper (tips + "What does this do?" manual)
│   ├── hooks/
│   │   ├── useAudioProcessor.js # Web Audio playback + waveform (+ detectTempoAndKey / detectSections proxies to the worker)
│   │   ├── useAudioWorker.js    # Worker RPC (detectTempoAndKey, detectSections, generateWaveformData, generateWaveformColors)
│   │   ├── useStemSeparation.js # Separation workflow, keep-to-Blob, stamped downloads, Remix Pack zip
│   │   ├── useStemPlayer.js     # Synced multi-stem playback (own AudioContext, per-stem gains, loop), lane waveforms, getBuffer()
│   │   ├── useVault.js          # Vault state: cached load, serialised whole-index saves, upsertTrack/removeTrack
│   │   ├── useLibrary.js        # Apple Music index from the helper: cached rows, sync, batch state polling
│   │   ├── useHelper.js         # Helper availability (15s poll + focus), resolve(query), grab(url) with job progress
│   │   ├── useTheme.js, usePageTitle.js, useFocusTrap.js
│   ├── pages/
│   │   ├── Analyze.jsx          # The Lab (route "/") — import, header, sections + waveform → stems → Stem Player
│   │   ├── Vault.jsx            # /vault — track grid, search, Camelot chips, "mixes with", inline edit, keep / keep all, pack / to live, delete
│   │   ├── Calc.jsx             # /calc — Remix Calculator: transpose / tempo / warp advice, vault pickers, 0-shift targets
│   │   ├── Sample.jsx           # /sample — Find a sample: BPM + key → ranked library tracks, playlist sync, the analysis batch
│   │   ├── Settings.jsx         # Theme, lab lock, Blob storage readout
│   │   └── NotFound.jsx
│   ├── utils/
│   │   ├── sections.js          # SECTION_LABELS, SECTION_COLORS, barAtTime()
│   │   ├── tempoLock.js         # Pure lock math: planTempoLock(), buildTimeMap(), mapTimeThroughLock(), bestResampleSemitones()
│   │   ├── remixMath.js         # Pure calculator math: camelotOf, relativeKey, transposeSemitones, tempoChange, warpAdvice, compatibleTargets
│   │   ├── sampleMatch.js       # Pure match math: canonicalBpm (octave fold), tempoDelta, keyRelation, rankSamples
│   │   ├── remixPack.js         # buildRemixPackBlob / downloadRemixPackFromUrls / downloadStemFromUrl / saveStemsToLive / keepStemUrl
│   │   ├── spectrum.js          # Signal Deck colour system
│   │   ├── stemFiles.js         # SEPARATION_MODES, getStemLabel, buildStemFilename, buildPackFilename, buildPackNotes (with sections)
│   │   └── constants.js         # themeClasses
│   ├── data/helperGuide.js      # The floating helper's manual: every button per page + its cost tag — keep it in sync with UI changes
│   └── workers/audio.worker.js  # FFT, detectBPM, detectKey, detectBeats, detectSections, waveform min/max + colours
├── .claude/launch.json          # "dev" (Vite only) and "full" (Vite + dev-api + helper) preview configs
├── vercel.json                  # SPA rewrite, CSP + security headers
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
- **`POST /stems {folder, files:[{name,url}], notes}`** — the helper fetches each stem URL (only `*.public.blob.vercel-storage.com` / `replicate.delivery` hosts) into `~/Music/Remix Lab/Stems/<folder>/` and writes `notes.txt`. Client: `saveStemsToLive(stemUrls, meta, mode, { sections, gridOffset })` in `utils/remixPack.js`; "To Live" button in the Lab's stems-ready panel and "to live" on Vault cards (only rendered while `helper.online`). `notes.txt` carries tempo, key and the section list with bar numbers. Add `~/Music/Remix Lab/` to Live → Places once.
- A playlist / set URL resolves to its entries — click one. (Batch grab was removed on 2026-09-15; it's at `checkpoint-before-simplify` if ever wanted back.)
- **Menubar app** (`helper/menubar/remix_menubar.py`, Python `rumps`): 🟢 healthy / 🟡 missing yt-dlp or ffmpeg / 🔴 offline, polls `/health` every 10 s, starts the helper if nothing answers (and restarts it after a crash), menu: Open the Lab, Open Sources/Stems folder, Update yt-dlp (brew), Restart helper, Show log. `npm run menubar:install` creates a venv in `~/Library/Application Support/Remix Lab/`, installs rumps, writes the `app.soundsauce.remix-menubar` LaunchAgent and removes the older helper-only agent so they don't fight over :7331.

### The Vault

One JSON document, `vault/index.json` on Vercel Blob, read/written only through `/api/vault` (lab-gated). Single user → whole-index replace on every save; `useVault` serialises saves through a promise chain and keeps a localStorage cache for instant loads.

- **Track id** = the random suffix of the source upload's Blob URL (`vaultIdFor(audioUrl)`), so re-separating the same upload updates rather than duplicates.
- **Auto-save**: an effect in `Analyze.jsx` upserts the track whenever `separationStatus === 'ready'`, and again as `keepStatus`, `sections` or `gridOffset` change. Fields: title, artist, source, sourceUrl, thumbnailUrl (the platform artwork URL from the helper — not the helper's temp file), duration, bpm, key `{ key, mode, camelot, confidence }`, audioUrl, mode, `stems: { [type]: { url, kept, size } }`, `gridOffset` (seconds, where bar 1 lands), `sections: [{ label, start }]` (seconds), `sectionsSource: 'mix' | 'stems' | 'manual'`. Older entries may still carry `notes` / `tags` — ignored.
- **Restore**: `/?track=<id>` — the Lab fetches `audioUrl`, resets state, sets metadata, grid offset and saved sections, and calls `restoreStems(urls, audioUrl, mode)`.
- **Delete** removes the entry and `del()`s its stem + source blobs, then refreshes the Blob usage summary (shown as a spectrum bar against the 1 GB Hobby cap).
- **Compatibility mode** ("mixes with"): `compatibleCamelot()` (same, ±1, relative) and `tempoCompatible()` (±8%, or half/double) in `lib/vault.js`.
- Downloads from the Vault go through `utils/remixPack.js`, which fetches stem URLs and zips client-side (expired Replicate URLs surface as "re-separate the track").
- **Cards**: hover the title → pencil → inline title/artist edit (Enter/blur saves, Esc cancels); temp stems have a per-stem **keep** and the toolbar a **keep all (N)** (`keepStemUrl()` re-hosts on Blob and upserts `{ url, kept, size }`); cards show the stems' bytes; Open in Lab / to live / pack / calculator / mixes with / original / delete.

### Remix Calculator (`/calc`)

`utils/remixMath.js` is pure and tested (`remixMath.test.js`). Source = the vocal (prefilled from `/calc?track=<id>` or a vault picker), target = the project (remembered in `localStorage['soundsauce_calc_target']`).

- **Transpose**: shortest shift in [-6, +6]. When modes differ, the target is replaced by its relative key first (Bb min → Db maj = 0 st, same seven notes); `exact` keeps the tonic-to-tonic shift.
- **Tempo**: straight, half-time and double-time readings; the smallest |%| wins and is what the warp advice and Live recipe use.
- **Warp advice**: ≤5% clean Complex Pro, ≤10% fine, ≤18% audible, beyond that Re-Pitch (with the pitch it introduces — `repitchSemitones(ratio)` — subtracted from the transpose figure).
- **Compatible targets**: same / relative / ±1 on the Camelot wheel, each with its semitone cost; zero-shift options first. Clicking one sets the target.
- Vault cards link to `/calc?track=<id>`.

### Find a sample (`/sample`)

Rekordbox's related-tracks, against Spencer's own listening. Type the project's BPM and key;
get the tracks from an Apple Music playlist that are harmonically and rhythmically close, each
one a click away from the normal grab-and-separate flow (`/?find=<artist title>` hands the
Lab's import box a search and runs it).

**Apple Music gives us nothing but names.** There is no key field, no BPM on the vast majority
of tracks (0 of 25 sampled), and no local `.musiclibrary` on this Mac — the playlists are
cloud-only. So BPM and key are computed here, track by track.

- **Ingest** (`helper/library.mjs`, `POST /library/sync`): `osascript` into Music. Two traps,
  both found the hard way — select a playlist by **persistent ID**, never by name (emoji-named
  playlists mis-resolve and you silently get someone else's 85 tracks), and access properties
  **per track inside a `repeat`**: `artist of every track of p` fails on Apple Music cloud items
  with "Can't get artist of {shared track id …}". Per-track is also fast: 2307 rows in ~25 s.
  `GET /library/playlists` lists every playlist with its count (slow — it counts them all).
- **The index** is `~/Music/Remix Lab/library.json`, written atomically. **Never Blob storage**:
  it is 2,300 rows of listening history and costs nothing to rebuild. Re-syncing a playlist is
  one click — new rows arrive un-analysed, analysed rows keep their numbers, rows that left the
  playlist lose their membership but stay in the index.
- **The batch** (`POST /library/analyse`, `GET /library/analyse`, `POST /library/analyse/stop`):
  per row — `yt-dlp ytsearch1:` search + download, ffmpeg decode to mono 44.1k, `detectBPM` +
  `detectKey`, write the numbers back, **delete the audio**. Nothing accumulates on disk.
  Resumable by construction: there is no queue to lose, it re-reads the index, skips anything
  that already has numbers, and saves after every row — stopping, or killing the helper outright,
  loses at most the track in flight. A row that fails three times is left alone until
  "retry the N that failed". Concurrency is a knob, default 2; measured **~3.3 s per track**
  wall-clock at that setting, so the whole 2,289-row playlist is about two hours.
- **The detectors run on a worker thread** (`helper/detect-worker.mjs`). They are synchronous
  and take seconds; called inline they stall the HTTP server long enough that the Lab's 3 s
  `/health` check times out and paste-a-link goes dark mid-batch. With the thread, `/health`
  stays under 1 s throughout.
- **BPM is folded into one octave on the way in** (`canonicalBpm`, FOLD_MIN 90, mirrored in
  `src/utils/sampleMatch.js`). `detectBPM` reads house and hip-hop at half time most of the
  time — 128→63, 130→65, 148→73 — and an index full of 63s cannot be matched against a 132
  project at all.
- **The ranking is pure and tested** (`src/utils/sampleMatch.js`, 33 vitest). `rankSamples()`
  reuses `compatibleCamelot()` / `tempoCompatible()` from `lib/vault.js` and
  `transposeSemitones()` / `tempoChange()` from `remixMath.js` rather than restating the rules.
  Two buckets: **drop-in** (tempo fits and the key already mixes, sorted same → ±1 → relative,
  then by tempo distance) and **shift** (tempo fits, key doesn't, but moving *your project* by
  N semitones fixes it — Spencer moves the project key regularly). Tolerance and "I'll shift my
  track up to" are controls on the page.

**What the numbers are actually worth** (measured 2026-10-27 over 541 analysed rows, don't
re-derive):

- Key, on the 117-track Rekordbox ground truth via `scripts/key-bench.mjs`: **65.0% exact,
  87.2% usable**, 12.8% wrong — unchanged from the published bench, so the batch degrades
  nothing. This is the reliable figure; it measures `detectKey` on clean local files.
- The whole pipeline (search → rip → decode → detect) via `scripts/library-check.mjs`, on the
  rows that can be **confidently** paired with `key-truth.json`: 3 of 7 exact, **6 of 7 usable**,
  and **7 of 7 BPM within 2 BPM** after folding. n=7 is small, but it is consistent with the
  bench and it is the only honest measure of the pipeline end to end.
- **Pair strictly or the numbers lie.** A loose token match over the same data reported 42% of
  keys wrong and only half the tempos right. Almost all of that was mis-pairing — it had matched
  `be-free.mp3` to "…The Free Nationals…" on one shared token. `library-check.mjs` requires a
  shared title token, a shared artist token and symmetric Jaccard ≥ 0.5; it throws away correct
  pairs whose truth filename is a bare title, which is the right trade.
- **Confidence is a hint, not a gate.** Across 117 tracks it separates on average (mean 81 for
  exact, 67 for wrong) and by band — under 60 is 62% usable, 80+ is 96% — but **3 of the 15
  wrong answers scored 80 or more, one of them 100**. So the page marks a sub-60 key with a `~`
  and sorts and filters on nothing. `bpmConfidence` is worse still: it does **not** separate
  right from wrong (mean 26 vs 25) and every single row scores under 40, so it is stored for
  debugging and never shown. The earlier note that confidence was *anti*-correlated came from an
  11-track sample and doesn't hold at 117.
- A **red triangle** on a row means the track we found was a very different length from the one
  in the library — 49 of 541 rows, 9%. Probably an extended mix or the wrong upload.
- Failures: 17 of 558 attempted, **3%** — YouTube 403s (transient, retried) and age-gated videos
  (`Sign in to confirm your age`), which will exhaust their three attempts and be left alone.

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

Route `/` (legacy `/analyze` redirects). Order on the page: paste-a-link box → drop zone (a full panel when nothing is loaded, one line afterwards) → track header (artwork, BPM/key chips) → **before stems**: `SectionStrip` + `WaveformVisualizer` (drag-to-loop, 64× zoom) + spectrum + transport → **after stems**: `StemPlayer` (with the strip inside it) is the only timeline; the full-mix player unmounts and is paused → `StemSelector` (mode picker → progress → stem rows with keep / download; header has Keep all / To Live / Remix Pack / reset). Keyboard: space, ← →, Esc drive whichever timeline is on screen (plus L for the full-mix loop).

### Sections (intro / breakdown / buildup / drop / outro)

Worker `DETECT_SECTIONS` → `detectSections(layers, sampleRate, { bpm, gridOffset })` where `layers` is `[{ role: 'mix', data }]` (first pass, right after BPM lands — ~0.4 s) or one entry per stem (re-run when the Stem Player finishes decoding). The vocal layer is ignored; `bass` feeds the low band and `drums` the high band when they exist, otherwise the backing does.

- Per bar (grid from BPM + `gridOffset`, 2 s bars when there's no tempo): power of the backing, of a 150 Hz low-pass, of a 300 Hz–3 kHz band-pass and of a 4 kHz high-pass (RBJ biquads), in dB, each normalised to the track's p10–p90 over non-silent bars. `intensity = 0.25·total + 0.3·low + 0.45·mid` — bass says the drop is in, mids say there's musical content (an extended-mix intro/outro has kick + bass and nothing in the mids).
- Cuts where the 4-bar mean steps by > 0.2 (novelty peaks ≥ 4 bars apart); segments < 4 bars are absorbed by the closer neighbour; trailing silence folds into the last segment.
- A segment is a **drop** if its mean intensity ≥ p80 − 0.25. Everything before the first drop is **intro**, after the last is **outro**, other low segments are **breakdown**. The rising tail (16 / 8 / 4 bars, `0.5·total + 0.5·high` climbing by > 0.15) of a low segment that leads into a drop is the **buildup**; a whole short low segment that climbs is a buildup unless it's the opening bars.
- Returns `{ sections: [{ label, start }], bars: [{ start, intensity }], barSec }`. Verified by eye on the five tracks in `~/Music/Remix Lab/Sources/` (extended mix: intro 1 · drop 17 · breakdown 65 · buildup 74 · drop 81 · … · outro 113).

`Analyze.jsx` keeps `sections`, `sectionsSource` (`'mix' | 'stems' | 'manual'`), `gridOffset` and re-runs detection when the grid moves or stems land — never over a manual edit (any strip interaction sets `'manual'`). All three are saved on the vault track and restored with it. `utils/sections.js` has the label list, colours (intro/outro violet, breakdown blue, buildup green, drop yellow — energy follows the spectrum) and `barAtTime()`.

`SectionStrip.jsx` is a full-track overview (always 0 → duration, regardless of waveform zoom): click a block → `onSeek(start)`; drag a block's left edge → boundary moves, snapped to bars, `onChange` on release; click the label → menu with the five labels + remove; "+" adds a section at `positionRef.current` (drop after anything but a drop, else breakdown). It takes a `positionRef` (full-mix `playbackTimeRef` or the Stem Player's `positionRef`) and draws the playhead from it at 60 fps. `gutterWidth` matches the Stem Player's label column so the strip lines up with the lanes.

### Lock to tempo

For a record cut without a click (the one that started this drifts 148.9–153.2 BPM) or an
acapella Live's Auto-Warp can't grid, the Lab can render the stems onto an exact grid so
they go into a project with **Warp off**. `TempoLock.jsx` sits in the stems-ready panel next
to "To Live"; the maths is pure in `utils/tempoLock.js`, the render happens on the Mac.

1. **Beat-track** — worker `DETECT_BEATS` → `detectBeats(channelData, sampleRate)`: spectral
   flux onset envelope (1024-pt FFT, 256 hop at ~22 kHz, local-mean subtracted), Ellis-style
   DP beat tracker, parabolic sub-frame refine, then a local linear fit of beat index against
   time over ±16 beats. The fit matters twice — it removes frame quantisation *and* keeps the
   stretch ratio smooth, which is what stops the output warbling. Returns `{ beats, bpm,
   tempoRange, downbeatIndex, confidence }`. **Run it on the instrumental or the mix, never
   the vocal**: on the reference track the instrumental gives 150.89 BPM at confidence 95 and
   the vocal 75.97 (half, and wrong) at 39. `Analyze.handleAnalyseBeats()` prefers
   drums/other/bass and falls back to the full mix when the stem scores under 40.
2. **Plan** — `planTempoLock({ beats, targetBpm, duration, sampleRate, key, downbeatIndex })`
   splits the tempo move in two. The constant part is a **whole-semitone resample** (varispeed,
   zero artefacts, and it lands the track in a named key); only the remainder plus the drift
   becomes a time map. 150 → 132 is −2 semitones then 0.5–3.3% of stretch, not a flat −12%.
   It returns the map as (sourceFrame, targetFrame) pairs, `outputDuration`, and `padFrames`
   — silence to prepend so the first downbeat lands on a bar line, i.e. bar 1 at 0:00.
3. **Render** — `POST /lock {folder, files, lock, notes}` on the helper starts a job
   (`GET /lock/:id` for progress; R3 runs at about 10× realtime). Per stem:
   `ffmpeg asetrate/aresample` → `rubberband -3 -D <dur> -M <map>` → `ffmpeg adelay` + FLAC,
   into `~/Music/Remix Lab/Stems/<Artist - Title> - locked <bpm>/` (its own folder so the
   unlocked stems and their notes.txt are untouched). Host allow-list as for `POST /stems`.

**Two traps, both silent:**
- A time map **requires** an overall `-t`/`-T`/`-D`, and its duration must match the map's
  last target frame. If it doesn't, rubberband computes a NaN ratio, warns, and passes the
  audio through *completely unstretched* with exit code 0. The helper therefore derives `-D`
  from the map it was given and never trusts a duration from the client.
- Don't write a `0 0` anchor: rubberband's implicit start is already (0,0), so an explicit
  one makes a zero-length first segment whose ratio is 0/0 — same NaN warning. Leaving it out
  gives the lead-in a clean 1:1.

`buildPackNotes()` records the lock in notes.txt (original tempo and drift, semitones, the new
key, min/median/max stretch, where bar 1 is), the stems are stamped with the new BPM and key,
and the section markers are moved onto the new timeline with `lockedSections()`.

Measured end to end: Lady Gaga "Just Dance" 119 → 128 BPM came out at 128.011 BPM, 1.2 ms mean
/ 18.3 ms max from an exact grid. The drifting 1979 record: 132.003 BPM, 6.5 ms mean / 84.1 ms
max, against 70.2 ms mean / 197.7 ms max for the rigid grid one Live warp marker gives you.
Needs `brew install rubberband`; `/health` reports it as `rubberband` / `canLock`.

### Stem Player + Arrangement Map

`useStemPlayer({ stemTypes, getStemAudio, onPlay })` owns a second AudioContext: every stem decoded once, one `AudioBufferSourceNode` per stem → per-stem `GainNode` → master, all started on the same timestamp. Mute/solo (`stemGain(type, muted, soloed)` — solo wins) only touch gains; seek and loop rebuild the sources; `positionRef` is read by the UI at 60 fps. It is mutually exclusive with the single-source player: `onPlay` pauses `useAudioProcessor`, and `handleTogglePlayback` / `handlePlayStem` call `stemPlayer.pause()`.

`StemPlayer.jsx` draws one lane per stem (min/max from `summarise()`, 1200 columns, stem colour, greyed when silent) under a ruler, plus a bar grid from the header BPM (every bar faint, every 4 bars = phrase, every 16 = section; labels thin out with width). Click = seek, drag = loop snapped to bars, "bar 1 here" pins the downbeat to the playhead and ◀ ▶ nudge it a beat — `gridOffset` is owned by `Analyze.jsx` (props `gridOffset` / `onGridOffsetChange`) so detection and the vault see it. Space toggles play when the map is focused. The `SectionStrip` sits between the transport and the lanes. `getBuffer(type)` hands the decoded stems to section detection.

### Local development

`npm run dev:full` runs Vite (:5173) and `scripts/dev-api.mjs` (:3001) together; Vite proxies `/api/*`. The API runner loads `.env.local` then `.env.local.vercel` (pulled production vars — never bundled) and hot-reloads `api/*.js` per request. The Browser-pane launch config is `full`.

### Web Worker (`/src/workers/audio.worker.js`)

No imports (the key scripts eval its source). Messages: `DETECT_BPM`, `DETECT_KEY`, `DETECT_BEATS`, `DETECT_SECTIONS`, `GENERATE_WAVEFORM_DATA` (hi-res min/max), `GENERATE_WAVEFORM_COLORS` (spectral-centroid colour map). Helpers: `fft`, `computeMagnitudeSpectrum`, `biquad`, `accumulateBarPower`, `normaliseBars`. The old feature extraction (instruments, MFCCs, ADSR, filter envelope, modulation, spectral match, wavetable, anatomy) is gone — `checkpoint-before-simplify` has it.

### `/src/hooks/useAudioProcessor.js`

Single-source playback + visualisation: `getAudioContext()`, `prepareAudioBuffer()` (decode, 200-point waveform, hi-res data + colour map via the worker), `togglePlayback` / `seek` / `skipTime`, loop state, `visualize()` (64-bar spectrum at 60 fps refs / 20 fps state), `formatTime`, `cleanup()`. Proxies `detectTempoAndKey`, `detectSections`, `generateWaveformData`, `generateWaveformColors` from `useAudioWorker`.

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
node scripts/library-check.mjs           # Score the sample finder's library index against the same truth
npm run build        # Production build to /dist (frontend only)
npm run lint         # ESLint
npm run test:run     # Vitest once (84 tests: DSP helpers, remix math, tempo lock, sample matching, a11y)
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

No `VITE_*` variable is needed any more. Safe to delete from Vercel and `.env.local`: `GEMINI_API_KEY` (instrument detection removed 2026-09-15), `VITE_POSTHOG_KEY`, `VITE_SENTRY_DSN`, `POSTHOG_PERSONAL_API_KEY`, and the pivot leftovers `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*`, `VITE_STRIPE_*`, `RESEND_API_KEY`.

### Storage budget

Vercel Hobby includes ~1 GB of Blob storage. Audit/purge with the `@vercel/blob` SDK (`list()` / `del()`) using `BLOB_READ_WRITE_TOKEN` — no CLI login needed. In Sep 2026 the store held 542 MB of orphaned files (394 MB of Gemini `ai-analysis-*.wav` uploads that were never deleted, 143 MB of re-uploaded source MP3s); everything was wiped and `api/instrument.js` now deletes its upload after use. A two-stem FLAC grab costs ~55 MB, so the store fits ~15 kept tracks — the Vault should show usage and offer deletion.

## Remix Lab Roadmap

The product is: *paste a link → stems · key · BPM · section labels.*

| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 1 | **Vocal Grab** | ✅ | Modes, FLAC, Keep-to-Blob, stamped filenames, Remix Pack zip, quick BPM/key chip |
| 2 | **Link import (local helper)** | ✅ | yt-dlp companion; paste a YouTube/SoundCloud link or search by name; FLAC + artist/title/artwork |
| 3 | **Signal Deck UI** | ✅ | Tokens, fonts, grid, Dock, frequency-coloured waveform, stem strips |
| 4 | **Vault** (`/vault`) | ✅ | Every kept track with stems, tempo, key, sections; "mixes with" |
| 5 | **Remix Calculator** (`/calc`) | ✅ | Transpose / tempo / warp advice |
| 6 | **Stem Player** | ✅ | Synced mute/solo, lanes, bar grid, drag-to-loop |
| 7 | **Sections** | ✅ | Auto-detected (mix → stems), editable, saved, in notes.txt |
| 8 | **Lock to tempo** | ✅ | Beat-track → whole-semitone resample + time map → stems already on the grid, Warp off |
| 9 | **Find a sample** (`/sample`) | ✅ | Apple Music playlist → BPM + key for every track → ranked against your project's tempo and key |
| — | Removed 2026-09-15 | git | Analyzer / presets / Vital, Anatomy, Vocal Chop Kit, Notes, tags, batch grab, Gemini — `checkpoint-before-simplify` |
| — | Later | Ideas | Section detector tuning against hand-labelled tracks, mashup preview, `.als` with locators from sections, Vault as a Camelot wheel |

## Known Issues / Debt

- ESLint: three pre-existing Fast Refresh export-shape errors (`Toast.jsx`, `AuthContext.jsx`) and `SaucyHelper` set-state-in-effect. Zero runtime bugs.
- `Settings.jsx` and `SaucyHelper` still use the re-pointed `zinc/stone/amber` tokens. Cosmetic.
- `e2e/smoke.spec.js` doesn't exercise the Stem Player or sections (needs a vault track + token).
- Section detection is a heuristic tuned on five house / hip-hop / R&B tracks. Expect to drag a boundary or two on anything unusual.
- The sample finder's key is a heuristic: 65% exact, 87% usable. Expect a wrong suggestion in
  roughly one of eight rows, and don't trust `bpmConfidence` — it's under 40 for every row and
  doesn't separate right from wrong.
- Only 7 library rows can be confidently paired with `key-truth.json`, so the end-to-end
  accuracy figure rests on a small sample. It will firm up as more of the playlist is analysed.
- `yt-dlp ytsearch1:` picks whatever YouTube ranks first. 8% of rows come back a very different
  length from the library track (flagged with a triangle); some of the rest are the right track
  with a wrong tempo read.
- `/sample` has no component test — only `sampleMatch.js` (33 vitest) and a route-level
  Playwright smoke check are covered. The ingest and the batch have no automated test at all;
  both need Music and the network.
- Re-syncing a playlist never removes a row from the index, only its membership. Nothing prunes
  orphans yet.
- Lock to tempo is Lab-only: the Vault's "to live" has no lock option, because beat tracking needs the audio decoded. Also no "keep the pitch" toggle in the UI, though `planTempoLock({ semitones: 0 })` supports it.

## Completed

- [x] **Find a sample** (Oct 27 2026) — "type a BPM and a key, get songs from my own library
  that are close in both, so I can sample their vocals": Rekordbox's related-tracks against
  Apple Music. New `helper/library.mjs` (osascript playlist ingest by persistent ID, per-track
  property access, atomic `~/Music/Remix Lab/library.json`, resumable analysis batch that
  deletes every download), `helper/detect-worker.mjs` (BPM/key on a worker thread so the batch
  can't stall `/health`), seven `/library*` endpoints, `src/utils/sampleMatch.js` (octave-folded
  tempo + the two ranking buckets, 33 vitest), `useLibrary`, `pages/Sample.jsx`, a Dock entry,
  `/?find=<text>` into the Lab's import box, and a `/sample` chapter in `helperGuide.js`.
  Verified end to end: synced "Comp" (2307 entries → 2289 unique rows in ~25 s of AppleScript),
  ran the batch at the default concurrency 2 over **541 tracks** (3.2–3.3 s each, 3% failures),
  stopped and restarted it — including killing the helper outright mid-run — with no loss, then
  queried 132 BPM in C# minor and got a sensible ranked list. The numbers, and why confidence is marked but never sorted on,
  are under "Find a sample" above. 84 vitest, 7 Playwright, lint clean of new errors, build green.

- [x] **Lock to tempo** (Oct 26 2026) — stems can be exported already fixed to a target BPM, so they go into Live with Warp off. Built after a 1979 acapella at ~150 BPM (drifting 148.9–153.2) couldn't be fitted to a 132 project by hand: too few transients for Auto-Warp or our own `detectBPM` (confidence 18, answer 158). New `utils/tempoLock.js` (pure, 12 vitest), worker `DETECT_BEATS`, helper `POST /lock` + `GET /lock/:id` (+ `rubberband` / `canLock` in `/health`), `components/audio/TempoLock.jsx` in the stems-ready panel, `buildLockedFolderName()` and the lock block in `buildPackNotes()`, `helperGuide.js` entry. Verified end to end in the browser on the vault's "Just Dance": 119 → 128 BPM, +1 st → F major, output measured 128.011 BPM at 1.2 ms mean / 18.3 ms max from an exact grid. The drifting record through the same render: 132.003 BPM, 6.5 ms / 84.1 ms, against 70.2 ms / 197.7 ms for a single rigid warp marker. 51 vitest, lint clean of new errors.

- [x] **Simplification + sections** (Sep 15 2026) — Spencer: "I just want a tool that gives me stems, what key, bpm, and labels for the different sections of the song." Tagged `checkpoint-before-simplify`, then deleted the recreate/preset flow (`components/analysis/`, `PresetSelector`, `InstrumentSelector`, `AnalyzeSection`, `ExportToolbar`, `vitalPresets`, `vitalPresetGenerator`, `demoSoundGenerator`, `dawPlugins`, `recommendations`, `SynthKnob`, `InstrumentIllustration`, `Tooltip`, Gemini `api/instrument.js`), Track Anatomy, the Vocal Chop Kit (+ helper `PUT /stems`), Remix Notes (`/notes`, `api/notes.js`, `_vaultIndex.js`), Vault tags / notes link / 4-stem re-separate, batch grab, prefs (DAW / artist name), `MiniSpectrum` and ~2,400 lines of worker DSP. Worker 3,190 → 750 lines; `Analyze.jsx` 1,677 → ~560. Built: worker `detectSections` (energy segmentation, DJ labels), `SectionStrip.jsx` (jump / drag / rename / add / remove), `utils/sections.js`, sections + `gridOffset` on vault tracks and in `notes.txt`; the full-mix player now yields to the Stem Player once stems are ready; `helperGuide.js` rewritten; e2e updated. Verified in the Browser pane: vault restore → stems → "from stems" sections; helper import → "from the mix" sections over the waveform; drag / rename / add / remove; edits persisted to `vault/index.json` as `manual`. 39 vitest, 6 Playwright, build green.

- [x] **Codebase audit** (Sep 14 2026, late) — removed PostHog + Sentry + web-vitals (deps, `/ingest` rewrites, CSP hosts, `api/_posthog.js`, all `track*` calls), the Analysis History panel + `useHistory`, the demo sound, `validateEnv`, unused UI components (AnimatedCounter, FeatureCard, MiniAudioPlayer, Skeleton, ResultsTabs), unused constants, the DAW picker and the FL Studio / Logic / Reaper / Pro Tools tables (`flStudioPlugins.js` deleted, `dawPlugins.js` is Ableton-only and now hosts `detectSoundType` / `PARAMETER_TRANSLATIONS`). Demoted the old analyzer: `AnalyzeSection` is a quiet "Deeper analysis" row after the stems tools, floating Analyze CTA gone. `AudioUploadSection` rewritten (Signal Deck; one line once a track is loaded). Fixed: the drop zone advertised FLAC but rejected it. Vault cards re-cut by workflow priority; helper manual added (`helperGuide.js`); DRM SoundCloud fallback; Chrome local-network explanation. e2e smoke now covers /vault, /calc, /notes and the guide.

- [x] **Helper manual** (Sep 14 2026) — `SaucyHelper` now has a "What does this do?" tab: searchable, per-page accordion of every control with a cost tag (free / GPU $ / blob / disk / download) and a "What costs what" summary. Content lives in `src/data/helperGuide.js` — **update it when adding or renaming a button.** Also: DRM-protected SoundCloud links fall back to a name search (YouTube usually has the track); the offline card explains Chrome's local-network permission.

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

**Sections** — see "Sections" under Architecture; the algorithm lives in `detectSections()` in the worker.
