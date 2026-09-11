import { useMemo } from 'react';
import { Volume2, Repeat } from 'lucide-react';
import { spectrumColor, hzToSpectrumT } from '../../utils/spectrum';

const NUM_BARS = 64;
const NYQUIST = 22050;

/**
 * Real-time frequency spectrum — Signal Deck: every bar wears the colour of the
 * frequency it represents (violet sub → blue low-mids → green mids → yellow high-mids → red air).
 */
export function SpectrumAnalyzer({
  spectrumData,
  isPlaying,
  loopEnabled,
  theme,
  t
}) {
  const isDark = theme === 'dark';

  // Bar i in useAudioProcessor maps to (i/64)^2.5 of Nyquist — colour by that frequency
  const barColors = useMemo(() => Array.from({ length: NUM_BARS }, (_, i) => {
    const hz = Math.pow(i / NUM_BARS, 2.5) * NYQUIST;
    return spectrumColor(hzToSpectrumT(hz));
  }), []);

  return (
    <div className={`p-5 mb-6 ${t.card}`}>
      <div className="mb-3 flex justify-between items-center">
        <div className={`font-display font-bold uppercase tracking-wide text-xs ${t.textMuted}`}>Spectrum</div>
        <div className={`flex items-center gap-3 font-mono text-[11px] ${t.textDimmed}`}>
          {loopEnabled && <span className="flex items-center gap-1"><Repeat className="w-3 h-3" /> loop</span>}
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-ember-500 animate-pulse' : isDark ? 'bg-[#2A3039]' : 'bg-[#CDD2DA]'}`} />
            {isPlaying ? 'live' : 'idle'}
          </span>
        </div>
      </div>
      <div className="relative">
        <div className="flex items-end justify-between gap-0.5 h-40">
          {spectrumData.length > 0 ? (
            spectrumData.map((value, i) => {
              const height = Math.max(value * 100, 2);
              const intensity = Math.min(value * 1.6, 1);
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-[2px] transition-all duration-75"
                  style={{
                    height: height + '%',
                    backgroundColor: barColors[i] || barColors[NUM_BARS - 1],
                    opacity: isDark ? 0.25 + intensity * 0.75 : 0.3 + intensity * 0.7,
                    minWidth: '3px',
                    maxWidth: '12px'
                  }}
                />
              );
            })
          ) : (
            <div className={`flex flex-col items-center justify-center w-full h-full ${t.textDimmed} gap-3`}>
              <Volume2 className="w-10 h-10 opacity-20" />
              <div className="font-mono text-xs opacity-60">press play to see the spectrum</div>
            </div>
          )}
        </div>
        {/* Frequency ruler — the legend for the whole colour system */}
        <div className="mt-2 rule-spectrum opacity-70" aria-hidden="true" />
        <div className={`flex justify-between mt-1.5 font-mono text-[10px] tabular-nums ${t.textDimmed}`}>
          <span>20 Hz</span>
          <span>200 Hz</span>
          <span>2 kHz</span>
          <span>20 kHz</span>
        </div>
      </div>
    </div>
  );
}
