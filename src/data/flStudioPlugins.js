/**
 * FL Studio Stock Plugin Recommendation System
 *
 * Maps sound types and audio analysis features to FL Studio stock plugin recommendations.
 * Designed for beginner producers who have FL Studio stock plugins + Vital.
 *
 * Architecture:
 * 1. Plugin profiles define what each FL plugin is best at
 * 2. Sound type mappings recommend plugins based on detected sound characteristics
 * 3. Parameter translations convert analysis values to beginner-friendly settings
 */

// =============================================================================
// FL Studio Stock Plugin Profiles
// =============================================================================

/**
 * Detailed profiles for each FL Studio stock synth plugin.
 * Each profile includes:
 * - description: What the plugin is and who it's for
 * - bestFor: Array of sound types this plugin excels at
 * - notIdealFor: Array of sound types to avoid with this plugin
 * - difficulty: 1-5 scale (1=easiest, 5=hardest)
 * - features: Key capabilities of the plugin
 * - limitations: What it can't do well
 * - presetPath: Where to find good starting presets in FL
 */
export const FL_PLUGIN_PROFILES = {
  '3xOsc': {
    name: '3xOsc',
    fullName: '3x Oscillator',
    description: 'The simplest synth in FL Studio. Three basic oscillators you can mix together. Perfect for learning synthesis fundamentals.',
    bestFor: ['sub-bass', 'bass', 'simple-lead', 'chip-tune', 'learning'],
    notIdealFor: ['complex-pads', 'evolving-textures', 'wavetable-sounds', 'fm-sounds'],
    difficulty: 1,
    features: [
      'Three oscillators with basic waveforms (sine, saw, square, triangle)',
      'Simple mixing and detuning',
      'Coarse and fine tuning per oscillator',
      'Phase control',
      'Built-in filter and envelope'
    ],
    limitations: [
      'No wavetables',
      'Basic filter options',
      'No built-in effects',
      'Limited modulation'
    ],
    presetPath: 'Packs > Legacy > 3x Osc',
    // Parameter ranges for translation
    parameters: {
      oscillatorMix: { min: 0, max: 100, unit: '%' },
      coarseTune: { min: -24, max: 24, unit: 'semitones' },
      fineTune: { min: -100, max: 100, unit: 'cents' },
      filterCutoff: { min: 0, max: 100, unit: '%' },
      filterResonance: { min: 0, max: 100, unit: '%' }
    }
  },

  'Sytrus': {
    name: 'Sytrus',
    fullName: 'Sytrus FM Synthesizer',
    description: 'Powerful FM synthesizer with 6 operators. Can create everything from bells to basses to pads. Steeper learning curve but very versatile.',
    bestFor: ['fm-bass', 'bells', 'plucks', 'metallic-sounds', 'evolving-pads', 'complex-leads', 'e-piano'],
    notIdealFor: ['simple-sub-bass', 'quick-presets'],
    difficulty: 4,
    features: [
      'FM synthesis with 6 operators',
      'Ring modulation',
      'Built-in effects (reverb, delay, chorus)',
      'Advanced envelope editor',
      'Unison and detune',
      'Filter section'
    ],
    limitations: [
      'Steep learning curve',
      'Can be CPU-intensive with complex patches',
      'FM synthesis concepts required'
    ],
    presetPath: 'Packs > Instruments > Sytrus',
    parameters: {
      operatorRatio: { min: 0.5, max: 16, unit: 'ratio' },
      operatorLevel: { min: 0, max: 100, unit: '%' },
      fmAmount: { min: 0, max: 100, unit: '%' },
      filterCutoff: { min: 20, max: 20000, unit: 'Hz' },
      attack: { min: 0, max: 10000, unit: 'ms' },
      decay: { min: 0, max: 10000, unit: 'ms' },
      sustain: { min: 0, max: 100, unit: '%' },
      release: { min: 0, max: 10000, unit: 'ms' }
    }
  },

  'FLEX': {
    name: 'FLEX',
    fullName: 'FLEX',
    description: 'Modern preset-based synth. Great for quickly getting professional sounds without deep synthesis knowledge. The "just works" option.',
    bestFor: ['quick-sounds', 'modern-presets', 'beginners', 'pads', 'leads', 'basses', 'plucks'],
    notIdealFor: ['deep-sound-design', 'unique-sounds', 'learning-synthesis'],
    difficulty: 1,
    features: [
      'Huge preset library (1000+)',
      'Simple macro controls',
      'Built-in effects',
      'Easy to tweak sounds',
      'Good quality out of the box'
    ],
    limitations: [
      'Preset-focused (less customizable)',
      'Can\'t create sounds from scratch',
      'Limited deep editing'
    ],
    presetPath: 'Packs > Instruments > FLEX',
    parameters: {
      macro1: { min: 0, max: 100, unit: '%', label: 'Macro 1' },
      macro2: { min: 0, max: 100, unit: '%', label: 'Macro 2' },
      attack: { min: 0, max: 100, unit: '%' },
      release: { min: 0, max: 100, unit: '%' }
    }
  },

  'Harmor': {
    name: 'Harmor',
    fullName: 'Harmor',
    description: 'Additive/resynthesis powerhouse. Can import images and audio as sound sources. Incredibly powerful but complex.',
    bestFor: ['resynthesis', 'vocal-sounds', 'evolving-textures', 'experimental', 'complex-pads', 'image-synthesis'],
    notIdealFor: ['simple-sounds', 'beginners', 'quick-results'],
    difficulty: 5,
    features: [
      'Additive synthesis engine',
      'Resynthesis from audio files',
      'Image to sound conversion',
      'Advanced harmonic editing',
      'Blur and other unique effects',
      'Unison and sub-harmonic'
    ],
    limitations: [
      'Steep learning curve',
      'CPU intensive',
      'Overkill for simple sounds'
    ],
    presetPath: 'Packs > Instruments > Harmor',
    parameters: {
      brightness: { min: 0, max: 100, unit: '%' },
      harmonicBlur: { min: 0, max: 100, unit: '%' },
      prism: { min: -100, max: 100, unit: '%' },
      subLevel: { min: 0, max: 100, unit: '%' },
      unisonVoices: { min: 1, max: 9, unit: 'voices' },
      unisonDetune: { min: 0, max: 100, unit: '%' }
    }
  },

  'Harmless': {
    name: 'Harmless',
    fullName: 'Harmless',
    description: 'Clean subtractive synth based on Harmor\'s engine. Easier than Harmor but still powerful. Great for clean, polished sounds.',
    bestFor: ['clean-leads', 'pads', 'plucks', 'polished-sounds', 'trance', 'house'],
    notIdealFor: ['dirty-sounds', 'experimental', 'resynthesis'],
    difficulty: 3,
    features: [
      'Additive engine with subtractive workflow',
      'Clean, polished sound',
      'Good unison section',
      'Built-in effects',
      'Phaser and filter combo'
    ],
    limitations: [
      'Less flexible than Harmor',
      'Can sound too clean for some genres'
    ],
    presetPath: 'Packs > Instruments > Harmless',
    parameters: {
      brightness: { min: 0, max: 100, unit: '%' },
      harmonics: { min: 1, max: 128, unit: '' },
      pluck: { min: 0, max: 100, unit: '%' },
      filterCutoff: { min: 0, max: 100, unit: '%' },
      unisonVoices: { min: 1, max: 9, unit: 'voices' },
      unisonOrder: { min: 0, max: 100, unit: '%' }
    }
  },

  'GMS': {
    name: 'GMS',
    fullName: 'Groove Machine Synth',
    description: 'General MIDI-style sounds with easy tweaking. Great for realistic instruments and classic synth sounds.',
    bestFor: ['realistic-instruments', 'pianos', 'strings', 'brass', 'vintage-synths', 'organ'],
    notIdealFor: ['modern-edm', 'dubstep-bass', 'experimental'],
    difficulty: 2,
    features: [
      'General MIDI sound set',
      'Easy macro controls',
      'Good for realistic sounds',
      'Simple interface'
    ],
    limitations: [
      'Not for cutting-edge sound design',
      'Limited synthesis options'
    ],
    presetPath: 'Packs > Instruments > GMS',
    parameters: {
      attack: { min: 0, max: 100, unit: '%' },
      decay: { min: 0, max: 100, unit: '%' },
      sustain: { min: 0, max: 100, unit: '%' },
      release: { min: 0, max: 100, unit: '%' },
      brightness: { min: 0, max: 100, unit: '%' }
    }
  },

  'PoiZone': {
    name: 'PoiZone',
    fullName: 'PoiZone',
    description: 'Simple subtractive synth. Limited but focused - good for quick basslines and leads without overwhelming options.',
    bestFor: ['quick-bass', 'simple-leads', 'learning-subtractive', 'acid-bass'],
    notIdealFor: ['complex-sounds', 'pads', 'evolving-textures'],
    difficulty: 2,
    features: [
      'Two oscillators',
      'Classic subtractive synthesis',
      'Simple envelope controls',
      'Built-in effects'
    ],
    limitations: [
      'Very limited compared to other options',
      'Basic sound palette'
    ],
    presetPath: 'Packs > Instruments > PoiZone',
    parameters: {
      osc1Wave: { options: ['saw', 'square', 'triangle', 'sine', 'noise'] },
      osc2Wave: { options: ['saw', 'square', 'triangle', 'sine', 'noise'] },
      oscMix: { min: 0, max: 100, unit: '%' },
      filterCutoff: { min: 0, max: 100, unit: '%' },
      filterResonance: { min: 0, max: 100, unit: '%' }
    }
  },

  'Vital': {
    name: 'Vital',
    fullName: 'Vital (Free Plugin)',
    description: 'Not FL stock, but you have it! Modern wavetable synth rivaling Serum. Extremely powerful and free. Best for modern sound design.',
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
      'Not FL native (separate install)',
      'Can be CPU intensive'
    ],
    presetPath: 'User > Vital',
    parameters: {
      wavetablePosition: { min: 0, max: 100, unit: '%' },
      unisonVoices: { min: 1, max: 16, unit: 'voices' },
      unisonDetune: { min: 0, max: 100, unit: '%' },
      filterCutoff: { min: 0, max: 100, unit: '%' },
      filterResonance: { min: 0, max: 100, unit: '%' }
    }
  }
};

// =============================================================================
// Sound Type to Plugin Mapping
// =============================================================================

/**
 * Maps detected sound types to recommended FL plugins.
 * Each sound type includes:
 * - primary: Best plugin choice for this sound
 * - alternatives: Other good options
 * - reasoning: Why this plugin is recommended
 * - quickStart: Step-by-step instructions to get started
 */
export const SOUND_TYPE_PLUGIN_MAP = {
  // ===== BASS SOUNDS =====
  'sub-bass': {
    soundDescription: 'Deep, low sub bass that you feel more than hear',
    primary: '3xOsc',
    alternatives: ['Vital', 'Sytrus'],
    reasoning: '3xOsc is perfect for sub bass because you just need a clean sine wave. No fancy features needed - simplicity is key for subs.',
    quickStart: [
      'Open 3xOsc',
      'Set OSC 1 to Sine wave',
      'Turn OFF OSC 2 and OSC 3 (set mix to 0)',
      'Play notes in C0-C2 range for best sub frequencies',
      'Optional: Add slight saturation with Fruity Soft Clipper'
    ],
    settingsFromAnalysis: {
      // Sub bass uses minimal filtering
      filterCutoff: (brightness) => brightness < 0.3 ? 'Leave filter off or set to 100%' : 'Low-pass at 200Hz to clean up',
      envelope: (adsr) => `Attack: 0ms (instant), Decay: 0ms, Sustain: 100%, Release: ${Math.max(50, adsr?.release || 100)}ms`
    }
  },

  'bass': {
    soundDescription: 'General bass sound with body and presence',
    primary: '3xOsc',
    alternatives: ['Vital', 'PoiZone', 'Sytrus'],
    reasoning: '3xOsc handles most bass sounds well. Layer a sine (sub) with a saw (mid) for full bass. Move to Vital for modern/growl bass.',
    quickStart: [
      'Open 3xOsc',
      'Set OSC 1 to Sine wave (sub layer)',
      'Set OSC 2 to Saw wave (mid layer)',
      'Mix: OSC 1 around 70%, OSC 2 around 30%',
      'Turn on the filter, set to Low-pass',
      'Adjust cutoff to taste (darker = lower cutoff)'
    ],
    settingsFromAnalysis: {
      filterCutoff: (brightness) => {
        if (brightness > 0.6) return 'Filter cutoff around 80% - bright bass';
        if (brightness > 0.3) return 'Filter cutoff around 50% - balanced bass';
        return 'Filter cutoff around 25-40% - dark/warm bass';
      },
      oscillatorMix: (harmonicity) => {
        if (harmonicity > 0.7) return 'More saw wave (60%) for harmonic content';
        return 'More sine wave (70%) for smooth sub';
      }
    }
  },

  'reese-bass': {
    soundDescription: 'Detuned, phasing bass sound (classic DnB sound)',
    primary: 'Vital',
    alternatives: ['Sytrus', 'Harmless'],
    reasoning: 'Reese bass needs multiple detuned oscillators and stereo spread. Vital\'s unison is perfect for this.',
    quickStart: [
      'Open Vital',
      'Set OSC 1 to Saw wave',
      'Enable Unison: 4-7 voices',
      'Detune: 20-30%',
      'Spread: 50-80% for stereo width',
      'Low-pass filter around 1-2kHz',
      'Add slight chorus effect'
    ],
    settingsFromAnalysis: {
      unisonVoices: () => '4-7 voices for thick sound',
      filterMovement: (filterEnvelope) => {
        if (filterEnvelope?.sweepDirection === 'closing') return 'Add filter envelope: open then close slowly';
        return 'Static filter or slow movement';
      }
    }
  },

  // ===== LEAD SOUNDS =====
  'lead': {
    soundDescription: 'Melodic synth lead that cuts through the mix',
    primary: 'Sytrus',
    alternatives: ['Vital', 'Harmless', 'FLEX'],
    reasoning: 'Sytrus can create both clean and complex leads. For supersaws, use Vital. For quick results, try FLEX presets.',
    quickStart: [
      'Open Sytrus',
      'Use operators 1 and 2',
      'OP1: Saw wave, OP2: Sine (for FM)',
      'Slight detune between operators',
      'Open filter for brightness',
      'Short attack, medium sustain'
    ],
    settingsFromAnalysis: {
      filterCutoff: (brightness) => {
        if (brightness > 0.7) return 'Filter wide open (90-100%)';
        if (brightness > 0.4) return 'Filter at 60-80%';
        return 'Filter at 40-60% for warmer lead';
      },
      envelope: (adsr) => {
        const attack = adsr?.attack || 10;
        return attack < 20
          ? 'Instant attack (0-5ms) for punchy lead'
          : 'Soft attack (50-100ms) for smooth lead';
      }
    }
  },

  'supersaw': {
    soundDescription: 'Thick, wide saw wave with lots of unison',
    primary: 'Vital',
    alternatives: ['Harmless', 'Sytrus'],
    reasoning: 'Vital has the best unison engine for supersaws. 7+ voices with detune and stereo spread. Harmless is a good FL-native alternative.',
    quickStart: [
      'Open Vital',
      'Set OSC 1 to Basic Saw wavetable',
      'Unison voices: 7 (or more)',
      'Unison detune: 15-25%',
      'Stereo spread: 80-100%',
      'Optional: Layer with OSC 2 (octave up or down)',
      'High-pass around 100Hz, Low-pass around 8-12kHz'
    ],
    settingsFromAnalysis: {
      unisonAmount: (harmonicity, brightness) => {
        if (brightness > 0.6) return '7+ voices, 20-30% detune';
        return '5-7 voices, 15-20% detune';
      }
    }
  },

  'pluck': {
    soundDescription: 'Short, snappy sound with fast attack and decay',
    primary: '3xOsc',
    alternatives: ['Sytrus', 'Harmless', 'FLEX'],
    reasoning: '3xOsc plucks are easy - it\'s all about the envelope. Fast attack, quick decay, low sustain. Sytrus for more complex plucks.',
    quickStart: [
      'Open 3xOsc',
      'Set OSC 1 to Saw or Square',
      'Envelope: Attack 0ms, Decay 100-300ms, Sustain 0%, Release 200ms',
      'Turn on filter with envelope',
      'Filter cutoff around 50%, with positive envelope amount',
      'This makes the sound "pluck" - bright at start, then gets darker'
    ],
    settingsFromAnalysis: {
      envelope: (adsr) => {
        const decay = adsr?.decay || 200;
        return `Attack: 0ms, Decay: ${Math.min(400, Math.max(50, decay))}ms, Sustain: 0-20%`;
      },
      filterEnvelope: (filterEnvelope) => {
        const decay = filterEnvelope?.filterDecay || 50;
        return `Filter envelope decay: ${decay}% - controls how quickly the brightness fades`;
      }
    }
  },

  // ===== PAD SOUNDS =====
  'pad': {
    soundDescription: 'Sustained, atmospheric background sound',
    primary: 'Harmless',
    alternatives: ['FLEX', 'Sytrus', 'Vital'],
    reasoning: 'Harmless makes beautiful, clean pads with its unique engine. FLEX has great pad presets if you want quick results.',
    quickStart: [
      'Open Harmless',
      'Start with a soft timbre (triangle-ish)',
      'Slow attack: 300-800ms',
      'High sustain: 80-100%',
      'Long release: 1-3 seconds',
      'Add unison for width',
      'Built-in phaser adds movement',
      'Add reverb effect'
    ],
    settingsFromAnalysis: {
      envelope: (adsr) => {
        const attack = adsr?.attack || 500;
        const release = adsr?.release || 1000;
        return `Attack: ${Math.max(200, attack)}ms (slow fade in), Release: ${Math.max(500, release)}ms (long tail)`;
      },
      filterCutoff: (brightness) => {
        if (brightness > 0.5) return 'Bright pad: filter open or slight high-pass';
        return 'Warm pad: low-pass filter at 40-60%';
      }
    }
  },

  'evolving-pad': {
    soundDescription: 'Pad that changes and morphs over time',
    primary: 'Harmor',
    alternatives: ['Vital', 'Sytrus'],
    reasoning: 'Harmor\'s additive engine and image synthesis can create constantly evolving textures. Vital\'s LFO-controlled wavetable position also works well.',
    quickStart: [
      'Open Harmor (advanced) or Vital',
      'In Vital: Use wavetable with LFO modulating position',
      'In Harmor: Use additive harmonics with blur/prism',
      'Slow attack (500ms+), long release (2s+)',
      'Add movement: LFO to filter, wavetable, or harmonics',
      'Heavy reverb for atmosphere'
    ],
    settingsFromAnalysis: {
      modulation: (modulation) => {
        const rate = modulation?.lfoRate || 0.5;
        return `LFO rate: ${rate}Hz - slow movement for evolution`;
      }
    }
  },

  // ===== PERCUSSIVE SOUNDS =====
  'kick': {
    soundDescription: 'Kick drum - the foundation of the beat',
    primary: '3xOsc',
    alternatives: ['Sytrus', 'Vital'],
    reasoning: '3xOsc with pitch envelope creates classic synth kicks. The key is the pitch "click to thump" sweep.',
    quickStart: [
      'Open 3xOsc',
      'Set OSC 1 to Sine wave',
      'Go to the instrument envelope',
      'Set pitch envelope: start at +12 to +24 semitones',
      'Quick pitch decay to 0 (creates the "click")',
      'Short amplitude decay: 100-300ms',
      'Add Fruity Soft Clipper for punch',
      'Optional: Layer with a click sample'
    ],
    settingsFromAnalysis: {
      pitchEnvelope: () => 'Pitch sweep: +12 to +24 semitones, decay in 20-80ms',
      envelope: () => 'Attack: 0ms, Decay: 100-300ms, Sustain: 0%, Release: 50ms'
    }
  },

  'drums': {
    soundDescription: 'Drum sounds (snares, toms, etc.)',
    primary: 'FLEX',
    alternatives: ['3xOsc', 'Sytrus'],
    reasoning: 'FLEX has great drum presets. For custom synth drums, use 3xOsc with noise layers or Sytrus for metallic sounds.',
    quickStart: [
      'For presets: Open FLEX, browse Drum category',
      'For custom snare: 3xOsc with sine + noise',
      'Short attack (0ms), quick decay (50-150ms)',
      'Low sustain for punch',
      'Filter sweep for snare "snap"'
    ],
    settingsFromAnalysis: {
      noiseAmount: (harmonicity) => {
        if (harmonicity < 0.4) return 'More noise in mix (snare-like)';
        return 'Less noise, more tonal (tom-like)';
      }
    }
  },

  // ===== FM/BELL SOUNDS =====
  'bell': {
    soundDescription: 'Bell-like, metallic tones',
    primary: 'Sytrus',
    alternatives: ['Vital', 'Harmless'],
    reasoning: 'Sytrus is THE FM synth in FL Studio. FM synthesis is perfect for bell/metallic sounds. It\'s more complex but worth learning.',
    quickStart: [
      'Open Sytrus',
      'Use 2-3 operators',
      'OP1: Sine wave carrier',
      'OP2: Sine modulating OP1 (set ratio to 2, 3, or 7)',
      'Higher FM ratios = more metallic',
      'Quick attack, medium-long decay, no sustain',
      'Slight detuning adds realism'
    ],
    settingsFromAnalysis: {
      fmRatio: (harmonicity) => {
        if (harmonicity > 0.7) return 'FM ratios of 1:1, 1:2 for pure bells';
        return 'FM ratios of 1:7, 1:11 for metallic/inharmonic bells';
      },
      envelope: () => 'Attack: 0ms, Decay: 1-3 seconds, Sustain: 0-20%'
    }
  },

  'fm-sound': {
    soundDescription: 'Complex FM synthesis sound',
    primary: 'Sytrus',
    alternatives: ['Vital'],
    reasoning: 'Sytrus has 6 FM operators. Learn FM basics: carrier + modulator, ratios, and envelope on modulator.',
    quickStart: [
      'Open Sytrus',
      'Start simple: 2 operators',
      'OP1 = carrier (what you hear)',
      'OP2 = modulator (changes the timbre)',
      'Matrix: Route OP2 into OP1',
      'Experiment with OP2 ratio for different timbres',
      'Add envelope to modulator for movement'
    ],
    settingsFromAnalysis: {
      complexity: (harmonicity) => {
        if (harmonicity < 0.5) return 'High FM amount for complex/noisy timbre';
        return 'Lower FM amount for tonal sounds';
      }
    }
  },

  // ===== STRINGS/BRASS =====
  'strings': {
    soundDescription: 'String-like sounds (violin, cello, orchestral)',
    primary: 'GMS',
    alternatives: ['FLEX', 'Harmless'],
    reasoning: 'GMS has realistic string samples. For synth strings, use Harmless with slow attack and gentle filter.',
    quickStart: [
      'For realistic: Open GMS, find String presets',
      'For synth strings: Open Harmless',
      'Slow attack: 200-500ms',
      'High sustain, long release',
      'Layer multiple instances for depth',
      'EQ: cut harsh frequencies (2-4kHz)'
    ],
    settingsFromAnalysis: {
      envelope: (adsr) => {
        return `Attack: ${Math.max(100, adsr?.attack || 300)}ms (realistic bow attack)`;
      }
    }
  },

  'brass': {
    soundDescription: 'Brass-like sounds (horns, trumpets)',
    primary: 'GMS',
    alternatives: ['Sytrus', 'FLEX'],
    reasoning: 'GMS has authentic brass samples. Sytrus can synthesize brass with saw waves and filter envelope.',
    quickStart: [
      'For realistic: Open GMS, find Brass presets',
      'For synth brass: Open Sytrus',
      'Saw wave with quick filter envelope',
      'Filter opens quickly on attack',
      'Medium-fast attack (20-100ms)',
      'Add slight vibrato for realism'
    ],
    settingsFromAnalysis: {
      filterEnvelope: () => 'Filter envelope: opens with attack for "brassy" quality'
    }
  },

  // ===== FX/EXPERIMENTAL =====
  'fx': {
    soundDescription: 'Sound effects, risers, impacts',
    primary: 'Harmor',
    alternatives: ['Vital', 'Sytrus'],
    reasoning: 'Harmor can create unique FX with image synthesis and blur. Vital\'s LFOs can automate wild changes.',
    quickStart: [
      'Open Harmor or Vital',
      'Experiment with unusual modulation',
      'Try: LFO to pitch (fast) for risers',
      'Try: Reverse envelope for impacts',
      'Add heavy effects (reverb, delay, distortion)',
      'Don\'t be afraid to break the rules!'
    ],
    settingsFromAnalysis: {
      experimental: () => 'FX sounds: be creative! Automate everything.'
    }
  },

  'vocal': {
    soundDescription: 'Vocal-like or talking synth sounds',
    primary: 'Harmor',
    alternatives: ['Vital'],
    reasoning: 'Harmor\'s resynthesis can import actual vocals as sound sources. It can literally make the synth "talk".',
    quickStart: [
      'Open Harmor',
      'Drag a vocal sample onto Harmor',
      'It will resynthesize the vocal harmonics',
      'Tweak: Blur, Prism, and harmonics',
      'Alternative: Use formant filter in any synth',
      'Or: Vocodex for vocoder effects'
    ],
    settingsFromAnalysis: {
      formant: () => 'Formant filters at ~700Hz, 1200Hz, 2500Hz for vowel sounds'
    }
  },

  // ===== CATCHALL =====
  'unknown': {
    soundDescription: 'General/unknown sound type',
    primary: 'FLEX',
    alternatives: ['Vital', '3xOsc'],
    reasoning: 'When in doubt, start with FLEX presets to find something close, then customize. Or use Vital for maximum flexibility.',
    quickStart: [
      'Start with FLEX: Browse presets for something similar',
      'Or start with Vital: Most flexible option',
      'Or 3xOsc for simple sounds',
      'Match the basic character first (bright/dark, short/long)',
      'Then fine-tune from there'
    ],
    settingsFromAnalysis: {}
  }
};

// =============================================================================
// Parameter Translation Functions
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

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the best plugin recommendation for a sound type and analysis features
 */
export function getPluginRecommendation(soundType, features = {}) {
  const mapping = SOUND_TYPE_PLUGIN_MAP[soundType] || SOUND_TYPE_PLUGIN_MAP['unknown'];
  const plugin = FL_PLUGIN_PROFILES[mapping.primary];

  const recommendation = {
    plugin: mapping.primary,
    pluginInfo: plugin,
    reasoning: mapping.reasoning,
    quickStart: mapping.quickStart,
    alternatives: mapping.alternatives.map(alt => ({
      name: alt,
      info: FL_PLUGIN_PROFILES[alt]
    })),
    settingsSuggestions: []
  };

  // Add analysis-based suggestions
  if (features.brightness !== undefined) {
    const filterRec = PARAMETER_TRANSLATIONS.brightnessToFilterCutoff(features.brightness);
    recommendation.settingsSuggestions.push({
      parameter: 'Filter Cutoff',
      ...filterRec
    });
  }

  if (features.attackTime !== undefined || features.adsr?.attack !== undefined) {
    const attack = features.attackTime || features.adsr?.attack;
    const attackRec = PARAMETER_TRANSLATIONS.attackTimeToEnvelope(attack);
    recommendation.settingsSuggestions.push({
      parameter: 'Envelope Attack',
      ...attackRec
    });
  }

  if (features.harmonicity !== undefined) {
    const oscRec = PARAMETER_TRANSLATIONS.harmonicityToOscillator(features.harmonicity);
    recommendation.settingsSuggestions.push({
      parameter: 'Oscillator',
      ...oscRec
    });
  }

  return recommendation;
}

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

/**
 * Get a complete FL Studio recipe for recreating a sound
 */
export function getFLStudioRecipe(features, selectedInstrument = 'unknown') {
  const soundType = detectSoundType(features, selectedInstrument);
  const recommendation = getPluginRecommendation(soundType, features);

  return {
    soundType,
    soundDescription: SOUND_TYPE_PLUGIN_MAP[soundType]?.soundDescription || 'Unknown sound type',
    ...recommendation,
    // Add specific parameter translations
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

// =============================================================================
// Exports
// =============================================================================

export default {
  FL_PLUGIN_PROFILES,
  SOUND_TYPE_PLUGIN_MAP,
  PARAMETER_TRANSLATIONS,
  getPluginRecommendation,
  detectSoundType,
  getFLStudioRecipe
};
