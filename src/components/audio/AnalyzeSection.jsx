import { Sparkles, Scissors } from 'lucide-react';

/**
 * "Deeper analysis" — runs the sound-design analyzer (features, envelope, instrument
 * guess, Vital recipe). It predates the remix pivot and sits below the stems as a
 * secondary control: one mono line and a button, not a hero.
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
  const isDark = theme === 'dark';
  const hasRegion = loopEnabled && loopStart != null && loopEnd != null;

  return (
    <div className={`mt-2 mb-6 flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg border ${isDark ? 'bg-[#0D0F12] border-[#1C2027]' : 'bg-white border-[#D9DDE3]'}`}>
      <Sparkles className="w-4 h-4 text-ember-500" />
      <div className="flex-1 min-w-[200px]">
        <div className={`font-display font-bold uppercase tracking-wide text-[12px] ${isDark ? 'text-[#E8ECF1]' : 'text-[#0F1216]'}`}>Deeper analysis</div>
        <div className={`font-mono text-[11px] ${isDark ? 'text-[#7C8794]' : 'text-[#6B7280]'}`}>
          {hasRegion
            ? <><Scissors className="w-3 h-3 inline -mt-0.5 mr-1" />region {formatTime(loopStart)} → {formatTime(loopEnd)} · {(loopEnd - loopStart).toFixed(1)}s</>
            : 'envelope, timbre, instrument guess and a Vital recipe — drag a region on the waveform to focus it'}
        </div>
      </div>
      <button
        onClick={onAnalyze}
        disabled={isAnalyzing}
        className={`h-9 px-4 rounded-md border font-mono text-[12px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isDark ? 'bg-[#14171C] border-[#1C2027] text-[#E8ECF1] hover:border-ember-500/70' : 'bg-[#F5F6F8] border-[#D9DDE3] text-[#0F1216] hover:border-ember-600/70'
        }`}
        aria-label={hasRegion ? 'Analyze selected region' : 'Analyze audio'}
      >
        {isAnalyzing ? 'analyzing…' : hasRegion ? 'analyze region' : 'analyze'}
      </button>
    </div>
  );
}
