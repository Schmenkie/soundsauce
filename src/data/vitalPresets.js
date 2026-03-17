/**
 * Curated Vital synth presets organized by instrument type.
 * Each preset is a sparse settings object overlaid onto the Vital init template.
 *
 * Users pick a preset that matches their analysis, then fine-tune with sliders.
 */

// =============================================================================
// Sine wavetable + Kick LFO infrastructure (moved from old generator)
// =============================================================================

/**
 * Sine wavetable extracted from Vital factory preset.
 * Used for kick drums to get pure sine tone.
 */
export const SINE_WAVETABLE = {"author": "", "full_normalize": false, "groups": [{"components": [{"interpolation": 1, "interpolation_style": 1, "keyframes": [{"position": 0, "wave_data": "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"}], "type": "Wave Source"}]}], "name": "Sine", "remove_all_dc": false, "version": "1.0.7"};

/**
 * Factory kick LFO shapes extracted from Vital's "Kick Drum 1" preset.
 */
export const KICK_LFO_SHAPES = {
  pitch: {
    name: 'Triangle',
    num_points: 5,
    points: [0.0, 0.2647058963775635, 0.026800669729709625, 0.6813725233078003, 0.3082076907157898, 1.0, 1.0, 1.0, 1.0, 0.2647058963775635],
    powers: [-7.167760372161865, -3.6671817302703857, 0.0, 0.0, 0.0],
    smooth: false
  },
  volume: {
    name: 'Triangle',
    num_points: 5,
    points: [0.0, 0.0, 0.18425460159778595, 0.23039215803146362, 0.5, 1.0, 1.0, 1.0, 1.0, 0.0],
    powers: [8.514702796936035, -4.014706611633301, 0.0, 0.0, 0.0],
    smooth: false
  },
  distortion: {
    name: 'Triangle',
    num_points: 4,
    points: [0.0, 1.0, 0.0, 0.0, 0.2261306494474411, 1.0, 1.0, 1.0],
    powers: [0.0, -2.867647886276245, 0.0, 0.0],
    smooth: false
  }
};

/**
 * Apply kick drum LFO envelopes to a Vital preset.
 */
export function applyKickLFOEnvelopes(preset) {
  if (!preset.settings.wavetables) preset.settings.wavetables = [];
  preset.settings.wavetables[0] = SINE_WAVETABLE;

  if (!preset.settings.lfos) preset.settings.lfos = [];
  while (preset.settings.lfos.length < 8) {
    preset.settings.lfos.push({ name: 'Triangle', num_points: 3, points: [0.0, 0.0, 0.5, 1.0, 1.0, 0.0], powers: [0.0, 0.0, 0.0], smooth: false });
  }

  preset.settings.lfos[0] = KICK_LFO_SHAPES.pitch;
  preset.settings.lfos[1] = KICK_LFO_SHAPES.volume;
  preset.settings.lfos[2] = KICK_LFO_SHAPES.distortion;

  preset.settings.lfo_1_frequency = 0.35;
  preset.settings.lfo_1_sync = 0.0;
  preset.settings.lfo_1_sync_type = 2.0;
  preset.settings.lfo_1_smooth_mode = 0.0;
  preset.settings.lfo_1_smooth_time = -10.0;
  preset.settings.lfo_1_phase = 0.0;

  preset.settings.lfo_2_frequency = 1.0;
  preset.settings.lfo_2_sync = 1.0;
  preset.settings.lfo_2_sync_type = 2.0;
  preset.settings.lfo_2_smooth_mode = 0.0;
  preset.settings.lfo_2_smooth_time = -10.0;

  preset.settings.lfo_3_frequency = 1.0;
  preset.settings.lfo_3_sync = 1.0;
  preset.settings.lfo_3_sync_type = 2.0;
  preset.settings.lfo_3_smooth_mode = 0.0;
  preset.settings.lfo_3_smooth_time = -10.0;

  // Modulation routes
  if (preset.settings.modulations?.[0]) {
    preset.settings.modulations[0].source = 'lfo_1';
    preset.settings.modulations[0].destination = 'osc_1_transpose';
  }
  preset.settings.modulation_1_amount = 0.63;
  preset.settings.modulation_1_bipolar = 0;

  if (preset.settings.modulations?.[1]) {
    preset.settings.modulations[1].source = 'lfo_2';
    preset.settings.modulations[1].destination = 'osc_1_level';
  }
  preset.settings.modulation_2_amount = 1.0;
  preset.settings.modulation_2_bipolar = 0;

  if (preset.settings.modulations?.[2]) {
    preset.settings.modulations[2].source = 'lfo_3';
    preset.settings.modulations[2].destination = 'distortion_drive';
  }
  preset.settings.modulation_3_amount = 0.245;
  preset.settings.modulation_3_bipolar = 0;
}

// =============================================================================
// Preset Categories
// =============================================================================

export const PRESET_CATEGORIES = [
  { id: 'bass', label: 'Bass' },
  { id: 'lead', label: 'Lead' },
  { id: 'pad', label: 'Pad' },
  { id: 'pluck', label: 'Pluck' },
  { id: 'kick', label: 'Kick' },
  { id: 'drums', label: 'Drums' },
  { id: 'keys', label: 'Keys' },
  { id: 'guitar', label: 'Guitar' },
  { id: 'brass', label: 'Brass' },
  { id: 'woodwind', label: 'Woodwind' },
];

// =============================================================================
// Tuning Parameters (user-adjustable sliders)
// =============================================================================

export const TUNING_PARAMS = [
  { id: 'filter_cutoff',     label: 'Filter Cutoff',     vitalKey: 'filter_1_cutoff',       min: 8,  max: 136, step: 1,   display: 'percent',  group: 'filter',     description: 'Controls brightness. Lower = warmer, higher = brighter' },
  { id: 'filter_resonance',  label: 'Filter Resonance',  vitalKey: 'filter_1_resonance',    min: 0,  max: 1,   step: 0.01, display: 'percent', group: 'filter',     description: 'Adds a peak at the cutoff. Higher = more nasal/aggressive' },
  { id: 'attack',            label: 'Attack',            vitalKey: 'env_1_attack',          min: 0,  max: 4,   step: 0.01, display: 'seconds', group: 'envelope',   description: 'How quickly the sound fades in. Short = punchy, long = smooth' },
  { id: 'decay',             label: 'Decay',             vitalKey: 'env_1_decay',           min: 0,  max: 4,   step: 0.01, display: 'seconds', group: 'envelope',   description: 'How quickly it drops to sustain level after the initial hit' },
  { id: 'sustain',           label: 'Sustain',           vitalKey: 'env_1_sustain',         min: 0,  max: 1,   step: 0.01, display: 'percent', group: 'envelope',   description: 'Volume level while the note is held' },
  { id: 'release',           label: 'Release',           vitalKey: 'env_1_release',         min: 0,  max: 4,   step: 0.01, display: 'seconds', group: 'envelope',   description: 'How long the sound fades out after releasing the note' },
  { id: 'unison_voices',     label: 'Unison Voices',     vitalKey: 'osc_1_unison_voices',   min: 1,  max: 16,  step: 1,    display: 'integer', group: 'oscillator', description: 'Number of stacked copies. More voices = thicker, wider sound' },
  { id: 'unison_detune',     label: 'Unison Detune',     vitalKey: 'osc_1_unison_detune',   min: 0,  max: 10,  step: 0.1,  display: 'value',   group: 'oscillator', description: 'How far apart the voices are tuned. Higher = more chorus-like' },
  { id: 'reverb',            label: 'Reverb',            vitalKey: 'reverb_dry_wet',        min: 0,  max: 1,   step: 0.01, display: 'percent', group: 'effects',    linkedToggle: 'reverb_on', description: 'Adds space and depth. Higher = bigger room' },
  { id: 'chorus',            label: 'Chorus',            vitalKey: 'chorus_dry_wet',        min: 0,  max: 1,   step: 0.01, display: 'percent', group: 'effects',    linkedToggle: 'chorus_on', description: 'Thickens the sound with slight detuning' },
];

// =============================================================================
// 21 Curated Presets
// =============================================================================

export const CURATED_PRESETS = [
  // ---- BASS (7) ----
  {
    id: 'sub_bass',
    name: 'Sub Bass',
    category: 'bass',
    description: 'Pure sine sub with weight. Clean low end for trap and house.',
    matchReason: 'Pure sine wave delivers clean fundamental weight without harmonic clutter.',
    tags: ['sub', 'clean', 'deep'],
    featureProfile: {
      brightness: { min: 0.0, max: 0.15, weight: 1.0 },
      waveformTypes: ['sine'],
      attack: { min: 0, max: 20, weight: 0.8 },
      spectralCentroid: { min: 30, max: 300, weight: 1.0 },
      sustain: { min: 0.6, max: 1.0, weight: 0.6 },
      filterCutoff: { min: 30, max: 300, weight: 0.8 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.9, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 60, filter_1_resonance: 0.1,
      filter_1_model: 3, filter_1_style: 1.0,
      env_1_attack: 0.005, env_1_decay: 0.2, env_1_sustain: 0.85, env_1_release: 0.1,
      env_1_attack_power: 1.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
    },
  },
  {
    id: 'saw_bass',
    name: 'Saw Bass',
    category: 'bass',
    description: 'Classic saw bass with sub layer. Versatile for any genre.',
    matchReason: 'Saw oscillator with low-pass filter creates the classic analog bass tone.',
    tags: ['saw', 'classic', 'punchy'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.35, weight: 1.0 },
      waveformTypes: ['saw'],
      attack: { min: 0, max: 20, weight: 0.7 },
      spectralCentroid: { min: 100, max: 600, weight: 0.8 },
      sustain: { min: 0.4, max: 0.9, weight: 0.5 },
      filterCutoff: { min: 100, max: 800, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 64,
      osc_1_unison_voices: 1.0, osc_1_unison_detune: 0, osc_1_stereo_spread: 0,
      osc_2_on: 1.0, osc_2_level: 0.5, osc_2_wave_frame: 0,
      osc_2_transpose: -12, osc_2_unison_voices: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 80, filter_1_resonance: 0.25,
      filter_1_model: 3, filter_1_style: 1.0,
      env_1_attack: 0.005, env_1_decay: 0.3, env_1_sustain: 0.7, env_1_release: 0.15,
      env_1_attack_power: 2.0, env_1_decay_power: -1.5, env_1_release_power: -2.0,
      eq_on: 1.0, eq_low_gain: 3.0, eq_high_gain: -6.0,
    },
  },
  {
    id: 'reese_bass',
    name: 'Reese Bass',
    category: 'bass',
    description: 'Detuned unison saw bass with movement. DnB and dubstep staple.',
    matchReason: 'Detuned unison saws create the phasing, moving bass texture heard in DnB.',
    tags: ['reese', 'detuned', 'dark'],
    featureProfile: {
      brightness: { min: 0.05, max: 0.3, weight: 0.8 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 0, max: 30, weight: 0.6 },
      spectralCentroid: { min: 80, max: 500, weight: 0.7 },
      sustain: { min: 0.3, max: 0.8, weight: 0.5 },
      filterCutoff: { min: 80, max: 600, weight: 0.6 },
      hasChorus: true,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 64,
      osc_1_unison_voices: 3.0, osc_1_unison_detune: 3.5, osc_1_stereo_spread: 0.5,
      osc_2_on: 1.0, osc_2_level: 0.4, osc_2_wave_frame: 64,
      osc_2_transpose: -12, osc_2_unison_voices: 2.0, osc_2_unison_detune: 2.0,
      filter_1_on: 1.0, filter_1_cutoff: 70, filter_1_resonance: 0.3,
      filter_1_model: 3, filter_1_style: 1.0,
      env_1_attack: 0.01, env_1_decay: 0.4, env_1_sustain: 0.65, env_1_release: 0.2,
      env_1_attack_power: 1.0, env_1_decay_power: -1.5, env_1_release_power: -2.0,
    },
  },
  {
    id: 'acid_bass',
    name: 'Acid Bass',
    category: 'bass',
    description: 'Resonant squelchy bass with filter movement. 303-inspired.',
    matchReason: 'High resonance filter with short decay recreates the iconic 303 squelch.',
    tags: ['acid', '303', 'squelchy'],
    featureProfile: {
      brightness: { min: 0.15, max: 0.5, weight: 0.8 },
      waveformTypes: ['saw', 'square'],
      attack: { min: 0, max: 10, weight: 0.7 },
      spectralCentroid: { min: 150, max: 800, weight: 0.7 },
      sustain: { min: 0.1, max: 0.5, weight: 0.8 },
      filterCutoff: { min: 100, max: 600, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.85, osc_1_wave_frame: 64,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 55, filter_1_resonance: 0.65,
      filter_1_model: 4, filter_1_style: 1.0,
      env_1_attack: 0.001, env_1_decay: 0.25, env_1_sustain: 0.3, env_1_release: 0.1,
      env_1_attack_power: 0.0, env_1_decay_power: -2.5, env_1_release_power: -2.0,
      distortion_on: 1.0, distortion_drive: 8.0, distortion_mix: 0.2,
    },
  },
  {
    id: '808_bass',
    name: '808 Bass',
    category: 'bass',
    description: 'Long sustain 808-style bass with pitch drop. Trap essential.',
    matchReason: 'Sine wave with long decay and saturation produces the sustained 808 sub tone.',
    tags: ['808', 'trap', 'sustain'],
    featureProfile: {
      brightness: { min: 0.0, max: 0.2, weight: 1.0 },
      waveformTypes: ['sine'],
      attack: { min: 0, max: 10, weight: 0.8 },
      spectralCentroid: { min: 30, max: 250, weight: 1.0 },
      sustain: { min: 0.2, max: 0.6, weight: 0.8 },
      filterCutoff: { min: 30, max: 300, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.9, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 65, filter_1_resonance: 0.15,
      filter_1_model: 3, filter_1_style: 1.0,
      env_1_attack: 0.001, env_1_decay: 1.5, env_1_sustain: 0.4, env_1_release: 0.3,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -2.0,
      distortion_on: 1.0, distortion_drive: 5.0, distortion_mix: 0.15,
      eq_on: 1.0, eq_low_gain: 4.0, eq_high_gain: -8.0,
    },
  },
  {
    id: 'wobble_bass',
    name: 'Wobble Bass',
    category: 'bass',
    description: 'Growling wobble bass with filter LFO. Dubstep and riddim.',
    matchReason: 'Dual oscillators with resonant filter modulation create the signature dubstep growl.',
    tags: ['wobble', 'dubstep', 'growl'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.45, weight: 0.7 },
      waveformTypes: ['saw', 'complex', 'pulse'],
      attack: { min: 0, max: 20, weight: 0.6 },
      spectralCentroid: { min: 100, max: 700, weight: 0.6 },
      sustain: { min: 0.3, max: 0.9, weight: 0.5 },
      filterCutoff: { min: 80, max: 700, weight: 0.5 },
      hasChorus: null,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.85, osc_1_wave_frame: 64,
      osc_1_unison_voices: 2.0, osc_1_unison_detune: 2.0, osc_1_stereo_spread: 0.3,
      osc_2_on: 1.0, osc_2_level: 0.4, osc_2_wave_frame: 96,
      osc_2_transpose: 0, osc_2_unison_voices: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 60, filter_1_resonance: 0.5,
      filter_1_model: 4, filter_1_style: 1.0,
      env_1_attack: 0.005, env_1_decay: 0.3, env_1_sustain: 0.7, env_1_release: 0.15,
      env_1_attack_power: 1.0, env_1_decay_power: -1.5, env_1_release_power: -2.0,
      distortion_on: 1.0, distortion_drive: 8.0, distortion_mix: 0.3,
    },
  },
  {
    id: 'fm_bass',
    name: 'FM Bass',
    category: 'bass',
    description: 'Metallic FM bass with harmonics. Neuro and future bass.',
    matchReason: 'Two sine oscillators at a fifth interval generate the metallic FM harmonic content.',
    tags: ['fm', 'metallic', 'neuro'],
    featureProfile: {
      brightness: { min: 0.15, max: 0.45, weight: 0.8 },
      waveformTypes: ['sine', 'complex'],
      attack: { min: 0, max: 15, weight: 0.7 },
      spectralCentroid: { min: 120, max: 700, weight: 0.7 },
      sustain: { min: 0.2, max: 0.7, weight: 0.6 },
      filterCutoff: { min: 100, max: 800, weight: 0.5 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.45, osc_2_wave_frame: 0,
      osc_2_transpose: 7, osc_2_unison_voices: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 75, filter_1_resonance: 0.3,
      filter_1_model: 3, filter_1_style: 1.0,
      env_1_attack: 0.002, env_1_decay: 0.35, env_1_sustain: 0.5, env_1_release: 0.15,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -2.0,
      eq_on: 1.0, eq_low_gain: 3.0, eq_high_gain: -4.0,
    },
  },

  // ---- LEAD (7) ----
  {
    id: 'supersaw_lead',
    name: 'Supersaw Lead',
    category: 'lead',
    description: 'Wide detuned supersaws. EDM anthem sound.',
    matchReason: 'Multiple detuned oscillators create the wide, cutting lead sound.',
    tags: ['supersaw', 'edm', 'wide'],
    featureProfile: {
      brightness: { min: 0.35, max: 0.75, weight: 1.0 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 0, max: 30, weight: 0.6 },
      spectralCentroid: { min: 500, max: 3000, weight: 0.8 },
      sustain: { min: 0.4, max: 0.9, weight: 0.5 },
      filterCutoff: { min: 500, max: 5000, weight: 0.5 },
      hasChorus: true,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.75, osc_1_wave_frame: 64,
      osc_1_unison_voices: 7.0, osc_1_unison_detune: 5.0, osc_1_stereo_spread: 0.8,
      osc_2_on: 1.0, osc_2_level: 0.5, osc_2_wave_frame: 64,
      osc_2_transpose: 0, osc_2_unison_voices: 5.0, osc_2_unison_detune: 4.0, osc_2_stereo_spread: 0.6,
      filter_1_on: 1.0, filter_1_cutoff: 100, filter_1_resonance: 0.2,
      filter_1_model: 0, filter_1_style: 1.0,
      env_1_attack: 0.01, env_1_decay: 0.5, env_1_sustain: 0.65, env_1_release: 0.3,
      env_1_attack_power: 1.0, env_1_decay_power: -1.5, env_1_release_power: -2.0,
      chorus_on: 1.0, chorus_dry_wet: 0.15,
    },
  },
  {
    id: 'fm_lead',
    name: 'FM Lead',
    category: 'lead',
    description: 'Bright metallic FM-style lead. Sharp and cutting.',
    matchReason: 'Two sine oscillators an octave apart produce bright FM harmonics that cut through a mix.',
    tags: ['fm', 'metallic', 'bright'],
    featureProfile: {
      brightness: { min: 0.4, max: 0.8, weight: 1.0 },
      waveformTypes: ['sine', 'complex'],
      attack: { min: 0, max: 20, weight: 0.7 },
      spectralCentroid: { min: 600, max: 4000, weight: 0.8 },
      sustain: { min: 0.3, max: 0.7, weight: 0.5 },
      filterCutoff: { min: 600, max: 6000, weight: 0.5 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.5, osc_2_wave_frame: 0,
      osc_2_transpose: 12, osc_2_unison_voices: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 110, filter_1_resonance: 0.15,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.005, env_1_decay: 0.3, env_1_sustain: 0.5, env_1_release: 0.2,
      env_1_attack_power: 1.0, env_1_decay_power: -2.0, env_1_release_power: -2.0,
    },
  },
  {
    id: 'pluck_lead',
    name: 'Pluck Lead',
    category: 'lead',
    description: 'Snappy pluck lead with short decay. Future bass and tropical.',
    matchReason: 'Fast attack with short decay and reverb tail gives the snappy plucked lead character.',
    tags: ['pluck', 'snappy', 'future bass'],
    featureProfile: {
      brightness: { min: 0.25, max: 0.6, weight: 0.8 },
      waveformTypes: ['saw', 'pulse'],
      attack: { min: 0, max: 10, weight: 1.0 },
      spectralCentroid: { min: 300, max: 2000, weight: 0.7 },
      sustain: { min: 0.0, max: 0.3, weight: 1.0 },
      filterCutoff: { min: 300, max: 3000, weight: 0.5 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 64,
      osc_1_unison_voices: 3.0, osc_1_unison_detune: 4.0, osc_1_stereo_spread: 0.5,
      osc_2_on: 1.0, osc_2_level: 0.3, osc_2_wave_frame: 96,
      osc_2_transpose: 0, osc_2_unison_voices: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 95, filter_1_resonance: 0.3,
      filter_1_model: 0, filter_1_style: 1.0,
      env_1_attack: 0.001, env_1_decay: 0.35, env_1_sustain: 0.15, env_1_release: 0.2,
      env_1_attack_power: 0.0, env_1_decay_power: -2.5, env_1_release_power: -2.0,
      reverb_on: 1.0, reverb_dry_wet: 0.3, reverb_size: 0.4,
    },
  },
  {
    id: 'arp_lead',
    name: 'Arp Lead',
    category: 'lead',
    description: 'Clean percussive lead for arpeggios. Tight and defined.',
    matchReason: 'Tight envelope with minimal sustain keeps each note short and defined for fast runs.',
    tags: ['arp', 'percussive', 'clean'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.55, weight: 0.7 },
      waveformTypes: ['square', 'pulse', 'saw'],
      attack: { min: 0, max: 10, weight: 1.0 },
      spectralCentroid: { min: 400, max: 2500, weight: 0.6 },
      sustain: { min: 0.1, max: 0.5, weight: 0.8 },
      filterCutoff: { min: 300, max: 3000, weight: 0.4 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.75, osc_1_wave_frame: 96,
      osc_1_unison_voices: 2.0, osc_1_unison_detune: 2.0, osc_1_stereo_spread: 0.3,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 90, filter_1_resonance: 0.2,
      filter_1_model: 0, filter_1_style: 1.0,
      env_1_attack: 0.001, env_1_decay: 0.2, env_1_sustain: 0.4, env_1_release: 0.15,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -2.0,
    },
  },
  {
    id: 'square_lead',
    name: 'Square Lead',
    category: 'lead',
    description: 'Retro square wave lead. Chiptune and synthwave.',
    matchReason: 'Square wave with octave layer gives the hollow retro tone of classic 8-bit synths.',
    tags: ['square', 'retro', 'chiptune'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.5, weight: 0.8 },
      waveformTypes: ['square', 'pulse'],
      attack: { min: 0, max: 15, weight: 0.7 },
      spectralCentroid: { min: 300, max: 2000, weight: 0.7 },
      sustain: { min: 0.4, max: 0.9, weight: 0.6 },
      filterCutoff: { min: 300, max: 4000, weight: 0.4 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 96,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.25, osc_2_wave_frame: 96,
      osc_2_transpose: 12, osc_2_unison_voices: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 95, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.002, env_1_decay: 0.2, env_1_sustain: 0.7, env_1_release: 0.15,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -2.0,
    },
  },
  {
    id: 'screech_lead',
    name: 'Screech Lead',
    category: 'lead',
    description: 'High resonance screech with bite. Complextro and electro.',
    matchReason: 'High filter resonance with distortion creates the aggressive, biting screech tone.',
    tags: ['screech', 'aggressive', 'resonant'],
    featureProfile: {
      brightness: { min: 0.4, max: 0.85, weight: 1.0 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 0, max: 10, weight: 0.7 },
      spectralCentroid: { min: 800, max: 5000, weight: 0.8 },
      sustain: { min: 0.3, max: 0.7, weight: 0.5 },
      filterCutoff: { min: 400, max: 4000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.85, osc_1_wave_frame: 64,
      osc_1_unison_voices: 3.0, osc_1_unison_detune: 3.0, osc_1_stereo_spread: 0.4,
      osc_2_on: 1.0, osc_2_level: 0.3, osc_2_wave_frame: 64,
      osc_2_transpose: 7, osc_2_unison_voices: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 85, filter_1_resonance: 0.7,
      filter_1_model: 4, filter_1_style: 1.0,
      env_1_attack: 0.001, env_1_decay: 0.3, env_1_sustain: 0.55, env_1_release: 0.2,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -2.0,
      distortion_on: 1.0, distortion_drive: 6.0, distortion_mix: 0.25,
    },
  },
  {
    id: 'vocal_lead',
    name: 'Vocal Lead',
    category: 'lead',
    description: 'Formant-like vowel lead. Trance and progressive.',
    matchReason: 'Heavily detuned saws with resonant filter mimic vowel formants for a vocal quality.',
    tags: ['vocal', 'formant', 'trance'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.55, weight: 0.7 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 5, max: 50, weight: 0.6 },
      spectralCentroid: { min: 400, max: 2500, weight: 0.6 },
      sustain: { min: 0.4, max: 0.8, weight: 0.6 },
      filterCutoff: { min: 300, max: 2500, weight: 0.6 },
      hasChorus: true,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.75, osc_1_wave_frame: 64,
      osc_1_unison_voices: 5.0, osc_1_unison_detune: 4.5, osc_1_stereo_spread: 0.7,
      osc_2_on: 1.0, osc_2_level: 0.4, osc_2_wave_frame: 64,
      osc_2_transpose: 0, osc_2_unison_voices: 3.0, osc_2_unison_detune: 5.0, osc_2_stereo_spread: 0.5,
      filter_1_on: 1.0, filter_1_cutoff: 75, filter_1_resonance: 0.55,
      filter_1_model: 0, filter_1_style: 1.0,
      env_1_attack: 0.02, env_1_decay: 0.4, env_1_sustain: 0.6, env_1_release: 0.3,
      env_1_attack_power: -1.0, env_1_decay_power: -1.0, env_1_release_power: -2.0,
      chorus_on: 1.0, chorus_dry_wet: 0.2,
      reverb_on: 1.0, reverb_dry_wet: 0.2, reverb_size: 0.4,
    },
  },

  // ---- PAD (7) ----
  {
    id: 'warm_pad',
    name: 'Warm Pad',
    category: 'pad',
    description: 'Lush detuned saw pad with chorus. Ambient and cinematic.',
    matchReason: 'Slow attack with detuned saws and chorus fills space without competing with leads.',
    tags: ['warm', 'lush', 'ambient'],
    featureProfile: {
      brightness: { min: 0.15, max: 0.45, weight: 0.8 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 100, max: 2000, weight: 1.0 },
      spectralCentroid: { min: 200, max: 1500, weight: 0.6 },
      sustain: { min: 0.5, max: 1.0, weight: 0.8 },
      filterCutoff: { min: 200, max: 2000, weight: 0.5 },
      hasChorus: true,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.6, osc_1_wave_frame: 64,
      osc_1_unison_voices: 5.0, osc_1_unison_detune: 5.0, osc_1_stereo_spread: 0.8,
      osc_2_on: 1.0, osc_2_level: 0.4, osc_2_wave_frame: 64,
      osc_2_transpose: 0, osc_2_unison_voices: 3.0, osc_2_unison_detune: 6.0, osc_2_stereo_spread: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 80, filter_1_resonance: 0.25,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.3, env_1_decay: 0.6, env_1_sustain: 0.75, env_1_release: 1.2,
      env_1_attack_power: -2.0, env_1_decay_power: -1.0, env_1_release_power: -2.5,
      chorus_on: 1.0, chorus_dry_wet: 0.3,
      reverb_on: 1.0, reverb_dry_wet: 0.25, reverb_size: 0.5,
    },
  },
  {
    id: 'dark_pad',
    name: 'Dark Pad',
    category: 'pad',
    description: 'Low-pass filtered pad with slow movement. Moody and atmospheric.',
    matchReason: 'Low filter cutoff with heavy reverb creates a dark, cavernous atmosphere.',
    tags: ['dark', 'moody', 'atmospheric'],
    featureProfile: {
      brightness: { min: 0.0, max: 0.25, weight: 1.0 },
      waveformTypes: ['saw', 'triangle', 'complex'],
      attack: { min: 150, max: 2000, weight: 1.0 },
      spectralCentroid: { min: 100, max: 800, weight: 0.8 },
      sustain: { min: 0.5, max: 1.0, weight: 0.7 },
      filterCutoff: { min: 80, max: 600, weight: 0.8 },
      hasChorus: null,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.6, osc_1_wave_frame: 64,
      osc_1_unison_voices: 4.0, osc_1_unison_detune: 4.5, osc_1_stereo_spread: 0.7,
      osc_2_on: 1.0, osc_2_level: 0.3, osc_2_wave_frame: 32,
      osc_2_transpose: -12, osc_2_unison_voices: 2.0, osc_2_unison_detune: 3.0,
      filter_1_on: 1.0, filter_1_cutoff: 55, filter_1_resonance: 0.3,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.5, env_1_decay: 0.8, env_1_sustain: 0.7, env_1_release: 1.5,
      env_1_attack_power: -2.5, env_1_decay_power: -1.0, env_1_release_power: -3.0,
      reverb_on: 1.0, reverb_dry_wet: 0.4, reverb_size: 0.7,
    },
  },
  {
    id: 'bright_pad',
    name: 'Bright Pad',
    category: 'pad',
    description: 'Open filter pad with shimmer. Uplifting trance and progressive.',
    matchReason: 'Open filter with heavy unison and chorus lets all the harmonics sparkle through.',
    tags: ['bright', 'shimmery', 'uplifting'],
    featureProfile: {
      brightness: { min: 0.35, max: 0.7, weight: 1.0 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 100, max: 2000, weight: 1.0 },
      spectralCentroid: { min: 500, max: 3000, weight: 0.7 },
      sustain: { min: 0.6, max: 1.0, weight: 0.7 },
      filterCutoff: { min: 500, max: 5000, weight: 0.5 },
      hasChorus: true,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.6, osc_1_wave_frame: 64,
      osc_1_unison_voices: 7.0, osc_1_unison_detune: 6.0, osc_1_stereo_spread: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.35, osc_2_wave_frame: 64,
      osc_2_transpose: 12, osc_2_unison_voices: 3.0, osc_2_unison_detune: 4.0, osc_2_stereo_spread: 0.8,
      filter_1_on: 1.0, filter_1_cutoff: 100, filter_1_resonance: 0.15,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.4, env_1_decay: 0.5, env_1_sustain: 0.8, env_1_release: 1.0,
      env_1_attack_power: -2.0, env_1_decay_power: -1.0, env_1_release_power: -2.0,
      chorus_on: 1.0, chorus_dry_wet: 0.25,
      reverb_on: 1.0, reverb_dry_wet: 0.35, reverb_size: 0.6,
    },
  },
  {
    id: 'string_pad',
    name: 'String Pad',
    category: 'pad',
    description: 'Slow-attack ensemble strings. Cinematic and orchestral.',
    matchReason: 'Dual saw layers with gentle detune and slow attack emulate a bowed string section.',
    tags: ['strings', 'cinematic', 'ensemble'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.5, weight: 0.7 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 200, max: 2000, weight: 1.0 },
      spectralCentroid: { min: 300, max: 2000, weight: 0.6 },
      sustain: { min: 0.7, max: 1.0, weight: 0.8 },
      filterCutoff: { min: 300, max: 3000, weight: 0.4 },
      hasChorus: null,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.55, osc_1_wave_frame: 64,
      osc_1_unison_voices: 6.0, osc_1_unison_detune: 3.5, osc_1_stereo_spread: 0.9,
      osc_2_on: 1.0, osc_2_level: 0.45, osc_2_wave_frame: 64,
      osc_2_transpose: 0, osc_2_unison_voices: 4.0, osc_2_unison_detune: 3.0, osc_2_stereo_spread: 0.7,
      filter_1_on: 1.0, filter_1_cutoff: 85, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.6, env_1_decay: 0.5, env_1_sustain: 0.85, env_1_release: 1.3,
      env_1_attack_power: -3.0, env_1_decay_power: -0.5, env_1_release_power: -2.5,
      reverb_on: 1.0, reverb_dry_wet: 0.3, reverb_size: 0.55,
    },
  },
  {
    id: 'shimmer_pad',
    name: 'Shimmer Pad',
    category: 'pad',
    description: 'Sparkling bright pad with heavy reverb. Ambient and post-rock.',
    matchReason: 'Octave-up second oscillator with max spread and long reverb creates an ethereal shimmer.',
    tags: ['shimmer', 'bright', 'ambient'],
    featureProfile: {
      brightness: { min: 0.4, max: 0.8, weight: 1.0 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 150, max: 2000, weight: 1.0 },
      spectralCentroid: { min: 600, max: 4000, weight: 0.7 },
      sustain: { min: 0.7, max: 1.0, weight: 0.7 },
      filterCutoff: { min: 600, max: 6000, weight: 0.5 },
      hasChorus: true,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.5, osc_1_wave_frame: 64,
      osc_1_unison_voices: 7.0, osc_1_unison_detune: 6.5, osc_1_stereo_spread: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.35, osc_2_wave_frame: 64,
      osc_2_transpose: 12, osc_2_unison_voices: 5.0, osc_2_unison_detune: 5.0, osc_2_stereo_spread: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 110, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.5, env_1_decay: 0.4, env_1_sustain: 0.85, env_1_release: 2.0,
      env_1_attack_power: -2.5, env_1_decay_power: -0.5, env_1_release_power: -3.0,
      chorus_on: 1.0, chorus_dry_wet: 0.3,
      reverb_on: 1.0, reverb_dry_wet: 0.5, reverb_size: 0.8,
    },
  },
  {
    id: 'evolving_pad',
    name: 'Evolving Pad',
    category: 'pad',
    description: 'Slow filter movement with texture. Cinematic and electronica.',
    matchReason: 'Low filter cutoff with resonance creates slow spectral movement over time.',
    tags: ['evolving', 'cinematic', 'movement'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.4, weight: 0.7 },
      waveformTypes: ['saw', 'complex', 'triangle'],
      attack: { min: 200, max: 2000, weight: 1.0 },
      spectralCentroid: { min: 150, max: 1200, weight: 0.6 },
      sustain: { min: 0.5, max: 0.9, weight: 0.7 },
      filterCutoff: { min: 100, max: 1000, weight: 0.7 },
      hasChorus: true,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.6, osc_1_wave_frame: 64,
      osc_1_unison_voices: 5.0, osc_1_unison_detune: 5.5, osc_1_stereo_spread: 0.9,
      osc_2_on: 1.0, osc_2_level: 0.35, osc_2_wave_frame: 32,
      osc_2_transpose: -12, osc_2_unison_voices: 3.0, osc_2_unison_detune: 4.0, osc_2_stereo_spread: 0.6,
      filter_1_on: 1.0, filter_1_cutoff: 65, filter_1_resonance: 0.35,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.6, env_1_decay: 0.7, env_1_sustain: 0.7, env_1_release: 1.5,
      env_1_attack_power: -2.0, env_1_decay_power: -1.0, env_1_release_power: -2.5,
      chorus_on: 1.0, chorus_dry_wet: 0.25,
      reverb_on: 1.0, reverb_dry_wet: 0.35, reverb_size: 0.65,
    },
  },
  {
    id: 'choir_pad',
    name: 'Choir Pad',
    category: 'pad',
    description: 'Thick detuned ensemble pad. Rich and full choir-like texture.',
    matchReason: 'Maximum unison voices with wide detune on both oscillators produce a dense choral wall.',
    tags: ['choir', 'thick', 'ensemble'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.5, weight: 0.7 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 100, max: 2000, weight: 1.0 },
      spectralCentroid: { min: 300, max: 2000, weight: 0.5 },
      sustain: { min: 0.6, max: 1.0, weight: 0.8 },
      filterCutoff: { min: 200, max: 2500, weight: 0.4 },
      hasChorus: true,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.55, osc_1_wave_frame: 64,
      osc_1_unison_voices: 8.0, osc_1_unison_detune: 7.0, osc_1_stereo_spread: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.45, osc_2_wave_frame: 64,
      osc_2_transpose: 0, osc_2_unison_voices: 6.0, osc_2_unison_detune: 7.5, osc_2_stereo_spread: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 85, filter_1_resonance: 0.2,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.4, env_1_decay: 0.5, env_1_sustain: 0.8, env_1_release: 1.2,
      env_1_attack_power: -2.0, env_1_decay_power: -1.0, env_1_release_power: -2.5,
      chorus_on: 1.0, chorus_dry_wet: 0.35,
      reverb_on: 1.0, reverb_dry_wet: 0.3, reverb_size: 0.5,
    },
  },

  // ---- PLUCK (3) ----
  {
    id: 'soft_pluck',
    name: 'Soft Pluck',
    category: 'pluck',
    description: 'Gentle rounded pluck. Lo-fi and chill.',
    matchReason: 'Triangle-saw blend with low filter gives a soft, rounded pluck without harsh overtones.',
    tags: ['soft', 'lofi', 'chill'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.35, weight: 0.8 },
      waveformTypes: ['triangle', 'saw'],
      attack: { min: 0, max: 10, weight: 1.0 },
      spectralCentroid: { min: 200, max: 1200, weight: 0.7 },
      sustain: { min: 0.0, max: 0.25, weight: 1.0 },
      filterCutoff: { min: 200, max: 1500, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.75, osc_1_wave_frame: 32,
      osc_1_unison_voices: 2.0, osc_1_unison_detune: 2.5, osc_1_stereo_spread: 0.4,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 75, filter_1_resonance: 0.2,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.4, env_1_sustain: 0.1, env_1_release: 0.25,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -2.0,
      reverb_on: 1.0, reverb_dry_wet: 0.25, reverb_size: 0.35,
    },
  },
  {
    id: 'hard_pluck',
    name: 'Hard Pluck',
    category: 'pluck',
    description: 'Bright aggressive pluck with bite. EDM and electro.',
    matchReason: 'Open filter with steep decay and resonance creates an aggressive, snappy transient.',
    tags: ['hard', 'bright', 'aggressive'],
    featureProfile: {
      brightness: { min: 0.3, max: 0.7, weight: 0.9 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 0, max: 10, weight: 1.0 },
      spectralCentroid: { min: 400, max: 3000, weight: 0.7 },
      sustain: { min: 0.0, max: 0.15, weight: 1.0 },
      filterCutoff: { min: 400, max: 5000, weight: 0.5 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.85, osc_1_wave_frame: 64,
      osc_1_unison_voices: 3.0, osc_1_unison_detune: 4.0, osc_1_stereo_spread: 0.5,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 100, filter_1_resonance: 0.4,
      filter_1_model: 4, filter_1_style: 1.0,
      env_1_attack: 0.001, env_1_decay: 0.25, env_1_sustain: 0.05, env_1_release: 0.15,
      env_1_attack_power: 0.0, env_1_decay_power: -3.0, env_1_release_power: -2.5,
    },
  },
  {
    id: 'bell',
    name: 'Bell',
    category: 'pluck',
    description: 'FM bell with harmonics. Clean and resonant.',
    matchReason: 'Sine oscillators at an inharmonic interval produce the bright, ringing bell overtones.',
    tags: ['bell', 'fm', 'resonant'],
    featureProfile: {
      brightness: { min: 0.3, max: 0.7, weight: 0.8 },
      waveformTypes: ['sine', 'complex'],
      attack: { min: 0, max: 10, weight: 1.0 },
      spectralCentroid: { min: 500, max: 4000, weight: 0.7 },
      sustain: { min: 0.0, max: 0.1, weight: 0.9 },
      filterCutoff: { min: 500, max: 6000, weight: 0.4 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.4, osc_2_wave_frame: 0,
      osc_2_transpose: 19, osc_2_unison_voices: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 105, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 1.2, env_1_sustain: 0.0, env_1_release: 0.8,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -2.0,
      reverb_on: 1.0, reverb_dry_wet: 0.35, reverb_size: 0.5,
    },
  },

  // ---- KICK (4) ----
  {
    id: 'standard_kick',
    name: 'Standard Kick',
    category: 'kick',
    description: 'Clean synth kick with pitch drop. House and techno.',
    matchReason: 'Sine oscillator with pitch envelope and distortion creates a clean, punchy synth kick.',
    tags: ['kick', 'house', 'techno'],
    featureProfile: {
      brightness: { min: 0.05, max: 0.3, weight: 0.8 },
      waveformTypes: ['sine'],
      attack: { min: 0, max: 5, weight: 1.0 },
      spectralCentroid: { min: 50, max: 400, weight: 0.8 },
      sustain: { min: 0.0, max: 0.1, weight: 1.0 },
      filterCutoff: { min: 30, max: 500, weight: 0.5 },
      hasChorus: false,
    },
    postProcess: 'kick',
    settings: {
      osc_1_on: 1.0,
      osc_1_level: 0.0,
      osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_1_transpose: -27,
      osc_1_phase: 0.41,
      osc_2_on: 0.0,
      filter_1_on: 0.0,
      env_1_attack: 0.0, env_1_attack_power: 0.0,
      env_1_decay: 0.608, env_1_decay_power: 5.5,
      env_1_sustain: 0.0,
      env_1_release: 0.334, env_1_release_power: -2.0,
      distortion_on: 1.0, distortion_drive: -4.2, distortion_mix: 1.0,
      compressor_on: 1.0,
      eq_on: 1.0,
    },
  },
  {
    id: 'hardstyle_kick',
    name: 'Hardstyle Kick',
    category: 'kick',
    description: 'Heavy distorted kick with long tail. Hardstyle and hardcore.',
    matchReason: 'Heavy distortion with extended decay produces the aggressive, driving hardstyle impact.',
    tags: ['hardstyle', 'heavy', 'distorted'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.45, weight: 0.8 },
      waveformTypes: ['sine', 'complex'],
      attack: { min: 0, max: 5, weight: 1.0 },
      spectralCentroid: { min: 80, max: 600, weight: 0.7 },
      sustain: { min: 0.0, max: 0.15, weight: 0.9 },
      filterCutoff: { min: 50, max: 800, weight: 0.4 },
      hasChorus: false,
    },
    postProcess: 'kick',
    settings: {
      osc_1_on: 1.0,
      osc_1_level: 0.0,
      osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_1_transpose: -24,
      osc_1_phase: 0.41,
      osc_2_on: 0.0,
      filter_1_on: 0.0,
      env_1_attack: 0.0, env_1_attack_power: 0.0,
      env_1_decay: 1.0, env_1_decay_power: 3.0,
      env_1_sustain: 0.0,
      env_1_release: 0.5, env_1_release_power: -1.5,
      distortion_on: 1.0, distortion_drive: 12.0, distortion_mix: 0.8,
      compressor_on: 1.0,
      eq_on: 1.0, eq_low_gain: 4.0,
    },
  },
  {
    id: '808_kick',
    name: '808 Kick',
    category: 'kick',
    description: 'Long sub-heavy 808 kick with sustained tail. Trap and hip-hop.',
    matchReason: 'Long sub-bass tail with pitch envelope creates the signature trap kick.',
    tags: ['808', 'trap', 'sub'],
    featureProfile: {
      brightness: { min: 0.0, max: 0.15, weight: 1.0 },
      waveformTypes: ['sine'],
      attack: { min: 0, max: 5, weight: 1.0 },
      spectralCentroid: { min: 30, max: 250, weight: 1.0 },
      sustain: { min: 0.0, max: 0.1, weight: 0.8 },
      filterCutoff: { min: 30, max: 300, weight: 0.6 },
      hasChorus: false,
    },
    postProcess: 'kick',
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.0, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_1_transpose: -30, osc_1_phase: 0.41,
      osc_2_on: 0.0,
      filter_1_on: 0.0,
      env_1_attack: 0.0, env_1_attack_power: 0.0,
      env_1_decay: 1.5, env_1_decay_power: 3.0,
      env_1_sustain: 0.0,
      env_1_release: 0.6, env_1_release_power: -1.5,
      distortion_on: 1.0, distortion_drive: 2.0, distortion_mix: 0.8,
      compressor_on: 1.0,
      eq_on: 1.0, eq_low_gain: 5.0, eq_high_gain: -10.0,
    },
  },
  {
    id: 'punchy_kick',
    name: 'Punchy Kick',
    category: 'kick',
    description: 'Tight punchy kick with click. House, techno, and DnB.',
    matchReason: 'Short decay with high-end EQ boost gives a tight, clicky transient for fast tempos.',
    tags: ['punchy', 'tight', 'click'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.4, weight: 0.8 },
      waveformTypes: ['sine'],
      attack: { min: 0, max: 5, weight: 1.0 },
      spectralCentroid: { min: 80, max: 500, weight: 0.7 },
      sustain: { min: 0.0, max: 0.05, weight: 1.0 },
      filterCutoff: { min: 50, max: 600, weight: 0.4 },
      hasChorus: false,
    },
    postProcess: 'kick',
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.0, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_1_transpose: -24, osc_1_phase: 0.41,
      osc_2_on: 0.0,
      filter_1_on: 0.0,
      env_1_attack: 0.0, env_1_attack_power: 0.0,
      env_1_decay: 0.3, env_1_decay_power: 7.0,
      env_1_sustain: 0.0,
      env_1_release: 0.15, env_1_release_power: -3.0,
      distortion_on: 1.0, distortion_drive: -2.0, distortion_mix: 1.0,
      compressor_on: 1.0,
      eq_on: 1.0, eq_low_gain: 2.0, eq_high_gain: 4.0,
    },
  },

  // ---- DRUMS (1) ----
  {
    id: 'basic_drums',
    name: 'Basic Drums',
    category: 'drums',
    description: 'Synth percussion with noise layer. Snares and hats.',
    matchReason: 'Sine body with noise layer and fast decay captures the core of synth percussion.',
    tags: ['drums', 'percussion', 'noise'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.7, weight: 0.6 },
      waveformTypes: ['complex', 'sine'],
      attack: { min: 0, max: 5, weight: 1.0 },
      spectralCentroid: { min: 200, max: 3000, weight: 0.5 },
      sustain: { min: 0.0, max: 0.1, weight: 1.0 },
      filterCutoff: { min: 200, max: 5000, weight: 0.3 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.85, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.3, osc_2_wave_frame: 127,
      osc_2_unison_voices: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 85, filter_1_resonance: 0.2,
      filter_1_model: 1, filter_1_style: 1.0,
      env_1_attack: 0.001, env_1_decay: 0.15, env_1_sustain: 0.0, env_1_release: 0.08,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -2.0,
      compressor_on: 1.0,
    },
  },

  // ---- KEYS (2) ----
  {
    id: 'electric_piano',
    name: 'Electric Piano',
    category: 'keys',
    description: 'Warm FM electric piano. Rhodes and Wurlitzer vibes.',
    matchReason: 'FM sine pair with velocity-sensitive decay captures the Rhodes bell-like warmth.',
    tags: ['epiano', 'rhodes', 'warm'],
    featureProfile: {
      brightness: { min: 0.15, max: 0.45, weight: 0.8 },
      waveformTypes: ['sine', 'complex'],
      attack: { min: 0, max: 10, weight: 0.8 },
      spectralCentroid: { min: 300, max: 2000, weight: 0.7 },
      sustain: { min: 0.2, max: 0.5, weight: 0.7 },
      filterCutoff: { min: 300, max: 3000, weight: 0.5 },
      hasChorus: null,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.35, osc_2_wave_frame: 0,
      osc_2_transpose: 12, osc_2_unison_voices: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 90, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.8, env_1_sustain: 0.35, env_1_release: 0.4,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -2.0,
      chorus_on: 1.0, chorus_dry_wet: 0.15,
    },
  },
  {
    id: 'organ',
    name: 'Organ',
    category: 'keys',
    description: 'Drawbar-style organ with harmonics. Gospel and rock.',
    matchReason: 'Stacked sine harmonics with high sustain and light overdrive recreate drawbar organ tone.',
    tags: ['organ', 'drawbar', 'harmonic'],
    featureProfile: {
      brightness: { min: 0.25, max: 0.55, weight: 0.7 },
      waveformTypes: ['sine', 'complex'],
      attack: { min: 0, max: 15, weight: 0.7 },
      spectralCentroid: { min: 400, max: 2500, weight: 0.6 },
      sustain: { min: 0.7, max: 1.0, weight: 0.9 },
      filterCutoff: { min: 400, max: 4000, weight: 0.4 },
      hasChorus: null,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.5, osc_2_wave_frame: 0,
      osc_2_transpose: 12, osc_2_unison_voices: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 95, filter_1_resonance: 0.05,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.005, env_1_decay: 0.1, env_1_sustain: 0.9, env_1_release: 0.1,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
      chorus_on: 1.0, chorus_dry_wet: 0.2,
      distortion_on: 1.0, distortion_drive: 3.0, distortion_mix: 0.1,
    },
  },

  // ---- GUITAR (3) ----
  {
    id: 'acoustic_guitar',
    name: 'Acoustic Guitar',
    category: 'guitar',
    description: 'Nylon string approximation. Warm plucky tone with body resonance.',
    matchReason: 'Triangle-saw blend with plucky envelope approximates the warm body of an acoustic string.',
    tags: ['acoustic', 'nylon', 'warm'],
    featureProfile: {
      brightness: { min: 0.15, max: 0.4, weight: 0.8 },
      waveformTypes: ['triangle', 'saw', 'complex'],
      attack: { min: 0, max: 10, weight: 0.9 },
      spectralCentroid: { min: 200, max: 1500, weight: 0.7 },
      sustain: { min: 0.1, max: 0.45, weight: 0.7 },
      filterCutoff: { min: 200, max: 2000, weight: 0.5 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.75, osc_1_wave_frame: 48,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 80, filter_1_resonance: 0.15,
      filter_1_model: 3, filter_1_style: 1.0,
      env_1_attack: 0.001, env_1_decay: 0.4, env_1_sustain: 0.3, env_1_release: 0.3,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -2.0,
      chorus_on: 1.0, chorus_dry_wet: 0.12,
      reverb_on: 1.0, reverb_dry_wet: 0.2, reverb_size: 0.3,
    },
  },
  {
    id: 'clean_electric',
    name: 'Clean Electric',
    category: 'guitar',
    description: 'Clean electric guitar tone. Slight detune for warmth.',
    matchReason: 'Saw wave with subtle detune and chorus mimics a clean electric through a warm amp.',
    tags: ['clean', 'electric', 'warm'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.5, weight: 0.8 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 0, max: 15, weight: 0.8 },
      spectralCentroid: { min: 300, max: 2000, weight: 0.7 },
      sustain: { min: 0.2, max: 0.6, weight: 0.6 },
      filterCutoff: { min: 300, max: 3000, weight: 0.5 },
      hasChorus: true,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 64,
      osc_1_unison_voices: 2.0, osc_1_unison_detune: 1.5, osc_1_stereo_spread: 0.3,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 90, filter_1_resonance: 0.15,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.002, env_1_decay: 0.5, env_1_sustain: 0.45, env_1_release: 0.25,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -2.0,
      chorus_on: 1.0, chorus_dry_wet: 0.15,
      reverb_on: 1.0, reverb_dry_wet: 0.2, reverb_size: 0.35,
    },
  },
  {
    id: 'distorted_guitar',
    name: 'Distorted Guitar',
    category: 'guitar',
    description: 'Overdriven guitar with harmonic complexity. Rock and metal.',
    matchReason: 'Saw and square waves with heavy distortion generate the dense harmonic crunch of overdrive.',
    tags: ['distorted', 'heavy', 'rock'],
    featureProfile: {
      brightness: { min: 0.35, max: 0.75, weight: 0.8 },
      waveformTypes: ['saw', 'complex', 'square'],
      attack: { min: 0, max: 15, weight: 0.7 },
      spectralCentroid: { min: 500, max: 3500, weight: 0.7 },
      sustain: { min: 0.3, max: 0.7, weight: 0.5 },
      filterCutoff: { min: 500, max: 6000, weight: 0.4 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 64,
      osc_1_unison_voices: 2.0, osc_1_unison_detune: 2.0, osc_1_stereo_spread: 0.4,
      osc_2_on: 1.0, osc_2_level: 0.35, osc_2_wave_frame: 96,
      osc_2_transpose: 0, osc_2_unison_voices: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 110, filter_1_resonance: 0.2,
      filter_1_model: 0, filter_1_style: 1.0,
      env_1_attack: 0.002, env_1_decay: 0.4, env_1_sustain: 0.55, env_1_release: 0.2,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -2.0,
      distortion_on: 1.0, distortion_drive: 12.0, distortion_mix: 0.6,
      compressor_on: 1.0,
      eq_on: 1.0, eq_low_gain: -3.0, eq_high_gain: 2.0,
    },
  },

  // ---- BRASS (3) ----
  {
    id: 'trumpet',
    name: 'Trumpet',
    category: 'brass',
    description: 'Bright brass with bite. Fast attack and open filter.',
    matchReason: 'Saw-square blend with open filter and fast attack captures the bright, biting brass tone.',
    tags: ['trumpet', 'bright', 'brass'],
    featureProfile: {
      brightness: { min: 0.35, max: 0.7, weight: 0.9 },
      waveformTypes: ['saw', 'square'],
      attack: { min: 5, max: 50, weight: 0.8 },
      spectralCentroid: { min: 500, max: 3000, weight: 0.7 },
      sustain: { min: 0.4, max: 0.8, weight: 0.6 },
      filterCutoff: { min: 500, max: 4000, weight: 0.5 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.75, osc_1_wave_frame: 64,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.25, osc_2_wave_frame: 96,
      osc_2_transpose: 0, osc_2_unison_voices: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 95, filter_1_resonance: 0.25,
      filter_1_model: 0, filter_1_style: 1.0,
      env_1_attack: 0.02, env_1_decay: 0.3, env_1_sustain: 0.6, env_1_release: 0.2,
      env_1_attack_power: 1.0, env_1_decay_power: -1.0, env_1_release_power: -2.0,
      eq_on: 1.0, eq_low_gain: -4.0, eq_high_gain: 3.0,
      reverb_on: 1.0, reverb_dry_wet: 0.15, reverb_size: 0.3,
    },
  },
  {
    id: 'trombone',
    name: 'Trombone',
    category: 'brass',
    description: 'Warm mellow brass. Darker tone with smooth sustain.',
    matchReason: 'Single saw with lower filter cutoff and smooth attack produces the mellow trombone warmth.',
    tags: ['trombone', 'warm', 'mellow'],
    featureProfile: {
      brightness: { min: 0.15, max: 0.45, weight: 0.9 },
      waveformTypes: ['saw'],
      attack: { min: 15, max: 100, weight: 0.7 },
      spectralCentroid: { min: 200, max: 1500, weight: 0.7 },
      sustain: { min: 0.5, max: 0.85, weight: 0.6 },
      filterCutoff: { min: 200, max: 1500, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 64,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 75, filter_1_resonance: 0.2,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.05, env_1_decay: 0.3, env_1_sustain: 0.7, env_1_release: 0.3,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -2.0,
      eq_on: 1.0, eq_low_gain: 2.0, eq_high_gain: -4.0,
      reverb_on: 1.0, reverb_dry_wet: 0.2, reverb_size: 0.35,
    },
  },
  {
    id: 'french_horn',
    name: 'French Horn',
    category: 'brass',
    description: 'Mellow cinematic brass. Slow attack with rich reverb.',
    matchReason: 'Slow attack with saw-triangle blend and deep reverb captures the noble, rounded horn sound.',
    tags: ['french horn', 'mellow', 'cinematic'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.35, weight: 0.8 },
      waveformTypes: ['saw', 'triangle'],
      attack: { min: 50, max: 300, weight: 0.8 },
      spectralCentroid: { min: 150, max: 1000, weight: 0.7 },
      sustain: { min: 0.6, max: 1.0, weight: 0.7 },
      filterCutoff: { min: 150, max: 1200, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 64,
      osc_1_unison_voices: 2.0, osc_1_unison_detune: 1.0, osc_1_stereo_spread: 0.3,
      osc_2_on: 1.0, osc_2_level: 0.3, osc_2_wave_frame: 32,
      osc_2_transpose: 0, osc_2_unison_voices: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 70, filter_1_resonance: 0.15,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.15, env_1_decay: 0.4, env_1_sustain: 0.8, env_1_release: 0.8,
      env_1_attack_power: -1.5, env_1_decay_power: -0.5, env_1_release_power: -2.0,
      reverb_on: 1.0, reverb_dry_wet: 0.35, reverb_size: 0.6,
    },
  },

  // ---- WOODWIND (3) ----
  {
    id: 'flute',
    name: 'Flute',
    category: 'woodwind',
    description: 'Airy breathy tone. Sine with noise breath layer.',
    matchReason: 'Sine oscillator with a subtle noise layer adds the airy breath character of a flute.',
    tags: ['flute', 'airy', 'breathy'],
    featureProfile: {
      brightness: { min: 0.25, max: 0.6, weight: 0.8 },
      waveformTypes: ['sine', 'complex'],
      attack: { min: 10, max: 60, weight: 0.7 },
      spectralCentroid: { min: 500, max: 3000, weight: 0.7 },
      sustain: { min: 0.5, max: 0.9, weight: 0.6 },
      filterCutoff: { min: 500, max: 5000, weight: 0.4 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.15, osc_2_wave_frame: 127,
      osc_2_unison_voices: 1.0,
      filter_1_on: 1.0, filter_1_cutoff: 105, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.03, env_1_decay: 0.2, env_1_sustain: 0.75, env_1_release: 0.25,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
      chorus_on: 1.0, chorus_dry_wet: 0.1,
      reverb_on: 1.0, reverb_dry_wet: 0.3, reverb_size: 0.45,
    },
  },
  {
    id: 'saxophone',
    name: 'Saxophone',
    category: 'woodwind',
    description: 'Reedy warm tone. Resonant filter with harmonic richness.',
    matchReason: 'Saw wave with resonant filter and light overdrive recreates the reedy, buzzy sax timbre.',
    tags: ['saxophone', 'reedy', 'warm'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.5, weight: 0.8 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 0, max: 30, weight: 0.7 },
      spectralCentroid: { min: 300, max: 2000, weight: 0.7 },
      sustain: { min: 0.4, max: 0.8, weight: 0.6 },
      filterCutoff: { min: 300, max: 2500, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 64,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 85, filter_1_resonance: 0.4,
      filter_1_model: 0, filter_1_style: 1.0,
      env_1_attack: 0.01, env_1_decay: 0.25, env_1_sustain: 0.65, env_1_release: 0.2,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -2.0,
      distortion_on: 1.0, distortion_drive: 3.0, distortion_mix: 0.1,
      eq_on: 1.0, eq_low_gain: -3.0, eq_high_gain: -2.0,
      reverb_on: 1.0, reverb_dry_wet: 0.2, reverb_size: 0.35,
    },
  },
  {
    id: 'clarinet',
    name: 'Clarinet',
    category: 'woodwind',
    description: 'Dark woody tone. Triangle base with smooth character.',
    matchReason: 'Triangle wave with low filter produces the hollow, woody tone of a clarinet register.',
    tags: ['clarinet', 'dark', 'woody'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.35, weight: 0.9 },
      waveformTypes: ['triangle', 'square'],
      attack: { min: 5, max: 40, weight: 0.7 },
      spectralCentroid: { min: 200, max: 1200, weight: 0.8 },
      sustain: { min: 0.5, max: 0.85, weight: 0.6 },
      filterCutoff: { min: 200, max: 1500, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.75, osc_1_wave_frame: 32,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 75, filter_1_resonance: 0.15,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.02, env_1_decay: 0.2, env_1_sustain: 0.7, env_1_release: 0.2,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
      reverb_on: 1.0, reverb_dry_wet: 0.15, reverb_size: 0.3,
    },
  },
];

// =============================================================================
// Preset Matching (score analysis features against preset featureProfiles)
// =============================================================================

/**
 * Score how well an analysis matches a preset's feature profile.
 * Returns 0-100 integer. Higher = better match.
 * Gracefully skips missing features.
 *
 * @param {Object} preset - A CURATED_PRESETS entry with featureProfile
 * @param {Object|null} features - Analysis features from the worker
 * @returns {number} 0-100 match score
 */
export function scorePresetMatch(preset, features) {
  if (!features || !preset.featureProfile) return 0;

  const fp = preset.featureProfile;
  let totalScore = 0;
  let totalWeight = 0;

  // 1. Brightness (0-1 float)
  if (fp.brightness && features.brightness != null) {
    const val = parseFloat(features.brightness);
    totalScore += scoreRange(val, fp.brightness) * 20;
    totalWeight += 20;
  }

  // 2. Waveform type match
  if (fp.waveformTypes && features.waveform?.type) {
    const detected = features.waveform.type;
    const match = fp.waveformTypes.includes(detected);
    totalScore += match ? 15 : 0;
    totalWeight += 15;
  }

  // 3. Attack time (ms)
  if (fp.attack && features.adsr?.attack != null) {
    const val = parseFloat(features.adsr.attack);
    totalScore += scoreRange(val, fp.attack) * 12;
    totalWeight += 12;
  }

  // 4. Spectral centroid (Hz)
  if (fp.spectralCentroid && features.spectralCentroid != null) {
    const val = parseFloat(features.spectralCentroid);
    totalScore += scoreRange(val, fp.spectralCentroid) * 10;
    totalWeight += 10;
  }

  // 5. Sustain (0-1 from ADSR, convert from percentage)
  if (fp.sustain && features.adsr?.sustain != null) {
    const val = parseFloat(features.adsr.sustain) / 100; // ADSR sustain is 0-100%
    totalScore += scoreRange(val, fp.sustain) * 8;
    totalWeight += 8;
  }

  // 6. Filter cutoff (Hz)
  if (fp.filterCutoff && features.filterEnvelope?.estimatedCutoff != null) {
    const val = parseFloat(features.filterEnvelope.estimatedCutoff);
    totalScore += scoreRange(val, fp.filterCutoff) * 8;
    totalWeight += 8;
  }

  // 7. Chorus detection (boolean)
  if (fp.hasChorus !== undefined && fp.hasChorus !== null && features.modulation) {
    const detected = !!features.modulation.hasChorus;
    totalScore += (detected === fp.hasChorus) ? 5 : 0;
    totalWeight += 5;
  }

  if (totalWeight === 0) return 0;
  return Math.round((totalScore / totalWeight) * 100);
}

/**
 * Score a value against a { min, max, weight } range.
 * Returns 0-1 (1 = within range, linear falloff outside).
 */
function scoreRange(value, range) {
  if (value >= range.min && value <= range.max) return 1.0;

  // Linear falloff: how far outside the range, relative to range width
  const rangeWidth = Math.max(range.max - range.min, 1);
  if (value < range.min) {
    const dist = range.min - value;
    return Math.max(0, 1 - dist / rangeWidth);
  } else {
    const dist = value - range.max;
    return Math.max(0, 1 - dist / rangeWidth);
  }
}

// =============================================================================
// Seed Preset Mapping (for seed Sound Sauces without uploaded .vital files)
// =============================================================================

/**
 * Maps seed Sound Sauce titles to curated preset IDs.
 */
export const SEED_PRESET_MAP = {
  '808 Bass (Trap)': '808_bass',
  'Reese Bass (DnB)': 'reese_bass',
  'Supersaw Lead (EDM)': 'supersaw_lead',
  'Pluck Synth (Future Bass)': 'soft_pluck',
  'Wobble Bass (Dubstep)': 'wobble_bass',
  'Pad Synth (Ambient)': 'warm_pad',
  'Acid Bass (Techno)': 'acid_bass',
  'Trap Hi-Hat Roll': 'basic_drums',
  'Vinyl Piano (Lo-Fi)': 'electric_piano',
  'Talking Synth (Funk)': 'vocal_lead',
  'Hardstyle Kick': 'hardstyle_kick',
  'Portamento Lead (R&B)': 'fm_lead',
  'Arp Sequence (Synthwave)': 'arp_lead',
  'Sub Bass (House)': 'sub_bass',
  'Vocal Chop (Pop)': 'vocal_lead',
  'FM Bell (Ambient)': 'bell',
  'Growl Bass (Riddim)': 'wobble_bass',
  'String Pad (Cinematic)': 'string_pad',
  'Drill 808 Slide': '808_bass',
  'Flute Lead (Latin Trap)': 'flute',
  'Phonk Cowbell': 'basic_drums',
  'Jersey Club Kick Pattern': 'punchy_kick',
  'Detuned Chord Stab (Garage)': 'hard_pluck',
  'OB-Xd Brass (Synthwave)': 'trumpet',
  'Granular Texture (Experimental)': 'evolving_pad',
};

/**
 * Find the best curated preset for a seed Sound Sauce.
 * First checks title map, then falls back to instrument category + feature scoring.
 *
 * @param {Object} recipe - A recipe/analysis object with title, results
 * @returns {{ presetId: string, preset: Object } | null}
 */
export function findCuratedPresetForRecipe(recipe) {
  // 1. Direct title match
  if (recipe.title && SEED_PRESET_MAP[recipe.title]) {
    const presetId = SEED_PRESET_MAP[recipe.title];
    const preset = CURATED_PRESETS.find(p => p.id === presetId);
    if (preset) return { presetId, preset };
  }

  // 2. Fallback: instrument → category → best scoring preset
  const results = recipe.results || {};
  const instrument = results.detectedInstruments?.[0]?.name
    || results.selectedInstrument
    || null;

  if (!instrument) return null;

  const category = INSTRUMENT_TO_CATEGORY[instrument] || INSTRUMENT_TO_CATEGORY[instrument.toLowerCase()];
  if (!category) return null;

  const categoryPresets = CURATED_PRESETS.filter(p => p.category === category);
  if (categoryPresets.length === 0) return null;

  // If we have features, score them
  const features = results.features || null;
  if (features) {
    let best = categoryPresets[0];
    let bestScore = scorePresetMatch(best, features);
    for (let i = 1; i < categoryPresets.length; i++) {
      const score = scorePresetMatch(categoryPresets[i], features);
      if (score > bestScore) {
        best = categoryPresets[i];
        bestScore = score;
      }
    }
    return { presetId: best.id, preset: best };
  }

  // No features: return first preset in category
  return { presetId: categoryPresets[0].id, preset: categoryPresets[0] };
}

/**
 * Map detected instrument types to best-matching preset category.
 */
export const INSTRUMENT_TO_CATEGORY = {
  kick: 'kick',
  bass: 'bass',
  'sub-bass': 'bass',
  sub: 'bass',
  guitar: 'guitar',
  lead: 'lead',
  synth: 'lead',
  pad: 'pad',
  strings: 'pad',
  pluck: 'pluck',
  drums: 'drums',
  snare: 'drums',
  hihat: 'drums',
  keys: 'keys',
  brass: 'brass',
  woodwind: 'woodwind',
  vocal: 'lead',
  fx: 'lead',
  electronic: 'lead',
  full: 'lead',
};
