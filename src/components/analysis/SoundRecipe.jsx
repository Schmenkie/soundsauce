import { useState } from 'react';
import { ChevronDown, ChevronUp, Download, Music, Sliders, HelpCircle, ArrowRight } from 'lucide-react';
import { getDAWRecipe, getPluginProfilesForDAW, getDAWIntegrationTips } from '../../data/dawPlugins';

/**
 * Sound Sauce Component
 * Shows beginner-friendly instructions for recreating a sound in FL Studio and Vital.
 *
 * When showVitalSection={false} (DAW tab in ResultsTabs):
 *   - Bridge card pointing to Vital Preset tab
 *   - Integration tips (how to use the Vital preset in this DAW)
 *   - Collapsible "Build from scratch" section with original plugin recipe
 *
 * When showVitalSection={true}:
 *   - Full recipe (sound ID, DAW recipe, Vital recipe, download button)
 */
export function SoundSauce({ analysis, theme, t, onDownloadVitalPreset, selectedInstrument, dawPreference, showVitalSection = true }) {
  const daw = dawPreference || 'Ableton Live';
  const [expandedSection, setExpandedSection] = useState('daw'); // Start with DAW recipe expanded
  const [showScratch, setShowScratch] = useState(false);

  // Get the DAW-specific recipe based on analysis
  const features = analysis?.features || {};
  const recipe = getDAWRecipe(features, selectedInstrument, daw);
  const pluginProfiles = getPluginProfilesForDAW(daw);
  const pluginProfile = pluginProfiles[recipe.plugin] || recipe.pluginInfo || { name: recipe.plugin || 'Vital', description: '', difficulty: 2, presetPath: '' };

  // Derive sound name for display
  const soundName = getSoundDisplayName(recipe.soundType, features);

  // Integration tips for DAW tab
  const integrationTips = getDAWIntegrationTips(daw, recipe.soundType);

  const isDark = theme === 'dark';

  // === DAW TAB (showVitalSection=false): Simplified with bridge card + integration tips ===
  if (!showVitalSection) {
    return (
      <div className="space-y-4">
        {/* Sound Identification */}
        <div className={`p-6 border rounded-lg ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
          <div className={`text-xs font-medium ${t.textDimmed} mb-2 uppercase tracking-wide`}>
            This sounds like
          </div>
          <h2 className={`text-2xl font-bold ${t.text} mb-2`}>
            {soundName}
          </h2>
          <p className={`text-sm ${t.textMuted}`}>
            {recipe.soundDescription}
          </p>
        </div>

        {/* Bridge Card — points to Vital Preset tab */}
        <VitalBridgeCard daw={daw} theme={theme} t={t} />

        {/* Integration Tips — primary content */}
        <div className={`p-5 border rounded-lg ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
          <div className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-ember-500' : 'text-ember-600'}`}>
            Using Vital in {daw}
          </div>
          <ol className="space-y-4">
            {integrationTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isDark ? 'bg-white text-black' : 'bg-gradient-to-r from-ember-500 to-amber-600 text-white'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${t.text}`}>{tip.title}</div>
                  <div className={`text-xs mt-1 leading-relaxed ${t.textDimmed}`}>{tip.detail}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Build from scratch — collapsible section */}
        <div className={`border rounded-lg ${isDark ? 'border-zinc-800' : 'border-stone-200'}`}>
          <button
            onClick={() => setShowScratch(!showScratch)}
            className={`w-full p-4 flex items-center justify-between transition-colors rounded-lg ${
              isDark ? 'bg-zinc-900 hover:bg-zinc-800' : 'bg-white hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Music className={`w-4 h-4 ${t.textMuted}`} />
              <div className="text-left">
                <div className={`text-sm font-medium ${t.text}`}>Alternative: Build from scratch in {daw}</div>
                <div className={`text-xs ${t.textDimmed}`}>Using {pluginProfile.name} without a Vital preset</div>
              </div>
            </div>
            {showScratch ? (
              <ChevronUp className={`w-4 h-4 ${t.textMuted}`} />
            ) : (
              <ChevronDown className={`w-4 h-4 ${t.textMuted}`} />
            )}
          </button>

          {showScratch && (
            <div className={`p-4 space-y-4 border-t ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-stone-100 border-stone-200'}`}>
              <PluginRecommendation plugin={pluginProfile} theme={theme} t={t} />
              <StepByStepGuide
                steps={recipe.quickStart || []}
                reasoning={recipe.reasoning}
                theme={theme}
                t={t}
              />
              {recipe.filterSettings && (
                <SettingExplanation
                  label="Filter Cutoff"
                  value={recipe.filterSettings.value}
                  explanation={recipe.filterSettings.explanation}
                  knobPosition={recipe.filterSettings.knobPosition}
                  theme={theme}
                  t={t}
                />
              )}
              {recipe.envelopeSettings?.attack && (
                <SettingExplanation
                  label="Attack"
                  value={recipe.envelopeSettings.attack.value}
                  explanation={recipe.envelopeSettings.attack.explanation}
                  knobPosition={recipe.envelopeSettings.attack.knobPosition}
                  theme={theme}
                  t={t}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // === VITAL TAB (showVitalSection=true): Full recipe as before ===
  return (
    <div className="space-y-4">
      {/* Sound Identification */}
      <div className={`p-6 border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
        <div className={`text-xs font-medium ${t.textDimmed} mb-2 uppercase tracking-wide`}>
          This sounds like
        </div>
        <h2 className={`text-2xl font-bold ${t.text} mb-2`}>
          {soundName}
        </h2>
        <p className={`text-sm ${t.textMuted}`}>
          {recipe.soundDescription}
        </p>
      </div>

      {/* DAW-Specific Recipe */}
      <RecipeSection
        title={`${daw} Recipe`}
        subtitle={`Using: ${pluginProfile.name}`}
        icon={<Music className="w-5 h-5" />}
        expanded={expandedSection === 'daw'}
        onToggle={() => setExpandedSection(expandedSection === 'daw' ? null : 'daw')}
        theme={theme}
        t={t}
      >
        <PluginRecommendation plugin={pluginProfile} theme={theme} t={t} />
        <StepByStepGuide
          steps={recipe.quickStart || []}
          reasoning={recipe.reasoning}
          theme={theme}
          t={t}
        />
        {recipe.filterSettings && (
          <SettingExplanation
            label="Filter Cutoff"
            value={recipe.filterSettings.value}
            explanation={recipe.filterSettings.explanation}
            knobPosition={recipe.filterSettings.knobPosition}
            theme={theme}
            t={t}
          />
        )}
        {recipe.envelopeSettings?.attack && (
          <SettingExplanation
            label="Attack"
            value={recipe.envelopeSettings.attack.value}
            explanation={recipe.envelopeSettings.attack.explanation}
            knobPosition={recipe.envelopeSettings.attack.knobPosition}
            theme={theme}
            t={t}
          />
        )}
      </RecipeSection>

      {/* Vital Recipe */}
      <RecipeSection
        title="Vital Recipe"
        subtitle="Using: Vital (Free Synth)"
        icon={<Sliders className="w-5 h-5" />}
        expanded={expandedSection === 'vital'}
        onToggle={() => setExpandedSection(expandedSection === 'vital' ? null : 'vital')}
        theme={theme}
        t={t}
      >
        <VitalGuide features={features} soundType={recipe.soundType} theme={theme} t={t} />
      </RecipeSection>

      {/* Download Preset */}
      {onDownloadVitalPreset && (
        <div className={`p-6 border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className={`font-bold ${t.text} mb-1`}>
                Download Vital Preset
              </div>
              <p className={`text-sm ${t.textMuted}`}>
                Get a starting point preset. Open it in Vital and tweak from there.
              </p>
            </div>
            <button
              onClick={onDownloadVitalPreset}
              className={`flex items-center justify-center gap-2 px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                isDark
                  ? 'bg-white text-black hover:bg-stone-200'
                  : 'bg-stone-900 text-white hover:bg-stone-800'
              }`}
            >
              <Download className="w-4 h-4" />
              Download .vital
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Bridge card that points users from the DAW tab to the Vital Preset tab.
 */
function VitalBridgeCard({ daw, theme, t }) {
  const isDark = theme === 'dark';
  return (
    <div className={`p-4 border-2 rounded-lg flex items-center gap-3 ${
      isDark
        ? 'bg-zinc-900 border-ember-500/30'
        : 'bg-amber-50/50 border-ember-600/30'
    }`}>
      <Sliders className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-ember-500' : 'text-ember-600'}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${t.text}`}>
          Start with the Vital Preset
        </div>
        <div className={`text-xs mt-0.5 ${t.textDimmed}`}>
          Download it from the <span className={`font-medium ${isDark ? 'text-ember-500' : 'text-ember-600'}`}>Vital Preset</span> tab, then follow the tips below to use it in {daw}.
        </div>
      </div>
      <ArrowRight className={`w-4 h-4 flex-shrink-0 ${t.textDimmed}`} />
    </div>
  );
}

/**
 * Collapsible recipe section
 */
function RecipeSection({ title, subtitle, icon, expanded, onToggle, theme, t, children }) {
  return (
    <div className={`border ${theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'}`}>
      <button
        onClick={onToggle}
        className={`w-full p-4 flex items-center justify-between transition-colors ${
          theme === 'dark'
            ? 'bg-zinc-900 hover:bg-zinc-800'
            : 'bg-white hover:bg-stone-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={t.text}>{icon}</span>
          <div className="text-left">
            <div className={`font-bold ${t.text}`}>{title}</div>
            <div className={`text-sm ${t.textMuted}`}>{subtitle}</div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className={`w-5 h-5 ${t.textMuted}`} />
        ) : (
          <ChevronDown className={`w-5 h-5 ${t.textMuted}`} />
        )}
      </button>

      {expanded && (
        <div className={`p-4 space-y-4 ${theme === 'dark' ? 'bg-zinc-950' : 'bg-stone-100'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Plugin recommendation card
 */
function PluginRecommendation({ plugin, theme, t }) {
  return (
    <div className={`p-4 border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className={`font-bold ${t.text}`}>{plugin.name}</span>
          <span className={`ml-2 text-xs ${t.textMuted}`}>Difficulty: {'*'.repeat(plugin.difficulty)}</span>
        </div>
      </div>
      <p className={`text-sm ${t.textMuted} mb-3`}>{plugin.description}</p>
      <div className={`text-xs ${t.textDimmed}`}>
        Find presets: {plugin.presetPath}
      </div>
    </div>
  );
}

/**
 * Step by step guide
 */
function StepByStepGuide({ steps, reasoning, theme, t }) {
  if (!steps || steps.length === 0) {
    return (
      <div className={`p-4 border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
        <p className={`text-sm ${t.textMuted}`}>{reasoning || 'Follow the settings below to get started.'}</p>
      </div>
    );
  }

  return (
    <div className={`p-4 border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
      {reasoning && (
        <p className={`text-sm ${t.textMuted} mb-4`}>{reasoning}</p>
      )}
      <div className={`text-sm font-medium ${t.text} mb-3`}>Quick Start:</div>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-bold ${
              theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
            }`}>
              {i + 1}
            </span>
            <span className={`text-sm ${t.textMuted}`}>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Setting explanation with beginner-friendly description
 */
function SettingExplanation({ label, value, explanation, knobPosition, theme, t }) {
  return (
    <div className={`p-4 border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`font-medium ${t.text}`}>{label}:</span>
        <span className={`font-mono ${t.text}`}>{value}</span>
      </div>
      <p className={`text-sm ${t.textMuted} mb-2`}>{explanation}</p>
      {knobPosition && (
        <div className={`text-xs ${t.textDimmed} flex items-center gap-1`}>
          <HelpCircle className="w-3 h-3" />
          Knob position: {knobPosition}
        </div>
      )}
    </div>
  );
}

/**
 * Vital-specific synthesis guide — generates detailed, analysis-driven recreation steps.
 * Uses all available features (waveform, filter, modulation, ADSR, brightness, harmonics)
 * to produce specific, actionable instructions unique to each analyzed sound.
 *
 * Each step is a { title, detail } object where title is the action and detail explains why/how.
 * Steps are grouped into sections: Oscillator, Unison, Filter, Envelope, Modulation, Effects.
 * Only relevant sections are shown — a simple sine bass won't show modulation tips.
 */
export function VitalGuide({ features, soundType, theme, t }) {
  const waveform = features?.waveform?.type || 'saw';
  const waveformConfidence = features?.waveform?.confidence || 0;
  const brightness = parseFloat(features?.brightness) || 0.5;
  const harmonicity = parseFloat(features?.harmonicity) || 0.5;
  const spectralCentroid = parseFloat(features?.spectralCentroid) || 1000;
  const adsr = features?.adsr || { attack: 10, decay: 200, sustain: 70, release: 300 };
  const filterEnv = features?.filterEnvelope || {};
  const mod = features?.modulation || {};
  const harmonicProfile = features?.waveform?.harmonicProfile || {};

  const sections = [];

  // ===== OSCILLATOR SECTION =====
  const oscSteps = [];

  // Wavetable selection with specific Vital wavetable names
  const wavetableMap = {
    sine: { table: 'Init (default)', frame: 'Frame 0 (pure sine)', note: 'Sine waves are the simplest — no harmonics, just the fundamental frequency' },
    saw: { table: 'Basic Shapes', frame: 'Frame 127 (full saw)', note: 'Sawtooth waves contain all harmonics — the bread and butter of subtractive synthesis' },
    square: { table: 'Basic Shapes', frame: 'Frame ~64 (square/pulse)', note: 'Square waves have only odd harmonics — hollow, reedy quality' },
    triangle: { table: 'Basic Shapes', frame: 'Frame ~32 (triangle)', note: 'Triangle waves are like quieter squares — soft, mellow tone with weak odd harmonics' },
    pulse: { table: 'Basic Shapes', frame: 'Adjust frame for pulse width', note: 'Narrow pulse waves sound nasal and buzzy — try automating the frame position for PWM' },
    complex: { table: 'Analog or a wavetable from the library', frame: 'Scan through frames to find a match', note: 'Complex timbres often come from wavetable scanning or FM synthesis' },
  };
  const wt = wavetableMap[waveform] || wavetableMap.saw;
  oscSteps.push({
    title: `Set OSC 1 wavetable to "${wt.table}"`,
    detail: `${wt.frame}. ${wt.note}.${waveformConfidence > 70 ? ` (Detected with ${waveformConfidence}% confidence)` : ''}`
  });

  // Second oscillator suggestions based on sound type
  if (soundType === 'pad' || soundType === 'supersaw') {
    oscSteps.push({
      title: 'Enable OSC 2 — set to the same wavetable as OSC 1',
      detail: 'Detune OSC 2 by +5 to +12 cents for a wider, richer sound. Pads and supersaws get their thickness from layered, slightly detuned oscillators.'
    });
  } else if (soundType === 'bass' || soundType === 'sub-bass') {
    oscSteps.push({
      title: 'Enable OSC 2 — set to Init (Sine), one octave below (-12 semitones)',
      detail: 'A sub-oscillator adds weight and low-end presence. Keep OSC 2 volume lower (~40-60%) so it fills out the bass without muddying the tone.'
    });
  } else if (soundType === 'lead' && brightness > 0.5) {
    oscSteps.push({
      title: 'Enable OSC 2 — try a different wavetable or +7 semitones (fifth) above OSC 1',
      detail: 'Layering a second oscillator tuned to a fifth or octave creates a fatter lead. Alternatively, use a different waveform for harmonic complexity.'
    });
  } else if (waveform === 'complex') {
    oscSteps.push({
      title: 'Try enabling OSC 2 with a simpler waveform (sine or triangle) blended in',
      detail: 'Blending a clean sub layer underneath a complex wavetable adds body while keeping the interesting character on top.'
    });
  }

  // Harmonic profile insight
  if (harmonicProfile && harmonicProfile.oddEvenRatio !== undefined) {
    const ratio = harmonicProfile.oddEvenRatio;
    if (ratio > 1.5) {
      oscSteps.push({
        title: 'Odd harmonics dominate — lean toward square/triangle wavetables',
        detail: `The harmonic analysis shows ${ratio.toFixed(1)}x more odd harmonics than even. This hollow, woody quality comes from square-type waves. If using Basic Shapes, try frames in the 40-80 range.`
      });
    } else if (ratio < 0.7) {
      oscSteps.push({
        title: 'Even harmonics are strong — try saw-based wavetables or add subtle distortion',
        detail: `Even harmonics (octaves, fifths) create warmth and body. A sawtooth naturally has both odd and even harmonics. You can also add even harmonics with Vital's "Distortion" in the FX chain set to "Soft Clip".`
      });
    }
  }

  if (oscSteps.length > 0) {
    sections.push({ label: 'Oscillator', steps: oscSteps });
  }

  // ===== UNISON SECTION =====
  const unisonSteps = [];
  const needsUnison = soundType === 'supersaw' || soundType === 'pad' ||
    (brightness > 0.55 && harmonicity > 0.5 && (soundType === 'lead' || soundType === 'strings'));

  if (needsUnison) {
    const voices = soundType === 'supersaw' ? 7 : soundType === 'pad' ? 5 : 3;
    const detune = soundType === 'supersaw' ? '25-35%' : soundType === 'pad' ? '15-25%' : '10-15%';
    const spread = brightness > 0.6 ? '60-80%' : '40-60%';
    unisonSteps.push({
      title: `Enable Unison: ${voices} voices, Detune ${detune}`,
      detail: `Set Stereo Spread to ${spread}. More voices = thicker but heavier on CPU. Detune controls how "wide" and chorus-like the sound feels. Start with the suggested values and adjust to taste.`
    });
    if (soundType === 'supersaw') {
      unisonSteps.push({
        title: 'Set Unison blend to "Center" or slightly off-center for mono compatibility',
        detail: 'Supersaws sound massive in stereo but can disappear in mono. Check your sound in mono (Vital\'s header has a mono button) and reduce spread if it thins out.'
      });
    }
  } else {
    unisonSteps.push({
      title: 'Keep Unison at 1 voice for a clean, focused sound',
      detail: soundType === 'bass' || soundType === 'sub-bass'
        ? 'Bass sounds should stay tight in the center. Unison detune on bass causes phase issues that weaken the low end.'
        : soundType === 'pluck'
          ? 'Plucks sound crisper with a single voice. The transient attack is cleaner without unison artifacts.'
          : 'This sound has a focused, narrow spectral character. Adding unison would make it wider than what was detected.'
    });
  }
  sections.push({ label: 'Unison & Stereo', steps: unisonSteps });

  // ===== FILTER SECTION =====
  const filterSteps = [];
  const cutoffHz = filterEnv.estimatedCutoff || (brightness > 0.6 ? 5000 : brightness > 0.4 ? 2500 : 800);
  const cutoffPercent = brightness > 0.7 ? '75-85%' : brightness > 0.5 ? '55-70%' : brightness > 0.3 ? '35-50%' : '20-35%';
  const resonance = filterEnv.resonanceIndicator || 0;

  // Filter type selection
  const filterType = soundType === 'bass' || soundType === 'sub-bass' || soundType === 'kick'
    ? 'Low Pass 24dB (steep rolloff keeps the bass clean)'
    : brightness < 0.3
      ? 'Low Pass 24dB (the sound is dark — a steep filter matches)'
      : brightness > 0.7
        ? 'Low Pass 12dB (gentle rolloff preserves the brightness and air)'
        : 'Low Pass 12dB or 24dB (try both — 12dB is gentler, 24dB is more dramatic)';

  filterSteps.push({
    title: `Filter type: ${filterType}`,
    detail: `Set cutoff to ~${cutoffPercent} (~${Math.round(cutoffHz)}Hz detected). ${
      resonance > 30 ? `Add resonance to ~${Math.min(60, Math.round(resonance))}% — the original sound has an emphasized peak around the cutoff frequency.` :
      'Keep resonance low (10-20%) for a natural sound, or crank it for a more synthy, resonant character.'
    }`
  });

  // Filter envelope / movement
  const sweep = filterEnv.sweepDirection;
  if (sweep && sweep !== 'stable') {
    const filterAttack = filterEnv.filterAttack || 100;
    const filterDecay = filterEnv.filterDecay || 500;

    if (sweep === 'opening') {
      filterSteps.push({
        title: 'Route ENV 2 to filter cutoff (positive amount, ~40-60%)',
        detail: `The filter opens over time — the sound gets brighter. Set ENV 2 attack to ~${Math.round(filterAttack)}ms and decay to ~${Math.round(filterDecay)}ms. This creates that classic "wah" or "sweep up" effect.`
      });
    } else if (sweep === 'closing') {
      filterSteps.push({
        title: 'Route ENV 2 to filter cutoff (positive amount), set a fast attack and slow decay',
        detail: `The filter closes over time — bright attack that mellows out. Set ENV 2 attack to ~0-${Math.round(filterAttack)}ms, decay to ~${Math.round(filterDecay)}ms, sustain low (~20-30%). This gives the initial "pluck" brightness that fades.`
      });
    } else if (sweep === 'bandpass') {
      const peakPos = filterEnv.peakPosition || 0.3;
      filterSteps.push({
        title: 'Route ENV 2 to filter cutoff — the filter opens then closes back',
        detail: `Set ENV 2 attack to ~${Math.round(peakPos * 500)}ms (time to peak brightness), then decay to ~${Math.round(filterDecay)}ms. The filter sweeps up to a peak then back down — a "wah" or "bow" shape. Try modulating resonance too for extra emphasis at the peak.`
      });
    }
  } else {
    filterSteps.push({
      title: 'No filter movement detected — keep the filter static',
      detail: brightness < 0.4
        ? 'The sound stays consistently dark. Set the cutoff and leave it — no envelope modulation needed.'
        : 'The tone stays consistent throughout. A static filter is fine here. You can add subtle movement later with a slow LFO if desired.'
    });
  }

  sections.push({ label: 'Filter', steps: filterSteps });

  // ===== ENVELOPE (ADSR) SECTION =====
  const envSteps = [];

  // Categorize the envelope shape for a human-readable description
  const attackMs = adsr.attack || 10;
  const decayMs = adsr.decay || 200;
  const sustainPct = adsr.sustain || 70;
  const releaseMs = adsr.release || 300;

  const attackDesc = attackMs < 10 ? 'instant' : attackMs < 30 ? 'very fast' : attackMs < 80 ? 'fast' : attackMs < 200 ? 'moderate' : attackMs < 500 ? 'slow' : 'very slow';
  const sustainDesc = sustainPct > 75 ? 'high (organ-like, constant level)' : sustainPct > 50 ? 'moderate' : sustainPct > 25 ? 'low (fades after attack)' : 'very low (mostly attack + decay)';
  const releaseDesc = releaseMs < 100 ? 'very short (tight, staccato)' : releaseMs < 300 ? 'short' : releaseMs < 700 ? 'medium' : releaseMs < 1500 ? 'long (trails off)' : 'very long (ambient tail)';

  envSteps.push({
    title: `Amp Envelope: A=${attackMs}ms, D=${decayMs}ms, S=${sustainPct}%, R=${releaseMs}ms`,
    detail: `Attack: ${attackDesc} — ${
      attackMs < 30 ? 'the sound hits immediately, good for percussive or plucky sounds' :
      attackMs < 200 ? 'noticeable fade-in but still responsive to playing' :
      'slow swell — the sound builds up gradually, classic pad or string behavior'
    }. Sustain: ${sustainDesc}. Release: ${releaseDesc}.`
  });

  // Specific envelope tips based on sound type
  if (soundType === 'pluck' || (attackMs < 20 && sustainPct < 30 && decayMs < 500)) {
    envSteps.push({
      title: 'Tip: For pluckier sounds, keep sustain low and use the decay to control the "tail"',
      detail: 'The character of a pluck comes from the fast attack → decay shape. Shorter decay = tighter pluck (like a muted guitar string), longer decay = more sustain (like a harp). Try routing ENV 2 to filter cutoff too for a brighter attack.'
    });
  } else if (soundType === 'pad' || (attackMs > 100 && sustainPct > 50)) {
    envSteps.push({
      title: 'Tip: For evolving pads, the release is key — longer release = more "air" between notes',
      detail: `With ${releaseMs}ms release, notes will ${releaseMs > 700 ? 'blend into each other beautifully — great for ambient textures' : 'fade cleanly between notes'}. Try increasing release to 1000-2000ms for a more atmospheric feel, or add reverb to extend the tail further.`
    });
  } else if (soundType === 'kick') {
    envSteps.push({
      title: 'Tip: For kicks, the decay IS the sound — it controls the "boom" length',
      detail: `Keep attack at 0ms (instant), sustain at 0%. The decay (${decayMs}ms) controls how long the kick resonates. Shorter = tighter/punchier, longer = boomy/808-style. Also route a pitch envelope (ENV 2 → OSC 1 pitch, fast decay) for the "click to thump" character.`
    });
  }

  sections.push({ label: 'Amplitude Envelope', steps: envSteps });

  // ===== MODULATION SECTION (only if modulation detected) =====
  const modSteps = [];
  const hasLfo = mod.hasLfo || mod.tremolo > 0.1 || mod.vibrato > 0.1;
  const hasChorus = mod.chorus > 0 || (mod.suggestedChorusAmount && mod.suggestedChorusAmount !== '0ms detune');

  if (hasLfo) {
    const lfoRate = mod.suggestedLfoRate || mod.lfoRate || '2 Hz';
    const lfoRateNum = parseFloat(lfoRate) || 2;

    if (mod.tremolo > 0.1) {
      const depth = mod.tremolo > 0.3 ? 'heavy' : 'subtle';
      modSteps.push({
        title: `Add LFO 1 → Volume (${depth} tremolo at ~${lfoRate})`,
        detail: `Tremolo is volume modulation — the sound pulses louder and quieter. Set LFO 1 rate to ~${lfoRate} (${lfoRateNum > 6 ? 'fast, choppy effect' : lfoRateNum > 3 ? 'rhythmic pulsing' : 'slow, gentle throb'}). Amount: ~${mod.tremolo > 0.3 ? '30-50%' : '10-20%'}. Try a sine or triangle LFO shape for smooth tremolo.`
      });
    }

    if (mod.vibrato > 0.1) {
      const depth = mod.vibrato > 0.3 ? 'prominent' : 'subtle';
      modSteps.push({
        title: `Add LFO 2 → OSC 1 Pitch (${depth} vibrato at ~${lfoRate})`,
        detail: `Vibrato is pitch wobble — it adds expression and warmth. Set LFO 2 rate to ~${lfoRate}, amount to ~${mod.vibrato > 0.3 ? '10-15' : '3-8'} cents. Use a sine LFO shape. For more natural vibrato, add a slight delay (LFO delay ~200ms) so vibrato kicks in after the note starts, like a real player.`
      });
    }

    if (!mod.tremolo && !mod.vibrato && mod.hasLfo) {
      modSteps.push({
        title: `Route LFO 1 → Filter Cutoff at ~${lfoRate}`,
        detail: `An LFO modulating the filter creates movement and interest. At ${lfoRateNum > 6 ? 'this fast rate, it creates a wobble/dubstep effect' : lfoRateNum > 2 ? 'this rate, it creates a rhythmic filter sweep' : 'this slow rate, it creates gentle tonal evolution — great for pads and ambient sounds'}. Amount: start at ~20% and adjust.`
      });
    }
  }

  if (hasChorus) {
    modSteps.push({
      title: 'Add chorus/detune for width',
      detail: `The analyzed sound has a chorused or detuned quality (${mod.suggestedChorusAmount || 'slight detune'}). In Vital, you can get this from Unison detune, or add Vital's Chorus effect in the FX chain. Start with Rate ~1Hz, Depth ~30%, Mix ~40%.`
    });
  }

  if (modSteps.length > 0) {
    sections.push({ label: 'Modulation', steps: modSteps });
  }

  // ===== EFFECTS SECTION =====
  const fxSteps = [];

  // Reverb suggestion based on sound type and release
  if (soundType === 'pad' || soundType === 'strings' || releaseMs > 600) {
    fxSteps.push({
      title: 'Add Reverb in the FX chain — Size ~60-80%, Mix ~30-45%',
      detail: `${soundType === 'pad' || soundType === 'strings' ? 'Pads and strings live in reverb — it\'s essential for the spacious, immersive quality' : 'The long release suggests a spacious sound'}. Use Vital's built-in Reverb: set Size to 60-80%, Decay to ~3-5s, and damping to taste. Pre-delay of 20-40ms keeps the attack clear while the tail blooms.`
    });
  } else if (soundType !== 'kick' && soundType !== 'bass' && soundType !== 'sub-bass') {
    fxSteps.push({
      title: 'Add a touch of Reverb — Size ~30-40%, Mix ~15-25%',
      detail: 'A small amount of reverb adds space and polish without washing out the sound. Keep it subtle for leads and plucks. Set Pre-delay to ~10-20ms to preserve the transient.'
    });
  }

  // Distortion/saturation for character
  if (soundType === 'bass' && brightness > 0.4) {
    fxSteps.push({
      title: 'Add Distortion in the FX chain — "Soft Clip" mode, Drive ~30-50%',
      detail: 'Subtle saturation adds harmonics and presence to bass, helping it cut through a mix without turning up the volume. "Soft Clip" is the most musical option. "Foldback" for more aggressive tones.'
    });
  } else if (soundType === 'lead' && brightness > 0.5) {
    fxSteps.push({
      title: 'Try adding Distortion — "Foldback" or "Hard Clip" for aggressive leads',
      detail: 'Distortion adds edge and excitement. Start with a low Drive (~20-30%) and increase to taste. "Foldback" creates a unique, almost digital character. Place it before the filter in the FX chain to shape the harmonics with the filter.'
    });
  }

  // Compression suggestion for transient-heavy sounds
  if (soundType === 'pluck' || soundType === 'drums' || soundType === 'kick') {
    fxSteps.push({
      title: 'Add Compressor in the FX chain for punch',
      detail: 'Fast attack (~5-10ms) tames the initial transient, slow release (~100-200ms) lets the body breathe. Ratio ~4:1. This evens out the dynamics and adds perceived loudness. For kicks, try a longer attack (20-30ms) to let the click through.'
    });
  }

  // EQ suggestion based on spectral analysis
  if (spectralCentroid > 0) {
    if (brightness < 0.3 && (soundType === 'lead' || soundType === 'pluck')) {
      fxSteps.push({
        title: 'Consider a high shelf boost in EQ (+2-4dB above 3kHz)',
        detail: 'The sound is darker than typical for this type. A gentle high shelf can add presence and clarity. Use Vital\'s EQ in the FX chain — or simply open the filter cutoff a bit more.'
      });
    } else if (brightness > 0.7 && (soundType === 'bass' || soundType === 'pad')) {
      fxSteps.push({
        title: 'Consider a low-pass EQ cut or lower the filter cutoff',
        detail: 'The sound has a lot of high-frequency energy. For bass/pads that need to sit in a mix, rolling off some top end can help them blend better without competing with leads and vocals.'
      });
    }
  }

  if (fxSteps.length > 0) {
    sections.push({ label: 'Effects & Processing', steps: fxSteps });
  }

  // ===== RENDER =====
  let stepNumber = 0;

  return (
    <div className="space-y-5">
      {sections.map((section, si) => (
        <div key={si} className={`p-4 border rounded-lg ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'}`}>
          <div className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
            theme === 'dark' ? 'text-ember-500' : 'text-ember-600'
          }`}>
            {section.label}
          </div>
          <ol className="space-y-3">
            {section.steps.map((step, i) => {
              stepNumber++;
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    theme === 'dark' ? 'bg-white text-black' : 'bg-gradient-to-r from-ember-500 to-amber-600 text-white'
                  }`}>
                    {stepNumber}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${t.text}`}>{step.title}</div>
                    <div className={`text-xs mt-0.5 leading-relaxed ${t.textDimmed}`}>{step.detail}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}

/**
 * Get a nice display name for the sound type
 */
function getSoundDisplayName(soundType, features) {
  const brightness = parseFloat(features?.brightness) || 0.5;
  const waveform = features?.waveformType?.type || '';

  const displayNames = {
    'sub-bass': 'Sub Bass',
    'bass': brightness > 0.5 ? 'Bright Bass' : 'Warm Bass',
    'lead': waveform === 'saw' ? 'Saw Lead' : waveform === 'square' ? 'Square Lead' : 'Synth Lead',
    'supersaw': 'Supersaw Lead',
    'pad': brightness > 0.5 ? 'Bright Pad' : 'Warm Pad',
    'pluck': 'Synth Pluck',
    'kick': 'Synth Kick',
    'drums': 'Drum Sound',
    'bell': 'Bell / Metallic',
    'fm-sound': 'FM Sound',
    'strings': 'String Sound',
    'brass': 'Brass Sound',
    'vocal': 'Vocal / Vocal-like',
    'fx': 'Sound Effect',
    'unknown': 'Synthesized Sound'
  };

  return displayNames[soundType] || 'Synthesized Sound';
}
