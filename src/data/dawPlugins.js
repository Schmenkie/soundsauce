/**
 * Ableton Live plugin recommendations for the "recreate it" recipe.
 *
 * Spencer is on Live 12 Standard, so this is the only DAW the Lab knows. It carries the
 * DAW-independent pieces too: detectSoundType() (analysis features → sound type) and
 * PARAMETER_TRANSLATIONS (analysis numbers → knob positions).
 */

// =============================================================================
// Sound type detection + parameter translation (DAW-independent)
// =============================================================================

/**
 * Translates analysis values to plugin-specific settings.
 * Converts technical numbers into human-readable knob positions.
 */
export const PARAMETER_TRANSLATIONS = {
  /**
   * Convert brightness (0-1) to filter cutoff recommendation
   */
  brightnessToFilterCutoff: (brightness) => {
    if (brightness > 0.7) {
      return {
        value: '80-100%',
        explanation: 'Your sound is bright - keep the filter open or use high-pass only',
        knobPosition: 'Almost fully clockwise'
      };
    } else if (brightness > 0.4) {
      return {
        value: '50-70%',
        explanation: 'Balanced brightness - set filter to mid position',
        knobPosition: 'Around 12 o\'clock to 2 o\'clock'
      };
    } else {
      return {
        value: '20-40%',
        explanation: 'Dark/warm sound - close the filter more',
        knobPosition: 'Around 9 o\'clock to 11 o\'clock'
      };
    }
  },

  /**
   * Convert attack time (ms) to envelope recommendation
   */
  attackTimeToEnvelope: (attackMs) => {
    if (attackMs < 10) {
      return {
        value: '0-5ms',
        explanation: 'Instant/punchy attack - turn attack all the way down',
        knobPosition: 'Fully counter-clockwise'
      };
    } else if (attackMs < 50) {
      return {
        value: '10-50ms',
        explanation: 'Quick attack with slight softness',
        knobPosition: 'Just off minimum'
      };
    } else if (attackMs < 200) {
      return {
        value: '50-200ms',
        explanation: 'Softer attack - good for pads and smooth sounds',
        knobPosition: 'Around 9-10 o\'clock'
      };
    } else {
      return {
        value: '200ms+',
        explanation: 'Slow fade-in attack - very pad-like',
        knobPosition: 'Around 11-12 o\'clock or higher'
      };
    }
  },

  /**
   * Convert harmonicity (0-1) to oscillator/synthesis recommendation
   */
  harmonicityToOscillator: (harmonicity) => {
    if (harmonicity > 0.7) {
      return {
        waveform: 'Saw or Square',
        explanation: 'Tonal sound - use pitched oscillators',
        synthType: 'subtractive'
      };
    } else if (harmonicity > 0.4) {
      return {
        waveform: 'Saw + Noise',
        explanation: 'Semi-tonal - blend pitched wave with noise',
        synthType: 'hybrid'
      };
    } else {
      return {
        waveform: 'Noise or FM',
        explanation: 'Noisy/percussive - use noise or FM synthesis',
        synthType: 'fm or noise'
      };
    }
  },

  /**
   * Convert spectral centroid (Hz) to EQ/filter recommendation
   */
  spectralCentroidToFrequencyRange: (centroid) => {
    if (centroid > 2000) {
      return {
        range: 'High-mid focused',
        highPass: '100-150Hz',
        lowPass: '12-16kHz',
        explanation: 'Bright sound - will cut through the mix'
      };
    } else if (centroid > 500) {
      return {
        range: 'Mid focused',
        highPass: '60-100Hz',
        lowPass: '8-12kHz',
        explanation: 'Balanced presence'
      };
    } else {
      return {
        range: 'Bass focused',
        highPass: '20-40Hz',
        lowPass: '4-8kHz',
        explanation: 'Bass-heavy - needs room in low end'
      };
    }
  },

  /**
   * Convert detected modulation to LFO settings
   */
  modulationToLFO: (modulation) => {
    if (!modulation) return null;

    const result = {
      lfoSettings: []
    };

    if (modulation.hasTremolo) {
      result.lfoSettings.push({
        destination: 'Volume',
        rate: modulation.lfoRate || '4Hz',
        depth: modulation.tremoloDepth ? `${modulation.tremoloDepth}%` : '20-30%'
      });
    }

    if (modulation.hasVibrato) {
      result.lfoSettings.push({
        destination: 'Pitch',
        rate: modulation.lfoRate || '5Hz',
        depth: modulation.vibratoDepth || '5-10 cents'
      });
    }

    if (modulation.hasChorus) {
      result.lfoSettings.push({
        destination: 'Detune/Chorus',
        explanation: 'Enable chorus effect or add unison detune'
      });
    }

    return result;
  }
};

/**
 * Detect sound type from analysis features
 * Returns the most likely sound type based on analysis
 */
export function detectSoundType(features, selectedInstrument = 'unknown') {
  // If user selected a specific instrument, trust that
  const instrumentToSoundType = {
    'kick': 'kick',
    'snare': 'drums',
    'hihat': 'drums',
    'drums': 'drums',
    'bass': 'bass',
    'sub-bass': 'sub-bass',
    'sub': 'sub-bass',
    'lead': 'lead',
    'synth': 'lead',
    'pad': 'pad',
    'pluck': 'pluck',
    'strings': 'strings',
    'brass': 'brass',
    'keys': 'bell',
    'vocal': 'vocal',
    'fx': 'fx',
    'woodwind': 'lead',      // Woodwinds are melodic, treat like leads
    'electronic': 'lead',    // Electronic genre - default to lead synth
    'full': null             // Full mix - use auto-detection
  };

  if (selectedInstrument && instrumentToSoundType[selectedInstrument]) {
    return instrumentToSoundType[selectedInstrument];
  }

  // Auto-detect from features
  if (!features) return 'unknown';

  const { brightness, harmonicity, spectralCentroid, adsr, attackTime } = features;
  const attack = attackTime || adsr?.attack || 50;
  const sustain = adsr?.sustain || 50;

  // Sub-bass detection: low centroid, high harmonicity, low brightness
  if (spectralCentroid < 200 && harmonicity > 0.6 && brightness < 0.3) {
    return 'sub-bass';
  }

  // Bass detection: low-mid centroid, decent harmonicity
  if (spectralCentroid < 500 && harmonicity > 0.4) {
    return 'bass';
  }

  // Kick detection: very fast attack, low centroid, short decay
  if (attack < 10 && spectralCentroid < 300 && adsr?.decay < 300) {
    return 'kick';
  }

  // Pad detection: slow attack, high sustain
  if (attack > 100 && sustain > 60) {
    return 'pad';
  }

  // Pluck detection: fast attack, low sustain, quick decay
  if (attack < 20 && sustain < 30 && adsr?.decay < 500) {
    return 'pluck';
  }

  // Supersaw detection: high harmonicity, high brightness, mid-high centroid
  // Supersaws have stacked detuned saws = very harmonic, very bright
  if (harmonicity > 0.7 && brightness > 0.5 && spectralCentroid > 1000 && sustain > 40) {
    return 'supersaw';
  }

  // Lead detection: mid-high centroid, fast attack, decent sustain
  if (spectralCentroid > 800 && attack < 50 && sustain > 40) {
    return 'lead';
  }

  // Bell detection: very low harmonicity (inharmonic)
  if (harmonicity < 0.4 && attack < 20) {
    return 'bell';
  }

  return 'unknown';
}

// =============================================================================
// Ableton Live Plugin Profiles
// =============================================================================

const ABLETON_PLUGINS = {
  'Operator': {
    name: 'Operator',
    fullName: 'Operator',
    description: 'Versatile FM synthesizer with 4 oscillators that can act as carriers or modulators. Great for everything from pure sub basses to complex metallic sounds.',
    bestFor: ['fm-bass', 'sub-bass', 'bells', 'metallic-sounds', 'e-piano', 'plucks'],
    notIdealFor: ['wavetable-sounds', 'resynthesis'],
    difficulty: 3,
    features: [
      'Four oscillators with FM routing',
      'Each oscillator has its own envelope',
      'Built-in filter with envelope',
      'LFO section',
      'Multiple FM algorithms'
    ],
    limitations: [
      'FM synthesis concepts can be confusing',
      'No wavetable support'
    ],
    presetPath: 'Instruments > Operator > Presets'
  },

  'Wavetable': {
    name: 'Wavetable',
    fullName: 'Wavetable',
    description: 'Modern wavetable synth with two oscillators, sub oscillator, and extensive modulation. Ableton\'s flagship synth for contemporary sound design.',
    bestFor: ['modern-bass', 'supersaws', 'leads', 'pads', 'evolving-textures', 'dubstep'],
    notIdealFor: ['realistic-instruments', 'simple-sub-bass'],
    difficulty: 3,
    features: [
      'Two wavetable oscillators with 200+ wavetables',
      'Sub oscillator',
      'Extensive modulation matrix',
      'Built-in effects',
      'Unison per oscillator'
    ],
    limitations: [
      'Can be CPU intensive with high unison',
      'Requires Live Suite'
    ],
    presetPath: 'Instruments > Wavetable > Presets'
  },

  'Analog': {
    name: 'Analog',
    fullName: 'Analog',
    description: 'Classic analog-modeled subtractive synth. Two oscillators, two filters, two LFOs. Simple and warm sounding.',
    bestFor: ['bass', 'warm-leads', 'pads', 'vintage-synths', 'acid-bass'],
    notIdealFor: ['fm-sounds', 'complex-textures', 'modern-edm'],
    difficulty: 2,
    features: [
      'Two analog-modeled oscillators',
      'Two multimode filters',
      'Two LFOs with sync',
      'Noise generator',
      'Warm, analog character'
    ],
    limitations: [
      'Basic waveforms only (saw, square, sine, noise)',
      'No wavetables or FM'
    ],
    presetPath: 'Instruments > Analog > Presets'
  },

  'Drift': {
    name: 'Drift',
    fullName: 'Drift',
    description: 'Characterful, slightly unstable analog synth. Adds organic imperfection to sounds. Great for lo-fi and textured tones.',
    bestFor: ['lo-fi', 'organic-textures', 'warm-pads', 'vintage-sounds', 'ambient'],
    notIdealFor: ['clean-sounds', 'precise-bass', 'modern-edm'],
    difficulty: 2,
    features: [
      'Two oscillators with shape control',
      'Built-in analog drift/instability',
      'Multimode filter',
      'Cycling envelope for modulation',
      'Simple, focused interface'
    ],
    limitations: [
      'Intentionally imprecise',
      'Limited oscillator types'
    ],
    presetPath: 'Instruments > Drift > Presets'
  },

  'Simpler': {
    name: 'Simpler',
    fullName: 'Simpler',
    description: 'Sample-based instrument. Drop any audio in and play it as an instrument. Includes slicing and warping modes.',
    bestFor: ['realistic-instruments', 'sampling', 'drums', 'vocal-sounds', 'quick-sounds'],
    notIdealFor: ['from-scratch-synthesis', 'wavetable-sounds'],
    difficulty: 1,
    features: [
      'Drag-and-drop any audio sample',
      'Classic, 1-Shot, and Slice modes',
      'Built-in filter and envelope',
      'Warp modes for pitch shifting',
      'Easy sample manipulation'
    ],
    limitations: [
      'Sample-based, not synthesis',
      'Depends on having good samples'
    ],
    presetPath: 'Instruments > Simpler > Presets'
  }
};

// Vital (Free) — used across all DAWs as alternative
// =============================================================================

const VITAL_PROFILE = {
  name: 'Vital',
  fullName: 'Vital (Free Plugin)',
  description: 'Free wavetable synth that rivals Serum. Works in any DAW. Extremely powerful for modern sound design. Download at vital.audio.',
  bestFor: ['modern-bass', 'supersaws', 'wavetable-sounds', 'dubstep', 'future-bass', 'complex-leads'],
  notIdealFor: ['vintage-sounds', 'realistic-instruments'],
  difficulty: 3,
  features: [
    'Wavetable synthesis',
    'Three oscillators + sampler',
    'Advanced modulation matrix',
    'Built-in effects',
    'Visual feedback',
    'Drag audio to create wavetables'
  ],
  limitations: [
    'Separate install required',
    'Can be CPU intensive'
  ],
  presetPath: 'Check your DAW\'s plugin list > Vital'
};

// =============================================================================
// All DAW Plugin Profiles (lookup table)
// =============================================================================

export const DAW_PLUGIN_PROFILES = {
  'Ableton Live': ABLETON_PLUGINS,
};

// =============================================================================
// Sound Type → Plugin Mapping Per DAW
// =============================================================================

const ABLETON_SOUND_MAP = {
  'sub-bass': {
    primary: 'Operator',
    alternatives: ['Analog'],
    reasoning: 'Operator can create a clean sine wave sub with precise pitch envelope control.',
    quickStart: [
      'Open Operator',
      'Set Oscillator A to Sine wave',
      'Turn off Oscillators B, C, D',
      'Set Algorithm to simple (A only)',
      'Play notes in C0-C2 range',
      'Optional: Add Saturator after for warmth'
    ]
  },
  'bass': {
    primary: 'Analog',
    alternatives: ['Wavetable', 'Operator'],
    reasoning: 'Analog gives warm, punchy bass with easy-to-use oscillators and filter. Wavetable for more modern bass.',
    quickStart: [
      'Open Analog',
      'Set OSC 1 to Saw wave',
      'Set OSC 2 to Sub (Sine, -1 octave)',
      'Turn on Filter 1 (Low-pass)',
      'Adjust cutoff and resonance to taste',
      'Short attack, medium sustain on amp envelope'
    ]
  },
  'reese-bass': {
    primary: 'Wavetable',
    alternatives: ['Analog'],
    reasoning: 'Wavetable\'s unison and stereo spread are perfect for the classic detuned reese bass sound.',
    quickStart: [
      'Open Wavetable',
      'Set OSC 1 to a Saw wavetable',
      'Enable Unison: 4-6 voices',
      'Detune: 20-30%',
      'Spread for stereo width',
      'Low-pass filter around 1-2kHz'
    ]
  },
  'lead': {
    primary: 'Wavetable',
    alternatives: ['Operator', 'Analog'],
    reasoning: 'Wavetable excels at cutting leads with its wavetable scanning and unison engine.',
    quickStart: [
      'Open Wavetable',
      'Choose a bright wavetable for OSC 1',
      'Add slight unison (2-4 voices)',
      'Open the filter for brightness',
      'Short attack, medium sustain',
      'Add reverb and delay to taste'
    ]
  },
  'supersaw': {
    primary: 'Wavetable',
    alternatives: ['Analog'],
    reasoning: 'Wavetable has the best unison engine in Ableton for thick supersaw stacks.',
    quickStart: [
      'Open Wavetable',
      'Set OSC 1 to Basic Shapes > Saw',
      'Unison voices: 7+',
      'Unison Amount (detune): 15-25%',
      'Spread for wide stereo',
      'Optional: Layer OSC 2 an octave up or down',
      'High-pass around 100Hz'
    ]
  },
  'pluck': {
    primary: 'Analog',
    alternatives: ['Operator', 'Wavetable'],
    reasoning: 'Analog\'s quick envelopes make it perfect for snappy pluck sounds.',
    quickStart: [
      'Open Analog',
      'Set OSC 1 to Saw or Square',
      'Amp Envelope: Attack 0ms, Decay 100-300ms, Sustain 0%',
      'Turn on Filter with envelope',
      'Filter cutoff 50%, envelope amount positive',
      'Short filter decay for the "pluck" character'
    ]
  },
  'pad': {
    primary: 'Wavetable',
    alternatives: ['Drift', 'Analog'],
    reasoning: 'Wavetable\'s evolving wavetables and modulation create beautiful, rich pads. Drift for more organic textures.',
    quickStart: [
      'Open Wavetable',
      'Choose a smooth wavetable',
      'Slow attack: 300-800ms',
      'High sustain, long release (1-3s)',
      'Add unison for width',
      'Modulate wavetable position with LFO for movement',
      'Add reverb'
    ]
  },
  'evolving-pad': {
    primary: 'Wavetable',
    alternatives: ['Drift'],
    reasoning: 'Modulate Wavetable\'s wavetable position with an LFO for constantly shifting textures.',
    quickStart: [
      'Open Wavetable',
      'Choose an evolving wavetable',
      'Map LFO to wavetable position (slow rate)',
      'Slow attack (500ms+), long release (2s+)',
      'Add chorus and reverb effects',
      'Experiment with modulation matrix'
    ]
  },
  'kick': {
    primary: 'Operator',
    alternatives: ['Simpler'],
    reasoning: 'Operator with pitch envelope creates classic synth kicks. The pitch sweep from high to low makes the click-to-thump sound.',
    quickStart: [
      'Open Operator',
      'Set Oscillator A to Sine',
      'Add pitch envelope: start high (+24 semitones)',
      'Quick pitch decay to 0 (20-80ms)',
      'Amp envelope: short decay (100-300ms), no sustain',
      'Add Saturator for punch'
    ]
  },
  'drums': {
    primary: 'Simpler',
    alternatives: ['Operator'],
    reasoning: 'Simpler lets you load drum samples and tweak them quickly. Or use Operator for synth drums.',
    quickStart: [
      'For samples: Open Simpler, drag in a drum sample',
      'Set to 1-Shot mode',
      'Adjust decay and filter',
      'For synth drums: Use Operator with sine + noise'
    ]
  },
  'bell': {
    primary: 'Operator',
    alternatives: ['Wavetable'],
    reasoning: 'FM synthesis is the classic way to create bell tones. Operator\'s 4 operators give you precise FM control.',
    quickStart: [
      'Open Operator',
      'Use Algorithm with modulation (B→A)',
      'Oscillator A: Sine (carrier)',
      'Oscillator B: Sine at ratio 2, 3, or 7 (modulator)',
      'Higher ratios = more metallic',
      'Quick attack, medium-long decay, no sustain'
    ]
  },
  'fm-sound': {
    primary: 'Operator',
    alternatives: ['Wavetable'],
    reasoning: 'Operator is Ableton\'s FM synth with 4 operators and multiple routing algorithms.',
    quickStart: [
      'Open Operator',
      'Choose an algorithm with modulation routing',
      'A = carrier (what you hear)',
      'B = modulator (changes timbre)',
      'Experiment with B\'s frequency ratio',
      'Add envelope to modulator level for movement'
    ]
  },
  'strings': {
    primary: 'Wavetable',
    alternatives: ['Simpler', 'Analog'],
    reasoning: 'Wavetable can produce lush string textures. Simpler works if you have string samples.',
    quickStart: [
      'Open Wavetable with a strings-like wavetable',
      'Slow attack: 200-500ms',
      'High sustain, long release',
      'Add unison for ensemble width',
      'Low-pass filter to soften harshness'
    ]
  },
  'brass': {
    primary: 'Analog',
    alternatives: ['Operator', 'Simpler'],
    reasoning: 'Analog\'s saw wave with filter envelope mimics the brassy attack. Simpler for realistic brass samples.',
    quickStart: [
      'Open Analog',
      'Saw wave oscillator',
      'Filter envelope with quick attack (opens on note)',
      'Medium attack (20-100ms)',
      'Add subtle vibrato via LFO to pitch'
    ]
  },
  'fx': {
    primary: 'Wavetable',
    alternatives: ['Operator', 'Drift'],
    reasoning: 'Wavetable\'s modulation capabilities make it great for risers, impacts, and experimental FX.',
    quickStart: [
      'Open Wavetable',
      'Experiment with extreme modulation',
      'Try: LFO to pitch for risers',
      'Try: Rapid wavetable position changes',
      'Add heavy effects (reverb, delay, distortion)'
    ]
  },
  'vocal': {
    primary: 'Simpler',
    alternatives: ['Wavetable'],
    reasoning: 'Load a vocal sample into Simpler for instant playable vocals. Wavetable can approximate formants.',
    quickStart: [
      'Open Simpler',
      'Drag a vocal sample in',
      'Set to Classic mode for chromatic play',
      'Adjust envelope for smooth playback',
      'Or use Wavetable with formant-style wavetables'
    ]
  },
  'unknown': {
    primary: 'Wavetable',
    alternatives: ['Analog', 'Simpler'],
    reasoning: 'Wavetable is the most versatile Ableton synth. Start here and narrow down.',
    quickStart: [
      'Open Wavetable and browse presets',
      'Find something close to your target sound',
      'Tweak from there',
      'Or use Analog for simple, warm sounds'
    ]
  }
};

export const DAW_SOUND_TYPE_MAP = {
  'Ableton Live': ABLETON_SOUND_MAP,
};

// =============================================================================
// Supported DAWs list
// =============================================================================

const SUPPORTED_DAWS = ['Ableton Live'];

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Get a complete Ableton Live recipe for recreating a sound.
 *
 * @param {Object} features - Audio analysis features
 * @param {string} selectedInstrument - Detected/selected instrument type
 * @param {string} dawPreference - User's DAW preference from profile
 * @returns {Object} Complete recipe with plugin info, quickStart steps, and settings
 */
export function getDAWRecipe(features, selectedInstrument, dawPreference) {
  const daw = dawPreference || 'Ableton Live';

  // Unsupported DAWs get Vital-only generic recipe
  if (!SUPPORTED_DAWS.includes(daw)) {
    return getVitalOnlyRecipe(features, selectedInstrument);
  }

  // Supported DAW — build recipe from DAW-specific data
  const soundType = detectSoundType(features, selectedInstrument);
  const soundMap = DAW_SOUND_TYPE_MAP[daw]?.[soundType] || DAW_SOUND_TYPE_MAP[daw]?.['unknown'];
  const pluginProfiles = DAW_PLUGIN_PROFILES[daw] || {};

  if (!soundMap) {
    return getVitalOnlyRecipe(features, selectedInstrument);
  }

  const primaryPlugin = pluginProfiles[soundMap.primary] || VITAL_PROFILE;

  const recommendation = {
    plugin: soundMap.primary,
    pluginInfo: primaryPlugin,
    reasoning: soundMap.reasoning,
    quickStart: soundMap.quickStart,
    alternatives: (soundMap.alternatives || []).map(alt => ({
      name: alt,
      info: pluginProfiles[alt] || (alt === 'Vital' ? VITAL_PROFILE : { name: alt })
    })),
    settingsSuggestions: []
  };

  // Add analysis-based setting suggestions (DAW-independent)
  if (features?.brightness !== undefined) {
    recommendation.settingsSuggestions.push({
      parameter: 'Filter Cutoff',
      ...PARAMETER_TRANSLATIONS.brightnessToFilterCutoff(features.brightness)
    });
  }

  if (features?.attackTime !== undefined || features?.adsr?.attack !== undefined) {
    const attack = features.attackTime || features.adsr?.attack;
    recommendation.settingsSuggestions.push({
      parameter: 'Envelope Attack',
      ...PARAMETER_TRANSLATIONS.attackTimeToEnvelope(attack)
    });
  }

  if (features?.harmonicity !== undefined) {
    recommendation.settingsSuggestions.push({
      parameter: 'Oscillator',
      ...PARAMETER_TRANSLATIONS.harmonicityToOscillator(features.harmonicity)
    });
  }

  // Build the same shape as getFLStudioRecipe returns
  const soundDescription = getSoundDescription(soundType);

  return {
    soundType,
    soundDescription,
    ...recommendation,
    filterSettings: features?.brightness !== undefined
      ? PARAMETER_TRANSLATIONS.brightnessToFilterCutoff(features.brightness)
      : null,
    envelopeSettings: features?.adsr
      ? {
          attack: PARAMETER_TRANSLATIONS.attackTimeToEnvelope(features.adsr.attack),
          decay: `${features.adsr.decay}ms`,
          sustain: `${features.adsr.sustain}%`,
          release: `${features.adsr.release}ms`
        }
      : null,
    oscillatorSettings: features?.harmonicity !== undefined
      ? PARAMETER_TRANSLATIONS.harmonicityToOscillator(features.harmonicity)
      : null,
    frequencyRange: features?.spectralCentroid !== undefined
      ? PARAMETER_TRANSLATIONS.spectralCentroidToFrequencyRange(features.spectralCentroid)
      : null,
    modulationSettings: features?.modulation
      ? PARAMETER_TRANSLATIONS.modulationToLFO(features.modulation)
      : null
  };
}

/**
 * Get a Vital-only recipe for unsupported DAWs
 */
function getVitalOnlyRecipe(features, selectedInstrument) {
  const soundType = detectSoundType(features, selectedInstrument);
  const soundMap = ABLETON_SOUND_MAP[soundType] || ABLETON_SOUND_MAP['unknown'];

  return {
    soundType,
    soundDescription: getSoundDescription(soundType),
    plugin: 'Vital',
    pluginInfo: VITAL_PROFILE,
    reasoning: soundMap.reasoning + ' Vital is a free, powerful synth that works in any DAW.',
    quickStart: soundMap.quickStart,
    alternatives: [],
    settingsSuggestions: [],
    filterSettings: features?.brightness !== undefined
      ? PARAMETER_TRANSLATIONS.brightnessToFilterCutoff(features.brightness)
      : null,
    envelopeSettings: features?.adsr
      ? {
          attack: PARAMETER_TRANSLATIONS.attackTimeToEnvelope(features.adsr.attack),
          decay: `${features.adsr.decay}ms`,
          sustain: `${features.adsr.sustain}%`,
          release: `${features.adsr.release}ms`
        }
      : null,
    oscillatorSettings: features?.harmonicity !== undefined
      ? PARAMETER_TRANSLATIONS.harmonicityToOscillator(features.harmonicity)
      : null,
    frequencyRange: features?.spectralCentroid !== undefined
      ? PARAMETER_TRANSLATIONS.spectralCentroidToFrequencyRange(features.spectralCentroid)
      : null,
    modulationSettings: features?.modulation
      ? PARAMETER_TRANSLATIONS.modulationToLFO(features.modulation)
      : null
  };
}

/**
 * Sound type display descriptions (shared across all DAWs)
 */
function getSoundDescription(soundType) {
  const descriptions = {
    'sub-bass': 'Deep, low sub bass that you feel more than hear',
    'bass': 'General bass sound with body and presence',
    'reese-bass': 'Detuned, phasing bass sound (classic DnB sound)',
    'lead': 'Melodic synth lead that cuts through the mix',
    'supersaw': 'Thick, wide saw wave with lots of unison',
    'pluck': 'Short, snappy sound with fast attack and decay',
    'pad': 'Sustained, atmospheric background sound',
    'evolving-pad': 'Pad that changes and morphs over time',
    'kick': 'Kick drum - the foundation of the beat',
    'drums': 'Drum sounds (snares, toms, etc.)',
    'bell': 'Bell-like, metallic tones',
    'fm-sound': 'Complex FM synthesis sound',
    'strings': 'String-like sounds (violin, cello, orchestral)',
    'brass': 'Brass-like sounds (horns, trumpets)',
    'fx': 'Sound effects, risers, impacts',
    'vocal': 'Vocal-like or talking synth sounds',
    'unknown': 'General/unknown sound type'
  };
  return descriptions[soundType] || 'General/unknown sound type';
}

/**
 * Get the plugin profiles for a DAW (only Ableton Live is known).
 */
export function getPluginProfilesForDAW(dawPreference) {
  return DAW_PLUGIN_PROFILES[dawPreference || 'Ableton Live'] || ABLETON_PLUGINS;
}

/**
 * Check if a DAW is fully supported with plugin recommendations
 */
export function isDAWSupported(dawPreference) {
  return SUPPORTED_DAWS.includes(dawPreference);
}

/**
 * Get 3-4 concise integration tips for using a Vital preset within a specific DAW.
 * These are short, actionable tips — not a full synthesis tutorial.
 * @param {string} daw - DAW name ('Ableton Live')
 * @param {string} soundType - Detected sound type (e.g. 'bass', 'lead', 'pad')
 * @returns {{ title: string, detail: string }[]}
 */
export function getDAWIntegrationTips(daw, soundType) {
  const tips = [];

  // Tip 1: How to load the .vital preset in this DAW
  const loadInstructions = {
    'Ableton Live': 'Drag Vital onto a MIDI track from Plug-ins in the Browser. Then drag the .vital file onto Vital\'s window, or use the preset browser inside Vital.',
  };
  tips.push({
    title: `Load the preset in ${daw}`,
    detail: loadInstructions[daw] || 'Double-click the .vital file to open it in Vital, or drag it onto Vital\'s window.'
  });

  // Tip 2: DAW-specific effects chain recommendation
  const effectsTips = {
    'Ableton Live': {
      bass: 'Add EQ Eight after Vital: high-pass at 30Hz, boost at 80-120Hz. Add Saturator (Soft Sine) for subtle warmth.',
      lead: 'Add Simple Delay (1/8 dotted) and Reverb (small room, ~15% dry/wet) after Vital on the same track.',
      pad: 'Send to a Return track with Reverb (large hall, long decay). Add Chorus-Ensemble on the pad track for width.',
      pluck: 'Add Ping Pong Delay (1/8) and a touch of Reverb. Use Compressor to tighten the attack.',
      kick: 'Add Saturator for analog warmth. Use Compressor with sidechain from the kick on bass tracks.',
      drums: 'Add Drum Buss for saturation and transient shaping. Use EQ Eight to carve frequency space.',
    },
  };

  const normalizedType = ['sub-bass', 'reese-bass'].includes(soundType) ? 'bass'
    : ['supersaw'].includes(soundType) ? 'lead'
    : ['evolving-pad', 'strings'].includes(soundType) ? 'pad'
    : ['bell', 'fm-sound'].includes(soundType) ? 'pluck'
    : soundType;

  const fxTip = effectsTips[daw]?.[normalizedType] || effectsTips[daw]?.['lead'];
  if (fxTip) {
    tips.push({
      title: `Add ${daw} effects chain`,
      detail: fxTip
    });
  }

  // Tip 3: Sound-type-specific mixing tip
  const mixTips = {
    bass: { title: 'Mix: Sidechain to kick', detail: 'Route the kick to sidechain the bass compressor so the bass ducks slightly on each kick hit. This keeps the low end clean and punchy. Also pan bass to center (mono below ~200Hz).' },
    lead: { title: 'Mix: Carve space with EQ', detail: 'Cut a small notch around 300-500Hz to reduce muddiness. Boost slightly at 2-5kHz for presence. Pan slightly off-center if there\'s a vocal in the mix.' },
    pad: { title: 'Mix: Send to reverb bus', detail: 'Instead of adding reverb directly on the pad, use a send/bus/return track with reverb. This gives you more control over the wet/dry balance and keeps the mix cleaner. Keep pad volume subtle — it should fill space, not dominate.' },
    pluck: { title: 'Mix: Tighten with compression', detail: 'Use fast attack and release compression to control the transient. Pan plucks slightly for stereo width. Use delay instead of reverb for rhythmic plucks.' },
    kick: { title: 'Mix: Give the kick its own space', detail: 'High-pass all other instruments at 80-100Hz (except bass). Use a short reverb (or none) on the kick. Layer a click sample at ~2-5kHz if the kick needs more definition.' },
    drums: { title: 'Mix: Bus process drums together', detail: 'Route all drum elements to a bus/group. Add subtle bus compression (2-4dB gain reduction) to glue them together. This makes the kit sound cohesive.' },
  };

  const mixTip = mixTips[normalizedType] || mixTips['lead'];
  if (mixTip) {
    tips.push(mixTip);
  }

  // Tip 4 (optional): Layering suggestion for certain sound types
  const layerTips = {
    bass: { title: 'Layering: Add a top layer', detail: 'Duplicate the Vital channel and add a second instance with a brighter preset or higher octave for mid-range presence. Use EQ to split: sub layer handles below 150Hz, top layer handles above 150Hz.' },
    pad: { title: 'Layering: Stack textures', detail: 'Try layering two different pad presets — one for low warmth, one for high shimmer. Pan them slightly apart and use different reverb sends for depth.' },
    kick: { title: 'Layering: Combine sub + click', detail: 'Layer a clean sine sub (Vital preset) with a short click/transient sample. The sub provides the weight, the click provides the attack definition. Blend to taste.' },
  };

  const layerTip = layerTips[normalizedType];
  if (layerTip) {
    tips.push(layerTip);
  }

  return tips;
}
