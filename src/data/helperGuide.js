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
  { cost: 'gpu', text: 'Only "Grab Vocals" / "Separate". Nothing else spends money.' },
  { cost: 'blob', text: 'The source upload before separation, auto-keep in Vocals mode, Keep / Keep all. A 3-minute track ≈ 55 MB, a 6-minute one ≈ 200 MB. Delete a track in the Vault to free it.' },
  { cost: 'disk', text: 'Paste-a-link (Sources folder), To Live and Lock to tempo (Stems folder). Delete them in Finder whenever.' },
  { cost: 'download', text: 'Remix Pack, per-stem download arrows, "save file". Nothing is stored anywhere else.' },
  { cost: 'free', text: 'Everything else: playing, the Stem Player, sections, the calculator.' },
];

export const GUIDE = {
  '/': {
    tips: [
      { title: 'Paste a link', tip: 'Cmd+V a YouTube or SoundCloud link anywhere on this page. The helper on your Mac turns it into a FLAC and loads it here.' },
      { title: 'Grab Vocals', tip: 'Vocals + Instrumental is the remix default — two lossless FLACs stamped with BPM and key, kept automatically.' },
      { title: 'Sections', tip: 'Intro / breakdown / buildup / drop / outro are guessed from the energy as soon as the track loads and refined once the stems land. Drag the edges or click a label if it got one wrong.' },
      { title: 'Lock to tempo', tip: 'For a record that drifts, or an acapella Live cannot warp: pick your project tempo and get stems already on the grid. Resampling does most of the move, so it sounds like a varispeed, not a stretch.' },
      { title: 'Keys', tip: 'Space play/pause, arrows skip 5 s, Esc clears the loop — for whichever timeline is on screen.' },
    ],
    sections: [
      {
        title: 'Getting a track in',
        items: [
          { name: 'Paste a link / Get file', cost: 'disk', what: 'YouTube or SoundCloud URL → the helper downloads it as FLAC, loads it here and saves a copy to ~/Music/Remix Lab/Sources/. Needs the menubar dot green.' },
          { name: 'Search (type a name)', cost: 'free', what: 'Free text searches YouTube and SoundCloud at once; click a result to get it.' },
          { name: 'Playlist / set link', cost: 'free', what: 'Lists the tracks in the set — click the one you want.' },
          { name: 'DRM notice', cost: 'free', what: 'Major-label SoundCloud uploads are protected streams. The Lab searches by name instead — pick the YouTube result.' },
          { name: 'Upload Audio / drop a file', cost: 'free', what: 'WAV, MP3, M4A or FLAC from your Mac. Nothing is uploaded until you separate.' },
          { name: 'save file (header)', cost: 'download', what: 'Saves the imported FLAC from memory to Downloads. The Sources folder already has a copy.' },
        ],
      },
      {
        title: 'Before the stems: the full mix',
        items: [
          { name: 'BPM / key chips', cost: 'free', what: 'Detected on decode. A "~" before the key means low confidence — hover for the runner-up keys. Filenames and the bar grid use these.' },
          { name: 'Sections strip', cost: 'free', what: 'A first guess from the full mix: bass + mids in = drop, mids gone = intro / outro / breakdown, energy climbing into a drop = buildup. Click a block to jump there.' },
          { name: 'Waveform colours', cost: 'free', what: 'Colour is frequency: violet = sub, blue = low-mids, green = mids, yellow = high-mids, red = air. The played part is in full colour.' },
          { name: 'Drag on the waveform', cost: 'free', what: 'Makes a loop. Esc clears it. Zoom −/+ goes to 64×.' },
          { name: 'Play / transport', cost: 'free', what: 'Plays the full mix. It disappears once the stems are ready — the Stem Player takes over.' },
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
          { name: 'To Live', cost: 'disk', what: 'Writes the stems + notes.txt (tempo, key, sections with bar numbers) into ~/Music/Remix Lab/Stems/<Artist - Title>/ so they show in Live\'s browser. Nothing goes to Blob.' },
          { name: 'Remix Pack', cost: 'download', what: 'Zip of every stem plus the same notes.txt, to Downloads.' },
          { name: 'Stem row: ↓', cost: 'download', what: 'Saves this one stem as a stamped FLAC.' },
          { name: 'kept / keep', cost: 'blob', what: '"KEPT" = permanent on Blob. "keep" = still on Replicate; click to re-host it (~25 MB per stem).' },
          { name: 'Lock to tempo', cost: 'disk', what: 'Beat-tracks the instrumental, then writes a second set of FLACs rendered onto an exact grid at a tempo you type — drop them at 1|1|1 with Warp OFF. It resamples by whole semitones first (so the pitch moves a named amount and the key changes, shown before you commit) and only time-stretches the small remainder plus the record\'s own drift. They land in their own folder, \'<Artist - Title> - locked <bpm>\', so the originals and their notes.txt are untouched. Needs `brew install rubberband`; about half a minute per stem.' },
          { name: '↺ (reset)', cost: 'free', what: 'Clears the stems so you can separate again with another mode. The vault entry stays.' },
        ],
      },
      {
        title: 'Stem Player + sections',
        items: [
          { name: 'Play', cost: 'free', what: 'All stems in sync, one timeline.' },
          { name: 'M / S', cost: 'free', what: 'Mute / solo a lane. Solo wins. "clear mix" resets.' },
          { name: 'Click / drag on the map', cost: 'free', what: 'Click seeks. Drag makes a loop snapped to bars; the chip shows its length, × clears it.' },
          { name: 'bar 1 here / ◀ ▶', cost: 'free', what: 'Pins bar 1 to the playhead, nudges the grid a beat. Sections re-detect on the new grid (unless you have edited them).' },
          { name: 'Sections: click a block', cost: 'free', what: 'Jumps there and plays. The label shows the start time and bar number.' },
          { name: 'Sections: drag an edge', cost: 'free', what: 'Moves the boundary, snapped to bars.' },
          { name: 'Sections: click a label', cost: 'free', what: 'Rename it (intro / breakdown / buildup / drop / outro) or remove it.' },
          { name: 'Sections: +', cost: 'free', what: 'Adds a section at the playhead. Edits are saved with the track in the Vault and go into notes.txt.' },
          { name: '"from the mix" / "from stems" / "edited"', cost: 'free', what: 'Where the current sections came from. Once edited, detection never overwrites them.' },
        ],
      },
    ],
  },
  '/vault': {
    tips: [
      { title: 'Your crate', tip: 'Every separated track with its stems, tempo, key and sections. Kept stems never expire.' },
      { title: 'Mixes with', tip: 'The link icon shows everything in a compatible key (Camelot neighbours) and tempo (±8% or half/double).' },
      { title: 'Space', tip: 'The bar at the top is the 1 GB Blob budget. Deleting a track frees its stems and source.' },
    ],
    sections: [
      {
        title: 'Card buttons',
        items: [
          { name: 'Open in Lab', cost: 'free', what: 'Restores the track, its stems and its sections into the Lab (downloads them from Blob into memory, nothing new is stored).' },
          { name: 'pack', cost: 'download', what: 'Remix Pack zip to Downloads.' },
          { name: 'to live', cost: 'disk', what: 'Stems + notes.txt into ~/Music/Remix Lab/Stems/<Artist - Title>/.' },
          { name: 'calculator', cost: 'free', what: 'Opens /calc with this track as the vocal source.' },
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
          { name: 'Size on the card', cost: 'free', what: 'How many MB this track\'s stems take on Blob.' },
        ],
      },
    ],
  },
  '/sample': {
    tips: [
      { title: 'Your own library', tip: 'Type your project tempo and key; the list is tracks from your Apple Music playlist that already mix with it. Click one and the Lab starts grabbing it.' },
      { title: 'Why it has to analyse', tip: 'Apple Music stores no key and no BPM, so every track is searched, downloaded, measured and deleted. Nothing is kept — not on this Mac, not in Blob storage.' },
      { title: 'Shift my track', tip: 'The second list is tracks that fit the tempo but not the key, with how far to transpose your own project to meet them. Set it to "not at all" to hide it.' },
      { title: 'Leave it running', tip: 'The batch takes a couple of hours for a few thousand tracks. Stop it whenever — it picks up where it left off, and never re-does a track it already has.' },
    ],
    sections: [
      {
        title: 'Finding something',
        items: [
          { name: 'bpm / key / mode', cost: 'free', what: 'Your project. Remembered between visits. The Camelot code underneath is what the matching actually uses.' },
          { name: 'tempo tolerance', cost: 'free', what: 'How far off the tempo may be. ±8% is about the limit for a clean Complex Pro warp; half- and double-time readings always count as a match.' },
          { name: "i'll shift my track up to", cost: 'free', what: 'How far you are willing to transpose your own project, which opens up keys that are not Camelot-compatible as they stand.' },
          { name: 'A result row', cost: 'free', what: 'Click it to open the Lab with that artist and title already searched — then Get file, then Grab Vocals as usual.' },
          { name: 'A "~" before the key', cost: 'free', what: 'The key detector was not confident. Nothing is sorted or hidden on confidence; it is right about two thirds of the time and in the right neighbourhood about 87%.' },
          { name: 'A red warning triangle', cost: 'free', what: 'What we found on YouTube was a very different length from the track in your library — probably an extended mix or the wrong upload, so treat its numbers with suspicion.' },
        ],
      },
      {
        title: 'Your library',
        items: [
          { name: 'pick a playlist', cost: 'free', what: 'Asks Music for every playlist with its track count. Slow — it counts them all.' },
          { name: 'A playlist button (re-sync)', cost: 'disk', what: 'Pulls that playlist again into ~/Music/Remix Lab/library.json. New tracks arrive un-analysed; anything already measured keeps its numbers.' },
          { name: 'analyse all', cost: 'free', what: 'Works through every un-analysed row: YouTube search, download, BPM + key, then the audio is deleted. Two at a time, about 3 seconds each.' },
          { name: 'just 100', cost: 'free', what: 'The same batch, capped — a quick top-up without committing to hours.' },
          { name: 'retry the N that failed', cost: 'free', what: 'A row is left alone after three failures (nothing findable, a dead search). This clears the count and tries them again.' },
          { name: 'stop', cost: 'free', what: 'Stops after the tracks in flight finish. Nothing is lost — the index is written after every single row.' },
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
  '/settings': {
    tips: [
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
