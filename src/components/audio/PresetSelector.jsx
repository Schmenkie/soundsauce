import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Download, RotateCcw, Music, Sliders, ExternalLink, Heart, User, Check, HelpCircle, ArrowLeftRight, X, Star, Volume2, Square, Loader2, Disc, Zap, Wind, Drum, Piano, Guitar as GuitarIcon, Megaphone, Music2, ChevronDown, ChevronUp } from 'lucide-react';
import { CURATED_PRESETS, PRESET_CATEGORIES, TUNING_PARAMS, INSTRUMENT_TO_CATEGORY, scorePresetMatch } from '../../data/vitalPresets';
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
export function PresetSelector({ detectedInstrument, audioTitle, theme, t, onPresetSelected, hasDownloadedPreset, onTrackDownload, analysisFeatures }) {
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

  const [selectedPresetId, setSelectedPresetId] = useState(initialBest);
  const [tuningOverrides, setTuningOverrides] = useState({});
  const [showSliders, setShowSliders] = useState(false);

  // Duplicate download warning state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const duplicateTimerRef = useRef(null);

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

  // Clean up timers and audio on unmount
  useEffect(() => {
    return () => {
      if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current);
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

  // Filter presets by category, score against analysis features, sort by score descending
  const filteredPresets = useMemo(() => {
    const inCategory = CURATED_PRESETS.filter(p => p.category === selectedCategory);
    if (!analysisFeatures) return inCategory;
    return inCategory
      .map(p => ({ ...p, _matchScore: scorePresetMatch(p, analysisFeatures) }))
      .sort((a, b) => b._matchScore - a._matchScore);
  }, [selectedCategory, analysisFeatures]);

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
    setSelectedPresetId(presetId);
    setTuningOverrides({}); // Reset overrides when switching presets
    setShowSliders(true);
    setShowDuplicateWarning(false);
    if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current);
    setComparePresetId(null); // Clear comparison when selecting a preset normally
    stopPreview(); // Stop any playing preview
    onPresetSelected?.(presetId, {});
  };

  const executeDownload = async () => {
    if (!selectedPresetId) return;

    // Capitalize instrument name for display (e.g. 'bass' → 'Bass', 'lead' → 'Lead')
    const instrumentName = detectedInstrument
      ? detectedInstrument.charAt(0).toUpperCase() + detectedInstrument.slice(1).toLowerCase()
      : '';

    const { buildVitalPreset, downloadVitalPreset, buildPresetFilename } = await getPresetGenerator();
    const preset = buildVitalPreset(selectedPresetId, tuningOverrides, {
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
    setShowDuplicateWarning(false);
    if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current);
  };

  const handleDownload = () => {
    if (!selectedPresetId) return;

    // Check for duplicate download
    if (hasDownloadedPreset?.(selectedPresetId) && !showDuplicateWarning) {
      setShowDuplicateWarning(true);
      // Auto-dismiss after 3 seconds
      duplicateTimerRef.current = setTimeout(() => {
        setShowDuplicateWarning(false);
      }, 3000);
      return;
    }

    executeDownload();
  };

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
    { label: 'Envelope', params: TUNING_PARAMS.filter(p => p.group === 'envelope') },
    { label: 'Filter', params: TUNING_PARAMS.filter(p => p.group === 'filter') },
    { label: 'Oscillator', params: TUNING_PARAMS.filter(p => p.group === 'oscillator') },
    { label: 'Effects', params: TUNING_PARAMS.filter(p => p.group === 'effects') },
  ];

  return (
    <div className={`${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'} border rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${isDark ? 'border-zinc-700' : 'border-stone-200'}`}>
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
            {showDuplicateWarning && (
              <span className={`text-xs ${isDark ? 'text-ember-500' : 'text-ember-600'}`}>
                Already in your library
              </span>
            )}
            <button
              onClick={showDuplicateWarning ? executeDownload : handleDownload}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                isDark
                  ? 'bg-white text-black hover:bg-stone-200'
                  : 'bg-ember-600 text-white hover:opacity-90 shadow-lg shadow-ember-500/20'
              }`}
            >
              {hasDownloadedPreset?.(selectedPresetId) ? (
                <>
                  <Check className="w-4 h-4" />
                  {showDuplicateWarning ? 'Download again' : 'Download .vital'}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download .vital
                </>
              )}
            </button>
          </div>
        )}
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
              {Object.keys(tuningOverrides).length > 0 && showSliders && (
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
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}
    </div>
  );
}
