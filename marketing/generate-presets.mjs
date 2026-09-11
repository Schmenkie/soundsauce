/**
 * Generate .vital preset files for marketing/sharing.
 * Run: node marketing/generate-presets.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Load the init template
const template = JSON.parse(readFileSync(join(root, 'src/data/vitalInitTemplate.json'), 'utf-8'));

// We need to manually extract preset data since it uses ES module exports
// Parse the vitalPresets.js file to extract CURATED_PRESETS settings
const presetsSource = readFileSync(join(root, 'src/data/vitalPresets.js'), 'utf-8');

// Extract KICK_LFO_SHAPES for kick presets
const kickLfoMatch = presetsSource.match(/const KICK_LFO_SHAPES\s*=\s*(\{[\s\S]*?\n\});/);
let KICK_LFO_SHAPES = {};
if (kickLfoMatch) {
  try {
    KICK_LFO_SHAPES = eval('(' + kickLfoMatch[1] + ')');
  } catch (e) {
    console.warn('Could not parse KICK_LFO_SHAPES, kick presets will be basic');
  }
}

// Presets we want to generate for the Reddit post — crowd-pleasers
const MARKETING_PRESETS = [
  { id: '808_bass', name: '808 Bass', category: 'Bass' },
  { id: 'reese_bass', name: 'Reese Bass', category: 'Bass' },
  { id: 'supersaw_lead', name: 'Supersaw Lead', category: 'Lead' },
  { id: 'warm_pad', name: 'Warm Pad', category: 'Pad' },
  { id: 'soft_pluck', name: 'Soft Pluck', category: 'Pluck' },
  { id: 'acid_bass', name: 'Acid Bass', category: 'Bass' },
  { id: 'dark_pad', name: 'Dark Pad', category: 'Pad' },
  { id: 'fm_lead', name: 'FM Lead', category: 'Lead' },
  { id: 'bell', name: 'Bell', category: 'Pluck' },
  { id: 'standard_kick', name: 'Analog Kick', category: 'Kick' },
];

// Extract settings for a preset ID from the source file
function extractPresetSettings(presetId) {
  // Find the preset block by ID
  const idPattern = new RegExp(`id:\\s*'${presetId}'[\\s\\S]*?settings:\\s*\\{([\\s\\S]*?)\\}`, 'm');
  const match = presetsSource.match(idPattern);
  if (!match) {
    console.warn(`Could not find settings for ${presetId}`);
    return {};
  }

  const settingsStr = match[1];
  const settings = {};

  // Parse each key-value pair
  const kvPattern = /(\w+):\s*([-\d.]+|'[^']*')/g;
  let kvMatch;
  while ((kvMatch = kvPattern.exec(settingsStr)) !== null) {
    const key = kvMatch[1];
    let value = kvMatch[2];
    if (value.startsWith("'")) {
      value = value.slice(1, -1);
    } else {
      value = parseFloat(value);
    }
    settings[key] = value;
  }

  return settings;
}

function isKickPreset(presetId) {
  return presetId.includes('kick') || presetId === '808_kick';
}

function applyKickLFO(preset) {
  if (!KICK_LFO_SHAPES.lfo_1 || !KICK_LFO_SHAPES.lfo_2 || !KICK_LFO_SHAPES.lfo_3) return;

  // Set OSC 1 to sine wavetable (wave_data is frame 0 = sine)
  preset.settings.osc_1_wave_frame = 0;

  // Apply factory LFO shapes
  for (const [key, value] of Object.entries(KICK_LFO_SHAPES)) {
    preset.settings[key] = value;
  }
}

// Generate each preset
for (const p of MARKETING_PRESETS) {
  const preset = JSON.parse(JSON.stringify(template));
  const settings = extractPresetSettings(p.id);

  // Apply curated settings
  for (const [key, value] of Object.entries(settings)) {
    preset.settings[key] = value;
  }

  // Apply kick LFO if needed
  if (isKickPreset(p.id)) {
    applyKickLFO(preset);
  }

  // Set metadata
  preset.preset_name = `SoundSauce - ${p.name}`;
  preset.author = 'SoundSauce';
  preset.preset_style = p.category;
  preset.comments = `${p.name} preset by SoundSauce (soundsauce.app) | Category: ${p.category} | Free to use in any project`;

  const filename = `SoundSauce - ${p.name}.vital`;
  const outPath = join(__dirname, 'presets', filename);
  writeFileSync(outPath, JSON.stringify(preset));
  console.log(`Generated: ${filename} (${Object.keys(settings).length} settings)`);
}

console.log(`\nDone! ${MARKETING_PRESETS.length} presets in marketing/presets/`);
