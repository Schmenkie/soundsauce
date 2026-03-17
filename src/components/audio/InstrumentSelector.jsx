import { useState } from 'react';
import {
  Music, Cpu, Scissors, MousePointerClick, ArrowDown, ChevronDown, ChevronUp, Check, Loader2
} from 'lucide-react';
import { InstrumentIllustration } from '../ui/InstrumentIllustration';

/**
 * Full Mix Guidance Banner — shown when the analyzer detects a full mix.
 * Guides users toward stem separation or region selection for better results.
 */
function FullMixGuidance({ onSeparateStems, onSelectRegion, hasStemsReady, theme, t }) {
  return (
    <div className={`p-4 rounded-lg border-2 mb-4 ${
      theme === 'dark'
        ? 'bg-zinc-900 border-zinc-700'
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-md flex-shrink-0 ${
          theme === 'dark' ? 'bg-zinc-700' : 'bg-ember-600'
        }`}>
          <Music className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className={`font-bold text-sm mb-1 ${t.text}`}>
            This sounds like a full mix
          </h4>
          <p className={`text-sm ${t.textMuted}`}>
            Multiple instruments detected. For more accurate results, try one of these:
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Option 1: Separate Stems */}
        <button
          onClick={onSeparateStems}
          className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
            theme === 'dark'
              ? 'bg-ember-500 hover:bg-ember-600 text-zinc-950 border border-ember-500'
              : 'bg-ember-600 hover:bg-ember-700 text-white border border-ember-600 shadow-lg shadow-ember-500/20'
          }`}
        >
          <div className={`p-2 rounded-md flex-shrink-0 ${
            theme === 'dark' ? 'bg-black/20' : 'bg-white/20'
          }`}>
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-medium">
              {hasStemsReady ? 'Select a Stem Above' : 'Separate Stems'}
            </div>
            <div className={`text-xs ${theme === 'dark' ? 'text-zinc-950/70' : 'text-white/80'}`}>
              {hasStemsReady ? 'Pick vocals, drums, bass, or other' : 'AI isolates each instrument'}
            </div>
          </div>
          <ArrowDown className={`w-4 h-4 ml-auto flex-shrink-0 ${theme === 'dark' ? 'text-zinc-950/50' : 'text-white/60'}`} />
        </button>

        {/* Option 2: Select a Region */}
        <button
          onClick={onSelectRegion}
          className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
            theme === 'dark'
              ? 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600'
              : 'bg-white hover:bg-amber-50 border border-stone-200 hover:border-ember-600 hover:shadow-md hover:shadow-ember-500/10'
          }`}
        >
          <div className={`p-2 rounded-md flex-shrink-0 ${
            theme === 'dark' ? 'bg-zinc-700' : 'bg-amber-50'
          }`}>
            <MousePointerClick className={`w-4 h-4 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
          </div>
          <div>
            <div className={`text-sm font-medium ${t.text}`}>
              Select a Region
            </div>
            <div className={`text-xs ${t.textMuted}`}>
              Drag on waveform to isolate a section
            </div>
          </div>
          <ArrowDown className={`w-4 h-4 ml-auto flex-shrink-0 ${t.textDimmed}`} />
        </button>
      </div>
    </div>
  );
}

/**
 * Displays detected instruments after analysis as a user-selectable picker.
 * Detection pre-fills the best match as a "smart default."
 * When user selects a different instrument, recommendations update instantly.
 *
 * When a full mix is detected, shows guidance to separate stems or select
 * a region before showing the instrument grid.
 */
export function InstrumentSelector({
  detectedInstruments,
  selectedInstrument,
  onSelectInstrument,
  instrumentLabels,
  theme,
  t,
  onSeparateStems,
  onSelectRegion,
  hasStemsReady,
  aiDetectionStatus
}) {
  const [showInstrumentGrid, setShowInstrumentGrid] = useState(false);

  const isFullMix = detectedInstruments?.isFullMix;

  if (!detectedInstruments) return null;

  return (
    <div className={`mb-6 p-4 ${t.card}`}>
      <h4 className={`text-sm font-medium ${t.textMuted} mb-3 flex items-center gap-2`}>
        What instrument is this?
        {detectedInstruments.mlEnhanced && (
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            theme === 'dark'
              ? 'bg-zinc-700 text-white'
              : 'bg-ember-600 text-white'
          }`}>
            <Cpu className="w-3 h-3" />
            AI Suggested
          </span>
        )}
        {(aiDetectionStatus === 'uploading' || aiDetectionStatus === 'detecting') && !detectedInstruments.mlEnhanced && (
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            theme === 'dark'
              ? 'bg-zinc-800 text-zinc-400'
              : 'bg-amber-50 text-ember-600'
          }`}>
            <Loader2 className="w-3 h-3 animate-spin" />
            Refining with AI...
          </span>
        )}
        {!isFullMix && (
          <span className={`text-xs font-normal ${t.textDimmed} ml-auto`}>Tap to change</span>
        )}
      </h4>

      {/* Full Mix Guidance — shown instead of instrument grid when full mix detected */}
      {isFullMix && (
        <FullMixGuidance
          onSeparateStems={onSeparateStems}
          onSelectRegion={onSelectRegion}
          hasStemsReady={hasStemsReady}
          theme={theme}
          t={t}
        />
      )}

      {/* For full mix: collapsible instrument grid behind a toggle */}
      {isFullMix && !showInstrumentGrid && (
        <button
          onClick={() => setShowInstrumentGrid(true)}
          className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-colors ${
            theme === 'dark'
              ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              : 'text-zinc-400 hover:text-ember-600 hover:bg-amber-50'
          }`}
        >
          <ChevronDown className="w-3.5 h-3.5" />
          Show detected instruments anyway
        </button>
      )}

      {isFullMix && showInstrumentGrid && (
        <button
          onClick={() => setShowInstrumentGrid(false)}
          className={`w-full flex items-center justify-center gap-2 py-2 mb-3 text-xs font-medium rounded-md transition-colors ${
            theme === 'dark'
              ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              : 'text-zinc-400 hover:text-ember-600 hover:bg-amber-50'
          }`}
        >
          <ChevronUp className="w-3.5 h-3.5" />
          Hide instruments
        </button>
      )}

      {/* Instrument grid — always shown for non-full-mix, collapsible for full-mix */}
      {(!isFullMix || showInstrumentGrid) && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
            {/* Whole Track option - always available */}
            <button
              onClick={() => onSelectInstrument('full')}
              className={`p-3 rounded-lg transition-all text-left ${
                selectedInstrument === 'full'
                  ? theme === 'dark'
                    ? 'bg-white text-black'
                    : 'bg-ember-600 text-white shadow-lg shadow-ember-500/20'
                  : theme === 'dark'
                    ? 'bg-zinc-800 hover:bg-zinc-700'
                    : 'bg-white border border-stone-200 hover:border-ember-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <InstrumentIllustration instrument="full" size={36} isDark={theme === 'dark'} active={selectedInstrument === 'full'} />
                <div className="flex items-center gap-1">
                  {selectedInstrument === 'full' && <Check className="w-3.5 h-3.5" />}
                  {detectedInstruments.isFullMix && (
                    <span className={`text-xs font-medium ${selectedInstrument === 'full' ? '' : t.textMuted}`}>
                      Recommended
                    </span>
                  )}
                </div>
              </div>
              <div className={`text-sm font-medium`}>
                Whole Track
              </div>
              <div className={`text-xs mt-1 opacity-60`}>
                General analysis
              </div>
            </button>

            {/* Detected instruments — filter out 'full' since we have a dedicated Whole Track button above */}
            {detectedInstruments.detected.filter(item => item.instrument !== 'full').map((item, i) => {
              const info = instrumentLabels[item.instrument] || { label: item.instrument, icon: 'Music' };
              const isSelected = selectedInstrument === item.instrument;
              return (
                <button
                  key={i}
                  onClick={() => onSelectInstrument(item.instrument)}
                  className={`p-3 rounded-lg transition-all text-left ${
                    isSelected
                      ? theme === 'dark'
                        ? 'bg-white text-black'
                        : 'bg-ember-600 text-white shadow-lg shadow-ember-500/20'
                      : theme === 'dark'
                        ? 'bg-zinc-800 hover:bg-zinc-700'
                        : 'bg-white border border-stone-200 hover:border-ember-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <InstrumentIllustration instrument={item.instrument} size={36} isDark={theme === 'dark'} active={isSelected} />
                    <div className="flex items-center gap-1">
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span className={`text-xs font-medium`}>
                        {item.confidence}%
                      </span>
                    </div>
                  </div>
                  <div className={`text-sm font-medium`}>
                    {info.label}
                  </div>
                  <div className={`mt-1.5 h-1 overflow-hidden ${
                    isSelected
                      ? (theme === 'dark' ? 'bg-black/20' : 'bg-white/30')
                      : (theme === 'dark' ? 'bg-zinc-700' : 'bg-stone-200')
                  }`}>
                    <div
                      className={`h-full ${
                        isSelected
                          ? (theme === 'dark' ? 'bg-black' : 'bg-white')
                          : (theme === 'dark' ? 'bg-white' : 'bg-ember-600')
                      }`}
                      style={{ width: `${item.confidence}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Frequency Band Distribution Mini */}
          {detectedInstruments.bands && (
            <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-zinc-950' : 'bg-stone-50'}`}>
              <div className={`text-xs font-medium ${t.textDimmed} mb-2`}>Frequency Distribution</div>
              {(() => {
                const labels = { subBass: 'Sub', bass: 'Bass', lowMid: 'Low', mid: 'Mid', highMid: 'Hi', high: 'High' };
                const colors = {
                  subBass: theme === 'dark' ? 'bg-red-500/80' : 'bg-red-400',
                  bass: theme === 'dark' ? 'bg-orange-500/80' : 'bg-orange-400',
                  lowMid: theme === 'dark' ? 'bg-amber-500/80' : 'bg-amber-400',
                  mid: theme === 'dark' ? 'bg-yellow-500/80' : 'bg-yellow-400',
                  highMid: theme === 'dark' ? 'bg-emerald-500/80' : 'bg-emerald-400',
                  high: theme === 'dark' ? 'bg-cyan-500/80' : 'bg-cyan-400',
                };
                const entries = Object.entries(detectedInstruments.bands);
                const maxVal = Math.max(...entries.map(([, v]) => v), 0.001);
                return (
                  <>
                    <div className="flex items-end gap-2" style={{ height: 56 }}>
                      {entries.map(([band, value]) => {
                        const barPct = value > 0 ? Math.max((value / maxVal) * 100, 8) : 0;
                        return (
                          <div key={band} className="flex-1 h-full flex items-end">
                            <div
                              className={`w-full rounded-sm transition-all duration-500 ${colors[band]}`}
                              style={{ height: `${barPct}%`, minHeight: value > 0 ? '4px' : '0' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 mt-1">
                      {entries.map(([band]) => (
                        <div key={band} className="flex-1 text-center">
                          <span className={`text-xs ${t.textDimmed}`}>{labels[band]}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

        </>
      )}
    </div>
  );
}
