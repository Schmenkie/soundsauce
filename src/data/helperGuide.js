/**
 * The in-app manual behind the floating helper (SaucyHelper).
 *
 * Every control in the Lab, keyed by page, with what it does and what it costs:
 *   free      nothing leaves your machine / nothing is stored
 *   gpu       runs Demucs on Replicate — costs a few cents per track
 *   blob      writes to Vercel Blob (the 1 GB budget shown in Settings)
 *   disk      writes files onto this Mac (~/Music/Remix Lab)
 *   download  saves a file to your Downloads folder
 *
 * Keep entries short and concrete. If a button changes, change it here too.
 */

export const COSTS = {
  free: { label: 'free', hint: 'No storage, no money' },
  gpu: { label: 'GPU $', hint: 'Demucs on Replicate — cents per track' },
  blob: { label: 'blob', hint: 'Uses the 1 GB Blob budget (Settings shows what is left)' },
  disk: { label: 'disk', hint: 'Writes into ~/Music/Remix Lab on this Mac' },
  download: { label: 'download', hint: 'Saves a file to Downloads' },
};

export const COST_SUMMARY = [
  { cost: 'gpu', text: 'Only "Grab Vocals" / "Separate" (and batch grab, once per track). Nothing else spends money.' },
  { cost: 'blob', text: 'The source upload before separation, auto-keep in Vocals mode, Keep / Keep all, and batch grab. A 3-minute track ≈ 55 MB, a 6-minute one ≈ 200 MB. Delete a track in the Vault to free it.' },
  { cost: 'disk', text: 'Paste-a-link (Sources folder), To Live (Stems folder), vocal chops (chops subfolder). Delete them in Finder whenever.' },
  { cost: 'download', text: 'Remix Pack, per-stem download arrows, chop zip, "save file". Nothing is stored anywhere else.' },
  { cost: 'free', text: 'Everything else: playing, the Stem Player, Anatomy, chop detection, the calculator, notes, tags.' },
];

export const GUIDE = {
  '/': {
    tips: [
      { title: 'Paste a link', tip: 'Cmd+V a YouTube or SoundCloud link anywhere on this page. The helper on your Mac turns it into a FLAC and loads it here.' },
      { title: 'Grab Vocals', tip: 'Vocals + Instrumental is the remix default — two lossless FLACs stamped with BPM and key, kept automatically.' },
      { title: 'Understand it', tip: 'After separation: Stem Player to solo and loop bars, Anatomy for structure and chords, Vocal Chops for phrases.' },
      { title: 'Region analysis', tip: 'Drag on the waveform to highlight a section. Analyzing a short, isolated region gives much more accurate results.' },
      { title: 'Keys', tip: 'Space play/pause, L loop, Esc clear selection, arrows skip. In the Stem Player, space works when the map is focused.' },
    ],
    sections: [
      {
        title: 'Getting a track in',
        items: [
          { name: 'Paste a link / Get file', cost: 'disk', what: 'YouTube or SoundCloud URL → the helper downloads it as FLAC, loads it here and saves a copy to ~/Music/Remix Lab/Sources/. Needs the menubar dot green.' },
          { name: 'Search (type a name)', cost: 'free', what: 'Free text searches YouTube and SoundCloud at once; click a result to get it.' },
          { name: 'Playlist / set link', cost: 'free', what: 'Lists the tracks with checkboxes. Nothing happens until you press "Grab vocals from N".' },
          { name: 'Grab vocals from N', cost: 'gpu', what: 'Queue: download → read tempo & key → separate vocals → keep, one track after another. Each track also uses Blob (source + two stems). Stop cancels the rest.' },
          { name: 'DRM notice', cost: 'free', what: 'Major-label SoundCloud uploads are protected streams. The Lab searches by name instead — pick the YouTube result.' },
          { name: 'Upload Audio / drop a file', cost: 'free', what: 'WAV, MP3, M4A or FLAC from your Mac. Nothing is uploaded until you separate.' },
          { name: 'save file (header)', cost: 'download', what: 'Saves the imported FLAC from memory to Downloads. The Sources folder already has a copy.' },
        ],
      },
      {
        title: 'Waveform',
        items: [
          { name: 'Colours', cost: 'free', what: 'Colour is frequency: violet = sub, blue = low-mids, green = mids, yellow = high-mids, red = air. The played part is in full colour; a filtered breakdown reads blue, an open drop yellow.' },
          { name: 'Drag on the waveform', cost: 'free', what: 'Selects a region for analysis and looping. Esc clears it.' },
          { name: 'Zoom −/+', cost: 'free', what: 'Up to 64× on the waveform; the overview strip below shows where you are.' },
          { name: 'BPM / key chips', cost: 'free', what: 'Quick detection on decode. A "~" before the key means low confidence — hover for the runner-up keys.' },
          { name: 'Deeper analysis (bottom of the page)', cost: 'free', what: 'The older sound-design analyzer: envelope, timbre, instrument guess and a Vital recipe for the selection (or the first 30 s). Uses Gemini once for instrument labels — negligible. Secondary to the stems tools.' },
        ],
      },
      {
        title: 'Separating',
        items: [
          { name: 'Vocals + Instrumental', cost: 'gpu', what: 'Two stems. Both are auto-kept to Blob so the vault entry never expires. This is the one to use for remixing.' },
          { name: '4 stems / 6 stems', cost: 'gpu', what: 'Vocals / drums / bass / other (+ guitar, piano). Stems are NOT auto-kept — they live on Replicate for ~7 days unless you press Keep.' },
          { name: 'Best / Fast', cost: 'gpu', what: 'Best = htdemucs_ft (cleaner, ~1–2 min). Fast = htdemucs (~1 min). Same price ballpark.' },
          { name: 'Grab Vocals / Separate', cost: 'gpu', what: 'Uploads the source to Blob, runs Demucs, polls until done. Needs the lab unlocked.' },
        ],
      },
      {
        title: 'Stems ready — the buttons',
        items: [
          { name: 'Keep all', cost: 'blob', what: 'Re-hosts every temporary stem on Blob so it survives Replicate\'s 7-day expiry. Only shows when something is still temporary.' },
          { name: 'To Live', cost: 'disk', what: 'Writes the stems + notes.txt into ~/Music/Remix Lab/Stems/<Artist - Title>/ so they show in Live\'s browser. Nothing goes to Blob.' },
          { name: 'Remix Pack', cost: 'download', what: 'Zip of every stem plus notes.txt (tempo, key, Camelot neighbours, warp tips) to Downloads.' },
          { name: 'Full Track', cost: 'free', what: 'Not a download. Switches the Analyze / Play target back from a stem to the whole mix.' },
          { name: 'Stem card: analyze', cost: 'free', what: 'Shows this stem in the waveform and runs the deeper analysis on it.' },
          { name: 'Stem card: play', cost: 'free', what: 'Plays just this stem through the main player.' },
          { name: 'Stem card: ↓', cost: 'download', what: 'Saves this one stem as a stamped FLAC.' },
          { name: 'kept / keep', cost: 'blob', what: '"KEPT" = permanent on Blob. "keep" = still on Replicate; click to re-host it (~25 MB per stem).' },
          { name: '↺ (reset)', cost: 'free', what: 'Clears the stems so you can separate again with another mode. The vault entry stays.' },
        ],
      },
      {
        title: 'Stem Player',
        items: [
          { name: 'Play', cost: 'free', what: 'All stems in sync. Pauses the main player.' },
          { name: 'M / S', cost: 'free', what: 'Mute / solo a lane. Solo wins. "clear mix" resets.' },
          { name: 'Click / drag on the map', cost: 'free', what: 'Click seeks. Drag makes a loop snapped to bars; the chip shows its length, × clears it.' },
          { name: 'bar 1 here / ◀ ▶', cost: 'free', what: 'Pins bar 1 to the playhead, nudges the grid a beat. Use it when the track has a pickup or the grid looks offset.' },
        ],
      },
      {
        title: 'Anatomy',
        items: [
          { name: 'Structure grid', cost: 'free', what: 'One cell per bar per stem; brighter = louder, grey = silent. Lines mark where the set of playing stems changes or a stem jumps 6 dB.' },
          { name: 'Section list', cost: 'free', what: '"vocals in", "instrumental down 8 dB — breakdown?" — read as hints, then check by ear with the Stem Player.' },
          { name: 'Chords — 4-bar loop', cost: 'free', what: 'The most common four-bar chord sequence in the instrumental, from triad templates. Solid for one- or two-chord house, rough on busy harmony.' },
          { name: 'Bass roots', cost: 'free', what: 'Only shown with a real bass stem (4-stem mode) — in two-stem mode the kick would fake it.' },
          { name: 'Stem cards', cost: 'free', what: 'Band balance (which of the five colours a stem lives in), how many bars it plays, level, drum hits per bar.' },
        ],
      },
      {
        title: 'Vocal Chops',
        items: [
          { name: 'tight / normal / loose', cost: 'free', what: 'How big a silence counts as a phrase boundary (120 / 250 / 500 ms). Tight = every breath, loose = whole lines.' },
          { name: '▶ / time', cost: 'free', what: '▶ previews the chop on its own; clicking the time jumps the Stem Player there.' },
          { name: 'zip', cost: 'download', what: 'All chops as 16-bit WAVs with stamped names, to Downloads.' },
          { name: 'to live', cost: 'disk', what: 'Writes the chops into ~/Music/Remix Lab/Stems/<track>/chops/.' },
        ],
      },
    ],
  },
  '/vault': {
    tips: [
      { title: 'Your crate', tip: 'Every separated track with its stems, tempo and key. Kept stems never expire.' },
      { title: 'Mixes with', tip: 'The link icon shows everything in a compatible key (Camelot neighbours) and tempo (±8% or half/double).' },
      { title: 'Space', tip: 'The bar at the top is the 1 GB Blob budget. Deleting a track frees its stems and source.' },
    ],
    sections: [
      {
        title: 'Card buttons',
        items: [
          { name: 'Open in Lab', cost: 'free', what: 'Restores the track and its stems into the Lab (downloads them from Blob into memory, nothing new is stored).' },
          { name: 'pack', cost: 'download', what: 'Remix Pack zip to Downloads.' },
          { name: 'to live', cost: 'disk', what: 'Stems + notes.txt into ~/Music/Remix Lab/Stems/<Artist - Title>/.' },
          { name: 'layers (4-stem)', cost: 'gpu', what: 'Re-separates this track as vocals / drums / bass / other. Reuses the source already on Blob (no second upload); the new stems replace the old ones in this entry and are NOT auto-kept.' },
          { name: 'calculator', cost: 'free', what: 'Opens /calc with this track as the vocal source.' },
          { name: 'notes', cost: 'free', what: 'Opens the Remix Notes entry for this track.' },
          { name: 'link (mixes with)', cost: 'free', what: 'Filters the vault to compatible keys and tempos.' },
          { name: 'arrow (original)', cost: 'free', what: 'Opens the YouTube / SoundCloud page the track came from.' },
          { name: 'trash', cost: 'free', what: 'Removes the entry and deletes its stems and source from Blob — this is how you get space back. Files already in ~/Music/Remix Lab are untouched.' },
          { name: 'keep / keep all (N)', cost: 'blob', what: 'Re-hosts temporary stems before they expire. Kept = green cloud.' },
          { name: 'Stem ↓', cost: 'download', what: 'Saves one stem as a stamped FLAC.' },
        ],
      },
      {
        title: 'Editing',
        items: [
          { name: 'Pencil (hover the card)', cost: 'free', what: 'Inline edit of title and artist (Enter saves, Esc cancels). Filenames use these.' },
          { name: 'tag icon', cost: 'free', what: 'Add #tags to a track; the chips above the grid filter by tag. × on a tag removes it.' },
          { name: 'Size on the card', cost: 'free', what: 'How many MB this track\'s stems take on Blob.' },
        ],
      },
    ],
  },
  '/calc': {
    tips: [
      { title: 'Zero is best', tip: 'A green 0 st means the vocal already fits — the relative major/minor shares the same notes.' },
      { title: 'Under 10%', tip: 'Tempo stretches under ~10% stay clean in Complex Pro. Past that, try a half/double-time reading or Re-Pitch.' },
      { title: 'Remembered', tip: 'The project side is saved between visits — set it once per session.' },
    ],
    sections: [
      {
        title: 'What the numbers mean',
        items: [
          { name: 'Transpose', cost: 'free', what: 'Semitones to shift the vocal so it sits in the project key. When modes differ it uses the relative key first; "exact" keeps tonic-to-tonic.' },
          { name: 'Tempo', cost: 'free', what: 'Straight, half-time and double-time readings; the smallest change wins.' },
          { name: 'Warp advice', cost: 'free', what: '≤5% clean in Complex Pro, ≤10% fine, ≤18% audible, beyond that Re-Pitch (and the pitch it introduces is subtracted from the transpose).' },
          { name: 'Compatible targets', cost: 'free', what: 'Same / relative / ±1 on the Camelot wheel, with the semitone cost of each. Click one to set it as the project.' },
        ],
      },
    ],
  },
  '/notes': {
    tips: [
      { title: 'Write it up', tip: 'One entry per remix: what you pulled, what you changed, what you learned, and a link to the result.' },
      { title: 'Public', tip: 'Tick "show on the public notes page" and the entry appears for visitors — title, key, tempo and your notes only, never the audio.' },
    ],
    sections: [
      {
        title: 'The editor',
        items: [
          { name: 'write / edit / close', cost: 'free', what: 'Opens the three fields and the result link for that track. Save writes them onto the vault entry.' },
          { name: 'show on the public notes page', cost: 'free', what: 'Publishes this entry to /notes for anyone (read-only, no audio).' },
          { name: 'Lab / Calculator icons', cost: 'free', what: 'Jump to the track in the Lab or the calculator.' },
        ],
      },
    ],
  },
  '/settings': {
    tips: [
      { title: 'Set your DAW', tip: 'Recipes recommend plugins native to your DAW.' },
      { title: 'Lock the lab', tip: 'Separation and uploads cost money, so they sit behind the lab password.' },
    ],
    sections: [
      {
        title: 'Storage',
        items: [
          { name: 'MB of 1 GB used', cost: 'free', what: 'Live Blob usage and a rough count of how many more ~3-minute tracks fit. Free space by deleting tracks in the Vault.' },
        ],
      },
    ],
  },
};
