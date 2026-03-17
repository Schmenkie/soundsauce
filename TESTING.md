# Vital Preset Generator Testing Framework

This document establishes ground truth testing procedures to measure and improve the accuracy of Vital preset generation from audio analysis.

## Table of Contents

1. [Test Case Specifications](#1-test-case-specifications)
2. [Recording Guidelines](#2-recording-guidelines)
3. [Testing Workflow](#3-testing-workflow)
4. [Comparison Metrics](#4-comparison-metrics)
5. [Parameter Mapping Reference](#5-parameter-mapping-reference)
6. [Known Limitations](#6-known-limitations)
7. [Test Results Tracking](#7-test-results-tracking)

---

## 1. Test Case Specifications

### Test Presets to Create in Vital

Create these presets in Vital with exact, simple parameters. Save both the `.vital` preset file and an exported audio sample for each.

| Test ID | Test Name | Oscillator | Filter | ADSR (A/D/S/R in sec) | Notes |
|---------|-----------|------------|--------|----------------------|-------|
| T01 | sine-kick | Osc1: Sine (frame 0), -24st | LP 100Hz, res 0.15 | 0.001 / 0.15 / 0.0 / 0.1 | Basic synth kick |
| T02 | saw-bass | Osc1: Saw (frame 64) | LP 400Hz, res 0.25 | 0.005 / 0.3 / 0.7 / 0.15 | Sustained saw bass |
| T03 | sub-bass | Osc1: Sine (frame 0) | LP 80Hz, res 0.1 | 0.005 / 0.2 / 0.85 / 0.1 | Pure sub |
| T04 | warm-pad | Osc1: Tri (frame 32), 5 voices, 5.0 detune | LP 600Hz, res 0.2 | 0.5 / 0.8 / 0.8 / 1.5 | Detuned pad |
| T05 | sharp-pluck | Osc1: Saw (frame 64), 2 voices | LP 2000Hz, res 0.35 | 0.001 / 0.35 / 0.1 / 0.2 | Snappy pluck |
| T06 | square-lead | Osc1: Square (frame 96), 3 voices, 4.0 detune | LP 1500Hz, res 0.3 | 0.01 / 0.4 / 0.6 / 0.25 | Bright square lead |
| T07 | filter-sweep | Osc1: Saw (frame 64) | LP 100Hz->3000Hz, res 0.4 | 0.01 / 0.5 / 0.6 / 0.3 | Filter env opening |
| T08 | tremolo-pad | Osc1: Tri (frame 32) | LP 800Hz | 0.3 / 0.5 / 0.7 / 1.0 | LFO 4Hz on amplitude |
| T09 | vibrato-lead | Osc1: Saw (frame 64) | LP 1200Hz | 0.02 / 0.3 / 0.7 / 0.3 | LFO 5Hz on pitch |
| T10 | complex-bass | Osc1: Saw + Osc2: Sine -12st | LP 500Hz, res 0.3 | 0.005 / 0.25 / 0.75 / 0.12 | Layered bass |

### Detailed Test Case Specifications

#### T01: sine-kick
```
Oscillator:
  - osc_1_on: 1.0
  - osc_1_wave_frame: 0 (sine)
  - osc_1_transpose: -24
  - osc_1_unison_voices: 1

Filter:
  - filter_1_on: 1.0
  - filter_1_cutoff: 36 (approx 100Hz)
  - filter_1_resonance: 0.15
  - filter_1_model: 3 (Ladder)
  - filter_1_style: 1.0 (24dB)

Envelope:
  - env_1_attack: 0.001
  - env_1_decay: 0.15
  - env_1_sustain: 0.0
  - env_1_release: 0.1

Expected Detection:
  - Waveform: sine (>80% confidence)
  - Instrument: kick
  - Filter cutoff: ~100Hz
```

#### T02: saw-bass
```
Oscillator:
  - osc_1_on: 1.0
  - osc_1_wave_frame: 64 (saw)
  - osc_1_transpose: 0
  - osc_1_unison_voices: 1

Filter:
  - filter_1_on: 1.0
  - filter_1_cutoff: 60 (approx 400Hz)
  - filter_1_resonance: 0.25
  - filter_1_model: 3 (Ladder)
  - filter_1_style: 1.0 (24dB)

Envelope:
  - env_1_attack: 0.005
  - env_1_decay: 0.3
  - env_1_sustain: 0.7
  - env_1_release: 0.15

Expected Detection:
  - Waveform: saw (>70% confidence)
  - Instrument: bass
  - Filter cutoff: 300-500Hz range
```

#### T03: sub-bass
```
Oscillator:
  - osc_1_on: 1.0
  - osc_1_wave_frame: 0 (sine)
  - osc_1_transpose: 0
  - osc_1_unison_voices: 1

Filter:
  - filter_1_on: 1.0
  - filter_1_cutoff: 32 (approx 80Hz)
  - filter_1_resonance: 0.1

Envelope:
  - env_1_attack: 0.005
  - env_1_decay: 0.2
  - env_1_sustain: 0.85
  - env_1_release: 0.1

Expected Detection:
  - Waveform: sine (>85% confidence)
  - Instrument: sub-bass
```

#### T04: warm-pad
```
Oscillator:
  - osc_1_on: 1.0
  - osc_1_wave_frame: 32 (triangle)
  - osc_1_unison_voices: 5
  - osc_1_unison_detune: 5.0
  - osc_1_stereo_spread: 0.8

Filter:
  - filter_1_on: 1.0
  - filter_1_cutoff: 72 (approx 600Hz)
  - filter_1_resonance: 0.2
  - filter_1_model: 0 (Analog)
  - filter_1_style: 0.0 (12dB)

Envelope:
  - env_1_attack: 0.5
  - env_1_decay: 0.8
  - env_1_sustain: 0.8
  - env_1_release: 1.5

Expected Detection:
  - Waveform: triangle or complex
  - Instrument: pad
  - Attack: >400ms
```

#### T05: sharp-pluck
```
Oscillator:
  - osc_1_on: 1.0
  - osc_1_wave_frame: 64 (saw)
  - osc_1_unison_voices: 2
  - osc_1_unison_detune: 3.0

Filter:
  - filter_1_on: 1.0
  - filter_1_cutoff: 95 (approx 2000Hz)
  - filter_1_resonance: 0.35
  - filter_1_model: 4 (Diode)

Envelope:
  - env_1_attack: 0.001
  - env_1_decay: 0.35
  - env_1_sustain: 0.1
  - env_1_release: 0.2

Expected Detection:
  - Waveform: saw (>65% confidence)
  - Instrument: pluck
  - Very fast attack (<10ms)
```

#### T06: square-lead
```
Oscillator:
  - osc_1_on: 1.0
  - osc_1_wave_frame: 96 (square)
  - osc_1_unison_voices: 3
  - osc_1_unison_detune: 4.0

Filter:
  - filter_1_on: 1.0
  - filter_1_cutoff: 90 (approx 1500Hz)
  - filter_1_resonance: 0.3

Envelope:
  - env_1_attack: 0.01
  - env_1_decay: 0.4
  - env_1_sustain: 0.6
  - env_1_release: 0.25

Expected Detection:
  - Waveform: square (>60% confidence)
  - Instrument: lead
```

#### T07: filter-sweep
```
Oscillator:
  - osc_1_on: 1.0
  - osc_1_wave_frame: 64 (saw)

Filter:
  - filter_1_on: 1.0
  - filter_1_cutoff: 36 (starting at ~100Hz)
  - filter_1_resonance: 0.4

Filter Envelope (env_2):
  - Routed to filter_1_cutoff
  - Amount: +0.5 (opens to ~3000Hz)
  - env_2_attack: 0.5
  - env_2_decay: 0.5
  - env_2_sustain: 0.8

Amp Envelope:
  - env_1_attack: 0.01
  - env_1_decay: 0.5
  - env_1_sustain: 0.6
  - env_1_release: 0.3

Expected Detection:
  - Filter sweep: "opening"
  - Filter attack time detected
```

#### T08: tremolo-pad
```
Oscillator:
  - osc_1_on: 1.0
  - osc_1_wave_frame: 32 (triangle)

LFO:
  - lfo_1_frequency: 4.0 Hz
  - Routed to osc_1_level
  - Amount: 0.3 (30% depth)

Envelope:
  - env_1_attack: 0.3
  - env_1_decay: 0.5
  - env_1_sustain: 0.7
  - env_1_release: 1.0

Expected Detection:
  - Tremolo: true
  - LFO rate: ~4Hz
```

#### T09: vibrato-lead
```
Oscillator:
  - osc_1_on: 1.0
  - osc_1_wave_frame: 64 (saw)

LFO:
  - lfo_2_frequency: 5.0 Hz
  - Routed to osc_1_tune
  - Amount: 0.02 (subtle pitch wobble)

Envelope:
  - env_1_attack: 0.02
  - env_1_decay: 0.3
  - env_1_sustain: 0.7
  - env_1_release: 0.3

Expected Detection:
  - Vibrato: true
  - LFO rate: ~5Hz
```

#### T10: complex-bass
```
Oscillator 1:
  - osc_1_on: 1.0
  - osc_1_wave_frame: 64 (saw)
  - osc_1_level: 0.8

Oscillator 2:
  - osc_2_on: 1.0
  - osc_2_wave_frame: 0 (sine)
  - osc_2_transpose: -12
  - osc_2_level: 0.5

Filter:
  - filter_1_cutoff: 68 (approx 500Hz)
  - filter_1_resonance: 0.3

Envelope:
  - env_1_attack: 0.005
  - env_1_decay: 0.25
  - env_1_sustain: 0.75
  - env_1_release: 0.12

Expected Detection:
  - Waveform: complex or saw
  - Instrument: bass
```

---

## 2. Recording Guidelines

### Export Settings in Vital

1. **Note Settings**
   - Pitch: C3 (MIDI note 60)
   - Velocity: 100 (78% of max)
   - Note length: 2-4 seconds (use 3 seconds as default)
   - Allow release tail to fully decay

2. **Audio Format**
   - Format: WAV (uncompressed)
   - Sample rate: 44100 Hz
   - Bit depth: 24-bit or 32-bit float
   - Channels: Stereo (even if mono source)

3. **Recording Method**

   **Option A: Render in DAW**
   - Load Vital in your DAW
   - Create a 4-bar MIDI clip with single C3 note
   - Note on at beat 1, note off at beat 7 (2.5 bars at 120 BPM = 5 seconds)
   - Solo the Vital track
   - Export/bounce to WAV

   **Option B: Screen Recording + Audio Capture**
   - Play the preset in Vital standalone
   - Record system audio using Audacity or similar
   - Trim to include full note with release

### File Naming Convention

```
test-{id}-{name}.wav
test-{id}-{name}.vital
```

Examples:
```
test-T01-sine-kick.wav
test-T01-sine-kick.vital
test-T02-saw-bass.wav
test-T02-saw-bass.vital
```

### Recording Checklist

- [ ] Preset saved with exact parameters
- [ ] Note pitch is C3
- [ ] Velocity is 100
- [ ] Full envelope cycle captured (attack through release)
- [ ] No clipping (peaks below 0dB)
- [ ] No reverb/delay tails cut off
- [ ] File named correctly
- [ ] Both .wav and .vital files saved

---

## 3. Testing Workflow

### Step-by-Step Process

```
1. CREATE GROUND TRUTH
   ├── Create preset in Vital with exact parameters (from spec above)
   ├── Save as .vital file
   ├── Record/export audio as .wav
   └── Store both in /test-assets/ folder

2. RUN ANALYSIS
   ├── Open Audio Analyzer Pro (localhost or production)
   ├── Upload test .wav file
   ├── Wait for analysis to complete
   └── Note detected instrument type

3. EXPORT PRESET
   ├── Click Export menu
   ├── Select "Download Vital Preset"
   ├── Save as test-{id}-exported.vital
   └── Store in /test-results/ folder

4. COMPARE PARAMETERS
   ├── Open both .vital files (source and exported)
   ├── Use comparison script (see below)
   ├── Calculate accuracy metrics
   └── Log results in tracking spreadsheet

5. ITERATE
   ├── Identify worst-performing parameters
   ├── Adjust vitalPresetGenerator.js
   ├── Re-run affected tests
   └── Track improvement over time
```

### Comparison Script

Create this script at `scripts/compare-vital-presets.js`:

```javascript
#!/usr/bin/env node
/**
 * Compare two Vital preset files and report parameter differences
 * Usage: node compare-vital-presets.js source.vital exported.vital
 */

const fs = require('fs');

const PARAMS_TO_COMPARE = [
  // Envelope
  'env_1_attack', 'env_1_decay', 'env_1_sustain', 'env_1_release',
  // Filter
  'filter_1_cutoff', 'filter_1_resonance', 'filter_1_on',
  // Oscillator
  'osc_1_wave_frame', 'osc_1_on', 'osc_1_unison_voices', 'osc_1_unison_detune',
  // LFO (if applicable)
  'lfo_1_frequency', 'lfo_2_frequency',
];

function loadPreset(path) {
  const content = fs.readFileSync(path, 'utf-8');
  return JSON.parse(content);
}

function calculateError(source, exported, param) {
  const s = source.settings[param] ?? 0;
  const e = exported.settings[param] ?? 0;

  if (s === 0 && e === 0) return { absolute: 0, percent: 0 };

  const absolute = Math.abs(s - e);
  const percent = s !== 0 ? (absolute / Math.abs(s)) * 100 : (e !== 0 ? 100 : 0);

  return { source: s, exported: e, absolute, percent: percent.toFixed(1) };
}

function main() {
  const [,, sourcePath, exportedPath] = process.argv;

  if (!sourcePath || !exportedPath) {
    console.log('Usage: node compare-vital-presets.js source.vital exported.vital');
    process.exit(1);
  }

  const source = loadPreset(sourcePath);
  const exported = loadPreset(exportedPath);

  console.log('\n=== Vital Preset Comparison ===\n');
  console.log(`Source: ${sourcePath}`);
  console.log(`Exported: ${exportedPath}\n`);

  console.log('Parameter'.padEnd(25) + 'Source'.padStart(10) + 'Exported'.padStart(10) + 'Error %'.padStart(10));
  console.log('-'.repeat(55));

  let totalError = 0;
  let paramCount = 0;

  for (const param of PARAMS_TO_COMPARE) {
    const result = calculateError(source, exported, param);

    console.log(
      param.padEnd(25) +
      String(result.source?.toFixed(3) ?? 'N/A').padStart(10) +
      String(result.exported?.toFixed(3) ?? 'N/A').padStart(10) +
      `${result.percent}%`.padStart(10)
    );

    totalError += parseFloat(result.percent);
    paramCount++;
  }

  console.log('-'.repeat(55));
  console.log(`Average Error: ${(totalError / paramCount).toFixed(1)}%`);
}

main();
```

### Automated Test Runner

For batch testing, create `scripts/run-all-tests.sh`:

```bash
#!/bin/bash
# Run all test cases and generate report

RESULTS_FILE="test-results/$(date +%Y-%m-%d)-results.md"

echo "# Test Results - $(date +%Y-%m-%d)" > $RESULTS_FILE
echo "" >> $RESULTS_FILE

for source_file in test-assets/*.vital; do
  test_id=$(basename "$source_file" .vital)
  exported_file="test-results/${test_id}-exported.vital"

  if [ -f "$exported_file" ]; then
    echo "## $test_id" >> $RESULTS_FILE
    echo '```' >> $RESULTS_FILE
    node scripts/compare-vital-presets.js "$source_file" "$exported_file" >> $RESULTS_FILE
    echo '```' >> $RESULTS_FILE
    echo "" >> $RESULTS_FILE
  fi
done

echo "Results written to $RESULTS_FILE"
```

---

## 4. Comparison Metrics

### Primary Metrics

#### 1. ADSR Accuracy (per stage)

| Metric | Formula | Target |
|--------|---------|--------|
| Attack Error | `\|source - exported\| / source * 100` | < 25% |
| Decay Error | `\|source - exported\| / source * 100` | < 30% |
| Sustain Error | `\|source - exported\| * 100` (absolute) | < 15% |
| Release Error | `\|source - exported\| / source * 100` | < 30% |

Note: Sustain is measured as absolute difference since it's already 0-1 range.

#### 2. Filter Accuracy

| Metric | Formula | Target |
|--------|---------|--------|
| Cutoff Error (Hz) | `\|hzSource - hzExported\|` | < 500Hz |
| Cutoff Error (semitones) | `\|stSource - stExported\|` | < 12st |
| Resonance Error | `\|source - exported\|` | < 0.2 |

#### 3. Waveform Detection

| Metric | Measurement | Target |
|--------|-------------|--------|
| Type Correct | boolean (exact match) | > 80% of tests |
| Frame Error | `\|source - exported\|` | < 16 frames |

#### 4. Modulation Detection

| Metric | Measurement | Target |
|--------|-------------|--------|
| LFO Rate Error | `\|source - exported\| Hz` | < 1Hz |
| Tremolo Detected | boolean | 100% when present |
| Vibrato Detected | boolean | 100% when present |

### Composite Scores

#### Overall Accuracy Score

```
Score = (ADSR_Score * 0.35) + (Filter_Score * 0.25) +
        (Waveform_Score * 0.25) + (Modulation_Score * 0.15)

Where each sub-score is: 100 - average_percent_error
```

#### Usability Score (Subjective)

After loading the exported preset in Vital, rate:

| Rating | Description |
|--------|-------------|
| 5 | Sounds nearly identical, minimal tweaking needed |
| 4 | Same character, minor adjustments (< 3 parameters) |
| 3 | Recognizable as same type, needs moderate work |
| 2 | Wrong character but usable as starting point |
| 1 | Completely different, not useful |

### Metrics Tracking Template

```markdown
| Test ID | ADSR Avg | Filter | Waveform | Mod | Overall | Usability |
|---------|----------|--------|----------|-----|---------|-----------|
| T01     | 85%      | 90%    | 100%     | N/A | 91%     | 5         |
| T02     | 72%      | 85%    | 85%      | N/A | 81%     | 4         |
| ...     | ...      | ...    | ...      | ... | ...     | ...       |
```

---

## 5. Parameter Mapping Reference

### Envelope Time Conversion

```javascript
// Our analysis outputs milliseconds
// Vital uses seconds (0.0 - 4.0 range, can be higher)

// Analysis -> Vital
vital_attack = analysis_attack_ms / 1000;
vital_decay = analysis_decay_ms / 1000;
vital_release = analysis_release_ms / 1000;

// Vital -> Analysis (for verification)
analysis_attack_ms = vital_attack * 1000;
```

**Vital Envelope Ranges:**
- Attack: 0.0 - 4.0+ seconds (default 0.149)
- Decay: 0.0 - 4.0+ seconds (default 1.0)
- Sustain: 0.0 - 1.0 (default 1.0, represents percentage)
- Release: 0.0 - 4.0+ seconds (default 0.547)

### Sustain Conversion

```javascript
// Our analysis outputs 0-100 (percentage)
// Vital uses 0.0-1.0

// Analysis -> Vital
vital_sustain = analysis_sustain / 100;

// Vital -> Analysis
analysis_sustain = vital_sustain * 100;
```

### Filter Cutoff Conversion

```javascript
// Our analysis outputs Hz
// Vital uses semitones (MIDI note-like, 8-136 range)

// Hz -> Vital semitone cutoff
function hzToVitalCutoff(hz) {
  // Formula: semitones = 12 * log2(hz / 440) + 69
  // 69 = A4 (440Hz) in MIDI
  return 12 * Math.log2(hz / 440) + 69;
}

// Vital cutoff -> Hz
function vitalCutoffToHz(semitones) {
  return 440 * Math.pow(2, (semitones - 69) / 12);
}

// Reference points:
// 36 semitones ≈ 100 Hz
// 60 semitones ≈ 400 Hz (middle C)
// 72 semitones ≈ 600 Hz
// 84 semitones ≈ 1200 Hz
// 95 semitones ≈ 2000 Hz
// 108 semitones ≈ 4000 Hz
// 120 semitones ≈ 8000 Hz
```

### Waveform Frame Mapping

```javascript
// Vital Basic wavetable frame positions (0-127)
const WAVEFORM_FRAMES = {
  sine: 0,
  triangle: 32,
  saw: 64,
  square: 96,
  pulse: 108,  // narrow pulse
  noise: 127,
};

// Our detection -> Vital frame
function waveformToFrame(type) {
  return WAVEFORM_FRAMES[type.toLowerCase()] ?? 48; // default to mid
}
```

### LFO Rate Conversion

```javascript
// Our analysis outputs Hz
// Vital LFO frequency is in Hz (when sync is off)
// No conversion needed, but clamp to valid range

function analysisLFOToVital(hz) {
  return Math.max(0.01, Math.min(20, hz)); // Vital range: 0.01-20Hz typical
}
```

### Resonance Mapping

```javascript
// Both use 0.0-1.0 range
// Direct mapping, no conversion needed

// Note: Vital resonance at 0.7+ can self-oscillate
// Our analysis caps practical resonance around 0.6
```

### Complete Parameter Reference Table

| Our Analysis | Vital Parameter | Conversion | Notes |
|--------------|-----------------|------------|-------|
| `adsr.attack` (ms) | `env_1_attack` (s) | `/ 1000` | Cap at 4.0 |
| `adsr.decay` (ms) | `env_1_decay` (s) | `/ 1000` | Cap at 4.0 |
| `adsr.sustain` (0-100) | `env_1_sustain` (0-1) | `/ 100` | Direct ratio |
| `adsr.release` (ms) | `env_1_release` (s) | `/ 1000` | Cap at 4.0 |
| `filterEnvelope.estimatedCutoff` (Hz) | `filter_1_cutoff` (st) | `hzToVitalCutoff()` | 8-136 range |
| `filterEnvelope.resonanceIndicator` (0-100) | `filter_1_resonance` (0-1) | `/ 100` | Cap at 0.7 |
| `waveformType.type` | `osc_1_wave_frame` (0-127) | Frame lookup | See table above |
| `modulation.lfoRate` (Hz) | `lfo_1_frequency` (Hz) | Direct | No conversion |
| `modulation.tremoloDepth` (0-100) | Mod amount (0-1) | `/ 100 * 0.5` | Scale for subtlety |
| `brightness` (0-1) | `filter_1_cutoff` | Fallback calc | When no filter data |
| `spectralCentroid` (Hz) | `filter_1_cutoff` | `hz * 1.5 -> hzToVitalCutoff()` | Secondary fallback |

---

## 6. Known Limitations

### What We CANNOT Detect

#### Pitch Envelopes
- **Limitation**: We do not detect pitch modulation over time
- **Impact**: Kick drum pitch drops, 808 slides, pitch bend automation
- **Workaround**: Manual adjustment after export

#### Specific Wavetable Position
- **Limitation**: We detect basic waveform types (sine, saw, square, triangle)
- **Impact**: Cannot distinguish between different wavetables or morphed positions
- **Workaround**: Preset uses "Basic Shapes" wavetable, user can swap

#### Unison Detune Amount
- **Limitation**: We detect "chorus" broadly, not specific detune amounts
- **Impact**: Exported preset uses conservative defaults (3-5 cents)
- **Workaround**: Adjust `osc_1_unison_detune` manually

#### Number of Unison Voices
- **Limitation**: Cannot detect voice count
- **Impact**: Uses instrument-appropriate defaults (1-5 voices)
- **Workaround**: Adjust `osc_1_unison_voices` manually

#### Effects Parameters
- **Limitation**: Cannot detect specific reverb size, delay time, etc.
- **Impact**: Effects are either on/off or use generic settings
- **Workaround**: Use preset as starting point, dial in effects

#### Filter Model/Type
- **Limitation**: Cannot distinguish between filter types (analog, digital, ladder, etc.)
- **Impact**: Uses instrument-appropriate defaults
- **Workaround**: Experiment with `filter_1_model` values (0-6)

#### Stereo Width/Spread
- **Limitation**: Stereo analysis not implemented
- **Impact**: Uses instrument-appropriate defaults
- **Workaround**: Adjust `osc_1_stereo_spread` manually

#### Second Oscillator Content
- **Limitation**: Cannot separate oscillators in mixed signal
- **Impact**: May miss sub-oscillators, layered sounds
- **Workaround**: Foundation presets include appropriate Osc2 for instrument type

#### Specific LFO Waveform
- **Limitation**: Detect LFO rate, not shape (sine, saw, etc.)
- **Impact**: Defaults to sine LFO
- **Workaround**: Adjust `lfo_1_shape` manually

#### Velocity/Keytrack Modulation
- **Limitation**: Single-note analysis doesn't reveal these
- **Impact**: No velocity sensitivity or keytracking
- **Workaround**: Standard synth settings, manual adjustment

### Detection Reliability by Sound Type

| Sound Type | Detection Reliability | Notes |
|------------|----------------------|-------|
| Single synth note | High (70%+) | Best case scenario |
| Isolated stem | Medium-High (60%) | Some bleed affects results |
| Full mix | Low (20%) | Multiple instruments confuse analysis |
| Drums | Medium (50%) | Transients detected well, pitch poorly |
| Vocals | Low (30%) | Highly complex, variable harmonics |

### Analysis Algorithm Limitations

| Algorithm | Limitation | Impact |
|-----------|-----------|--------|
| ADSR Detection | Assumes single attack/decay/release | Fails on multi-stage envelopes |
| BPM Detection | Works best 60-200 BPM | May miss very slow or very fast tempos |
| Key Detection | Assumes single key center | Modulating tracks give poor results |
| Waveform Detection | Based on harmonic ratios | Processed/effected sounds lose accuracy |
| Filter Sweep | Measures spectral centroid movement | Doesn't detect filter type or curve |

---

## 7. Test Results Tracking

### Spreadsheet Template

Create a Google Sheet or Excel file with these columns:

| Column | Description |
|--------|-------------|
| Test ID | T01, T02, etc. |
| Test Name | sine-kick, saw-bass, etc. |
| Test Date | YYYY-MM-DD |
| App Version | Git commit hash or version |
| Attack Error % | Calculated |
| Decay Error % | Calculated |
| Sustain Error % | Calculated |
| Release Error % | Calculated |
| ADSR Avg % | Average of above |
| Filter Cutoff Error (st) | Semitone difference |
| Filter Res Error | 0-1 scale |
| Waveform Correct | Yes/No |
| Waveform Frame Error | 0-127 |
| LFO Rate Error (Hz) | If applicable |
| Modulation Detected | Yes/No/N/A |
| Overall Score % | Composite |
| Usability Score | 1-5 |
| Notes | Observations |

### Progress Tracking

Track improvement over time:

```
Version 1.0.0: Avg Overall = 45%
  - Major issues: ADSR wildly off, waveform detection poor

Version 1.1.0: Avg Overall = 62%
  - Fixes: ADSR ms->s conversion, reliability weighting

Version 1.2.0: Avg Overall = 75%
  - Fixes: Filter cutoff Hz->semitone, waveform frame mapping
```

### Regression Testing

After any change to `vitalPresetGenerator.js`:

1. Run all 10 test cases
2. Compare to previous best scores
3. Flag any regression > 5%
4. Document fixes in CHANGELOG

### Test Asset Location

```
audio-analyzer-pro/
├── test-assets/           # Ground truth files
│   ├── test-T01-sine-kick.vital
│   ├── test-T01-sine-kick.wav
│   ├── test-T02-saw-bass.vital
│   ├── test-T02-saw-bass.wav
│   └── ...
├── test-results/          # Exported presets from app
│   ├── 2024-01-15/
│   │   ├── test-T01-sine-kick-exported.vital
│   │   ├── test-T02-saw-bass-exported.vital
│   │   └── results.md
│   └── ...
└── scripts/
    ├── compare-vital-presets.js
    └── run-all-tests.sh
```

---

## Appendix A: Vital Parameter Quick Reference

### Oscillator Parameters
```
osc_1_on: 0.0 or 1.0
osc_1_level: 0.0 - 1.0
osc_1_wave_frame: 0 - 255 (wavetable position)
osc_1_transpose: -48 to +48 semitones
osc_1_tune: -1.0 to 1.0 (fine tune, 1 = 1 semitone)
osc_1_unison_voices: 1 - 16
osc_1_unison_detune: 0 - 100 cents
osc_1_stereo_spread: 0.0 - 1.0
```

### Filter Parameters
```
filter_1_on: 0.0 or 1.0
filter_1_cutoff: 8 - 136 (semitones from ~8Hz to ~21kHz)
filter_1_resonance: 0.0 - 1.0
filter_1_model: 0=Analog, 1=Dirty, 2=Ladder, 3=Digital, 4=Diode, 5=Formant, 6=Comb
filter_1_style: 0=12dB, 1=24dB, 2=BP, 3=Notch, 4=HP
filter_1_drive: 0.0 - 1.0
```

### Envelope Parameters
```
env_1_attack: 0.0 - 4.0+ seconds
env_1_decay: 0.0 - 4.0+ seconds
env_1_sustain: 0.0 - 1.0
env_1_release: 0.0 - 4.0+ seconds
env_1_attack_power: -8.0 to 8.0 (curve shape)
env_1_decay_power: -8.0 to 8.0
env_1_release_power: -8.0 to 8.0
```

### LFO Parameters
```
lfo_1_frequency: 0.0 - 20.0 Hz (when not synced)
lfo_1_sync: 0.0 or 1.0
lfo_1_tempo: 0 - 12 (tempo sync division)
lfo_1_phase: 0.0 - 1.0
lfo_1_shape: 0.0 - 1.0 (morphs between shapes)
```

### Effect Parameters
```
chorus_on: 0.0 or 1.0
chorus_dry_wet: 0.0 - 1.0

reverb_on: 0.0 or 1.0
reverb_dry_wet: 0.0 - 1.0
reverb_size: 0.0 - 1.0
reverb_decay_time: 0.0 - 1.0

distortion_on: 0.0 or 1.0
distortion_mix: 0.0 - 1.0
distortion_type: 0 - 5
```

---

## Appendix B: Frequency to Vital Cutoff Reference Table

| Frequency (Hz) | Vital Cutoff (semitones) | Musical Note |
|----------------|-------------------------|--------------|
| 50 | 22 | ~G1 |
| 80 | 30 | ~D#2 |
| 100 | 33 | ~G2 |
| 150 | 40 | ~D3 |
| 200 | 45 | ~G3 |
| 300 | 52 | ~D4 |
| 400 | 57 | ~G4 |
| 500 | 60 | ~B4 |
| 600 | 63 | ~D#5 |
| 800 | 67 | ~G5 |
| 1000 | 71 | ~B5 |
| 1500 | 77 | ~F#6 |
| 2000 | 81 | ~B6 |
| 3000 | 88 | ~F#7 |
| 4000 | 93 | ~B7 |
| 6000 | 100 | ~F#8 |
| 8000 | 105 | ~B8 |
| 10000 | 108 | ~D9 |
| 12000 | 111 | ~F9 |
| 16000 | 116 | ~B9 |
| 20000 | 120 | ~D#10 |

---

*Last updated: 2026-01-30*
*Version: 1.0.0*
