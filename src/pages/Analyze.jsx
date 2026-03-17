import React, { useState, useRef, useEffect, useCallback } from 'react';

// Hooks
import { useAudioProcessor, useHistory, useStemSeparation, useSubscription, usePageTitle, useDownloadedPresets } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { upload } from '@vercel/blob/client';

// Components
import { Tooltip, UpgradePrompt } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { AuthModal } from '../components/auth';
import { Link, useSearchParams } from 'react-router-dom';
import { HistoryPanel } from '../components/history';
import { SpectrumAnalyzer, PlaybackControls, WaveformVisualizer, AudioUploadSection, InstrumentSelector, AnalyzeSection, StemSelector, PresetSelector } from '../components/audio';
import { Music, Zap, UserPlus, Scissors, Sparkles, Loader2, ArrowLeft, Sliders, Settings, Compass, Download, ArrowRight, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import { ADSREnvelope, ResultsTabs, SoundSauce, VitalGuide, QuickCompare } from '../components/analysis';
import { getDAWRecipe } from '../data/dawPlugins';
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
 * Collapsible accordion for DAW-specific settings (Synthesis Type, VSTs, EQ, Effects).
 * Oscillator/Filter/Envelope/Modulation are intentionally omitted — VitalGuide covers those.
 */
function DAWSettingsAccordion({ analysis, theme, t }) {
  const [openSections, setOpenSections] = useState({});
  const isDark = theme === 'dark';

  if (!analysis?.recommendations) return null;

  const { synthType, vstSuggestions, nativeInstruments, eqSettings, effects } = analysis.recommendations;

  const toggle = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const sections = [
    { key: 'synth', label: 'Synthesis Type', items: synthType },
    { key: 'vst', label: 'Recommended VSTs & DAW Instruments', items: [...(vstSuggestions || []), ...(nativeInstruments || [])] },
    { key: 'eq', label: 'EQ Settings', items: eqSettings },
    { key: 'fx', label: 'Effects Chain', items: effects },
  ].filter(s => s.items?.length > 0);

  if (sections.length === 0) return null;

  return (
    <div className="mt-6 space-y-2">
      <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${t.textDimmed}`}>
        Detailed Settings
      </h3>
      {sections.map(({ key, label, items }) => {
        const isOpen = !!openSections[key];
        return (
          <div key={key} className={`border rounded-lg overflow-hidden ${isDark ? 'border-zinc-800' : 'border-stone-200'}`}>
            <button
              onClick={() => toggle(key)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors ${
                isDark
                  ? 'hover:bg-white/[0.03] text-zinc-200'
                  : 'hover:bg-stone-50 text-stone-700'
              }`}
            >
              {label}
              {isOpen
                ? <ChevronUp className={`w-4 h-4 ${t.textDimmed}`} />
                : <ChevronDown className={`w-4 h-4 ${t.textDimmed}`} />
              }
            </button>
            {isOpen && (
              <div className={`px-4 pb-4 ${isDark ? 'bg-zinc-900/50' : 'bg-stone-50/50'}`}>
                <ul className="space-y-1.5">
                  {items.map((item, i) => (
                    <li key={i} className={`text-sm flex items-start gap-2 ${t.textMuted}`}>
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDark ? 'bg-ember-500/60' : 'bg-ember-600/60'}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Refs
  const dropZoneRef = useRef(null);
  const stemSectionRef = useRef(null);
  const waveformSectionRef = useRef(null);
  const resultsSectionRef = useRef(null);

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

  // Handlers that wrap audio processor methods (declared before useEffect that uses them)
  const handleTogglePlayback = useCallback(async () => {
    // Clear stem playback state when user uses main play button
    if (playingStem) {
      setPlayingStem(null);
    }
    const result = await audio.togglePlayback(audioFileData);
    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
    }
  }, [audio.togglePlayback, audioFileData, playingStem]);

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
        let historyTitle = audioMetadata.title;
        if (isAnalyzingStem) {
          historyTitle = `${audioMetadata.title} (${effectiveStem})`;
        } else if (isRegionAnalysis) {
          historyTitle = `${audioMetadata.title} (${audio.formatTime(analysisOptions.regionStart)}-${audio.formatTime(analysisOptions.regionEnd)})`;
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
  }, [audioFileData, audio.analyzeAudio, audio.loopEnabled, audio.loopStart, audio.loopEnd, audio.formatTime, selectedInstrument, audioMetadata.title, addToHistory, stems, stemAudioData, getStemAudio, profile?.daw_preference, subscription.canAnalyze, subscription.incrementAnalyses, runAIDetection, audioBlobUrl]);

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

  // Preset selection callback from PresetSelector
  const handlePresetSelected = () => {
    trackPresetExported(selectedInstrument || 'lead');
  };

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
          <div className={`rounded-xl p-4 mb-6 backdrop-blur ${
            theme === 'dark'
              ? 'bg-red-500/10 border border-red-500/50'
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className={theme === 'dark' ? 'text-red-300' : 'text-red-700'}>{error}</p>
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

            {/* Spectrum Visualizer */}
            <SpectrumAnalyzer
              spectrumData={audio.spectrumData}
              brightness={audio.brightness}
              isPlaying={audio.isPlaying}
              loopEnabled={audio.loopEnabled}
              theme={theme}
              t={t}
            />

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
            {(() => {
              const hasStems = stems !== null;
              const isProcessing = separationStatus === 'uploading' || separationStatus === 'processing';
              const isShortAudio = audio.duration <= 15;
              const viewLoopEnabled = activeStemView ? (stemLoopRegions[activeStemView]?.enabled ?? false) : audio.loopEnabled;
              const viewLoopStart = activeStemView ? (stemLoopRegions[activeStemView]?.start ?? null) : audio.loopStart;
              const viewLoopEnd = activeStemView ? (stemLoopRegions[activeStemView]?.end ?? null) : audio.loopEnd;
              const hasLoopRegion = viewLoopEnabled && viewLoopStart != null && viewLoopEnd != null;

              // Short audio or loop region selected: show AnalyzeSection directly
              if ((isShortAudio || hasLoopRegion) && !hasStems && !isProcessing) {
                return (
                  <>
                    <AnalyzeSection
                      loopEnabled={viewLoopEnabled}
                      loopStart={viewLoopStart}
                      loopEnd={viewLoopEnd}
                      formatTime={audio.formatTime}
                      isAnalyzing={isAnalyzing}
                      onAnalyze={runAnalysis}
                      theme={theme}
                    />
                    {!isShortAudio && (
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
                  </>
                );
              }

              // Long audio, no stems yet, not processing: stem-first guidance
              if (!hasStems && !isProcessing) {
                return (
                  <div className="mb-6" ref={stemSectionRef}>
                    <div className={`p-5 ${t.card}`}>
                      <div className="mb-4">
                        <h4 className={`font-semibold text-lg ${t.text}`}>How would you like to analyze?</h4>
                        <p className={`text-sm mt-1 ${t.textMuted}`}>
                          For best results with full songs, separate stems first to isolate individual instruments.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Primary CTA: Separate Stems */}
                        <button
                          onClick={handleSeparateStems}
                          disabled={!audioFileData}
                          className={`flex items-center gap-3 p-4 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            theme === 'dark'
                              ? 'bg-white text-black hover:bg-stone-200'
                              : 'bg-gradient-to-r from-ember-500 to-amber-600 text-white hover:opacity-90 shadow-lg shadow-ember-500/20'
                          }`}
                        >
                          <div className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${
                            theme === 'dark' ? 'bg-black/10' : 'bg-white/20'
                          }`}>
                            <Scissors className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              Separate Stems
                              {user && tier === 'free' && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                  theme === 'dark' ? 'bg-black/20' : 'bg-white/30'
                                }`}>
                                  <Zap className="w-3 h-3 inline mr-0.5" />
                                  {subscription.stemsRemaining}/{subscription.limits.stems}
                                </span>
                              )}
                            </div>
                            <div className={`text-sm ${theme === 'dark' ? 'text-black/60' : 'text-white/80'}`}>
                              Isolate vocals, drums, bass, and other
                            </div>
                          </div>
                        </button>

                        {/* Secondary CTA: Analyze Full Track */}
                        <button
                          onClick={() => runAnalysis()}
                          disabled={isAnalyzing}
                          className={`flex items-center gap-3 p-4 rounded-lg text-left transition-colors ${
                            theme === 'dark'
                              ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                              : 'bg-stone-100 hover:bg-stone-200 text-black'
                          }`}
                        >
                          <div className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${
                            theme === 'dark' ? 'bg-zinc-700' : 'bg-stone-200'
                          }`}>
                            {isAnalyzing ? (
                              <Loader2 className={`w-5 h-5 animate-spin ${theme === 'dark' ? 'text-white' : 'text-black'}`} />
                            ) : (
                              <Sparkles className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-black'}`} />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold">{isAnalyzing ? 'Analyzing...' : 'Analyze Full Track'}</div>
                            <div className={`text-sm ${t.textMuted}`}>
                              Quick analysis of the entire mix
                            </div>
                          </div>
                        </button>
                      </div>

                      {separationError && (
                        <div className={`mt-3 p-3 rounded-md ${theme === 'dark' ? 'bg-red-950' : 'bg-red-50'}`}>
                          <p className="text-sm text-red-500">{separationError}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Stems processing or ready: show StemSelector (with per-stem Analyze buttons when ready)
              return (
                <>
                {activeStemView && hasLoopRegion && (
                  <AnalyzeSection
                    loopEnabled={viewLoopEnabled}
                    loopStart={viewLoopStart}
                    loopEnd={viewLoopEnd}
                    formatTime={audio.formatTime}
                    isAnalyzing={isAnalyzing}
                    onAnalyze={() => runAnalysis(activeStemView)}
                    theme={theme}
                  />
                )}
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
                </>
              );
            })()}

            {/* Detected Instruments — shown AFTER analysis */}
            {detectedInstruments && analysis && (() => {
              // Determine if we should show full-mix guidance.
              // Short audio (≤10s) is NEVER flagged as full mix — a 3-second synth chord is not a mix.
              const analyzedFullTrack = !analysis.analyzedStem && !(audio.loopEnabled && audio.loopStart != null);
              const isLongAudio = audio.duration > 10;
              const multipleInstruments = (detectedInstruments.instrumentsAboveThreshold || 0) >= 3;
              const shouldShowMixGuidance = isLongAudio && (detectedInstruments.isFullMix || (analyzedFullTrack && multipleInstruments));

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

        {analysis && (
          <div className="space-y-6">
            {/* Usage Progress Bar — free tier only, after successful analysis */}
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
                      Upgrade to Pro for unlimited
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

            {/* Guest "Save Your Work" Prompt — unauthenticated users after analysis */}
            {!user && !dismissedSavePrompt && (
              <div className={`p-5 rounded-lg border ${
                theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-amber-200/50'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-md flex-shrink-0 ${
                    theme === 'dark' ? 'bg-zinc-800' : 'bg-gradient-to-r from-ember-500 to-amber-600'
                  }`}>
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-sm mb-1 ${t.text}`}>Your analysis is ready!</h4>
                    <p className={`text-sm mb-3 ${t.textMuted}`}>
                      Sign up to save it. You'll lose this if you leave the page.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          trackSavePromptConverted();
                          setShowAuthModal(true);
                        }}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          theme === 'dark'
                            ? 'bg-white text-black hover:bg-stone-200'
                            : 'bg-gradient-to-r from-ember-500 to-amber-600 text-white hover:opacity-90 shadow-lg shadow-ember-500/20'
                        }`}
                      >
                        Create Free Account
                      </button>
                      <button
                        onClick={() => {
                          trackSavePromptDismissed();
                          setDismissedSavePrompt(true);
                        }}
                        className={`text-sm ${t.textMuted} ${theme === 'dark' ? 'hover:text-zinc-50' : 'hover:text-stone-900'}`}
                      >
                        Continue without saving
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Copy Button */}
            <ExportToolbar
              onCopy={copyToClipboard}
              theme={theme}
            />

            {/* Tabbed Results Interface */}
            <div ref={resultsSectionRef} />
            <ResultsTabs theme={theme} t={t} dawPreference={profile?.daw_preference}>
              {/* === VITAL PRESET TAB === */}
              <div data-tab="vital">
                <PresetSelector
                  key={selectedInstrument}
                  detectedInstrument={selectedInstrument}
                  audioTitle={audioMetadata?.title}
                  theme={theme}
                  t={t}
                  onPresetSelected={handlePresetSelected}
                  hasDownloadedPreset={hasDownloadedPreset}
                  onTrackDownload={trackCuratedDownload}
                  analysisFeatures={analysis?.features || null}
                />

                {/* Vital Synthesis Tips */}
                {analysis && (
                  <div className={`mt-6 p-6 ${t.card}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <Sliders className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
                      <h2 className={`text-xl font-bold ${t.text}`}>Vital Synthesis Tips</h2>
                    </div>
                    <VitalGuide
                      features={analysis.features}
                      soundType={getDAWRecipe(analysis.features, selectedInstrument, 'FL Studio').soundType}
                      theme={theme}
                      t={t}
                    />
                  </div>
                )}
              </div>

              {/* === DAW RECIPE TAB === */}
              <div data-tab="daw" className={`p-6 ${t.card}`}>
                {/* DAW preference prompt */}
                {!profile?.daw_preference && (
                  <div className={`mb-4 p-4 flex items-center gap-3 rounded-lg ${
                    theme === 'dark' ? 'bg-zinc-900 border border-zinc-800' : 'bg-amber-50/30 border border-amber-200/50'
                  }`}>
                    <Settings className={`w-4 h-4 flex-shrink-0 ${t.textMuted}`} />
                    <p className={`text-sm ${t.textMuted}`}>
                      <Link to="/settings" className={`font-medium ${theme === 'dark' ? 'text-white hover:underline' : 'text-ember-600 hover:underline'}`}>
                        Set your DAW in Settings
                      </Link>
                      {' '}to get personalized plugin recommendations.
                    </p>
                  </div>
                )}

                <SoundSauce
                  analysis={analysis}
                  theme={theme}
                  t={t}
                  selectedInstrument={selectedInstrument}
                  dawPreference={profile?.daw_preference}
                  showVitalSection={false}
                />

                {/* Plugin & Mix Reference — collapsible accordion */}
                <DAWSettingsAccordion analysis={analysis} theme={theme} t={t} />
              </div>

              {/* === DETAILED ANALYSIS TAB === */}
              <div data-tab="detailed" className="space-y-4">

                {/* BPM + Key Row */}
                {(analysis.features.bpm || analysis.features.key) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* BPM Card */}
                    {analysis.features.bpm && (
                      <div className={`p-4 border rounded-lg ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-medium ${t.textDimmed}`}><Tooltip term="BPM">BPM</Tooltip></span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'} ${t.textMuted}`}>
                            {analysis.features.bpm.confidence > 70 ? 'High confidence' :
                             analysis.features.bpm.confidence > 40 ? 'Medium confidence' : 'Low confidence'}
                          </span>
                        </div>
                        <div className={`text-3xl font-bold ${t.text}`}>
                          {Math.round(analysis.features.bpm.suggestedTempo || analysis.features.bpm.bpm)}
                        </div>
                        <div className={`text-xs mt-1 ${t.textMuted}`}>
                          {analysis.features.bpm.tempoRange} tempo
                        </div>
                        {(analysis.features.bpm.halfTempo || analysis.features.bpm.doubleTempo) && (
                          <div className={`flex gap-2 mt-2 flex-wrap`}>
                            {analysis.features.bpm.halfTempo > 0 && (
                              <span className={`text-xs px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-zinc-950 text-zinc-400' : 'bg-stone-100 text-zinc-500'}`}>
                                Half: {Math.round(analysis.features.bpm.halfTempo)}
                              </span>
                            )}
                            {analysis.features.bpm.doubleTempo > 0 && (
                              <span className={`text-xs px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-zinc-950 text-zinc-400' : 'bg-stone-100 text-zinc-500'}`}>
                                Double: {Math.round(analysis.features.bpm.doubleTempo)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Key Card */}
                    {analysis.features.key && (
                      <div className={`p-4 border rounded-lg ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-medium ${t.textDimmed}`}><Tooltip term="Key">KEY</Tooltip></span>
                          {analysis.features.key.camelot && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'} ${t.textMuted}`}>
                              {analysis.features.key.camelot}
                            </span>
                          )}
                        </div>
                        <div className={`text-3xl font-bold ${t.text}`}>
                          {analysis.features.key.key} {analysis.features.key.mode}
                        </div>
                        {analysis.features.key.scaleNotes && (
                          <div className={`flex gap-1 mt-2 flex-wrap`}>
                            {analysis.features.key.scaleNotes.map((note, i) => (
                              <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-zinc-950 text-zinc-400' : 'bg-stone-100 text-zinc-500'}`}>
                                {note}
                              </span>
                            ))}
                          </div>
                        )}
                        {analysis.features.key.compatibleKeys && (
                          <div className={`text-xs mt-2 ${t.textMuted}`}>
                            Compatible: {analysis.features.key.compatibleKeys.slice(0, 3).map(k => k.code).join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Waveform Type Card */}
                {analysis.features.waveform && (
                  <div className={`p-4 border rounded-lg ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-medium ${t.textDimmed}`}><Tooltip term="Waveform">WAVEFORM</Tooltip></span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'} ${t.textMuted}`}>
                        {analysis.features.waveform.confidence}% match
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl font-bold capitalize ${t.text}`}>
                        {analysis.features.waveform.type}
                      </div>
                      {analysis.features.waveform.fundamentalFreq > 0 && (
                        <span className={`text-sm ${t.textMuted}`}>
                          ({analysis.features.waveform.fundamentalFreq} Hz fundamental)
                        </span>
                      )}
                    </div>
                    {analysis.features.waveform.synthRecommendation && (
                      <div className={`text-xs mt-2 p-2 rounded-md ${theme === 'dark' ? 'bg-zinc-950' : 'bg-stone-100'}`}>
                        <span className={t.textMuted}>Tip:</span> {analysis.features.waveform.synthRecommendation}
                      </div>
                    )}
                  </div>
                )}

                {/* ADSR Envelope */}
                {analysis.features.adsr && (
                  <ADSREnvelope adsr={analysis.features.adsr} theme={theme} t={t} />
                )}

                {/* Tone, Frequency, Texture, Level — 4-card grid */}
                {(() => {
                  const brightness = parseFloat(analysis.features.brightness) || 0;
                  const centroid = parseFloat(analysis.features.spectralCentroid) || 0;
                  const harmonicity = parseFloat(analysis.features.harmonicity) || 0;
                  const rmsVal = parseFloat(analysis.features.rms) || 0;
                  const rmsDb = rmsVal > 0 ? (20 * Math.log10(rmsVal)).toFixed(1) : '-\u221E';
                  const cardClass = `p-3 border rounded-lg ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`;
                  const badgeClass = `text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'} ${t.textMuted}`;
                  const tipClass = `text-xs mt-2 p-2 rounded-md ${theme === 'dark' ? 'bg-zinc-950' : 'bg-stone-100'}`;
                  return (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Tone/Brightness Card */}
                      <div className={cardClass}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-medium ${t.textDimmed}`}><Tooltip term="Tone">TONE</Tooltip></span>
                          <span className={badgeClass}>
                            {brightness > 0.6 ? 'Bright' : brightness > 0.3 ? 'Balanced' : 'Dark'}
                          </span>
                        </div>
                        <div className={`text-2xl font-bold ${t.text}`}>
                          {(brightness * 100).toFixed(0)}%
                        </div>
                        <div className={tipClass}>
                          <span className={t.textMuted}>→</span> {
                            brightness > 0.6 ? 'Open filter cutoff fully' :
                            brightness > 0.3 ? 'Filter cutoff around 50-70%' :
                            'Close filter cutoff to 20-40%'
                          }
                        </div>
                      </div>

                      {/* Spectral Center Card */}
                      <div className={cardClass}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-medium ${t.textDimmed}`}><Tooltip term="Frequency Center">FREQ CENTER</Tooltip></span>
                          <span className={badgeClass}>
                            {centroid > 2000 ? 'High' : centroid > 500 ? 'Mid' : 'Low'}
                          </span>
                        </div>
                        <div className={`text-2xl font-bold ${t.text}`}>
                          {Math.round(centroid)} Hz
                        </div>
                        <div className={tipClass}>
                          <span className={t.textMuted}>→</span> {
                            centroid > 2000 ? 'Sits in high-mids' :
                            centroid > 500 ? 'Balanced presence' :
                            'Bass-heavy, needs low-end room'
                          }
                        </div>
                      </div>

                      {/* Harmonicity/Texture Card */}
                      <div className={cardClass}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-medium ${t.textDimmed}`}><Tooltip term="Texture">TEXTURE</Tooltip></span>
                          <span className={badgeClass}>
                            {harmonicity > 0.7 ? 'Tonal' : harmonicity > 0.4 ? 'Complex' : 'Inharmonic'}
                          </span>
                        </div>
                        <div className={`text-2xl font-bold ${t.text}`}>
                          {(harmonicity * 100).toFixed(0)}%
                        </div>
                        <div className={tipClass}>
                          <span className={t.textMuted}>→</span> {
                            harmonicity > 0.7 ? 'Clean pitched sound — use Saw/Square oscillators' :
                            harmonicity > 0.4 ? 'Some inharmonic content — try FM or wavetable synthesis' :
                            'Noise-heavy — try noise oscillator, FM, or granular synthesis'
                          }
                        </div>
                      </div>

                      {/* Loudness/Dynamics Card */}
                      <div className={cardClass}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-medium ${t.textDimmed}`}><Tooltip term="Level">LEVEL</Tooltip></span>
                          <span className={badgeClass}>
                            {rmsVal > 0.3 ? 'Hot' : rmsVal > 0.1 ? 'Nominal' : 'Quiet'}
                          </span>
                        </div>
                        <div className={`text-2xl font-bold ${t.text}`}>
                          {rmsDb} <span className="text-sm font-normal">dBFS</span>
                        </div>
                        <div className={tipClass}>
                          <span className={t.textMuted}>→</span> {
                            rmsVal > 0.3 ? 'Hot source — watch for clipping' :
                            rmsVal > 0.1 ? 'Good level for processing' :
                            'Quiet — may need gain staging'
                          }
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>

            </ResultsTabs>

            {/* Next Steps CTA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Try recreating */}
              <button
                onClick={() => {
                  const el = document.getElementById('quick-compare-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`group p-4 rounded-lg border text-left transition-all ${
                  theme === 'dark'
                    ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                    : 'bg-white border-stone-200 hover:border-ember-500 hover:shadow-md hover:shadow-ember-500/5'
                }`}
              >
                <div className={`w-8 h-8 rounded-md flex items-center justify-center mb-2.5 transition-colors ${
                  theme === 'dark'
                    ? 'bg-zinc-800 group-hover:bg-ember-500/20'
                    : 'bg-amber-50 group-hover:bg-amber-100'
                }`}>
                  <Upload className={`w-4 h-4 ${theme === 'dark' ? 'text-zinc-400 group-hover:text-ember-500' : 'text-ember-600'}`} />
                </div>
                <div className={`text-sm font-medium ${t.text}`}>Compare Your Recreation</div>
                <div className={`text-xs mt-0.5 ${t.textMuted}`}>Upload your attempt and see how close you got</div>
              </button>

              {/* Card 2: Browse similar */}
              <Link
                to={`/discover${selectedInstrument && selectedInstrument !== 'full' ? `?tag=${encodeURIComponent(selectedInstrument)}` : ''}`}
                className={`group p-4 rounded-lg border text-left transition-all ${
                  theme === 'dark'
                    ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                    : 'bg-white border-stone-200 hover:border-ember-500 hover:shadow-md hover:shadow-ember-500/5'
                }`}
              >
                <div className={`w-8 h-8 rounded-md flex items-center justify-center mb-2.5 transition-colors ${
                  theme === 'dark'
                    ? 'bg-zinc-800 group-hover:bg-ember-500/20'
                    : 'bg-amber-50 group-hover:bg-amber-100'
                }`}>
                  <Compass className={`w-4 h-4 ${theme === 'dark' ? 'text-zinc-400 group-hover:text-ember-500' : 'text-ember-600'}`} />
                </div>
                <div className={`text-sm font-medium ${t.text}`}>Browse Sound Sauces</div>
                <div className={`text-xs mt-0.5 ${t.textMuted}`}>Find similar sounds from the community</div>
              </Link>

              {/* Card 3: Download preset */}
              <button
                onClick={() => {
                  resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`group p-4 rounded-lg border text-left transition-all ${
                  theme === 'dark'
                    ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                    : 'bg-white border-stone-200 hover:border-ember-500 hover:shadow-md hover:shadow-ember-500/5'
                }`}
              >
                <div className={`w-8 h-8 rounded-md flex items-center justify-center mb-2.5 transition-colors ${
                  theme === 'dark'
                    ? 'bg-zinc-800 group-hover:bg-ember-500/20'
                    : 'bg-amber-50 group-hover:bg-amber-100'
                }`}>
                  <Download className={`w-4 h-4 ${theme === 'dark' ? 'text-zinc-400 group-hover:text-ember-500' : 'text-ember-600'}`} />
                </div>
                <div className={`text-sm font-medium ${t.text}`}>Download Preset</div>
                <div className={`text-xs mt-0.5 ${t.textMuted}`}>Get the .vital preset file for this sound</div>
              </button>
            </div>

            {/* Quick Compare — client-side recreation comparison */}
            <QuickCompare
              audioFileData={audioFileData}
              sampleRate={audio.audioBuffer?.sampleRate || 44100}
              theme={theme}
              t={t}
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

        {/* Auth Modal — triggered by guest save prompt */}
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}
