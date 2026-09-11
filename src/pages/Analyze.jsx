import React, { useState, useRef, useEffect, useCallback } from 'react';

// Hooks
import { useAudioProcessor, useHistory, useStemSeparation, usePageTitle, useHelper } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { labAuthHeaders, getLabToken } from '../lib/labAuth';
import { upload } from '@vercel/blob/client';

// Components
import { useToast } from '../components/ui/Toast';
import { LabSignIn } from '../components/auth';
import { HistoryPanel } from '../components/history';
import { SpectrumAnalyzer, PlaybackControls, WaveformVisualizer, AudioUploadSection, InstrumentSelector, AnalyzeSection, StemSelector, PresetSelector, LinkImport } from '../components/audio';
import { Music, Scissors, Sparkles, Loader2, ArrowLeft, AlertTriangle, UploadCloud } from 'lucide-react';
import { AnalysisStepFlow } from '../components/analysis';
import { ExportToolbar } from '../components/comparison';

// Utils
import { instrumentLabels } from '../utils/constants';
import { generateInstrumentRecommendations } from '../utils/recommendations';
import { generateDemoSound, audioBufferToWav } from '../utils/demoSoundGenerator';

// Analytics
import { trackAudioUpload, trackAnalysisStarted, trackAnalysisCompleted, trackPresetExported } from '../lib/posthog';


// AI (Gemini) label → app instrument category mapping
const AI_LABEL_MAP = {
  'synth pad': 'pad',
  'synth lead': 'lead',
  'synth bass': 'bass',
  '808 bass': 'bass',
  'sub bass': 'sub-bass',
  'bass guitar': 'bass',
  'electric bass': 'bass',
  'acoustic guitar': 'guitar',
  'electric guitar': 'guitar',
  'piano': 'keys',
  'brass': 'brass',
  'strings': 'strings',
  'woodwind': 'woodwind',
  'vocal': 'vocal',
  'kick drum': 'kick',
  'snare drum': 'snare',
  'hi-hat': 'hihat',
  'drums': 'drums',
  'pluck synth': 'pluck',
  'full mix': 'full',
};

// Stem-specific labels for Gemini AI detection — narrowed options improve accuracy
const STEM_LABELS = {
  bass: ['synth bass', '808 bass', 'sub bass', 'bass guitar', 'pluck synth', 'kick drum'],
  drums: ['kick drum', 'snare drum', 'hi-hat', 'drums', 'synth pad', 'full mix'],
  vocals: ['vocal', 'synth pad', 'synth lead', 'strings', 'brass', 'woodwind'],
  other: null, // Use default labels
};

/**
 * Analyze page - The main audio analyzer tool
 * Receives theme and t (theme classes) from parent layout
 */
export function Analyze({ theme, t }) {
  // Custom hooks
  const { isSignedIn, prefs } = useAuth();
  const audio = useAudioProcessor();
  const { toast } = useToast();
  const {
    history,
    isOpen: historyOpen,
    toggleOpen: toggleHistoryOpen,
    addToHistory,
    deleteFromHistory,
    clearHistory,
  } = useHistory();
  // Stem separation hook
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
    getStemAudio,
    clearStems,
    cancelSeparation,
    downloadStemFile,
    downloadRemixPack,
    keepStem,
    keepAllStems,
  } = useStemSeparation();

  // Local yt-dlp companion for link / search imports
  const helper = useHelper();


  // UI state
  const [audioFileData, setAudioFileData] = useState(null);
  const [audioMetadata, setAudioMetadata] = useState({ title: '', artist: '', sourceFilename: '' });
  // Quick BPM/key detected right after decode (before any full analysis) — used to
  // stamp stem filenames and show the tempo/key chip in the header
  const [trackInfo, setTrackInfo] = useState(null);
  usePageTitle('Lab', audioMetadata.title || undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [wavetableData, setWavetableData] = useState(null);
  const [detectedInstruments, setDetectedInstruments] = useState(null);
  const [error, setError] = useState(null);
  const [selectedInstrument, setSelectedInstrument] = useState('full');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  // Stem playback state
  const [playingStem, setPlayingStem] = useState(null); // 'vocals' | 'drums' | 'bass' | 'other' | null
  // Track which stem is currently being analyzed (for UI indicator on stem cards)
  const [analyzingStemType, setAnalyzingStemType] = useState(null);

  // Upgrade prompt state

  // Step flow state — guided post-analysis experience
  const [expandedSteps, setExpandedSteps] = useState(new Set([1])); // Step 1 auto-expanded
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInReason, setSignInReason] = useState(null);

  // Refs
  const dropZoneRef = useRef(null);
  const stemSectionRef = useRef(null);
  const waveformSectionRef = useRef(null);
  const resultsSectionRef = useRef(null);
  const analyzeSectionRef = useRef(null);
  const [showFloatingAnalyze, setShowFloatingAnalyze] = useState(false);

  // AI detection state (Gemini-powered, runs after heuristic analysis)
  const [aiDetectionStatus, setAIDetectionStatus] = useState('idle'); // idle | uploading | detecting | done | error
  const aiAbortRef = useRef(0);
  const reAnalyzeRef = useRef(null); // Ref to reAnalyzeWithInstrument for stable CLAP callback

  // Stem waveform state — which stem's waveform is shown in the main visualizer
  const [activeStemView, setActiveStemView] = useState(null); // null = full mix, 'vocals'|'drums'|'bass'|'other'
  const stemWaveformDataRef = useRef({}); // { vocals: { preview, hiRes, duration }, ... }
  const [stemWaveformPreview, setStemWaveformPreview] = useState(null); // 200-point preview for active stem
  const stemWaveformHiResRef = useRef(null); // hi-res min/max for active stem
  const stemWaveformColorRef = useRef(null); // spectral colour map for active stem (Signal Deck)
  const activeStemViewRef = useRef(null); // ref mirror for async callbacks
  const [stemLoopRegions, setStemLoopRegions] = useState({}); // { vocals: { start, end, enabled }, ... }

  // Abort AI detection on unmount
  useEffect(() => {
    return () => { aiAbortRef.current++; };
  }, []);

  // Keep activeStemView ref in sync for async callbacks
  useEffect(() => {
    activeStemViewRef.current = activeStemView;
  }, [activeStemView]);

  // Store prepareAudioBuffer in a ref to avoid dependency issues
  const prepareAudioBufferRef = useRef(audio.prepareAudioBuffer);
  useEffect(() => {
    prepareAudioBufferRef.current = audio.prepareAudioBuffer;
  }, [audio.prepareAudioBuffer]);

  // Track last processed audio to prevent duplicate preparation
  const lastProcessedAudioRef = useRef(null);

  // Prepare audio buffer on upload (NO instrument detection - that happens on Analyze)
  useEffect(() => {
    if (!audioFileData) return;

    // Skip if we already processed this exact audio file
    if (lastProcessedAudioRef.current === audioFileData) return;
    lastProcessedAudioRef.current = audioFileData;

    const prepareBuffer = async () => {
      setError(null);
      const result = await prepareAudioBufferRef.current(audioFileData);
      if (result.error) {
        setError(result.error);
      }
    };

    prepareBuffer();
  }, [audioFileData]);

  // Quick tempo + key detection as soon as the buffer is decoded, so stems can be
  // stamped with BPM/key before (or without) a full analysis. Runs on up to the
  // first 90s of mono audio in the worker; full analysis overrides it later.
  const detectTempoAndKeyRef = useRef(audio.detectTempoAndKey);
  useEffect(() => {
    detectTempoAndKeyRef.current = audio.detectTempoAndKey;
  }, [audio.detectTempoAndKey]);

  useEffect(() => {
    const buffer = audio.audioBuffer;
    setTrackInfo(null);
    if (!buffer || !detectTempoAndKeyRef.current) return;

    let cancelled = false;
    const run = async () => {
      try {
        const sampleRate = buffer.sampleRate;
        const maxSamples = Math.min(buffer.length, sampleRate * 90);
        // Mono mixdown of the analysed window
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
    };
    run();
    return () => { cancelled = true; };
  }, [audio.audioBuffer]);

  // IntersectionObserver: show floating Analyze button when AnalyzeSection scrolls out of view
  useEffect(() => {
    const el = analyzeSectionRef.current;
    if (!el) {
      setShowFloatingAnalyze(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setShowFloatingAnalyze(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [audioFileData, analysis]);

  // Handlers that wrap audio processor methods (declared before useEffect that uses them)
  const handleTogglePlayback = useCallback(async () => {
    // Play the active stem if one is being viewed, otherwise play full mix
    const activeStem = activeStemViewRef.current;
    let audioToPlay = audioFileData;

    if (activeStem) {
      // Use cached stem audio if available, otherwise download it
      if (stemAudioData[activeStem]) {
        audioToPlay = stemAudioData[activeStem];
      } else {
        const downloaded = await getStemAudio(activeStem);
        if (downloaded) {
          audioToPlay = downloaded;
        }
      }
      setPlayingStem(activeStem);
    } else if (playingStem) {
      setPlayingStem(null);
    }

    const result = await audio.togglePlayback(audioToPlay);
    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
    }
  }, [audio.togglePlayback, audioFileData, stemAudioData, getStemAudio, playingStem]);

  const handleClearLoop = useCallback(() => {
    audio.clearLoop();
  }, [audio.clearLoop]);

  // Waveform interaction callbacks (Canvas component handles all mouse/touch internally)
  const handleWaveformSeek = useCallback((time) => {
    audio.seek(time);
  }, [audio.seek]);

  const handleLoopRegionChange = useCallback((region) => {
    if (region) {
      audio.setLoopStart(region.start);
      audio.setLoopEnd(region.end);
      audio.setLoopEnabled(true);
    } else {
      audio.clearLoop();
    }
  }, [audio.setLoopStart, audio.setLoopEnd, audio.setLoopEnabled, audio.clearLoop]);

  // Stem-aware loop region handlers — route to stem loop or full mix loop
  const handleViewLoopRegionChange = useCallback((region) => {
    if (!activeStemView) {
      handleLoopRegionChange(region);
      return;
    }
    if (region) {
      setStemLoopRegions(prev => ({
        ...prev,
        [activeStemView]: { start: region.start, end: region.end, enabled: true }
      }));
    } else {
      setStemLoopRegions(prev => {
        const next = { ...prev };
        delete next[activeStemView];
        return next;
      });
    }
  }, [activeStemView, handleLoopRegionChange]);

  const handleToggleViewLoop = useCallback(() => {
    if (activeStemView) {
      setStemLoopRegions(prev => {
        const current = prev[activeStemView];
        if (!current) return prev;
        return { ...prev, [activeStemView]: { ...current, enabled: !current.enabled } };
      });
    } else {
      audio.setLoopEnabled(!audio.loopEnabled);
    }
  }, [activeStemView, audio.loopEnabled, audio.setLoopEnabled]);

  const handleClearViewLoop = useCallback(() => {
    if (activeStemView) {
      setStemLoopRegions(prev => {
        const next = { ...prev };
        delete next[activeStemView];
        return next;
      });
    } else {
      handleClearLoop();
    }
  }, [activeStemView, handleClearLoop]);

  // Prepare stem waveform data (decode + generate preview + hi-res)
  const prepareStemWaveform = useCallback(async (stemType) => {
    // Check cache
    if (stemWaveformDataRef.current[stemType]) {
      return stemWaveformDataRef.current[stemType];
    }

    // Get stem audio data
    let audioData = stemAudioData[stemType];
    if (!audioData) {
      audioData = await getStemAudio(stemType);
    }
    if (!audioData) return null;

    // Decode to AudioBuffer with temporary context
    const tempCtx = new AudioContext({ sampleRate: 48000 });
    try {
      const buffer = await tempCtx.decodeAudioData(audioData.slice(0));
      const channelData = buffer.getChannelData(0);

      // Generate 200-point preview (reuse existing function)
      const preview = audio.generateWaveform(buffer);

      const stemData = { preview, hiRes: null, colors: null, duration: buffer.duration };

      // Cache immediately with preview
      stemWaveformDataRef.current[stemType] = stemData;

      // Generate hi-res data async via Web Worker
      audio.generateWaveformData(channelData, buffer.sampleRate)
        .then(hiResData => {
          stemData.hiRes = hiResData;
          // If this stem is still the active view, update the ref
          if (activeStemViewRef.current === stemType) {
            stemWaveformHiResRef.current = hiResData;
          }
        })
        .catch(() => {});

      // Spectral colour map for the stem waveform
      audio.generateWaveformColors(channelData, buffer.sampleRate, 640)
        .then(colorData => {
          stemData.colors = colorData;
          if (activeStemViewRef.current === stemType) {
            stemWaveformColorRef.current = colorData;
          }
        })
        .catch(() => {});

      return stemData;
    } finally {
      tempCtx.close();
    }
  }, [stemAudioData, getStemAudio, audio.generateWaveform, audio.generateWaveformData, audio.generateWaveformColors]);

  /**
   * Run CLAP instrument detection in background via Replicate API.
   * Uploads the analyzed audio region to Vercel Blob, starts a CLAP prediction,
   * polls for results, and updates detectedInstruments when done.
   * Runs asynchronously — heuristic results are shown immediately as preview.
   */
  /**
   * Run AI-powered instrument detection via Gemini 2.5 Flash.
   * Uploads audio to Vercel Blob, sends URL to /api/instrument (Gemini),
   * receives results synchronously (no polling), then updates detection state.
   * Heuristic results show instantly; AI refines in background (~2-5s).
   */
  const runAIDetection = useCallback(async (audioToAnalyze, isAnalyzingStem, analysisOptions, heuristicDetection, stemType) => {
    const callId = ++aiAbortRef.current;

    setAIDetectionStatus('uploading');

    try {
      // Step 1: Prepare audio data (slice to region if needed)
      let audioData = audioToAnalyze;

      if (!isAnalyzingStem && analysisOptions.regionStart != null && analysisOptions.regionEnd != null) {
        const tempCtx = new AudioContext({ sampleRate: 48000 });
        try {
          const fullBuffer = await tempCtx.decodeAudioData(audioToAnalyze.slice(0));
          const startSample = Math.floor(analysisOptions.regionStart * fullBuffer.sampleRate);
          const endSample = Math.min(Math.floor(analysisOptions.regionEnd * fullBuffer.sampleRate), fullBuffer.length);
          const regionBuffer = tempCtx.createBuffer(1, endSample - startSample, fullBuffer.sampleRate);
          regionBuffer.getChannelData(0).set(fullBuffer.getChannelData(0).slice(startSample, endSample));
          audioData = audioBufferToWav(regionBuffer);
        } finally {
          tempCtx.close();
        }
      }

      if (callId !== aiAbortRef.current) return;

      // Step 2: Upload to Vercel Blob
      // Gemini detection uploads a WAV of the region; skip entirely when the lab is locked
      if (!getLabToken()) return;
      const authHeaders = labAuthHeaders();

      const audioBlob = new Blob([audioData], { type: 'audio/wav' });
      const file = new File([audioBlob], 'ai-analysis.wav', { type: 'audio/wav' });
      const blobResult = await upload('ai-analysis.wav', file, {
        access: 'public',
        handleUploadUrl: '/api/upload-audio',
        headers: authHeaders,
      });

      if (!blobResult.url) throw new Error('Failed to upload audio for AI detection');
      if (callId !== aiAbortRef.current) return;

      // Step 3: Call Gemini via /api/instrument (synchronous — returns results directly)
      // Pass stem-specific labels when analyzing a known stem type for better accuracy
      setAIDetectionStatus('detecting');
      const stemLabels = isAnalyzingStem && stemType ? STEM_LABELS[stemType] : null;

      const response = await fetch('/api/instrument', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: blobResult.url,
          ...(stemLabels ? { labels: stemLabels } : {}),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'AI instrument detection failed');
      }

      const { results } = await response.json();
      if (!results || callId !== aiAbortRef.current) return;

      // Step 4: Map AI labels to our instrument categories
      const aiDetected = results
        .filter(r => r.score > 0.02)
        .map(r => ({
          instrument: AI_LABEL_MAP[r.label] || r.label,
          confidence: Math.round(r.score * 100),
          source: 'gemini',
          aiLabel: r.label,
        }))
        .slice(0, 6);

      if (aiDetected.length > 0) {
        const enhancedDetection = {
          ...heuristicDetection,
          detected: aiDetected,
          mlEnhanced: true,
          mlSource: 'gemini',
        };
        setDetectedInstruments(enhancedDetection);

        // Auto-update to the AI suggestion ONLY if it's confident enough
        // For stems with a known instrument mapping (bass→bass, drums→drums),
        // the stem mapping should take priority unless AI is very confident about something different
        const topAI = aiDetected[0];
        const heuristicTop = heuristicDetection.detected?.[0];
        const currentIsFromStemMap = isAnalyzingStem && stemType && { bass: 'bass', drums: 'drums', vocals: 'vocal' }[stemType];

        if (topAI?.instrument && topAI.instrument !== 'full' && reAnalyzeRef.current) {
          if (currentIsFromStemMap) {
            // For known stems: only override if AI is VERY confident (>60%) AND agrees it's a different category
            // This prevents Gemini from overriding a correct bass→bass mapping with "kick drum 35%"
            if (topAI.confidence > 60 && topAI.instrument !== currentIsFromStemMap) {
              reAnalyzeRef.current(topAI.instrument);
            } else if (topAI.instrument === currentIsFromStemMap) {
              // AI agrees with stem mapping — no change needed, recommendations already correct
            }
          } else {
            // For non-stems or 'other' stem: accept AI suggestion only if it's more confident
            // than the heuristic. This prevents AI from overriding a high-confidence heuristic
            // result (e.g., Pad 75%) with a lower-confidence AI guess.
            const heuristicConf = heuristicTop?.confidence || 0;
            if (topAI.confidence > 30 && topAI.confidence >= heuristicConf) {
              reAnalyzeRef.current(topAI.instrument);
            }
          }
        }
      }

      setAIDetectionStatus('done');
    } catch (err) {
      console.warn('AI detection failed, keeping heuristic results:', err);
      setAIDetectionStatus('error');
      // Heuristic results remain — no user-visible error
    }
  }, []);

  const runAnalysis = useCallback(async (stemTypeOverride) => {
    if (!audioFileData) {
      setError('Please upload or record audio first');
      return;
    }

    // Determine which stem we're analyzing — override takes precedence
    const effectiveStem = stemTypeOverride || selectedInstrument;

    setIsAnalyzing(true);
    setAnalyzingStemType(stemTypeOverride || null);
    setError(null);

    trackAnalysisStarted({
      regionStart: audio.loopEnabled ? audio.loopStart : undefined,
      regionEnd: audio.loopEnabled ? audio.loopEnd : undefined,
      stemType: stems && ['vocals', 'drums', 'bass', 'other'].includes(effectiveStem) ? effectiveStem : undefined,
    });

    // Determine which audio to analyze:
    // If a stem is selected and we have stems available, use the stem audio
    // Otherwise use the full track
    let audioToAnalyze = audioFileData;
    const stemTypes = ['vocals', 'drums', 'bass', 'other'];
    const isAnalyzingStem = stems && stemTypes.includes(effectiveStem);

    if (isAnalyzingStem) {
      if (stemAudioData[effectiveStem]) {
        audioToAnalyze = stemAudioData[effectiveStem];
      } else {
        const stemData = await getStemAudio(effectiveStem);
        if (stemData) {
          audioToAnalyze = stemData;
        } else {
          setError(`Failed to load ${effectiveStem} stem for analysis`);
          setIsAnalyzing(false);
          setAnalyzingStemType(null);
          return;
        }
      }
    }

    // Build analysis options — use stem-specific loop region if available, else full mix loop
    const analysisOptions = {};
    if (isAnalyzingStem && stemLoopRegions[effectiveStem]?.enabled) {
      const stemRegion = stemLoopRegions[effectiveStem];
      analysisOptions.regionStart = stemRegion.start;
      analysisOptions.regionEnd = stemRegion.end;
    } else if (audio.loopEnabled && audio.loopStart != null && audio.loopEnd != null) {
      analysisOptions.regionStart = audio.loopStart;
      analysisOptions.regionEnd = audio.loopEnd;
    }

    const result = await audio.analyzeAudio(audioToAnalyze, analysisOptions);

    if (result.error) {
      setError(result.error);
    } else {
      // Use instrument detection from the analysis result (region-based, more accurate)
      const instrumentDetection = result.instrumentDetection;

      // Update detected instruments state so UI shows them post-analysis
      if (instrumentDetection) {
        setDetectedInstruments(instrumentDetection);

        // Run AI detection (Gemini) in background — heuristic results show instantly,
        // AI refines asynchronously (~2-5s). If AI fails, heuristic results remain.
        runAIDetection(audioToAnalyze, isAnalyzingStem, analysisOptions, instrumentDetection, effectiveStem);
      }

      // Extract wavetable from audio in background (non-blocking)
      // Decodes audio → slices single-cycle waveforms → base64 encodes for Vital preset injection
      (async () => {
        try {
          const tempCtx = new AudioContext({ sampleRate: 48000 });
          try {
            const buffer = await tempCtx.decodeAudioData(audioToAnalyze.slice(0));
            let channelData = buffer.getChannelData(0);

            // If region selected, slice to that region
            if (analysisOptions.regionStart != null && analysisOptions.regionEnd != null) {
              const startSample = Math.floor(analysisOptions.regionStart * buffer.sampleRate);
              const endSample = Math.floor(analysisOptions.regionEnd * buffer.sampleRate);
              channelData = channelData.slice(startSample, endSample);
            }

            const wtResult = await audio.extractWavetable(channelData, buffer.sampleRate, 256);
            if (wtResult?.success) {
              setWavetableData(wtResult);
            }
          } finally {
            tempCtx.close();
          }
        } catch (err) {
          console.warn('Wavetable extraction failed (non-critical):', err.message);
        }
      })();

      // Smart instrument selection:
      // - For stems: auto-map stem type to instrument (bass→bass, drums→drums, vocals→vocal, other→top detection)
      // - For non-stem: use the top detected instrument as the smart default
      let instrumentToUse = effectiveStem;
      const stemToInstrumentMap = { bass: 'bass', drums: 'drums', vocals: 'vocal' };

      if (isAnalyzingStem && stemToInstrumentMap[effectiveStem]) {
        // Known stem type → map directly to instrument
        instrumentToUse = stemToInstrumentMap[effectiveStem];
      } else if (instrumentDetection?.detected?.length > 0) {
        // Use the top detected instrument as smart default
        instrumentToUse = instrumentDetection.detected[0].instrument;
      }

      // Update selectedInstrument state to the smart default
      setSelectedInstrument(instrumentToUse);

      const recommendations = generateInstrumentRecommendations(instrumentToUse, result.features, prefs.dawPreference);
      const newAnalysis = {
        features: result.features,
        recommendations,
        instrument: instrumentToUse,
        detectedInstruments: instrumentDetection,
        harmonics: result.harmonics,
        analyzedStem: isAnalyzingStem ? effectiveStem : null
      };
      setAnalysis(newAnalysis);

      // Mark Step 1 complete, auto-expand Step 2
      setCompletedSteps(new Set([1]));
      setExpandedSteps(new Set([2]));

      trackAnalysisCompleted({
        instrument: instrumentToUse,
        bpm: result.features.bpm?.bpm,
        key: result.features.key?.scale,
        waveformType: result.features.waveform?.type,
      });

      // Save to history
      {
        const isRegionAnalysis = analysisOptions.regionStart != null;
        // Strip any existing parenthetical suffix to prevent duplication
        // e.g. "Pumpin (bass)" → "Pumpin", "Pumpin (bass) (bass)" → "Pumpin"
        const baseTitle = (audioMetadata.title || 'Untitled').replace(/(\s*\([^)]*\))+$/, '').trim();
        let historyTitle = baseTitle;
        if (isAnalyzingStem) {
          historyTitle = `${baseTitle} (${effectiveStem})`;
        } else if (isRegionAnalysis) {
          historyTitle = `${baseTitle} (${audio.formatTime(analysisOptions.regionStart)}-${audio.formatTime(analysisOptions.regionEnd)})`;
        }
        addToHistory({
          id: Date.now().toString(),
          title: historyTitle,
          instrument: instrumentToUse,
          timestamp: Date.now(),
          features: result.features,
          recommendations,
          detectedInstruments: instrumentDetection,
          analyzedStem: isAnalyzingStem ? effectiveStem : null,
          regionStart: isRegionAnalysis ? analysisOptions.regionStart : null,
          regionEnd: isRegionAnalysis ? analysisOptions.regionEnd : null,
          // Persist URLs for session restore
          audioUrl: audioBlobUrl || null,
          audioFilename: audioMetadata.title || null,
          stemUrls: stems || null,
        });
      }
    }

    setIsAnalyzing(false);
    setAnalyzingStemType(null);
    toast.success('Analysis complete');
  }, [audioFileData, audio.analyzeAudio, audio.loopEnabled, audio.loopStart, audio.loopEnd, audio.formatTime, selectedInstrument, audioMetadata.title, addToHistory, stems, stemAudioData, getStemAudio, prefs.dawPreference, runAIDetection, audioBlobUrl, toast]);

  // Quick re-analyze: regenerate recommendations for a different instrument
  // without re-running the full DSP pipeline (audio region hasn't changed)
  const reAnalyzeWithInstrument = useCallback((instrument) => {
    if (!analysis) return;

    // If selecting a stem type, need full re-analysis (different audio data)
    const stemTypes = ['vocals', 'drums', 'bass', 'other'];
    if (stems && stemTypes.includes(instrument)) {
      setSelectedInstrument(instrument);
      // Let the user click the main Analyze button for stems
      return;
    }

    const recommendations = generateInstrumentRecommendations(instrument, analysis.features, prefs.dawPreference);
    setAnalysis(prev => ({
      ...prev,
      recommendations,
      instrument,
    }));
    setSelectedInstrument(instrument);
  }, [analysis, prefs.dawPreference, stems]);

  // Keep reAnalyze ref in sync for CLAP callback
  useEffect(() => {
    reAnalyzeRef.current = reAnalyzeWithInstrument;
  }, [reAnalyzeWithInstrument]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (audioFileData) {
            handleTogglePlayback();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          audio.skipTime(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          audio.skipTime(5);
          break;
        case 'KeyL':
          if (audio.loopStart !== null && audio.loopEnd !== null) {
            audio.setLoopEnabled(!audio.loopEnabled);
          }
          break;
        case 'Escape':
          handleClearLoop();
          break;
        case 'Enter':
          if (audioFileData && !isAnalyzing) {
            runAnalysis();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioFileData, audio.skipTime, audio.loopStart, audio.loopEnd, audio.loopEnabled, audio.setLoopEnabled, isAnalyzing, handleTogglePlayback, handleClearLoop, runAnalysis]);

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const ALLOWED_EXTENSIONS = ['wav', 'mp3', 'm4a'];
  const ALLOWED_MIME_TYPES = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a'];

  const isAllowedAudioFile = (file) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_MIME_TYPES.includes(file.type);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isAllowedAudioFile(file)) {
        processAudioFile(file);
      } else {
        toast.error('Unsupported format. Please upload a WAV, MP3, or M4A file.');
      }
    }
  };

  // Everything that must be cleared when a different piece of audio comes in
  const resetForNewAudio = () => {
    setError(null);
    setAnalysis(null);
    setWavetableData(null);
    setDetectedInstruments(null);
    audio.reset();
    handleClearLoop();
    clearStems(); // Clear any previous stems when new file is uploaded
    setPlayingStem(null);
    // Clear stem waveform state
    setActiveStemView(null);
    setStemWaveformPreview(null);
    stemWaveformHiResRef.current = null;
    stemWaveformColorRef.current = null;
    stemWaveformDataRef.current = {};
    setStemLoopRegions({});
    // Reset step flow
    setExpandedSteps(new Set([1]));
    setCompletedSteps(new Set());
  };

  const processAudioFile = (file) => {
    resetForNewAudio();
    const filename = file.name.replace(/\.[^/.]+$/, "");
    setAudioMetadata({ title: filename, artist: 'Unknown Artist', sourceFilename: file.name });

    const reader = new FileReader();
    reader.onload = (event) => {
      setAudioFileData(event.target.result);
    };
    reader.readAsArrayBuffer(file);

    trackAudioUpload(file.name, file.size);
  };

  // Track pulled in through the local helper (YouTube / SoundCloud → FLAC) with real metadata
  const handleImported = ({ arrayBuffer, meta }) => {
    resetForNewAudio();
    setAudioMetadata({
      title: meta.title || 'Untitled',
      artist: meta.artist || meta.uploader || 'Unknown Artist',
      sourceFilename: meta.filename || 'import.flac',
      thumbnailUrl: meta.thumbnailUrl || null,
      sourceUrl: meta.sourceUrl || null,
      source: meta.source || null,
    });
    setAudioFileData(arrayBuffer);
    trackAudioUpload(meta.filename || 'import.flac', arrayBuffer.byteLength);
    toast.success(`Loaded ${meta.artist ? `${meta.artist} — ` : ''}${meta.title}`);
  };

  // Demo sound handler — generates a synth chord via Web Audio API
  const handleLoadDemo = useCallback(async () => {
    if (isLoadingDemo) return;

    setIsLoadingDemo(true);
    setError(null);

    try {
      const wavBuffer = await generateDemoSound();
      setAudioMetadata({ title: 'Demo Synth Chord', artist: 'SoundSauce Demo' });
      setAudioFileData(wavBuffer);
      setAnalysis(null);
      setWavetableData(null);
      setDetectedInstruments(null);
      audio.reset();
      handleClearLoop();
      clearStems();
      setPlayingStem(null);
      setActiveStemView(null);
      setStemWaveformPreview(null);
      stemWaveformHiResRef.current = null;
      stemWaveformColorRef.current = null;
      stemWaveformDataRef.current = {};
      setStemLoopRegions({});

      trackAudioUpload('demo-synth.wav', 0);
    } catch (err) {
      toast.error('Failed to generate demo sound');
      console.warn('Demo sound generation failed:', err);
    } finally {
      setIsLoadingDemo(false);
    }
  }, [isLoadingDemo, audio.reset, handleClearLoop, clearStems]);

  // Stem separation handlers
  // Metadata used for stamped stem filenames + Remix Pack notes. Prefers the full
  // analysis when it exists, falls back to the quick post-decode detection.
  const stemMeta = React.useMemo(() => {
    const bpmInfo = analysis?.features?.bpm || trackInfo?.bpm || null;
    const keyInfo = analysis?.features?.key || trackInfo?.key || null;
    return {
      artist: audioMetadata.artist,
      title: audioMetadata.title,
      bpm: bpmInfo?.bpm ?? null,
      bpmConfidence: bpmInfo?.confidence ?? null,
      halfTempo: bpmInfo?.halfTempo ?? null,
      doubleTempo: bpmInfo?.doubleTempo ?? null,
      key: keyInfo ? { key: keyInfo.key, mode: keyInfo.mode, camelot: keyInfo.camelot, compatibleKeys: keyInfo.compatibleKeys } : null,
    };
  }, [analysis?.features?.bpm, analysis?.features?.key, trackInfo, audioMetadata.artist, audioMetadata.title]);

  const handleSeparateStems = useCallback(async ({ mode = 'vocals', quality = 'best' } = {}) => {
    if (!audioFileData) return;
    if (!isSignedIn) {
      setSignInReason('Stem separation runs on a paid GPU — unlock the lab first.');
      setShowSignIn(true);
      return;
    }

    // Preserve the real extension so the Blob upload gets the right MIME type
    const ext = (audioMetadata.sourceFilename || '').split('.').pop()?.toLowerCase();
    const safeExt = ['wav', 'mp3', 'm4a', 'flac'].includes(ext) ? ext : 'mp3';
    const filename = `${audioMetadata.title || 'audio'}.${safeExt}`;

    await separateStems(audioFileData, filename, { mode, quality, meta: stemMeta });
  }, [audioFileData, audioMetadata.title, audioMetadata.sourceFilename, separateStems, stemMeta, isSignedIn]);

  const handleDownloadPack = useCallback(async () => {
    const ok = await downloadRemixPack(stemMeta);
    if (ok) toast.success('Remix Pack downloaded');
  }, [downloadRemixPack, stemMeta, toast]);

  const handleKeepStem = useCallback((stemType) => keepStem(stemType, stemMeta), [keepStem, stemMeta]);
  const handleKeepAll = useCallback(() => keepAllStems(stemMeta), [keepAllStems, stemMeta]);

  const handleResetStems = useCallback(() => {
    clearStems();
    setActiveStemView(null);
    setPlayingStem(null);
  }, [clearStems]);

  const handlePlayStem = useCallback(async (stemType) => {
    if (!stems || !stems[stemType]) return;

    // If already playing this stem, toggle it off
    if (playingStem === stemType && audio.isPlaying) {
      // Toggle will stop playback since it's currently playing
      await audio.togglePlayback(stemAudioData[stemType]);
      setPlayingStem(null);
      return;
    }

    // Stop any current playback (without destroying waveform/duration via reset)
    if (audio.isPlaying) {
      // Toggle the current audio to stop it
      await audio.togglePlayback(audioFileData);
    }

    // Get the stem audio data (download if needed)
    let audioData = stemAudioData[stemType];
    if (!audioData) {
      audioData = await getStemAudio(stemType);
    }

    if (audioData) {
      setPlayingStem(stemType);
      const result = await audio.togglePlayback(audioData);
      if (result.error) {
        setError(result.error);
        setPlayingStem(null);
      }
    }
  }, [stems, stemAudioData, playingStem, audio, getStemAudio, audioFileData]);

  const handleDownloadStem = useCallback(async (stemType) => {
    if (!stems || !stems[stemType]) return;
    await downloadStemFile(stemType, stemMeta);
  }, [stems, downloadStemFile, stemMeta]);

  const handleSelectStem = useCallback(async (stemType) => {
    setSelectedInstrument(stemType);
    // Stop playing stem when selection changes
    if (playingStem && playingStem !== stemType && audio.isPlaying) {
      audio.reset();
      setPlayingStem(null);
    }
    // Activate stem waveform view
    const stemTypes = ['vocals', 'drums', 'bass', 'other'];
    if (stemTypes.includes(stemType)) {
      const stemData = await prepareStemWaveform(stemType);
      if (stemData) {
        setActiveStemView(stemType);
        setStemWaveformPreview(stemData.preview);
        stemWaveformHiResRef.current = stemData.hiRes;
        stemWaveformColorRef.current = stemData.colors;
      }
    } else {
      // Back to full mix
      setActiveStemView(null);
      setStemWaveformPreview(null);
      stemWaveformHiResRef.current = null;
      stemWaveformColorRef.current = null;
    }
  }, [playingStem, audio, prepareStemWaveform]);

  // Handle per-stem Analyze button click — activates stem waveform + runs analysis
  const handleAnalyzeStem = useCallback(async (stemType) => {
    // Switch waveform to show this stem (if not already)
    if (activeStemView !== stemType) {
      const stemData = await prepareStemWaveform(stemType);
      if (stemData) {
        setActiveStemView(stemType);
        setStemWaveformPreview(stemData.preview);
        stemWaveformHiResRef.current = stemData.hiRes;
        stemWaveformColorRef.current = stemData.colors;
      }
    }
    await runAnalysis(stemType);
  }, [runAnalysis, activeStemView, prepareStemWaveform]);

  // Scroll helpers for full-mix guidance
  const scrollToStems = useCallback(() => {
    stemSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const scrollToWaveform = useCallback(() => {
    waveformSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (isAllowedAudioFile(file)) {
        processAudioFile(file);
      } else {
        toast.error('Unsupported format. Please upload a WAV, MP3, or M4A file.');
      }
    }
  };

  // History functions
  const loadFromHistory = (item) => {
    // Restore just the analysis results (no audio/stems) — the Vault handles full restores
    setAnalysis({
      features: item.features,
      recommendations: item.recommendations,
      instrument: item.instrument
    });
    setSelectedInstrument(item.instrument);
    setDetectedInstruments(item.detectedInstruments || null);
    setAudioMetadata({ title: item.title, artist: 'From History' });
  };

  // Preset selection callback from PresetSelector (fires on select, NOT download)
  const handlePresetSelected = () => {
    trackPresetExported(selectedInstrument || 'lead');
  };

  // Preset download callback — fires only when user actually downloads a .vital file
  const handlePresetDownloaded = useCallback(() => {
    setCompletedSteps(prev => new Set([...prev, 2]));
    setExpandedSteps(prev => {
      const next = new Set(prev);
      next.add(3);
      return next;
    });
  }, []);

  // Step flow toggle handler
  const toggleStep = useCallback((stepNum) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepNum)) next.delete(stepNum);
      else next.add(stepNum);
      return next;
    });
  }, []);

  const copyToClipboard = async () => {
    if (!analysis) return;

    const features = analysis.features;
    const recommendations = analysis.recommendations;

    const text = `Audio Analysis: ${audioMetadata.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Features:
- RMS: ${features.rms}
- Brightness: ${features.brightness}
- Spectral Centroid: ${features.spectralCentroid} Hz
- Harmonicity: ${features.harmonicity}
- Attack: ${features.attackTime}ms
${features.bpm ? `- BPM: ${features.bpm.bpm}` : ''}
${features.key ? `- Key: ${features.key.scale}` : ''}

Synthesis Type:
${recommendations.synthType.map(r => '- ' + r).join('\n')}

Recommended VSTs:
${recommendations.vstSuggestions.map(r => '- ' + r).join('\n')}

DAW Instruments:
${recommendations.nativeInstruments.map(r => '- ' + r).join('\n')}

Oscillator:
${recommendations.oscillatorSettings.map(r => '- ' + r).join('\n')}

Filter:
${recommendations.filterSettings.map(r => '- ' + r).join('\n')}

Envelope:
${recommendations.envelopeSettings.map(r => '- ' + r).join('\n')}

EQ:
${recommendations.eqSettings.map(r => '- ' + r).join('\n')}

Effects:
${recommendations.effects.map(r => '- ' + r).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by SoundSauce`;

    await navigator.clipboard.writeText(text);
  };

  const buildShareData = useCallback(() => {
    if (!analysis) return { text: '', title: '', instrument: '' };

    const features = analysis.features;
    const title = audioMetadata.title || 'Untitled';
    const instrument = selectedInstrument !== 'full'
      ? instrumentLabels[selectedInstrument]?.label || selectedInstrument
      : '';

    // Top detected instrument with confidence
    const topInstrument = analysis.detectedInstruments?.[0];
    const detectedLine = topInstrument
      ? `Detected: ${instrumentLabels[topInstrument.instrument]?.label || topInstrument.instrument} (${topInstrument.confidence}%)`
      : '';

    const bpmVal = features.bpm?.bpm;
    const keyVal = features.key?.scale;
    const waveformVal = features.waveform?.type;
    const brightnessVal = typeof features.brightness === 'number'
      ? features.brightness.toFixed(2)
      : features.brightness;
    const attackVal = features.attackTime;

    const parts = [
      bpmVal ? `BPM: ${bpmVal}` : '',
      keyVal ? `Key: ${keyVal}` : '',
      waveformVal ? `Waveform: ${waveformVal}` : '',
    ].filter(Boolean).join(' | ');

    const details = [
      brightnessVal ? `Brightness: ${brightnessVal}` : '',
      attackVal ? `Attack: ${attackVal}ms` : '',
    ].filter(Boolean).join(' | ');

    const lines = [
      `Sound Analysis — ${title}${instrument ? ` (${instrument})` : ''}`,
      '',
      parts,
      details,
      detectedLine,
      '',
      'Analyzed with SoundSauce — soundsauce.app',
    ].filter(line => line !== undefined);

    return {
      text: lines.join('\n'),
      title: `Sound Analysis — ${title}`,
      instrument: selectedInstrument,
    };
  }, [analysis, audioMetadata.title, selectedInstrument]);

  const handleSeek = (e) => {
    if (!audio.audioBuffer || !audio.duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * audio.duration;

    audio.seek(newTime);
  };

  return (
    <div className={`${t.text} p-4 md:p-8`}>
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className={`rounded-xl p-5 mb-6 backdrop-blur ${
            theme === 'dark'
              ? 'bg-red-500/10 border border-red-500/50'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
              <div className="flex-1 min-w-0">
                <p className={`font-medium mb-1 ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
                {/* Recovery actions — shown when no audio is loaded (e.g. failed session restore) */}
                {!audioFileData && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => {
                        setError(null);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        theme === 'dark'
                          ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                          : 'bg-white text-stone-800 border border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      Start a New Analysis
                    </button>
                    <button
                      onClick={() => {
                        setError(null);
                        // Scroll to the upload area which is now visible after error is cleared
                        setTimeout(() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }, 50);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        theme === 'dark'
                          ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
                          : 'bg-ember-600 text-white hover:bg-ember-700'
                      }`}
                    >
                      <UploadCloud className="w-4 h-4" />
                      Upload Audio
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sound Analyzer */}
        <>
        {/* History Panel */}
        <HistoryPanel
          history={history}
          onLoad={loadFromHistory}
          onDelete={deleteFromHistory}
          onClearAll={clearHistory}
          theme={theme}
          isOpen={historyOpen}
          onToggle={toggleHistoryOpen}
        />

        {/* Paste a link / search — via the local helper */}
        <LinkImport helper={helper} onImported={handleImported} disabled={isLoadingDemo} theme={theme} t={t} />

        {/* Upload Section with Drag & Drop */}
        <AudioUploadSection
          isDragging={isDragging}
          onFileUpload={handleFileUpload}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onLoadDemo={handleLoadDemo}
          isLoadingDemo={isLoadingDemo}
          showWelcome={!audioFileData && !analysis}
          dropZoneRef={dropZoneRef}
          theme={theme}
          t={t}
        />

        {audioFileData && (
          <div className={`backdrop-blur-xl rounded-2xl p-6 mb-6 shadow-2xl border ${t.cardAlt}`}>
            {/* Audio Metadata Header — Signal Deck: artwork, Syne title, mono readout, spectrum chips */}
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
              {(stemMeta.bpm || stemMeta.key) && (
                <div className="hidden sm:flex items-center gap-2 font-mono text-[13px] tabular-nums" aria-label="Detected tempo and key">
                  {stemMeta.bpm && (
                    <span className={`px-2.5 py-1 rounded border ${theme === 'dark' ? 'bg-[#0D0F12] border-[#1C2027]' : 'bg-white border-[#D9DDE3]'}`} style={{ color: theme === 'dark' ? '#FACC15' : '#A16207' }}>
                      {stemMeta.bpm.toFixed(2)} BPM
                    </span>
                  )}
                  {stemMeta.key && (
                    <span className={`px-2.5 py-1 rounded border ${theme === 'dark' ? 'bg-[#0D0F12] border-[#1C2027]' : 'bg-white border-[#D9DDE3]'}`} style={{ color: theme === 'dark' ? '#3B82F6' : '#1D4ED8' }}>
                      {stemMeta.key.key.toUpperCase()} {stemMeta.key.mode === 'minor' ? 'MIN' : 'MAJ'}{stemMeta.key.camelot ? ` / ${stemMeta.key.camelot}` : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="rule-spectrum mb-6 opacity-80" aria-hidden="true" />

            {/* Waveform Display with Loop Selection — user browses & selects region first */}
            <div ref={waveformSectionRef} />
            {activeStemView && (
              <div className={`flex items-center justify-between px-3 py-2 mb-1 rounded-t-lg text-sm ${
                theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-amber-50/50 text-ember-600'
              }`}>
                <span className="font-medium">
                  Viewing: <span className="capitalize">{activeStemView}</span> stem
                </span>
                <button
                  onClick={() => {
                    setActiveStemView(null);
                    setStemWaveformPreview(null);
                    stemWaveformHiResRef.current = null;
                    stemWaveformColorRef.current = null;
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                      : 'hover:bg-amber-100 text-zinc-500 hover:text-ember-600'
                  }`}
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to Full Mix
                </button>
              </div>
            )}
            <WaveformVisualizer
              waveformData={activeStemView ? stemWaveformPreview : audio.waveformData}
              waveformHiResRef={activeStemView ? stemWaveformHiResRef : audio.waveformHiResRef}
              waveformColorRef={activeStemView ? stemWaveformColorRef : audio.waveformColorRef}
              duration={activeStemView && stemWaveformDataRef.current[activeStemView] ? stemWaveformDataRef.current[activeStemView].duration : audio.duration}
              playbackTime={audio.playbackTime}
              playbackTimeRef={audio.playbackTimeRef}
              loopStart={activeStemView ? (stemLoopRegions[activeStemView]?.start ?? null) : audio.loopStart}
              loopEnd={activeStemView ? (stemLoopRegions[activeStemView]?.end ?? null) : audio.loopEnd}
              loopEnabled={activeStemView ? (stemLoopRegions[activeStemView]?.enabled ?? false) : audio.loopEnabled}
              onToggleLoop={handleToggleViewLoop}
              onClearLoop={handleClearViewLoop}
              onSeek={handleWaveformSeek}
              onLoopRegionChange={handleViewLoopRegionChange}
              formatTime={audio.formatTime}
              theme={theme}
              t={t}
            />

            {/* Spectrum Visualizer — only show when playing */}
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

            {/* Playback Controls */}
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

            {/* Action Area — adapts based on audio length and stem state */}
            <div ref={analyzeSectionRef}>
            {/* Analyze button — always visible */}
            <AnalyzeSection
              loopEnabled={activeStemView ? (stemLoopRegions[activeStemView]?.enabled ?? false) : audio.loopEnabled}
              loopStart={activeStemView ? (stemLoopRegions[activeStemView]?.start ?? null) : audio.loopStart}
              loopEnd={activeStemView ? (stemLoopRegions[activeStemView]?.end ?? null) : audio.loopEnd}
              formatTime={audio.formatTime}
              isAnalyzing={isAnalyzing}
              onAnalyze={activeStemView ? () => runAnalysis(activeStemView) : runAnalysis}
              theme={theme}
            />

            {/* Stem separation — always visible for non-short audio */}
            {audio.duration > 15 && (
              <div className="mb-6" ref={stemSectionRef}>
                <StemSelector
                  stems={stems}
                  stemAudioData={stemAudioData}
                  separationStatus={separationStatus}
                  separationProgress={separationProgress}
                  separationError={separationError}
                  selectedStem={selectedInstrument}
                  onSelectStem={handleSelectStem}
                  playingStem={playingStem}
                  onAnalyzeStem={handleAnalyzeStem}
                  analyzingStem={analyzingStemType}
                  analyzedStem={analysis?.analyzedStem || null}
                  stemTypes={stemTypes}
                  mode={separationMode}
                  keepStatus={keepStatus}
                  onSeparate={handleSeparateStems}
                  onPlayStem={handlePlayStem}
                  onDownloadStem={handleDownloadStem}
                  onDownloadPack={handleDownloadPack}
                  onKeepStem={handleKeepStem}
                  onKeepAll={handleKeepAll}
                  onReset={handleResetStems}
                  onCancel={cancelSeparation}
                  spectrumDataRef={audio.spectrumDataRef}
                  hasAudio={!!audioFileData}
                  theme={theme}
                  t={t}
                />
              </div>
            )}
            </div>

            {/* Detected Instruments — shown AFTER analysis (non-compact, outside step flow) */}
            {detectedInstruments && analysis && (() => {
              const analyzedFullTrack = !analysis.analyzedStem && !(audio.loopEnabled && audio.loopStart != null);
              const isLongAudio = audio.duration > 10;
              const multipleInstruments = (detectedInstruments.instrumentsAboveThreshold || 0) >= 3;
              const shouldShowMixGuidance = isLongAudio && (detectedInstruments.isFullMix || (analyzedFullTrack && multipleInstruments));

              // Only show standalone InstrumentSelector when mix guidance is needed
              // Otherwise, the compact version lives inside Step 1
              if (!shouldShowMixGuidance) return null;

              return (
              <InstrumentSelector
                detectedInstruments={{ ...detectedInstruments, isFullMix: shouldShowMixGuidance }}
                selectedInstrument={selectedInstrument}
                onSelectInstrument={reAnalyzeWithInstrument}
                instrumentLabels={instrumentLabels}
                theme={theme}
                t={t}
                onSeparateStems={scrollToStems}
                onSelectRegion={scrollToWaveform}
                hasStemsReady={stems !== null}
                aiDetectionStatus={aiDetectionStatus}
              />
              );
            })()}
          </div>
        )}

        {/* ===== GUIDED STEP FLOW — post-analysis ===== */}
        {analysis && (
          <div className="space-y-4">
            {/* Copy Button */}
            <ExportToolbar
              onCopy={copyToClipboard}
              onShare={buildShareData}
              theme={theme}
            />

            <div ref={resultsSectionRef} />

            <AnalysisStepFlow
              completedSteps={completedSteps}
              expandedSteps={expandedSteps}
              toggleStep={toggleStep}
              theme={theme}
              t={t}
              analysis={analysis}
              detectedInstruments={detectedInstruments}
              selectedInstrument={selectedInstrument}
              audio={audio}
              audioFileData={audioFileData}
              audioMetadata={audioMetadata}
              wavetableData={wavetableData}
              stems={stems}
              aiDetectionStatus={aiDetectionStatus}
              dawPreference={prefs.dawPreference}
              reAnalyzeWithInstrument={reAnalyzeWithInstrument}
              scrollToStems={scrollToStems}
              scrollToWaveform={scrollToWaveform}
              handlePresetSelected={handlePresetSelected}
              handlePresetDownloaded={handlePresetDownloaded}
            />
          </div>
        )}
        </>

        {/* Lab sign-in — opened when a gated action (stem separation) is attempted while locked */}
        <LabSignIn
          isOpen={showSignIn}
          onClose={() => { setShowSignIn(false); setSignInReason(null); }}
          theme={theme}
          reason={signInReason}
        />

        {/* Floating Analyze CTA — appears when main AnalyzeSection scrolls out of view */}
        {audioFileData && !analysis && showFloatingAnalyze && (
          (() => {
            const viewLoopEnabled = activeStemView ? (stemLoopRegions[activeStemView]?.enabled ?? false) : audio.loopEnabled;
            const viewLoopStart = activeStemView ? (stemLoopRegions[activeStemView]?.start ?? null) : audio.loopStart;
            const viewLoopEnd = activeStemView ? (stemLoopRegions[activeStemView]?.end ?? null) : audio.loopEnd;
            const hasRegion = viewLoopEnabled && viewLoopStart != null && viewLoopEnd != null;
            const regionDuration = hasRegion ? (viewLoopEnd - viewLoopStart).toFixed(1) : null;

            return (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
                <button
                  onClick={() => runAnalysis(activeStemView || undefined)}
                  disabled={isAnalyzing}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold shadow-lg transition-all ${
                    theme === 'dark'
                      ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600 shadow-ember-500/30'
                      : 'bg-ember-600 text-white hover:bg-ember-700 shadow-ember-600/30'
                  } backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : hasRegion ? (
                    <Scissors className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isAnalyzing ? 'Analyzing...' : hasRegion ? `Analyze Selection (${regionDuration}s)` : 'Analyze'}
                </button>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
