import { describe, it, expect } from 'vitest';
import { buildVitalPreset, presetToVitalFile } from '../services/vitalPresetGenerator';
import { CURATED_PRESETS, PRESET_CATEGORIES, TUNING_PARAMS } from '../data/vitalPresets';

describe('Vital Preset Generator (Curated)', () => {
  describe('buildVitalPreset', () => {
    it('returns a valid preset object with required fields', () => {
      const preset = buildVitalPreset('saw_bass');

      expect(preset).toBeDefined();
      expect(preset.settings).toBeDefined();
      expect(typeof preset.settings).toBe('object');
      expect(preset.preset_name).toBe('Saw Bass');
      expect(preset.author).toBe('SoundSauce');
    });

    it('applies curated settings over init template', () => {
      const preset = buildVitalPreset('saw_bass');

      // Saw bass should have OSC 1 wave_frame = 64 (saw) and OSC 2 on at -12
      expect(preset.settings.osc_1_on).toBe(1.0);
      expect(preset.settings.osc_1_wave_frame).toBe(64);
      expect(preset.settings.osc_2_on).toBe(1.0);
      expect(preset.settings.osc_2_transpose).toBe(-12);
      expect(preset.settings.filter_1_on).toBe(1.0);
    });

    it('applies tuning overrides on top of curated settings', () => {
      const preset = buildVitalPreset('saw_bass', {
        filter_cutoff: 100,
        attack: 0.5,
        reverb: 0.4,
      });

      expect(preset.settings.filter_1_cutoff).toBe(100);
      expect(preset.settings.env_1_attack).toBe(0.5);
      expect(preset.settings.reverb_dry_wet).toBe(0.4);
    });

    it('handles linked toggle logic for reverb', () => {
      // Reverb > 0 should enable reverb_on
      const presetWithReverb = buildVitalPreset('saw_bass', { reverb: 0.3 });
      expect(presetWithReverb.settings.reverb_on).toBe(1.0);
      expect(presetWithReverb.settings.reverb_dry_wet).toBe(0.3);

      // Reverb = 0 should disable reverb_on
      const presetNoReverb = buildVitalPreset('saw_bass', { reverb: 0 });
      expect(presetNoReverb.settings.reverb_on).toBe(0.0);
    });

    it('handles linked toggle logic for chorus', () => {
      const presetWithChorus = buildVitalPreset('saw_bass', { chorus: 0.5 });
      expect(presetWithChorus.settings.chorus_on).toBe(1.0);

      const presetNoChorus = buildVitalPreset('saw_bass', { chorus: 0 });
      expect(presetNoChorus.settings.chorus_on).toBe(0.0);
    });

    it('clamps tuning values to valid ranges', () => {
      const preset = buildVitalPreset('saw_bass', {
        filter_cutoff: 999, // max is 136
        attack: -5, // min is 0
        unison_voices: 50, // max is 16
      });

      expect(preset.settings.filter_1_cutoff).toBe(136);
      expect(preset.settings.env_1_attack).toBe(0);
      expect(preset.settings.osc_1_unison_voices).toBe(16);
    });

    it('applies kick LFO for kick presets', () => {
      const preset = buildVitalPreset('standard_kick');

      // Kick should have LFO routing
      expect(preset.settings.lfo_1_sync_type).toBe(2.0);
      expect(preset.settings.lfo_2_sync_type).toBe(2.0);
      expect(preset.settings.filter_1_on).toBe(0.0);
      expect(preset.settings.osc_1_wave_frame).toBe(0);
    });

    it('applies kick LFO for hardstyle kick preset', () => {
      const preset = buildVitalPreset('hardstyle_kick');

      expect(preset.settings.lfo_1_sync_type).toBe(2.0);
      expect(preset.settings.distortion_on).toBe(1.0);
    });

    it('falls back to sub_bass for unknown preset ID', () => {
      const preset = buildVitalPreset('nonexistent_preset_id');

      // Should fallback to sub_bass
      expect(preset.settings.osc_1_wave_frame).toBe(0); // sine
      expect(preset.settings.osc_2_on).toBe(0.0);
    });

    it('allows custom metadata', () => {
      const preset = buildVitalPreset('warm_pad', {}, {
        presetName: 'My Custom Pad',
        author: 'Test Producer',
      });

      expect(preset.preset_name).toBe('My Custom Pad');
      expect(preset.author).toBe('Test Producer');
    });

    it('sets comments with preset name', () => {
      const preset = buildVitalPreset('supersaw_lead');

      expect(preset.comments).toContain('Supersaw Lead');
      expect(preset.comments).toContain('SoundSauce');
    });

    it('ignores unknown tuning parameter IDs', () => {
      // Should not throw
      const preset = buildVitalPreset('saw_bass', {
        nonexistent_param: 42,
        another_fake: 'hello',
      });

      expect(preset).toBeDefined();
      expect(preset.settings).toBeDefined();
    });
  });

  describe('presetToVitalFile', () => {
    it('converts preset to valid JSON string', () => {
      const preset = buildVitalPreset('warm_pad');
      const fileContent = presetToVitalFile(preset);

      expect(typeof fileContent).toBe('string');
      const parsed = JSON.parse(fileContent);
      expect(parsed.settings).toBeDefined();
    });

    it('preserves all preset fields in serialization', () => {
      const preset = buildVitalPreset('fm_lead', {}, {
        presetName: 'Test',
        author: 'Author',
      });
      const fileContent = presetToVitalFile(preset);
      const parsed = JSON.parse(fileContent);

      expect(parsed.preset_name).toBe('Test');
      expect(parsed.author).toBe('Author');
    });

    it('produces valid JSON for all presets', () => {
      for (const curated of CURATED_PRESETS) {
        const preset = buildVitalPreset(curated.id);
        const jsonStr = JSON.stringify(preset);
        expect(() => JSON.parse(jsonStr)).not.toThrow();
      }
    });
  });

  describe('data integrity', () => {
    it('all preset IDs in CURATED_PRESETS are unique', () => {
      const ids = CURATED_PRESETS.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('all preset categories match a PRESET_CATEGORIES entry', () => {
      const validCategories = new Set(PRESET_CATEGORIES.map(c => c.id));
      for (const preset of CURATED_PRESETS) {
        expect(validCategories.has(preset.category)).toBe(true);
      }
    });

    it('every category has at least one preset', () => {
      for (const category of PRESET_CATEGORIES) {
        const presetsInCategory = CURATED_PRESETS.filter(p => p.category === category.id);
        expect(presetsInCategory.length).toBeGreaterThan(0);
      }
    });

    it('all TUNING_PARAMS have valid vitalKey entries', () => {
      for (const param of TUNING_PARAMS) {
        expect(param.vitalKey).toBeDefined();
        expect(param.min).toBeLessThan(param.max);
      }
    });

    it('each preset produces a unique configuration', () => {
      const presets = CURATED_PRESETS.map(p => buildVitalPreset(p.id));

      // Check that settings vary between presets
      const waveFrames = presets.map(p => p.settings.osc_1_wave_frame);
      const attacks = presets.map(p => p.settings.env_1_attack);
      const cutoffs = presets.map(p => p.settings.filter_1_cutoff);

      // Not all should be the same
      expect(new Set(waveFrames).size).toBeGreaterThan(1);
      expect(new Set(attacks).size).toBeGreaterThan(1);
      expect(new Set(cutoffs).size).toBeGreaterThan(1);
    });

    it('kick presets have postProcess flag', () => {
      const kickPresets = CURATED_PRESETS.filter(p => p.category === 'kick');
      for (const kick of kickPresets) {
        expect(kick.postProcess).toBe('kick');
      }
    });
  });
});
