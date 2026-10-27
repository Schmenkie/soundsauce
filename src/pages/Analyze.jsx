import React, { useState, useRef, useEffect, useCallback } from 'react';

// Hooks
import { useAudioProcessor, useStemSeparation, usePageTitle, useHelper, useVault, useStemPlayer } from '../hooks';
import { useSearchParams } from 'react-router-dom';
import { vaultIdFor } from '../lib/vault';
import { useAuth } from '../contexts/AuthContext';

// Components
import { useToast } from '../components/ui/Toast';
import { LabSignIn } from '../components/auth';
import { SpectrumAnalyzer, PlaybackControls, WaveformVisualizer, AudioUploadSection, StemSelector, StemPlayer, SectionStrip, LinkImport, TempoLock } from '../components/audio';
import { Music, Loader2, AlertTriangle, UploadCloud, Download } from 'lucide-react';

// Utils
import { displayKeyName } from '../utils/stemFiles';
import { saveBlob, mimeForExt, saveStemsToLive, lockStemsToLive } from '../utils/remixPack';

const ALLOWED_EXTENSIONS = ['wav', 'mp3', 'm4a', 'flac'];
const ALLOWED_MIME_TYPES = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/x-flac'];

const isAllowedAudioFile = (file) => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_MIME_TYPES.includes(file.type);
};

/** Mono mixdown of an AudioBuffer, decimated by `by` (section detection only needs ≤ 8 kHz) */
function monoOf(buffer, by = 2) {
  const chans = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  const len = Math.floor(buffer.length / by);
  const out = new Float32Array(len);
  const scale = 1 / (chans.length * by);
  for (let i = 0; i < len; i++) {
    let s = 0;
    const base = i * by;
    for (const d of chans) for (let k = 0; k < by; k++) s += d[base + k];
    out[i] = s * scale;
  }
  return out;
}

/**
 * The Lab (route "/"): paste a link or drop a file → BPM + key → stems → sections.
 *
 * Before stems exist the page shows the full-mix waveform with a section strip above it;
 * once separation finishes the Stem Player (with the same strip) is the only timeline.
 * Sections are detected from the full mix right after decode, re-detected from the
 * stems when they load, and saved to the vault with the track (edits win over detection).
 */
export function Analyze({ theme, t }) {
  const { isSignedIn } = useAuth();
  const audio = useAudioProcessor();
  const { toast } = useToast();
  const {
    stems,
    stemTypes,
    mode: separationMode,
    stemAudioData,
    blobUrl: audioBlobUrl,
    status: separationStatus,
    progress: separationProgress,
    error: separationError,
    keepStatus,
    separateStems,
    restoreStems,
    getStemAudio,
    clearStems,
    cancelSeparation,
    downloadStemFile,
    downloadRemixPack,
    keepStem,
    keepAllStems,
  } = useStemSeparation();

  // Stem Player pauses the single-source player when it starts
  const audioRef = useRef(null);
  const audioFileDataRef = useRef(null);
  const pauseMainPlayback = useCallback(() => {
    const a = audioRef.current;
    if (a?.isPlaying && audioFileDataRef.current) a.togglePlayback(audioFileDataRef.current);
  }, []);
  const stemPlayer = useStemPlayer({ stemTypes, getStemAudio, onPlay: pauseMainPlayback });

  const helper = useHelper();
  const vault = useVault();
  const [searchParams, setSearchParams] = useSearchParams();
  const [restoringTrack, setRestoringTrack] = useState(null);

  // Track state
  const [audioFileData, setAudioFileData] = useState(null);
  const [audioMetadata, setAudioMetadata] = useState({ title: '', artist: '', sourceFilename: '' });
  const [trackInfo, setTrackInfo] = useState(null); // { bpm, key } right after decode
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInReason, setSignInReason] = useState(null);

  // Arrangement: bar grid + sections
  const [gridOffset, setGridOffset] = useState(0);        // seconds — where bar 1 lands
  const [sections, setSections] = useState(null);          // [{ label, start }] or null
  const [sectionsSource, setSectionsSource] = useState(null); // 'mix' | 'stems' | 'manual'
  const [sectionsDetecting, setSectionsDetecting] = useState(false);
  const sectionsKeyRef = useRef('');

  useEffect(() => { audioRef.current = audio; audioFileDataRef.current = audioFileData; });
  usePageTitle('Lab', audioMetadata.title || undefined);

  const dropZoneRef = useRef(null);
  const stemsReady = separationStatus === 'ready' && stemTypes.length > 0;

  // ---- Decode on load ----
  const prepareAudioBufferRef = useRef(audio.prepareAudioBuffer);
  useEffect(() => { prepareAudioBufferRef.current = audio.prepareAudioBuffer; }, [audio.prepareAudioBuffer]);
  const lastProcessedAudioRef = useRef(null);

  useEffect(() => {
    if (!audioFileData || lastProcessedAudioRef.current === audioFileData) return;
    lastProcessedAudioRef.current = audioFileData;
    (async () => {
      setError(null);
      const result = await prepareAudioBufferRef.current(audioFileData);
      if (result.error) setError(result.error);
    })();
  }, [audioFileData]);

  // ---- Quick tempo + key right after decode (stamps filenames, drives the bar grid) ----
  const detectTempoAndKeyRef = useRef(audio.detectTempoAndKey);
  useEffect(() => { detectTempoAndKeyRef.current = audio.detectTempoAndKey; }, [audio.detectTempoAndKey]);

  useEffect(() => {
    const buffer = audio.audioBuffer;
    setTrackInfo(null);
    if (!buffer || !detectTempoAndKeyRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const sampleRate = buffer.sampleRate;
        const maxSamples = Math.min(buffer.length, sampleRate * 360);
        const mono = new Float32Array(maxSamples);
        for (let c = 0; c < buffer.numberOfChannels; c++) {
          const data = buffer.getChannelData(c);
          for (let i = 0; i < maxSamples; i++) mono[i] += data[i] / buffer.numberOfChannels;
        }
        const result = await detectTempoAndKeyRef.current(mono, sampleRate);
        if (!cancelled) setTrackInfo(result);
      } catch (err) {
        console.warn('Quick tempo/key detection failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [audio.audioBuffer]);

  // ---- Sections: full mix first, stems when they land, never over a manual edit ----
  const detectSectionsRef = useRef(audio.detectSections);
  useEffect(() => { detectSectionsRef.current = audio.detectSections; }, [audio.detectSections]);
  const getStemBufferRef = useRef(stemPlayer.getBuffer);
  useEffect(() => { getStemBufferRef.current = stemPlayer.getBuffer; }, [stemPlayer.getBuffer]);

  useEffect(() => {
    const buffer = audio.audioBuffer;
    if (!buffer || !trackInfo || sectionsSource === 'manual') return;
    const useStems = stemPlayer.status === 'ready' && stemTypes.length > 0;
    if (!useStems && sectionsSource === 'stems') return; // don't downgrade a stems result
    const bpm = trackInfo.bpm?.bpm || 0;
    const key = `${useStems ? `stems:${stemTypes.join(',')}` : 'mix'}:${bpm}:${gridOffset.toFixed(3)}`;
    if (sectionsKeyRef.current === key) return;
    sectionsKeyRef.current = key;

    let cancelled = false;
    (async () => {
      setSectionsDetecting(true);
      try {
        const by = 2;
        const layers = useStems
          ? stemTypes.map(type => ({ role: type, buf: getStemBufferRef.current(type) })).filter(l => l.buf).map(l => ({ role: l.role, data: monoOf(l.buf, by) }))
          : [{ role: 'mix', data: monoOf(buffer, by) }];
        if (!layers.length) return;
        const result = await detectSectionsRef.current(layers, buffer.sampleRate / by, { bpm, gridOffset });
        if (cancelled || sectionsKeyRef.current !== key) return;
        setSections(result.sections);
        setSectionsSource(useStems ? 'stems' : 'mix');
      } catch (err) {
        console.warn('Section detection failed:', err);
      } finally {
        if (!cancelled) setSectionsDetecting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [audio.audioBuffer, trackInfo, stemPlayer.status, stemTypes, gridOffset, sectionsSource]);

  const handleSectionsChange = useCallback((next) => {
    setSections(next);
    setSectionsSource('manual');
  }, []);

  // ---- Full-mix player (only until stems are ready) ----
  const { togglePlayback, seek, clearLoop, setLoopStart, setLoopEnd, setLoopEnabled, skipTime, isPlaying, loopEnabled, loopStart, loopEnd } = audio;
  const { pause: pauseStems, togglePlay: toggleStems, seek: seekStems, setLoopRegion: setStemLoop, positionRef: stemPositionRef } = stemPlayer;

  const handleTogglePlayback = useCallback(async () => {
    if (!isPlaying) pauseStems();
    const result = await togglePlayback(audioFileData);
    setError(result.error || null);
  }, [togglePlayback, isPlaying, audioFileData, pauseStems]);

  const handleWaveformSeek = useCallback((time) => seek(time), [seek]);
  const handleClearLoop = useCallback(() => clearLoop(), [clearLoop]);
  const handleLoopRegionChange = useCallback((region) => {
    if (region) {
      setLoopStart(region.start);
      setLoopEnd(region.end);
      setLoopEnabled(true);
    } else {
      clearLoop();
    }
  }, [setLoopStart, setLoopEnd, setLoopEnabled, clearLoop]);
  const handleToggleLoop = useCallback(() => setLoopEnabled(!loopEnabled), [loopEnabled, setLoopEnabled]);

  // Section strip (pre-stems): jump there and play
  const handleSectionSeek = useCallback((time) => {
    seek(time);
    if (!isPlaying) setTimeout(() => audioRef.current?.togglePlayback(audioFileDataRef.current), 30);
  }, [seek, isPlaying]);

  // The full-mix player disappears when stems are ready — make sure it's silent
  useEffect(() => {
    if (stemsReady) pauseMainPlayback();
  }, [stemsReady, pauseMainPlayback]);

  // Keyboard: space play/pause, ← → skip 5 s, L loop, Esc clear loop — whichever player is on screen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (!audioFileData) return;
      if (stemsReady) {
        if (e.code === 'Space') { e.preventDefault(); toggleStems(); }
        else if (e.code === 'ArrowLeft') { e.preventDefault(); seekStems(stemPositionRef.current - 5); }
        else if (e.code === 'ArrowRight') { e.preventDefault(); seekStems(stemPositionRef.current + 5); }
        else if (e.code === 'Escape') setStemLoop(null);
        return;
      }
      switch (e.code) {
        case 'Space': e.preventDefault(); handleTogglePlayback(); break;
        case 'ArrowLeft': e.preventDefault(); skipTime(-5); break;
        case 'ArrowRight': e.preventDefault(); skipTime(5); break;
        case 'KeyL': if (loopStart !== null && loopEnd !== null) setLoopEnabled(!loopEnabled); break;
        case 'Escape': handleClearLoop(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioFileData, stemsReady, toggleStems, seekStems, stemPositionRef, setStemLoop, skipTime, loopStart, loopEnd, loopEnabled, setLoopEnabled, handleTogglePlayback, handleClearLoop]);

  // ---- Loading audio ----
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); if (e.target === dropZoneRef.current) setIsDragging(false); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (isAllowedAudioFile(file)) processAudioFile(file);
    else toast.error('Unsupported format. Please upload a WAV, MP3, M4A or FLAC file.');
  };
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (isAllowedAudioFile(file)) processAudioFile(file);
    else toast.error('Unsupported format. Please upload a WAV, MP3, M4A or FLAC file.');
  };

  // Everything that must be cleared when a different piece of audio comes in
  const resetForNewAudio = () => {
    setError(null);
    setTrackInfo(null);
    audio.reset();
    handleClearLoop();
    clearStems();
    setGridOffset(0);
    setSections(null);
    setSectionsSource(null);
    sectionsKeyRef.current = '';
  };

  const processAudioFile = (file) => {
    resetForNewAudio();
    const filename = file.name.replace(/\.[^/.]+$/, '');
    setAudioMetadata({ title: filename, artist: 'Unknown Artist', sourceFilename: file.name });
    const reader = new FileReader();
    reader.onload = (event) => setAudioFileData(event.target.result);
    reader.readAsArrayBuffer(file);
  };

  // Track pulled in through the local helper (YouTube / SoundCloud → FLAC) with real metadata
  const handleImported = ({ arrayBuffer, meta }) => {
    resetForNewAudio();
    setAudioMetadata({
      title: meta.title || 'Untitled',
      artist: meta.artist || meta.uploader || 'Unknown Artist',
      sourceFilename: meta.filename || 'import.flac',
      // Prefer the platform's artwork URL (persists in the Vault); the helper's local copy is temporary
      thumbnailUrl: meta.thumbnail || meta.thumbnailUrl || null,
      sourceUrl: meta.sourceUrl || null,
      source: meta.source || null,
      savedTo: meta.savedTo || null,
      importFilename: meta.filename || null,
    });
    setAudioFileData(arrayBuffer);
    toast.success(meta.savedTo
      ? `Got it — saved to Remix Lab/Sources as ${meta.filename}`
      : `Loaded ${meta.artist ? `${meta.artist} — ` : ''}${meta.title}`);
  };

  // Metadata for stamped stem filenames + Remix Pack notes
  const stemMeta = React.useMemo(() => {
    const bpmInfo = trackInfo?.bpm || null;
    const keyInfo = trackInfo?.key || null;
    return {
      artist: audioMetadata.artist,
      title: audioMetadata.title,
      bpm: bpmInfo?.bpm ?? null,
      bpmConfidence: bpmInfo?.confidence ?? null,
      halfTempo: bpmInfo?.halfTempo ?? null,
      doubleTempo: bpmInfo?.doubleTempo ?? null,
      key: keyInfo ? { key: keyInfo.key, mode: keyInfo.mode, camelot: keyInfo.camelot, compatibleKeys: keyInfo.compatibleKeys, confidence: keyInfo.confidence, alternatives: keyInfo.alternatives } : null,
    };
  }, [trackInfo, audioMetadata.artist, audioMetadata.title]);

  // ---- Vault: save when stems are ready, again as stems are kept or sections change ----
  const vaultUpsertRef = useRef(vault.upsertTrack);
  useEffect(() => { vaultUpsertRef.current = vault.upsertTrack; }, [vault.upsertTrack]);

  useEffect(() => {
    if (separationStatus !== 'ready' || !stems || !audioBlobUrl) return;
    const id = vaultIdFor(audioBlobUrl);
    if (!id) return;
    const stemEntries = {};
    for (const [type, url] of Object.entries(stems)) {
      if (!url) continue;
      stemEntries[type] = {
        url,
        kept: keepStatus[type] === 'saved' || /\.public\.blob\.vercel-storage\.com/.test(url),
        size: stemAudioData[type]?.byteLength || undefined,
      };
    }
    vaultUpsertRef.current({
      id,
      title: audioMetadata.title || 'Untitled',
      artist: audioMetadata.artist && !/^unknown artist$/i.test(audioMetadata.artist) ? audioMetadata.artist : null,
      source: audioMetadata.source || (audioMetadata.sourceUrl ? 'link' : 'upload'),
      sourceUrl: audioMetadata.sourceUrl || null,
      thumbnailUrl: audioMetadata.thumbnailUrl && !/localhost|127\.0\.0\.1/.test(audioMetadata.thumbnailUrl) ? audioMetadata.thumbnailUrl : null,
      duration: audio.duration || null,
      bpm: stemMeta.bpm || null,
      key: stemMeta.key ? { key: stemMeta.key.key, mode: stemMeta.key.mode, camelot: stemMeta.key.camelot, confidence: stemMeta.key.confidence } : null,
      audioUrl: audioBlobUrl,
      mode: separationMode,
      stems: stemEntries,
      gridOffset,
      sections: sections || [],
      sectionsSource: sectionsSource || null,
    });
  }, [separationStatus, stems, keepStatus, audioBlobUrl, separationMode, stemAudioData, audioMetadata, audio.duration, stemMeta.bpm, stemMeta.key, gridOffset, sections, sectionsSource]);

  // ---- Vault: restore a full session from /?track=<id> ----
  const restoreStemsRef = useRef(restoreStems);
  useEffect(() => { restoreStemsRef.current = restoreStems; }, [restoreStems]);
  const getTrackRef = useRef(vault.getTrack);
  useEffect(() => { getTrackRef.current = vault.getTrack; }, [vault.getTrack]);
  const lastRestoredRef = useRef(null);

  useEffect(() => {
    const trackId = searchParams.get('track');
    if (!trackId || trackId === lastRestoredRef.current) return;
    const track = getTrackRef.current(trackId);
    if (!track) return; // vault may still be loading — effect re-runs when tracks change
    lastRestoredRef.current = trackId;

    // Deliberately not cancellable: vault.tracks is replaced when the server refresh lands,
    // which re-runs this effect — the in-flight restore must survive that.
    (async () => {
      setRestoringTrack(track);
      setError(null);
      try {
        const res = await fetch(track.audioUrl);
        if (!res.ok) throw new Error('The original upload is no longer available.');
        const buffer = await res.arrayBuffer();
        resetForNewAudio();
        setAudioMetadata({
          title: track.title || 'Untitled',
          artist: track.artist || 'Unknown Artist',
          sourceFilename: `${track.title || 'track'}.${(track.audioUrl.split('.').pop() || 'flac').split('?')[0]}`,
          thumbnailUrl: track.thumbnailUrl || null,
          sourceUrl: track.sourceUrl || null,
          source: track.source || null,
        });
        setGridOffset(track.gridOffset || 0);
        if (Array.isArray(track.sections) && track.sections.length) {
          setSections(track.sections);
          setSectionsSource(track.sectionsSource || 'manual');
        }
        setAudioFileData(buffer);
        const stemUrls = Object.fromEntries(Object.entries(track.stems || {}).map(([k, v]) => [k, v?.url]).filter(([, u]) => u));
        if (Object.keys(stemUrls).length) restoreStemsRef.current(stemUrls, track.audioUrl, track.mode);
        toast.success(`Restored ${track.artist ? `${track.artist} — ` : ''}${track.title}`);
      } catch (err) {
        setError(err.message || 'Could not restore this track.');
      } finally {
        setRestoringTrack(null);
        setSearchParams({}, { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, vault.tracks]);

  // ---- Stems ----
  const handleSeparateStems = useCallback(async ({ mode = 'vocals', quality = 'best' } = {}) => {
    if (!audioFileData) return;
    if (!isSignedIn) {
      setSignInReason('Stem separation runs on a paid GPU — unlock the lab first.');
      setShowSignIn(true);
      return;
    }
    // Preserve the real extension so the Blob upload gets the right MIME type
    const ext = (audioMetadata.sourceFilename || '').split('.').pop()?.toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : 'mp3';
    const filename = `${audioMetadata.title || 'audio'}.${safeExt}`;
    await separateStems(audioFileData, filename, { mode, quality, meta: stemMeta });
  }, [audioFileData, audioMetadata.title, audioMetadata.sourceFilename, separateStems, stemMeta, isSignedIn]);

  const handleDownloadPack = useCallback(async () => {
    const ok = await downloadRemixPack(stemMeta, { sections, gridOffset });
    if (ok) toast.success('Remix Pack downloaded');
  }, [downloadRemixPack, stemMeta, sections, gridOffset, toast]);

  // Helper writes stems into ~/Music/Remix Lab/Stems/<Artist - Title>/ → Live's browser
  const handleSaveToLive = useCallback(async () => {
    if (!stems) return;
    const urls = Object.fromEntries(stemTypes.map(type => [type, stems[type]]).filter(([, u]) => u));
    try {
      const result = await saveStemsToLive(urls, stemMeta, separationMode, { sections, gridOffset });
      toast.success(`${result.files.length - 1} stems saved to Remix Lab › Stems › ${result.dir.split('/').pop()}`);
    } catch (err) {
      toast.error(err.message || 'Could not save stems');
    }
  }, [stems, stemTypes, stemMeta, separationMode, sections, gridOffset, toast]);

  // ---- Lock to tempo ----
  // Beat-track the instrumental if there is one, else the full mix. Never the vocal: it
  // has almost no transients, which is the whole reason Live's Auto-Warp fails on one.
  const handleAnalyseBeats = useCallback(async () => {
    const track = (buffer) => {
      const by = Math.max(1, Math.round(buffer.sampleRate / 22050));
      return audio.detectBeats(monoOf(buffer, by), buffer.sampleRate / by);
    };
    const preferred = ['drums', 'other', 'bass', 'piano', 'guitar'];
    const stemBuffer = preferred.map(type => getStemBufferRef.current(type)).find(Boolean);
    if (!stemBuffer && !audio.audioBuffer) throw new Error('Nothing to beat-track yet');
    if (!stemBuffer) return track(audio.audioBuffer);

    const fromStem = await track(stemBuffer);
    // An acapella's "instrumental" is just bleed — when it tracks badly, the full mix is
    // usually the better bet, so try both and keep whichever sits on the onsets better.
    if (fromStem.confidence >= 40 || !audio.audioBuffer) return fromStem;
    const fromMix = await track(audio.audioBuffer);
    return fromMix.confidence > fromStem.confidence ? fromMix : fromStem;
  }, [audio]);

  const handleLockToLive = useCallback(async (plan, onProgress) => {
    const urls = Object.fromEntries(stemTypes.map(type => [type, stems?.[type]]).filter(([, u]) => u));
    if (!Object.keys(urls).length) throw new Error('No stems to lock');
    const result = await lockStemsToLive(urls, stemMeta, separationMode, plan, { sections, gridOffset }, onProgress);
    toast.success(`${result.files.length - 1} stems locked to ${plan.targetBpm} BPM in Remix Lab › Stems › ${result.dir.split('/').pop()}`);
    return result;
  }, [stems, stemTypes, stemMeta, separationMode, sections, gridOffset, toast]);

  const handleKeepStem = useCallback((stemType) => keepStem(stemType, stemMeta), [keepStem, stemMeta]);
  const handleKeepAll = useCallback(() => keepAllStems(stemMeta), [keepAllStems, stemMeta]);
  const handleDownloadStem = useCallback((stemType) => downloadStemFile(stemType, stemMeta), [downloadStemFile, stemMeta]);
  const handleResetStems = useCallback(() => {
    pauseStems();
    clearStems();
  }, [clearStems, pauseStems]);

  const handleSeek = (e) => {
    if (!audio.audioBuffer || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * audio.duration);
  };

  const barSec = stemMeta.bpm ? 240 / stemMeta.bpm : 0;
  const sectionsNote = sectionsSource === 'manual' ? 'edited' : sectionsSource === 'stems' ? 'from stems' : sectionsSource === 'mix' ? 'from the mix' : undefined;

  return (
    <div className={`${t.text} p-4 md:p-8`}>
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className={`rounded-xl p-5 mb-6 backdrop-blur ${theme === 'dark' ? 'bg-red-500/10 border border-red-500/50' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
              <div className="flex-1 min-w-0">
                <p className={`font-medium mb-1 ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
                {!audioFileData && (
                  <button
                    onClick={() => { setError(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600' : 'bg-ember-600 text-white hover:bg-ember-700'}`}
                  >
                    <UploadCloud className="w-4 h-4" /> Load another track
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {restoringTrack && (
          <div className={`flex items-center gap-3 p-3 mb-4 rounded-lg border font-mono text-[12px] ${theme === 'dark' ? 'bg-[#0D0F12] border-[#1C2027] text-[#9AA4B0]' : 'bg-white border-[#D9DDE3] text-[#4B5563]'}`}>
            <Loader2 className="w-4 h-4 animate-spin text-ember-500" />
            restoring {restoringTrack.artist ? `${restoringTrack.artist} — ` : ''}{restoringTrack.title} from the vault…
          </div>
        )}

        {/* Paste a link / search — via the local helper */}
        <LinkImport helper={helper} onImported={handleImported} hero={!audioFileData} theme={theme} t={t} />

        {/* Drop zone (a panel when nothing is loaded, one line afterwards) */}
        <AudioUploadSection
          isDragging={isDragging}
          onFileUpload={handleFileUpload}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          showWelcome={!audioFileData}
          dropZoneRef={dropZoneRef}
          theme={theme}
          t={t}
        />

        {audioFileData && (
          <div className={`p-6 mb-6 border ${t.cardAlt}`}>
            {/* Track header — artwork, Syne title, mono readout, BPM / key chips */}
            <div className="flex items-center gap-4 mb-2">
              <div className={`w-16 h-16 flex items-center justify-center rounded-md overflow-hidden flex-shrink-0 border ${
                theme === 'dark' ? 'bg-[#14171C] border-[#1C2027]' : 'bg-[#EDEFF3] border-[#D9DDE3]'
              }`} style={audioMetadata.thumbnailUrl ? undefined : { backgroundImage: 'conic-gradient(from 200deg, #8B5CF6, #3B82F6, #22C55E, #FACC15, #EF4444, #8B5CF6)' }}>
                {audioMetadata.thumbnailUrl ? (
                  <img src={audioMetadata.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-7 h-7 text-white drop-shadow" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-display font-extrabold uppercase tracking-tight text-xl leading-tight ${t.text} truncate`}>{audioMetadata.title}</h3>
                <p className={`font-mono text-[13px] ${t.textMuted} truncate`}>
                  {audioMetadata.artist}
                  {audio.duration ? ` — ${audio.formatTime(audio.duration)}` : ''}
                  {audioMetadata.source ? ` — ${audioMetadata.source}` : ''}
                </p>
              </div>
              {audioMetadata.importFilename && (
                <button
                  type="button"
                  onClick={() => {
                    const ext = audioMetadata.importFilename.split('.').pop();
                    saveBlob(new Blob([audioFileData], { type: mimeForExt(ext) }), audioMetadata.importFilename);
                  }}
                  className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-mono text-[12px] ${t.button}`}
                  title={audioMetadata.savedTo ? `Already in ${audioMetadata.savedTo}` : 'Download the source file'}
                >
                  <Download className="w-3.5 h-3.5" /> save file
                </button>
              )}
              {(stemMeta.bpm || stemMeta.key) && (
                <div className="hidden sm:flex items-center gap-2 font-mono text-[13px] tabular-nums" aria-label="Detected tempo and key">
                  {stemMeta.bpm && (
                    <span className={`px-2.5 py-1 rounded border ${theme === 'dark' ? 'bg-[#0D0F12] border-[#1C2027]' : 'bg-white border-[#D9DDE3]'}`} style={{ color: theme === 'dark' ? '#FACC15' : '#A16207' }}>
                      {stemMeta.bpm.toFixed(2)} BPM
                    </span>
                  )}
                  {stemMeta.key && (
                    <span
                      className={`px-2.5 py-1 rounded border ${theme === 'dark' ? 'bg-[#0D0F12] border-[#1C2027]' : 'bg-white border-[#D9DDE3]'}`}
                      style={{ color: theme === 'dark' ? '#3B82F6' : '#1D4ED8' }}
                      title={stemMeta.key.confidence != null
                        ? `Key confidence ${stemMeta.key.confidence}%${stemMeta.key.alternatives?.length ? ` — also plausible: ${stemMeta.key.alternatives.map(a => `${displayKeyName(a)} ${a.mode}`).join(', ')}` : ''}`
                        : undefined}
                    >
                      {stemMeta.key.confidence != null && stemMeta.key.confidence < 60 ? '~ ' : ''}
                      {displayKeyName(stemMeta.key)} {stemMeta.key.mode === 'minor' ? 'MIN' : 'MAJ'}{stemMeta.key.camelot ? ` / ${stemMeta.key.camelot}` : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="rule-spectrum mb-6 opacity-80" aria-hidden="true" />

            {/* Full-mix timeline — until the stems take over */}
            {!stemsReady && (
              <>
                {(sections || sectionsDetecting) && (
                  <div className={`mb-2 py-1.5 rounded-md border ${theme === 'dark' ? 'bg-[#0D0F12] border-[#1C2027]' : 'bg-white border-[#D9DDE3]'}`}>
                    <SectionStrip
                      sections={sections}
                      duration={audio.duration}
                      barSec={barSec}
                      gridOffset={gridOffset}
                      positionRef={audio.playbackTimeRef}
                      onChange={handleSectionsChange}
                      onSeek={handleSectionSeek}
                      formatTime={audio.formatTime}
                      theme={theme}
                      detecting={sectionsDetecting}
                      note={sectionsNote}
                    />
                  </div>
                )}
                <WaveformVisualizer
                  waveformData={audio.waveformData}
                  waveformHiResRef={audio.waveformHiResRef}
                  waveformColorRef={audio.waveformColorRef}
                  duration={audio.duration}
                  playbackTime={audio.playbackTime}
                  playbackTimeRef={audio.playbackTimeRef}
                  loopStart={audio.loopStart}
                  loopEnd={audio.loopEnd}
                  loopEnabled={audio.loopEnabled}
                  onToggleLoop={handleToggleLoop}
                  onClearLoop={handleClearLoop}
                  onSeek={handleWaveformSeek}
                  onLoopRegionChange={handleLoopRegionChange}
                  formatTime={audio.formatTime}
                  theme={theme}
                  t={t}
                />
                {(audio.isPlaying || audio.spectrumData.length > 0) && (
                  <SpectrumAnalyzer
                    spectrumData={audio.spectrumData}
                    brightness={audio.brightness}
                    isPlaying={audio.isPlaying}
                    loopEnabled={audio.loopEnabled}
                    theme={theme}
                    t={t}
                  />
                )}
                <PlaybackControls
                  isPlaying={audio.isPlaying}
                  playbackTime={audio.playbackTime}
                  duration={audio.duration}
                  volume={audio.volume}
                  loopStart={audio.loopStart}
                  loopEnd={audio.loopEnd}
                  loopEnabled={audio.loopEnabled}
                  onTogglePlayback={handleTogglePlayback}
                  onSeek={handleSeek}
                  onVolumeChange={audio.setVolume}
                  formatTime={audio.formatTime}
                  theme={theme}
                  t={t}
                />
              </>
            )}

            {/* Stem Player + sections — the only timeline once stems exist */}
            {stemsReady && (
              <div className="mb-4">
                <StemPlayer
                  player={stemPlayer}
                  stemTypes={stemTypes}
                  mode={separationMode}
                  bpm={stemMeta.bpm}
                  gridOffset={gridOffset}
                  onGridOffsetChange={setGridOffset}
                  sections={sections}
                  onSectionsChange={handleSectionsChange}
                  sectionsDetecting={sectionsDetecting}
                  sectionsNote={sectionsNote}
                  theme={theme}
                  formatTime={audio.formatTime}
                />
              </div>
            )}

            {/* Separate → progress → stem rows (keep / download / to Live / pack) */}
            {audio.duration > 15 && (
              <StemSelector
                stems={stems}
                stemAudioData={stemAudioData}
                separationStatus={separationStatus}
                separationProgress={separationProgress}
                separationError={separationError}
                stemTypes={stemTypes}
                mode={separationMode}
                keepStatus={keepStatus}
                onSeparate={handleSeparateStems}
                onDownloadStem={handleDownloadStem}
                onDownloadPack={handleDownloadPack}
                onSaveToLive={helper.online ? handleSaveToLive : null}
                onKeepStem={handleKeepStem}
                onKeepAll={handleKeepAll}
                tempoLock={separationStatus === 'ready' && helper.online ? (
                  <TempoLock
                    duration={audio.duration}
                    detectedBpm={stemMeta.bpm}
                    sourceKey={stemMeta.key}
                    onAnalyse={handleAnalyseBeats}
                    onLock={handleLockToLive}
                    canLock={!!helper.health?.canLock}
                    theme={theme}
                    t={t}
                  />
                ) : null}
                onReset={handleResetStems}
                onCancel={cancelSeparation}
                hasAudio={!!audioFileData}
                theme={theme}
                t={t}
              />
            )}
          </div>
        )}

        {/* Lab sign-in — opened when a gated action (stem separation) is attempted while locked */}
        <LabSignIn
          isOpen={showSignIn}
          onClose={() => { setShowSignIn(false); setSignInReason(null); }}
          theme={theme}
          reason={signInReason}
        />
      </div>
    </div>
  );
}
