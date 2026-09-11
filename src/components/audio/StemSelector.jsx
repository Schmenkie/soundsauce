import { useState } from 'react';
import {
  Play, Pause, Download, Loader2, Scissors, X, Check, Mic, Disc, Activity, Piano,
  Music, Sparkles, Guitar, Layers, Cloud, CloudOff, Package, RotateCcw
} from 'lucide-react';
import { trackStemSelected } from '../../lib/posthog';
import { SEPARATION_MODES, getStemLabel } from '../../utils/stemFiles';

/**
 * Icons per stem key. Labels come from getStemLabel() so `other` reads as
 * "Instrumental" in two-stem mode.
 */
const STEM_ICONS = {
  vocals: Mic,
  drums: Disc,
  bass: Activity,
  guitar: Guitar,
  piano: Piano,
  other: Layers,
};

/**
 * Progress bar component for separation status
 */
function SeparationProgress({ progress, status, mode, quality, theme }) {
  const statusMessages = {
    uploading: 'Uploading audio...',
    processing: mode === 'vocals' ? 'Isolating vocals...' : 'Separating stems...',
    downloading: 'Downloading stems...',
  };
  // Measured: htdemucs_ft on a 2:40 track finished in ~35s on Replicate's GPU (plus upload + cold start)
  const eta = quality === 'best' && mode !== 'stems6'
    ? 'Fine-tuned model — usually 1-2 minutes including upload'
    : 'Usually under a minute including upload';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className={theme === 'dark' ? 'text-zinc-400' : 'text-stone-500'}>
          {statusMessages[status] || 'Processing...'}
        </span>
        <span className={`font-mono tabular-nums ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>{progress}%</span>
      </div>
      <div className={`h-1 overflow-hidden rounded-full ${theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'}`}>
        <div
          className={`h-full transition-all duration-300 ${theme === 'dark' ? 'bg-ember-500' : 'bg-ember-600'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className={`text-xs text-center ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {eta}
      </p>
    </div>
  );
}

/**
 * Small cloud badge showing whether a stem has been re-hosted on our storage
 */
function KeepBadge({ state, onKeep, label, theme, inverted }) {
  const muted = inverted ? 'opacity-70' : (theme === 'dark' ? 'text-zinc-500' : 'text-stone-400');
  if (state === 'saved') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${inverted ? 'opacity-80' : (theme === 'dark' ? 'text-ember-400' : 'text-ember-600')}`} title="Saved permanently">
        <Cloud className="w-3 h-3" /> Kept
      </span>
    );
  }
  if (state === 'saving') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${muted}`}>
        <Loader2 className="w-3 h-3 animate-spin" /> Saving…
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onKeep(); }}
      className={`inline-flex items-center gap-1 text-xs hover:underline ${state === 'error' ? 'text-red-500' : muted}`}
      aria-label={`Keep ${label} stem permanently`}
      title={state === 'error' ? 'Save failed — click to retry' : 'Expires in ~7 days. Click to keep permanently.'}
    >
      <CloudOff className="w-3 h-3" /> {state === 'error' ? 'Retry keep' : 'Keep'}
    </button>
  );
}

/**
 * Individual stem card with play/select functionality
 */
function StemCard({
  stemType,
  mode,
  isAvailable,
  isSelected,
  isDownloaded,
  isPlaying,
  isAnalyzing,
  isAnalyzed,
  keepState,
  onSelect,
  onPlay,
  onDownload,
  onAnalyze,
  onKeep,
  theme,
  t
}) {
  const IconComponent = STEM_ICONS[stemType] || Layers;
  const label = getStemLabel(stemType, mode);

  return (
    <div
      role="button"
      tabIndex={isAvailable ? 0 : -1}
      onClick={() => {
        if (isAvailable) {
          onSelect(stemType);
          trackStemSelected(stemType);
        }
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && isAvailable) {
          e.preventDefault();
          onSelect(stemType);
          trackStemSelected(stemType);
        }
      }}
      aria-label={`Select ${label} stem`}
      className={`relative p-4 rounded-lg transition-colors cursor-pointer ${
        isSelected
          ? theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
          : isAvailable
            ? theme === 'dark'
              ? 'bg-zinc-800 hover:bg-zinc-700'
              : 'bg-stone-100 hover:bg-stone-200'
            : theme === 'dark'
              ? 'bg-zinc-900 opacity-50 cursor-not-allowed'
              : 'bg-stone-100 opacity-50 cursor-not-allowed'
      }`}
    >
      {/* Analyzed checkmark indicator */}
      {isAnalyzed && (
        <div className="absolute top-2 right-2">
          <div className={`w-5 h-5 flex items-center justify-center rounded-full ${
            isSelected
              ? theme === 'dark' ? 'bg-black' : 'bg-white'
              : theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'
          }`}>
            <Check className={`w-3 h-3 ${
              isSelected
                ? theme === 'dark' ? 'text-white' : 'text-black'
                : theme === 'dark' ? 'text-white' : 'text-black'
            }`} />
          </div>
        </div>
      )}

      {/* Stem icon and label */}
      <div className="flex items-center gap-3 mb-3">
        <IconComponent className="w-6 h-6" />
        <div className="min-w-0">
          <div className="font-medium">
            {label}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAnalyzed ? (
              <span className={`text-xs ${isSelected ? 'opacity-70' : t.textMuted}`}>Analyzed</span>
            ) : isDownloaded && !isSelected ? (
              <span className={`text-xs ${t.textMuted}`}>Ready</span>
            ) : null}
            {isAvailable && (
              <KeepBadge state={keepState} onKeep={() => onKeep(stemType)} label={label} theme={theme} inverted={isSelected} />
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {isAvailable && (
        <div className="space-y-2">
          {/* Primary: Analyze button */}
          {onAnalyze && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAnalyze(stemType);
              }}
              disabled={isAnalyzing}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isSelected
                  ? theme === 'dark' ? 'bg-black/30 hover:bg-black/40 text-black' : 'bg-white/30 hover:bg-white/40 text-white'
                  : theme === 'dark'
                    ? 'bg-white text-black hover:bg-stone-200'
                    : 'bg-gradient-to-r from-ember-500 to-amber-600 text-white hover:opacity-90 shadow-sm shadow-ember-500/20'
              }`}
              aria-label={`Analyze ${label} stem`}
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isAnalyzing ? 'Analyzing...' : 'Analyze'}</span>
            </button>
          )}

          {/* Secondary: Play + Download */}
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay(stemType);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isSelected
                  ? theme === 'dark' ? 'bg-black/20 hover:bg-black/30 text-black' : 'bg-white/20 hover:bg-white/30 text-white'
                  : t.button
              }`}
              aria-label={`Play ${label} stem`}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(stemType);
              }}
              className={`px-3 py-2 rounded-md transition-colors ${
                isSelected
                  ? theme === 'dark' ? 'bg-black/20 hover:bg-black/30 text-black' : 'bg-white/20 hover:bg-white/30 text-white'
                  : t.button
              }`}
              aria-label={`Download ${label} stem`}
              title="Download FLAC (stamped with BPM + key)"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Segmented control for picking the separation mode before running
 */
function ModePicker({ mode, onChange, theme }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Separation mode">
      {SEPARATION_MODES.map((m) => {
        const active = m.id === mode;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m.id)}
            className={`text-left p-3 rounded-lg border transition-colors ${
              active
                ? theme === 'dark'
                  ? 'border-ember-500 bg-ember-500/10 text-zinc-50'
                  : 'border-ember-600 bg-amber-50 text-stone-900'
                : theme === 'dark'
                  ? 'border-zinc-700 hover:border-zinc-600 text-zinc-300'
                  : 'border-stone-200 hover:border-stone-300 text-stone-700'
            }`}
          >
            <div className="text-sm font-medium">{m.label}</div>
            <div className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-zinc-500' : 'text-stone-500'}`}>{m.description}</div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * StemSelector component - UI for stem separation and selection
 */
export function StemSelector({
  // Stem separation state
  stems,
  stemTypes, // ordered list of available stem keys
  mode: resultMode, // mode that produced the current stems
  stemAudioData,
  separationStatus,
  separationProgress,
  separationError,
  keepStatus, // { [stemType]: 'saving' | 'saved' | 'error' }

  // Selection state
  selectedStem, // 'full' | stem key
  onSelectStem,

  // Playback state
  playingStem, // Currently playing stem type or null

  // Analysis state
  onAnalyzeStem, // callback(stemType) — triggers analysis on a stem
  analyzingStem, // Currently analyzing stem type or null
  analyzedStem, // Most recently analyzed stem type or null

  // Actions
  onSeparate, // callback({ mode, quality })
  onPlayStem,
  onDownloadStem, // callback(stemType) — stamped single-file download
  onDownloadPack, // callback() — zip of all stems + notes.txt
  onKeepStem, // callback(stemType) — re-host on permanent storage
  onKeepAll,
  onCancel,
  onReset, // start a new separation with a different mode

  // UI props
  hasAudio, // Whether source audio is loaded
  theme,
  t
}) {
  const [pickedMode, setPickedMode] = useState('vocals');
  const [quality, setQuality] = useState('best');
  const [isPacking, setIsPacking] = useState(false);

  const isProcessing = separationStatus === 'uploading' || separationStatus === 'processing';
  const isExpired = separationStatus === 'expired';
  const hasStems = stems !== null;
  const availableTypes = stemTypes && stemTypes.length
    ? stemTypes
    : (stems ? Object.keys(stems).filter(k => stems[k]) : []);
  const modeInfo = SEPARATION_MODES.find(m => m.id === resultMode) || SEPARATION_MODES[0];
  const keepStates = keepStatus || {};
  const allKept = availableTypes.length > 0 && availableTypes.every(k => keepStates[k] === 'saved');
  const anySaving = availableTypes.some(k => keepStates[k] === 'saving');

  const handleDownloadPack = async () => {
    if (!onDownloadPack || isPacking) return;
    setIsPacking(true);
    try {
      await onDownloadPack();
    } finally {
      setIsPacking(false);
    }
  };

  // Before separation - show mode picker + separate button
  if (!hasStems && !isProcessing) {
    return (
      <div className={`p-4 ${t.card}`}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'}`}>
              <Scissors className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-black'}`} />
            </div>
            <div>
              <h4 className={`font-medium ${t.text}`}>Separate Stems</h4>
              <p className={`text-sm ${t.textMuted}`}>
                Lossless FLAC, stamped with BPM and key — drops straight into Live
              </p>
            </div>
          </div>
        </div>

        <ModePicker mode={pickedMode} onChange={setPickedMode} theme={theme} />

        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          {/* Quality toggle — 6-stem only has one model */}
          <div className="flex items-center gap-2 text-xs">
            <span className={t.textMuted}>Quality</span>
            <div className={`inline-flex rounded-md overflow-hidden border ${theme === 'dark' ? 'border-zinc-700' : 'border-stone-200'}`} role="radiogroup" aria-label="Separation quality">
              {[
                { id: 'best', label: 'Best' },
                { id: 'fast', label: 'Fast' },
              ].map(q => {
                const active = quality === q.id;
                const disabled = pickedMode === 'stems6';
                return (
                  <button
                    key={q.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={disabled}
                    onClick={() => setQuality(q.id)}
                    className={`px-3 py-1.5 transition-colors disabled:opacity-50 ${
                      active
                        ? theme === 'dark' ? 'bg-zinc-700 text-zinc-50' : 'bg-stone-900 text-white'
                        : theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800' : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {q.label}
                  </button>
                );
              })}
            </div>
            <span className={t.textMuted}>
              {pickedMode === 'stems6' ? 'htdemucs_6s' : quality === 'best' ? 'htdemucs_ft · cleanest' : 'htdemucs · quicker'}
            </span>
          </div>

          <button
            onClick={() => onSeparate({ mode: pickedMode, quality })}
            disabled={!hasAudio}
            className={`px-4 py-2 font-medium text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
              theme === 'dark'
                ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
                : 'bg-ember-600 text-white hover:bg-ember-700'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>{pickedMode === 'vocals' ? 'Grab Vocals' : 'Separate'}</span>
          </button>
        </div>

        {separationError && (
          <div className={`mt-3 p-3 rounded-md ${theme === 'dark' ? 'bg-red-950' : 'bg-red-50'}`}>
            <p className="text-sm text-red-500">{separationError}</p>
          </div>
        )}
      </div>
    );
  }

  // During separation - show progress
  if (isProcessing) {
    return (
      <div className={`p-4 ${t.card}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${theme === 'dark' ? 'bg-zinc-700' : 'bg-stone-200'}`}>
              <Loader2 className={`w-5 h-5 animate-spin ${theme === 'dark' ? 'text-white' : 'text-black'}`} />
            </div>
            <div>
              <h4 className={`font-medium ${t.text}`}>{pickedMode === 'vocals' ? 'Grabbing Vocals' : 'Separating Stems'}</h4>
              <p className={`text-sm ${t.textMuted}`}>
                Demucs · {SEPARATION_MODES.find(m => m.id === pickedMode)?.label}
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className={`px-3 py-2 text-sm rounded-md transition-colors ${t.button}`}
            aria-label="Cancel separation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <SeparationProgress progress={separationProgress} status={separationStatus} mode={pickedMode} quality={quality} theme={theme} />
      </div>
    );
  }

  // After separation - show stem cards
  const gridCols = availableTypes.length <= 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : availableTypes.length <= 4
      ? 'grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`p-4 ${t.card}`}>
      {/* Expired stems banner */}
      {isExpired && (
        <div className={`flex items-center gap-3 p-3 mb-4 rounded-lg ${
          theme === 'dark' ? 'bg-amber-950 border border-amber-800' : 'bg-amber-50 border border-amber-300'
        }`}>
          <Scissors className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>
              Stems have expired
            </p>
            <p className={`text-xs ${theme === 'dark' ? 'text-amber-500' : 'text-amber-600'}`}>
              Unkept stems live on Replicate's CDN for ~7 days. Separate again to re-process.
            </p>
          </div>
          <button
            onClick={onReset}
            disabled={!hasAudio}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              theme === 'dark'
                ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                : 'bg-ember-600 text-white hover:opacity-90'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Scissors className="w-3.5 h-3.5" />
            Re-separate
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'}`}>
            <Check className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-black'}`} />
          </div>
          <div>
            <h4 className={`font-medium ${t.text}`}>{isExpired ? 'Stems Expired' : `${modeInfo.label} Ready`}</h4>
            <p className={`text-sm ${t.textMuted}`}>
              {isExpired
                ? 'Analysis results are still available'
                : allKept
                  ? 'Saved permanently — download any time'
                  : anySaving
                    ? 'Saving stems to your storage…'
                    : 'Download as FLAC or keep them permanently'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isExpired && !allKept && onKeepAll && (
            <button
              onClick={onKeepAll}
              disabled={anySaving}
              className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 rounded-md disabled:opacity-50 ${t.button}`}
              title="Re-host all stems on permanent storage"
            >
              {anySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
              <span className="hidden sm:inline">Keep all</span>
            </button>
          )}

          {!isExpired && onDownloadPack && (
            <button
              onClick={handleDownloadPack}
              disabled={isPacking}
              className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 rounded-md disabled:opacity-50 ${
                theme === 'dark'
                  ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
                  : 'bg-ember-600 text-white hover:bg-ember-700'
              }`}
              title="Zip of all stems + notes.txt with BPM, key and Camelot info"
            >
              {isPacking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              <span>{isPacking ? 'Packing…' : 'Remix Pack'}</span>
            </button>
          )}

          {/* Full track option */}
          <button
            onClick={() => onSelectStem('full')}
            className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 rounded-md ${
              selectedStem === 'full'
                ? theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
                : t.button
            }`}
          >
            <Music className="w-4 h-4" />
            <span className="hidden sm:inline">Full Track</span>
          </button>

          {onReset && !isExpired && (
            <button
              onClick={onReset}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${t.button}`}
              aria-label="Start a new separation"
              title="Separate again with a different mode"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stem cards grid */}
      <div className={`grid ${gridCols} gap-2`}>
        {availableTypes.map((stemType) => (
          <StemCard
            key={stemType}
            stemType={stemType}
            mode={resultMode}
            isAvailable={!!(stems && stems[stemType])}
            isSelected={selectedStem === stemType}
            isDownloaded={!!stemAudioData[stemType]}
            isPlaying={playingStem === stemType}
            isAnalyzing={analyzingStem === stemType}
            isAnalyzed={analyzedStem === stemType}
            keepState={keepStates[stemType]}
            onSelect={onSelectStem}
            onPlay={onPlayStem}
            onDownload={onDownloadStem}
            onAnalyze={onAnalyzeStem}
            onKeep={onKeepStem}
            theme={theme}
            t={t}
          />
        ))}
      </div>

      {separationError && (
        <div className={`mt-3 p-3 rounded-md ${theme === 'dark' ? 'bg-red-950' : 'bg-red-50'}`}>
          <p className="text-sm text-red-500">{separationError}</p>
        </div>
      )}
    </div>
  );
}
