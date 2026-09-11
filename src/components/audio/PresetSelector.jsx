import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Download, RotateCcw, Music, Sliders, ExternalLink, Heart, User, UserPlus, HelpCircle, ArrowLeftRight, X, Star, Volume2, Square, Loader2, Disc, Zap, Wind, Drum, Piano, Guitar as GuitarIcon, Megaphone, Music2, ChevronDown, ChevronUp, BarChart3, RefreshCw } from 'lucide-react';
import { CURATED_PRESETS, PRESET_CATEGORIES, TUNING_PARAMS, INSTRUMENT_TO_CATEGORY, scorePresetMatch, scorePresetsWithSpectral, computeAnalysisTuning } from '../../data/vitalPresets';
import { SynthKnob } from '../ui/SynthKnob';
// Lazy-loaded — only fetched when user downloads a preset
const getPresetGenerator = () => import('../../services/vitalPresetGenerator');
import { supabase } from '../../lib/supabase';
import { sanitize } from '../../utils/sanitize';

// Map preset category IDs to the tag labels used in community preset posts
const CATEGORY_TO_TAG = {
  bass: 'Bass', lead: 'Lead', pad: 'Pad', pluck: 'Pluck', kick: 'Kick',
  drums: 'Drums', keys: 'Keys', guitar: 'Guitar', brass: 'Brass', woodwind: 'Woodwind',
};

// Icons per category for visual recognition in pills
const CATEGORY_ICONS = {
  bass: Disc, lead: Zap, pad: Wind, pluck: Music, kick: Drum,
  drums: Drum, keys: Piano, guitar: GuitarIcon, brass: Megaphone, woodwind: Music2,
};

/**
 * Preset selector with category tabs, preset cards, tuning sliders, and download.
 * Shown after analysis completes on the Analyze page.
 * Uses key={detectedInstrument} from parent to reset state when instrument changes.
 */
export function PresetSelector({ detectedInstrument, audioTitle, theme, t, onPresetSelected, onPresetDownloaded, hasDownloadedPreset, onTrackDownload, analysisFeatures, wavetableData, user, onRequestAuth, sourceAudioData, triggerDownload }) {
  // Auto-select category based on detected instrument (key prop resets on instrument change)
  const defaultCategory = INSTRUMENT_TO_CATEGORY[detectedInstrument?.toLowerCase()] || 'lead';
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);

  // Compute initial best preset for auto-selection
  const initialBest = useMemo(() => {
    if (!analysisFeatures) return null;
    const inCategory = CURATED_PRESETS.filter(p => p.category === defaultCategory);
    const scored = inCategory
      .map(p => ({ id: p.id, score: scorePresetMatch(p, analysisFeatures) }))
      .sort((a, b) => b.score - a.score);
    return scored.length > 0 && scored[0].score >= 40 ? scored[0].id : null;
  }, [defaultCategory, analysisFeatures]);

  // Compute initial analysis-driven tuning overrides for auto-selected preset
  const initialTuning = useMemo(() => {
    if (!initialBest || !analysisFeatures) return {};
    const preset = CURATED_PRESETS.find(p => p.id === initialBest);
    return preset ? computeAnalysisTuning(preset, analysisFeatures) : {};
  }, [initialBest, analysisFeatures]);

  const [selectedPresetId, setSelectedPresetId] = useState(initialBest);
  const [tuningOverrides, setTuningOverrides] = useState(initialTuning);
  // Auto-show sliders when analysis tuning was computed (so users see their sound's unique settings)
  const [showSliders, setShowSliders] = useState(Object.keys(initialTuning).length > 0);

  // Duplicate download warning state

  // A/B comparison state
  const [comparePresetId, setComparePresetId] = useState(null);

  // Community presets state
  const [communityPresets, setCommunityPresets] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);

  // Preset audio preview state
  const [previewingId, setPreviewingId] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(null); // presetId currently generating
  const previewCtxRef = useRef(null);     // Real-time AudioContext for playback
  const previewSourceRef = useRef(null);  // Currently playing BufferSourceNode
  const previewCacheRef = useRef({});     // { [presetId]: AudioBuffer }
  const previewingIdRef = useRef(null);   // Ref synced with previewingId for stable callbacks

  // Sync ref with state
  useEffect(() => { previewingIdRef.current = previewingId; }, [previewingId]);

  // Compare preset to source audio state
  const [compareToSourceStatus, setCompareToSourceStatus] = useState('idle'); // idle | generating | decoding | optimizing | comparing | done | error
  const [compareToSourceResult, setCompareToSourceResult] = useState(null);
  const [compareToSourceError, setCompareToSourceError] = useState(null);
  // Ref to avoid stale closure in handleCompareToSource
  const sourceAudioDataRef = useRef(sourceAudioData);
  useEffect(() => { sourceAudioDataRef.current = sourceAudioData; }, [sourceAudioData]);

  // Spectral fingerprint-based preset scoring state
  const [spectralScoringStatus, setSpectralScoringStatus] = useState('idle'); // idle | decoding | scoring | done
  const [spectralScores, setSpectralScores] = useState({}); // { [presetId]: number }
  const sourceChannelDataRef = useRef(null); // Cached decoded source audio (Float32Array)
  const sourceSampleRateRef = useRef(44100);

  // Decode source audio to channelData once, then run spectral scoring per category
  useEffect(() => {
    if (!sourceAudioData) return;

    const abortFlag = { aborted: false };
    let decodeCtx;

    const run = async () => {
      // Decode source audio to mono channelData (only once, cached in ref)
      if (!sourceChannelDataRef.current) {
        setSpectralScoringStatus('decoding');
        try {
          decodeCtx = new OfflineAudioContext(1, 44100 * 10, 44100);
          const buf = await decodeCtx.decodeAudioData(sourceAudioData.slice(0));
          if (abortFlag.aborted) return;
          sourceChannelDataRef.current = buf.getChannelData(0);
          sourceSampleRateRef.current = buf.sampleRate;
        } catch (err) {
          console.warn('Failed to decode source audio for spectral scoring:', err.message);
          setSpectralScoringStatus('idle');
          return;
        }
      }

      if (abortFlag.aborted) return;

      // Score presets in the current category
      const presetsInCategory = CURATED_PRESETS.filter(p => p.category === selectedCategory);
      if (presetsInCategory.length === 0) {
        setSpectralScoringStatus('done');
        return;
      }

      setSpectralScoringStatus('scoring');

      const results = await scorePresetsWithSpectral(
        presetsInCategory,
        sourceChannelDataRef.current,
        sourceSampleRateRef.current,
        analysisFeatures,
        { signal: abortFlag }
      );

      if (abortFlag.aborted) return;

      // Merge new scores into existing map (preserves scores from other categories)
      setSpectralScores(prev => {
        const next = { ...prev };
        for (const { preset, score } of results) {
          next[preset.id] = score;
        }
        return next;
      });
      setSpectralScoringStatus('done');
    };

    run();

    return () => { abortFlag.aborted = true; };
  }, [selectedCategory, sourceAudioData, analysisFeatures]);

  // When spectral scoring completes, auto-select the best match if it differs from heuristic pick
  const spectralAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (spectralScoringStatus !== 'done' || spectralAutoSelectedRef.current) return;

    // Only auto-select once (on the first scoring completion for the default category)
    if (selectedCategory !== defaultCategory) return;

    const presetsInCategory = CURATED_PRESETS.filter(p => p.category === selectedCategory);
    const scored = presetsInCategory
      .map(p => ({ id: p.id, score: spectralScores[p.id] ?? 0 }))
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0 && scored[0].score >= 30 && scored[0].id !== selectedPresetId) {
      spectralAutoSelectedRef.current = true;
      const bestId = scored[0].id;
      const bestPreset = CURATED_PRESETS.find(p => p.id === bestId);
      setSelectedPresetId(bestId);
      const tuning = bestPreset ? computeAnalysisTuning(bestPreset, analysisFeatures) : {};
      setTuningOverrides(tuning);
      setShowSliders(Object.keys(tuning).length > 0);
      onPresetSelected?.(bestId, tuning);
    } else {
      spectralAutoSelectedRef.current = true;
    }
  }, [spectralScoringStatus, spectralScores, selectedCategory, defaultCategory, selectedPresetId, analysisFeatures, onPresetSelected]);

  // Clean up timers and audio on unmount
  useEffect(() => {
    return () => {
      // Stop any playing preview and close AudioContext
      if (previewSourceRef.current) {
        try { previewSourceRef.current.stop(); } catch { /* ignore */ }
        previewSourceRef.current = null;
      }
      if (previewCtxRef.current) {
        try { previewCtxRef.current.close(); } catch { /* ignore */ }
        previewCtxRef.current = null;
      }
    };
  }, []);

  // Fetch community presets when category changes
  useEffect(() => {
    const tagLabel = CATEGORY_TO_TAG[selectedCategory];
    if (!tagLabel) return;

    let cancelled = false;

    const fetchCommunityPresets = async () => {
      // Set loading inside async callback to satisfy lint (no sync setState in effect body)
      await Promise.resolve();
      if (cancelled) return;
      setCommunityLoading(true);

      const { data, error } = await supabase
        .from('analyses')
        .select('id, title, description, tags, vital_preset_url, like_count, download_count, profiles:user_id(username, avatar_url)')
        .eq('is_public', true)
        .eq('post_type', 'preset')
        .contains('tags', [tagLabel])
        .order('like_count', { ascending: false })
        .limit(10);

      if (cancelled) return;
      if (error) {
        console.warn('Failed to fetch community presets:', error.message);
        setCommunityPresets([]);
      } else {
        setCommunityPresets(data || []);
      }
      setCommunityLoading(false);
    };

    fetchCommunityPresets();

    return () => { cancelled = true; };
  }, [selectedCategory]);

  // Filter presets by category, score against analysis features, sort by score descending.
  // Uses spectral fingerprint scores when available, falls back to heuristic scoring.
  const filteredPresets = useMemo(() => {
    const inCategory = CURATED_PRESETS.filter(p => p.category === selectedCategory);
    if (!analysisFeatures) return inCategory;
    return inCategory
      .map(p => ({
        ...p,
        _matchScore: spectralScores[p.id] != null ? spectralScores[p.id] : scorePresetMatch(p, analysisFeatures)
      }))
      .sort((a, b) => b._matchScore - a._matchScore);
  }, [selectedCategory, analysisFeatures, spectralScores]);

  // Notify parent of initial auto-selection
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (notifiedRef.current || !initialBest) return;
    notifiedRef.current = true;
    onPresetSelected?.(initialBest, {});
  }, [initialBest, onPresetSelected]);

  // Get the selected preset definition
  const selectedPreset = useMemo(() =>
    CURATED_PRESETS.find(p => p.id === selectedPresetId),
    [selectedPresetId]
  );

  // Get default value for a tuning param from the selected preset
  const getDefaultValue = (param) => {
    if (!selectedPreset) return param.min;
    return selectedPreset.settings[param.vitalKey] ?? param.min;
  };

  // Get current value (override or default)
  const getCurrentValue = (param) => {
    if (tuningOverrides[param.id] !== undefined) return tuningOverrides[param.id];
    return getDefaultValue(param);
  };

  // Format value for display
  const formatValue = (param, value) => {
    switch (param.display) {
      case 'percent': {
        const range = param.max - param.min;
        const pct = ((value - param.min) / range) * 100;
        return `${Math.round(pct)}%`;
      }
      case 'seconds':
        return `${value.toFixed(2)}s`;
      case 'integer':
        return `${Math.round(value)}`;
      case 'value':
        return value.toFixed(1);
      case 'semitones':
        return `${value > 0 ? '+' : ''}${Math.round(value)}st`;
      case 'hz':
        return `${value.toFixed(1)} Hz`;
      default:
        return value.toFixed(2);
    }
  };

  const handleSliderChange = (paramId, value) => {
    const numVal = parseFloat(value);
    setTuningOverrides(prev => ({ ...prev, [paramId]: numVal }));
  };

  const handleResetSliders = () => {
    setTuningOverrides({});
  };

  const handleSelectPreset = (presetId) => {
    // Compute analysis-driven tuning for the newly selected preset
    const preset = CURATED_PRESETS.find(p => p.id === presetId);
    const newTuning = (preset && analysisFeatures) ? computeAnalysisTuning(preset, analysisFeatures) : {};
    setSelectedPresetId(presetId);
    setTuningOverrides(newTuning);
    setShowSliders(true);
    setShowDuplicateWarning(false);
    if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current);
    setComparePresetId(null); // Clear comparison when selecting a preset normally
    stopPreview(); // Stop any playing preview
    onPresetSelected?.(presetId, newTuning);
  };

  const executeDownload = async () => {
    if (!selectedPresetId) return;

    // Capitalize instrument name for display (e.g. 'bass' → 'Bass', 'lead' → 'Lead')
    const instrumentName = detectedInstrument
      ? detectedInstrument.charAt(0).toUpperCase() + detectedInstrument.slice(1).toLowerCase()
      : '';

    const { buildVitalPreset, downloadVitalPreset, buildPresetFilename } = await getPresetGenerator();
    // Inject extracted wavetable into OSC 2 (hybrid — OSC 1 keeps curated waveform)
    const finalOverrides = wavetableData?.success
      ? { ...tuningOverrides, _wavetableData: wavetableData }
      : tuningOverrides;
    const preset = buildVitalPreset(selectedPresetId, finalOverrides, {
      audioTitle: audioTitle,
      instrument: instrumentName,
      presetName: selectedPreset?.name || 'SoundSauce Export',
    });

    const filename = buildPresetFilename({
      audioTitle: audioTitle,
      instrument: instrumentName,
      presetName: selectedPreset?.name,
    });
    downloadVitalPreset(preset, filename);

    onTrackDownload?.(selectedPresetId, selectedPreset?.name || selectedPresetId);
    onPresetSelected?.(selectedPresetId, tuningOverrides);
    onPresetDownloaded?.();
    setShowDuplicateWarning(false);
    if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current);
  };

  const handleDownload = () => {
    if (!selectedPresetId) return;

    // Gate preset downloads behind auth — require free account
    if (!user) {
      onRequestAuth?.(selectedPreset?.name);
      return;
    }

    executeDownload();
  };

  // Auto-download after auth — when a guest tried to download, signed up, and came back
  const prevUserRef = useRef(user);
  useEffect(() => {
    if (user && !prevUserRef.current && triggerDownload?.current && selectedPresetId) {
      triggerDownload.current = false;
      executeDownload();
    }
    prevUserRef.current = user;
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle selecting preset B from the comparison panel
  const handleSelectComparePreset = () => {
    if (!comparePresetId) return;
    setSelectedPresetId(comparePresetId);
    setComparePresetId(null);
    setTuningOverrides({});
    setShowSliders(true);
    setShowDuplicateWarning(false);
    if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current);
    onPresetSelected?.(comparePresetId, {});
  };

  /**
   * Stop any currently playing preset preview.
   */
  const stopPreview = useCallback(() => {
    if (previewSourceRef.current) {
      try { previewSourceRef.current.stop(); } catch { /* ignore */ }
      previewSourceRef.current = null;
    }
    setPreviewingId(null);
  }, []);

  /**
   * Play (or stop) a 2-second audio preview of a curated preset.
   * Generates audio on first play, caches the decoded AudioBuffer for instant replays.
   * Only one preview plays at a time.
   */
  const handlePlayPreview = useCallback(async (presetId) => {
    // If this preset is already playing, stop it (read from ref to avoid stale closure)
    if (previewingIdRef.current === presetId) {
      stopPreview();
      return;
    }

    // Stop any currently playing preview
    stopPreview();

    // Get or create the AudioContext
    if (!previewCtxRef.current || previewCtxRef.current.state === 'closed') {
      previewCtxRef.current = new AudioContext({ sampleRate: 44100 });
    }
    const ctx = previewCtxRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    let audioBuffer = previewCacheRef.current[presetId];

    if (!audioBuffer) {
      // Generate preview for the first time
      setPreviewLoading(presetId);
      try {
        const { generatePresetPreview } = await import('../../utils/demoSoundGenerator');
        const wavBuffer = await generatePresetPreview(presetId, 2);
        audioBuffer = await ctx.decodeAudioData(wavBuffer);
        previewCacheRef.current[presetId] = audioBuffer;
      } catch (err) {
        console.warn('Preset preview error:', err);
        setPreviewLoading(null);
        return;
      }
      setPreviewLoading(null);
    }

    // Play the preview
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => {
      // Only clear state if this source is still the current one
      if (previewSourceRef.current === source) {
        previewSourceRef.current = null;
        setPreviewingId(null);
      }
    };
    previewSourceRef.current = source;
    setPreviewingId(presetId);
    source.start(0);
  }, [stopPreview]);

  /**
   * Play a preview with the current tuning overrides applied.
   * Always regenerates (no cache) since tuning changes each time.
   */
  const handlePlayTunedPreview = useCallback(async () => {
    if (!selectedPresetId) return;
    const tunedKey = `${selectedPresetId}_tuned`;

    // If already playing tuned preview, stop it
    if (previewingIdRef.current === tunedKey) {
      stopPreview();
      return;
    }

    stopPreview();

    if (!previewCtxRef.current || previewCtxRef.current.state === 'closed') {
      previewCtxRef.current = new AudioContext({ sampleRate: 44100 });
    }
    const ctx = previewCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    setPreviewLoading(tunedKey);
    try {
      // Build the effective Vital settings from tuning overrides
      const preset = CURATED_PRESETS.find(p => p.id === selectedPresetId);
      if (!preset) return;
      const effectiveSettings = { ...preset.settings };
      for (const [paramId, value] of Object.entries(tuningOverrides)) {
        if (paramId.startsWith('_')) continue;
        const paramDef = TUNING_PARAMS.find(p => p.id === paramId);
        if (paramDef) {
          effectiveSettings[paramDef.vitalKey] = Math.min(paramDef.max, Math.max(paramDef.min, value));
          if (paramDef.linkedToggle) {
            effectiveSettings[paramDef.linkedToggle] = value > 0 ? 1.0 : 0.0;
          }
        }
      }
      // Apply raw overrides (wave frame from analysis)
      if (tuningOverrides._rawOverrides) {
        Object.assign(effectiveSettings, tuningOverrides._rawOverrides);
      }

      const { generatePresetPreview } = await import('../../utils/demoSoundGenerator');
      const wavBuffer = await generatePresetPreview(selectedPresetId, 2, effectiveSettings);
      const audioBuffer = await ctx.decodeAudioData(wavBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        if (previewSourceRef.current === source) {
          previewSourceRef.current = null;
          setPreviewingId(null);
        }
      };
      previewSourceRef.current = source;
      setPreviewingId(tunedKey);
      setPreviewLoading(null);
      source.start(0);
    } catch (err) {
      console.warn('Tuned preview error:', err);
      setPreviewLoading(null);
    }
  }, [selectedPresetId, tuningOverrides, stopPreview]);

  /**
   * Compare the selected preset's synthesized audio against the user's source audio.
   * Generates a 2-second preview of the preset → decodes source audio → runs spectral match
   * via Web Worker → displays per-band results with tuning suggestions.
   */
  const handleCompareToSource = useCallback(async () => {
    const audioData = sourceAudioDataRef.current;
    if (!selectedPresetId || !audioData) return;

    setCompareToSourceError(null);
    setCompareToSourceResult(null);
    setCompareToSourceStatus('generating');

    let ctx;
    try {
      const preset = CURATED_PRESETS.find(p => p.id === selectedPresetId);
      if (!preset) throw new Error('Preset not found');

      // Build effective settings from current tuning state
      const effectiveSettings = { ...preset.settings };
      for (const [paramId, value] of Object.entries(tuningOverrides)) {
        if (paramId.startsWith('_')) continue;
        const paramDef = TUNING_PARAMS.find(p => p.id === paramId);
        if (paramDef) {
          effectiveSettings[paramDef.vitalKey] = Math.min(paramDef.max, Math.max(paramDef.min, value));
          if (paramDef.linkedToggle) {
            effectiveSettings[paramDef.linkedToggle] = value > 0 ? 1.0 : 0.0;
          }
        }
      }
      if (tuningOverrides._rawOverrides) {
        Object.assign(effectiveSettings, tuningOverrides._rawOverrides);
      }

      const fundamentalHz = analysisFeatures?.waveform?.fundamentalFreq || null;
      const keyNote = analysisFeatures?.key?.key ? `${analysisFeatures.key.key}` : null;

      // 1. Decode source audio to get channel data for the sweep
      setCompareToSourceStatus('decoding');
      ctx = new AudioContext({ sampleRate: 44100 });
      const sourceDecoded = await ctx.decodeAudioData(audioData.slice(0));
      const sourceData = sourceDecoded.getChannelData(0);

      // 2. Run automated parameter sweep — coordinate descent to find optimal settings
      setCompareToSourceStatus('optimizing');
      const { optimizePresetSettings } = await import('../../utils/demoSoundGenerator');
      const sweepResult = await optimizePresetSettings(
        selectedPresetId,
        sourceData,
        sourceDecoded.sampleRate,
        effectiveSettings,
        {
          fundamentalHz,
          keyNote,
          onProgress: (p) => {
            // Could update UI with sweep progress if desired
          },
        }
      );

      // 3. Apply optimized settings to tuning sliders if sweep improved the score
      if (sweepResult.improvement > 0 && sweepResult.settings) {
        const newOverrides = { ...tuningOverrides };
        for (const [paramId, value] of Object.entries(sweepResult.settings)) {
          if (paramId !== '_rawOverrides') {
            newOverrides[paramId] = value;
          }
        }
        if (sweepResult.settings._rawOverrides) {
          newOverrides._rawOverrides = {
            ...(newOverrides._rawOverrides || {}),
            ...sweepResult.settings._rawOverrides,
          };
        }
        setTuningOverrides(newOverrides);
      }

      // 4. Generate final preset audio with optimized settings for detailed comparison
      setCompareToSourceStatus('comparing');
      const { generatePresetPreview } = await import('../../utils/demoSoundGenerator');

      // Helper: build Vital settings from current overrides
      const buildSettings = (overrides) => {
        const s = { ...preset.settings };
        for (const [paramId, value] of Object.entries(overrides)) {
          if (paramId.startsWith('_')) continue;
          const paramDef = TUNING_PARAMS.find(p => p.id === paramId);
          if (paramDef) {
            s[paramDef.vitalKey] = Math.min(paramDef.max, Math.max(paramDef.min, value));
            if (paramDef.linkedToggle) {
              s[paramDef.linkedToggle] = value > 0 ? 1.0 : 0.0;
            }
          }
        }
        if (overrides._rawOverrides) Object.assign(s, overrides._rawOverrides);
        return s;
      };

      // Helper: run spectral match via one-shot Worker
      const runSpectralMatch = async (srcData, presetChannelData, sr) => {
        return new Promise((resolve, reject) => {
          const tempWorker = new Worker(
            new URL('../../workers/audio.worker.js', import.meta.url),
            { type: 'module' }
          );
          tempWorker.onmessage = (e) => {
            const { type, result: res, error: err } = e.data;
            if (type === 'SUCCESS') { tempWorker.terminate(); resolve(res); }
            else if (type === 'ERROR') { tempWorker.terminate(); reject(new Error(err)); }
          };
          tempWorker.onerror = (e) => { tempWorker.terminate(); reject(new Error(e.message || 'Worker error')); };
          const bufA = new Float32Array(srcData).buffer;
          const bufB = new Float32Array(presetChannelData).buffer;
          tempWorker.postMessage({
            type: 'SPECTRAL_MATCH', id: 1,
            payload: { channelDataA: bufA, channelDataB: bufB, sampleRate: sr }
          }, [bufA, bufB]);
        });
      };

      // Initial comparison with sweep-optimized settings
      let currentOverrides = sweepResult.improvement > 0 ? { ...tuningOverrides, ...sweepResult.settings } : { ...tuningOverrides };
      let currentSettings = buildSettings(currentOverrides);
      let presetWavBuffer = await generatePresetPreview(selectedPresetId, 2, currentSettings, { fundamentalHz, keyNote });
      let presetDecoded = await ctx.decodeAudioData(presetWavBuffer);
      let presetData = presetDecoded.getChannelData(0);
      let matchResult = await runSpectralMatch(sourceData, presetData, presetDecoded.sampleRate);

      // 5. Auto-refine loop: apply suggestion-driven nudges and keep improvements
      // Runs up to 3 refinement passes, stops early if no improvement
      const NUDGE_STEP = { filter_cutoff: 8, filter_resonance: 0.1, attack: 0.02, release: 0.1, chorus: 0.15 };
      for (let pass = 0; pass < 3; pass++) {
        const bands = matchResult.bandDifferences || {};
        const subBass = (bands.subBass ?? bands['sub-bass'])?.similarity ?? 100;
        const bass = bands.bass?.similarity ?? 100;
        const mid = bands.mid?.similarity ?? 100;
        const highMid = (bands.highMid ?? bands['high-mid'])?.similarity ?? 100;
        const high = bands.high?.similarity ?? 100;

        // Compute nudges from band differences
        const nudges = {};
        if (subBass < 60 || bass < 60) {
          const cutoffParam = TUNING_PARAMS.find(p => p.id === 'filter_cutoff');
          const current = currentOverrides.filter_cutoff ?? cutoffParam?.default ?? 72;
          nudges.filter_cutoff = subBass < bass
            ? Math.max(cutoffParam?.min ?? 20, current - NUDGE_STEP.filter_cutoff)
            : Math.min(cutoffParam?.max ?? 120, current + NUDGE_STEP.filter_cutoff);
        }
        if (mid < 60) {
          const resParam = TUNING_PARAMS.find(p => p.id === 'filter_resonance');
          const current = currentOverrides.filter_resonance ?? resParam?.default ?? 0.25;
          // Try increasing resonance to shape mids
          nudges.filter_resonance = Math.min(resParam?.max ?? 1, current + NUDGE_STEP.filter_resonance);
        }
        if (highMid < 60 || high < 60) {
          const cutoffParam = TUNING_PARAMS.find(p => p.id === 'filter_cutoff');
          const current = nudges.filter_cutoff ?? currentOverrides.filter_cutoff ?? cutoffParam?.default ?? 72;
          nudges.filter_cutoff = highMid < 50
            ? Math.min(cutoffParam?.max ?? 120, current + NUDGE_STEP.filter_cutoff)
            : Math.max(cutoffParam?.min ?? 20, current - NUDGE_STEP.filter_cutoff);
        }

        // If no nudges needed, we're done
        if (Object.keys(nudges).length === 0) break;

        // Apply nudges and re-render
        const refinedOverrides = { ...currentOverrides, ...nudges };
        const refinedSettings = buildSettings(refinedOverrides);
        const refinedWav = await generatePresetPreview(selectedPresetId, 2, refinedSettings, { fundamentalHz, keyNote });
        const refinedDecoded = await ctx.decodeAudioData(refinedWav);
        const refinedData = refinedDecoded.getChannelData(0);
        const refinedMatch = await runSpectralMatch(sourceData, refinedData, refinedDecoded.sampleRate);

        // Keep the refinement only if it improved the score
        if (refinedMatch.overallMatch > matchResult.overallMatch) {
          currentOverrides = refinedOverrides;
          currentSettings = refinedSettings;
          matchResult = refinedMatch;
        } else {
          break; // Nudges didn't help, stop refining
        }
      }

      // Apply final refined overrides to sliders
      if (currentOverrides !== tuningOverrides) {
        setTuningOverrides(currentOverrides);
      }

      // 6. Generate final suggestions for any remaining band differences
      const suggestions = generateTuningSuggestions(matchResult);
      const totalImprovement = matchResult.overallMatch - (sweepResult.initialScore || 0);

      setCompareToSourceResult({
        match_score: matchResult.overallMatch,
        matchResult,
        suggestions,
        optimized: totalImprovement > 0,
        initialScore: sweepResult.initialScore,
        improvement: Math.round(totalImprovement),
      });
      setCompareToSourceStatus('done');
    } catch (err) {
      console.error('Compare to source error:', err);
      setCompareToSourceError(err.message || 'Could not compare audio. Please try again.');
      setCompareToSourceStatus('error');
    } finally {
      if (ctx) {
        try { ctx.close(); } catch { /* ignore */ }
      }
    }
  }, [selectedPresetId, tuningOverrides, analysisFeatures]);

  /**
   * Generate actionable tuning suggestions from spectral match band differences.
   * Translates per-band similarity scores into specific knob/slider adjustments.
   */
  function generateTuningSuggestions(matchResult) {
    const suggestions = [];
    const bands = matchResult.bandDifferences || {};
    const eqSuggs = matchResult.eqSuggestions || [];

    // Sub-bass / bass band analysis → filter cutoff suggestions
    // Band similarity values are 0-100 integers from the worker
    const subBass = (bands.subBass ?? bands['sub-bass'])?.similarity ?? 100;
    const bass = bands.bass?.similarity ?? 100;
    const mid = bands.mid?.similarity ?? 100;
    const highMid = (bands.highMid ?? bands['high-mid'])?.similarity ?? 100;
    const high = bands.high?.similarity ?? 100;

    if (subBass < 60 || bass < 60) {
      if (subBass < bass) {
        suggestions.push({
          icon: '🔈',
          label: 'More low end needed',
          detail: 'Try lowering the Filter Cutoff knob to let more bass through, or increase the decay time for a longer bass tail.',
          param: 'filter_cutoff',
          direction: 'lower',
        });
      } else {
        suggestions.push({
          icon: '🔉',
          label: 'Reduce low frequencies',
          detail: 'The preset has more bass than your source. Try raising the Filter Cutoff to tighten the low end.',
          param: 'filter_cutoff',
          direction: 'higher',
        });
      }
    }

    if (mid < 60) {
      suggestions.push({
        icon: '🎛️',
        label: 'Mid-range mismatch',
        detail: 'Adjust the Filter Cutoff and Resonance knobs — the mid frequencies differ the most. Try small increments and re-compare.',
        param: 'filter_resonance',
        direction: 'adjust',
      });
    }

    if (highMid < 60 || high < 60) {
      suggestions.push({
        icon: '✨',
        label: 'Brightness difference',
        detail: 'Your source is ' + (highMid < 50 ? 'brighter than' : 'darker than') + ' the preset. Adjust the Filter Cutoff higher for more brightness, or add Chorus for shimmer.',
        param: 'filter_cutoff',
        direction: highMid < 50 ? 'higher' : 'lower',
      });
    }

    // Envelope / wave shape suggestions based on overall score
    const overallScore = matchResult.overallMatch || 0;
    if (overallScore < 70 && suggestions.length < 4) {
      suggestions.push({
        icon: '⏱️',
        label: 'Shape the envelope',
        detail: 'Try adjusting Attack and Release to match the amplitude shape.',
        param: 'attack',
        direction: 'adjust',
      });
    }

    // Wave shape suggestion when overall is low and sub/bass are weak
    if (overallScore < 60 && subBass < 50 && bass < 50 && suggestions.length < 5) {
      suggestions.push({
        param: 'wave_frame',
        direction: 'adjust',
        label: 'Try a different wave shape',
      });
    }

    // Distortion suggestion when high mids are weak
    if (highMid < 50 && suggestions.length < 5) {
      suggestions.push({
        param: 'distortion_drive',
        direction: 'higher',
        label: 'Add harmonics',
      });
    }

    // Filter envelope suggestion when mid transient differs
    if (mid < 55 && suggestions.length < 5) {
      suggestions.push({
        param: 'env_2_decay',
        direction: 'adjust',
        label: 'Adjust filter sweep',
      });
    }

    // Include worker-generated EQ suggestions if present
    for (const tip of eqSuggs) {
      suggestions.push({
        icon: '📊',
        label: `${tip.action === 'boost' ? 'Boost' : 'Cut'} ${tip.band.replace(/([a-z])([A-Z])/g, '$1 $2')}`,
        detail: `${tip.action === 'boost' ? 'Increase' : 'Decrease'} energy around ${tip.freqRange} by ~${tip.amount}% to better match your source.`,
        param: null,
        direction: null,
      });
    }

    // If score is high, add a positive message
    if (overallScore >= 85 && suggestions.length === 0) {
      suggestions.push({
        icon: '🎯',
        label: 'Great match!',
        detail: 'This preset closely matches your source audio. Fine-tune the knobs above for the last few percent.',
        param: null,
        direction: null,
      });
    }

    return suggestions;
  }

  // Auto-optimize: when preset changes and source audio is available, auto-run compare+sweep.
  // This replaces the old "reset only" effect — now it resets AND auto-triggers optimization.
  const autoOptimizeRef = useRef(false);
  useEffect(() => {
    // Reset previous results
    setCompareToSourceResult(null);
    setCompareToSourceStatus('idle');
    setCompareToSourceError(null);

    // Auto-trigger compare+optimize if source audio is available
    // Skip on initial mount (handled separately by the initial auto-select logic)
    if (!autoOptimizeRef.current) {
      autoOptimizeRef.current = true;
      // For the initial preset, also auto-optimize if source audio is ready
      if (selectedPresetId && sourceAudioDataRef.current) {
        // Small delay to let state settle after mount
        const timer = setTimeout(() => { handleCompareToSource(); }, 100);
        return () => clearTimeout(timer);
      }
      return;
    }

    if (selectedPresetId && sourceAudioDataRef.current) {
      // Small delay to let tuning overrides settle after handleSelectPreset
      const timer = setTimeout(() => { handleCompareToSource(); }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedPresetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDark = theme === 'dark';

  // A/B comparison presets lookup
  const comparePresetA = useMemo(() =>
    selectedPresetId ? CURATED_PRESETS.find(p => p.id === selectedPresetId) : null,
    [selectedPresetId]
  );
  const comparePresetB = useMemo(() =>
    comparePresetId ? CURATED_PRESETS.find(p => p.id === comparePresetId) : null,
    [comparePresetId]
  );

  // Group tuning params for display
  const paramGroups = [
    { label: 'Oscillator', params: TUNING_PARAMS.filter(p => p.group === 'oscillator') },
    { label: 'Envelope', params: TUNING_PARAMS.filter(p => p.group === 'envelope') },
    { label: 'Filter', params: TUNING_PARAMS.filter(p => p.group === 'filter') },
    { label: 'Modulation', params: TUNING_PARAMS.filter(p => p.group === 'modulation') },
    { label: 'Effects', params: TUNING_PARAMS.filter(p => p.group === 'effects') },
    { label: 'Performance', params: TUNING_PARAMS.filter(p => p.group === 'performance') },
  ];

  // Build per-param suggestion lookup from compare results (for inline knob hints)
  const paramSuggestions = useMemo(() => {
    const map = {};
    if (!compareToSourceResult?.suggestions) return map;
    for (const s of compareToSourceResult.suggestions) {
      if (s.param && s.direction && !map[s.param]) {
        map[s.param] = { direction: s.direction, label: s.label };
      }
    }
    return map;
  }, [compareToSourceResult]);

  return (
    <div className={`${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'} border rounded-lg overflow-hidden`}>
      {/* Header — stacks on mobile */}
      <div className={`px-4 py-3 border-b ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Music className={`w-5 h-5 ${isDark ? 'text-ember-500' : 'text-ember-600'}`} />
            <h3 className={`font-bold ${t.text}`}>Vital Presets</h3>
            <a
              href="https://vital.audio/"
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs font-medium flex items-center gap-0.5 ${isDark ? 'text-zinc-500 hover:text-zinc-400' : 'text-zinc-400 hover:text-ember-600'}`}
            >
              Get Vital <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {selectedPresetId && (
            <div className="flex items-center gap-2">
              {!user && (
                <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>
                  Free account required
                </span>
              )}
              <button
                onClick={handleDownload}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  isDark
                    ? 'bg-white text-black hover:bg-stone-200'
                    : 'bg-ember-600 text-white hover:opacity-90 shadow-lg shadow-ember-500/20'
                }`}
              >
                {!user ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign up to download</span>
                    <span className="sm:hidden">Sign up</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download .vital</span>
                    <span className="sm:hidden">.vital</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className={`px-4 py-3 flex flex-wrap gap-2 border-b ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
        {PRESET_CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat.id;
          const count = CURATED_PRESETS.filter(p => p.category === cat.id).length;
          const CatIcon = CATEGORY_ICONS[cat.id] || Music;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSelectedPresetId(null);
                setTuningOverrides({});
                setShowSliders(false);
                setComparePresetId(null);
                stopPreview();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-all ${
                isActive
                  ? isDark
                    ? 'bg-white text-black'
                    : 'bg-ember-600 text-white'
                  : isDark
                    ? 'bg-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-600'
                    : 'bg-amber-50 text-ember-600 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <CatIcon className="w-3.5 h-3.5" />
              {cat.label}
              <span className={`text-[10px] ${isActive ? 'opacity-70' : 'opacity-50'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Spectral scoring status */}
      {sourceAudioData && (spectralScoringStatus === 'decoding' || spectralScoringStatus === 'scoring') && (
        <div className={`mx-4 mt-2 flex items-center gap-2 text-xs ${t.textMuted}`}>
          <Loader2 className="w-3 h-3 animate-spin" />
          {spectralScoringStatus === 'decoding' ? 'Preparing audio...' : 'Matching presets to your sound...'}
        </div>
      )}

      {/* Preset Cards Grid */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredPresets.map((preset, index) => {
          const isSelected = selectedPresetId === preset.id;
          const isCompared = comparePresetId === preset.id;
          const showCompareBtn = selectedPresetId && !isSelected && !isCompared;
          return (
            <div key={preset.id} className="relative">
              <button
                onClick={() => handleSelectPreset(preset.id)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? isDark
                      ? 'border-white bg-zinc-800'
                      : 'border-ember-600 bg-amber-50 shadow-md shadow-ember-500/10'
                    : isCompared
                      ? isDark
                        ? 'border-zinc-500 bg-zinc-900'
                        : 'border-ember-500/50 bg-amber-50'
                      : isDark
                        ? 'border-zinc-700 bg-zinc-950 hover:border-zinc-600'
                        : 'border-stone-200 bg-white hover:border-ember-600/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`font-semibold text-sm ${isSelected ? (isDark ? 'text-white' : 'text-ember-600') : t.text}`}>
                    {preset.name}
                  </div>
                  {/* Best Match badge on top preset */}
                  {analysisFeatures && index === 0 && preset._matchScore >= 40 && (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isDark
                        ? 'bg-ember-500/20 text-ember-500'
                        : 'bg-ember-600 text-white'
                    }`}>
                      <Star className="w-3 h-3" /> Best Match
                    </span>
                  )}
                </div>
                <div className={`text-xs mt-1 pr-6 ${t.textMuted}`}>
                  {preset.description}
                </div>
                {/* Match score bar */}
                {analysisFeatures && preset._matchScore > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${
                      isDark ? 'bg-zinc-800' : 'bg-stone-200'
                    }`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isSelected
                            ? isDark ? 'bg-white' : 'bg-ember-600'
                            : preset._matchScore >= 70
                              ? isDark ? 'bg-ember-500' : 'bg-ember-500'
                              : isDark ? 'bg-zinc-500' : 'bg-stone-400'
                        }`}
                        style={{ width: `${preset._matchScore}%` }}
                      />
                    </div>
                    <span className={`text-xs font-mono tabular-nums ${
                      isSelected
                        ? isDark ? 'text-white' : 'text-ember-600'
                        : preset._matchScore >= 70
                          ? isDark ? 'text-ember-500/70' : 'text-ember-600/70'
                          : t.textDimmed
                    }`}>
                      {preset._matchScore}%
                    </span>
                  </div>
                )}
                {isSelected && preset.matchReason && (
                  <div className={`text-[11px] mt-1.5 italic ${isDark ? 'text-ember-500' : 'text-ember-700'}`}>
                    {preset.matchReason}
                  </div>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {preset.tags.map(tag => (
                    <span
                      key={tag}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-amber-50 text-ember-700'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
              {/* Action buttons — top right corner */}
              <div className="absolute top-2 right-2 flex items-center gap-1">
                {/* Preview play button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPreview(preset.id);
                  }}
                  aria-label={previewingId === preset.id ? `Stop preview of ${preset.name}` : `Preview ${preset.name}`}
                  className={`p-2.5 rounded-full transition-all ${
                    previewingId === preset.id
                      ? isDark
                        ? 'text-ember-500 bg-ember-500/10 preset-preview-pulse'
                        : 'text-ember-600 bg-ember-600/10 preset-preview-pulse'
                      : previewLoading === preset.id
                        ? isDark
                          ? 'text-zinc-500'
                          : 'text-zinc-400'
                        : isDark
                          ? 'text-zinc-500 hover:text-white hover:bg-zinc-700'
                          : 'text-zinc-400 hover:text-ember-600 hover:bg-amber-50'
                  }`}
                >
                  {previewLoading === preset.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : previewingId === preset.id ? (
                    <Square className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                {/* Compare button — only show on non-selected, non-compared cards when a preset is selected */}
                {showCompareBtn && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setComparePresetId(preset.id);
                    }}
                    aria-label={`Compare with ${preset.name}`}
                    className={`p-1.5 rounded-md transition-all ${
                      isDark
                        ? 'text-zinc-500 hover:text-white hover:bg-zinc-700'
                        : 'text-zinc-400 hover:text-ember-600 hover:bg-amber-50'
                    }`}
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* A/B Comparison Panel */}
      {comparePresetA && comparePresetB && (
        <div className={`border-t ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
          {/* Comparison Header */}
          <div className={`px-4 py-3 flex items-center justify-between border-b ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
            <div className="flex items-center gap-2">
              <ArrowLeftRight className={`w-4 h-4 ${isDark ? 'text-ember-500' : 'text-ember-600'}`} />
              <span className={`text-sm font-medium ${t.text}`}>Comparing Presets</span>
            </div>
            <button
              onClick={() => setComparePresetId(null)}
              aria-label="Close comparison"
              className={`p-1.5 rounded-md transition-all ${
                isDark
                  ? 'text-zinc-500 hover:text-white hover:bg-zinc-700'
                  : 'text-zinc-400 hover:text-ember-600 hover:bg-amber-50'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Two-Column Comparison */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Column A — Current Preset */}
            <div className={`p-3 rounded-lg border ${
              isDark
                ? 'border-zinc-700 bg-zinc-950 border-l-2 border-l-white'
                : 'border-stone-200 bg-amber-50 border-l-2 border-l-ember-600'
            }`}>
              {/* Column A Header */}
              <div className="flex items-center gap-1.5 mb-2">
                <Star className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-ember-600'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-ember-600'}`}>
                  Current
                </span>
              </div>
              <div className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-ember-600'}`}>
                {comparePresetA.name}
              </div>
              <div className={`text-xs mt-1 line-clamp-2 ${t.textMuted}`}>
                {comparePresetA.description}
              </div>
              {comparePresetA.matchReason && (
                <div className={`text-[11px] mt-1.5 italic line-clamp-2 ${isDark ? 'text-ember-500' : 'text-ember-700'}`}>
                  {comparePresetA.matchReason}
                </div>
              )}

              {/* Column A Parameters */}
              <div className={`mt-3 pt-3 border-t ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
                <div className={`text-[10px] uppercase tracking-wider font-medium mb-2 ${t.textMuted}`}>
                  Parameters
                </div>
                <div className="space-y-1.5">
                  {TUNING_PARAMS.map(param => {
                    const valueA = comparePresetA.settings[param.vitalKey] ?? param.min;
                    const valueB = comparePresetB.settings[param.vitalKey] ?? param.min;
                    const isDifferent = valueA !== valueB;
                    return (
                      <div key={param.id} className="flex items-center justify-between">
                        <span className={`text-xs ${t.textMuted}`}>{param.label}</span>
                        <span className={`text-xs font-medium tabular-nums ${
                          isDifferent
                            ? isDark ? 'text-ember-500' : 'text-ember-600'
                            : t.textMuted
                        }`}>
                          {formatValue(param, valueA)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Keep This (Column A — already selected) */}
              <button
                onClick={() => setComparePresetId(null)}
                className={`w-full mt-3 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                  isDark
                    ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                    : 'bg-stone-900 text-white hover:bg-stone-800'
                }`}
              >
                Keep This
              </button>
            </div>

            {/* Column B — Compare Preset */}
            <div className={`p-3 rounded-lg border ${
              isDark
                ? 'border-zinc-700 bg-zinc-950'
                : 'border-stone-200 bg-white'
            }`}>
              {/* Column B Header — spacer to align with Column A content */}
              <div className="mb-2 h-[18px]" />
              <div className={`font-semibold text-sm ${t.text}`}>
                {comparePresetB.name}
              </div>
              <div className={`text-xs mt-1 line-clamp-2 ${t.textMuted}`}>
                {comparePresetB.description}
              </div>
              {comparePresetB.matchReason && (
                <div className={`text-[11px] mt-1.5 italic line-clamp-2 ${isDark ? 'text-ember-500' : 'text-ember-700'}`}>
                  {comparePresetB.matchReason}
                </div>
              )}

              {/* Column B Parameters */}
              <div className={`mt-3 pt-3 border-t ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
                <div className={`text-[10px] uppercase tracking-wider font-medium mb-2 ${t.textMuted}`}>
                  Parameters
                </div>
                <div className="space-y-1.5">
                  {TUNING_PARAMS.map(param => {
                    const valueA = comparePresetA.settings[param.vitalKey] ?? param.min;
                    const valueB = comparePresetB.settings[param.vitalKey] ?? param.min;
                    const isDifferent = valueA !== valueB;
                    return (
                      <div key={param.id} className="flex items-center justify-between">
                        <span className={`text-xs ${t.textMuted}`}>{param.label}</span>
                        <span className={`text-xs font-medium tabular-nums ${
                          isDifferent
                            ? isDark ? 'text-ember-500' : 'text-ember-600'
                            : t.textMuted
                        }`}>
                          {formatValue(param, valueB)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Select This (Column B — switch to this preset) */}
              <button
                onClick={handleSelectComparePreset}
                className={`w-full mt-3 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                  isDark
                    ? 'bg-white text-black hover:bg-stone-200'
                    : 'bg-ember-600 text-white hover:opacity-90 shadow-lg shadow-ember-500/20'
                }`}
              >
                Select This
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Community Presets */}
      {(communityPresets.length > 0 || communityLoading) && (
        <div className={`border-t ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
          <div className="px-4 py-3 flex items-center gap-2">
            <User className={`w-4 h-4 ${isDark ? 'text-ember-500' : 'text-ember-600'}`} />
            <span className={`text-sm font-medium ${t.text}`}>Community Presets</span>
            {!communityLoading && (
              <span className={`text-xs ${t.textMuted}`}>({communityPresets.length})</span>
            )}
          </div>

          {communityLoading ? (
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2].map(i => (
                <div
                  key={i}
                  className={`h-20 rounded-lg animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-stone-100'}`}
                />
              ))}
            </div>
          ) : (
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {communityPresets.map(preset => (
                <div
                  key={preset.id}
                  className={`p-3 rounded-lg border ${
                    isDark
                      ? 'border-zinc-700 bg-zinc-950'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className={`font-semibold text-sm truncate ${t.text}`}>
                        {sanitize(preset.title || 'Untitled')}
                      </div>
                      {preset.profiles && (
                        <div className={`flex items-center gap-1.5 mt-0.5 ${t.textMuted}`}>
                          {preset.profiles.avatar_url ? (
                            <img
                              src={preset.profiles.avatar_url}
                              alt=""
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-3.5 h-3.5" />
                          )}
                          <span className="text-xs truncate">{sanitize(preset.profiles.username || 'Anonymous')}</span>
                        </div>
                      )}
                    </div>
                    {preset.vital_preset_url && (
                      <button
                        onClick={async () => {
                          const { downloadRemotePreset, buildPresetFilename } = await getPresetGenerator();
                          const communityAuthor = preset.profiles?.username || 'SoundSauce';
                          const filename = buildPresetFilename({ presetName: sanitize(preset.title) });
                          downloadRemotePreset(preset.vital_preset_url, filename, {
                            preset_name: sanitize(preset.title) || 'Community Preset',
                            author: communityAuthor,
                            comments: `${sanitize(preset.title) || 'Untitled'} by ${communityAuthor}. Downloaded from SoundSauce (soundsauce.app).`,
                          });
                        }}
                        className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                          isDark
                            ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                            : 'bg-ember-600 text-white hover:opacity-90'
                        }`}
                      >
                        <Download className="w-3 h-3" />
                        .vital
                      </button>
                    )}
                  </div>
                  {preset.description && (
                    <div className={`text-xs mt-1.5 line-clamp-2 ${t.textMuted}`}>
                      {sanitize(preset.description)}
                    </div>
                  )}
                  <div className={`flex items-center gap-3 mt-2 text-[10px] ${t.textMuted}`}>
                    {(preset.like_count || 0) > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-3 h-3" /> {preset.like_count}
                      </span>
                    )}
                    {(preset.download_count || 0) > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Download className="w-3 h-3" /> {preset.download_count}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tuning Knobs */}
      {selectedPresetId && (
        <div className={`border-t ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
          {/* Knob Header — always visible, toggles slider content */}
          <button
            onClick={() => setShowSliders(prev => !prev)}
            className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
              isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-stone-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders className={`w-4 h-4 ${isDark ? 'text-ember-500' : 'text-ember-600'}`} />
              <span className={`text-sm font-medium ${t.text}`}>Fine Tune</span>
              {showSliders && (
                <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>Drag up/down · Double-click to reset</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {showSliders && (
                <span
                  onClick={(e) => { e.stopPropagation(); handlePlayTunedPreview(); }}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-all ${
                    previewingId === `${selectedPresetId}_tuned`
                      ? (isDark ? 'text-ember-400 bg-ember-500/20' : 'text-ember-700 bg-amber-100')
                      : previewLoading === `${selectedPresetId}_tuned`
                        ? (isDark ? 'text-zinc-400' : 'text-stone-400')
                        : isDark
                          ? 'text-zinc-400 hover:text-ember-400 hover:bg-zinc-700'
                          : 'text-stone-500 hover:text-ember-600 hover:bg-amber-50'
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-label={previewingId === `${selectedPresetId}_tuned` ? 'Stop preview' : 'Preview sound with current tuning'}
                >
                  {previewLoading === `${selectedPresetId}_tuned` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : previewingId === `${selectedPresetId}_tuned` ? (
                    <Square className="w-3 h-3" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                  {previewingId === `${selectedPresetId}_tuned` ? 'Playing' : 'Preview'}
                </span>
              )}
              {Object.keys(tuningOverrides).filter(k => !k.startsWith('_')).length > 0 && showSliders && (
                <span
                  onClick={(e) => { e.stopPropagation(); handleResetSliders(); }}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-all ${
                    isDark
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                      : 'text-zinc-400 hover:text-ember-600 hover:bg-amber-50'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset All
                </span>
              )}
              {showSliders ? (
                <ChevronUp className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-stone-400'}`} />
              ) : (
                <ChevronDown className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-stone-400'}`} />
              )}
            </div>
          </button>

          {/* Param Groups as Knob Rows — collapsible */}
          {showSliders && (
          <div className="px-4 pb-5 space-y-5">
            {/* Tuning status banner — shows auto-optimize progress or completed state */}
            {compareToSourceStatus !== 'idle' && compareToSourceStatus !== 'done' && compareToSourceStatus !== 'error' ? (
              <div className={`text-xs px-3 py-2 rounded-md flex items-center gap-2 ${isDark ? 'bg-ember-500/10 text-ember-400' : 'bg-amber-50 text-ember-700'}`}>
                <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                {compareToSourceStatus === 'optimizing' ? 'Auto-tuning knobs to match your sound...' : 'Analyzing match...'}
              </div>
            ) : Object.keys(tuningOverrides).filter(k => !k.startsWith('_')).length > 0 ? (
              <div className={`text-xs px-3 py-2 rounded-md ${isDark ? 'bg-ember-500/10 text-ember-400' : 'bg-amber-50 text-ember-700'}`}>
                {compareToSourceResult
                  ? `Auto-tuned to ${Math.round(compareToSourceResult.match_score)}% match — adjust highlighted knobs to fine-tune`
                  : 'Tuned to match your sound — highlighted knobs were adjusted from the preset defaults'}
              </div>
            ) : null}
            {paramGroups.map(group => (
              <div key={group.label}>
                <div className={`text-[10px] uppercase tracking-wider font-medium mb-3 ${t.textMuted}`}>
                  {group.label}
                </div>
                <div className="flex flex-wrap justify-start gap-x-5 gap-y-4">
                  {group.params.map(param => {
                    const val = getCurrentValue(param);
                    const hasOverride = tuningOverrides[param.id] !== undefined;
                    return (
                      <SynthKnob
                        key={param.id}
                        value={val}
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        defaultValue={getDefaultValue(param)}
                        label={param.label}
                        formattedValue={formatValue(param, val)}
                        description={param.description}
                        hasOverride={hasOverride}
                        isDark={isDark}
                        onChange={(newVal) => handleSliderChange(param.id, newVal)}
                        suggestion={paramSuggestions[param.id] || null}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Download button in fine tune section */}
            <div className="pt-2">
              <button
                onClick={handleDownload}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${
                  isDark
                    ? 'bg-white text-black hover:bg-stone-200'
                    : 'bg-ember-600 text-white hover:opacity-90 shadow-lg shadow-ember-500/20'
                }`}
              >
                {!user ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Sign up to download
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download .vital
                  </>
                )}
              </button>
            </div>
          </div>
          )}
        </div>
      )}

      {/* Source Match — auto-runs on preset select, compact inline display */}
      {selectedPresetId && sourceAudioData && (
        <div className={`border-t ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
          <div className="px-4 py-3">
            {/* Auto-optimize status bar */}
            {compareToSourceStatus !== 'idle' && compareToSourceStatus !== 'done' && compareToSourceStatus !== 'error' && (
              <div className={`flex items-center gap-2 text-xs ${t.textMuted}`}>
                <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                <span>
                  {compareToSourceStatus === 'generating' ? 'Generating preset audio...'
                    : compareToSourceStatus === 'decoding' ? 'Decoding your audio...'
                    : compareToSourceStatus === 'optimizing' ? 'Auto-tuning preset to match your sound...'
                    : 'Comparing frequencies...'}
                </span>
              </div>
            )}

            {/* Error State */}
            {compareToSourceError && (
              <div className={`flex items-center justify-between`}>
                <div className={`text-xs p-2 rounded-md flex-1 ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`} role="alert">
                  {compareToSourceError}
                </div>
                <button
                  onClick={handleCompareToSource}
                  className={`ml-2 flex items-center gap-1 px-2 py-1 text-xs rounded-md ${
                    isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-700' : 'text-stone-500 hover:text-ember-600 hover:bg-stone-100'
                  }`}
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}

            {/* Compact Results — score + bands + re-compare */}
            {compareToSourceResult && (
              <div className="space-y-3">
                {/* Score header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className={`w-3.5 h-3.5 ${isDark ? 'text-ember-500' : 'text-ember-600'}`} />
                    <span className={`text-xs font-medium ${t.text}`}>Source Match</span>
                    {compareToSourceResult.optimized && compareToSourceResult.improvement > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-50 text-green-600'
                      }`}>
                        +{compareToSourceResult.improvement}% auto-tuned
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold font-mono tabular-nums ${
                      compareToSourceResult.match_score >= 80
                        ? 'text-green-500'
                        : compareToSourceResult.match_score >= 60
                          ? isDark ? 'text-ember-500' : 'text-ember-600'
                          : 'text-red-500'
                    }`}>
                      {Math.round(compareToSourceResult.match_score)}%
                    </span>
                    <button
                      onClick={handleCompareToSource}
                      disabled={['generating', 'decoding', 'optimizing', 'comparing'].includes(compareToSourceStatus)}
                      className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md transition-all ${
                        isDark ? 'text-zinc-500 hover:text-white hover:bg-zinc-700' : 'text-stone-400 hover:text-ember-600 hover:bg-stone-100'
                      }`}
                      title="Re-run comparison after manual knob changes"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Per-Band Bars — compact horizontal */}
                {compareToSourceResult.matchResult?.bandDifferences && (
                  <div className="grid grid-cols-6 gap-1">
                    {[
                      { key: 'subBass', label: 'sub' },
                      { key: 'bass', label: 'bass' },
                      { key: 'lowMid', label: 'low' },
                      { key: 'mid', label: 'mid' },
                      { key: 'highMid', label: 'hi-m' },
                      { key: 'high', label: 'high' },
                    ].map(({ key, label }) => {
                      const bandData = compareToSourceResult.matchResult.bandDifferences[key];
                      const pct = bandData?.similarity ?? 0;
                      return (
                        <div key={key} className="flex flex-col items-center gap-0.5">
                          <div className={`w-full h-1 rounded-full overflow-hidden ${
                            isDark ? 'bg-zinc-700' : 'bg-stone-200'
                          }`}>
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                pct >= 80 ? 'bg-green-500'
                                  : pct >= 60 ? isDark ? 'bg-ember-500' : 'bg-ember-600'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-[8px] font-mono ${t.textDimmed}`}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Expectation note */}
                <p className={`text-[10px] italic ${t.textDimmed}`}>
                  Knobs auto-tuned to match your sound. The downloaded .vital preset will sound richer in Vital.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
