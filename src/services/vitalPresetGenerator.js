/**
 * Vital Synth Preset Generator (Curated Presets)
 *
 * Builds .vital preset files from curated preset definitions + user tuning overrides.
 * Replaces the old dynamic analysis-based generator.
 */

import vitalInitTemplate from '../data/vitalInitTemplate.json';
import { CURATED_PRESETS, TUNING_PARAMS, CATEGORY_VISUAL_PROFILES, applyKickLFOEnvelopes, applyCategoryModulations } from '../data/vitalPresets';

/**
 * Sanitize a string for use in filenames — keeps spaces, letters, numbers, hyphens, parentheses.
 * Strips characters that are unsafe in file systems (slashes, colons, quotes, etc.).
 */
function sanitizeFilename(str) {
  return str.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Build a clean, professional download filename for a Vital preset.
 *
 * Format examples:
 *   "SoundSauce - My Song (Bass - Sub Bass).vital"
 *   "SoundSauce - Warm Pad.vital"  (when no audio title or instrument)
 *
 * @param {Object} options
 * @param {string} [options.audioTitle] - Name of the uploaded audio file
 * @param {string} [options.instrument] - Detected instrument (e.g. 'bass', 'lead', 'pad')
 * @param {string} [options.presetName] - Name of the curated preset (e.g. 'Sub Bass', 'Warm Pad')
 * @returns {string} Clean filename without extension
 */
export function buildPresetFilename({ audioTitle, instrument, presetName } = {}) {
  // Strip file extension from audio title if present
  const cleanTitle = audioTitle ? audioTitle.replace(/\.(wav|mp3|m4a|flac|ogg|aac|webm)$/i, '').trim() : '';

  // Build the detail part: "Instrument - PresetName" or just one
  const instrumentLabel = instrument || '';
  const parts = [instrumentLabel, presetName].filter(Boolean);
  const detail = parts.length > 0 ? parts.join(' - ') : '';

  if (cleanTitle && detail) {
    return sanitizeFilename(`SoundSauce - ${cleanTitle} (${detail})`);
  } else if (cleanTitle) {
    return sanitizeFilename(`SoundSauce - ${cleanTitle}`);
  } else if (detail) {
    return sanitizeFilename(`SoundSauce - ${detail}`);
  }
  return 'SoundSauce Preset';
}

/**
 * Build a Vital preset from a curated preset ID + optional tuning overrides.
 *
 * @param {string} presetId - ID of the curated preset (e.g. 'saw_bass', 'warm_pad')
 * @param {Object} tuningOverrides - User slider values: { filter_cutoff: 80, attack: 0.5, ... }
 * @param {Object} metadata - Optional metadata: { presetName, author, audioTitle, instrument }
 * @returns {Object} Complete Vital preset object ready for export
 */
export function buildVitalPreset(presetId, tuningOverrides = {}, metadata = {}) {
  // 1. Find curated preset
  const curated = CURATED_PRESETS.find(p => p.id === presetId);
  if (!curated) {
    // Fallback to first preset (sub_bass) if unknown ID
    return buildVitalPreset('sub_bass', tuningOverrides, metadata);
  }

  // 2. Deep-clone Vital init template
  const preset = JSON.parse(JSON.stringify(vitalInitTemplate));

  // 3. Spread curated preset settings onto clone
  for (const [key, value] of Object.entries(curated.settings)) {
    preset.settings[key] = value;
  }

  // 3b. Apply category visual profile defaults (env_2 shape, LFO 1 settings)
  // These make presets visually distinct in Vital's UI. Applied as defaults —
  // curated preset settings (step 3) take priority, and analysis overrides (step 5)
  // can further customize.
  const visualProfile = CATEGORY_VISUAL_PROFILES[curated.category];
  if (visualProfile) {
    for (const [key, value] of Object.entries(visualProfile)) {
      // Only set if the curated preset didn't already define this parameter
      if (!(key in curated.settings)) {
        preset.settings[key] = value;
      }
    }
  }

  // 3c. Fix oscillator routing — the init template defaults OSC 2 to Filter 2,
  // but Filter 2 is OFF by default. Route both OSCs through Filter 1 unless the
  // curated preset explicitly sets up Filter 2.
  if (preset.settings.osc_2_on === 1 && !curated.settings.filter_2_on) {
    preset.settings.osc_2_destination = 0; // Route to Filter 1
  }

  // 3d. Apply category modulation routing (ENV 2 → filter, LFO 1 → destinations)
  // Without this, ENV 2 and LFO 1 parameters exist in the preset but have
  // ZERO audible effect because they're not connected to any destination.
  applyCategoryModulations(preset, curated.category);

  // 4. Apply kick LFO envelopes if needed (overrides LFO shapes from step 3c)
  if (curated.postProcess === 'kick') {
    applyKickLFOEnvelopes(preset);
  }

  // 5. Apply tuning overrides from user sliders
  for (const [paramId, value] of Object.entries(tuningOverrides)) {
    // Skip internal keys (prefixed with _)
    if (paramId.startsWith('_')) continue;

    const paramDef = TUNING_PARAMS.find(p => p.id === paramId);
    if (!paramDef) continue;

    // Clamp value to param range
    const clamped = Math.min(paramDef.max, Math.max(paramDef.min, value));
    preset.settings[paramDef.vitalKey] = clamped;

    // Handle linked toggles (reverb/chorus: dry_wet > 0 → _on = 1)
    if (paramDef.linkedToggle) {
      preset.settings[paramDef.linkedToggle] = clamped > 0 ? 1.0 : 0.0;
    }
  }

  // 5b. Apply raw Vital settings overrides from analysis (oscillator wave frame, etc.)
  // These bypass TUNING_PARAMS since they're not user-adjustable sliders
  if (tuningOverrides._rawOverrides) {
    for (const [key, value] of Object.entries(tuningOverrides._rawOverrides)) {
      preset.settings[key] = value;
    }
  }

  // 5c. Apply modulation routing from analysis (LFO, filter envelope, etc.)
  // Each entry: { slot, source, destination, amount, bipolar }
  // Slots 7-9 for analysis routing (1-3 for kick LFO, 4-6 for category modulations)
  if (tuningOverrides._modulations && Array.isArray(tuningOverrides._modulations)) {
    if (!preset.settings.modulations) preset.settings.modulations = [];
    // Ensure modulations array has at least 64 entries
    while (preset.settings.modulations.length < 64) {
      preset.settings.modulations.push({ source: '', destination: '' });
    }
    for (const route of tuningOverrides._modulations) {
      const idx = route.slot - 1; // slot 4 → array index 3
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

  // 5d. Inject extracted wavetable into OSC 2 (hybrid approach)
  // OSC 1 keeps the curated preset waveform (proven foundation).
  // OSC 2 gets the actual audio's timbral character as a custom wavetable.
  // Users can blend OSC 1/2 levels to taste, or sweep the wavetable frame.
  // wavetableData: { keyframes: [{position, wave_data}], fundamentalHz, success }
  if (tuningOverrides._wavetableData && tuningOverrides._wavetableData.success) {
    const wtData = tuningOverrides._wavetableData;
    if (preset.settings.wavetables && preset.settings.wavetables.length >= 2) {
      // Inject into OSC 2's wavetable slot (index 1)
      preset.settings.wavetables[1] = {
        author: 'SoundSauce',
        full_normalize: true,
        name: 'Extracted Audio',
        remove_all_dc: false,
        groups: [{
          components: [{
            interpolation: 1,       // Linear interpolation between frames
            interpolation_style: 1,  // Smooth
            keyframes: wtData.keyframes.map(kf => ({
              position: kf.position,
              wave_data: kf.wave_data
            }))
          }]
        }]
      };
      // Enable OSC 2 with the extracted wavetable
      preset.settings.osc_2_on = 1.0;
      preset.settings.osc_2_destination = 0; // Route through Filter 1
      // Set OSC 2 level slightly below OSC 1 so curated tone leads
      preset.settings.osc_2_level = 0.6;
      // Set wave frame to middle so user can sweep through timbral evolution
      if (wtData.keyframes.length > 1) {
        preset.settings.osc_2_wave_frame = 64;
      }
      // Transpose OSC 2 to match detected fundamental if available
      if (wtData.fundamentalHz && wtData.fundamentalHz > 20) {
        // Calculate semitones from C4 (261.63 Hz) — Vital's default tuning
        const semitonesFromC4 = 12 * Math.log2(wtData.fundamentalHz / 261.63);
        // Only apply if the fundamental is significantly off from C4 (>1 semitone)
        if (Math.abs(semitonesFromC4) > 1) {
          preset.settings.osc_2_transpose = Math.round(semitonesFromC4);
        }
      }
    }
  }

  // 6. Set metadata — shows inside Vital's preset browser
  const audioTitle = metadata.audioTitle ? metadata.audioTitle.replace(/\.(wav|mp3|m4a|flac|ogg|aac|webm)$/i, '').trim() : '';
  const instrumentName = metadata.instrument || '';

  // preset_name: shown in Vital's top bar and preset browser
  if (audioTitle && instrumentName) {
    preset.preset_name = `${audioTitle} (${instrumentName} - ${curated.name})`;
  } else if (audioTitle) {
    preset.preset_name = `${audioTitle} - ${curated.name}`;
  } else {
    preset.preset_name = metadata.presetName || curated.name || 'SoundSauce Export';
  }

  preset.author = metadata.author || 'SoundSauce';
  preset.preset_style = curated.category || '';

  // comments: shown in Vital's preset info section
  const commentParts = [`Preset: ${curated.name}`];
  if (audioTitle) commentParts.push(`Source: ${audioTitle}`);
  if (instrumentName) commentParts.push(`Instrument: ${instrumentName}`);
  commentParts.push('Generated by SoundSauce (soundsauce.app)');
  preset.comments = commentParts.join(' | ');

  return preset;
}

/**
 * Convert preset object to downloadable .vital file content.
 */
export function presetToVitalFile(preset) {
  return JSON.stringify(preset);
}

/**
 * Trigger download of a .vital preset file.
 *
 * @param {Object} preset - Complete Vital preset object
 * @param {string} [filename='SoundSauce Preset'] - Download filename (without extension)
 */
export function downloadVitalPreset(preset, filename = 'SoundSauce Preset') {
  const content = presetToVitalFile(preset);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const safeName = sanitizeFilename(filename) || 'SoundSauce Preset';
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.vital`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download a .vital preset from a remote URL (e.g. Vercel Blob).
 * Fetches the file content, optionally patches metadata for a professional
 * in-Vital display, and triggers a client-side download.
 *
 * @param {string} url - Remote URL of the .vital preset
 * @param {string} [filename='SoundSauce Preset'] - Download filename (without extension)
 * @param {Object} [patchMeta] - Optional metadata to patch into the preset JSON
 * @param {string} [patchMeta.preset_name] - Override preset_name shown in Vital
 * @param {string} [patchMeta.author] - Override author shown in Vital
 * @param {string} [patchMeta.comments] - Override comments shown in Vital
 */
export async function downloadRemotePreset(url, filename = 'SoundSauce Preset', patchMeta = null) {
  const response = await fetch(url);
  let text = await response.text();

  // Optionally patch metadata into the preset JSON for professional Vital display
  if (patchMeta) {
    try {
      const presetObj = JSON.parse(text);
      if (patchMeta.preset_name) presetObj.preset_name = patchMeta.preset_name;
      if (patchMeta.author) presetObj.author = patchMeta.author;
      if (patchMeta.comments) presetObj.comments = patchMeta.comments;
      text = JSON.stringify(presetObj);
    } catch {
      // If not valid JSON, download as-is
    }
  }

  const blob = new Blob([text], { type: 'application/octet-stream' });
  const blobUrl = URL.createObjectURL(blob);

  const safeName = sanitizeFilename(filename) || 'SoundSauce Preset';
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${safeName}.vital`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export default {
  buildVitalPreset,
  buildPresetFilename,
  presetToVitalFile,
  downloadVitalPreset,
};
