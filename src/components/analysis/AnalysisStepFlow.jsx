import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Headphones,
  Download,
  Sliders,
  Settings,
  Wrench,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { Tooltip } from '../ui';
import { InstrumentSelector, PresetSelector } from '../audio';
import { ADSREnvelope, SoundSauce, VitalGuide, StepFlow, Step } from '../analysis';
import { instrumentLabels } from '../../utils/constants';
import { getDAWRecipe } from '../../data/dawPlugins';

/**
 * Collapsible accordion for DAW-specific settings (Synthesis Type, VSTs, EQ, Effects).
 * Oscillator/Filter/Envelope/Modulation are intentionally omitted — VitalGuide covers those.
 */
function DAWSettingsAccordion({ analysis, theme, t }) {
  const [openSections, setOpenSections] = useState({});
  const isDark = theme === 'dark';

  if (!analysis?.recommendations) return null;

  const { synthType, vstSuggestions, nativeInstruments, eqSettings, effects } = analysis.recommendations;

  const toggle = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const sections = [
    { key: 'synth', label: 'Synthesis Type', items: synthType },
    { key: 'vst', label: 'Recommended VSTs & DAW Instruments', items: [...(vstSuggestions || []), ...(nativeInstruments || [])] },
    { key: 'eq', label: 'EQ Settings', items: eqSettings },
    { key: 'fx', label: 'Effects Chain', items: effects },
  ].filter(s => s.items?.length > 0);

  if (sections.length === 0) return null;

  return (
    <div className="mt-6 space-y-2">
      <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${t.textDimmed}`}>
        Detailed Settings
      </h3>
      {sections.map(({ key, label, items }) => {
        const isOpen = !!openSections[key];
        return (
          <div key={key} className={`border rounded-lg overflow-hidden ${isDark ? 'border-zinc-800' : 'border-stone-200'}`}>
            <button
              onClick={() => toggle(key)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors ${
                isDark
                  ? 'hover:bg-white/[0.03] text-zinc-200'
                  : 'hover:bg-stone-50 text-stone-700'
              }`}
            >
              {label}
              {isOpen
                ? <ChevronUp className={`w-4 h-4 ${t.textDimmed}`} />
                : <ChevronDown className={`w-4 h-4 ${t.textDimmed}`} />
              }
            </button>
            {isOpen && (
              <div className={`px-4 pb-4 ${isDark ? 'bg-zinc-900/50' : 'bg-stone-50/50'}`}>
                <ul className="space-y-1.5">
                  {items.map((item, i) => (
                    <li key={i} className={`text-sm flex items-start gap-2 ${t.textMuted}`}>
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDark ? 'bg-ember-500/60' : 'bg-ember-600/60'}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * AnalysisStepFlow — The 4-step guided post-analysis flow extracted from Analyze.jsx.
 *
 * Step 1: Listen & Identify (InstrumentSelector compact + quick stats)
 * Step 2: Your Preset (PresetSelector + guest sign-up prompt)
 * Step 3: Recreate It (VitalGuide + DAW recipe + community link)
 * Step 4: Full Analysis (BPM, Key, Waveform, ADSR, feature grid)
 */
export function AnalysisStepFlow({
  // Step flow state
  completedSteps,
  expandedSteps,
  toggleStep,
  theme,
  t,

  // Analysis data
  analysis,
  detectedInstruments,
  selectedInstrument,

  // Audio state
  audio,
  audioFileData,
  audioMetadata,
  wavetableData,

  // Stems
  stems,
  aiDetectionStatus,

  // Preferences
  dawPreference,

  // Callbacks
  reAnalyzeWithInstrument,
  scrollToStems,
  scrollToWaveform,
  handlePresetSelected,
  handlePresetDownloaded,
}) {
  return (
    <StepFlow completedSteps={completedSteps} theme={theme}>

      {/* ── Step 1: Listen & Identify ── */}
      <Step
        number={1}
        title="Listen & Identify"
        icon={Headphones}
        isCompleted={completedSteps.has(1)}
        isExpanded={expandedSteps.has(1)}
        onToggle={() => toggleStep(1)}
        theme={theme}
      >
        {/* Compact instrument selector */}
        {detectedInstruments && (() => {
          const analyzedFullTrack = !analysis.analyzedStem && !(audio.loopEnabled && audio.loopStart != null);
          const isLongAudio = audio.duration > 10;
          const multipleInstruments = (detectedInstruments.instrumentsAboveThreshold || 0) >= 3;
          const shouldShowMixGuidance = isLongAudio && (detectedInstruments.isFullMix || (analyzedFullTrack && multipleInstruments));

          return (
            <InstrumentSelector
              compact
              detectedInstruments={{ ...detectedInstruments, isFullMix: shouldShowMixGuidance }}
              selectedInstrument={selectedInstrument}
              onSelectInstrument={reAnalyzeWithInstrument}
              instrumentLabels={instrumentLabels}
              theme={theme}
              t={t}
              onSeparateStems={scrollToStems}
              onSelectRegion={scrollToWaveform}
              hasStemsReady={stems !== null}
              aiDetectionStatus={aiDetectionStatus}
            />
          );
        })()}

        {/* Quick stats row — BPM, Key, Waveform */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {analysis.features.bpm && (
            <div className={`p-2.5 rounded-lg text-center ${
              theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-50'
            }`}>
              <div className={`text-xs ${t.textDimmed}`}>BPM</div>
              <div className={`text-lg font-bold font-mono ${t.text}`}>
                {Math.round(analysis.features.bpm.suggestedTempo || analysis.features.bpm.bpm)}
              </div>
            </div>
          )}
          {analysis.features.key && (
            <div className={`p-2.5 rounded-lg text-center ${
              theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-50'
            }`}>
              <div className={`text-xs ${t.textDimmed}`}>Key</div>
              <div className={`text-lg font-bold ${t.text}`}>
                {analysis.features.key.key} {analysis.features.key.mode?.charAt(0)}
              </div>
            </div>
          )}
          {analysis.features.waveform && (
            <div className={`p-2.5 rounded-lg text-center ${
              theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-50'
            }`}>
              <div className={`text-xs ${t.textDimmed}`}>Waveform</div>
              <div className={`text-lg font-bold capitalize ${t.text}`}>
                {analysis.features.waveform.type}
              </div>
            </div>
          )}
        </div>
      </Step>

      {/* ── Step 2: Your Preset ── */}
      <Step
        number={2}
        title="Your Preset"
        icon={Download}
        isCompleted={completedSteps.has(2)}
        isExpanded={expandedSteps.has(2)}
        onToggle={() => toggleStep(2)}
        theme={theme}
      >
        <PresetSelector
          key={selectedInstrument}
          detectedInstrument={selectedInstrument}
          audioTitle={audioMetadata?.title}
          theme={theme}
          t={t}
          onPresetSelected={handlePresetSelected}
          onPresetDownloaded={handlePresetDownloaded}
          analysisFeatures={analysis?.features || null}
          wavetableData={wavetableData}
          sourceAudioData={audioFileData}
        />
      </Step>

      {/* ── Step 3: Recreate It ── */}
      <Step
        number={3}
        title="Recreate It"
        icon={Wrench}
        isCompleted={completedSteps.has(3)}
        isExpanded={expandedSteps.has(3)}
        onToggle={() => toggleStep(3)}
        theme={theme}
      >
        {/* Vital Synthesis Tips */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sliders className={`w-4 h-4 ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`} />
            <h3 className={`text-sm font-semibold ${t.text}`}>Vital Synthesis Tips</h3>
          </div>
          <VitalGuide
            features={analysis.features}
            soundType={getDAWRecipe(analysis.features, selectedInstrument, 'FL Studio').soundType}
            theme={theme}
            t={t}
          />
        </div>

        {/* DAW Recipe */}
        <div className={`p-4 rounded-lg border ${
          theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-stone-50 border-stone-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <Settings className={`w-4 h-4 ${t.textMuted}`} />
            <h3 className={`text-sm font-semibold ${t.text}`}>
              {dawPreference || 'Ableton Live'} Recipe
            </h3>
            <Link to="/settings" className={`text-xs ml-auto ${theme === 'dark' ? 'text-ember-500 hover:text-white' : 'text-ember-600 hover:underline'}`}>
              Change DAW
            </Link>
          </div>

          <SoundSauce
            analysis={analysis}
            theme={theme}
            t={t}
            selectedInstrument={selectedInstrument}
            dawPreference={dawPreference}
            showVitalSection={false}
          />

          <DAWSettingsAccordion analysis={analysis} theme={theme} t={t} />
        </div>

      </Step>

      {/* ── Step 4: Deep Dive ── */}
      <Step
        number={4}
        title="Full Analysis"
        icon={BookOpen}
        isCompleted={false}
        isExpanded={expandedSteps.has(4)}
        onToggle={() => toggleStep(4)}
        optional
        theme={theme}
      >
        <div className="space-y-4">

          {/* BPM + Key Row */}
          {(analysis.features.bpm || analysis.features.key) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {analysis.features.bpm && (
                <div className={`p-4 border rounded-lg ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-stone-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${t.textDimmed}`}><Tooltip term="BPM">BPM</Tooltip></span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-zinc-700' : 'bg-stone-200'} ${t.textMuted}`}>
                      {analysis.features.bpm.confidence > 70 ? 'High confidence' :
                       analysis.features.bpm.confidence > 40 ? 'Medium confidence' : 'Low confidence'}
                    </span>
                  </div>
                  <div className={`text-3xl font-bold ${t.text}`}>
                    {Math.round(analysis.features.bpm.suggestedTempo || analysis.features.bpm.bpm)}
                  </div>
                  <div className={`text-xs mt-1 ${t.textMuted}`}>
                    {analysis.features.bpm.tempoRange} tempo
                  </div>
                  {(analysis.features.bpm.halfTempo || analysis.features.bpm.doubleTempo) && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {analysis.features.bpm.halfTempo > 0 && (
                        <span className={`text-xs px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-zinc-900 text-zinc-400' : 'bg-stone-100 text-zinc-500'}`}>
                          Half: {Math.round(analysis.features.bpm.halfTempo)}
                        </span>
                      )}
                      {analysis.features.bpm.doubleTempo > 0 && (
                        <span className={`text-xs px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-zinc-900 text-zinc-400' : 'bg-stone-100 text-zinc-500'}`}>
                          Double: {Math.round(analysis.features.bpm.doubleTempo)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {analysis.features.key && (
                <div className={`p-4 border rounded-lg ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-stone-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${t.textDimmed}`}><Tooltip term="Key">KEY</Tooltip></span>
                    {analysis.features.key.camelot && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${theme === 'dark' ? 'bg-zinc-700' : 'bg-stone-200'} ${t.textMuted}`}>
                        {analysis.features.key.camelot}
                      </span>
                    )}
                  </div>
                  <div className={`text-3xl font-bold ${t.text}`}>
                    {analysis.features.key.key} {analysis.features.key.mode}
                  </div>
                  {analysis.features.key.scaleNotes && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {analysis.features.key.scaleNotes.map((note, i) => (
                        <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-zinc-900 text-zinc-400' : 'bg-stone-100 text-zinc-500'}`}>
                          {note}
                        </span>
                      ))}
                    </div>
                  )}
                  {analysis.features.key.compatibleKeys && (
                    <div className={`text-xs mt-2 ${t.textMuted}`}>
                      Compatible: {analysis.features.key.compatibleKeys.slice(0, 3).map(k => k.code).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Waveform Type Card */}
          {analysis.features.waveform && (
            <div className={`p-4 border rounded-lg ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-stone-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${t.textDimmed}`}><Tooltip term="Waveform">WAVEFORM</Tooltip></span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-zinc-700' : 'bg-stone-200'} ${t.textMuted}`}>
                  {analysis.features.waveform.confidence}% match
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold capitalize ${t.text}`}>
                  {analysis.features.waveform.type}
                </div>
                {analysis.features.waveform.fundamentalFreq > 0 && (
                  <span className={`text-sm ${t.textMuted}`}>
                    ({analysis.features.waveform.fundamentalFreq} Hz fundamental)
                  </span>
                )}
              </div>
              {analysis.features.waveform.synthRecommendation && (
                <div className={`text-xs mt-2 p-2 rounded-md ${theme === 'dark' ? 'bg-zinc-900' : 'bg-stone-100'}`}>
                  <span className={t.textMuted}>Tip:</span> {analysis.features.waveform.synthRecommendation}
                </div>
              )}
            </div>
          )}

          {/* ADSR Envelope */}
          {analysis.features.adsr && (
            <ADSREnvelope adsr={analysis.features.adsr} theme={theme} t={t} />
          )}

          {/* Tone, Frequency, Texture, Level — 4-card grid */}
          {(() => {
            const brightness = Number(analysis.features.brightness) || 0;
            const centroid = Number(analysis.features.spectralCentroid) || 0;
            const harmonicity = Number(analysis.features.harmonicity) || 0;
            const rmsVal = Number(analysis.features.rms) || 0;
            const rmsDb = rmsVal > 0 ? (20 * Math.log10(rmsVal)).toFixed(1) : '-\u221E';
            const cardClass = `p-3 border rounded-lg ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-stone-200'}`;
            const badgeClass = `text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-zinc-700' : 'bg-stone-200'} ${t.textMuted}`;
            const tipClass = `text-xs mt-2 p-2 rounded-md ${theme === 'dark' ? 'bg-zinc-900' : 'bg-stone-100'}`;
            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={cardClass}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${t.textDimmed}`}><Tooltip term="Tone">TONE</Tooltip></span>
                    <span className={badgeClass}>
                      {brightness > 0.6 ? 'Bright' : brightness > 0.3 ? 'Balanced' : 'Dark'}
                    </span>
                  </div>
                  <div className={`text-2xl font-bold ${t.text}`}>
                    {(brightness * 100).toFixed(0)}%
                  </div>
                  <div className={tipClass}>
                    <span className={t.textMuted}>→</span> {
                      brightness > 0.6 ? 'Open filter cutoff fully' :
                      brightness > 0.3 ? 'Filter cutoff around 50-70%' :
                      'Close filter cutoff to 20-40%'
                    }
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${t.textDimmed}`}><Tooltip term="Frequency Center">FREQ CENTER</Tooltip></span>
                    <span className={badgeClass}>
                      {centroid > 2000 ? 'High' : centroid > 500 ? 'Mid' : 'Low'}
                    </span>
                  </div>
                  <div className={`text-2xl font-bold ${t.text}`}>
                    {Math.round(centroid)} Hz
                  </div>
                  <div className={tipClass}>
                    <span className={t.textMuted}>→</span> {
                      centroid > 2000 ? 'Sits in high-mids' :
                      centroid > 500 ? 'Balanced presence' :
                      'Bass-heavy, needs low-end room'
                    }
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${t.textDimmed}`}><Tooltip term="Texture">TEXTURE</Tooltip></span>
                    <span className={badgeClass}>
                      {harmonicity > 0.7 ? 'Tonal' : harmonicity > 0.4 ? 'Complex' : 'Inharmonic'}
                    </span>
                  </div>
                  <div className={`text-2xl font-bold ${t.text}`}>
                    {(harmonicity * 100).toFixed(0)}%
                  </div>
                  <div className={tipClass}>
                    <span className={t.textMuted}>→</span> {
                      harmonicity > 0.7 ? 'Clean pitched sound — use Saw/Square oscillators' :
                      harmonicity > 0.4 ? 'Some inharmonic content — try FM or wavetable synthesis' :
                      'Noise-heavy — try noise oscillator, FM, or granular synthesis'
                    }
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${t.textDimmed}`}><Tooltip term="Level">LEVEL</Tooltip></span>
                    <span className={badgeClass}>
                      {rmsVal > 0.3 ? 'Hot' : rmsVal > 0.1 ? 'Nominal' : 'Quiet'}
                    </span>
                  </div>
                  <div className={`text-2xl font-bold ${t.text}`}>
                    {rmsDb} <span className="text-sm font-normal">dBFS</span>
                  </div>
                  <div className={tipClass}>
                    <span className={t.textMuted}>→</span> {
                      rmsVal > 0.3 ? 'Hot source — watch for clipping' :
                      rmsVal > 0.1 ? 'Good level for processing' :
                      'Quiet — may need gain staging'
                    }
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </Step>

    </StepFlow>
  );
}
