import React, { useState, useRef, useEffect, useCallback } from 'react';

// Hooks
import { useAudioProcessor, useHistory, useStemSeparation, useSubscription, usePageTitle, useDownloadedPresets } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { upload } from '@vercel/blob/client';

// Components
import { UpgradePrompt } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { AuthModal } from '../components/auth';
import { useSearchParams } from 'react-router-dom';
import { HistoryPanel } from '../components/history';
import { SpectrumAnalyzer, PlaybackControls, WaveformVisualizer, AudioUploadSection, InstrumentSelector, AnalyzeSection, StemSelector, PresetSelector } from '../components/audio';
import { Music, Zap, UserPlus, Scissors, Sparkles, Loader2, ArrowLeft, BarChart3, AlertTriangle, UploadCloud } from 'lucide-react';
import { AnalysisStepFlow } from '../components/analysis';
import { ExportToolbar } from '../components/comparison';

// Utils
import { instrumentLabels } from '../utils/constants';
import { generateInstrumentRecommendations } from '../utils/recommendations';
import { generateDemoSound, audioBufferToWav } from '../utils/demoSoundGenerator';

// Analytics
import { trackAudioUpload, trackAnalysisStarted, trackAnalysisCompleted, trackPresetExported, trackUsageBarShown, trackSavePromptShown, trackSavePromptConverted, trackSavePromptDismissed } from '../lib/posthog';


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
  const { user, profile, tier } = useAuth();
  const audio = useAudioProcessor();
  const subscription = useSubscription();
  const { toast } = useToast();
  const {
    history,
    isOpen: historyOpen,
    toggleOpen: toggleHistoryOpen,
    addToHistory,
    deleteFromHistory,
    clearHistory,
    togglePublic,
    publishRecipe,
  } = useHistory();
  // Stem separation hook
  const {
    stems,
    stemAudioData,
    blobUrl: audioBlobUrl,
    status: separationStatus,
    progress: separationProgress,
    error: separationError,
    separateStems,
    restoreStems,
    getStemAudio,
    clearStems,
    cancelSeparation
  } = useStemSeparation();

  // URL params for session restore
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // UI state
  const [audioFileData, setAudioFileData] = useState(null);
  const [audioMetadata, setAudioMetadata] = useState({ title: '', artist: '' });
  usePageTitle('Analyze', audioMetadata.title || undefined);
  const { hasDownloadedPreset, trackCuratedDownload } = useDownloadedPresets();
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
  const [upgradePrompt, setUpgradePrompt] = useState({ isOpen: false, feature: null, used: 0, limit: 0 });
  const [dismissedSavePrompt, setDismissedSavePrompt] = useState(false);

  // Step flow state — guided post-analysis experience
  const [expandedSteps, setExpandedSteps] = useState(new Set([1])); // Step 1 auto-expanded
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authContext, setAuthContext] = useState(null);
  const pendingPresetDownloadRef = useRef(false);

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

  /**
   * Load a saved analysis session by ID from Supabase.
   * Restores: analysis results, metadata, audio waveform, and stems.
   * @param {string} analysisId - Supabase UUID of the analysis row
   */
  const loadAnalysis = useCallback(async (analysisId) => {
    if (!analysisId) return;

    setIsLoadingSession(true);
    setError(null);

    try {
      const { data: row, error: fetchError } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (fetchError || !row) {
        console.error('Failed to load analysis:', fetchError);
        setError('Could not load analysis. It may have been deleted.');
        setIsLoadingSession(false);
        return;
      }

      // 1. Restore analysis results + metadata
      const features = row.results?.features || {};
      const recommendations = row.results?.recommendations || {};
      const detectedInsts = row.results?.detectedInstruments || {};

      setAnalysis({ features, recommendations, instrument: row.instrument });
      setSelectedInstrument(row.instrument || 'full');
      setDetectedInstruments(detectedInsts);
      setAudioMetadata({ title: row.title || 'Untitled', artist: 'Restored session' });

      // 2. Restore audio waveform if audio_url exists (Vercel Blob — persists indefinitely)
      if (row.audio_url) {
        try {
          const audioResponse = await fetch(row.audio_url);
          if (audioResponse.ok) {
            const arrayBuffer = await audioResponse.arrayBuffer();
            setAudioFileData(arrayBuffer);
            // prepareAudioBuffer will fire via the existing useEffect when audioFileData changes
          } else {
            console.warn('Audio URL fetch failed:', audioResponse.status);
          }
        } catch (audioErr) {
          console.warn('Failed to fetch saved audio:', audioErr);
        }
      }

      // 3. Restore stems if stem_urls exist (Replicate CDN — may be expired)
      if (row.stem_urls) {
        restoreStems(row.stem_urls, row.audio_url);
      }

      // 4. Clear the ?id param so refreshing doesn't re-trigger load
      setSearchParams({}, { replace: true });
    } catch (err) {
      console.error('Error loading analysis session:', err);
      setError('Failed to restore analysis session.');
    } finally {
      setIsLoadingSession(false);
    }
  }, [restoreStems, setSearchParams]);

  // On mount: check for ?id= URL param and load the saved analysis
  const loadAnalysisRef = useRef(loadAnalysis);
  useEffect(() => {
    loadAnalysisRef.current = loadAnalysis;
  }, [loadAnalysis]);

  const lastLoadedIdRef = useRef(null);
  useEffect(() => {
    const analysisId = searchParams.get('id');
    if (analysisId && analysisId !== lastLoadedIdRef.current) {
      lastLoadedIdRef.current = analysisId;
      loadAnalysisRef.current(analysisId);
    }
  }, [searchParams]);

  // Track nudges shown
  const usageBarTrackedRef = useRef(false);
  const savePromptTrackedRef = useRef(false);
  useEffect(() => {
    if (!analysis) return;
    if (user && tier === 'free' && subscription.usage && !usageBarTrackedRef.current) {
      usageBarTrackedRef.current = true;
      trackUsageBarShown(subscription.usage.analyses_count, subscription.limits.analyses);
    }
    if (!user && !dismissedSavePrompt && !savePromptTrackedRef.current) {
      savePromptTrackedRef.current = true;
      trackSavePromptShown();
    }
  }, [analysis, user, tier, subscription.usage, subscription.limits, dismissedSavePrompt]);

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

      const stemData = { preview, hiRes: null, duration: buffer.duration };

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

      return stemData;
    } finally {
      tempCtx.close();
    }
  }, [stemAudioData, getStemAudio, audio.generateWaveform, audio.generateWaveformData]);

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
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

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

    // Check analysis limit before proceeding
    if (!subscription.canAnalyze()) {
      setUpgradePrompt({
        isOpen: true,
        feature: 'analyses',
        used: subscription.usage?.analyses_count || 0,
        limit: subscription.limits?.analyses || 10,
      });
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

      const recommendations = generateInstrumentRecommendations(instrumentToUse, result.features, profile?.daw_preference);
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

      // Increment usage counter after successful analysis
      if (subscription.incrementAnalyses) {
        subscription.incrementAnalyses();
      }

      // Save to history (check storage limit first)
      if (subscription.canSaveAnalysis()) {
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
  }, [audioFileData, audio.analyzeAudio, audio.loopEnabled, audio.loopStart, audio.loopEnd, audio.formatTime, selectedInstrument, audioMetadata.title, addToHistory, stems, stemAudioData, getStemAudio, profile?.daw_preference, subscription.canAnalyze, subscription.incrementAnalyses, runAIDetection, audioBlobUrl, toast]);

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

    const recommendations = generateInstrumentRecommendations(instrument, analysis.features, profile?.daw_preference);
    setAnalysis(prev => ({
      ...prev,
      recommendations,
      instrument,
    }));
    setSelectedInstrument(instrument);
  }, [analysis, profile?.daw_preference, stems]);

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

  const processAudioFile = (file) => {
    setError(null);
    const filename = file.name.replace(/\.[^/.]+$/, "");
    setAudioMetadata({ title: filename, artist: 'Unknown Artist' });

    const reader = new FileReader();
    reader.onload = (event) => {
      setAudioFileData(event.target.result);
    };
    reader.readAsArrayBuffer(file);

    trackAudioUpload(file.name, file.size);

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
    stemWaveformDataRef.current = {};
    setStemLoopRegions({});
    // Reset step flow
    setExpandedSteps(new Set([1]));
    setCompletedSteps(new Set());
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
  const handleSeparateStems = useCallback(async () => {
    if (!audioFileData) return;

    // Check stem separation limit
    if (!subscription.canSeparateStems()) {
      setUpgradePrompt({
        isOpen: true,
        feature: 'stems',
        used: subscription.usage?.stems_count || 0,
        limit: subscription.limits?.stems || 2,
      });
      return;
    }

    const filename = audioMetadata.title ? `${audioMetadata.title}.mp3` : 'audio.mp3';
    await separateStems(audioFileData, filename);

    // Increment stem usage after starting separation
    if (subscription.incrementStems) {
      subscription.incrementStems();
    }
  }, [audioFileData, audioMetadata.title, separateStems, subscription.canSeparateStems, subscription.incrementStems]);

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

    // Open the stem URL in a new tab or trigger download
    const url = stems[stemType];
    const a = document.createElement('a');
    a.href = url;
    a.download = `${audioMetadata.title || 'stem'}_${stemType}.mp3`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [stems, audioMetadata.title]);

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
      }
    } else {
      // Back to full mix
      setActiveStemView(null);
      setStemWaveformPreview(null);
      stemWaveformHiResRef.current = null;
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
    // For cloud items with audio/stem URLs, do a full session restore via URL param
    if (item.isCloud && item.id && (item.audioUrl || item.stemUrls)) {
      setSearchParams({ id: item.id });
      loadAnalysis(item.id);
      return;
    }

    // Fallback: restore just the analysis results (no audio/stems)
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
      `Sound Analysis — ${title}`,
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
                        setSearchParams({}, { replace: true });
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
                        setSearchParams({}, { replace: true });
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

        {/* Session restore loading */}
        {isLoadingSession && (
          <div className={`${t.card} p-8 mb-6 flex flex-col items-center justify-center gap-3`}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme === 'dark' ? '#F59E0B' : '#D97706' }} />
            <p className={`text-sm ${t.textMuted}`}>Restoring your analysis session...</p>
          </div>
        )}

        {/* Sound Analyzer */}
        <>
        {/* Persistent Free Tier Usage Banner — shown to signed-in free users on every visit */}
        {user && tier === 'free' && subscription.usage && !analysis && (
          <div className={`flex items-center gap-3 px-4 py-3 mb-4 rounded-lg text-sm ${
            theme === 'dark' ? 'bg-zinc-900 border border-zinc-800' : 'bg-amber-50/50 border border-amber-200/50'
          }`}>
            <Zap className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`} />
            <span className={t.textMuted}>
              <span className={`font-semibold ${t.text}`}>{subscription.analysesRemaining}</span> {subscription.analysesRemaining === 1 ? 'analysis' : 'analyses'} remaining this month
            </span>
            <Link
              to="/pricing"
              className={`ml-auto flex items-center gap-1 font-medium text-xs whitespace-nowrap ${
                theme === 'dark' ? 'text-ember-500 hover:text-white' : 'text-ember-600 hover:text-ember-700'
              }`}
            >
              Go unlimited
            </Link>
          </div>
        )}

        {/* History Panel */}
        <HistoryPanel
          history={history}
          onLoad={loadFromHistory}
          onDelete={deleteFromHistory}
          onClearAll={clearHistory}
          onTogglePublic={togglePublic}
          onPublish={async (id, data) => {
            // Check publish limit
            if (!subscription.canPublish()) {
              setUpgradePrompt({
                isOpen: true,
                feature: 'publishes',
                used: subscription.usage?.publishes_count || 0,
                limit: subscription.limits?.publishes || 3,
              });
              return false;
            }
            const success = await publishRecipe(id, data);
            if (success && subscription.incrementPublishes) {
              subscription.incrementPublishes();
            }
            return success;
          }}
          freeTierPublishLabel={user && tier === 'free' ? `${subscription.publishesRemaining}/${subscription.limits.publishes} free` : null}
          theme={theme}
          isOpen={historyOpen}
          onToggle={toggleHistoryOpen}
        />

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
            {/* Audio Metadata Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 flex items-center justify-center rounded-lg ${
                theme === 'dark' ? 'bg-zinc-800' : 'bg-gradient-to-br from-ember-500 to-amber-600'
              }`}>
                <Music className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className={`text-xl font-bold ${t.text} mb-1`}>{audioMetadata.title}</h3>
                <p className={t.textMuted}>{audioMetadata.artist}</p>
              </div>
            </div>

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
                  onSeparate={handleSeparateStems}
                  onPlayStem={handlePlayStem}
                  onDownloadStem={handleDownloadStem}
                  onCancel={cancelSeparation}
                  hasAudio={!!audioFileData}
                  freeTierLabel={user && tier === 'free' ? `${subscription.stemsRemaining}/${subscription.limits.stems} free` : null}
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
            {/* Usage Progress Bar — free tier only */}
            {user && tier === 'free' && subscription.usage && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${
                theme === 'dark' ? 'bg-zinc-900 border border-zinc-800' : 'bg-amber-50/50 border border-amber-200/50'
              }`}>
                <div className="flex-1">
                  <div className={`flex items-center justify-between mb-1.5 ${t.textMuted}`}>
                    <span>{subscription.usage.analyses_count}/{subscription.limits.analyses} analyses used</span>
                    <Link
                      to="/pricing"
                      className={`flex items-center gap-1 font-medium ${
                        theme === 'dark' ? 'text-ember-500 hover:text-white' : 'text-ember-600 hover:text-ember-700'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Upgrade
                    </Link>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${
                    theme === 'dark' ? 'bg-zinc-800' : 'bg-amber-100'
                  }`}>
                    <div
                      className={`h-full rounded-full transition-all ${
                        theme === 'dark' ? 'bg-white' : 'bg-gradient-to-r from-ember-500 to-amber-600'
                      }`}
                      style={{ width: `${Math.min(100, (subscription.usage.analyses_count / subscription.limits.analyses) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

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
              user={user}
              profile={profile}
              reAnalyzeWithInstrument={reAnalyzeWithInstrument}
              scrollToStems={scrollToStems}
              scrollToWaveform={scrollToWaveform}
              handlePresetSelected={handlePresetSelected}
              handlePresetDownloaded={handlePresetDownloaded}
              hasDownloadedPreset={hasDownloadedPreset}
              trackCuratedDownload={trackCuratedDownload}
              setAuthContext={setAuthContext}
              setShowAuthModal={setShowAuthModal}
              pendingPresetDownloadRef={pendingPresetDownloadRef}
              dismissedSavePrompt={dismissedSavePrompt}
              setDismissedSavePrompt={setDismissedSavePrompt}
            />
          </div>
        )}
        </>

        {/* Upgrade Prompt Modal */}
        <UpgradePrompt
          isOpen={upgradePrompt.isOpen}
          onClose={() => setUpgradePrompt(prev => ({ ...prev, isOpen: false }))}
          feature={upgradePrompt.feature}
          used={upgradePrompt.used}
          limit={upgradePrompt.limit}
          onUpgrade={(priceId) => {
            setUpgradePrompt(prev => ({ ...prev, isOpen: false }));
            if (subscription.startCheckout) subscription.startCheckout(priceId);
          }}
          theme={theme}
          t={t}
        />

        {/* Auth Modal — triggered by guest save/download prompt */}
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => {
              setShowAuthModal(false);
              setAuthContext(null);
            }}
            theme={theme}
            context={authContext}
          />
        )}

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
