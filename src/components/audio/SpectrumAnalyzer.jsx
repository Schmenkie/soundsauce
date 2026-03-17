import { Volume2, Repeat } from 'lucide-react';

/**
 * Real-time frequency spectrum visualizer with clean grayscale/accent coloring.
 */
export function SpectrumAnalyzer({
  spectrumData,
  isPlaying,
  loopEnabled,
  theme,
  t
}) {
  return (
    <div className={`p-6 mb-6 ${t.card}`}>
      <div className="mb-4 flex justify-between items-center">
        <div className={`text-sm font-medium ${t.textMuted}`}>Frequency Spectrum</div>
        <div className="flex items-center gap-2">
          {loopEnabled && <span className={`text-xs flex items-center gap-1 ${t.textMuted}`}><Repeat className="w-3 h-3" /> Loop Active</span>}
          <div className={`text-xs ${t.textDimmed}`}>{isPlaying ? 'Playing...' : 'Paused'}</div>
        </div>
      </div>
      <div className="relative">
        <div className="flex items-end justify-between gap-0.5 h-48">
          {spectrumData.length > 0 ? (
            spectrumData.map((value, i) => {
              const height = Math.max(value * 100, 3);
              const intensity = Math.min(value * 1.5, 1);

              return (
                <div
                  key={i}
                  className="flex-1 transition-all duration-75"
                  style={{
                    height: height + '%',
                    backgroundColor: theme === 'dark' ? '#F59E0B' : '#D97706',
                    opacity: theme === 'dark' ? 0.15 + intensity * 0.85 : 0.1 + intensity * 0.9,
                    minWidth: '3px',
                    maxWidth: '12px'
                  }}
                />
              );
            })
          ) : (
            <div className={`flex flex-col items-center justify-center w-full h-full ${t.textDimmed} gap-3`}>
              <Volume2 className="w-12 h-12 opacity-20" />
              <div className="text-sm opacity-50">Press play to see frequencies</div>
            </div>
          )}
        </div>
        {spectrumData.length > 0 && (
          <div className={`flex justify-between mt-3 text-xs ${t.textDimmed}`}>
            <span>20 Hz</span>
            <span>200 Hz</span>
            <span>2 kHz</span>
            <span>20 kHz</span>
          </div>
        )}
      </div>
    </div>
  );
}
