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
// LFO Waveform Shapes — used by CATEGORY_MODULATIONS
// Vital stores LFO shapes as point arrays in settings.lfos[]
// Format: { name, num_points, points: [x0,y0, x1,y1, ...], powers: [...], smooth }
// =============================================================================

export const LFO_SHAPES = {
  // Sine — smooth, organic modulation (pads, vibrato, tremolo)
  sine: {
    name: 'Sine', num_points: 3,
    points: [0.0, 0.5, 0.5, 1.0, 1.0, 0.5],
    powers: [2.0, -2.0, 0.0], smooth: true
  },
  // Saw down — rhythmic sweep, filter wobble (bass, dubstep)
  saw_down: {
    name: 'Saw', num_points: 3,
    points: [0.0, 1.0, 0.999, 0.0, 1.0, 1.0],
    powers: [0.0, 0.0, 0.0], smooth: false
  },
  // Square — hard on/off gating (trance gates, choppy FX)
  square: {
    name: 'Square', num_points: 4,
    points: [0.0, 1.0, 0.5, 1.0, 0.5, 0.0, 1.0, 0.0],
    powers: [0.0, 0.0, 0.0, 0.0], smooth: false
  },
  // Triangle — default Vital shape (gentle, balanced)
  triangle: {
    name: 'Triangle', num_points: 3,
    points: [0.0, 1.0, 0.5, 0.0, 1.0, 1.0],
    powers: [0.0, 0.0, 0.0], smooth: false
  },
  // Smooth ramp — gentle filter sweep (keys, guitar)
  smooth_ramp: {
    name: 'Smooth Ramp', num_points: 3,
    points: [0.0, 0.0, 0.5, 1.0, 1.0, 0.0],
    powers: [1.5, -1.5, 0.0], smooth: true
  },
};

// =============================================================================
// Category Modulation Routing — connects ENV 2 and LFO 1 to destinations
// Without modulation routing, ENV 2 and LFO 1 parameters have NO effect
// in Vital even though the values are set. This is the critical missing piece.
// =============================================================================

/**
 * Default modulation routes per instrument category.
 * Each category defines which modulations to set up.
 * Uses modulation slots 4-6 (1-3 reserved for kick LFO presets).
 */
export const CATEGORY_MODULATIONS = {
  bass: {
    lfo1Shape: 'saw_down',
    routes: [
      { slot: 4, source: 'env_2', destination: 'filter_1_cutoff', amount: 0.35, bipolar: 0 },
      { slot: 5, source: 'lfo_1', destination: 'filter_1_cutoff', amount: 0.25, bipolar: 1 },
    ]
  },
  lead: {
    lfo1Shape: 'triangle',
    routes: [
      { slot: 4, source: 'env_2', destination: 'filter_1_cutoff', amount: 0.4, bipolar: 0 },
      { slot: 5, source: 'lfo_1', destination: 'osc_1_tune', amount: 0.08, bipolar: 1 },
    ]
  },
  pad: {
    lfo1Shape: 'sine',
    routes: [
      { slot: 4, source: 'env_2', destination: 'filter_1_cutoff', amount: 0.45, bipolar: 0 },
      { slot: 5, source: 'lfo_1', destination: 'filter_1_cutoff', amount: 0.15, bipolar: 1 },
      { slot: 6, source: 'lfo_1', destination: 'osc_1_level', amount: 0.06, bipolar: 1 },
    ]
  },
  pluck: {
    lfo1Shape: 'triangle',
    routes: [
      { slot: 4, source: 'env_2', destination: 'filter_1_cutoff', amount: 0.5, bipolar: 0 },
    ]
  },
  kick: {
    // Kick uses applyKickLFOEnvelopes() for slots 1-3 — no additional routing needed
    lfo1Shape: null,
    routes: []
  },
  drums: {
    lfo1Shape: 'square',
    routes: [
      { slot: 4, source: 'env_2', destination: 'filter_1_cutoff', amount: 0.5, bipolar: 0 },
    ]
  },
  keys: {
    lfo1Shape: 'sine',
    routes: [
      { slot: 4, source: 'env_2', destination: 'filter_1_cutoff', amount: 0.3, bipolar: 0 },
      { slot: 5, source: 'lfo_1', destination: 'osc_1_level', amount: 0.04, bipolar: 1 },
    ]
  },
  guitar: {
    lfo1Shape: 'smooth_ramp',
    routes: [
      { slot: 4, source: 'env_2', destination: 'filter_1_cutoff', amount: 0.35, bipolar: 0 },
      { slot: 5, source: 'lfo_1', destination: 'osc_1_tune', amount: 0.06, bipolar: 1 },
    ]
  },
  brass: {
    lfo1Shape: 'sine',
    routes: [
      { slot: 4, source: 'env_2', destination: 'filter_1_cutoff', amount: 0.4, bipolar: 0 },
      { slot: 5, source: 'lfo_1', destination: 'osc_1_tune', amount: 0.1, bipolar: 1 },
    ]
  },
  woodwind: {
    lfo1Shape: 'sine',
    routes: [
      { slot: 4, source: 'env_2', destination: 'filter_1_cutoff', amount: 0.35, bipolar: 0 },
      { slot: 5, source: 'lfo_1', destination: 'osc_1_tune', amount: 0.12, bipolar: 1 },
    ]
  },
};

/**
 * Apply category-specific modulation routing and LFO shapes to a preset.
 * This connects ENV 2 → filter and LFO 1 → destinations so they actually
 * produce audible changes in Vital (without routing, they do nothing).
 */
export function applyCategoryModulations(preset, category) {
  const catMod = CATEGORY_MODULATIONS[category];
  if (!catMod) return;

  // Set LFO 1 waveform shape
  if (catMod.lfo1Shape && LFO_SHAPES[catMod.lfo1Shape]) {
    if (!preset.settings.lfos) preset.settings.lfos = [];
    while (preset.settings.lfos.length < 8) {
      preset.settings.lfos.push({ name: 'Triangle', num_points: 3, points: [0.0, 1.0, 0.5, 0.0, 1.0, 1.0], powers: [0.0, 0.0, 0.0], smooth: false });
    }
    preset.settings.lfos[0] = LFO_SHAPES[catMod.lfo1Shape];
  }

  // Set modulation routes
  if (catMod.routes.length === 0) return;

  if (!preset.settings.modulations) preset.settings.modulations = [];
  while (preset.settings.modulations.length < 64) {
    preset.settings.modulations.push({ source: '', destination: '' });
  }

  for (const route of catMod.routes) {
    const idx = route.slot - 1;
    if (idx >= 0 && idx < 64) {
      preset.settings.modulations[idx] = {
        source: route.source,
        destination: route.destination,
      };
      preset.settings[`modulation_${route.slot}_amount`] = route.amount;
      preset.settings[`modulation_${route.slot}_bipolar`] = route.bipolar ?? 0;
      preset.settings[`modulation_${route.slot}_bypass`] = 0;
      preset.settings[`modulation_${route.slot}_power`] = 0;
      preset.settings[`modulation_${route.slot}_stereo`] = 0;
    }
  }
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
// Category Visual Profiles — env_2 + LFO 1 defaults per category
// Applied in buildVitalPreset() to make presets visually distinct in Vital's UI.
// Curated preset settings and analysis overrides take priority over these.
// =============================================================================

export const CATEGORY_VISUAL_PROFILES = {
  bass: {
    // Filter envelope: fast open, medium decay to warm sustain
    env_2_attack: 0.02, env_2_decay: 0.6, env_2_sustain: 0.35, env_2_release: 0.3,
    env_2_attack_power: 0.0, env_2_decay_power: -1.5, env_2_release_power: -2.0,
    // LFO: slow subtle wobble
    lfo_1_frequency: 0.5, lfo_1_sync: 0.0, lfo_1_sync_type: 0.0,
    lfo_1_smooth_mode: 1.0, lfo_1_smooth_time: -5.0,
    // Effects: light saturation for warmth, subtle compression, low-end EQ boost
    distortion_on: 1.0, distortion_drive: 3.0, distortion_mix: 0.15, distortion_type: 0.0,
    compressor_on: 1.0, compressor_mix: 1.0, compressor_attack: 0.3, compressor_release: 0.4,
    eq_on: 1.0, eq_low_gain: 3.0, eq_low_cutoff: 60.0, eq_high_gain: -4.0, eq_high_cutoff: 100.0,
  },
  lead: {
    // Filter envelope: instant attack, short decay, bright sustain
    env_2_attack: 0.01, env_2_decay: 0.25, env_2_sustain: 0.7, env_2_release: 0.4,
    env_2_attack_power: 0.0, env_2_decay_power: -2.5, env_2_release_power: -1.5,
    // LFO: moderate rate for vibrato feel
    lfo_1_frequency: 4.5, lfo_1_sync: 0.0, lfo_1_sync_type: 0.0,
    lfo_1_smooth_mode: 1.0, lfo_1_smooth_time: -4.0,
    // Effects: short delay for width, light reverb, presence EQ
    delay_on: 1.0, delay_dry_wet: 0.15, delay_feedback: 0.25, delay_sync: 1.0, delay_tempo: 9.0,
    reverb_on: 1.0, reverb_dry_wet: 0.15, reverb_size: 0.3, reverb_decay_time: 0.0,
    eq_on: 1.0, eq_band_gain: 2.0, eq_band_cutoff: 90.0, eq_high_gain: 3.0, eq_high_cutoff: 100.0,
  },
  pad: {
    // Filter envelope: slow swell, long decay, high sustain
    env_2_attack: 0.8, env_2_decay: 1.5, env_2_sustain: 0.6, env_2_release: 1.2,
    env_2_attack_power: -1.5, env_2_decay_power: -1.0, env_2_release_power: -1.5,
    // LFO: very slow sweep
    lfo_1_frequency: 0.15, lfo_1_sync: 0.0, lfo_1_sync_type: 0.0,
    lfo_1_smooth_mode: 1.0, lfo_1_smooth_time: -3.0,
    // Effects: lush reverb, chorus for width, gentle EQ
    reverb_on: 1.0, reverb_dry_wet: 0.45, reverb_size: 0.7, reverb_decay_time: 2.5,
    reverb_chorus_amount: 0.4, reverb_pre_high_cutoff: 100.0,
    chorus_on: 1.0, chorus_dry_wet: 0.25, chorus_voices: 4.0, chorus_mod_depth: 0.5,
    eq_on: 1.0, eq_low_gain: -2.0, eq_high_gain: 2.0, eq_high_cutoff: 95.0,
  },
  pluck: {
    // Filter envelope: instant attack, fast decay, no sustain (percussive pluck)
    env_2_attack: 0.0, env_2_decay: 0.15, env_2_sustain: 0.0, env_2_release: 0.1,
    env_2_attack_power: 0.0, env_2_decay_power: -3.0, env_2_release_power: -3.0,
    // LFO: medium rate, adds movement to repeating plucks
    lfo_1_frequency: 2.0, lfo_1_sync: 0.0, lfo_1_sync_type: 0.0,
    lfo_1_smooth_mode: 1.0, lfo_1_smooth_time: -5.0,
    // Effects: short reverb for space, delay for rhythmic echo
    reverb_on: 1.0, reverb_dry_wet: 0.2, reverb_size: 0.25, reverb_decay_time: 0.0,
    delay_on: 1.0, delay_dry_wet: 0.2, delay_feedback: 0.3, delay_sync: 1.0, delay_tempo: 9.0,
    compressor_on: 1.0, compressor_mix: 1.0, compressor_attack: 0.2, compressor_release: 0.3,
  },
  kick: {
    // Kick LFO handled by applyKickLFOEnvelopes() — env_2 for sub body
    env_2_attack: 0.0, env_2_decay: 0.08, env_2_sustain: 0.0, env_2_release: 0.05,
    env_2_attack_power: 0.0, env_2_decay_power: 5.0, env_2_release_power: -3.0,
    // LFO set by applyKickLFOEnvelopes, don't override
    // Effects: heavy distortion for punch, compression, sub-focused EQ
    distortion_on: 1.0, distortion_drive: 8.0, distortion_mix: 0.3, distortion_type: 0.0,
    compressor_on: 1.0, compressor_mix: 1.0, compressor_attack: 0.1, compressor_release: 0.2,
    eq_on: 1.0, eq_low_gain: 5.0, eq_low_cutoff: 50.0, eq_high_gain: -8.0, eq_high_cutoff: 90.0,
  },
  drums: {
    // Filter envelope: instant attack, short decay (snappy)
    env_2_attack: 0.0, env_2_decay: 0.12, env_2_sustain: 0.05, env_2_release: 0.08,
    env_2_attack_power: 0.0, env_2_decay_power: -3.5, env_2_release_power: -3.0,
    // LFO: fast for hi-hat shimmer
    lfo_1_frequency: 8.0, lfo_1_sync: 0.0, lfo_1_sync_type: 0.0,
    lfo_1_smooth_mode: 0.0, lfo_1_smooth_time: -7.0,
    // Effects: compression for snap, distortion for bite, scooped EQ
    compressor_on: 1.0, compressor_mix: 1.0, compressor_attack: 0.1, compressor_release: 0.2,
    distortion_on: 1.0, distortion_drive: 5.0, distortion_mix: 0.2, distortion_type: 0.0,
    eq_on: 1.0, eq_low_gain: 2.0, eq_band_gain: -2.0, eq_high_gain: 4.0, eq_high_cutoff: 100.0,
  },
  keys: {
    // Filter envelope: fast attack, medium decay, warm sustain
    env_2_attack: 0.01, env_2_decay: 0.4, env_2_sustain: 0.45, env_2_release: 0.5,
    env_2_attack_power: 0.0, env_2_decay_power: -2.0, env_2_release_power: -2.0,
    // LFO: slow gentle tremolo
    lfo_1_frequency: 1.5, lfo_1_sync: 0.0, lfo_1_sync_type: 0.0,
    lfo_1_smooth_mode: 1.0, lfo_1_smooth_time: -5.0,
    // Effects: medium reverb for room feel, subtle chorus
    reverb_on: 1.0, reverb_dry_wet: 0.25, reverb_size: 0.4, reverb_decay_time: 0.5,
    chorus_on: 1.0, chorus_dry_wet: 0.1, chorus_voices: 2.0, chorus_mod_depth: 0.3,
    eq_on: 1.0, eq_band_gain: 1.5, eq_band_cutoff: 85.0,
  },
  guitar: {
    // Filter envelope: fast attack, medium-long decay (string resonance)
    env_2_attack: 0.01, env_2_decay: 0.5, env_2_sustain: 0.3, env_2_release: 0.4,
    env_2_attack_power: 0.0, env_2_decay_power: -1.0, env_2_release_power: -1.5,
    // LFO: moderate for tremolo/vibrato
    lfo_1_frequency: 5.0, lfo_1_sync: 0.0, lfo_1_sync_type: 0.0,
    lfo_1_smooth_mode: 1.0, lfo_1_smooth_time: -4.0,
    // Effects: room reverb, light chorus for shimmer, mid-focused EQ
    reverb_on: 1.0, reverb_dry_wet: 0.2, reverb_size: 0.35, reverb_decay_time: 0.3,
    chorus_on: 1.0, chorus_dry_wet: 0.12, chorus_voices: 2.0, chorus_mod_depth: 0.3,
    eq_on: 1.0, eq_band_gain: 3.0, eq_band_cutoff: 85.0, eq_high_gain: 2.0,
  },
  brass: {
    // Filter envelope: medium attack, slow decay, high sustain (bright and sustained)
    env_2_attack: 0.15, env_2_decay: 0.8, env_2_sustain: 0.65, env_2_release: 0.6,
    env_2_attack_power: -1.0, env_2_decay_power: -1.0, env_2_release_power: -2.0,
    // LFO: slow vibrato
    lfo_1_frequency: 5.5, lfo_1_sync: 0.0, lfo_1_sync_type: 0.0,
    lfo_1_smooth_mode: 1.0, lfo_1_smooth_time: -4.0,
    // Effects: room reverb, light saturation for edge, bright EQ
    reverb_on: 1.0, reverb_dry_wet: 0.2, reverb_size: 0.4, reverb_decay_time: 0.5,
    distortion_on: 1.0, distortion_drive: 2.0, distortion_mix: 0.1, distortion_type: 0.0,
    eq_on: 1.0, eq_band_gain: 2.0, eq_band_cutoff: 90.0, eq_high_gain: 3.0, eq_high_cutoff: 105.0,
  },
  woodwind: {
    // Filter envelope: medium attack, medium decay, moderate sustain
    env_2_attack: 0.1, env_2_decay: 0.5, env_2_sustain: 0.5, env_2_release: 0.5,
    env_2_attack_power: -0.5, env_2_decay_power: -1.5, env_2_release_power: -2.0,
    // LFO: medium vibrato
    lfo_1_frequency: 5.0, lfo_1_sync: 0.0, lfo_1_sync_type: 0.0,
    lfo_1_smooth_mode: 1.0, lfo_1_smooth_time: -4.0,
    // Effects: airy reverb, subtle phaser for breathiness
    reverb_on: 1.0, reverb_dry_wet: 0.3, reverb_size: 0.5, reverb_decay_time: 1.0,
    phaser_on: 1.0, phaser_dry_wet: 0.15, phaser_feedback: 0.3, phaser_mod_depth: 12.0,
    eq_on: 1.0, eq_low_gain: -3.0, eq_high_gain: 2.0, eq_high_cutoff: 100.0,
  },
};

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

  // --- Oscillator ---
  { id: 'wave_frame',        label: 'Wave Shape',        vitalKey: 'osc_1_wave_frame',      min: 0,  max: 127, step: 1,    display: 'integer', group: 'oscillator', description: 'Sweeps the wavetable. 0=sine, 32=triangle, 64=saw, 96=square, 127=pulse' },
  { id: 'stereo_spread',     label: 'Stereo Spread',     vitalKey: 'osc_1_stereo_spread',   min: 0,  max: 1,   step: 0.01, display: 'percent', group: 'oscillator', description: 'Pans unison voices across the stereo field for width' },
  { id: 'osc_2_level',       label: 'OSC 2 Level',       vitalKey: 'osc_2_level',           min: 0,  max: 1,   step: 0.01, display: 'percent', group: 'oscillator', linkedToggle: 'osc_2_on', description: 'Volume of the second oscillator. Adds body or sub layer' },
  { id: 'osc_2_transpose',   label: 'OSC 2 Tune',       vitalKey: 'osc_2_transpose',       min: -48, max: 48, step: 1,    display: 'semitones', group: 'oscillator', description: 'Pitch offset of OSC 2 in semitones. -12 = sub octave, +7 = fifth' },

  // --- Filter ---
  { id: 'filter_drive',      label: 'Filter Drive',      vitalKey: 'filter_1_drive',        min: 0,  max: 20,  step: 0.1,  display: 'value',   group: 'filter',     description: 'Saturates the filter input. Adds warmth and grit at higher settings' },

  // --- Effects ---
  { id: 'distortion_drive',  label: 'Distortion',        vitalKey: 'distortion_drive',      min: 0,  max: 20,  step: 0.1,  display: 'value',   group: 'effects',    linkedToggle: 'distortion_on', description: 'Amount of distortion/saturation. Essential for 808s and leads' },
  { id: 'distortion_mix',    label: 'Dist Mix',          vitalKey: 'distortion_mix',        min: 0,  max: 1,   step: 0.01, display: 'percent', group: 'effects',    description: 'Blend between clean and distorted signal' },
  { id: 'delay_mix',         label: 'Delay',             vitalKey: 'delay_dry_wet',         min: 0,  max: 1,   step: 0.01, display: 'percent', group: 'effects',    linkedToggle: 'delay_on', description: 'Echo/delay effect. Adds rhythm and space to leads and plucks' },
  { id: 'reverb_size',       label: 'Reverb Size',       vitalKey: 'reverb_size',           min: 0,  max: 1,   step: 0.01, display: 'percent', group: 'effects',    description: 'Size of the reverb space. Small = room, large = hall' },

  // --- Modulation ---
  { id: 'env_2_decay',       label: 'Filter Env',        vitalKey: 'env_2_decay',           min: 0,  max: 4,   step: 0.01, display: 'seconds', group: 'modulation', description: 'Filter envelope decay — controls how fast the filter sweeps. Key for acid bass and plucks' },
  { id: 'lfo_rate',          label: 'LFO Rate',          vitalKey: 'lfo_1_frequency',       min: 0.1, max: 20, step: 0.1,  display: 'hz',      group: 'modulation', description: 'Speed of the LFO. Slow = gentle movement, fast = wobble/vibrato' },

  // --- Performance ---
  { id: 'glide',             label: 'Glide',             vitalKey: 'portamento_time',       min: 0,  max: 1,   step: 0.01, display: 'seconds', group: 'performance', description: 'Pitch slides between notes. Essential for 808 slides and smooth leads' },
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
      filter_1_on: 1.0, filter_1_cutoff: 54, filter_1_resonance: 0.05,
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
      filter_1_on: 1.0, filter_1_cutoff: 90, filter_1_resonance: 0.25,
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
      filter_1_on: 1.0, filter_1_cutoff: 72, filter_1_resonance: 0.35,
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
      filter_1_on: 1.0, filter_1_cutoff: 100, filter_1_resonance: 0.7,
      filter_1_model: 4, filter_1_style: 1.0,
      env_1_attack: 0.001, env_1_decay: 0.15, env_1_sustain: 0.2, env_1_release: 0.08,
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
      filter_1_on: 1.0, filter_1_cutoff: 56, filter_1_resonance: 0.15,
      filter_1_model: 3, filter_1_style: 1.0,
      env_1_attack: 0.001, env_1_decay: 2.0, env_1_sustain: 0.3, env_1_release: 0.5,
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
      filter_1_on: 1.0, filter_1_cutoff: 72, filter_1_resonance: 0.5,
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
      filter_1_on: 1.0, filter_1_cutoff: 68, filter_1_resonance: 0.3,
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
      filter_1_on: 1.0, filter_1_cutoff: 74, filter_1_resonance: 0.35,
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

  // =========================================================================
  // Bass — new presets
  // =========================================================================
  {
    id: 'rubber_bass',
    name: 'Rubber Bass',
    category: 'bass',
    description: 'Bouncy, elastic bass with pitch modulation and quick decay.',
    matchReason: 'Pitch bend on attack gives a rubbery bounce; tight envelope keeps it punchy.',
    tags: ['rubber', 'bouncy', 'elastic'],
    featureProfile: {
      brightness: { min: 0.05, max: 0.3, weight: 0.8 },
      waveformTypes: ['sine', 'triangle'],
      attack: { min: 0, max: 8, weight: 0.8 },
      spectralCentroid: { min: 60, max: 350, weight: 0.8 },
      sustain: { min: 0.05, max: 0.35, weight: 0.9 },
      filterCutoff: { min: 80, max: 400, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.9, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.4, osc_2_wave_frame: 32,
      osc_2_transpose: -12,
      filter_1_on: 1.0, filter_1_cutoff: 72, filter_1_resonance: 0.2,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.18, env_1_sustain: 0.15, env_1_release: 0.08,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -2.0,
    },
  },
  {
    id: 'talking_bass',
    name: 'Talking Bass',
    category: 'bass',
    description: 'Wah-style bass with resonant filter sweep creating vowel-like formants.',
    matchReason: 'High resonance filter with envelope modulation creates vocal-like wah movement.',
    tags: ['wah', 'talking', 'formant'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.45, weight: 0.7 },
      waveformTypes: ['saw', 'square'],
      attack: { min: 0, max: 10, weight: 0.7 },
      spectralCentroid: { min: 150, max: 700, weight: 0.8 },
      sustain: { min: 0.15, max: 0.5, weight: 0.7 },
      filterCutoff: { min: 100, max: 500, weight: 0.8 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.85, osc_1_wave_frame: 64,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.5, osc_2_wave_frame: 96,
      osc_2_transpose: 0,
      filter_1_on: 1.0, filter_1_cutoff: 60, filter_1_resonance: 0.65,
      filter_1_model: 4, filter_1_style: 1.0,
      env_1_attack: 0.001, env_1_decay: 0.2, env_1_sustain: 0.3, env_1_release: 0.1,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -1.5,
      env_2_attack: 0.01, env_2_decay: 0.25, env_2_sustain: 0.1, env_2_release: 0.15,
    },
  },
  {
    id: 'deep_house_bass',
    name: 'Deep House Bass',
    category: 'bass',
    description: 'Warm, round bass with subtle saturation. Classic deep/tech house foundation.',
    matchReason: 'Low-passed saw with moderate sustain sits warmly in a house mix without dominating.',
    tags: ['deep house', 'warm', 'round'],
    featureProfile: {
      brightness: { min: 0.03, max: 0.2, weight: 0.9 },
      waveformTypes: ['saw', 'sine'],
      attack: { min: 0, max: 12, weight: 0.7 },
      spectralCentroid: { min: 60, max: 300, weight: 0.8 },
      sustain: { min: 0.3, max: 0.7, weight: 0.8 },
      filterCutoff: { min: 60, max: 300, weight: 0.8 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.85, osc_1_wave_frame: 64,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 62, filter_1_resonance: 0.15,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.003, env_1_decay: 0.25, env_1_sustain: 0.5, env_1_release: 0.12,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -1.5,
      distortion_on: 1.0, distortion_drive: 5.0, distortion_mix: 0.1,
    },
  },
  {
    id: 'neuro_bass',
    name: 'Neuro Bass',
    category: 'bass',
    description: 'Aggressive, modulated bass with heavy distortion and movement. DnB/dubstep staple.',
    matchReason: 'Distorted saw with fast filter modulation creates the characteristic growling timbre.',
    tags: ['neuro', 'dnb', 'aggressive'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.65, weight: 0.7 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 0, max: 10, weight: 0.6 },
      spectralCentroid: { min: 200, max: 1200, weight: 0.7 },
      sustain: { min: 0.2, max: 0.6, weight: 0.7 },
      filterCutoff: { min: 150, max: 800, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.9, osc_1_wave_frame: 64,
      osc_1_unison_voices: 3.0, osc_1_unison_detune: 2.5,
      osc_2_on: 1.0, osc_2_level: 0.6, osc_2_wave_frame: 96,
      osc_2_transpose: 0,
      filter_1_on: 1.0, filter_1_cutoff: 75, filter_1_resonance: 0.45,
      filter_1_model: 4, filter_1_style: 1.0,
      env_1_attack: 0.001, env_1_decay: 0.15, env_1_sustain: 0.4, env_1_release: 0.08,
      env_1_attack_power: 0.0, env_1_decay_power: -2.5, env_1_release_power: -2.0,
      distortion_on: 1.0, distortion_drive: 20.0, distortion_mix: 0.4,
    },
  },
  {
    id: 'moog_bass',
    name: 'Moog-Style Bass',
    category: 'bass',
    description: 'Classic analog ladder filter bass. Fat, warm, and gritty.',
    matchReason: 'Analog-modeled ladder filter with moderate resonance produces the classic Moog warmth.',
    tags: ['moog', 'analog', 'ladder'],
    featureProfile: {
      brightness: { min: 0.05, max: 0.3, weight: 0.8 },
      waveformTypes: ['saw', 'square'],
      attack: { min: 0, max: 8, weight: 0.8 },
      spectralCentroid: { min: 80, max: 400, weight: 0.8 },
      sustain: { min: 0.3, max: 0.7, weight: 0.7 },
      filterCutoff: { min: 80, max: 350, weight: 0.8 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 64,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.6, osc_2_wave_frame: 96,
      osc_2_transpose: -12,
      filter_1_on: 1.0, filter_1_cutoff: 65, filter_1_resonance: 0.35,
      filter_1_model: 3, filter_1_style: 0.0,
      env_1_attack: 0.002, env_1_decay: 0.2, env_1_sustain: 0.55, env_1_release: 0.1,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -1.5,
      distortion_on: 1.0, distortion_drive: 6.0, distortion_mix: 0.12,
    },
  },
  {
    id: 'distorted_bass',
    name: 'Distorted Bass',
    category: 'bass',
    description: 'Heavily saturated bass with harmonic overtones. Aggressive and present.',
    matchReason: 'High-drive distortion before the filter generates rich harmonics that cut through a mix.',
    tags: ['distorted', 'saturated', 'aggressive'],
    featureProfile: {
      brightness: { min: 0.15, max: 0.55, weight: 0.7 },
      waveformTypes: ['saw', 'square', 'complex'],
      attack: { min: 0, max: 10, weight: 0.7 },
      spectralCentroid: { min: 150, max: 900, weight: 0.7 },
      sustain: { min: 0.2, max: 0.6, weight: 0.7 },
      filterCutoff: { min: 100, max: 600, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.9, osc_1_wave_frame: 64,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 78, filter_1_resonance: 0.2,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.18, env_1_sustain: 0.45, env_1_release: 0.1,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -2.0,
      distortion_on: 1.0, distortion_drive: 30.0, distortion_mix: 0.5,
    },
  },

  // =========================================================================
  // Lead — new presets
  // =========================================================================
  {
    id: 'detuned_saw_lead',
    name: 'Detuned Saw Lead',
    category: 'lead',
    description: 'Thick, wide lead from multiple detuned saw oscillators. Classic EDM lead.',
    matchReason: 'Unison detuning creates stereo width and presence without needing effects.',
    tags: ['detuned', 'unison', 'thick'],
    featureProfile: {
      brightness: { min: 0.3, max: 0.7, weight: 0.8 },
      waveformTypes: ['saw'],
      attack: { min: 0, max: 15, weight: 0.7 },
      spectralCentroid: { min: 800, max: 3000, weight: 0.7 },
      sustain: { min: 0.5, max: 0.9, weight: 0.7 },
      filterCutoff: { min: 500, max: 3000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 64,
      osc_1_unison_voices: 5.0, osc_1_unison_detune: 4.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 90, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.005, env_1_decay: 0.3, env_1_sustain: 0.75, env_1_release: 0.2,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
    },
  },
  {
    id: 'trance_lead',
    name: 'Trance Lead',
    category: 'lead',
    description: 'Bright, soaring lead with supersaw character. Uplifting trance melodies.',
    matchReason: 'Wide unison and open filter give the characteristic bright, emotional trance sound.',
    tags: ['trance', 'supersaw', 'uplifting'],
    featureProfile: {
      brightness: { min: 0.4, max: 0.8, weight: 0.8 },
      waveformTypes: ['saw'],
      attack: { min: 0, max: 20, weight: 0.6 },
      spectralCentroid: { min: 1000, max: 4000, weight: 0.7 },
      sustain: { min: 0.6, max: 0.95, weight: 0.7 },
      filterCutoff: { min: 800, max: 5000, weight: 0.6 },
      hasChorus: true,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 64,
      osc_1_unison_voices: 7.0, osc_1_unison_detune: 5.5,
      osc_2_on: 1.0, osc_2_level: 0.3, osc_2_wave_frame: 64,
      osc_2_transpose: 12,
      filter_1_on: 1.0, filter_1_cutoff: 100, filter_1_resonance: 0.08,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.01, env_1_decay: 0.4, env_1_sustain: 0.8, env_1_release: 0.3,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
      chorus_on: 1.0, chorus_dry_wet: 0.3, chorus_frequency: 2.5,
      reverb_on: 1.0, reverb_dry_wet: 0.2, reverb_size: 0.5,
    },
  },
  {
    id: 'whistle_lead',
    name: 'Whistle Synth',
    category: 'lead',
    description: 'Pure, breathy lead resembling a whistle. Clean and simple.',
    matchReason: 'Near-sine waveform with gentle filter creates a clean, whistling tone.',
    tags: ['whistle', 'clean', 'simple'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.35, weight: 0.8 },
      waveformTypes: ['sine', 'triangle'],
      attack: { min: 5, max: 40, weight: 0.7 },
      spectralCentroid: { min: 800, max: 2500, weight: 0.8 },
      sustain: { min: 0.6, max: 0.95, weight: 0.7 },
      filterCutoff: { min: 600, max: 2000, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.75, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 88, filter_1_resonance: 0.25,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.03, env_1_decay: 0.2, env_1_sustain: 0.85, env_1_release: 0.15,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
      reverb_on: 1.0, reverb_dry_wet: 0.15, reverb_size: 0.35,
    },
  },
  {
    id: 'portamento_lead',
    name: 'Portamento Lead',
    category: 'lead',
    description: 'Smooth, gliding lead with pitch slide between notes. R&B and future bass.',
    matchReason: 'Monophonic saw with portamento glides smoothly between pitches.',
    tags: ['portamento', 'glide', 'smooth'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.55, weight: 0.7 },
      waveformTypes: ['saw', 'triangle'],
      attack: { min: 0, max: 15, weight: 0.7 },
      spectralCentroid: { min: 500, max: 2000, weight: 0.7 },
      sustain: { min: 0.5, max: 0.9, weight: 0.7 },
      filterCutoff: { min: 300, max: 2000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 64,
      osc_1_unison_voices: 2.0, osc_1_unison_detune: 2.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 82, filter_1_resonance: 0.15,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.008, env_1_decay: 0.25, env_1_sustain: 0.7, env_1_release: 0.2,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
      polyphony: 1, portamento_time: 0.08,
    },
  },
  {
    id: 'sync_lead',
    name: 'Sync Lead',
    category: 'lead',
    description: 'Hard-sync style lead with metallic, cutting harmonics.',
    matchReason: 'Saw and square layered with offset tuning create a hard-sync-like tearing timbre.',
    tags: ['sync', 'metallic', 'cutting'],
    featureProfile: {
      brightness: { min: 0.35, max: 0.75, weight: 0.8 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 0, max: 10, weight: 0.7 },
      spectralCentroid: { min: 1000, max: 4000, weight: 0.8 },
      sustain: { min: 0.5, max: 0.85, weight: 0.6 },
      filterCutoff: { min: 600, max: 4000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 64,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.6, osc_2_wave_frame: 96,
      osc_2_transpose: 7,
      filter_1_on: 1.0, filter_1_cutoff: 95, filter_1_resonance: 0.12,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.002, env_1_decay: 0.2, env_1_sustain: 0.7, env_1_release: 0.15,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -1.5,
    },
  },
  {
    id: 'pwm_lead',
    name: 'PWM Lead',
    category: 'lead',
    description: 'Pulse width modulation lead with hollow, nasal character that shifts over time.',
    matchReason: 'Pulse wave with width modulation creates the hollow, shifting tone unique to PWM.',
    tags: ['pwm', 'pulse', 'hollow'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.5, weight: 0.7 },
      waveformTypes: ['pulse', 'square'],
      attack: { min: 0, max: 15, weight: 0.6 },
      spectralCentroid: { min: 600, max: 2500, weight: 0.7 },
      sustain: { min: 0.5, max: 0.9, weight: 0.7 },
      filterCutoff: { min: 400, max: 2500, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 112,
      osc_1_unison_voices: 2.0, osc_1_unison_detune: 1.5,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 85, filter_1_resonance: 0.15,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.005, env_1_decay: 0.25, env_1_sustain: 0.75, env_1_release: 0.2,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
    },
  },
  {
    id: 'hoover_lead',
    name: 'Hoover / Mentasm',
    category: 'lead',
    description: 'Classic rave hoover with detuned saws and portamento. Raw 90s energy.',
    matchReason: 'Heavily detuned unison saws with glide produce the iconic hoover/mentasm sound.',
    tags: ['hoover', 'mentasm', 'rave'],
    featureProfile: {
      brightness: { min: 0.3, max: 0.7, weight: 0.7 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 0, max: 15, weight: 0.6 },
      spectralCentroid: { min: 600, max: 2500, weight: 0.7 },
      sustain: { min: 0.4, max: 0.85, weight: 0.7 },
      filterCutoff: { min: 300, max: 2000, weight: 0.6 },
      hasChorus: true,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.85, osc_1_wave_frame: 64,
      osc_1_unison_voices: 7.0, osc_1_unison_detune: 8.0,
      osc_2_on: 1.0, osc_2_level: 0.4, osc_2_wave_frame: 64,
      osc_2_transpose: -12,
      filter_1_on: 1.0, filter_1_cutoff: 80, filter_1_resonance: 0.2,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.005, env_1_decay: 0.3, env_1_sustain: 0.65, env_1_release: 0.25,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
      polyphony: 1, portamento_time: 0.06,
      distortion_on: 1.0, distortion_drive: 8.0, distortion_mix: 0.15,
    },
  },
  {
    id: 'bell_lead',
    name: 'Bell Lead',
    category: 'lead',
    description: 'Bright, bell-like lead with inharmonic overtones and fast decay.',
    matchReason: 'FM-like harmonic ratios create a metallic, bell quality that rings out clearly.',
    tags: ['bell', 'metallic', 'bright'],
    featureProfile: {
      brightness: { min: 0.35, max: 0.75, weight: 0.8 },
      waveformTypes: ['sine', 'complex'],
      attack: { min: 0, max: 8, weight: 0.8 },
      spectralCentroid: { min: 1500, max: 5000, weight: 0.8 },
      sustain: { min: 0.1, max: 0.5, weight: 0.8 },
      filterCutoff: { min: 1000, max: 6000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.5, osc_2_wave_frame: 0,
      osc_2_transpose: 19,
      filter_1_on: 1.0, filter_1_cutoff: 105, filter_1_resonance: 0.08,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.6, env_1_sustain: 0.1, env_1_release: 0.5,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -1.5,
      reverb_on: 1.0, reverb_dry_wet: 0.25, reverb_size: 0.5,
    },
  },

  // =========================================================================
  // Pad — new presets
  // =========================================================================
  {
    id: 'glass_pad',
    name: 'Glass Pad',
    category: 'pad',
    description: 'Crystalline, shimmering pad with bell-like overtones. Delicate and bright.',
    matchReason: 'High-register harmonics and reverb create a transparent, glassy atmosphere.',
    tags: ['glass', 'crystalline', 'shimmer'],
    featureProfile: {
      brightness: { min: 0.35, max: 0.7, weight: 0.8 },
      waveformTypes: ['sine', 'triangle'],
      attack: { min: 30, max: 300, weight: 0.8 },
      spectralCentroid: { min: 1500, max: 4000, weight: 0.7 },
      sustain: { min: 0.6, max: 0.95, weight: 0.7 },
      filterCutoff: { min: 1000, max: 5000, weight: 0.6 },
      hasChorus: true,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.6, osc_1_wave_frame: 0,
      osc_1_unison_voices: 4.0, osc_1_unison_detune: 3.0,
      osc_2_on: 1.0, osc_2_level: 0.4, osc_2_wave_frame: 32,
      osc_2_transpose: 12,
      filter_1_on: 1.0, filter_1_cutoff: 100, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.15, env_1_decay: 0.5, env_1_sustain: 0.75, env_1_release: 0.6,
      env_1_attack_power: 0.0, env_1_decay_power: -0.5, env_1_release_power: -1.0,
      chorus_on: 1.0, chorus_dry_wet: 0.35, chorus_frequency: 1.5,
      reverb_on: 1.0, reverb_dry_wet: 0.4, reverb_size: 0.7,
    },
  },
  {
    id: 'dark_ambient_pad',
    name: 'Dark Ambient Pad',
    category: 'pad',
    description: 'Deep, brooding pad with low filter and slow movement. Cinematic and eerie.',
    matchReason: 'Low-passed detuned saws with large reverb create a dark, cavernous atmosphere.',
    tags: ['dark', 'ambient', 'cinematic'],
    featureProfile: {
      brightness: { min: 0.02, max: 0.15, weight: 0.9 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 50, max: 500, weight: 0.8 },
      spectralCentroid: { min: 100, max: 500, weight: 0.8 },
      sustain: { min: 0.6, max: 0.95, weight: 0.7 },
      filterCutoff: { min: 60, max: 300, weight: 0.8 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 64,
      osc_1_unison_voices: 4.0, osc_1_unison_detune: 5.0,
      osc_2_on: 1.0, osc_2_level: 0.4, osc_2_wave_frame: 64,
      osc_2_transpose: -12,
      filter_1_on: 1.0, filter_1_cutoff: 55, filter_1_resonance: 0.2,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.3, env_1_decay: 0.8, env_1_sustain: 0.7, env_1_release: 1.0,
      env_1_attack_power: 0.0, env_1_decay_power: -0.5, env_1_release_power: -0.5,
      reverb_on: 1.0, reverb_dry_wet: 0.5, reverb_size: 0.85,
    },
  },
  {
    id: 'supersaw_pad',
    name: 'Supersaw Pad',
    category: 'pad',
    description: 'Lush, wide pad from heavily detuned saws. EDM buildups and breakdowns.',
    matchReason: 'Maximum unison detune with slow attack fills the stereo field with rich harmonics.',
    tags: ['supersaw', 'lush', 'wide'],
    featureProfile: {
      brightness: { min: 0.25, max: 0.6, weight: 0.7 },
      waveformTypes: ['saw'],
      attack: { min: 30, max: 300, weight: 0.8 },
      spectralCentroid: { min: 500, max: 2000, weight: 0.7 },
      sustain: { min: 0.7, max: 0.95, weight: 0.7 },
      filterCutoff: { min: 400, max: 2500, weight: 0.6 },
      hasChorus: true,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.75, osc_1_wave_frame: 64,
      osc_1_unison_voices: 7.0, osc_1_unison_detune: 6.0,
      osc_2_on: 1.0, osc_2_level: 0.35, osc_2_wave_frame: 64,
      osc_2_transpose: 12,
      filter_1_on: 1.0, filter_1_cutoff: 85, filter_1_resonance: 0.08,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.2, env_1_decay: 0.6, env_1_sustain: 0.8, env_1_release: 0.5,
      env_1_attack_power: 0.0, env_1_decay_power: -0.5, env_1_release_power: -1.0,
      chorus_on: 1.0, chorus_dry_wet: 0.25, chorus_frequency: 1.8,
      reverb_on: 1.0, reverb_dry_wet: 0.3, reverb_size: 0.6,
    },
  },
  {
    id: 'analog_pad',
    name: 'Analog Pad',
    category: 'pad',
    description: 'Warm, vintage pad with gentle filter and subtle drift. Classic analog polysynth.',
    matchReason: 'Saw-triangle blend with analog filter model and gentle chorus evokes vintage warmth.',
    tags: ['analog', 'vintage', 'warm'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.35, weight: 0.8 },
      waveformTypes: ['saw', 'triangle'],
      attack: { min: 30, max: 200, weight: 0.8 },
      spectralCentroid: { min: 300, max: 1200, weight: 0.7 },
      sustain: { min: 0.6, max: 0.9, weight: 0.7 },
      filterCutoff: { min: 200, max: 1000, weight: 0.7 },
      hasChorus: true,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 64,
      osc_1_unison_voices: 2.0, osc_1_unison_detune: 2.5,
      osc_2_on: 1.0, osc_2_level: 0.5, osc_2_wave_frame: 32,
      osc_2_transpose: 0,
      filter_1_on: 1.0, filter_1_cutoff: 72, filter_1_resonance: 0.15,
      filter_1_model: 3, filter_1_style: 0.0,
      env_1_attack: 0.12, env_1_decay: 0.5, env_1_sustain: 0.7, env_1_release: 0.45,
      env_1_attack_power: 0.0, env_1_decay_power: -0.5, env_1_release_power: -1.0,
      chorus_on: 1.0, chorus_dry_wet: 0.3, chorus_frequency: 1.2,
    },
  },
  {
    id: 'sweep_pad',
    name: 'Sweep Pad',
    category: 'pad',
    description: 'Evolving pad with slow filter sweep. Builds and releases tension over time.',
    matchReason: 'Long filter envelope creates gradual timbral movement throughout sustained notes.',
    tags: ['sweep', 'evolving', 'filter'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.5, weight: 0.7 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 50, max: 400, weight: 0.8 },
      spectralCentroid: { min: 200, max: 1500, weight: 0.7 },
      sustain: { min: 0.6, max: 0.95, weight: 0.7 },
      filterCutoff: { min: 100, max: 1000, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.75, osc_1_wave_frame: 64,
      osc_1_unison_voices: 4.0, osc_1_unison_detune: 4.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 50, filter_1_resonance: 0.25,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.25, env_1_decay: 0.8, env_1_sustain: 0.75, env_1_release: 0.6,
      env_1_attack_power: 0.0, env_1_decay_power: -0.5, env_1_release_power: -1.0,
      env_2_attack: 0.8, env_2_decay: 1.5, env_2_sustain: 0.3, env_2_release: 0.5,
      reverb_on: 1.0, reverb_dry_wet: 0.35, reverb_size: 0.65,
    },
  },
  {
    id: 'noise_pad',
    name: 'Noise Pad',
    category: 'pad',
    description: 'Airy, textured pad blending noise with tonal content. Atmospheric and breathy.',
    matchReason: 'Noise layer mixed with a soft oscillator creates a breathy, wind-like texture.',
    tags: ['noise', 'airy', 'texture'],
    featureProfile: {
      brightness: { min: 0.15, max: 0.5, weight: 0.7 },
      waveformTypes: ['complex', 'sine'],
      attack: { min: 40, max: 300, weight: 0.8 },
      spectralCentroid: { min: 800, max: 3000, weight: 0.6 },
      sustain: { min: 0.5, max: 0.9, weight: 0.7 },
      filterCutoff: { min: 500, max: 3000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.5, osc_1_wave_frame: 32,
      osc_1_unison_voices: 2.0, osc_1_unison_detune: 2.0,
      osc_2_on: 0.0,
      sample_on: 1.0, sample_level: 0.4,
      filter_1_on: 1.0, filter_1_cutoff: 80, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.2, env_1_decay: 0.6, env_1_sustain: 0.65, env_1_release: 0.5,
      env_1_attack_power: 0.0, env_1_decay_power: -0.5, env_1_release_power: -1.0,
      reverb_on: 1.0, reverb_dry_wet: 0.4, reverb_size: 0.7,
    },
  },
  {
    id: 'organ_pad',
    name: 'Organ Pad',
    category: 'pad',
    description: 'Sustained organ-like pad using additive sine layers. Warm and churchy.',
    matchReason: 'Stacked sine harmonics create a tonewheel organ-like sustain without percussive click.',
    tags: ['organ', 'sustained', 'warm'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.35, weight: 0.7 },
      waveformTypes: ['sine', 'triangle'],
      attack: { min: 20, max: 150, weight: 0.7 },
      spectralCentroid: { min: 300, max: 1200, weight: 0.7 },
      sustain: { min: 0.7, max: 0.98, weight: 0.8 },
      filterCutoff: { min: 200, max: 1500, weight: 0.6 },
      hasChorus: true,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.4, osc_2_wave_frame: 0,
      osc_2_transpose: 12,
      filter_1_on: 1.0, filter_1_cutoff: 78, filter_1_resonance: 0.05,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.08, env_1_decay: 0.3, env_1_sustain: 0.9, env_1_release: 0.3,
      env_1_attack_power: 0.0, env_1_decay_power: -0.5, env_1_release_power: -1.0,
      chorus_on: 1.0, chorus_dry_wet: 0.2, chorus_frequency: 5.0,
    },
  },

  // =========================================================================
  // Pluck — new presets
  // =========================================================================
  {
    id: 'marimba_pluck',
    name: 'Marimba',
    category: 'pluck',
    description: 'Warm, wooden marimba tone with soft attack and quick decay.',
    matchReason: 'Sine with slight triangle overtones and fast decay emulates a struck wooden bar.',
    tags: ['marimba', 'wooden', 'mallet'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.3, weight: 0.8 },
      waveformTypes: ['sine', 'triangle'],
      attack: { min: 0, max: 8, weight: 0.8 },
      spectralCentroid: { min: 300, max: 1200, weight: 0.7 },
      sustain: { min: 0.02, max: 0.15, weight: 0.9 },
      filterCutoff: { min: 300, max: 1500, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.25, osc_2_wave_frame: 32,
      osc_2_transpose: 12,
      filter_1_on: 1.0, filter_1_cutoff: 85, filter_1_resonance: 0.05,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.35, env_1_sustain: 0.02, env_1_release: 0.25,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -2.0,
    },
  },
  {
    id: 'kalimba',
    name: 'Kalimba',
    category: 'pluck',
    description: 'Bright, metallic thumb piano with bell-like ring. African-inspired.',
    matchReason: 'Sine with inharmonic overtone and moderate decay gives the kalimba ping.',
    tags: ['kalimba', 'thumb piano', 'metallic'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.5, weight: 0.8 },
      waveformTypes: ['sine'],
      attack: { min: 0, max: 5, weight: 0.9 },
      spectralCentroid: { min: 1000, max: 3500, weight: 0.8 },
      sustain: { min: 0.02, max: 0.12, weight: 0.9 },
      filterCutoff: { min: 800, max: 4000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.35, osc_2_wave_frame: 0,
      osc_2_transpose: 19,
      filter_1_on: 1.0, filter_1_cutoff: 100, filter_1_resonance: 0.08,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.5, env_1_sustain: 0.01, env_1_release: 0.4,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -1.5,
      reverb_on: 1.0, reverb_dry_wet: 0.2, reverb_size: 0.4,
    },
  },
  {
    id: 'fm_pluck',
    name: 'FM Pluck',
    category: 'pluck',
    description: 'Bright FM-style pluck with metallic, digital character.',
    matchReason: 'Non-integer harmonic ratio creates the characteristic FM metallic pluck.',
    tags: ['fm', 'digital', 'metallic'],
    featureProfile: {
      brightness: { min: 0.3, max: 0.65, weight: 0.8 },
      waveformTypes: ['sine', 'complex'],
      attack: { min: 0, max: 5, weight: 0.9 },
      spectralCentroid: { min: 1500, max: 5000, weight: 0.7 },
      sustain: { min: 0.01, max: 0.1, weight: 0.9 },
      filterCutoff: { min: 1000, max: 6000, weight: 0.5 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.5, osc_2_wave_frame: 0,
      osc_2_transpose: 24,
      filter_1_on: 1.0, filter_1_cutoff: 110, filter_1_resonance: 0.05,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.3, env_1_sustain: 0.01, env_1_release: 0.2,
      env_1_attack_power: 0.0, env_1_decay_power: -2.5, env_1_release_power: -2.0,
    },
  },
  {
    id: 'harp',
    name: 'Harp',
    category: 'pluck',
    description: 'Gentle harp pluck with soft attack and long, ringing decay.',
    matchReason: 'Triangle base with gradual decay and reverb mimics vibrating harp strings.',
    tags: ['harp', 'gentle', 'ringing'],
    featureProfile: {
      brightness: { min: 0.15, max: 0.4, weight: 0.7 },
      waveformTypes: ['triangle', 'sine'],
      attack: { min: 0, max: 10, weight: 0.8 },
      spectralCentroid: { min: 500, max: 2000, weight: 0.7 },
      sustain: { min: 0.05, max: 0.25, weight: 0.8 },
      filterCutoff: { min: 400, max: 2500, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.75, osc_1_wave_frame: 32,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.2, osc_2_wave_frame: 0,
      osc_2_transpose: 12,
      filter_1_on: 1.0, filter_1_cutoff: 90, filter_1_resonance: 0.08,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.002, env_1_decay: 0.7, env_1_sustain: 0.05, env_1_release: 0.6,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.0,
      reverb_on: 1.0, reverb_dry_wet: 0.3, reverb_size: 0.55,
    },
  },
  {
    id: 'pizzicato',
    name: 'Pizzicato',
    category: 'pluck',
    description: 'Short, snappy pizzicato string pluck. Orchestral and precise.',
    matchReason: 'Fast attack and very short decay create a tight, plucked string character.',
    tags: ['pizzicato', 'string', 'orchestral'],
    featureProfile: {
      brightness: { min: 0.15, max: 0.4, weight: 0.7 },
      waveformTypes: ['saw', 'triangle'],
      attack: { min: 0, max: 5, weight: 0.9 },
      spectralCentroid: { min: 400, max: 1800, weight: 0.7 },
      sustain: { min: 0.01, max: 0.08, weight: 0.9 },
      filterCutoff: { min: 300, max: 2000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 64,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 82, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.15, env_1_sustain: 0.01, env_1_release: 0.1,
      env_1_attack_power: 0.0, env_1_decay_power: -3.0, env_1_release_power: -2.5,
      reverb_on: 1.0, reverb_dry_wet: 0.15, reverb_size: 0.3,
    },
  },
  {
    id: 'guitar_pluck',
    name: 'Guitar Pluck',
    category: 'pluck',
    description: 'Nylon-ish guitar pluck with body resonance and string decay.',
    matchReason: 'Saw-triangle blend with moderate filter creates a convincing plucked string body.',
    tags: ['guitar', 'nylon', 'acoustic'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.35, weight: 0.7 },
      waveformTypes: ['saw', 'triangle'],
      attack: { min: 0, max: 8, weight: 0.8 },
      spectralCentroid: { min: 300, max: 1500, weight: 0.7 },
      sustain: { min: 0.05, max: 0.25, weight: 0.8 },
      filterCutoff: { min: 200, max: 1200, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.75, osc_1_wave_frame: 48,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.3, osc_2_wave_frame: 32,
      osc_2_transpose: 0,
      filter_1_on: 1.0, filter_1_cutoff: 78, filter_1_resonance: 0.12,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.002, env_1_decay: 0.4, env_1_sustain: 0.08, env_1_release: 0.3,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -1.5,
    },
  },
  {
    id: 'synth_stab',
    name: 'Synth Stab',
    category: 'pluck',
    description: 'Punchy chord stab with fast filter snap. Classic house and garage.',
    matchReason: 'Quick filter envelope with moderate resonance creates the iconic stab transient.',
    tags: ['stab', 'house', 'punchy'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.55, weight: 0.7 },
      waveformTypes: ['saw', 'square'],
      attack: { min: 0, max: 5, weight: 0.9 },
      spectralCentroid: { min: 500, max: 2500, weight: 0.7 },
      sustain: { min: 0.01, max: 0.1, weight: 0.9 },
      filterCutoff: { min: 200, max: 1500, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.85, osc_1_wave_frame: 64,
      osc_1_unison_voices: 3.0, osc_1_unison_detune: 3.0,
      osc_2_on: 1.0, osc_2_level: 0.4, osc_2_wave_frame: 96,
      osc_2_transpose: 0,
      filter_1_on: 1.0, filter_1_cutoff: 70, filter_1_resonance: 0.3,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.12, env_1_sustain: 0.01, env_1_release: 0.08,
      env_1_attack_power: 0.0, env_1_decay_power: -3.0, env_1_release_power: -2.5,
      env_2_attack: 0.001, env_2_decay: 0.08, env_2_sustain: 0.0, env_2_release: 0.05,
    },
  },
  {
    id: 'music_box',
    name: 'Music Box',
    category: 'pluck',
    description: 'Delicate, tinkling music box with pure tone and gentle decay.',
    matchReason: 'Pure sine with very short decay and high-register octave creates the tiny, precious sound.',
    tags: ['music box', 'delicate', 'tinkling'],
    featureProfile: {
      brightness: { min: 0.15, max: 0.4, weight: 0.8 },
      waveformTypes: ['sine'],
      attack: { min: 0, max: 3, weight: 0.9 },
      spectralCentroid: { min: 2000, max: 6000, weight: 0.8 },
      sustain: { min: 0.01, max: 0.08, weight: 0.9 },
      filterCutoff: { min: 1500, max: 6000, weight: 0.5 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.65, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.3, osc_2_wave_frame: 0,
      osc_2_transpose: 24,
      filter_1_on: 1.0, filter_1_cutoff: 108, filter_1_resonance: 0.05,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.6, env_1_sustain: 0.01, env_1_release: 0.5,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -1.5,
      reverb_on: 1.0, reverb_dry_wet: 0.25, reverb_size: 0.45,
    },
  },

  // =========================================================================
  // Kick — new presets
  // =========================================================================
  {
    id: 'vinyl_kick',
    name: 'Vinyl Kick',
    category: 'kick',
    description: 'Warm, lo-fi kick with soft transient. Sampled vinyl character.',
    matchReason: 'Rounded sine with gentle attack and low-pass filtering gives a dusty, warm thump.',
    tags: ['vinyl', 'lo-fi', 'warm'],
    postProcess: 'kick',
    featureProfile: {
      brightness: { min: 0.02, max: 0.1, weight: 0.9 },
      waveformTypes: ['sine'],
      attack: { min: 0, max: 8, weight: 0.8 },
      spectralCentroid: { min: 40, max: 150, weight: 0.9 },
      sustain: { min: 0.01, max: 0.08, weight: 0.9 },
      filterCutoff: { min: 40, max: 200, weight: 0.8 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.85, osc_1_wave_frame: 0,
      osc_1_transpose: -24,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 55, filter_1_resonance: 0.05,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.003, env_1_decay: 0.2, env_1_sustain: 0.0, env_1_release: 0.1,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -2.5,
    },
  },
  {
    id: 'boomy_kick',
    name: 'Boomy Kick',
    category: 'kick',
    description: 'Large, boomy kick with extended low-end tail. Big room and festival sound.',
    matchReason: 'Long sub decay with pitch envelope creates a massive, room-filling boom.',
    tags: ['boomy', 'big room', 'festival'],
    postProcess: 'kick',
    featureProfile: {
      brightness: { min: 0.02, max: 0.12, weight: 0.9 },
      waveformTypes: ['sine'],
      attack: { min: 0, max: 5, weight: 0.9 },
      spectralCentroid: { min: 40, max: 180, weight: 0.9 },
      sustain: { min: 0.01, max: 0.1, weight: 0.9 },
      filterCutoff: { min: 40, max: 250, weight: 0.8 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.95, osc_1_wave_frame: 0,
      osc_1_transpose: -24,
      osc_2_on: 0.0,
      filter_1_on: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.45, env_1_sustain: 0.0, env_1_release: 0.2,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -2.0,
      distortion_on: 1.0, distortion_drive: 5.0, distortion_mix: 0.1,
    },
  },
  {
    id: 'distorted_kick',
    name: 'Distorted Kick',
    category: 'kick',
    description: 'Crunchy, saturated kick with aggressive midrange. Industrial and hard dance.',
    matchReason: 'Heavy drive on the sine body pushes harmonics into the midrange for an aggressive punch.',
    tags: ['distorted', 'industrial', 'hard'],
    postProcess: 'kick',
    featureProfile: {
      brightness: { min: 0.08, max: 0.3, weight: 0.8 },
      waveformTypes: ['sine', 'complex'],
      attack: { min: 0, max: 5, weight: 0.9 },
      spectralCentroid: { min: 60, max: 350, weight: 0.8 },
      sustain: { min: 0.01, max: 0.08, weight: 0.9 },
      filterCutoff: { min: 60, max: 400, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.9, osc_1_wave_frame: 0,
      osc_1_transpose: -24,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 72, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.2, env_1_sustain: 0.0, env_1_release: 0.08,
      env_1_attack_power: 0.0, env_1_decay_power: -2.5, env_1_release_power: -3.0,
      distortion_on: 1.0, distortion_drive: 25.0, distortion_mix: 0.45,
    },
  },
  {
    id: 'minimal_kick',
    name: 'Minimal Kick',
    category: 'kick',
    description: 'Tight, clean kick with short decay. Minimal techno and microhouse.',
    matchReason: 'Very short sine with minimal harmonics sits cleanly in sparse arrangements.',
    tags: ['minimal', 'clean', 'tight'],
    postProcess: 'kick',
    featureProfile: {
      brightness: { min: 0.01, max: 0.08, weight: 0.9 },
      waveformTypes: ['sine'],
      attack: { min: 0, max: 3, weight: 0.9 },
      spectralCentroid: { min: 35, max: 120, weight: 0.9 },
      sustain: { min: 0.0, max: 0.03, weight: 0.9 },
      filterCutoff: { min: 35, max: 150, weight: 0.8 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.85, osc_1_wave_frame: 0,
      osc_1_transpose: -24,
      osc_2_on: 0.0,
      filter_1_on: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.1, env_1_sustain: 0.0, env_1_release: 0.05,
      env_1_attack_power: 0.0, env_1_decay_power: -3.0, env_1_release_power: -3.0,
    },
  },
  {
    id: 'gabber_kick',
    name: 'Gabber Kick',
    category: 'kick',
    description: 'Extremely distorted kick with long, pitched tail. Hardcore and gabber.',
    matchReason: 'Massive distortion on the sine creates the signature gabber kick with tonal decay.',
    tags: ['gabber', 'hardcore', 'distorted'],
    postProcess: 'kick',
    featureProfile: {
      brightness: { min: 0.1, max: 0.4, weight: 0.7 },
      waveformTypes: ['sine', 'complex'],
      attack: { min: 0, max: 5, weight: 0.9 },
      spectralCentroid: { min: 80, max: 500, weight: 0.7 },
      sustain: { min: 0.01, max: 0.1, weight: 0.8 },
      filterCutoff: { min: 60, max: 500, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 1.0, osc_1_wave_frame: 0,
      osc_1_transpose: -24,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 80, filter_1_resonance: 0.15,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.35, env_1_sustain: 0.0, env_1_release: 0.15,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -2.0,
      distortion_on: 1.0, distortion_drive: 40.0, distortion_mix: 0.6,
      compressor_on: 1.0,
    },
  },
  {
    id: 'layered_kick',
    name: 'Layered Kick',
    category: 'kick',
    description: 'Two-layer kick: click transient on top, sub body below. Punchy and full.',
    matchReason: 'OSC 2 provides the click transient while OSC 1 handles the sub body.',
    tags: ['layered', 'punchy', 'full'],
    postProcess: 'kick',
    featureProfile: {
      brightness: { min: 0.05, max: 0.2, weight: 0.8 },
      waveformTypes: ['sine', 'complex'],
      attack: { min: 0, max: 5, weight: 0.9 },
      spectralCentroid: { min: 50, max: 250, weight: 0.8 },
      sustain: { min: 0.01, max: 0.08, weight: 0.9 },
      filterCutoff: { min: 40, max: 300, weight: 0.8 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.9, osc_1_wave_frame: 0,
      osc_1_transpose: -24,
      osc_2_on: 1.0, osc_2_level: 0.35, osc_2_wave_frame: 32,
      osc_2_transpose: 0,
      filter_1_on: 1.0, filter_1_cutoff: 68, filter_1_resonance: 0.08,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.25, env_1_sustain: 0.0, env_1_release: 0.1,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -2.5,
      distortion_on: 1.0, distortion_drive: 8.0, distortion_mix: 0.15,
      compressor_on: 1.0,
    },
  },

  // =========================================================================
  // Drums — new presets
  // =========================================================================
  {
    id: 'tight_snare',
    name: 'Tight Snare',
    category: 'drums',
    description: 'Short, punchy snare with crisp transient and fast decay.',
    matchReason: 'Noise burst with tight envelope and bandpass filtering creates a sharp snare crack.',
    tags: ['snare', 'tight', 'punchy'],
    featureProfile: {
      brightness: { min: 0.3, max: 0.7, weight: 0.7 },
      waveformTypes: ['complex'],
      attack: { min: 0, max: 3, weight: 0.9 },
      spectralCentroid: { min: 1000, max: 5000, weight: 0.7 },
      sustain: { min: 0.0, max: 0.05, weight: 0.9 },
      filterCutoff: { min: 500, max: 4000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.5, osc_1_wave_frame: 32,
      osc_1_transpose: 0,
      osc_2_on: 0.0,
      sample_on: 1.0, sample_level: 0.7,
      filter_1_on: 1.0, filter_1_cutoff: 90, filter_1_resonance: 0.15,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.08, env_1_sustain: 0.0, env_1_release: 0.04,
      env_1_attack_power: 0.0, env_1_decay_power: -3.0, env_1_release_power: -3.0,
    },
  },
  {
    id: 'reverb_snare',
    name: 'Reverb Snare',
    category: 'drums',
    description: 'Snare with long reverb tail. 80s gated or ambient character.',
    matchReason: 'Large reverb on a short snare transient creates dramatic spatial impact.',
    tags: ['snare', 'reverb', '80s'],
    featureProfile: {
      brightness: { min: 0.25, max: 0.6, weight: 0.7 },
      waveformTypes: ['complex'],
      attack: { min: 0, max: 5, weight: 0.9 },
      spectralCentroid: { min: 800, max: 4000, weight: 0.7 },
      sustain: { min: 0.02, max: 0.15, weight: 0.8 },
      filterCutoff: { min: 500, max: 4000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.5, osc_1_wave_frame: 32,
      osc_2_on: 0.0,
      sample_on: 1.0, sample_level: 0.65,
      filter_1_on: 1.0, filter_1_cutoff: 92, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.12, env_1_sustain: 0.01, env_1_release: 0.08,
      env_1_attack_power: 0.0, env_1_decay_power: -2.5, env_1_release_power: -2.5,
      reverb_on: 1.0, reverb_dry_wet: 0.5, reverb_size: 0.8,
    },
  },
  {
    id: 'closed_hihat',
    name: 'Closed Hi-Hat',
    category: 'drums',
    description: 'Tight, metallic closed hi-hat tick. Essential rhythm element.',
    matchReason: 'High-frequency noise with very short envelope creates a sharp, metallic tick.',
    tags: ['hi-hat', 'closed', 'metallic'],
    featureProfile: {
      brightness: { min: 0.5, max: 0.9, weight: 0.8 },
      waveformTypes: ['complex'],
      attack: { min: 0, max: 2, weight: 0.9 },
      spectralCentroid: { min: 5000, max: 12000, weight: 0.8 },
      sustain: { min: 0.0, max: 0.02, weight: 0.9 },
      filterCutoff: { min: 4000, max: 12000, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 0.0,
      osc_2_on: 0.0,
      sample_on: 1.0, sample_level: 0.8,
      filter_1_on: 1.0, filter_1_cutoff: 115, filter_1_resonance: 0.2,
      filter_1_model: 0, filter_1_style: 1.0,
      env_1_attack: 0.001, env_1_decay: 0.03, env_1_sustain: 0.0, env_1_release: 0.02,
      env_1_attack_power: 0.0, env_1_decay_power: -3.5, env_1_release_power: -3.5,
    },
  },
  {
    id: 'open_hihat',
    name: 'Open Hi-Hat',
    category: 'drums',
    description: 'Sizzling open hi-hat with longer decay. Adds energy and movement.',
    matchReason: 'High-frequency noise with extended decay creates a sizzling, open wash.',
    tags: ['hi-hat', 'open', 'sizzle'],
    featureProfile: {
      brightness: { min: 0.5, max: 0.9, weight: 0.8 },
      waveformTypes: ['complex'],
      attack: { min: 0, max: 3, weight: 0.9 },
      spectralCentroid: { min: 5000, max: 12000, weight: 0.8 },
      sustain: { min: 0.02, max: 0.15, weight: 0.8 },
      filterCutoff: { min: 4000, max: 12000, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 0.0,
      osc_2_on: 0.0,
      sample_on: 1.0, sample_level: 0.75,
      filter_1_on: 1.0, filter_1_cutoff: 115, filter_1_resonance: 0.15,
      filter_1_model: 0, filter_1_style: 1.0,
      env_1_attack: 0.001, env_1_decay: 0.2, env_1_sustain: 0.02, env_1_release: 0.15,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -2.0,
    },
  },
  {
    id: 'clap',
    name: 'Clap',
    category: 'drums',
    description: 'Layered hand clap with short pre-delay flams. Snappy and human.',
    matchReason: 'Noise burst with bandpass filter and moderate reverb mimics layered hand claps.',
    tags: ['clap', 'snappy', 'hands'],
    featureProfile: {
      brightness: { min: 0.3, max: 0.65, weight: 0.7 },
      waveformTypes: ['complex'],
      attack: { min: 0, max: 5, weight: 0.9 },
      spectralCentroid: { min: 1000, max: 5000, weight: 0.7 },
      sustain: { min: 0.01, max: 0.08, weight: 0.9 },
      filterCutoff: { min: 800, max: 4000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 0.0,
      osc_2_on: 0.0,
      sample_on: 1.0, sample_level: 0.8,
      filter_1_on: 1.0, filter_1_cutoff: 95, filter_1_resonance: 0.2,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.1, env_1_sustain: 0.01, env_1_release: 0.06,
      env_1_attack_power: 0.0, env_1_decay_power: -2.5, env_1_release_power: -2.5,
      reverb_on: 1.0, reverb_dry_wet: 0.2, reverb_size: 0.25,
    },
  },
  {
    id: 'rimshot',
    name: 'Rim Shot',
    category: 'drums',
    description: 'Sharp rimshot click with bright transient. Clean and precise.',
    matchReason: 'High-pitched sine click with noise layer creates a sharp, cutting rim sound.',
    tags: ['rim', 'click', 'sharp'],
    featureProfile: {
      brightness: { min: 0.35, max: 0.7, weight: 0.8 },
      waveformTypes: ['sine', 'complex'],
      attack: { min: 0, max: 2, weight: 0.9 },
      spectralCentroid: { min: 2000, max: 6000, weight: 0.8 },
      sustain: { min: 0.0, max: 0.03, weight: 0.9 },
      filterCutoff: { min: 1500, max: 6000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.6, osc_1_wave_frame: 0,
      osc_1_transpose: 12,
      osc_2_on: 0.0,
      sample_on: 1.0, sample_level: 0.5,
      filter_1_on: 1.0, filter_1_cutoff: 105, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.04, env_1_sustain: 0.0, env_1_release: 0.02,
      env_1_attack_power: 0.0, env_1_decay_power: -3.5, env_1_release_power: -3.5,
    },
  },

  // =========================================================================
  // Keys — new presets
  // =========================================================================
  {
    id: 'clavinet',
    name: 'Clavinet',
    category: 'keys',
    description: 'Funky clavinet with bright, percussive attack and nasal tone.',
    matchReason: 'Square wave with resonant filter and fast decay creates the funky clavinet bark.',
    tags: ['clavinet', 'funky', 'percussive'],
    featureProfile: {
      brightness: { min: 0.25, max: 0.55, weight: 0.8 },
      waveformTypes: ['square', 'pulse'],
      attack: { min: 0, max: 5, weight: 0.9 },
      spectralCentroid: { min: 800, max: 3000, weight: 0.7 },
      sustain: { min: 0.1, max: 0.4, weight: 0.7 },
      filterCutoff: { min: 500, max: 2500, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 96,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 85, filter_1_resonance: 0.35,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.2, env_1_sustain: 0.25, env_1_release: 0.08,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -2.5,
      env_2_attack: 0.001, env_2_decay: 0.06, env_2_sustain: 0.0, env_2_release: 0.04,
    },
  },
  {
    id: 'toy_piano',
    name: 'Toy Piano',
    category: 'keys',
    description: 'Bright, thin toy piano with metallic, childlike character.',
    matchReason: 'High-register sine with slight detuning gives the charming, imperfect toy quality.',
    tags: ['toy', 'childlike', 'bright'],
    featureProfile: {
      brightness: { min: 0.25, max: 0.55, weight: 0.8 },
      waveformTypes: ['sine', 'triangle'],
      attack: { min: 0, max: 5, weight: 0.9 },
      spectralCentroid: { min: 1500, max: 5000, weight: 0.8 },
      sustain: { min: 0.05, max: 0.2, weight: 0.8 },
      filterCutoff: { min: 1000, max: 5000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 0,
      osc_1_unison_voices: 2.0, osc_1_unison_detune: 1.5,
      osc_2_on: 1.0, osc_2_level: 0.3, osc_2_wave_frame: 0,
      osc_2_transpose: 12,
      filter_1_on: 1.0, filter_1_cutoff: 100, filter_1_resonance: 0.08,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.35, env_1_sustain: 0.08, env_1_release: 0.25,
      env_1_attack_power: 0.0, env_1_decay_power: -2.0, env_1_release_power: -2.0,
    },
  },
  {
    id: 'harpsichord',
    name: 'Harpsichord',
    category: 'keys',
    description: 'Bright, plucky harpsichord with sharp attack and quick release.',
    matchReason: 'Saw with fast filter envelope snap mimics the mechanical pluck of a harpsichord.',
    tags: ['harpsichord', 'baroque', 'plucky'],
    featureProfile: {
      brightness: { min: 0.3, max: 0.65, weight: 0.8 },
      waveformTypes: ['saw'],
      attack: { min: 0, max: 3, weight: 0.9 },
      spectralCentroid: { min: 1000, max: 4000, weight: 0.8 },
      sustain: { min: 0.05, max: 0.2, weight: 0.8 },
      filterCutoff: { min: 600, max: 3000, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 64,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.25, osc_2_wave_frame: 64,
      osc_2_transpose: 12,
      filter_1_on: 1.0, filter_1_cutoff: 95, filter_1_resonance: 0.12,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.25, env_1_sustain: 0.1, env_1_release: 0.12,
      env_1_attack_power: 0.0, env_1_decay_power: -2.5, env_1_release_power: -2.5,
      env_2_attack: 0.001, env_2_decay: 0.04, env_2_sustain: 0.0, env_2_release: 0.03,
    },
  },
  {
    id: 'celesta',
    name: 'Celesta',
    category: 'keys',
    description: 'Sparkling celesta with bell-like clarity. Delicate and magical.',
    matchReason: 'Pure sine with octave harmonic and moderate decay creates the celesta sparkle.',
    tags: ['celesta', 'sparkling', 'magical'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.5, weight: 0.8 },
      waveformTypes: ['sine'],
      attack: { min: 0, max: 5, weight: 0.9 },
      spectralCentroid: { min: 2000, max: 6000, weight: 0.8 },
      sustain: { min: 0.05, max: 0.2, weight: 0.8 },
      filterCutoff: { min: 1500, max: 6000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.65, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.35, osc_2_wave_frame: 0,
      osc_2_transpose: 12,
      filter_1_on: 1.0, filter_1_cutoff: 105, filter_1_resonance: 0.05,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.5, env_1_sustain: 0.05, env_1_release: 0.4,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -1.5,
      reverb_on: 1.0, reverb_dry_wet: 0.25, reverb_size: 0.45,
    },
  },

  // =========================================================================
  // Guitar — new presets
  // =========================================================================
  {
    id: 'palm_muted_guitar',
    name: 'Palm Muted Guitar',
    category: 'guitar',
    description: 'Tight, muted guitar chug with damped strings. Metal and rock rhythm.',
    matchReason: 'Low-passed saw with very fast decay mimics the tight thud of palm-muted strings.',
    tags: ['palm mute', 'metal', 'chug'],
    featureProfile: {
      brightness: { min: 0.08, max: 0.25, weight: 0.8 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 0, max: 5, weight: 0.9 },
      spectralCentroid: { min: 200, max: 800, weight: 0.8 },
      sustain: { min: 0.01, max: 0.1, weight: 0.9 },
      filterCutoff: { min: 150, max: 600, weight: 0.8 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.85, osc_1_wave_frame: 64,
      osc_1_unison_voices: 2.0, osc_1_unison_detune: 1.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 62, filter_1_resonance: 0.15,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.06, env_1_sustain: 0.02, env_1_release: 0.04,
      env_1_attack_power: 0.0, env_1_decay_power: -3.0, env_1_release_power: -3.0,
      distortion_on: 1.0, distortion_drive: 15.0, distortion_mix: 0.3,
    },
  },
  {
    id: 'funk_guitar',
    name: 'Funk Guitar',
    category: 'guitar',
    description: 'Bright, snappy funk guitar with wah-like filter. Rhythmic and groovy.',
    matchReason: 'Saw with resonant filter and quick envelope gives the funky chick/wah character.',
    tags: ['funk', 'wah', 'rhythmic'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.55, weight: 0.7 },
      waveformTypes: ['saw', 'triangle'],
      attack: { min: 0, max: 8, weight: 0.8 },
      spectralCentroid: { min: 500, max: 2500, weight: 0.7 },
      sustain: { min: 0.1, max: 0.35, weight: 0.8 },
      filterCutoff: { min: 300, max: 2000, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.75, osc_1_wave_frame: 64,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 72, filter_1_resonance: 0.4,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.001, env_1_decay: 0.15, env_1_sustain: 0.2, env_1_release: 0.06,
      env_1_attack_power: 0.0, env_1_decay_power: -2.5, env_1_release_power: -2.5,
      env_2_attack: 0.001, env_2_decay: 0.1, env_2_sustain: 0.0, env_2_release: 0.06,
    },
  },
  {
    id: 'power_chord',
    name: 'Power Chord',
    category: 'guitar',
    description: 'Distorted power chord with thick fifth interval. Rock and punk staple.',
    matchReason: 'Saw with fifth-interval OSC 2 and heavy distortion creates a wall-of-guitars feel.',
    tags: ['power chord', 'rock', 'distorted'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.5, weight: 0.7 },
      waveformTypes: ['saw', 'complex'],
      attack: { min: 0, max: 10, weight: 0.7 },
      spectralCentroid: { min: 400, max: 2000, weight: 0.7 },
      sustain: { min: 0.4, max: 0.8, weight: 0.7 },
      filterCutoff: { min: 300, max: 1500, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.85, osc_1_wave_frame: 64,
      osc_1_unison_voices: 3.0, osc_1_unison_detune: 2.0,
      osc_2_on: 1.0, osc_2_level: 0.7, osc_2_wave_frame: 64,
      osc_2_transpose: 7,
      filter_1_on: 1.0, filter_1_cutoff: 78, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.002, env_1_decay: 0.3, env_1_sustain: 0.65, env_1_release: 0.15,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
      distortion_on: 1.0, distortion_drive: 20.0, distortion_mix: 0.4,
    },
  },
  {
    id: 'nylon_guitar',
    name: 'Nylon Guitar',
    category: 'guitar',
    description: 'Soft, warm nylon string guitar with round tone. Classical and bossa nova.',
    matchReason: 'Triangle-based tone with gentle filter and moderate decay evokes nylon string warmth.',
    tags: ['nylon', 'classical', 'soft'],
    featureProfile: {
      brightness: { min: 0.05, max: 0.25, weight: 0.8 },
      waveformTypes: ['triangle', 'sine'],
      attack: { min: 0, max: 10, weight: 0.8 },
      spectralCentroid: { min: 200, max: 1000, weight: 0.7 },
      sustain: { min: 0.1, max: 0.35, weight: 0.8 },
      filterCutoff: { min: 150, max: 800, weight: 0.8 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.75, osc_1_wave_frame: 32,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.2, osc_2_wave_frame: 0,
      osc_2_transpose: 12,
      filter_1_on: 1.0, filter_1_cutoff: 70, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.003, env_1_decay: 0.35, env_1_sustain: 0.15, env_1_release: 0.25,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -1.5,
      reverb_on: 1.0, reverb_dry_wet: 0.15, reverb_size: 0.3,
    },
  },

  // =========================================================================
  // Brass — new presets
  // =========================================================================
  {
    id: 'muted_trumpet',
    name: 'Muted Trumpet',
    category: 'brass',
    description: 'Soft, muted trumpet with contained tone. Jazz and lounge feel.',
    matchReason: 'Saw with tight bandpass filter emulates the restricted harmonic range of a muted horn.',
    tags: ['muted', 'jazz', 'soft'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.3, weight: 0.8 },
      waveformTypes: ['saw'],
      attack: { min: 5, max: 30, weight: 0.8 },
      spectralCentroid: { min: 400, max: 1500, weight: 0.8 },
      sustain: { min: 0.5, max: 0.85, weight: 0.7 },
      filterCutoff: { min: 300, max: 1200, weight: 0.8 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 64,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 68, filter_1_resonance: 0.25,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.02, env_1_decay: 0.2, env_1_sustain: 0.7, env_1_release: 0.15,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
      reverb_on: 1.0, reverb_dry_wet: 0.15, reverb_size: 0.3,
    },
  },
  {
    id: 'big_band_brass',
    name: 'Big Band Brass',
    category: 'brass',
    description: 'Bold, bright brass section with full harmonic content. Big band and pop.',
    matchReason: 'Layered saws with open filter and moderate attack create a powerful brass ensemble.',
    tags: ['big band', 'bold', 'section'],
    featureProfile: {
      brightness: { min: 0.3, max: 0.65, weight: 0.8 },
      waveformTypes: ['saw', 'square'],
      attack: { min: 10, max: 50, weight: 0.7 },
      spectralCentroid: { min: 800, max: 3000, weight: 0.7 },
      sustain: { min: 0.5, max: 0.9, weight: 0.7 },
      filterCutoff: { min: 500, max: 3000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 64,
      osc_1_unison_voices: 3.0, osc_1_unison_detune: 2.5,
      osc_2_on: 1.0, osc_2_level: 0.4, osc_2_wave_frame: 96,
      osc_2_transpose: 0,
      filter_1_on: 1.0, filter_1_cutoff: 92, filter_1_resonance: 0.08,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.02, env_1_decay: 0.3, env_1_sustain: 0.75, env_1_release: 0.2,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
    },
  },
  {
    id: 'synth_brass',
    name: 'Synth Brass',
    category: 'brass',
    description: 'Classic 80s synth brass with filter sweep and unison detune.',
    matchReason: 'Detuned saws with slow filter attack recreate the iconic analog synth brass.',
    tags: ['synth brass', '80s', 'analog'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.55, weight: 0.7 },
      waveformTypes: ['saw'],
      attack: { min: 15, max: 60, weight: 0.8 },
      spectralCentroid: { min: 500, max: 2500, weight: 0.7 },
      sustain: { min: 0.5, max: 0.85, weight: 0.7 },
      filterCutoff: { min: 300, max: 2000, weight: 0.7 },
      hasChorus: true,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 64,
      osc_1_unison_voices: 4.0, osc_1_unison_detune: 3.5,
      osc_2_on: 1.0, osc_2_level: 0.35, osc_2_wave_frame: 64,
      osc_2_transpose: -12,
      filter_1_on: 1.0, filter_1_cutoff: 65, filter_1_resonance: 0.15,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.03, env_1_decay: 0.35, env_1_sustain: 0.7, env_1_release: 0.2,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
      env_2_attack: 0.05, env_2_decay: 0.3, env_2_sustain: 0.4, env_2_release: 0.2,
      chorus_on: 1.0, chorus_dry_wet: 0.2, chorus_frequency: 2.0,
    },
  },
  {
    id: 'horn_stab',
    name: 'Horn Stab',
    category: 'brass',
    description: 'Short, punchy brass stab for accents. Funk and dance arrangements.',
    matchReason: 'Quick filter snap on detuned saws creates a tight, punchy brass hit.',
    tags: ['stab', 'horn', 'punchy'],
    featureProfile: {
      brightness: { min: 0.25, max: 0.55, weight: 0.7 },
      waveformTypes: ['saw', 'square'],
      attack: { min: 0, max: 8, weight: 0.9 },
      spectralCentroid: { min: 600, max: 2500, weight: 0.7 },
      sustain: { min: 0.02, max: 0.15, weight: 0.9 },
      filterCutoff: { min: 400, max: 2000, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.85, osc_1_wave_frame: 64,
      osc_1_unison_voices: 3.0, osc_1_unison_detune: 2.0,
      osc_2_on: 1.0, osc_2_level: 0.4, osc_2_wave_frame: 96,
      osc_2_transpose: 0,
      filter_1_on: 1.0, filter_1_cutoff: 78, filter_1_resonance: 0.15,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.002, env_1_decay: 0.1, env_1_sustain: 0.03, env_1_release: 0.06,
      env_1_attack_power: 0.0, env_1_decay_power: -2.5, env_1_release_power: -2.5,
      env_2_attack: 0.001, env_2_decay: 0.05, env_2_sustain: 0.0, env_2_release: 0.03,
    },
  },

  // =========================================================================
  // Woodwind — new presets
  // =========================================================================
  {
    id: 'pan_flute',
    name: 'Pan Flute',
    category: 'woodwind',
    description: 'Breathy pan flute with airy attack and warm sustained tone.',
    matchReason: 'Sine with noise layer on attack creates the characteristic breathy flute onset.',
    tags: ['pan flute', 'breathy', 'ethnic'],
    featureProfile: {
      brightness: { min: 0.08, max: 0.25, weight: 0.8 },
      waveformTypes: ['sine', 'triangle'],
      attack: { min: 10, max: 50, weight: 0.8 },
      spectralCentroid: { min: 400, max: 1500, weight: 0.7 },
      sustain: { min: 0.6, max: 0.9, weight: 0.7 },
      filterCutoff: { min: 300, max: 1500, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      sample_on: 1.0, sample_level: 0.15,
      filter_1_on: 1.0, filter_1_cutoff: 78, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.04, env_1_decay: 0.25, env_1_sustain: 0.75, env_1_release: 0.2,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
      reverb_on: 1.0, reverb_dry_wet: 0.2, reverb_size: 0.4,
    },
  },
  {
    id: 'oboe',
    name: 'Oboe',
    category: 'woodwind',
    description: 'Nasal, reedy oboe with focused midrange tone. Orchestral and expressive.',
    matchReason: 'Saw with narrow bandpass filter creates the focused, nasal reed quality.',
    tags: ['oboe', 'reedy', 'orchestral'],
    featureProfile: {
      brightness: { min: 0.15, max: 0.4, weight: 0.8 },
      waveformTypes: ['saw'],
      attack: { min: 8, max: 40, weight: 0.8 },
      spectralCentroid: { min: 600, max: 2000, weight: 0.8 },
      sustain: { min: 0.6, max: 0.9, weight: 0.7 },
      filterCutoff: { min: 400, max: 1800, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.75, osc_1_wave_frame: 64,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: 78, filter_1_resonance: 0.3,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.025, env_1_decay: 0.2, env_1_sustain: 0.8, env_1_release: 0.15,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
      reverb_on: 1.0, reverb_dry_wet: 0.12, reverb_size: 0.25,
    },
  },
  {
    id: 'recorder',
    name: 'Recorder',
    category: 'woodwind',
    description: 'Simple, pure recorder tone. Light and folk-like.',
    matchReason: 'Nearly pure sine with gentle triangle overtone mimics the simple recorder timbre.',
    tags: ['recorder', 'folk', 'simple'],
    featureProfile: {
      brightness: { min: 0.05, max: 0.2, weight: 0.8 },
      waveformTypes: ['sine', 'triangle'],
      attack: { min: 5, max: 30, weight: 0.8 },
      spectralCentroid: { min: 500, max: 1800, weight: 0.7 },
      sustain: { min: 0.6, max: 0.9, weight: 0.7 },
      filterCutoff: { min: 400, max: 1500, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.15, osc_2_wave_frame: 32,
      osc_2_transpose: 0,
      filter_1_on: 1.0, filter_1_cutoff: 82, filter_1_resonance: 0.08,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.02, env_1_decay: 0.15, env_1_sustain: 0.8, env_1_release: 0.12,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
    },
  },
  {
    id: 'piccolo',
    name: 'Piccolo',
    category: 'woodwind',
    description: 'Bright, piercing piccolo in the upper register. High and cutting.',
    matchReason: 'High-register sine with slight breath noise cuts through any arrangement.',
    tags: ['piccolo', 'bright', 'high'],
    featureProfile: {
      brightness: { min: 0.2, max: 0.5, weight: 0.8 },
      waveformTypes: ['sine'],
      attack: { min: 5, max: 25, weight: 0.8 },
      spectralCentroid: { min: 2000, max: 6000, weight: 0.8 },
      sustain: { min: 0.6, max: 0.9, weight: 0.7 },
      filterCutoff: { min: 1500, max: 5000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.65, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 0.0,
      sample_on: 1.0, sample_level: 0.1,
      filter_1_on: 1.0, filter_1_cutoff: 100, filter_1_resonance: 0.12,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.02, env_1_decay: 0.15, env_1_sustain: 0.8, env_1_release: 0.1,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
      reverb_on: 1.0, reverb_dry_wet: 0.1, reverb_size: 0.2,
    },
  },

  // --- Additional Drums ---
  {
    id: 'tom_hit',
    name: 'Tom Hit',
    category: 'drums',
    description: 'Mid-range tom hit with pitched body and controlled decay.',
    matchReason: 'Sine-based pitch with moderate decay creates a resonant tom body.',
    tags: ['tom', 'percussion', 'pitched'],
    featureProfile: {
      brightness: { min: 0.1, max: 0.35, weight: 0.8 },
      waveformTypes: ['sine', 'triangle'],
      attack: { min: 0, max: 8, weight: 1.0 },
      spectralCentroid: { min: 300, max: 1500, weight: 0.7 },
      sustain: { min: 0.0, max: 0.2, weight: 0.9 },
      filterCutoff: { min: 300, max: 2000, weight: 0.6 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.8, osc_1_wave_frame: 0,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.3, osc_2_wave_frame: 32,
      osc_2_transpose: 7,
      sample_on: 1.0, sample_level: 0.15,
      filter_1_on: 1.0, filter_1_cutoff: 75, filter_1_resonance: 0.1,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.0, env_1_decay: 0.18, env_1_sustain: 0.0, env_1_release: 0.08,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -2.0,
      reverb_on: 1.0, reverb_dry_wet: 0.15, reverb_size: 0.3,
    },
  },

  // --- Additional Keys ---
  {
    id: 'wurlitzer',
    name: 'Wurlitzer',
    category: 'keys',
    description: 'Warm, slightly overdriven Wurlitzer electric piano with bark and bite.',
    matchReason: 'Triangle-saw blend with moderate drive and resonant filter creates that classic 70s electric piano tone.',
    tags: ['wurlitzer', 'electric piano', 'vintage'],
    featureProfile: {
      brightness: { min: 0.25, max: 0.55, weight: 0.8 },
      waveformTypes: ['pulse', 'square'],
      attack: { min: 1, max: 15, weight: 0.9 },
      spectralCentroid: { min: 1200, max: 3500, weight: 0.7 },
      sustain: { min: 0.3, max: 0.65, weight: 0.7 },
      filterCutoff: { min: 800, max: 3000, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.7, osc_1_wave_frame: 112,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.3, osc_2_wave_frame: 96,
      osc_2_transpose: 12,
      filter_1_on: 1.0, filter_1_cutoff: 78, filter_1_resonance: 0.35,
      filter_1_model: 3, filter_1_style: 1.0,
      env_1_attack: 0.005, env_1_decay: 0.2, env_1_sustain: 0.35, env_1_release: 0.08,
      env_1_attack_power: 0.0, env_1_decay_power: -1.5, env_1_release_power: -2.0,
    },
  },

  // --- Additional Guitar ---
  {
    id: 'jazz_guitar',
    name: 'Jazz Guitar',
    category: 'guitar',
    description: 'Warm, round jazz guitar with soft attack, dark tone and rich body.',
    matchReason: 'Triangle-sine blend with gentle envelope and low filter creates warm hollow-body jazz tone.',
    tags: ['jazz', 'clean', 'guitar'],
    featureProfile: {
      brightness: { min: 0.05, max: 0.2, weight: 0.9 },
      waveformTypes: ['triangle', 'sine'],
      attack: { min: 5, max: 30, weight: 0.8 },
      spectralCentroid: { min: 400, max: 1500, weight: 0.8 },
      sustain: { min: 0.2, max: 0.5, weight: 0.7 },
      filterCutoff: { min: 400, max: 1500, weight: 0.7 },
      hasChorus: false,
    },
    settings: {
      osc_1_on: 1.0, osc_1_level: 0.65, osc_1_wave_frame: 32,
      osc_1_unison_voices: 1.0,
      osc_2_on: 1.0, osc_2_level: 0.35, osc_2_wave_frame: 0,
      osc_2_transpose: 12,
      filter_1_on: 1.0, filter_1_cutoff: 68, filter_1_resonance: 0.12,
      filter_1_model: 0, filter_1_style: 0.0,
      env_1_attack: 0.01, env_1_decay: 0.35, env_1_sustain: 0.3, env_1_release: 0.2,
      env_1_attack_power: 0.0, env_1_decay_power: -1.0, env_1_release_power: -1.5,
      reverb_on: 1.0, reverb_dry_wet: 0.2, reverb_size: 0.35,
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
    const val = Number(features.brightness);
    totalScore += scoreRange(val, fp.brightness) * 20;
    totalWeight += 20;
  }

  // 2. Waveform type match (highest weight — most discriminating feature)
  if (fp.waveformTypes && features.waveform?.type) {
    const detected = features.waveform.type;
    const match = fp.waveformTypes.includes(detected);
    totalScore += match ? 25 : 0;
    totalWeight += 25;
  }

  // 3. Attack time (ms)
  if (fp.attack && features.adsr?.attack != null) {
    const val = Number(features.adsr.attack);
    totalScore += scoreRange(val, fp.attack) * 12;
    totalWeight += 12;
  }

  // 4. Spectral centroid (Hz)
  if (fp.spectralCentroid && features.spectralCentroid != null) {
    const val = Number(features.spectralCentroid);
    totalScore += scoreRange(val, fp.spectralCentroid) * 10;
    totalWeight += 10;
  }

  // 5. Sustain (0-1 from ADSR, convert from percentage)
  if (fp.sustain && features.adsr?.sustain != null) {
    const val = Number(features.adsr.sustain) / 100; // ADSR sustain is 0-100%
    totalScore += scoreRange(val, fp.sustain) * 8;
    totalWeight += 8;
  }

  // 6. Filter cutoff (Hz)
  if (fp.filterCutoff && features.filterEnvelope?.estimatedCutoff != null) {
    const val = Number(features.filterEnvelope.estimatedCutoff);
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

  // Quadratic falloff: steeper penalty for values far outside the range
  const rangeWidth = Math.max(range.max - range.min, 1);
  if (value < range.min) {
    const dist = range.min - value;
    const ratio = dist / rangeWidth;
    return Math.max(0, 1 - ratio * ratio); // Quadratic: drops faster than linear
  } else {
    const dist = value - range.max;
    const ratio = dist / rangeWidth;
    return Math.max(0, 1 - ratio * ratio);
  }
}

// =============================================================================
// Spectral Fingerprint-Based Preset Matching
// =============================================================================

/**
 * Score a single preset against source audio using spectral fingerprinting.
 * Pre-renders the preset as audio, then compares its spectrum directly against
 * the source audio's spectrum using cosine similarity.
 *
 * @param {Object} preset - A curated preset object from CURATED_PRESETS
 * @param {Float32Array} sourceChannelData - Source audio mono channel data
 * @param {number} sampleRate - Source audio sample rate
 * @param {Object} [features] - Analysis features (used for heuristic fallback)
 * @returns {Promise<number>} Score 0-100
 */
export async function scorePresetMatchSpectral(preset, sourceChannelData, sampleRate, features) {
  try {
    const { renderPresetToChannelData, quickSpectralScore } = await import('../utils/demoSoundGenerator.js');
    const presetChannelData = await renderPresetToChannelData(preset.id, preset.settings, 2, {});
    return quickSpectralScore(presetChannelData, sourceChannelData, sampleRate);
  } catch (err) {
    console.warn(`Spectral scoring failed for preset ${preset.id}, falling back to heuristic:`, err.message);
    return scorePresetMatch(preset, features);
  }
}

/**
 * Score an array of presets against source audio using spectral fingerprinting.
 * Renders each preset sequentially to avoid overwhelming the audio thread.
 * Falls back to heuristic scoring when source audio is unavailable.
 *
 * @param {Array} presets - Array of curated preset objects
 * @param {Float32Array|null} sourceChannelData - Source audio mono channel data (null = use heuristic)
 * @param {number} sampleRate - Source audio sample rate
 * @param {Object} [features] - Analysis features (used for heuristic fallback or when no source audio)
 * @param {Object} [options] - Options
 * @param {Function} [options.onProgress] - Progress callback (0-1)
 * @param {Object} [options.signal] - AbortSignal-like object with { aborted: boolean }
 * @returns {Promise<Array<{preset: Object, score: number}>>} Sorted by score descending
 */
export async function scorePresetsWithSpectral(presets, sourceChannelData, sampleRate, features, options = {}) {
  const { onProgress, signal } = options;

  // No source audio — fall back to heuristic scoring for all presets
  if (!sourceChannelData || !sampleRate) {
    return presets
      .map(preset => ({ preset, score: scorePresetMatch(preset, features) }))
      .sort((a, b) => b.score - a.score);
  }

  const results = [];
  for (let i = 0; i < presets.length; i++) {
    // Check for cancellation between each render
    if (signal?.aborted) return results;

    const score = await scorePresetMatchSpectral(presets[i], sourceChannelData, sampleRate, features);
    results.push({ preset: presets[i], score });

    if (onProgress) onProgress((i + 1) / presets.length);
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

// =============================================================================
// Analysis-Driven Tuning (automatically adjust preset based on detected features)
// =============================================================================

/**
 * Compute tuning slider overrides from analysis features.
 * Maps detected audio characteristics to Vital parameter values so each sound
 * gets a unique preset even when starting from the same curated base.
 *
 * @param {Object} preset - The selected curated preset
 * @param {Object} features - Analysis features from the worker
 * @returns {Object} Tuning overrides keyed by TUNING_PARAMS id
 */
export function computeAnalysisTuning(preset, features) {
  if (!preset || !features) return {};
  const overrides = {};
  const settings = preset.settings || {};

  // Helper: convert Hz to Vital's semitone scale (8-136)
  // 8.176 Hz ≈ MIDI note 0
  const hzToSemitones = (hz) => Math.max(8, Math.min(136, 12 * Math.log2(Math.max(hz, 20) / 8.176)));

  // --- Filter Cutoff ---
  // Use filter envelope analysis (tracks spectral centroid trajectory) as the primary
  // cutoff estimate. Falls back to raw spectral centroid (2-3x above perceived cutoff)
  // or brightness. Prefer minCutoff for opening sweeps (filter base position),
  // estimatedCutoff (average position) otherwise.
  const presetCutoff = settings.filter_1_cutoff ?? 80;
  {
    let analysisCutoff = null;
    if (features.filterEnvelope) {
      const fe = features.filterEnvelope;
      if (fe.sweepDirection === 'opening' || fe.sweepDirection === 'bandpass') {
        // For opening/bandpass sweeps, use minCutoff as the filter base position
        // (ENV 2 modulation will sweep up from here)
        const cutoffHz = fe.minCutoff ?? fe.estimatedCutoff;
        if (cutoffHz != null) analysisCutoff = hzToSemitones(cutoffHz);
      } else if (fe.sweepDirection === 'closing') {
        // For closing sweeps, use peakCutoff as starting position
        const cutoffHz = fe.peakCutoff ?? fe.estimatedCutoff;
        if (cutoffHz != null) analysisCutoff = hzToSemitones(cutoffHz);
      } else if (fe.estimatedCutoff != null) {
        analysisCutoff = hzToSemitones(fe.estimatedCutoff);
      }
    }
    // Fallback: spectral centroid (systematically 2-3x above perceived cutoff)
    if (analysisCutoff == null && features.spectralCentroid != null) {
      const centroidHz = Number(features.spectralCentroid);
      analysisCutoff = hzToSemitones(centroidHz * 0.4); // Reduced from 0.5 — centroid overshoots more than expected
    }
    // Last resort: brightness
    if (analysisCutoff == null && features.brightness != null) {
      const brightness = Number(features.brightness);
      analysisCutoff = 25 + brightness * 95;
    }

    if (analysisCutoff != null) {
      // Blend: 60% analysis, 40% curated preset — analysis should lead since we're matching source
      const blended = analysisCutoff * 0.6 + presetCutoff * 0.4;
      // Cap: allow up to 40 semitones above preset (was 20 — too restrictive for bright/distorted sounds)
      const capped = Math.min(blended, presetCutoff + 40);
      overrides.filter_cutoff = Math.round(Math.max(20, capped));
    }
  }

  // --- Filter Resonance ---
  // Blend analysis resonance with curated preset value.
  // Analysis resonanceIndicator often reads high for bass (lots of harmonic energy near cutoff).
  if (features.filterEnvelope?.resonanceIndicator != null) {
    const res = Number(features.filterEnvelope.resonanceIndicator);
    const presetRes = settings.filter_1_resonance ?? 0.3;
    // Blend 40% analysis, 60% curated — resonance is very character-dependent
    const blended = res * 0.4 + presetRes * 0.6;
    overrides.filter_resonance = Math.round(Math.max(0, Math.min(0.85, blended)) * 100) / 100;
  }

  // --- ADSR Envelope ---
  // Vital uses quartic scaling: displayed_time = raw_value^4 * max_time.
  // To set a specific time in seconds: raw = (seconds / max_time)^0.25
  // Max times (approximate): attack ≈ 4.27s, decay ≈ 4.27s, release ≈ 11.88s
  // Sustain is linear 0-1 (no power curve).
  const VITAL_MAX_ATTACK = 4.27;
  const VITAL_MAX_DECAY = 4.27;
  const VITAL_MAX_RELEASE = 11.88;
  const secondsToVitalEnv = (seconds, maxTime) =>
    Math.pow(Math.min(Math.max(seconds, 0), maxTime) / maxTime, 0.25);

  if (features.adsr) {
    const analysisAttack = Number(features.adsr.attack ?? 50) / 1000;   // ms → seconds
    const analysisDecay = Number(features.adsr.decay ?? 300) / 1000;
    const analysisSustain = Number(features.adsr.sustain ?? 0.5);       // already 0-1
    const analysisRelease = Number(features.adsr.release ?? 300) / 1000;

    // Convert to Vital's quartic-scaled 0-1 range
    const vitalAttack = secondsToVitalEnv(analysisAttack, VITAL_MAX_ATTACK);
    const vitalDecay = secondsToVitalEnv(analysisDecay, VITAL_MAX_DECAY);
    const vitalRelease = secondsToVitalEnv(analysisRelease, VITAL_MAX_RELEASE);

    // Blend 70% analysis / 30% curated preset — heavier analysis weight for closer matching
    const presetAttack = settings.env_1_attack ?? 0.1;
    const presetDecay = settings.env_1_decay ?? 0.4;
    const presetSustain = settings.env_1_sustain ?? 0.6;
    const presetRelease = settings.env_1_release ?? 0.3;

    const blendedAttack = vitalAttack * 0.7 + presetAttack * 0.3;
    const blendedDecay = vitalDecay * 0.7 + presetDecay * 0.3;
    const blendedSustain = analysisSustain * 0.7 + presetSustain * 0.3;
    const blendedRelease = vitalRelease * 0.7 + presetRelease * 0.3;

    // Safety floors — sustain floor lowered to 0.05 so staccato bass (0% sustain) works
    overrides.attack = Math.round(Math.max(0.01, blendedAttack) * 10000) / 10000;
    overrides.decay = Math.round(Math.max(0.05, blendedDecay) * 10000) / 10000;
    overrides.sustain = Math.round(Math.max(0.05, blendedSustain) * 100) / 100;
    overrides.release = Math.round(Math.max(0.02, blendedRelease) * 10000) / 10000;
  }

  // --- Chorus ---
  if (features.modulation) {
    const hasChorus = !!features.modulation.hasChorus;
    const chorusAmount = features.modulation.chorusAmount ?? 0;
    if (hasChorus && chorusAmount > 0) {
      overrides.chorus = Math.round(Math.min(1, chorusAmount * 1.5) * 100) / 100;
    } else {
      // If analysis detects NO chorus but preset has it, reduce it
      const presetChorus = settings.chorus_dry_wet ?? 0;
      if (presetChorus > 0.2) {
        overrides.chorus = 0.05;
      }
    }
  }

  // --- Reverb ---
  // Use release time + brightness to estimate spatial character
  if (features.adsr?.release != null) {
    const releaseMs = Number(features.adsr.release);
    const brightness = Number(features.brightness ?? 0.3);
    if (releaseMs > 300) {
      // Longer release + brighter sounds suggest more reverb/space
      const releaseContribution = Math.min(1, (releaseMs - 300) / 2000);
      const brightnessContribution = brightness * 0.3;
      const reverbAmount = Math.min(0.8, releaseContribution + brightnessContribution);
      overrides.reverb = Math.round(reverbAmount * 100) / 100;
    } else if (releaseMs < 100) {
      // Very short release — dry, punchy sound
      const presetReverb = settings.reverb_dry_wet ?? 0;
      if (presetReverb > 0.3) {
        overrides.reverb = 0.1;
      }
    }
  }

  // --- Analysis-Based Effects (raw overrides) ---
  // ONLY tune effects that the curated preset already enables.
  // Never add new effects the preset didn't configure — this preserves preset character.
  // (e.g., a bass preset without reverb should stay dry, a pad with reverb gets tuned reverb)
  {
    const rawFx = {};
    const brightness = Number(features.brightness ?? 0.3);
    const releaseMs = Number(features.adsr?.release ?? 300);
    const harmonicityVal = Number(features.harmonicity ?? 0.5);

    // Reverb: only tune if the curated preset already has reverb enabled
    const presetHasReverb = (settings.reverb_on === 1.0) || (settings.reverb_dry_wet > 0);
    if (presetHasReverb) {
      const presetSize = settings.reverb_size ?? 0.5;
      const presetDryWet = settings.reverb_dry_wet ?? 0.3;
      if (releaseMs > 500) {
        // Longer release → larger/wetter reverb, blended with preset
        const analysisSize = Math.min(0.85, 0.3 + (releaseMs - 500) / 3000);
        rawFx.reverb_size = analysisSize * 0.4 + presetSize * 0.6;
        const analysisDryWet = Math.min(0.6, 0.15 + (releaseMs - 500) / 4000);
        rawFx.reverb_dry_wet = analysisDryWet * 0.4 + presetDryWet * 0.6;
        rawFx.reverb_pre_high_cutoff = brightness > 0.5 ? 115.0 : 95.0;
      } else if (releaseMs < 100) {
        // Punchy sound — reduce preset's reverb but don't kill it
        rawFx.reverb_dry_wet = Math.min(presetDryWet, 0.1);
        rawFx.reverb_size = Math.min(presetSize, 0.2);
      }
    }

    // Delay: only tune if the curated preset already has delay enabled
    const presetHasDelay = (settings.delay_on === 1.0) || (settings.delay_dry_wet > 0);
    if (presetHasDelay) {
      const presetDelayWet = settings.delay_dry_wet ?? 0.2;
      // Adjust delay wetness based on brightness
      rawFx.delay_dry_wet = (presetDelayWet * 0.6) + (Math.min(0.25, brightness * 0.2) * 0.4);
    }

    // Distortion: only tune if the curated preset already has distortion enabled
    const presetHasDistortion = (settings.distortion_on === 1.0);
    if (presetHasDistortion) {
      const presetDrive = settings.distortion_drive ?? 5.0;
      const presetMix = settings.distortion_mix ?? 0.2;
      // Dark/inharmonic sounds get more drive, bright/clean sounds get less
      if (harmonicityVal < 0.3 || brightness < 0.15) {
        rawFx.distortion_drive = Math.min(presetDrive + 2, 12.0);
        rawFx.distortion_mix = Math.min(presetMix + 0.1, 0.5);
      } else if (brightness > 0.6) {
        rawFx.distortion_drive = Math.max(presetDrive - 2, 1.0);
        rawFx.distortion_mix = Math.max(presetMix - 0.05, 0.05);
      }
    }

    // EQ: only tune if the curated preset already has EQ enabled
    const presetHasEQ = (settings.eq_on === 1.0);
    if (presetHasEQ) {
      const centroidHz = Number(features.spectralCentroid ?? 1000);
      if (centroidHz < 300) {
        rawFx.eq_low_gain = 4.0;
        rawFx.eq_high_gain = -6.0;
      } else if (centroidHz > 3000) {
        rawFx.eq_low_gain = -3.0;
        rawFx.eq_high_gain = 4.0;
      } else {
        rawFx.eq_band_gain = 2.5;
        rawFx.eq_band_cutoff = Math.min(110, Math.max(40, hzToSemitones(centroidHz)));
      }
    }

    if (Object.keys(rawFx).length > 0) {
      overrides._rawOverrides = { ...(overrides._rawOverrides || {}), ...rawFx };
    }
  }

  // --- Unison Voices / Detune ---
  // Use modulation detection + harmonicity to infer width
  const chorusAmount = features.modulation?.chorusAmount ?? 0;
  const harmonicity = Number(features.harmonicity ?? 0.5);
  if (chorusAmount > 0.15 || harmonicity < 0.3) {
    // Wider/thicker sound — more unison voices
    const voices = chorusAmount > 0.5 ? 5 : chorusAmount > 0.3 ? 4 : 3;
    const detune = chorusAmount > 0.5 ? 4.0 : chorusAmount > 0.3 ? 3.0 : 2.0;
    const presetVoices = settings.osc_1_unison_voices ?? 1;
    if (voices > presetVoices) {
      overrides.unison_voices = voices;
      overrides.unison_detune = detune;
    }
  } else if (harmonicity > 0.7 && chorusAmount < 0.1) {
    // Very clean/pure — reduce unison if preset has it
    const presetVoices = settings.osc_1_unison_voices ?? 1;
    if (presetVoices > 2) {
      overrides.unison_voices = 1;
      overrides.unison_detune = 0;
    }
  }

  // --- Wave Frame (now user-adjustable via slider) ---
  // Map detected waveform to Vital's osc_1_wave_frame (0-127) using continuous
  // harmonic profile data (not snapped to 5 discrete types). computeWaveFrame()
  // uses harmonic density, odd/even balance, and rolloff rate for smooth mapping.
  const computedFrame = computeWaveFrame(features.waveform);
  if (computedFrame != null) {
    // Always apply the analysis-derived wave frame — the sweep will refine it further.
    // Previous threshold of >15 frame distance was too conservative and caused the
    // sweep to start from preset defaults instead of the analysis result.
    overrides.wave_frame = computedFrame;
  }

  // --- Stereo Spread ---
  // Wide sounds (chorus, detuned) get more spread; mono bass stays narrow
  {
    const presetSpread = settings.osc_1_stereo_spread ?? 0;
    const ca = features.modulation?.chorusAmount ?? 0;
    if (ca > 0.3 || (overrides.unison_voices && overrides.unison_voices >= 3)) {
      overrides.stereo_spread = Math.round(Math.max(presetSpread, Math.min(1, 0.3 + ca * 0.5)) * 100) / 100;
    } else if (preset.category === 'bass' || preset.category === 'kick') {
      // Bass and kick should be mono or near-mono
      overrides.stereo_spread = Math.min(presetSpread, 0.1);
    }
  }

  // --- OSC 2 Level ---
  // If preset uses OSC 2, expose its level for tuning
  if (settings.osc_2_on === 1.0) {
    const presetLevel = settings.osc_2_level ?? 0.5;
    overrides.osc_2_level = presetLevel; // Set to preset's default so slider shows current state
  }

  // --- OSC 2 Transpose ---
  // Expose for house/dance — sub octaves (-12, -24) or harmony (+7 fifth)
  if (settings.osc_2_on === 1.0) {
    const presetTranspose = settings.osc_2_transpose ?? 0;
    overrides.osc_2_transpose = presetTranspose;
  }

  // --- Filter Drive ---
  {
    const presetDrive = settings.filter_1_drive ?? 0;
    if (presetDrive > 0) {
      overrides.filter_drive = presetDrive;
    } else if (features.brightness != null) {
      const brightness = Number(features.brightness);
      // Dark/aggressive sounds benefit from filter drive
      if (brightness < 0.2 && (preset.category === 'bass' || preset.category === 'lead')) {
        overrides.filter_drive = 3.0;
      }
    }
  }

  // --- Distortion Drive & Mix ---
  {
    const presetHasDist = settings.distortion_on === 1.0;
    if (presetHasDist) {
      overrides.distortion_drive = settings.distortion_drive ?? 5.0;
      overrides.distortion_mix = settings.distortion_mix ?? 0.2;
    }
  }

  // --- Delay Mix ---
  {
    const presetHasDelay = (settings.delay_on === 1.0) || (settings.delay_dry_wet > 0);
    if (presetHasDelay) {
      overrides.delay_mix = settings.delay_dry_wet ?? 0.2;
    }
  }

  // --- Reverb Size ---
  {
    const presetHasReverb = (settings.reverb_on === 1.0) || (settings.reverb_dry_wet > 0);
    if (presetHasReverb) {
      const presetSize = settings.reverb_size ?? 0.5;
      overrides.reverb_size = presetSize;
    }
  }

  // --- ENV 2 Decay (Filter Envelope) ---
  // Key for acid bass, pluck filter sweeps, house stabs
  {
    const presetEnv2Decay = settings.env_2_decay;
    if (presetEnv2Decay != null) {
      overrides.env_2_decay = presetEnv2Decay;
    } else if (features.filterEnvelope?.sweepDirection &&
               features.filterEnvelope.sweepDirection !== 'stable') {
      // Analysis detected filter movement — set a reasonable envelope decay
      const brightness = Number(features.brightness ?? 0.3);
      overrides.env_2_decay = brightness > 0.4 ? 0.8 : 0.3;
    }
  }

  // --- LFO Rate ---
  if (features.modulation?.lfoRate > 0) {
    overrides.lfo_rate = Math.round(Math.max(0.1, Math.min(20, features.modulation.lfoRate)) * 10) / 10;
  }

  // --- Glide / Portamento ---
  // 808 slides, smooth leads
  {
    const presetGlide = settings.portamento_time ?? 0;
    if (presetGlide > 0) {
      overrides.glide = presetGlide;
    } else if (preset.category === 'bass' && preset.id?.includes('808')) {
      // 808 presets commonly need glide for slides
      overrides.glide = 0.15;
    }
  }

  // --- Oscillator Wave Frame (raw Vital settings for OSC 2 sync) ---
  const rawOverrides = {};
  const modRoutes = []; // { slot, source, destination, amount, bipolar }

  // Sync OSC 2 wave frame with OSC 1 when the wave_frame slider changed OSC 1
  if (overrides.wave_frame != null && settings.osc_2_on && settings.osc_2_wave_frame != null) {
    const presetFrame = settings.osc_1_wave_frame ?? 64;
    // If OSC 2 was matching OSC 1's family, keep them in sync
    if (Math.abs(settings.osc_2_wave_frame - presetFrame) < 20) {
      rawOverrides.osc_2_wave_frame = overrides.wave_frame;
    }
  }

  // --- LFO Modulation Routing ---
  // When analysis detects LFO/tremolo/vibrato, route LFO 1 in Vital's mod matrix.
  // Uses modulation slots 7-9 (slots 1-3 for kick LFO, slots 4-6 for category routing).
  if (features.modulation?.lfoRate > 0) {
    // LFO frequency is set via the lfo_rate slider — only raw config params here
    rawOverrides.lfo_1_sync = 0.0;       // Free-running (not tempo-synced)
    rawOverrides.lfo_1_sync_type = 0.0;   // Trigger mode
    rawOverrides.lfo_1_smooth_mode = 1.0; // Smooth the LFO shape
    rawOverrides.lfo_1_smooth_time = -5.0;

    // Tremolo (amplitude modulation): route LFO 1 → osc_1_level
    const tremoloDepth = Number(features.modulation.tremoloDepth ?? 0);
    if (tremoloDepth > 0.01) {
      // Scale: tremoloDepth 0-1 → mod amount 0-0.5 (full depth would silence the osc)
      const amount = Math.min(0.5, tremoloDepth * 0.6);
      modRoutes.push({
        slot: 7,
        source: 'lfo_1',
        destination: 'osc_1_level',
        amount,
        bipolar: 0,
      });
    }

    // Vibrato (pitch modulation): route LFO 1 → osc_1_transpose
    const vibratoDepth = Number(features.modulation.vibratoDepth ?? 0);
    if (vibratoDepth > 0.01) {
      // Scale: vibratoDepth 0-1 → mod amount 0-0.08 (subtle — even 0.05 is ~1 semitone)
      const amount = Math.min(0.08, vibratoDepth * 0.1);
      modRoutes.push({
        slot: 8,
        source: 'lfo_1',
        destination: 'osc_1_transpose',
        amount,
        bipolar: 1,  // Vibrato oscillates above and below pitch
      });
    }
  }

  // --- Filter Envelope Influence ---
  // When analysis detects a filter sweep, adjust the blended filter cutoff slightly
  // toward the sweep characteristics. But do NOT override ENV 2 timing or add
  // additional modulation routes — the category modulation routing (slot 4: ENV 2 →
  // filter_1_cutoff) already provides filter movement with well-tuned timing.
  // Overriding ENV 2 with analysis values caused near-silent presets (slow attack,
  // low sustain = filter barely opens).
  if (features.filterEnvelope?.sweepDirection &&
      features.filterEnvelope.sweepDirection !== 'stable') {
    const fe = features.filterEnvelope;
    const peakCutoffHz = Number(fe.peakCutoff ?? fe.estimatedCutoff ?? 2000);
    const minCutoffHz = Number(fe.minCutoff ?? fe.estimatedCutoff ?? 200);
    const peakSemi = hzToSemitones(peakCutoffHz);
    const minSemi = hzToSemitones(minCutoffHz);

    // Use the midpoint of the detected sweep range as an influence on the filter cutoff,
    // blended with the already-computed blended cutoff. This nudges the base position
    // without slamming it to the minimum (which made presets inaudible).
    const sweepMid = (peakSemi + minSemi) / 2;
    const currentCutoff = overrides.filter_cutoff ?? presetCutoff;
    // Blend 30% sweep influence, 70% existing blended value
    const nudgedCutoff = sweepMid * 0.3 + currentCutoff * 0.7;
    // Never go below the curated preset's cutoff minus 10 semitones (safety floor)
    overrides.filter_cutoff = Math.round(Math.max(presetCutoff - 10, nudgedCutoff));
  }

  // --- Enhanced Unison from Chorus Detection ---
  // Override the slider-based unison with more granular raw settings when chorus is strong
  if (features.modulation) {
    const ca = features.modulation.chorusAmount ?? 0;
    if (ca > 0.15) {
      // Map chorus amount to detune: 0.15-1.0 → 1.5-5.0
      const detune = 1.5 + (Math.min(1, ca) - 0.15) * (5.0 - 1.5) / 0.85;
      rawOverrides.osc_1_unison_detune = Math.round(detune * 10) / 10;

      // More chorus → more voices via raw override (bypasses slider clamping)
      if (ca > 0.6) {
        rawOverrides.osc_1_unison_voices = Math.max(settings.osc_1_unison_voices ?? 1, 5);
      } else if (ca > 0.3) {
        rawOverrides.osc_1_unison_voices = Math.max(settings.osc_1_unison_voices ?? 1, 3);
      }
    }
  }

  // --- Assemble _rawOverrides and _modulations ---
  // Merge oscillator/modulation rawOverrides with effects rawOverrides (from earlier)
  // instead of replacing — the rawFx section already set some _rawOverrides.
  if (Object.keys(rawOverrides).length > 0) {
    overrides._rawOverrides = { ...(overrides._rawOverrides || {}), ...rawOverrides };
  }
  if (modRoutes.length > 0) {
    overrides._modulations = modRoutes;
  }

  return overrides;
}

// =============================================================================
// Harmonic-Profile-Based Wavetable Frame Mapping
// =============================================================================

/**
 * Compute a continuous Vital wave frame (0-127) from waveform analysis data.
 * Uses harmonic profile when available for precise mapping, falls back to type.
 *
 * Vital's default wavetable sweeps roughly:
 *   0 = pure sine, ~32 = triangle, ~64 = sawtooth, ~96 = square, ~127 = narrow pulse
 *
 * @param {Object} waveform - features.waveform from the worker
 * @returns {number|null} Wave frame 0-127, or null if undetermined
 */
function computeWaveFrame(waveform) {
  if (!waveform) return null;

  // If we have a harmonic profile, compute a continuous frame from harmonic characteristics
  if (waveform.harmonicProfile && waveform.harmonicProfile.length >= 3) {
    const profile = waveform.harmonicProfile;
    const amps = profile.map(h => (h.amplitude ?? 0) / 100); // Normalize 0-1

    // Count significant harmonics (amplitude > 5%)
    const significantCount = amps.filter(a => a > 0.05).length;
    const totalHarmonics = amps.length;

    // Compute odd/even balance: odd harmonics (1,3,5,7) vs even (2,4,6,8)
    let oddSum = 0, evenSum = 0;
    for (let i = 0; i < amps.length; i++) {
      const harmonicNum = i + 1; // harmonic 1 = fundamental
      if (harmonicNum === 1) continue; // Skip fundamental for balance calc
      if (harmonicNum % 2 === 1) oddSum += amps[i];
      else evenSum += amps[i];
    }
    const totalOvertones = oddSum + evenSum;
    const oddRatio = totalOvertones > 0.01 ? oddSum / totalOvertones : 0.5;

    // Compute rolloff rate: how quickly harmonics decay
    // Steep rolloff → sine/triangle, gentle rolloff → saw/square
    let rolloff = 0;
    if (amps[0] > 0.01 && significantCount >= 2) {
      // Average ratio of each harmonic to the previous one
      let ratioSum = 0, ratioCount = 0;
      for (let i = 1; i < Math.min(amps.length, 6); i++) {
        if (amps[i - 1] > 0.02) {
          ratioSum += amps[i] / amps[i - 1];
          ratioCount++;
        }
      }
      rolloff = ratioCount > 0 ? ratioSum / ratioCount : 0;
      // rolloff: 0 = instant drop (sine), ~0.5 = moderate (triangle), ~0.8+ = gentle (saw/square)
    }

    // Decision tree to map to continuous wave frame:
    // Pure sine: only fundamental, no significant overtones → 0
    if (significantCount <= 1) return 0;

    // Triangle-like: mostly odd harmonics, steep rolloff (1/n^2)
    // Saw-like: all harmonics, moderate rolloff (1/n)
    // Square-like: mostly odd harmonics, gentle rolloff (1/n)
    // Pulse-like: all harmonics, very gentle rolloff

    if (oddRatio > 0.7) {
      // Predominantly odd harmonics → square or triangle family
      if (rolloff < 0.35) {
        // Steep rolloff + odd harmonics → triangle (frame ~20-45)
        return Math.round(20 + rolloff * 70); // 20-45 range
      } else {
        // Gentle rolloff + odd harmonics → square (frame ~80-110)
        const squareFrame = 80 + (rolloff - 0.35) * 46; // 80-110
        return Math.round(Math.min(110, squareFrame));
      }
    } else {
      // Mixed odd/even harmonics → saw or pulse family
      if (rolloff < 0.5) {
        // Moderate rolloff + mixed harmonics → triangle-saw blend (frame ~35-65)
        return Math.round(35 + rolloff * 60); // 35-65
      } else if (rolloff < 0.75) {
        // Gentle rolloff + mixed harmonics → sawtooth (frame ~55-80)
        return Math.round(55 + (rolloff - 0.5) * 100); // 55-80
      } else {
        // Very gentle rolloff + mixed harmonics → pulse-like (frame ~95-120)
        const pulseFrame = 95 + (rolloff - 0.75) * 100; // 95-120
        return Math.round(Math.min(120, pulseFrame));
      }
    }
  }

  // Fallback: type-based mapping (6 fixed values)
  if (waveform.type) {
    const waveFrameMap = {
      sine: 0,
      triangle: 32,
      saw: 64,
      square: 96,
      pulse: 108,
      complex: null,
    };
    return waveFrameMap[waveform.type] ?? null;
  }

  return null;
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
