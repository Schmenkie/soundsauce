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
        <div className={`flex items-center gap-2 mb-3 px-3 py-2 font-mono text-[12px] rounded-md border ${
          theme === 'dark'
            ? 'bg-[#0D0F12] border-ember-500/40 text-ember-500'
            : 'bg-white border-ember-600/40 text-ember-700'
        }`}>
          <Scissors className="w-4 h-4 flex-shrink-0" />
          <span>region</span>
          <span className="tabular-nums">{formatTime(loopStart)} → {formatTime(loopEnd)} · {(loopEnd - loopStart).toFixed(1)}s</span>
        </div>
      )}

      <button
        onClick={onAnalyze}
        disabled={isAnalyzing}
        className={`relative w-full flex items-center justify-center gap-2 px-6 py-4 min-h-[52px] rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed font-display font-bold uppercase tracking-wide text-sm overflow-hidden ${
          theme === 'dark'
            ? 'bg-[#14171C] text-[#E8ECF1] border border-[#2A3039] hover:border-ember-500/70'
            : 'bg-white text-[#0F1216] border border-[#B8BEC7] hover:border-ember-600/70'
        }`}
        aria-label={hasRegion ? 'Analyze selected region' : 'Analyze audio'}
      >
        {/* Spectrum rule along the bottom edge — the analyze button is the instrument's "run" key */}
        <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-spectrum" aria-hidden="true" />
        {hasRegion ? <Scissors className="w-5 h-5 flex-shrink-0 text-ember-500" /> : <Sparkles className="w-5 h-5 flex-shrink-0 text-ember-500" />}
        <span>
          {isAnalyzing ? 'Analyzing...' :
           hasRegion ? `Analyze Selection (${(loopEnd - loopStart).toFixed(1)}s)` :
           'Analyze'}
        </span>
      </button>
    </div>
  );
}
