import { Play, Pause, Download, Loader2, Scissors, X, Check, Mic, Disc, Activity, Piano, Music, Zap, Sparkles } from 'lucide-react';
import { trackStemSelected } from '../../lib/posthog';

/**
 * Stem configuration with icons and labels (using lucide-react icons)
 */
const STEM_CONFIG = {
  vocals: { icon: Mic, label: 'Vocals' },
  drums: { icon: Disc, label: 'Drums' },
  bass: { icon: Activity, label: 'Bass' },
  other: { icon: Piano, label: 'Other' },
};

/**
 * Progress bar component for separation status
 */
function SeparationProgress({ progress, status, theme }) {
  const statusMessages = {
    uploading: 'Uploading audio...',
    processing: 'Separating stems...',
    downloading: 'Downloading stems...',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className={theme === 'dark' ? 'text-zinc-400' : 'text-stone-500'}>
          {statusMessages[status] || 'Processing...'}
        </span>
        <span className={theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}>{progress}%</span>
      </div>
      <div className={`h-1 overflow-hidden rounded-full ${theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'}`}>
        <div
          className={`h-full transition-all duration-300 ${theme === 'dark' ? 'bg-white' : 'bg-black'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className={`text-xs text-center ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
        This may take 30-60 seconds depending on track length
      </p>
    </div>
  );
}

/**
 * Individual stem card with play/select functionality
 */
function StemCard({
  stemType,
  isAvailable,
  isSelected,
  isDownloaded,
  isPlaying,
  isAnalyzing,
  isAnalyzed,
  onSelect,
  onPlay,
  onDownload,
  onAnalyze,
  theme,
  t
}) {
  const config = STEM_CONFIG[stemType];

  if (!config) return null;

  const IconComponent = config.icon;

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
      aria-label={`Select ${config.label} stem`}
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
        <div>
          <div className="font-medium">
            {config.label}
          </div>
          {isAnalyzed && (
            <span className={`text-xs ${isSelected ? 'opacity-70' : t.textMuted}`}>Analyzed</span>
          )}
          {!isAnalyzed && isDownloaded && !isSelected && (
            <span className={`text-xs ${t.textMuted}`}>Ready</span>
          )}
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
              aria-label={`Analyze ${config.label} stem`}
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
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                isSelected
                  ? theme === 'dark' ? 'bg-black/20 hover:bg-black/30 text-black' : 'bg-white/20 hover:bg-white/30 text-white'
                  : t.button
              }`}
              aria-label={`Play ${config.label} stem`}
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
              className={`px-3 py-2 transition-colors ${
                isSelected
                  ? theme === 'dark' ? 'bg-black/20 hover:bg-black/30 text-black' : 'bg-white/20 hover:bg-white/30 text-white'
                  : t.button
              }`}
              aria-label={`Download ${config.label} stem`}
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
 * StemSelector component - UI for stem separation and selection
 */
export function StemSelector({
  // Stem separation state
  stems,
  stemAudioData,
  separationStatus,
  separationProgress,
  separationError,

  // Selection state
  selectedStem, // 'full' | 'vocals' | 'drums' | 'bass' | 'other'
  onSelectStem,

  // Playback state
  playingStem, // Currently playing stem type or null

  // Analysis state
  onAnalyzeStem, // callback(stemType) — triggers analysis on a stem
  analyzingStem, // Currently analyzing stem type or null
  analyzedStem, // Most recently analyzed stem type or null

  // Actions
  onSeparate,
  onPlayStem,
  onDownloadStem,
  onCancel,

  // UI props
  hasAudio, // Whether source audio is loaded
  freeTierLabel, // e.g. "2/mo free" for free tier users
  theme,
  t
}) {
  const isProcessing = separationStatus === 'uploading' || separationStatus === 'processing';
  const isExpired = separationStatus === 'expired';
  const hasStems = stems !== null;
  const stemTypes = ['vocals', 'drums', 'bass', 'other'];

  // Before separation - show separator button
  if (!hasStems && !isProcessing) {
    return (
      <div className={`p-4 ${t.card}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'}`}>
              <Scissors className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-black'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className={`font-medium ${t.text}`}>Separate Stems</h4>
                {freeTierLabel && (
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                    theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-50 text-ember-600'
                  }`}>
                    <Zap className="w-3 h-3" />
                    {freeTierLabel}
                  </span>
                )}
              </div>
              <p className={`text-sm ${t.textMuted}`}>
                Isolate vocals, drums, bass, and other instruments
              </p>
            </div>
          </div>

          <button
            onClick={onSeparate}
            disabled={!hasAudio}
            className={`px-4 py-2 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${t.button}`}
          >
            <Scissors className="w-4 h-4" />
            <span>Separate</span>
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
              <h4 className={`font-medium ${t.text}`}>Separating Stems</h4>
              <p className={`text-sm ${t.textMuted}`}>
                Using Demucs AI model
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className={`px-3 py-2 text-sm transition-colors ${t.button}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <SeparationProgress progress={separationProgress} status={separationStatus} theme={theme} />
      </div>
    );
  }

  // After separation - show stem cards
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
              Replicate CDN URLs expire after ~7 days. Click Separate Stems to re-process.
            </p>
          </div>
          <button
            onClick={onSeparate}
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

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'}`}>
            <Check className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-black'}`} />
          </div>
          <div>
            <h4 className={`font-medium ${t.text}`}>{isExpired ? 'Stems Expired' : 'Stems Ready'}</h4>
            <p className={`text-sm ${t.textMuted}`}>
              {isExpired ? 'Analysis results are still available' : 'Click Analyze on a stem to get started'}
            </p>
          </div>
        </div>

        {/* Full track option */}
        <button
          onClick={() => onSelectStem('full')}
          className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 rounded-md ${
            selectedStem === 'full'
              ? theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
              : t.button
          }`}
        >
          <Music className="w-4 h-4" />
          Full Track
        </button>
      </div>

      {/* Stem cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {stemTypes.map((stemType) => (
          <StemCard
            key={stemType}
            stemType={stemType}
            isAvailable={stems && stems[stemType]}
            isSelected={selectedStem === stemType}
            isDownloaded={!!stemAudioData[stemType]}
            isPlaying={playingStem === stemType}
            isAnalyzing={analyzingStem === stemType}
            isAnalyzed={analyzedStem === stemType}
            onSelect={onSelectStem}
            onPlay={onPlayStem}
            onDownload={onDownloadStem}
            onAnalyze={onAnalyzeStem}
            theme={theme}
            t={t}
          />
        ))}
      </div>

      {separationError && (
        <div className={`mt-3 p-3 ${theme === 'dark' ? 'bg-red-950' : 'bg-red-50'}`}>
          <p className="text-sm text-red-500">{separationError}</p>
        </div>
      )}
    </div>
  );
}
