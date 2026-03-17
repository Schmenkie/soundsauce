import { Sparkles, Scissors } from 'lucide-react';

/**
 * Analyze button section with region selection indicator.
 * Shown before analysis as the main call-to-action.
 */
export function AnalyzeSection({
  loopEnabled,
  loopStart,
  loopEnd,
  formatTime,
  isAnalyzing,
  onAnalyze,
  theme
}) {
  const hasRegion = loopEnabled && loopStart != null && loopEnd != null;

  return (
    <div className="mt-4 mb-6">
      {/* Region Selection Indicator */}
      {hasRegion && (
        <div className={`flex items-center gap-2 mb-3 px-3 py-2 text-sm rounded-lg ${
          theme === 'dark'
            ? 'bg-ember-500/10 border border-ember-500/30 text-ember-500'
            : 'bg-amber-50 border border-amber-200 text-ember-700'
        }`}>
          <Scissors className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">Analyzing selected region:</span>
          <span>{formatTime(loopStart)} - {formatTime(loopEnd)} ({(loopEnd - loopStart).toFixed(1)}s)</span>
        </div>
      )}

      <button
        onClick={onAnalyze}
        disabled={isAnalyzing}
        className={`w-full flex items-center justify-center gap-2 px-6 py-4 min-h-[52px] rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base ${
          theme === 'dark'
            ? 'bg-white text-black hover:bg-stone-200'
            : 'bg-ember-600 text-white hover:opacity-90 shadow-lg shadow-ember-500/20'
        }`}
        aria-label={hasRegion ? 'Analyze selected region' : 'Analyze audio'}
      >
        {hasRegion ? <Scissors className="w-5 h-5 flex-shrink-0" /> : <Sparkles className="w-5 h-5 flex-shrink-0" />}
        <span>
          {isAnalyzing ? 'Analyzing...' :
           hasRegion ? `Analyze Selection (${(loopEnd - loopStart).toFixed(1)}s)` :
           'Analyze'}
        </span>
      </button>
    </div>
  );
}
