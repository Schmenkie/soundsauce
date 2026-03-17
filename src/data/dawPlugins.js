/**
 * Multi-DAW Plugin Recommendation System
 *
 * Provides plugin profiles and sound-type mappings for:
 * - Ableton Live, Logic Pro, Reaper, Pro Tools
 * (FL Studio handled by existing flStudioPlugins.js)
 *
 * Reuses detectSoundType() and PARAMETER_TRANSLATIONS from flStudioPlugins.js
 * to avoid duplicating DAW-independent analysis logic.
 */

import {
  detectSoundType,
  PARAMETER_TRANSLATIONS,
  getFLStudioRecipe,
  FL_PLUGIN_PROFILES
} from './flStudioPlugins';

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

// =============================================================================
// Logic Pro Plugin Profiles
// =============================================================================

const LOGIC_PLUGINS = {
  'Alchemy': {
    name: 'Alchemy',
    fullName: 'Alchemy',
    description: 'Logic\'s flagship synth. Combines wavetable, granular, additive, and spectral synthesis. Extremely powerful with a massive preset library.',
    bestFor: ['pads', 'evolving-textures', 'modern-bass', 'leads', 'supersaws', 'ambient', 'complex-sounds'],
    notIdealFor: ['quick-simple-sounds'],
    difficulty: 3,
    features: [
      'Four sound sources (VA, wavetable, additive, spectral, granular)',
      'Extensive modulation system',
      'Built-in effects',
      'Resynthesis from audio',
      'Huge preset library',
      'Performance controls'
    ],
    limitations: [
      'Can be overwhelming for beginners',
      'CPU intensive with complex patches'
    ],
    presetPath: 'Library > Patches > Instrument > Synthesizer > Alchemy'
  },

  'ES2': {
    name: 'ES2',
    fullName: 'ES2',
    description: 'Powerful subtractive synth with three oscillators and extensive modulation. The workhorse synth of Logic Pro.',
    bestFor: ['bass', 'leads', 'plucks', 'trance', 'classic-synths'],
    notIdealFor: ['evolving-textures', 'wavetable-sounds', 'granular'],
    difficulty: 3,
    features: [
      'Three oscillators with ring mod',
      'Two multimode filters (serial/parallel)',
      'Vector synthesis via triangle pad',
      'Extensive modulation routing',
      'Built-in effects'
    ],
    limitations: [
      'Older interface design',
      'No wavetable support'
    ],
    presetPath: 'Library > Patches > Instrument > Synthesizer > ES2'
  },

  'Retro Synth': {
    name: 'Retro Synth',
    fullName: 'Retro Synth',
    description: 'Four synthesis engines in one: Analog, Sync, Wavetable, and FM. Simple interface, great for classic synth sounds.',
    bestFor: ['vintage-synths', 'simple-leads', 'bass', 'pads', 'beginners'],
    notIdealFor: ['complex-sound-design', 'modern-edm'],
    difficulty: 2,
    features: [
      'Four modes: Analog, Sync, Wavetable, FM',
      'Simple, visual interface',
      'Built-in filter with envelope',
      'LFO section',
      'Easy to learn'
    ],
    limitations: [
      'Less powerful than Alchemy or ES2',
      'Basic modulation options'
    ],
    presetPath: 'Library > Patches > Instrument > Synthesizer > Retro Synth'
  },

  'EFM1': {
    name: 'EFM1',
    fullName: 'EFM1',
    description: 'Simple FM synthesizer. Two operators (carrier + modulator) with easy-to-use interface. Perfect for FM basics.',
    bestFor: ['bells', 'e-piano', 'fm-bass', 'metallic-sounds', 'learning-fm'],
    notIdealFor: ['complex-fm', 'pads', 'evolving-sounds'],
    difficulty: 2,
    features: [
      'Simple 2-operator FM',
      'Modulation intensity control',
      'Harmonic ratio tuning',
      'Built-in sub oscillator',
      'Quick and easy'
    ],
    limitations: [
      'Only 2 operators (limited FM complexity)',
      'Basic envelope controls'
    ],
    presetPath: 'Library > Patches > Instrument > Synthesizer > EFM1'
  },

  'Ultrabeat': {
    name: 'Ultrabeat',
    fullName: 'Ultrabeat',
    description: 'Dedicated drum synthesizer and sampler. Combines synthesis and samples for creating drum sounds from scratch.',
    bestFor: ['kick', 'drums', 'percussion', 'drum-synthesis'],
    notIdealFor: ['melodic-sounds', 'pads', 'leads'],
    difficulty: 3,
    features: [
      'Two oscillators (phase oscillator + FM/side chain/sample)',
      'Ring modulation',
      'Built-in sequencer',
      'Noise generator',
      'Sample import'
    ],
    limitations: [
      'Drum-focused only',
      'Dated interface'
    ],
    presetPath: 'Library > Patches > Instrument > Drums > Ultrabeat'
  }
};

// =============================================================================
// Reaper Plugin Profiles
// =============================================================================

const REAPER_PLUGINS = {
  'ReaSynth': {
    name: 'ReaSynth',
    fullName: 'ReaSynth',
    description: 'Reaper\'s built-in simple synthesizer. Very basic but useful for sub basses and test tones. For serious sound design, use Vital (free).',
    bestFor: ['sub-bass', 'test-tones', 'simple-sounds'],
    notIdealFor: ['complex-sounds', 'pads', 'leads', 'modern-sounds'],
    difficulty: 1,
    features: [
      'Basic waveforms (sine, square, saw, triangle)',
      'Simple volume envelope',
      'Extremely lightweight'
    ],
    limitations: [
      'Very limited features',
      'No filter',
      'No modulation',
      'No effects'
    ],
    presetPath: 'FX > VST > ReaSynth'
  },

  'ReaSamplOmatic5000': {
    name: 'ReaSamplOmatic5000',
    fullName: 'ReaSamplOmatic5000',
    description: 'Sample player built into Reaper. Load any audio file and play it chromatically. Good for one-shots and basic sampling.',
    bestFor: ['sampling', 'drums', 'one-shots', 'realistic-instruments'],
    notIdealFor: ['synthesis', 'sound-design'],
    difficulty: 1,
    features: [
      'Load any audio file',
      'Pitch shifting across keyboard',
      'Loop modes',
      'Basic envelope'
    ],
    limitations: [
      'Sample-based only',
      'No synthesis engine',
      'Basic controls'
    ],
    presetPath: 'FX > VST > ReaSamplOmatic5000'
  }
};

// =============================================================================
// Pro Tools Plugin Profiles
// =============================================================================

const PRO_TOOLS_PLUGINS = {
  'Vacuum': {
    name: 'Vacuum',
    fullName: 'Vacuum',
    description: 'Analog modeling synth modeled after classic hardware. Warm sound with tube-style distortion. Good for vintage-style synthesis.',
    bestFor: ['bass', 'warm-leads', 'vintage-synths', 'pads', 'acid-bass'],
    notIdealFor: ['modern-edm', 'wavetable-sounds', 'complex-textures'],
    difficulty: 2,
    features: [
      'Two VCO oscillators',
      'VCF filter with resonance',
      'Built-in distortion/tube modeling',
      'LFO and envelope modulation',
      'Vintage analog character'
    ],
    limitations: [
      'Limited to classic analog synthesis',
      'No wavetables or FM'
    ],
    presetPath: 'Inserts > Instrument > Vacuum'
  },

  'Xpand2': {
    name: 'Xpand!2',
    fullName: 'Xpand!2',
    description: 'Multi-timbral workstation plugin. Huge preset library covering everything from pianos to synths. Great for quick, usable sounds.',
    bestFor: ['quick-sounds', 'realistic-instruments', 'pianos', 'strings', 'pads', 'beginners'],
    notIdealFor: ['deep-sound-design', 'unique-sounds', 'modern-bass'],
    difficulty: 1,
    features: [
      'Four sound layers',
      'Massive preset library',
      'Easy macro controls',
      'Built-in effects per layer',
      'Good for layering'
    ],
    limitations: [
      'Preset-focused (limited sound design)',
      'Can\'t create sounds from scratch'
    ],
    presetPath: 'Inserts > Instrument > Xpand!2'
  },

  'Boom': {
    name: 'Boom',
    fullName: 'Boom',
    description: 'Drum machine plugin with built-in patterns and sounds. Good for quick drum programming.',
    bestFor: ['kick', 'drums', 'percussion', 'drum-patterns'],
    notIdealFor: ['melodic-sounds', 'pads', 'leads', 'bass'],
    difficulty: 1,
    features: [
      'Built-in drum sounds',
      'Pattern sequencer',
      'Mix controls per pad',
      'Easy to use'
    ],
    limitations: [
      'Drum-focused only',
      'Limited sound design'
    ],
    presetPath: 'Inserts > Instrument > Boom'
  }
};

// =============================================================================
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
  'Logic Pro': LOGIC_PLUGINS,
  'Reaper': REAPER_PLUGINS,
  'Pro Tools': PRO_TOOLS_PLUGINS,
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

const LOGIC_SOUND_MAP = {
  'sub-bass': {
    primary: 'Retro Synth',
    alternatives: ['ES2'],
    reasoning: 'Retro Synth in Analog mode produces a clean, solid sub bass with minimal fuss.',
    quickStart: [
      'Open Retro Synth (Analog mode)',
      'Set Shape to Sine',
      'Turn off second oscillator',
      'Play in C0-C2 range',
      'Optional: Add subtle Overdrive for warmth'
    ]
  },
  'bass': {
    primary: 'ES2',
    alternatives: ['Alchemy', 'Retro Synth'],
    reasoning: 'ES2\'s dual filters and three oscillators give you full control over bass sound design.',
    quickStart: [
      'Open ES2',
      'OSC 1: Saw wave',
      'OSC 2: Square wave (-1 octave for sub)',
      'Mix with the triangle pad',
      'Low-pass filter with moderate resonance',
      'Adjust cutoff to taste'
    ]
  },
  'reese-bass': {
    primary: 'Alchemy',
    alternatives: ['ES2'],
    reasoning: 'Alchemy\'s unison and advanced modulation create massive reese basses with ease.',
    quickStart: [
      'Open Alchemy',
      'Load a saw-based source',
      'Enable Unison: 4-6 voices with detune',
      'Add stereo spread',
      'Low-pass filter around 1-2kHz',
      'Add chorus for extra width'
    ]
  },
  'lead': {
    primary: 'Alchemy',
    alternatives: ['ES2', 'Retro Synth'],
    reasoning: 'Alchemy has the power and flexibility to create any lead sound, from classic to modern.',
    quickStart: [
      'Open Alchemy',
      'Choose a bright source or wavetable',
      'Add slight unison for width',
      'Open filter for brightness',
      'Short attack, medium sustain',
      'Add delay and reverb'
    ]
  },
  'supersaw': {
    primary: 'Alchemy',
    alternatives: ['Retro Synth'],
    reasoning: 'Alchemy\'s unison engine with up to 16 voices creates massive supersaw stacks.',
    quickStart: [
      'Open Alchemy',
      'Set Source A to a saw waveform',
      'Unison: 7+ voices',
      'Detune for width',
      'Stereo spread high',
      'Layer Source B an octave up or down',
      'High-pass around 100Hz'
    ]
  },
  'pluck': {
    primary: 'Retro Synth',
    alternatives: ['ES2', 'Alchemy'],
    reasoning: 'Retro Synth\'s simple envelope makes quick pluck sounds easy. ES2 for more complex plucks.',
    quickStart: [
      'Open Retro Synth (Analog mode)',
      'Saw or Square wave',
      'Amp Env: Attack 0, Decay 100-300ms, Sustain 0%',
      'Filter Env: positive amount, quick decay',
      'This creates the bright-to-dark "pluck"'
    ]
  },
  'pad': {
    primary: 'Alchemy',
    alternatives: ['Retro Synth', 'ES2'],
    reasoning: 'Alchemy excels at lush, evolving pads with its multiple synthesis modes and modulation.',
    quickStart: [
      'Open Alchemy',
      'Browse pad presets as starting points',
      'Slow attack: 300-800ms',
      'High sustain, long release (1-3s)',
      'Add modulation for movement',
      'Reverb for atmosphere'
    ]
  },
  'evolving-pad': {
    primary: 'Alchemy',
    alternatives: ['ES2'],
    reasoning: 'Alchemy\'s granular and spectral modes can create endlessly evolving textures.',
    quickStart: [
      'Open Alchemy',
      'Try Granular or Spectral source mode',
      'Modulate source position with slow LFO',
      'Slow attack (500ms+), long release (2s+)',
      'Heavy reverb and delay',
      'Experiment with Transform pad'
    ]
  },
  'kick': {
    primary: 'Ultrabeat',
    alternatives: ['Retro Synth'],
    reasoning: 'Ultrabeat is Logic\'s dedicated drum synth — purpose-built for kick drums.',
    quickStart: [
      'Open Ultrabeat',
      'Use the phase oscillator (sine wave)',
      'Add pitch envelope: high to low sweep',
      'Quick pitch decay (20-80ms)',
      'Short amp decay (100-300ms)',
      'Add distortion for punch'
    ]
  },
  'drums': {
    primary: 'Ultrabeat',
    alternatives: ['Alchemy'],
    reasoning: 'Ultrabeat combines synthesis and sampling for creating any drum sound.',
    quickStart: [
      'Open Ultrabeat',
      'Browse drum presets or start from Init',
      'Mix oscillator and noise for snares',
      'Quick envelopes for punch',
      'Use the built-in sequencer for patterns'
    ]
  },
  'bell': {
    primary: 'EFM1',
    alternatives: ['Alchemy', 'ES2'],
    reasoning: 'FM synthesis creates the best bell sounds. EFM1 is simple FM, Alchemy for more complex bells.',
    quickStart: [
      'Open EFM1',
      'Set Harmonic ratio to 2, 3, or 7',
      'Increase FM intensity gradually',
      'Higher ratios = more metallic',
      'Quick attack, medium-long decay, no sustain'
    ]
  },
  'fm-sound': {
    primary: 'EFM1',
    alternatives: ['Alchemy'],
    reasoning: 'EFM1 is Logic\'s dedicated FM synth. Simple interface but effective for FM basics.',
    quickStart: [
      'Open EFM1',
      'Adjust the Harmonics knob for FM ratio',
      'FM intensity controls the amount of modulation',
      'More intensity = more complex/harsh timbre',
      'Envelope on FM for movement',
      'For complex FM, use Alchemy instead'
    ]
  },
  'strings': {
    primary: 'Alchemy',
    alternatives: ['ES2', 'Retro Synth'],
    reasoning: 'Alchemy has beautiful string patches and can create lush synth strings from scratch.',
    quickStart: [
      'Open Alchemy',
      'Browse String presets',
      'Or: Use VA source with slow attack',
      'High sustain, long release',
      'Add ensemble/chorus for width',
      'EQ: tame harshness around 2-4kHz'
    ]
  },
  'brass': {
    primary: 'ES2',
    alternatives: ['Alchemy', 'Retro Synth'],
    reasoning: 'ES2\'s saw oscillators with filter envelope create classic synth brass sounds.',
    quickStart: [
      'Open ES2',
      'Saw wave oscillator',
      'Filter envelope with quick attack',
      'The filter opens on each note for "brassy" quality',
      'Medium attack (20-100ms)',
      'Add subtle vibrato'
    ]
  },
  'fx': {
    primary: 'Alchemy',
    alternatives: ['ES2'],
    reasoning: 'Alchemy\'s spectral and granular modes are perfect for creating unique FX sounds.',
    quickStart: [
      'Open Alchemy',
      'Try Spectral or Granular source mode',
      'Extreme modulation for wild textures',
      'LFO to pitch for risers',
      'Add heavy effects',
      'Experiment with the Transform pad'
    ]
  },
  'vocal': {
    primary: 'Alchemy',
    alternatives: ['EFM1'],
    reasoning: 'Alchemy can resynthesize vocal samples and has vocal-like presets built in.',
    quickStart: [
      'Open Alchemy',
      'Browse Vocal presets',
      'Or: Import a vocal sample as a source',
      'Use Granular mode for vocal texture manipulation',
      'Formant filters for vowel sounds'
    ]
  },
  'unknown': {
    primary: 'Alchemy',
    alternatives: ['Retro Synth', 'ES2'],
    reasoning: 'Alchemy is the most versatile Logic synth. Start with presets and tweak from there.',
    quickStart: [
      'Open Alchemy and browse presets',
      'Find something close to your target',
      'Tweak parameters to match',
      'Or use Retro Synth for simpler sounds'
    ]
  }
};

const REAPER_SOUND_MAP = {
  'sub-bass': {
    primary: 'ReaSynth',
    alternatives: ['Vital'],
    reasoning: 'ReaSynth can produce a clean sine sub. For anything more complex, use Vital (free).',
    quickStart: [
      'Open ReaSynth',
      'Set waveform to Sine',
      'Play in C0-C2 range',
      'For more control, use Vital instead',
      'Vital: Set OSC 1 to Init (Sine), keep it simple'
    ]
  },
  'bass': {
    primary: 'Vital',
    alternatives: ['ReaSynth'],
    reasoning: 'Vital gives you full control over bass design with wavetables, filters, and modulation. ReaSynth is too basic for complex bass.',
    quickStart: [
      'Open Vital (free download at vital.audio)',
      'Set OSC 1 to Basic Saw',
      'Add sub by enabling OSC 2 as sine (-1 octave)',
      'Low-pass filter with envelope',
      'Adjust cutoff for brightness'
    ]
  },
  'reese-bass': {
    primary: 'Vital',
    alternatives: [],
    reasoning: 'Vital\'s unison engine is essential for reese bass. ReaSynth can\'t do this.',
    quickStart: [
      'Open Vital',
      'OSC 1: Saw wavetable',
      'Unison: 4-7 voices, Detune ~25%',
      'Spread for stereo width',
      'Low-pass filter around 1-2kHz',
      'Add chorus effect'
    ]
  },
  'lead': {
    primary: 'Vital',
    alternatives: [],
    reasoning: 'Vital is your best option for leads in Reaper. Wavetable scanning, unison, and effects all built in.',
    quickStart: [
      'Open Vital',
      'Choose a bright wavetable for OSC 1',
      'Add slight unison (2-4 voices)',
      'Open filter for brightness',
      'Short attack, medium sustain',
      'Use built-in reverb and delay'
    ]
  },
  'supersaw': {
    primary: 'Vital',
    alternatives: [],
    reasoning: 'Vital\'s unison with up to 16 voices per oscillator creates massive supersaws.',
    quickStart: [
      'Open Vital',
      'OSC 1: Basic Saw wavetable',
      'Unison voices: 7+',
      'Unison detune: 15-25%',
      'Spread: 80-100%',
      'Layer OSC 2 an octave up or down',
      'High-pass around 100Hz'
    ]
  },
  'pluck': {
    primary: 'Vital',
    alternatives: ['ReaSynth'],
    reasoning: 'Vital\'s envelopes and filter give you the control needed for pluck sounds.',
    quickStart: [
      'Open Vital',
      'OSC 1: Saw or Square wavetable',
      'Amp Env: Attack 0, Decay 100-300ms, Sustain 0%',
      'Filter with envelope: positive amount, quick decay',
      'This creates the bright attack that fades'
    ]
  },
  'pad': {
    primary: 'Vital',
    alternatives: [],
    reasoning: 'Vital\'s wavetable morphing and modulation matrix create beautiful pads.',
    quickStart: [
      'Open Vital',
      'Choose a smooth wavetable',
      'Slow attack: 300-800ms',
      'High sustain, long release (1-3s)',
      'Modulate wavetable position with LFO',
      'Add reverb and chorus'
    ]
  },
  'evolving-pad': {
    primary: 'Vital',
    alternatives: [],
    reasoning: 'LFO-controlled wavetable position in Vital creates constantly morphing textures.',
    quickStart: [
      'Open Vital',
      'Use an evolving wavetable',
      'Map LFO 1 to wavetable position (slow rate)',
      'Slow attack, long release',
      'Add multiple LFOs for complex movement',
      'Heavy reverb for atmosphere'
    ]
  },
  'kick': {
    primary: 'Vital',
    alternatives: ['ReaSynth'],
    reasoning: 'Vital can create synth kicks with pitch envelope modulation. ReaSynth is too basic.',
    quickStart: [
      'Open Vital',
      'OSC 1: Sine (Init wavetable)',
      'Map Envelope 2 to OSC pitch (+24 semitones)',
      'Env 2: instant attack, fast decay (20-80ms)',
      'Amp Env: short decay (100-300ms), no sustain',
      'Add distortion for punch'
    ]
  },
  'drums': {
    primary: 'ReaSamplOmatic5000',
    alternatives: ['Vital'],
    reasoning: 'Load drum samples into ReaSamplOmatic5000 for quick drum sounds. Vital for synth drums.',
    quickStart: [
      'For samples: Open ReaSamplOmatic5000',
      'Drag a drum sample onto it',
      'Set to Note mode',
      'For synth drums: Use Vital with noise + sine'
    ]
  },
  'bell': {
    primary: 'Vital',
    alternatives: [],
    reasoning: 'Vital can approximate FM-style bells using wavetable synthesis and modulation.',
    quickStart: [
      'Open Vital',
      'OSC 1: Sine wavetable',
      'Use FM from OSC 2 or 3',
      'Experiment with FM amount',
      'Quick attack, medium-long decay, low sustain',
      'Or try free Dexed plugin for true FM bells'
    ]
  },
  'fm-sound': {
    primary: 'Vital',
    alternatives: [],
    reasoning: 'Vital has FM between oscillators. For dedicated FM, try free Dexed (DX7 emulation).',
    quickStart: [
      'Open Vital',
      'Enable FM from OSC 2 to OSC 1',
      'Experiment with OSC 2 pitch ratio',
      'Modulate FM amount with envelope for movement',
      'Also try: Dexed (free DX7 emulation plugin)'
    ]
  },
  'strings': {
    primary: 'Vital',
    alternatives: ['ReaSamplOmatic5000'],
    reasoning: 'Vital for synth strings with unison. ReaSamplOmatic for real string samples.',
    quickStart: [
      'For synth strings: Open Vital',
      'Saw or soft wavetable',
      'Slow attack (200-500ms), long release',
      'Add unison for ensemble width',
      'For realistic: Load string samples in ReaSamplOmatic5000'
    ]
  },
  'brass': {
    primary: 'Vital',
    alternatives: ['ReaSamplOmatic5000'],
    reasoning: 'Vital\'s filter envelope can recreate the brassy attack character.',
    quickStart: [
      'Open Vital',
      'Saw wave oscillator',
      'Filter with envelope: opens on attack',
      'Medium attack (20-100ms)',
      'Add vibrato via LFO to pitch'
    ]
  },
  'fx': {
    primary: 'Vital',
    alternatives: [],
    reasoning: 'Vital\'s modulation matrix and effects make it great for experimental FX in Reaper.',
    quickStart: [
      'Open Vital',
      'Experiment with extreme modulation',
      'Map LFOs to pitch for risers',
      'Try random LFO shapes',
      'Add heavy effects chain'
    ]
  },
  'vocal': {
    primary: 'ReaSamplOmatic5000',
    alternatives: ['Vital'],
    reasoning: 'Load a vocal sample into ReaSamplOmatic5000 to play it chromatically.',
    quickStart: [
      'Open ReaSamplOmatic5000',
      'Drag a vocal sample in',
      'Set pitch shifting range',
      'Adjust envelope for smooth playback',
      'Or use Vital with formant-style wavetables'
    ]
  },
  'unknown': {
    primary: 'Vital',
    alternatives: ['ReaSynth', 'ReaSamplOmatic5000'],
    reasoning: 'Vital is the most versatile free synth. Start with presets and tweak.',
    quickStart: [
      'Open Vital and browse presets',
      'Find something close',
      'Tweak from there',
      'ReaSynth for simple sine/saw needs',
      'ReaSamplOmatic5000 for sample-based sounds'
    ]
  }
};

const PRO_TOOLS_SOUND_MAP = {
  'sub-bass': {
    primary: 'Vacuum',
    alternatives: ['Vital'],
    reasoning: 'Vacuum\'s analog modeling gives warm sub bass. Vital for more precision.',
    quickStart: [
      'Open Vacuum',
      'Set VCO 1 to Sine wave',
      'Turn off VCO 2',
      'Play in low octaves (C0-C2)',
      'Add subtle tube drive for warmth',
      'Or use Vital for more control'
    ]
  },
  'bass': {
    primary: 'Vacuum',
    alternatives: ['Vital', 'Xpand2'],
    reasoning: 'Vacuum\'s analog warmth and built-in distortion are great for bass sounds.',
    quickStart: [
      'Open Vacuum',
      'VCO 1: Saw wave',
      'VCO 2: Square (-1 octave for sub layer)',
      'Adjust filter cutoff and resonance',
      'Add drive for character',
      'Short attack on amp envelope'
    ]
  },
  'reese-bass': {
    primary: 'Vital',
    alternatives: ['Vacuum'],
    reasoning: 'Vital\'s unison engine is essential for thick reese bass. Vacuum is too limited for this.',
    quickStart: [
      'Open Vital (free at vital.audio)',
      'OSC 1: Saw wavetable',
      'Unison: 4-7 voices, Detune ~25%',
      'Spread for stereo width',
      'Low-pass filter around 1-2kHz',
      'Add chorus'
    ]
  },
  'lead': {
    primary: 'Vital',
    alternatives: ['Vacuum', 'Xpand2'],
    reasoning: 'Vital gives the most flexibility for modern lead sounds. Xpand!2 for quick presets.',
    quickStart: [
      'Open Vital',
      'Choose a bright wavetable',
      'Slight unison for width',
      'Open filter for brightness',
      'Short attack, medium sustain',
      'Add reverb and delay'
    ]
  },
  'supersaw': {
    primary: 'Vital',
    alternatives: [],
    reasoning: 'Vital\'s unison is the only way to get proper supersaws in Pro Tools stock plugins.',
    quickStart: [
      'Open Vital',
      'OSC 1: Basic Saw wavetable',
      'Unison voices: 7+',
      'Detune: 15-25%',
      'Spread: 80-100%',
      'Layer OSC 2 an octave up/down'
    ]
  },
  'pluck': {
    primary: 'Vacuum',
    alternatives: ['Vital', 'Xpand2'],
    reasoning: 'Vacuum\'s quick envelopes and filter make snappy pluck sounds.',
    quickStart: [
      'Open Vacuum',
      'VCO 1: Saw or Square',
      'Quick amp decay (100-300ms), no sustain',
      'Filter with envelope amount',
      'Short filter decay for pluck character'
    ]
  },
  'pad': {
    primary: 'Vital',
    alternatives: ['Xpand2', 'Vacuum'],
    reasoning: 'Vital\'s wavetable morphing creates lush pads. Xpand!2 has good pad presets too.',
    quickStart: [
      'Open Vital',
      'Smooth wavetable, slow attack',
      'High sustain, long release',
      'Modulate wavetable position with LFO',
      'Add reverb and chorus',
      'Or: Browse Xpand!2 pad presets'
    ]
  },
  'evolving-pad': {
    primary: 'Vital',
    alternatives: [],
    reasoning: 'Vital\'s LFO-to-wavetable modulation creates constantly evolving textures.',
    quickStart: [
      'Open Vital',
      'Choose an evolving wavetable',
      'Map slow LFO to wavetable position',
      'Long attack, long release',
      'Multiple modulation sources for complexity',
      'Heavy reverb'
    ]
  },
  'kick': {
    primary: 'Boom',
    alternatives: ['Vital'],
    reasoning: 'Boom has built-in kick drum sounds and synthesis. Vital for custom synth kicks.',
    quickStart: [
      'For quick kicks: Open Boom, browse kick presets',
      'For custom: Open Vital',
      'Sine oscillator with pitch envelope (+24 to 0 semitones)',
      'Fast pitch decay (20-80ms)',
      'Short amp decay, add distortion'
    ]
  },
  'drums': {
    primary: 'Boom',
    alternatives: ['Xpand2', 'Vital'],
    reasoning: 'Boom is Pro Tools\' dedicated drum machine. Xpand!2 also has drum presets.',
    quickStart: [
      'Open Boom',
      'Browse drum presets',
      'Tweak individual pad sounds',
      'Use the pattern sequencer',
      'Or: Browse Xpand!2 drum kits'
    ]
  },
  'bell': {
    primary: 'Vital',
    alternatives: ['Xpand2'],
    reasoning: 'Vital can do FM-style bells with its oscillator FM feature. Xpand!2 has bell presets.',
    quickStart: [
      'Open Vital',
      'Enable FM from OSC 2 to OSC 1',
      'Both set to Sine',
      'OSC 2 ratio: 2, 3, or 7',
      'Quick attack, medium-long decay',
      'Or: Browse Xpand!2 bell presets'
    ]
  },
  'fm-sound': {
    primary: 'Vital',
    alternatives: [],
    reasoning: 'Vital has FM between oscillators. Pro Tools has no dedicated FM synth.',
    quickStart: [
      'Open Vital',
      'Enable FM from OSC 2 to OSC 1',
      'Experiment with OSC 2 pitch ratio',
      'Modulate FM amount with envelope',
      'Also try: Dexed (free DX7 emulation)'
    ]
  },
  'strings': {
    primary: 'Xpand2',
    alternatives: ['Vital'],
    reasoning: 'Xpand!2 has quality string presets. Vital for synth string pads.',
    quickStart: [
      'For realistic: Open Xpand!2, browse Strings category',
      'For synth strings: Open Vital',
      'Saw wavetable with slow attack',
      'Add unison for ensemble width',
      'Long release, gentle filter'
    ]
  },
  'brass': {
    primary: 'Xpand2',
    alternatives: ['Vacuum', 'Vital'],
    reasoning: 'Xpand!2 has realistic brass presets. Vacuum for synth brass with filter envelope.',
    quickStart: [
      'For realistic: Open Xpand!2, browse Brass category',
      'For synth brass: Open Vacuum',
      'Saw wave with filter envelope',
      'Filter opens on attack for brassy quality',
      'Medium attack, add vibrato'
    ]
  },
  'fx': {
    primary: 'Vital',
    alternatives: [],
    reasoning: 'Vital\'s modulation and effects are the best option for FX sounds in Pro Tools.',
    quickStart: [
      'Open Vital',
      'Extreme modulation experiments',
      'LFO to pitch for risers',
      'Random modulation sources',
      'Heavy effects chain'
    ]
  },
  'vocal': {
    primary: 'Xpand2',
    alternatives: ['Vital'],
    reasoning: 'Xpand!2 has vocal-style presets. Vital for formant-style synthesis.',
    quickStart: [
      'Open Xpand!2, browse Vocal presets',
      'Or: Use Vital with formant wavetables',
      'Choir-style patches available in Xpand!2',
      'For real vocals: use audio tracks directly'
    ]
  },
  'unknown': {
    primary: 'Vital',
    alternatives: ['Xpand2', 'Vacuum'],
    reasoning: 'Vital is the most versatile option. Xpand!2 for quick presets.',
    quickStart: [
      'Start with Vital presets',
      'Or browse Xpand!2 for quick sounds',
      'Vacuum for warm analog-style sounds',
      'Tweak from the closest preset'
    ]
  }
};

export const DAW_SOUND_TYPE_MAP = {
  'Ableton Live': ABLETON_SOUND_MAP,
  'Logic Pro': LOGIC_SOUND_MAP,
  'Reaper': REAPER_SOUND_MAP,
  'Pro Tools': PRO_TOOLS_SOUND_MAP,
};

// =============================================================================
// Supported DAWs list
// =============================================================================

const SUPPORTED_DAWS = ['FL Studio', 'Ableton Live', 'Logic Pro', 'Reaper', 'Pro Tools'];

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Get a complete DAW-specific recipe for recreating a sound.
 * Delegates to getFLStudioRecipe for FL Studio, uses DAW_PLUGIN_PROFILES
 * and DAW_SOUND_TYPE_MAP for other supported DAWs.
 *
 * @param {Object} features - Audio analysis features
 * @param {string} selectedInstrument - Detected/selected instrument type
 * @param {string} dawPreference - User's DAW preference from profile
 * @returns {Object} Complete recipe with plugin info, quickStart steps, and settings
 */
export function getDAWRecipe(features, selectedInstrument, dawPreference) {
  const daw = dawPreference || 'Ableton Live';

  // FL Studio uses the existing detailed system
  if (daw === 'FL Studio') {
    return getFLStudioRecipe(features, selectedInstrument);
  }

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
  // Reuse Reaper's sound map since it's already Vital-heavy
  const soundMap = REAPER_SOUND_MAP[soundType] || REAPER_SOUND_MAP['unknown'];

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
 * Get the plugin profiles for a given DAW.
 * Returns FL_PLUGIN_PROFILES for FL Studio, DAW_PLUGIN_PROFILES[daw] for others.
 */
export function getPluginProfilesForDAW(dawPreference) {
  if (!dawPreference || dawPreference === 'FL Studio') {
    return FL_PLUGIN_PROFILES;
  }
  return DAW_PLUGIN_PROFILES[dawPreference] || {};
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
 * @param {string} daw - DAW name (e.g. 'FL Studio', 'Ableton Live')
 * @param {string} soundType - Detected sound type (e.g. 'bass', 'lead', 'pad')
 * @returns {{ title: string, detail: string }[]}
 */
export function getDAWIntegrationTips(daw, soundType) {
  const tips = [];

  // Tip 1: How to load the .vital preset in this DAW
  const loadInstructions = {
    'FL Studio': 'Add Vital to a Channel Rack slot (Channel Rack → + → More plugins → Vital). Then drag and drop the .vital file onto the Vital window, or use Vital\'s preset browser (click the preset name at the top).',
    'Ableton Live': 'Drag Vital onto a MIDI track from Plug-ins in the Browser. Then drag the .vital file onto Vital\'s window, or use the preset browser inside Vital.',
    'Logic Pro': 'Insert Vital on an Instrument track (Instrument slot → AU Instruments → Vital). Drag the .vital file onto Vital\'s window to load it.',
    'Reaper': 'Add Vital to a track (FX → VST3: Vital). Drag the .vital file onto Vital\'s window to load it.',
    'Pro Tools': 'Insert Vital on an Instrument track (Inserts → Instrument → Vital). Drag the .vital file onto Vital\'s window to load it.',
  };
  tips.push({
    title: `Load the preset in ${daw}`,
    detail: loadInstructions[daw] || 'Double-click the .vital file to open it in Vital, or drag it onto Vital\'s window.'
  });

  // Tip 2: DAW-specific effects chain recommendation
  const effectsTips = {
    'FL Studio': {
      bass: 'Add Fruity Parametric EQ 2 after Vital in the mixer: high-pass at 30Hz to remove rumble, slight boost at 80-120Hz for punch. Add Fruity Soft Clipper for subtle warmth.',
      lead: 'Add Fruity Delay 3 (1/8 dotted, ~20% mix) and Fruity Reeverb 2 (small room, ~15% mix) in the mixer insert chain.',
      pad: 'Add Fruity Reeverb 2 (large hall, 40-60% mix, 3-5s decay) and Fruity Chorus (subtle, ~20% mix) in the mixer insert.',
      pluck: 'Add Fruity Delay 3 (1/8, ~25% mix) for rhythmic echoes. Light compression with Fruity Limiter to tighten transients.',
      kick: 'Add Fruity Soft Clipper for saturation and Fruity Limiter for peak control. High-pass other instruments at 100Hz to give the kick room.',
      drums: 'Add Fruity Limiter for punch (fast attack, medium release). Use Fruity Parametric EQ 2 to carve space for each drum element.',
    },
    'Ableton Live': {
      bass: 'Add EQ Eight after Vital: high-pass at 30Hz, boost at 80-120Hz. Add Saturator (Soft Sine) for subtle warmth.',
      lead: 'Add Simple Delay (1/8 dotted) and Reverb (small room, ~15% dry/wet) after Vital on the same track.',
      pad: 'Send to a Return track with Reverb (large hall, long decay). Add Chorus-Ensemble on the pad track for width.',
      pluck: 'Add Ping Pong Delay (1/8) and a touch of Reverb. Use Compressor to tighten the attack.',
      kick: 'Add Saturator for analog warmth. Use Compressor with sidechain from the kick on bass tracks.',
      drums: 'Add Drum Buss for saturation and transient shaping. Use EQ Eight to carve frequency space.',
    },
    'Logic Pro': {
      bass: 'Add Channel EQ: high-pass at 30Hz, boost at 80-120Hz. Add Overdrive (subtle) for harmonics.',
      lead: 'Add Tape Delay (1/8 dotted) and ChromaVerb (small room). Use Channel EQ to add presence at 2-5kHz.',
      pad: 'Add ChromaVerb (large hall, long decay) and Ensemble for subtle chorus. Automate the reverb mix for movement.',
      pluck: 'Add Stereo Delay (1/8) and Space Designer (small room). Use Compressor to control dynamics.',
      kick: 'Add Clip Distortion for punch. Use Compressor with fast attack to tame peaks.',
      drums: 'Use Drum Machine Designer or add Compressor and Channel EQ per element.',
    },
    'Reaper': {
      bass: 'Add ReaEQ: high-pass at 30Hz. For warmth, add a free saturation plugin like Analog Obsession CHANNEV.',
      lead: 'Add ReaDelay (1/8 dotted, ~20% wet) and a reverb plugin. Vital\'s built-in FX can also handle this.',
      pad: 'Add a reverb plugin (or use Vital\'s built-in reverb at 40-60% mix). Add ReaDelay for extra space.',
      pluck: 'Add ReaDelay (1/8 note) and light compression with ReaComp.',
      kick: 'Add ReaComp for punch. Use ReaEQ to boost the sub at 50-60Hz.',
      drums: 'Add ReaComp and ReaEQ per drum element. Route to individual channels for mixing.',
    },
    'Pro Tools': {
      bass: 'Add EQ III: high-pass at 30Hz, boost at 80-120Hz. Add Lo-Fi for subtle saturation.',
      lead: 'Add Mod Delay III (1/8 dotted) and D-Verb (small room). Use EQ III for presence.',
      pad: 'Add D-Verb (large hall, long decay). Add Air Chorus for width.',
      pluck: 'Add Mod Delay III and light compression with Dyn3 Compressor.',
      kick: 'Add Lo-Fi for saturation and Dyn3 Compressor for peak control.',
      drums: 'Add Dyn3 Compressor and EQ III per element. Use auxiliary sends for shared reverb.',
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
