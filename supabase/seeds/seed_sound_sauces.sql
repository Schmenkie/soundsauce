-- ============================================
-- SoundSauce Seed Data: 25 Iconic Sound Sauces
-- ============================================
-- BEFORE RUNNING: Replace the user_id with your admin user's UUID.
-- Find it in Supabase Dashboard > Authentication > Users
--
-- Usage:
--   1. Get your user UUID from Supabase Auth
--   2. Replace 'YOUR_USER_ID_HERE' below with that UUID
--   3. Run in Supabase SQL Editor
-- ============================================

-- Set the user_id for all seed entries
DO $$
DECLARE
  seed_user_id uuid := '9c0f4ab3-f60a-43f3-a5d0-20023db2b499'; -- REPLACE THIS
BEGIN

-- 1. 808 Bass (Trap)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  '808 Bass (Trap)',
  'The iconic 808 bass sound that defines modern trap music. A deep, sub-heavy sine wave with a pitch envelope click at the top, long sustain, and heavy saturation for presence on small speakers. Think Metro Boomin, Southside, and every trap beat since 2012.',
  ARRAY['Bass', 'Trap', 'Hip-Hop'],
  'Bass',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.385",
      "brightness": "0.118",
      "spectralCentroid": "245.6",
      "harmonicity": "0.942",
      "attackTime": "8.5",
      "bpm": {"bpm": 140, "suggestedTempo": 140, "tempoRange": {"min": 135, "max": 145}, "confidence": 0.88},
      "key": {"key": "C", "mode": "minor", "scale": "C minor", "camelot": "5A", "confidence": 0.91, "notes": ["C","D","Eb","F","G","Ab","Bb"], "compatibleKeys": [{"code":"5A","relation":"Same key"},{"code":"6B","relation":"Perfect fourth"},{"code":"4A","relation":"Perfect fifth"}]},
      "adsr": {"attack": 5, "decay": 80, "sustain": 0.85, "release": 1200},
      "waveform": {"type": "sine", "confidence": 94, "description": "Pure sine wave with harmonic distortion", "fundamentalFreq": 65.41, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":12},{"harmonic":3,"amplitude":8},{"harmonic":4,"amplitude":4}]},
      "filterEnvelope": {"estimatedCutoff": 200, "filterAttack": 2, "filterDecay": 30, "resonanceIndicator": 10, "sweepDirection": "closing"},
      "modulation": {"lfoRate": 0, "tremoloDepth": 0, "vibratoDepth": 0, "chorusAmount": 0, "hasModulation": false},
      "harmonics": [{"frequency":65.41,"note":"C2","amplitude":1.0},{"frequency":130.81,"note":"C3","amplitude":0.12}]
    },
    "recommendations": {
      "synthType": ["Start with a pure sine wave oscillator — this is the foundation of every 808", "Add a pitch envelope: set it to drop from +12 semitones down to 0 over about 50ms — this creates the signature 808 click at the start of each note", "Use long notes (half notes or whole notes) and let the tail ring out — 808s are all about that sustained low end", "Layer a short kick sample on top for the initial transient punch if needed"],
      "vstSuggestions": ["Vital (Free) — use the sine oscillator with pitch envelope", "FL Studio: 3x Osc (set all three to sine, detune off)"],
      "nativeInstruments": ["FL Studio: 3x Osc with sine wave", "FL Studio: Sytrus (operator 1 set to sine, ratio 1.000)", "Ableton: Operator (single sine oscillator)"],
      "oscillatorSettings": ["Set oscillator to pure sine wave — no other waveform needed", "In Vital: use the Init preset, set OSC 1 to basic sine", "In 3x Osc: set all three oscillators to sine, turn OSC 2 and 3 volume to 0", "Pitch envelope: +12 semitones with ~50ms decay for the click, or +24 for a more aggressive attack"],
      "filterSettings": ["Low-pass filter around 180-220Hz to remove any unwanted harmonics", "Keep resonance very low (under 10%) — you want clean sub, not a resonant sweep", "No filter envelope needed — the 808 tone stays consistent after the pitch drop"],
      "envelopeSettings": ["Attack: 0-5ms (instant hit)", "Decay: 50-100ms (for the pitch envelope drop)", "Sustain: 85-100% (the 808 rings out at full level)", "Release: 800-1500ms (long tail that fades naturally)", "Tip: The release time is what gives 808s their characteristic sustain — experiment between 800ms and 2 seconds"],
      "modulationSettings": ["No modulation needed for a classic 808", "The pitch envelope IS the modulation — it handles the click-to-boom transition"],
      "eqSettings": ["High-pass at 25Hz to remove inaudible rumble that eats headroom", "Gentle boost at 50-80Hz for weight (only if needed)", "Cut everything above 250Hz — 808s should live purely in the sub range"],
      "effects": ["Add soft saturation or light distortion (Fruity Soft Clipper in FL Studio) to add harmonics that make the 808 audible on phone speakers and earbuds", "Sidechain compress to your kick drum at 4:1 ratio with fast attack (1ms) and ~150ms release", "Optional: Fruity Limiter on the 808 channel to control peaks"],
      "mixTips": ["Keep your 808 mono — stereo width on sub frequencies causes phase cancellation and lost energy", "Use a spectrum analyzer (like SPAN, free) to make sure your 808 sits below 200Hz", "The 808 and kick should never play at the exact same time — either sidechain or offset them", "Turn off any stereo widening plugins on the 808 bus", "Reference your mix on earbuds — if you can hear the 808 clearly, your saturation is set right"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Bass", "confidence": 96}, {"name": "Sub-bass", "confidence": 91}],
      "polyphony": "mono",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '24 days'
);

-- 2. Reese Bass (DnB)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Reese Bass (DnB)',
  'The thick, detuned Reese bass that powers drum and bass and dubstep. Named after Kevin Saunderson''s track "Just Want Another Chance," this sound is built from two or more detuned saw waves that create a churning, phasing texture. Essential for any DnB producer.',
  ARRAY['Bass', 'DnB', 'Dubstep'],
  'Bass',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.342",
      "brightness": "0.285",
      "spectralCentroid": "842.5",
      "harmonicity": "0.634",
      "attackTime": "15.2",
      "bpm": {"bpm": 174, "suggestedTempo": 174, "tempoRange": {"min": 170, "max": 178}, "confidence": 0.94},
      "key": {"key": "F", "mode": "minor", "scale": "F minor", "camelot": "4A", "confidence": 0.82, "notes": ["F","G","Ab","Bb","C","Db","Eb"], "compatibleKeys": [{"code":"4A","relation":"Same key"},{"code":"5B","relation":"Perfect fourth"},{"code":"3A","relation":"Perfect fifth"}]},
      "adsr": {"attack": 12, "decay": 200, "sustain": 0.78, "release": 350},
      "waveform": {"type": "saw", "confidence": 88, "description": "Detuned sawtooth waves", "fundamentalFreq": 87.31, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":52},{"harmonic":3,"amplitude":35},{"harmonic":4,"amplitude":26},{"harmonic":5,"amplitude":21}]},
      "filterEnvelope": {"estimatedCutoff": 1800, "filterAttack": 5, "filterDecay": 120, "resonanceIndicator": 35, "sweepDirection": "closing"},
      "modulation": {"lfoRate": 0.3, "tremoloDepth": 0.08, "vibratoDepth": 0.02, "chorusAmount": 0.45, "hasModulation": true},
      "harmonics": [{"frequency":87.31,"note":"F2","amplitude":1.0},{"frequency":174.61,"note":"F3","amplitude":0.52},{"frequency":261.63,"note":"C4","amplitude":0.35},{"frequency":349.23,"note":"F4","amplitude":0.26}]
    },
    "recommendations": {
      "synthType": ["Use two sawtooth oscillators detuned against each other — this is the entire foundation of a Reese bass", "Detune one oscillator +7 to +15 cents and the other -7 to -15 cents for that thick, churning movement", "Add unison voices (2-4 per oscillator) with moderate detune for extra width and thickness", "Run it through a low-pass filter and automate the cutoff for movement during your track"],
      "vstSuggestions": ["Vital (Free) — two saw oscillators with unison detune", "Serum (Xfer Records) — classic for Reese basses with its clean unison"],
      "nativeInstruments": ["FL Studio: 3x Osc (two saws, one detuned)", "FL Studio: Sytrus (two operators with saw partials, slight detune)", "Ableton: Analog (two saw oscillators, fine-tune offset)"],
      "oscillatorSettings": ["OSC 1: Sawtooth wave, no detune (this is your anchor)", "OSC 2: Sawtooth wave, detuned +10 to +15 cents from OSC 1", "In Vital: turn on Unison for each oscillator (set to 2-4 voices, detune around 30-50%)", "Mix both oscillators at equal volume for the most balanced phasing effect", "Optional: add a sub oscillator (sine, one octave down) for low-end weight"],
      "filterSettings": ["Low-pass filter with cutoff around 1200-2000Hz", "Resonance at 25-40% to add some bite to the filter movement", "Automate the filter cutoff slowly over 4-8 bars for that classic Reese sweep", "Use a 24dB/oct (4-pole) filter slope for a more aggressive sound"],
      "envelopeSettings": ["Attack: 10-20ms (slightly soft to avoid clicks)", "Decay: 150-250ms", "Sustain: 75-85% (keep it full and sustained)", "Release: 200-400ms (medium tail)"],
      "modulationSettings": ["Route an LFO to filter cutoff at a very slow rate (0.2-0.5 Hz) for subtle movement", "The detuning between oscillators creates natural phasing — you do not need chorus on top", "For more intensity, automate the detune amount itself during drops"],
      "eqSettings": ["High-pass at 30Hz to clean up sub rumble", "Cut a narrow notch around 300-400Hz if it sounds muddy", "Gentle boost around 800-1200Hz for presence and growl"],
      "effects": ["Light distortion or saturation to add grit (Fruity Soft Clipper or CamelCrusher, free)", "Do NOT add chorus — the detuned oscillators already create that effect", "Compression with medium attack (30ms) to let the transient through, 4:1 ratio", "Short reverb (under 1 second) just to add a touch of space"],
      "mixTips": ["Keep the sub frequencies (below 150Hz) mono — use a mid/side EQ to collapse the low end", "The stereo width from detuning should live in the mids (200Hz-2kHz), not the subs", "Sidechain to your kick and snare to keep the drums punching through", "Use a spectrum analyzer to make sure the Reese is not masking your kick drum", "Automate the filter cutoff to open during drops and close during breakdowns"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Bass", "confidence": 93}, {"name": "Sub-bass", "confidence": 72}],
      "polyphony": "mono",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '23 days'
);

-- 3. Supersaw Lead (EDM)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Supersaw Lead (EDM)',
  'The massive, wide supersaw lead that defines EDM anthems and trance buildups. Built from multiple detuned sawtooth waves stacked together, this sound fills the entire stereo field. Used by Martin Garrix, Avicii, and countless festival producers for those euphoric, soaring melodies.',
  ARRAY['Lead', 'EDM', 'Trance'],
  'Lead',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.312",
      "brightness": "0.645",
      "spectralCentroid": "3250.8",
      "harmonicity": "0.712",
      "attackTime": "22.4",
      "bpm": {"bpm": 128, "suggestedTempo": 128, "tempoRange": {"min": 124, "max": 132}, "confidence": 0.95},
      "key": {"key": "A", "mode": "minor", "scale": "A minor", "camelot": "8A", "confidence": 0.86, "notes": ["A","B","C","D","E","F","G"], "compatibleKeys": [{"code":"8A","relation":"Same key"},{"code":"9B","relation":"Perfect fourth"},{"code":"7A","relation":"Perfect fifth"}]},
      "adsr": {"attack": 18, "decay": 180, "sustain": 0.68, "release": 420},
      "waveform": {"type": "saw", "confidence": 91, "description": "Stacked detuned sawtooth waves", "fundamentalFreq": 440.0, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":48},{"harmonic":3,"amplitude":32},{"harmonic":4,"amplitude":24},{"harmonic":5,"amplitude":19},{"harmonic":6,"amplitude":16}]},
      "filterEnvelope": {"estimatedCutoff": 6500, "filterAttack": 10, "filterDecay": 80, "resonanceIndicator": 22, "sweepDirection": "stable"},
      "modulation": {"lfoRate": 0, "tremoloDepth": 0, "vibratoDepth": 0, "chorusAmount": 0.62, "hasModulation": true},
      "harmonics": [{"frequency":440.0,"note":"A4","amplitude":1.0},{"frequency":880.0,"note":"A5","amplitude":0.48},{"frequency":1320.0,"note":"E6","amplitude":0.32},{"frequency":1760.0,"note":"A6","amplitude":0.24}]
    },
    "recommendations": {
      "synthType": ["Stack 5-7 sawtooth waves with increasing amounts of detune — this is the secret to a supersaw", "The width comes from unison voices, not from stereo effects", "Layer two instances: one with heavy unison for width, one clean mono saw for center weight", "Use a high-pass filter to keep the low end clean — supersaws should sit above 200Hz"],
      "vstSuggestions": ["Vital (Free) — up to 16 unison voices per oscillator, perfect for supersaws", "Serum (Xfer Records) — industry standard for this sound"],
      "nativeInstruments": ["FL Studio: 3x Osc (all three on saw, detune coarse and fine)", "FL Studio: Sytrus (additive saw with unison)", "Ableton: Analog (two saw oscillators + chorus for width)"],
      "oscillatorSettings": ["OSC 1: Sawtooth wave with 7 unison voices, detune at 35-50%", "OSC 2: Sawtooth wave one octave up (+12 semitones), 3-5 unison voices, detune at 20-30%", "In Vital: set unison voices to 7, detune to ~40%, set unison blend to around 70%", "In 3x Osc: Set all three to saw, spread the coarse tuning (0, +12, -12 semitones), fine-tune detune each slightly"],
      "filterSettings": ["Low-pass filter at 5000-7000Hz — enough to be bright but not harsh", "Very light resonance (10-20%) — supersaws should be smooth, not peaky", "Optional: gentle high-pass at 150-200Hz to leave room for your bass"],
      "envelopeSettings": ["Attack: 15-25ms (slightly soft for that smooth fade-in feel)", "Decay: 150-200ms", "Sustain: 65-75% (sustained but with some dynamic shape)", "Release: 350-500ms (let the reverb tail breathe)", "Tip: shorter attack (5ms) for a more aggressive, plucky supersaw stab"],
      "modulationSettings": ["The unison detune IS the modulation — it creates the chorus-like width", "Do not add an LFO to pitch — supersaws should be stable and huge, not wobbly", "Optional: very slow filter LFO (0.1 Hz) for subtle brightness animation over long notes"],
      "eqSettings": ["High-pass at 150-200Hz to leave room for kick and bass", "Boost around 3-5kHz for presence and cut-through", "Cut around 400-600Hz if it sounds boxy or muddy", "Gentle shelf boost above 8kHz for air and sparkle"],
      "effects": ["Reverb is essential — use a medium hall (1.5-2.5 second decay) with ~30% wet", "Stereo widener on the mid and high frequencies only (keep lows mono)", "Sidechain compress to your kick for that classic pumping effect (4:1 ratio, 150ms release)", "Optional: subtle delay (1/8 note, 15-20% wet) for rhythmic interest"],
      "mixTips": ["Layer a mono saw underneath your wide supersaw — this anchors the sound in the center while the unison voices spread wide", "Use mid/side EQ: cut lows from the sides, boost presence in the mids", "Automate the filter cutoff in your buildup — slowly open from 1kHz to full open for maximum impact at the drop", "Sidechain compression is not optional — without it the supersaw will fight your kick drum", "Bus your supersaw layers together and process as one unit for cohesion"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Lead", "confidence": 94}, {"name": "Pad", "confidence": 45}],
      "polyphony": "poly",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '22 days'
);

-- 4. Pluck Synth (Future Bass)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Pluck Synth (Future Bass)',
  'A short, bright pluck sound used in future bass chord progressions. Think Flume, San Holo, and Illenium — those quick, sparkly stabs that play lush 7th chords. The secret is a fast attack, quick decay, and enough brightness to cut through a busy mix.',
  ARRAY['Pluck', 'Future Bass', 'Pop'],
  'Pluck',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.228",
      "brightness": "0.582",
      "spectralCentroid": "2980.4",
      "harmonicity": "0.768",
      "attackTime": "3.1",
      "bpm": {"bpm": 150, "suggestedTempo": 150, "tempoRange": {"min": 145, "max": 155}, "confidence": 0.87},
      "key": {"key": "G", "mode": "major", "scale": "G major", "camelot": "9B", "confidence": 0.84, "notes": ["G","A","B","C","D","E","F#"], "compatibleKeys": [{"code":"9B","relation":"Same key"},{"code":"10B","relation":"Perfect fourth"},{"code":"8B","relation":"Perfect fifth"}]},
      "adsr": {"attack": 2, "decay": 120, "sustain": 0.08, "release": 280},
      "waveform": {"type": "saw", "confidence": 82, "description": "Bright sawtooth with fast decay", "fundamentalFreq": 392.0, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":45},{"harmonic":3,"amplitude":30},{"harmonic":4,"amplitude":22},{"harmonic":5,"amplitude":15}]},
      "filterEnvelope": {"estimatedCutoff": 5200, "filterAttack": 1, "filterDecay": 80, "resonanceIndicator": 30, "sweepDirection": "closing"},
      "modulation": {"lfoRate": 0, "tremoloDepth": 0, "vibratoDepth": 0, "chorusAmount": 0.15, "hasModulation": false},
      "harmonics": [{"frequency":392.0,"note":"G4","amplitude":1.0},{"frequency":784.0,"note":"G5","amplitude":0.45},{"frequency":1176.0,"note":"D6","amplitude":0.30}]
    },
    "recommendations": {
      "synthType": ["The pluck sound is all about the envelope — fast attack, fast decay, almost no sustain", "Start with a sawtooth oscillator and shape it entirely with the amp and filter envelopes", "Play chords (try maj7, min7, add9) — plucks sound best with rich harmony, not single notes", "Layer a noise burst on top for extra attack sparkle"],
      "vstSuggestions": ["Vital (Free) — great pluck presets in the factory library to study", "Serum (Xfer Records)"],
      "nativeInstruments": ["FL Studio: 3x Osc (saw wave + fast envelope)", "FL Studio: Sytrus (excellent for plucks with its fast envelopes)", "Ableton: Wavetable (saw with quick amp envelope)"],
      "oscillatorSettings": ["OSC 1: Sawtooth wave with 2-4 unison voices, light detune (15-25%)", "OSC 2: Square wave one octave up (+12), very low volume (20-30%) for added brightness", "The oscillator choice matters less than the envelope for plucks — the envelope does all the work"],
      "filterSettings": ["Low-pass filter starting at ~5000Hz", "Filter envelope: fast attack (1ms), decay around 60-100ms, sustain at 0%", "This makes the sound start bright and quickly get darker — that is the pluck character", "Resonance at 25-35% adds a nice peak during the filter sweep"],
      "envelopeSettings": ["Attack: 0-3ms (instant — plucks must hit immediately)", "Decay: 80-150ms (this is the most important parameter — it controls how long the pluck rings)", "Sustain: 0-10% (plucks should not sustain — they are meant to be short)", "Release: 200-350ms (a little tail for the reverb to catch)", "Tip: longer decay (200ms+) makes it more pad-like, shorter (50ms) makes it more percussive"],
      "modulationSettings": ["No LFO needed — plucks are too short for modulation to be noticeable", "If you want subtle movement across a chord progression, try very slow (0.1Hz) filter cutoff modulation"],
      "eqSettings": ["High-pass at 200Hz — plucks should sit above the bass", "Boost around 2-4kHz for that sparkling presence", "Cut any mud around 300-500Hz"],
      "effects": ["Reverb is essential — medium plate or hall (1.5-2s decay), 35-45% wet", "The reverb fills in the gaps that the short decay creates", "Chorus or slight detune (OTT-style) for that future bass shimmer", "Sidechain to kick for rhythmic pumping", "Try OTT (multiband compression) at 20-40% dry/wet — this is the secret sauce for future bass plucks"],
      "mixTips": ["Play full chords (4+ notes) — plucks sound thin as single notes", "Use velocity variation between notes for a more human, musical feel", "Stack two pluck layers: one bright (high-passed at 500Hz) and one warm (low-passed at 2kHz)", "Pan different chord voicings slightly left and right for width", "The reverb tail IS the sound — do not skimp on it, but keep it controlled with pre-delay (20-30ms)"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Pluck", "confidence": 91}, {"name": "Lead", "confidence": 38}],
      "polyphony": "poly",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '21 days'
);

-- 5. Wobble Bass (Dubstep)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Wobble Bass (Dubstep)',
  'The classic LFO-modulated wobble bass that defined early dubstep. Popularized by artists like Skream, Rusko, and early Skrillex, this sound uses a low-frequency oscillator (LFO) to rhythmically open and close a filter on a bass tone, creating that signature "wub wub wub" effect.',
  ARRAY['Bass', 'Dubstep', 'Electronic'],
  'Bass',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.368",
      "brightness": "0.392",
      "spectralCentroid": "1450.2",
      "harmonicity": "0.588",
      "attackTime": "10.8",
      "bpm": {"bpm": 140, "suggestedTempo": 140, "tempoRange": {"min": 136, "max": 144}, "confidence": 0.91},
      "key": {"key": "D", "mode": "minor", "scale": "D minor", "camelot": "7A", "confidence": 0.79, "notes": ["D","E","F","G","A","Bb","C"], "compatibleKeys": [{"code":"7A","relation":"Same key"},{"code":"8B","relation":"Perfect fourth"},{"code":"6A","relation":"Perfect fifth"}]},
      "adsr": {"attack": 8, "decay": 150, "sustain": 0.82, "release": 200},
      "waveform": {"type": "saw", "confidence": 85, "description": "Sawtooth with LFO filter modulation", "fundamentalFreq": 73.42, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":55},{"harmonic":3,"amplitude":38},{"harmonic":4,"amplitude":28},{"harmonic":5,"amplitude":20},{"harmonic":6,"amplitude":15}]},
      "filterEnvelope": {"estimatedCutoff": 3200, "filterAttack": 3, "filterDecay": 200, "resonanceIndicator": 55, "sweepDirection": "closing"},
      "modulation": {"lfoRate": 4.0, "tremoloDepth": 0.15, "vibratoDepth": 0.05, "chorusAmount": 0.12, "hasModulation": true},
      "harmonics": [{"frequency":73.42,"note":"D2","amplitude":1.0},{"frequency":146.83,"note":"D3","amplitude":0.55},{"frequency":220.0,"note":"A3","amplitude":0.38},{"frequency":293.66,"note":"D4","amplitude":0.28}]
    },
    "recommendations": {
      "synthType": ["The wobble is just an LFO modulating a filter cutoff — that is literally the whole trick", "Start with a harmonically rich oscillator (saw or square) so the filter has something to work with", "Sync the LFO rate to your project tempo so the wobble grooves with the beat", "Experiment with LFO shapes: sine for smooth wobbles, square for choppy on/off gating"],
      "vstSuggestions": ["Vital (Free) — drag LFO to filter cutoff, done", "Serum (Xfer Records) — custom LFO shapes for complex wobbles"],
      "nativeInstruments": ["FL Studio: 3x Osc + Fruity Love Philter (LFO to cutoff)", "FL Studio: Sytrus (built-in filter with modulatable cutoff)", "Ableton: Operator + Auto Filter (LFO rate synced to tempo)"],
      "oscillatorSettings": ["OSC 1: Sawtooth wave — rich in harmonics, gives the filter plenty to shape", "OSC 2: Square wave, same octave, at about 30% volume for extra thickness", "Optional: add a sub oscillator (sine, -12 semitones) for low-end weight underneath the wobble", "Keep it monophonic (one note at a time) with glide/portamento at 30-50ms"],
      "filterSettings": ["Low-pass filter is essential — set base cutoff around 200-400Hz", "Resonance at 40-60% — this is what gives the wobble its vocal, screaming quality", "The LFO will sweep the cutoff from your base (200Hz) up to about 3000-5000Hz", "Use a 24dB/oct (4-pole) filter for a more dramatic sweep"],
      "envelopeSettings": ["Attack: 5-10ms (fast but not clicking)", "Decay: 100-200ms", "Sustain: 80-90% (keep it sustained — the LFO handles the dynamics)", "Release: 150-250ms"],
      "modulationSettings": ["Route LFO 1 to filter cutoff — this is the wobble", "LFO rate: sync to tempo at 1/4 note for standard wobble, 1/8 for double-time, 1/2 for half-time", "LFO shape: start with sine for a smooth wobble, then try triangle and square", "LFO depth: 60-80% of the filter range", "Tip: automate the LFO rate — speed it up during builds, slow it down during breakdowns"],
      "eqSettings": ["High-pass at 30Hz to remove sub rumble", "Cut around 300-400Hz if the wobble sounds muddy when the filter is closing", "Boost at 1-2kHz for midrange presence"],
      "effects": ["Distortion or saturation before the filter for a grittier, more aggressive tone", "Compression with fast attack to even out the wobble dynamics (4:1 ratio)", "Short reverb (0.5-1s) just to add space — too much reverb will blur the wobble rhythm", "Sidechain to kick drum — essential in dubstep"],
      "mixTips": ["The wobble should be the loudest element in your mix during the drop (besides the kick)", "Keep sub frequencies mono, let the wobble midrange be stereo", "Use a multiband compressor to tame the resonance peak without killing the wobble character", "Automate the LFO rate throughout your track — a static wobble gets boring fast", "Layer a clean sub bass underneath that does NOT wobble — the sub stays constant while the midrange wobbles"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Bass", "confidence": 92}, {"name": "Lead", "confidence": 35}],
      "polyphony": "mono",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '20 days'
);

-- 6. Pad Synth (Ambient)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Pad Synth (Ambient)',
  'A lush, evolving pad sound perfect for ambient music, lo-fi beats, and cinematic underscore. Pads are the background "bed" of a track — they fill space, create atmosphere, and glue everything together. This one uses slow-moving filters and gentle modulation for a dreamy, floating quality.',
  ARRAY['Pad', 'Ambient', 'Chill'],
  'Pad',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.195",
      "brightness": "0.348",
      "spectralCentroid": "1680.5",
      "harmonicity": "0.815",
      "attackTime": "285.0",
      "bpm": {"bpm": 90, "suggestedTempo": 90, "tempoRange": {"min": 85, "max": 95}, "confidence": 0.62},
      "key": {"key": "E", "mode": "minor", "scale": "E minor", "camelot": "9A", "confidence": 0.88, "notes": ["E","F#","G","A","B","C","D"], "compatibleKeys": [{"code":"9A","relation":"Same key"},{"code":"10B","relation":"Perfect fourth"},{"code":"8A","relation":"Perfect fifth"}]},
      "adsr": {"attack": 280, "decay": 500, "sustain": 0.72, "release": 1800},
      "waveform": {"type": "saw", "confidence": 68, "description": "Soft sawtooth with filtering", "fundamentalFreq": 329.63, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":38},{"harmonic":3,"amplitude":22},{"harmonic":4,"amplitude":14},{"harmonic":5,"amplitude":8}]},
      "filterEnvelope": {"estimatedCutoff": 2800, "filterAttack": 200, "filterDecay": 800, "resonanceIndicator": 18, "sweepDirection": "opening"},
      "modulation": {"lfoRate": 0.15, "tremoloDepth": 0.12, "vibratoDepth": 0.08, "chorusAmount": 0.55, "hasModulation": true},
      "harmonics": [{"frequency":329.63,"note":"E4","amplitude":1.0},{"frequency":659.26,"note":"E5","amplitude":0.38},{"frequency":987.77,"note":"B5","amplitude":0.22}]
    },
    "recommendations": {
      "synthType": ["Pads are defined by long attack and release times — the sound should slowly fade in and out", "Use multiple detuned oscillators for thickness, then soften everything with a low-pass filter", "Think of a pad as a warm blanket of sound — it should never be sharp or aggressive", "Layer two pads together: one lower (warm body) and one higher (airy texture)"],
      "vstSuggestions": ["Vital (Free) — excellent pad capabilities with its wavetable oscillators and effects", "TAL-Reverb-4 (Free) — incredible reverb plugin to pair with any pad synth"],
      "nativeInstruments": ["FL Studio: 3x Osc (two detuned saws + long envelope)", "FL Studio: Sytrus (additive synthesis for evolving timbres)", "Ableton: Wavetable (smooth wavetable scanning for movement)"],
      "oscillatorSettings": ["OSC 1: Sawtooth wave with 4-6 unison voices, detune at 25-35%", "OSC 2: Triangle or sine wave, one octave down (-12), for warm low-end body", "Keep both oscillators at similar volumes — pads should feel balanced, not dominated by one tone", "In Vital: try slowly scanning through wavetable positions with an LFO for evolving texture"],
      "filterSettings": ["Low-pass filter at 2000-3500Hz — you want warmth, not brightness", "Very low resonance (5-15%) — pads should be smooth, not peaky", "Slow filter envelope: attack 150-300ms, mirroring the amp envelope for a gradual brightness swell", "Optional: bandpass filter for a more distant, lo-fi pad character"],
      "envelopeSettings": ["Attack: 200-500ms (slow fade in — this is what makes it a pad and not a lead)", "Decay: 400-800ms", "Sustain: 65-80%", "Release: 1000-2500ms (very long tail — pads should linger after you release the key)", "Tip: if your attack is under 100ms, it will sound more like a lead than a pad"],
      "modulationSettings": ["Slow LFO (0.05-0.2 Hz) routed to filter cutoff for gentle timbral evolution", "Second LFO to oscillator pitch at very subtle depth (2-5 cents) for organic drift", "Pan LFO (0.1 Hz) for stereo movement — makes the pad feel alive and spacious", "The key word for pad modulation is SLOW — everything should move gradually"],
      "eqSettings": ["High-pass at 100-150Hz to leave room for bass and kick", "Cut any harshness around 2-4kHz with a gentle dip", "Optional: shelf boost above 8kHz for a touch of shimmer and air"],
      "effects": ["Reverb is essential — long hall or cathedral (3-5 second decay), 40-60% wet", "Chorus effect (Vital has a built-in one) for additional stereo width and movement", "Delay (1/4 note or dotted 1/8, 20-30% wet) for spaciousness", "Do NOT use compression on pads — they should breathe dynamically"],
      "mixTips": ["Pads should sit behind everything else in the mix — they are the background, not the focus", "Keep pads at a moderate volume — if you can clearly hear the pad over other elements, it is too loud", "Use volume automation to swell the pad in during transitions and verses", "High-pass aggressively (200Hz+) if playing simultaneously with bass or 808", "Stereo width is your friend on pads — spread them wide to fill the panorama"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Pad", "confidence": 95}, {"name": "Strings", "confidence": 32}],
      "polyphony": "poly",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '19 days'
);

-- 7. Acid Bass (Techno)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Acid Bass (Techno)',
  'The squelchy, resonant acid bass line made famous by the Roland TB-303. This sound defined acid house in the late 1980s and remains a staple of techno, electro, and acid techno today. The magic is in the resonant filter and accent/slide controls — not the oscillator.',
  ARRAY['Bass', 'Techno', 'Acid'],
  'Bass',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.295",
      "brightness": "0.488",
      "spectralCentroid": "1920.3",
      "harmonicity": "0.705",
      "attackTime": "4.2",
      "bpm": {"bpm": 130, "suggestedTempo": 130, "tempoRange": {"min": 126, "max": 134}, "confidence": 0.93},
      "key": {"key": "A", "mode": "minor", "scale": "A minor", "camelot": "8A", "confidence": 0.75, "notes": ["A","B","C","D","E","F","G"], "compatibleKeys": [{"code":"8A","relation":"Same key"},{"code":"9B","relation":"Perfect fourth"},{"code":"7A","relation":"Perfect fifth"}]},
      "adsr": {"attack": 3, "decay": 95, "sustain": 0.45, "release": 120},
      "waveform": {"type": "saw", "confidence": 86, "description": "303-style sawtooth with resonant filter", "fundamentalFreq": 110.0, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":50},{"harmonic":3,"amplitude":34},{"harmonic":4,"amplitude":25},{"harmonic":5,"amplitude":20}]},
      "filterEnvelope": {"estimatedCutoff": 2400, "filterAttack": 2, "filterDecay": 60, "resonanceIndicator": 72, "sweepDirection": "closing"},
      "modulation": {"lfoRate": 0, "tremoloDepth": 0, "vibratoDepth": 0, "chorusAmount": 0, "hasModulation": false},
      "harmonics": [{"frequency":110.0,"note":"A2","amplitude":1.0},{"frequency":220.0,"note":"A3","amplitude":0.50},{"frequency":330.0,"note":"E4","amplitude":0.34},{"frequency":440.0,"note":"A4","amplitude":0.25}]
    },
    "recommendations": {
      "synthType": ["Acid bass is 90% filter and 10% oscillator — the resonant filter sweep IS the sound", "Use a single sawtooth or square wave — keep the oscillator simple", "The filter envelope is everything: fast attack, short decay, low sustain, with HIGH resonance", "Portamento (glide) between notes is essential for authentic acid lines"],
      "vstSuggestions": ["Vital (Free) — can nail acid bass with its ladder filter and envelope", "Phoscyon (D16 Group) — dedicated 303 emulation if you get serious about acid"],
      "nativeInstruments": ["FL Studio: 3x Osc (single saw) + Fruity Love Philter (resonant LP)", "FL Studio: Sytrus (single operator saw with filter modulation)", "Ableton: Analog (saw oscillator + built-in resonant filter)"],
      "oscillatorSettings": ["Single sawtooth oscillator — nothing else", "Monophonic mode (one note at a time) — acid lines are always mono", "Portamento/glide: 30-60ms between notes for that sliding quality", "Octave: play in the C2-C3 range (low to mid bass register)"],
      "filterSettings": ["Low-pass filter (24dB/oct ladder type if available) — this is the most important setting", "Base cutoff: 300-600Hz", "Resonance: 60-80% — crank it until it almost self-oscillates, that is the acid squelch", "Filter envelope depth: 50-70% (how far the filter opens on each note)", "Filter decay: 40-80ms (short, snappy sweeps)"],
      "envelopeSettings": ["Attack: 0-5ms (instant)", "Decay: 80-120ms (the filter closes quickly)", "Sustain: 30-50% (lower sustain means each note has more of that filter sweep character)", "Release: 80-150ms (short and punchy)"],
      "modulationSettings": ["No LFO needed — acid bass gets its movement from the filter envelope on every note hit", "The accent feature on a 303 increases filter depth and volume on certain steps — simulate this by automating filter envelope depth"],
      "eqSettings": ["High-pass at 30Hz", "Be careful boosting the resonance frequency range — it can become piercing", "Cut around 200-300Hz if it conflicts with your kick drum"],
      "effects": ["Distortion is classic — use Fruity Soft Clipper or Fruity Blood Overdrive in FL Studio", "Apply distortion AFTER the filter for authentic 303 tone", "Compression (fast attack, 4:1) to tame the resonance peaks", "Very short reverb or delay (10-15% wet) for subtle space — acid should be tight and punchy"],
      "mixTips": ["Keep acid lines mono — no stereo width needed", "The acid bass and kick drum must not fight — use sidechain compression or EQ carving", "Write patterns using a step sequencer for authentic acid vibes — randomize note lengths and accents", "Automate the filter cutoff and resonance throughout the track — a static acid line is a boring acid line", "Less is more — acid lines are hypnotic because of repetition with subtle variation, not complexity"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Bass", "confidence": 90}, {"name": "Lead", "confidence": 42}],
      "polyphony": "mono",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '18 days'
);

-- 8. Trap Hi-Hat Roll
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Trap Hi-Hat Roll',
  'The rapid, rhythmically complex hi-hat pattern that defines modern trap production. Built from fast rolls, pitch variations, and velocity changes, this pattern creates the driving energy behind trap beats. The hi-hat is often the most complex rhythmic element in a trap beat.',
  ARRAY['Drums', 'Trap', 'Hip-Hop'],
  'Drums',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.182",
      "brightness": "0.892",
      "spectralCentroid": "8450.6",
      "harmonicity": "0.125",
      "attackTime": "0.8",
      "bpm": {"bpm": 145, "suggestedTempo": 145, "tempoRange": {"min": 140, "max": 150}, "confidence": 0.96},
      "key": {"key": "N/A", "mode": "none", "scale": "Chromatic", "camelot": "", "confidence": 0.0, "notes": [], "compatibleKeys": []},
      "adsr": {"attack": 0, "decay": 35, "sustain": 0.0, "release": 45},
      "waveform": {"type": "complex", "confidence": 72, "description": "Metallic noise burst", "fundamentalFreq": 0, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":85},{"harmonic":3,"amplitude":78},{"harmonic":4,"amplitude":72}]},
      "filterEnvelope": {"estimatedCutoff": 12000, "filterAttack": 0, "filterDecay": 15, "resonanceIndicator": 12, "sweepDirection": "closing"},
      "modulation": {"lfoRate": 0, "tremoloDepth": 0, "vibratoDepth": 0, "chorusAmount": 0, "hasModulation": false},
      "harmonics": [{"frequency":8200.0,"note":"","amplitude":1.0},{"frequency":9800.0,"note":"","amplitude":0.85}]
    },
    "recommendations": {
      "synthType": ["Trap hi-hats are sample-based — you are not synthesizing them, you are programming patterns with samples", "Find a crisp, tight closed hi-hat sample (every DAW comes with usable ones)", "The art is in the pattern programming: velocity, note length, and pitch variation", "Use your piano roll in 1/32 note grid resolution to place hi-hat rolls"],
      "vstSuggestions": ["Any sampler — FL Studio FPC, Battery, or just drop samples in the channel rack", "Vital is not used for hi-hats — use your DAW sampler"],
      "nativeInstruments": ["FL Studio: FPC (drag in a hi-hat sample)", "FL Studio: Channel Rack (load hi-hat sample directly)", "Ableton: Simpler or Drum Rack"],
      "oscillatorSettings": ["Not applicable — hi-hats use samples, not oscillators", "If synthesizing: use white noise through a high-pass filter at 6-8kHz", "Short noise burst with a fast envelope (decay under 40ms) creates a basic closed hi-hat"],
      "filterSettings": ["High-pass filter at 6000-8000Hz to keep the hi-hat crisp and out of the way of other elements", "No resonance needed", "Use different filter cutoffs on alternating hits for tonal variation"],
      "envelopeSettings": ["Decay: 20-40ms for a tight closed hat", "Decay: 80-150ms for an open hat (use sparingly for accents)", "No sustain — hi-hats are purely transient sounds", "Velocity is crucial: accent every 2nd or 4th hit, ghost notes (low velocity) in between"],
      "modulationSettings": ["No modulation on individual hits", "The modulation IS the pattern itself — velocity changes, pitch shifts, and timing create movement"],
      "eqSettings": ["High-pass at 5-8kHz aggressively — hi-hats should only occupy the very top of the frequency spectrum", "Slight boost at 10-12kHz for crispness and air", "Cut anything below 4kHz — there should be nothing down there"],
      "effects": ["Very light reverb (0.3-0.5s decay, 10-15% wet) on occasional open hats only", "Do NOT put reverb on every hi-hat hit — it will wash out your groove", "Subtle stereo panning: alternate hits slightly left and right (5-15%) for width", "Compression is optional but can help glue the pattern together at a light ratio (2:1)"],
      "mixTips": ["Program rolls using 1/16 and 1/32 notes — vary between double-time and triple-time rolls", "Velocity is the secret weapon: main beats at 100%, off-beats at 60-70%, ghost notes at 30-40%", "Pitch individual hi-hat hits up or down by 1-3 semitones for variation — this prevents the mechanical sound", "Open hi-hat on every other beat or at the end of a roll for contrast", "Keep hi-hats at a moderate level — they should add energy, not overpower the mix", "Use swing (5-15%) in FL Studio to make the pattern feel less robotic"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Drums", "confidence": 97}],
      "polyphony": "single",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '17 days'
);

-- 9. Vinyl Piano (Lo-Fi)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Vinyl Piano (Lo-Fi)',
  'A warm, filtered piano with vinyl crackle and tape saturation. The core sound of lo-fi hip hop and chill beats — think Nujabes, j dilla, and lo-fi YouTube livestreams. The character comes not from the piano itself, but from the processing: low-pass filtering, pitch wobble, and vinyl noise.',
  ARRAY['Keys', 'Lo-Fi', 'Chill'],
  'Keys',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.165",
      "brightness": "0.215",
      "spectralCentroid": "1120.8",
      "harmonicity": "0.892",
      "attackTime": "12.5",
      "bpm": {"bpm": 85, "suggestedTempo": 85, "tempoRange": {"min": 80, "max": 90}, "confidence": 0.78},
      "key": {"key": "D", "mode": "major", "scale": "D major", "camelot": "10B", "confidence": 0.85, "notes": ["D","E","F#","G","A","B","C#"], "compatibleKeys": [{"code":"10B","relation":"Same key"},{"code":"11B","relation":"Perfect fourth"},{"code":"9B","relation":"Perfect fifth"}]},
      "adsr": {"attack": 10, "decay": 350, "sustain": 0.45, "release": 600},
      "waveform": {"type": "complex", "confidence": 58, "description": "Complex harmonic content from piano", "fundamentalFreq": 293.66, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":62},{"harmonic":3,"amplitude":38},{"harmonic":4,"amplitude":25},{"harmonic":5,"amplitude":18},{"harmonic":6,"amplitude":12}]},
      "filterEnvelope": {"estimatedCutoff": 1500, "filterAttack": 8, "filterDecay": 200, "resonanceIndicator": 8, "sweepDirection": "stable"},
      "modulation": {"lfoRate": 0.3, "tremoloDepth": 0.05, "vibratoDepth": 0.15, "chorusAmount": 0.25, "hasModulation": true},
      "harmonics": [{"frequency":293.66,"note":"D4","amplitude":1.0},{"frequency":587.33,"note":"D5","amplitude":0.62},{"frequency":880.0,"note":"A5","amplitude":0.38}]
    },
    "recommendations": {
      "synthType": ["Start with any piano VST or sample library — the piano source matters less than the processing", "FL Studio comes with FL Keys (free piano plugin) which is perfect for this", "The lo-fi character is created with effects, not with the sound source", "Play simple jazz chords: 7th chords, 9th chords, suspended chords work great"],
      "vstSuggestions": ["FL Keys (free, included with FL Studio)", "Keyzone Classic (free realistic piano VST)", "Spitfire Labs Soft Piano (free, beautiful tone)"],
      "nativeInstruments": ["FL Studio: FL Keys (built-in)", "FL Studio: DirectWave with piano preset", "Ableton: Grand Piano instrument rack"],
      "oscillatorSettings": ["Not applicable — use a piano sample or VST, not a synthesizer oscillator", "If you must synthesize: use 4-6 sine partials at harmonic intervals with a fast decay envelope", "Record or import a piano chord progression first, then process it to sound lo-fi"],
      "filterSettings": ["Low-pass filter at 1200-1800Hz — this is the single most important step for lo-fi piano", "Cutting the highs is what makes it sound warm and vintage instead of clean and modern", "No resonance — keep the filter gentle and smooth", "Try a gentle high-pass at 80-100Hz to remove any rumble"],
      "envelopeSettings": ["Use the piano sample or VST as-is for the basic envelope", "If needed: Attack 8-15ms, Decay 300-500ms, Sustain 40-50%, Release 500-800ms", "The natural piano decay is usually fine — focus your effort on the effects chain"],
      "modulationSettings": ["Slow pitch LFO (0.2-0.5 Hz) with very subtle depth (3-8 cents) to simulate vinyl wow and flutter", "This pitch wobble is what makes lo-fi sound like it is playing off an old record", "Route the LFO to pitch, not filter — the pitch drift is the characteristic lo-fi texture"],
      "eqSettings": ["Low-pass at 1500-2000Hz (or use a filter plugin)", "Gentle roll-off of lows below 80Hz", "Small boost around 400-600Hz for warmth", "Cut any presence around 2-4kHz — you want it muffled"],
      "effects": ["Vinyl noise/crackle: use iZotope Vinyl (free plugin) or RC-20 Retro Color", "Saturation: Fruity Soft Clipper or Camel Crusher (free) for tape warmth", "Chorus: very subtle (10-15% wet) for slight detuning and width", "Reverb: plate reverb (1-2s decay, 25-35% wet) for a roomy, vintage feel", "Bit crusher: optional, reduce to 12-bit for extra lo-fi grit"],
      "mixTips": ["Record or program the piano at a moderate tempo (75-90 BPM) with swing enabled", "Play chords with a relaxed, slightly behind-the-beat feel — quantize at 60-70% strength, not 100%", "Layer vinyl crackle as a separate audio track underneath the piano", "Keep the overall mix quiet and intimate — lo-fi should never feel loud or aggressive", "Sidechain compress the piano to a kick drum for that pumping, ducking effect (classic lo-fi move)", "Use a tape stop effect at the end of phrases for a cool transition"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Keys", "confidence": 88}, {"name": "Pad", "confidence": 28}],
      "polyphony": "poly",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '16 days'
);

-- 10. Talking Synth (Funk)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Talking Synth (Funk)',
  'A vowel-filter talk box style synth that sounds like it is saying "wow," "yah," or "oui." Made famous by Daft Punk, Chromeo, and classic funk records. The effect is created by sweeping between two bandpass filters tuned to vowel formant frequencies — not by a literal talk box.',
  ARRAY['Lead', 'Funk', 'Electronic'],
  'Lead',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.265",
      "brightness": "0.512",
      "spectralCentroid": "2350.7",
      "harmonicity": "0.748",
      "attackTime": "18.5",
      "bpm": {"bpm": 115, "suggestedTempo": 115, "tempoRange": {"min": 110, "max": 120}, "confidence": 0.85},
      "key": {"key": "G", "mode": "minor", "scale": "G minor", "camelot": "6A", "confidence": 0.80, "notes": ["G","A","Bb","C","D","Eb","F"], "compatibleKeys": [{"code":"6A","relation":"Same key"},{"code":"7B","relation":"Perfect fourth"},{"code":"5A","relation":"Perfect fifth"}]},
      "adsr": {"attack": 15, "decay": 200, "sustain": 0.65, "release": 300},
      "waveform": {"type": "saw", "confidence": 80, "description": "Sawtooth through formant filter", "fundamentalFreq": 196.0, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":48},{"harmonic":3,"amplitude":35},{"harmonic":4,"amplitude":22},{"harmonic":5,"amplitude":18}]},
      "filterEnvelope": {"estimatedCutoff": 3500, "filterAttack": 20, "filterDecay": 150, "resonanceIndicator": 65, "sweepDirection": "opening"},
      "modulation": {"lfoRate": 2.5, "tremoloDepth": 0.08, "vibratoDepth": 0.05, "chorusAmount": 0.18, "hasModulation": true},
      "harmonics": [{"frequency":196.0,"note":"G3","amplitude":1.0},{"frequency":392.0,"note":"G4","amplitude":0.48},{"frequency":588.0,"note":"D5","amplitude":0.35},{"frequency":784.0,"note":"G5","amplitude":0.22}]
    },
    "recommendations": {
      "synthType": ["The talking effect comes from formant filters — two bandpass filters tuned to vowel frequencies", "Use a harmonically rich source (saw wave) and shape it with a formant or vowel filter", "Automate the morph between vowel shapes (A-E-I-O-U) to create the talking illusion", "Each vowel has specific formant frequencies — ''AH'': 800Hz + 1200Hz, ''EE'': 270Hz + 2300Hz, ''OO'': 300Hz + 870Hz"],
      "vstSuggestions": ["Vital (Free) — has a formant filter type built in", "TAL-Vocoder (free) — dedicated vocoder effect"],
      "nativeInstruments": ["FL Studio: Vocodex (powerful vocoder with formant control)", "FL Studio: 3x Osc + Fruity Love Philter (two bandpass filters)", "Ableton: Operator + Corpus or Auto Filter"],
      "oscillatorSettings": ["OSC 1: Sawtooth wave — you need lots of harmonics for the filter to shape into vowels", "OSC 2: Square wave at the same pitch, blended at 30-40% for extra harmonic content", "Monophonic with portamento (40-80ms glide) for smooth note transitions", "Play in the G2-G4 range — too low and vowels are indistinct, too high and it gets thin"],
      "filterSettings": ["Use a formant filter if your synth has one (Vital does under Filter Type > Formant)", "If no formant filter: use two parallel bandpass filters and automate their center frequencies between vowel positions", "Resonance at 50-70% on each bandpass — this is what creates the vocal quality", "Automate the filter morph slowly over 1-2 beats for a \"wow\" effect, or faster for rapid talking"],
      "envelopeSettings": ["Attack: 10-20ms (slightly soft for a more vocal onset)", "Decay: 150-250ms", "Sustain: 60-70%", "Release: 250-400ms"],
      "modulationSettings": ["Route an LFO or macro to the formant filter morph for rhythmic vowel changes", "LFO at 1-3 Hz synced to tempo for the classic talk box rhythm", "Alternatively, automate the formant position manually in the piano roll for precise control over each vowel", "Try different LFO shapes: sine for smooth talking, sample-and-hold for glitchy robotic speech"],
      "eqSettings": ["High-pass at 100Hz to remove lows", "Boost around 1-3kHz where the vowel formants sit for extra presence", "Cut above 8kHz to remove harshness from the resonant filters"],
      "effects": ["Light chorus for width and subtle detuning", "Short delay (1/16 note, 15% wet) for rhythmic echo on the talk pattern", "Compression (3:1, medium attack) to even out the volume changes between vowels", "Phaser can add cool movement that complements the formant sweeps"],
      "mixTips": ["The talking synth should be a lead element — keep it front and center in the mix", "Use it sparingly — a few bars of talking synth is iconic, a whole track is tiring", "Pair with a funky bass line and tight drums for the best context", "Automate the formant morph to follow the rhythm of the song for a groovier effect", "Try playing a melody that follows natural speech inflection — rising pitch at the end of phrases sounds like a question"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Lead", "confidence": 86}, {"name": "Vocal", "confidence": 52}],
      "polyphony": "mono",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '15 days'
);

-- 11. Hardstyle Kick
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Hardstyle Kick',
  'The distorted, pitched hardstyle kick with a long, tonal tail. This kick is practically a bass note — it carries both the rhythm and the low-end melody. Crafted through heavy layering, distortion, and pitch envelopes, it is one of the most complex kicks in electronic music production.',
  ARRAY['Kick', 'Hardstyle', 'EDM'],
  'Kick',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.425",
      "brightness": "0.355",
      "spectralCentroid": "1580.4",
      "harmonicity": "0.482",
      "attackTime": "2.5",
      "bpm": {"bpm": 150, "suggestedTempo": 150, "tempoRange": {"min": 145, "max": 155}, "confidence": 0.97},
      "key": {"key": "F", "mode": "minor", "scale": "F minor", "camelot": "4A", "confidence": 0.68, "notes": ["F","G","Ab","Bb","C","Db","Eb"], "compatibleKeys": [{"code":"4A","relation":"Same key"},{"code":"5B","relation":"Perfect fourth"},{"code":"3A","relation":"Perfect fifth"}]},
      "adsr": {"attack": 1, "decay": 250, "sustain": 0.15, "release": 400},
      "waveform": {"type": "sine", "confidence": 65, "description": "Distorted sine with pitch envelope", "fundamentalFreq": 87.31, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":72},{"harmonic":3,"amplitude":58},{"harmonic":4,"amplitude":45},{"harmonic":5,"amplitude":35},{"harmonic":6,"amplitude":28}]},
      "filterEnvelope": {"estimatedCutoff": 3800, "filterAttack": 1, "filterDecay": 100, "resonanceIndicator": 25, "sweepDirection": "closing"},
      "modulation": {"lfoRate": 0, "tremoloDepth": 0, "vibratoDepth": 0, "chorusAmount": 0, "hasModulation": false},
      "harmonics": [{"frequency":87.31,"note":"F2","amplitude":1.0},{"frequency":174.61,"note":"F3","amplitude":0.72},{"frequency":261.63,"note":"C4","amplitude":0.58},{"frequency":349.23,"note":"F4","amplitude":0.45}]
    },
    "recommendations": {
      "synthType": ["Hardstyle kicks are built in layers: a punchy top kick, a distorted mid body, and a tonal sub tail", "The tail is what makes it unique — it is essentially a bass note that decays over 200-400ms", "Start with a basic kick sample for the click/punch layer, then synthesize the tonal tail separately", "The distortion processing is what creates the aggressive midrange harmonics"],
      "vstSuggestions": ["Vital (Free) — synthesize the tonal tail layer", "FL Studio: Patcher (for layering and routing multiple processing stages)"],
      "nativeInstruments": ["FL Studio: Sytrus (excellent for synthesizing kick tails with pitch envelope)", "FL Studio: 3x Osc (sine wave with pitch envelope for the sub tail)", "Ableton: Operator (sine carrier with pitch mod)"],
      "oscillatorSettings": ["Layer 1 (Click): Use a short, punchy acoustic kick sample — this provides the initial transient", "Layer 2 (Tail): Sine wave with a pitch envelope dropping from +24 semitones to 0 over 100-150ms", "The tail should settle on a musical note (F1-F2 range) so it carries the bass melody", "In Vital: set OSC 1 to sine, route ENV 2 to pitch with +24 semitone range and 100ms decay"],
      "filterSettings": ["The click layer: high-pass at 200Hz to keep only the punch", "The tail layer: low-pass at 300-500Hz to keep only the sub", "After combining layers, use a bandpass centered around 100-200Hz for the merged signal", "No resonance needed — the distortion creates all the character"],
      "envelopeSettings": ["Click layer: instant attack, very fast decay (10-20ms)", "Tail layer: Attack 0ms, Decay 200-400ms, Sustain 0%, Release 100ms", "Pitch envelope on tail: +24 semitones dropping to 0 over 80-150ms (this is the distinctive pitch sweep)"],
      "modulationSettings": ["Pitch envelope is the key modulation — fast drop from a high pitch creates the kick body", "No LFO or other modulation needed", "Some producers automate the tail length and pitch across the track for variation"],
      "eqSettings": ["Boost around 60-80Hz for sub weight", "Boost around 2-4kHz for the click attack", "Cut around 300-500Hz to reduce muddiness (the \"boxy\" zone)", "High-shelf cut above 10kHz — hardstyle kicks should be powerful, not bright"],
      "effects": ["Distortion is essential — use Fruity Blood Overdrive, Fruity Soft Clipper, or CamelCrusher", "Apply distortion in stages: light saturation first, then harder clipping", "Compression with very fast attack and release to maximize loudness", "No reverb — hardstyle kicks should be completely dry"],
      "mixTips": ["The hardstyle kick IS the bass — do not layer a separate bass line underneath it", "Sidechain everything else to the kick aggressively (8:1 ratio or higher)", "The kick should be the loudest element in your mix by far", "Tune the kick tail to match the key of your melody — this is essential for hardstyle", "Export the kick as a one-shot sample once you are happy, then trigger it from a sampler for consistent playback", "Study kicks from headhunterz, Noisecontrollers, and Phuture Noize for reference"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Kick", "confidence": 94}, {"name": "Bass", "confidence": 55}],
      "polyphony": "mono",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '14 days'
);

-- 12. Portamento Lead (R&B)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Portamento Lead (R&B)',
  'A smooth, sliding synth lead with portamento glide between notes. Used in modern R&B, neo-soul, and pop production by artists like The Weeknd, SZA, and Frank Ocean. The glide creates a vocal-like quality that sits perfectly over lush chords and slow grooves.',
  ARRAY['Lead', 'R&B', 'Soul'],
  'Lead',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.218",
      "brightness": "0.445",
      "spectralCentroid": "2150.3",
      "harmonicity": "0.835",
      "attackTime": "35.2",
      "bpm": {"bpm": 95, "suggestedTempo": 95, "tempoRange": {"min": 90, "max": 100}, "confidence": 0.80},
      "key": {"key": "Bb", "mode": "major", "scale": "Bb major", "camelot": "6B", "confidence": 0.83, "notes": ["Bb","C","D","Eb","F","G","A"], "compatibleKeys": [{"code":"6B","relation":"Same key"},{"code":"7B","relation":"Perfect fourth"},{"code":"5B","relation":"Perfect fifth"}]},
      "adsr": {"attack": 30, "decay": 250, "sustain": 0.72, "release": 500},
      "waveform": {"type": "triangle", "confidence": 78, "description": "Soft triangle wave with subtle harmonics", "fundamentalFreq": 466.16, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":8},{"harmonic":3,"amplitude":25},{"harmonic":4,"amplitude":3},{"harmonic":5,"amplitude":12}]},
      "filterEnvelope": {"estimatedCutoff": 3200, "filterAttack": 25, "filterDecay": 180, "resonanceIndicator": 22, "sweepDirection": "stable"},
      "modulation": {"lfoRate": 5.5, "tremoloDepth": 0.05, "vibratoDepth": 0.18, "chorusAmount": 0.20, "hasModulation": true},
      "harmonics": [{"frequency":466.16,"note":"Bb4","amplitude":1.0},{"frequency":932.33,"note":"Bb5","amplitude":0.08},{"frequency":1396.91,"note":"F6","amplitude":0.25}]
    },
    "recommendations": {
      "synthType": ["The portamento lead is about smoothness — soft waveforms, gentle filter, and glide between every note", "Use a triangle or sine wave as the base oscillator — nothing harsh or buzzy", "Monophonic mode with long glide time (80-150ms) is essential", "Think of it as a synth trying to sound like a human voice sliding between notes"],
      "vstSuggestions": ["Vital (Free) — set glide/portamento in the voice settings", "FLEX (free in FL Studio 20+) — has great R&B preset starting points"],
      "nativeInstruments": ["FL Studio: 3x Osc (triangle wave, enable portamento in Misc settings)", "FL Studio: FLEX (browse R&B/Soul category for starting points)", "Ableton: Analog (triangle oscillator with glide)"],
      "oscillatorSettings": ["OSC 1: Triangle wave — softer than saw, warmer than sine", "OSC 2: Sine wave, one octave up (+12), very quiet (15-20%) for a gentle overtone", "Monophonic mode — portamento only works properly in mono", "Glide/Portamento: 80-150ms (the higher, the more dramatic the slide)", "In FL 3x Osc: turn on Portamento in the Misc tab, set slide time to ~80ms"],
      "filterSettings": ["Low-pass filter at 2800-3500Hz — enough brightness to be present but not harsh", "Low resonance (10-20%) — keep it smooth", "Very subtle filter envelope: attack 20-30ms, matching the amp envelope for a gentle swell"],
      "envelopeSettings": ["Attack: 25-40ms (slightly soft onset, like a breath before singing)", "Decay: 200-300ms", "Sustain: 68-78% (sustained for melodies)", "Release: 400-600ms (let notes fade gracefully)", "Tip: the slightly soft attack is what separates an R&B lead from a pop lead"],
      "modulationSettings": ["Vibrato: LFO routed to pitch at 4-6 Hz, depth ~15-20 cents (mimics vocal vibrato)", "Delay the vibrato onset by 200-300ms so it kicks in after the note starts — just like a singer", "In Vital: use the LFO delay parameter to achieve this naturally", "Very subtle chorus (10-15%) for warmth and slight width"],
      "eqSettings": ["High-pass at 150Hz to stay clear of the bass", "Gentle boost around 1-2kHz for warmth and body", "Cut any harshness at 3-5kHz", "Subtle air shelf above 8kHz for presence"],
      "effects": ["Reverb: plate or hall (1.5-2s decay), 25-35% wet — smooth and lush", "Delay: 1/4 note dotted, 15-20% wet with feedback at 30% for an echo that fills space", "Light saturation for warmth (tape-style, not aggressive)", "Do NOT use distortion — R&B leads should stay clean and smooth"],
      "mixTips": ["The portamento lead is a melody instrument — give it space in the mix by carving EQ around 1-3kHz", "Play simple, singable melodies — the glide adds enough interest on its own", "Leave gaps between phrases — silence is powerful in R&B", "Layer with a very quiet pad to fill in the sustain portions", "Use velocity sensitivity to add expression — quieter notes on passing tones, louder on target notes"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Lead", "confidence": 92}, {"name": "Pad", "confidence": 30}],
      "polyphony": "mono",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '13 days'
);

-- 13. Arp Sequence (Synthwave)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Arp Sequence (Synthwave)',
  'A pulsing arpeggiated synth sequence straight out of an 80s soundtrack. Think Stranger Things, Kavinsky, and The Midnight. Built from a saw or pulse wave running through an arpeggiator with tempo-synced delay, this sound evokes neon-lit highways and retro-futurism.',
  ARRAY['Lead', 'Synthwave', 'Retro'],
  'Lead',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.235",
      "brightness": "0.528",
      "spectralCentroid": "2680.5",
      "harmonicity": "0.782",
      "attackTime": "5.8",
      "bpm": {"bpm": 118, "suggestedTempo": 118, "tempoRange": {"min": 114, "max": 122}, "confidence": 0.92},
      "key": {"key": "C#", "mode": "minor", "scale": "C# minor", "camelot": "12A", "confidence": 0.87, "notes": ["C#","D#","E","F#","G#","A","B"], "compatibleKeys": [{"code":"12A","relation":"Same key"},{"code":"1B","relation":"Perfect fourth"},{"code":"11A","relation":"Perfect fifth"}]},
      "adsr": {"attack": 4, "decay": 95, "sustain": 0.55, "release": 180},
      "waveform": {"type": "pulse", "confidence": 76, "description": "Pulse wave with moderate width", "fundamentalFreq": 277.18, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":35},{"harmonic":3,"amplitude":65},{"harmonic":4,"amplitude":12},{"harmonic":5,"amplitude":48}]},
      "filterEnvelope": {"estimatedCutoff": 4500, "filterAttack": 3, "filterDecay": 65, "resonanceIndicator": 28, "sweepDirection": "closing"},
      "modulation": {"lfoRate": 0, "tremoloDepth": 0, "vibratoDepth": 0, "chorusAmount": 0.35, "hasModulation": true},
      "harmonics": [{"frequency":277.18,"note":"C#4","amplitude":1.0},{"frequency":554.37,"note":"C#5","amplitude":0.35},{"frequency":831.0,"note":"G#5","amplitude":0.65},{"frequency":1108.73,"note":"C#6","amplitude":0.12}]
    },
    "recommendations": {
      "synthType": ["An arp is a chord broken into individual notes played in sequence — your synth arpeggiator does this automatically", "Hold a chord and let the arpeggiator split it into a rhythmic pattern", "The sound itself should be simple — a short, plucky tone — the arpeggiator pattern creates the magic", "Tempo-synced delay is essential to fill the gaps between arp notes"],
      "vstSuggestions": ["Vital (Free) — has a built-in arpeggiator and great retro tones", "TAL-U-NO-62 (free Juno emulation) — quintessential synthwave arp sound"],
      "nativeInstruments": ["FL Studio: 3x Osc + FL Arpeggiator (Misc tab)", "FL Studio: Sytrus (pulse wave + built-in arp)", "Ableton: Analog + Arpeggiator MIDI effect"],
      "oscillatorSettings": ["OSC 1: Pulse/square wave with pulse width at 40-60% for that classic 80s hollow tone", "OSC 2: Sawtooth wave one octave up, mixed at 20-30% for brightness", "In Vital: use a square wave and modulate the pulse width slightly with a slow LFO for movement", "In FL 3x Osc: set OSC 1 to square, use the CRS (coarse) knob to offset OSC 2 by +12"],
      "filterSettings": ["Low-pass filter at 3500-5000Hz — bright enough to cut through but not harsh", "Filter envelope: fast attack, 50-80ms decay for a plucky brightness at the start of each note", "Resonance at 20-30% for a slight peak that adds character", "Key tracking at 50-70% so higher notes stay brighter (sounds more natural)"],
      "envelopeSettings": ["Attack: 2-5ms (fast for a percussive arp feel)", "Decay: 80-120ms (short to create separation between notes)", "Sustain: 45-60% (moderate — lets notes ring slightly)", "Release: 150-200ms (a little tail for the delay to catch)", "Tip: shorter decay for faster arp rates, longer for slower tempos"],
      "modulationSettings": ["Slow LFO to pulse width (0.1-0.3 Hz) for subtle timbral evolution — classic Juno move", "No vibrato on arps — they should be steady and mechanical", "The chorus effect does the heavy lifting for width and movement"],
      "eqSettings": ["High-pass at 200Hz — arps should sit above the bass", "Boost at 2-3kHz for presence and cut-through", "Subtle air boost above 10kHz for sparkle"],
      "effects": ["Chorus is essential — this is the 80s secret weapon (use Vital chorus or TAL-Chorus-LX, free)", "Tempo-synced delay: 1/8 note or dotted 1/8, feedback 35-45%, wet 30-40%", "The delay fills in the gaps between arp notes, creating a continuous shimmering texture", "Reverb: medium hall (1.5-2s decay), 20-30% wet for space", "Layer the chorus and delay carefully — too much and it becomes a wash of sound"],
      "mixTips": ["Set the arpeggiator to 1/16 notes for a classic synthwave pulse", "Try different arp modes: Up, Down, Up/Down, Random for variety between sections", "Hold simple minor chords (Am, Cm, Dm) — minor keys are the synthwave standard", "Pan the arp slightly off-center (10-20% left or right) to leave room for the lead melody in the center", "Automate the filter cutoff to slowly open during buildups for dramatic tension", "The arp should be felt more than heard — it is a rhythmic texture, not the main melody"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Lead", "confidence": 82}, {"name": "Pluck", "confidence": 55}],
      "polyphony": "mono",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '12 days'
);

-- 14. Sub Bass (House)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Sub Bass (House)',
  'A clean, pure sine sub bass used in house, deep house, and garage music. Unlike the distorted 808 or the detuned Reese, the house sub bass is intentionally clean and minimal. It provides a warm, felt-more-than-heard low-end foundation that lets the kick drum and groove stay in focus.',
  ARRAY['Bass', 'House', 'Deep House'],
  'Sub-bass',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.310",
      "brightness": "0.065",
      "spectralCentroid": "118.5",
      "harmonicity": "0.985",
      "attackTime": "15.8",
      "bpm": {"bpm": 124, "suggestedTempo": 124, "tempoRange": {"min": 120, "max": 128}, "confidence": 0.94},
      "key": {"key": "E", "mode": "minor", "scale": "E minor", "camelot": "9A", "confidence": 0.90, "notes": ["E","F#","G","A","B","C","D"], "compatibleKeys": [{"code":"9A","relation":"Same key"},{"code":"10B","relation":"Perfect fourth"},{"code":"8A","relation":"Perfect fifth"}]},
      "adsr": {"attack": 12, "decay": 100, "sustain": 0.90, "release": 250},
      "waveform": {"type": "sine", "confidence": 97, "description": "Pure sine wave sub bass", "fundamentalFreq": 82.41, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":3},{"harmonic":3,"amplitude":1}]},
      "filterEnvelope": {"estimatedCutoff": 150, "filterAttack": 0, "filterDecay": 0, "resonanceIndicator": 0, "sweepDirection": "stable"},
      "modulation": {"lfoRate": 0, "tremoloDepth": 0, "vibratoDepth": 0, "chorusAmount": 0, "hasModulation": false},
      "harmonics": [{"frequency":82.41,"note":"E2","amplitude":1.0}]
    },
    "recommendations": {
      "synthType": ["The house sub bass is the simplest bass sound to make — a pure sine wave and nothing else", "No effects, no modulation, no filter movement — just a clean sine providing low-end weight", "The challenge is not making the sound — it is mixing it properly with the kick drum", "Play simple, groovy bass lines with syncopation — the rhythm is more important than the tone"],
      "vstSuggestions": ["Vital (Free) — sine oscillator, done", "Any synth that can produce a sine wave (literally all of them)"],
      "nativeInstruments": ["FL Studio: 3x Osc (set all to sine, use only OSC 1)", "FL Studio: GMS (init preset, sine wave)", "Ableton: Operator (single sine carrier)"],
      "oscillatorSettings": ["One sine wave oscillator — that is it", "No unison, no detune, no second oscillator", "In 3x Osc: set OSC 1 to sine, turn OSC 2 and 3 volume all the way down", "Play in the E1-E2 range (40-80Hz) — this is the sub bass sweet spot"],
      "filterSettings": ["Low-pass at 120-180Hz to ensure absolutely nothing but sub frequencies come through", "No resonance — zero", "This aggressive filtering is what keeps the sub invisible in the mix while providing warmth"],
      "envelopeSettings": ["Attack: 10-20ms (slightly softened to avoid a click that competes with the kick)", "Decay: 80-120ms", "Sustain: 85-95% (keep it full and present)", "Release: 150-300ms (enough for the note to end naturally, not abruptly)", "Tip: if you hear a click at the start of each note, increase attack to 15-20ms"],
      "modulationSettings": ["None — the sub bass should be completely static and steady", "Any modulation would make the sub inconsistent and harder to mix"],
      "eqSettings": ["High-pass at 25-30Hz to remove inaudible rumble", "Low-pass at 120-150Hz to keep it purely sub", "No boosts needed — the sine wave is already perfectly shaped"],
      "effects": ["Absolutely no reverb, delay, chorus, or stereo effects — sub bass must be mono and dry", "Light compression (2:1) to even out the level between different notes", "Optional: very subtle saturation to add a tiny second harmonic for monitors that struggle with sub bass", "Sidechain compression to the kick drum — this is essential in house music"],
      "mixTips": ["Always keep sub bass in mono — stereo sub causes phase cancellation on club systems", "Use a spectrum analyzer to check that the sub sits between 40-100Hz and nothing else", "The sub and kick should never play at the same time — use sidechain compression with fast attack", "Check your mix on headphones AND monitors — sub bass behaves differently on each", "The sub bass should be felt, not heard — if you can clearly distinguish the sub bass notes, it might be too loud", "Play notes on the root and fifth of your chord progression for a solid foundation"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Sub-bass", "confidence": 98}, {"name": "Bass", "confidence": 65}],
      "polyphony": "mono",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '11 days'
);

-- 15. Vocal Chop (Pop)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Vocal Chop (Pop)',
  'Sliced and pitched vocal fragments rearranged into a melodic hook. Made famous by artists like Marshmello, The Chainsmokers, and Flume. The chops are usually one-syllable slices of a vocal recording, pitched to play a melody across a sampler. The result sits between a synth and a voice.',
  ARRAY['Vocal', 'Pop', 'Future Bass'],
  'Vocal',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.205",
      "brightness": "0.558",
      "spectralCentroid": "2720.6",
      "harmonicity": "0.688",
      "attackTime": "8.2",
      "bpm": {"bpm": 128, "suggestedTempo": 128, "tempoRange": {"min": 124, "max": 132}, "confidence": 0.89},
      "key": {"key": "F", "mode": "major", "scale": "F major", "camelot": "7B", "confidence": 0.72, "notes": ["F","G","A","Bb","C","D","E"], "compatibleKeys": [{"code":"7B","relation":"Same key"},{"code":"8B","relation":"Perfect fourth"},{"code":"6B","relation":"Perfect fifth"}]},
      "adsr": {"attack": 5, "decay": 150, "sustain": 0.35, "release": 220},
      "waveform": {"type": "complex", "confidence": 55, "description": "Complex vocal harmonics", "fundamentalFreq": 349.23, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":68},{"harmonic":3,"amplitude":45},{"harmonic":4,"amplitude":32},{"harmonic":5,"amplitude":22},{"harmonic":6,"amplitude":18}]},
      "filterEnvelope": {"estimatedCutoff": 5500, "filterAttack": 2, "filterDecay": 100, "resonanceIndicator": 18, "sweepDirection": "stable"},
      "modulation": {"lfoRate": 0, "tremoloDepth": 0, "vibratoDepth": 0.08, "chorusAmount": 0.10, "hasModulation": false},
      "harmonics": [{"frequency":349.23,"note":"F4","amplitude":1.0},{"frequency":698.46,"note":"F5","amplitude":0.68},{"frequency":1047.0,"note":"C6","amplitude":0.45}]
    },
    "recommendations": {
      "synthType": ["Vocal chops start with a real vocal recording — you slice it into tiny pieces and rearrange them", "Find a vocal sample (royalty-free acapellas, sample packs, or record your own voice)", "Slice it into individual syllables, then load those slices into a sampler to play them chromatically", "The melody comes from pitching those slices up and down across the keyboard"],
      "vstSuggestions": ["FL Studio: Slicex (built-in, perfect for vocal chopping)", "FL Studio: DirectWave (load slices and play chromatically)", "Serato Sample (dedicated chopping tool)"],
      "nativeInstruments": ["FL Studio: Slicex (best built-in option for chopping)", "FL Studio: Fruity Slicer (simpler alternative)", "Ableton: Simpler in Slice mode"],
      "oscillatorSettings": ["Not applicable — the sound source is a vocal recording, not an oscillator", "Step 1: Import a vocal into Slicex or your slicer of choice", "Step 2: Set markers at each syllable boundary (or use auto-slice)", "Step 3: Each slice becomes a pad/key — play them in a new order to create your melody", "Tip: slices with vowel sounds (ah, oh, ee) work best — consonants (t, k, s) are harder to pitch"],
      "filterSettings": ["Gentle low-pass at 5000-7000Hz to remove harshness from pitch-shifted slices", "High-pass at 150-200Hz to keep the chops out of the bass range", "Optional: bandpass filter for a telephone or lo-fi vocal chop effect"],
      "envelopeSettings": ["Attack: 3-8ms (fast but not clicking — small crossfade at the start of each slice)", "Decay: 100-200ms (depends on whether you want short staccato or sustained chops)", "Sustain: 30-50%", "Release: 150-250ms (let a small tail ring out for reverb to catch)", "Tip: use the fade controls in your slicer to avoid clicks at slice boundaries"],
      "modulationSettings": ["No modulation on the chops themselves", "Formant shifting: if your slicer supports it, keep formant correction ON when pitching — this prevents chipmunk artifacts"],
      "eqSettings": ["High-pass at 150Hz to leave room for bass", "Boost presence at 2-4kHz so the chops cut through the mix", "De-ess around 6-8kHz if the sibilants (s, t sounds) are harsh after pitch shifting"],
      "effects": ["Reverb: plate or room (1-1.5s decay), 25-35% wet to blend the chops together", "Delay: 1/8 dotted, 20% wet for rhythmic interest between chops", "Chorus: very subtle (10%) for width", "Pitch correction (Auto-Tune style) if you want the chops to sit perfectly in key — FL Studio has NewTone for this", "Volume automation: manually ride the volume of each chop for a more polished result"],
      "mixTips": ["Play simple, catchy melodies — vocal chops work best with stepwise motion (notes next to each other), not big jumps", "Layer the chops with a synth pad playing the same chords underneath for support", "Use reverb to glue different slices together — they will sound disconnected without it", "Experiment with reversing some slices for transition effects", "Pan alternating chops slightly left and right for width and interest", "The best vocal chops come from vowel-heavy phrases — look for \"oooh,\" \"aaah,\" \"yeah\" in your source material"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Vocal", "confidence": 85}, {"name": "Lead", "confidence": 42}],
      "polyphony": "mono",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '10 days'
);

-- 16. FM Bell (Ambient)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'FM Bell (Ambient)',
  'A shimmering, metallic bell sound created through FM (frequency modulation) synthesis. FM synthesis excels at inharmonic, bell-like timbres that are impossible to create with subtractive synthesis alone. These glassy tones are staples of ambient, IDM, and cinematic scoring.',
  ARRAY['Pluck', 'Ambient', 'Electronic'],
  'Pluck',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.145",
      "brightness": "0.685",
      "spectralCentroid": "4250.8",
      "harmonicity": "0.425",
      "attackTime": "2.1",
      "bpm": {"bpm": 100, "suggestedTempo": 100, "tempoRange": {"min": 95, "max": 105}, "confidence": 0.55},
      "key": {"key": "A", "mode": "major", "scale": "A major", "camelot": "11B", "confidence": 0.78, "notes": ["A","B","C#","D","E","F#","G#"], "compatibleKeys": [{"code":"11B","relation":"Same key"},{"code":"12B","relation":"Perfect fourth"},{"code":"10B","relation":"Perfect fifth"}]},
      "adsr": {"attack": 1, "decay": 800, "sustain": 0.05, "release": 1200},
      "waveform": {"type": "complex", "confidence": 62, "description": "Inharmonic FM partials", "fundamentalFreq": 440.0, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":42},{"harmonic":3,"amplitude":68},{"harmonic":4,"amplitude":18},{"harmonic":5,"amplitude":55},{"harmonic":6,"amplitude":12}]},
      "filterEnvelope": {"estimatedCutoff": 8000, "filterAttack": 1, "filterDecay": 500, "resonanceIndicator": 8, "sweepDirection": "closing"},
      "modulation": {"lfoRate": 0.08, "tremoloDepth": 0.05, "vibratoDepth": 0.02, "chorusAmount": 0.12, "hasModulation": true},
      "harmonics": [{"frequency":440.0,"note":"A4","amplitude":1.0},{"frequency":1100.0,"note":"C#6","amplitude":0.68},{"frequency":1540.0,"note":"G6","amplitude":0.55},{"frequency":880.0,"note":"A5","amplitude":0.42}]
    },
    "recommendations": {
      "synthType": ["FM synthesis creates bell sounds by having one oscillator (modulator) modulate the frequency of another (carrier)", "The ratio between carrier and modulator frequencies determines the timbre — non-integer ratios create metallic, bell-like inharmonics", "Start with a carrier:modulator ratio of 1:3.5 or 1:7 for classic bell tones", "The modulator amount (FM depth) controls how metallic/bright the sound is"],
      "vstSuggestions": ["Vital (Free) — OSC 1 can FM-modulate from OSC 2", "FL Studio: Sytrus (dedicated FM synth, perfect for bells)"],
      "nativeInstruments": ["FL Studio: Sytrus (best built-in option — 6 operators with full FM matrix)", "FL Studio: 3x Osc does not support FM — use Sytrus instead", "Ableton: Operator (4-operator FM synth)"],
      "oscillatorSettings": ["Carrier (OSC 1): Sine wave at the fundamental pitch", "Modulator (OSC 2): Sine wave at a non-integer ratio (3.5x, 5.5x, or 7x the carrier frequency)", "In Vital: set OSC 2 to sine, then turn up the FM knob on OSC 1 to modulate it from OSC 2", "In Sytrus: enable operator 1 (carrier) and operator 2 (modulator), set the ratio of op 2 to 3.500", "FM Amount: start low (20-30%) and increase until you hear the metallic partials emerge", "Higher ratios and more FM depth create brighter, more complex bells"],
      "filterSettings": ["Low-pass filter at 6000-9000Hz — let the shimmer through but control extreme highs", "Filter envelope following the amp decay for a natural darkening as the bell rings out", "Minimal resonance (5-10%) — bells are about complexity, not resonant peaks"],
      "envelopeSettings": ["Attack: 0-2ms (instant — bells have an immediate onset)", "Decay: 600-1200ms (long ring-out is the defining character)", "Sustain: 0-5% (bells die away, they do not sustain)", "Release: 800-1500ms (let the tail fade naturally)", "FM envelope: modulator amount should also decay — start with high FM depth that reduces over 300-500ms for a bright attack that mellows"],
      "modulationSettings": ["Modulate the FM depth with the amp envelope — bright attack that fades to a softer tone as the bell rings", "Very slow LFO (0.05-0.1 Hz) to FM depth for subtle timbral drift over time", "This creates bells that shimmer and evolve — perfect for ambient music"],
      "eqSettings": ["High-pass at 200Hz to keep bells in the upper register", "Cut any harsh resonances that the FM creates (usually 3-5kHz area)", "Gentle air boost above 10kHz for sparkle"],
      "effects": ["Reverb: long hall or cathedral (3-6 second decay), 50-70% wet — bells love big reverb spaces", "The reverb is as important as the sound itself — it creates the ambient atmosphere", "Delay: tempo-synced ping-pong delay (1/4 or 1/8 note) for rhythmic texture", "Chorus: subtle (10-15%) for additional shimmer", "No distortion — keep bells clean and crystalline"],
      "mixTips": ["Bells sit in the upper-mid to high frequency range — they will not conflict with bass or kick", "Use sparingly — a single bell hit every 4 or 8 bars creates more impact than constant bell melodies", "Pan different bell hits across the stereo field for an immersive spatial effect", "Layer bells at different octaves and FM ratios for a rich, complex bell chord", "Velocity variation creates natural-sounding bell performances — harder hits should also have more FM depth"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Pluck", "confidence": 78}, {"name": "Lead", "confidence": 35}],
      "polyphony": "poly",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '9 days'
);

-- 17. Growl Bass (Riddim)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Growl Bass (Riddim)',
  'An aggressive mid-range growl bass used in riddim and heavy dubstep. Created through heavy distortion, wavetable manipulation, and formant filtering, this sound has a vocal-like growling quality. Producers like Virtual Riot, Svdden Death, and Subtronics have pushed this sound into extreme territory.',
  ARRAY['Bass', 'Riddim', 'Dubstep'],
  'Bass',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.395",
      "brightness": "0.478",
      "spectralCentroid": "2150.6",
      "harmonicity": "0.352",
      "attackTime": "6.5",
      "bpm": {"bpm": 150, "suggestedTempo": 150, "tempoRange": {"min": 145, "max": 155}, "confidence": 0.90},
      "key": {"key": "G", "mode": "minor", "scale": "G minor", "camelot": "6A", "confidence": 0.72, "notes": ["G","A","Bb","C","D","Eb","F"], "compatibleKeys": [{"code":"6A","relation":"Same key"},{"code":"7B","relation":"Perfect fourth"},{"code":"5A","relation":"Perfect fifth"}]},
      "adsr": {"attack": 5, "decay": 180, "sustain": 0.75, "release": 150},
      "waveform": {"type": "complex", "confidence": 70, "description": "Heavily distorted wavetable", "fundamentalFreq": 98.0, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":85},{"harmonic":3,"amplitude":78},{"harmonic":4,"amplitude":68},{"harmonic":5,"amplitude":60},{"harmonic":6,"amplitude":52},{"harmonic":7,"amplitude":45},{"harmonic":8,"amplitude":38}]},
      "filterEnvelope": {"estimatedCutoff": 3500, "filterAttack": 5, "filterDecay": 250, "resonanceIndicator": 58, "sweepDirection": "closing"},
      "modulation": {"lfoRate": 6.0, "tremoloDepth": 0.20, "vibratoDepth": 0.08, "chorusAmount": 0.05, "hasModulation": true},
      "harmonics": [{"frequency":98.0,"note":"G2","amplitude":1.0},{"frequency":196.0,"note":"G3","amplitude":0.85},{"frequency":294.0,"note":"D4","amplitude":0.78},{"frequency":392.0,"note":"G4","amplitude":0.68},{"frequency":490.0,"note":"B4","amplitude":0.60}]
    },
    "recommendations": {
      "synthType": ["Growl basses are built from wavetable synthesis processed through heavy distortion and formant filters", "The sound design chain is: wavetable oscillator → distortion → formant/vowel filter → more distortion", "Start simple — even a distorted saw wave through a formant filter sounds like a growl", "The key is the formant filter — it shapes the harmonics into vowel-like resonances that mimic a growl"],
      "vstSuggestions": ["Vital (Free) — has wavetables, formant filter, and distortion all in one", "Serum (Xfer Records) — industry standard for dubstep sound design"],
      "nativeInstruments": ["FL Studio: Sytrus (waveshaping + filter for basic growls)", "FL Studio: Harmor (resynthesis and additive/subtractive for advanced growls)", "Ableton: Wavetable + Saturator chain"],
      "oscillatorSettings": ["Use a wavetable with harmonic-rich content — not just a basic saw or square", "In Vital: browse the wavetable presets, look for tables labeled \"digital,\" \"harsh,\" or \"formant\"", "Automate the wavetable position with an LFO for timbral movement throughout each note", "Add a sub oscillator (sine, -12 semitones) to anchor the low end — the growl itself lives in the mids"],
      "filterSettings": ["Formant filter (Vital has this) is ideal — morph between vowel positions for the growl character", "If no formant filter: use two parallel bandpass filters with high resonance (60-80%)", "Automate the formant position or filter frequencies with an LFO synced to 1/4 or 1/8 notes", "The filter movement IS the growl — a static filter just sounds like distortion"],
      "envelopeSettings": ["Attack: 3-8ms (fast)", "Decay: 150-200ms", "Sustain: 70-80% (sustained for long bass notes)", "Release: 100-200ms (controlled and tight)"],
      "modulationSettings": ["LFO to wavetable position (1-4 Hz) for timbral movement", "LFO to formant filter morph for the talking/growling quality", "Automate multiple parameters simultaneously — growl basses are all about movement", "Use different LFO rates on different parameters for complex, evolving textures"],
      "eqSettings": ["High-pass at 80-100Hz (the sub oscillator handles the lows)", "Boost the 500Hz-2kHz range where the growl character lives", "Cut above 8kHz to remove harsh digital artifacts from the distortion"],
      "effects": ["Distortion is the core effect — layer multiple stages: soft clip → overdrive → hard clip", "Place distortion BEFORE the formant filter for a different character than after", "Compression (8:1, fast attack) to tame the aggressive dynamics", "OTT (multiband compression) at 30-50% for that modern dubstep loudness", "No reverb during drops — keep it tight and dry. Save reverb for buildups and transitions"],
      "mixTips": ["Always layer a clean sub bass underneath the growl — the growl itself has no clean low end", "The growl should live in the 200Hz-3kHz range, the sub covers everything below", "Sidechain both the sub and growl to the kick", "Use automation clips for filter and wavetable movement — do not set them and forget them", "Sound design is iterative — make the basic sound, then bounce it to audio and process it again for more complexity", "Start with presets and modify them — learning what each parameter does is faster than building from scratch"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Bass", "confidence": 88}, {"name": "Lead", "confidence": 48}],
      "polyphony": "mono",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '8 days'
);

-- 18. String Pad (Cinematic)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'String Pad (Cinematic)',
  'An orchestral-style string pad for cinematic, film scoring, and emotional builds. This is a synthesized string ensemble that mimics the warm, rich texture of real strings. Used in movie trailers, emotional EDM breakdowns, and ambient interludes for depth and gravitas.',
  ARRAY['Pad', 'Cinematic', 'Strings'],
  'Strings',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.205",
      "brightness": "0.382",
      "spectralCentroid": "1950.5",
      "harmonicity": "0.845",
      "attackTime": "380.0",
      "bpm": {"bpm": 80, "suggestedTempo": 80, "tempoRange": {"min": 75, "max": 85}, "confidence": 0.52},
      "key": {"key": "D", "mode": "minor", "scale": "D minor", "camelot": "7A", "confidence": 0.86, "notes": ["D","E","F","G","A","Bb","C"], "compatibleKeys": [{"code":"7A","relation":"Same key"},{"code":"8B","relation":"Perfect fourth"},{"code":"6A","relation":"Perfect fifth"}]},
      "adsr": {"attack": 350, "decay": 600, "sustain": 0.78, "release": 2000},
      "waveform": {"type": "saw", "confidence": 72, "description": "Multiple detuned saws filtered for warmth", "fundamentalFreq": 293.66, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":45},{"harmonic":3,"amplitude":28},{"harmonic":4,"amplitude":18},{"harmonic":5,"amplitude":12},{"harmonic":6,"amplitude":8}]},
      "filterEnvelope": {"estimatedCutoff": 3200, "filterAttack": 300, "filterDecay": 800, "resonanceIndicator": 12, "sweepDirection": "opening"},
      "modulation": {"lfoRate": 5.8, "tremoloDepth": 0.10, "vibratoDepth": 0.15, "chorusAmount": 0.42, "hasModulation": true},
      "harmonics": [{"frequency":293.66,"note":"D4","amplitude":1.0},{"frequency":587.33,"note":"D5","amplitude":0.45},{"frequency":880.0,"note":"A5","amplitude":0.28}]
    },
    "recommendations": {
      "synthType": ["Synth strings are built from detuned saw waves with vibrato and slow envelopes", "The key ingredients are: unison detune for ensemble width, vibrato for realism, and slow attack for drama", "Layer two string patches: one playing sustained chords and one playing the same part an octave higher at lower volume", "Real strings swell slowly — never use a fast attack on a cinematic string pad"],
      "vstSuggestions": ["Vital (Free) — detuned saws with chorus and vibrato", "Spitfire LABS Strings (free, sampled real strings — great for layering)", "BBC Symphony Orchestra Discover (free tier, real orchestral samples)"],
      "nativeInstruments": ["FL Studio: 3x Osc (three saws with subtle detune + chorus)", "FL Studio: FLEX (browse Strings/Orchestral category)", "Ableton: Tension or Wavetable with string-like wavetables"],
      "oscillatorSettings": ["OSC 1: Sawtooth wave with 4-6 unison voices, moderate detune (20-30%)", "OSC 2: Sawtooth wave, same octave, slightly different detune for ensemble thickness", "The detuned unison voices simulate multiple string players who are never perfectly in tune", "Keep both oscillators at similar volume levels"],
      "filterSettings": ["Low-pass filter at 2500-3500Hz — strings are warm, not bright", "Filter envelope matching the amp envelope: slow attack (300ms+) for gradual brightness swell", "Very low resonance (5-10%) — strings should be smooth", "Key tracking at 40-50% so higher notes are naturally a bit brighter"],
      "envelopeSettings": ["Attack: 300-500ms (slow swell — this is critical for the cinematic feel)", "Decay: 500-800ms", "Sustain: 75-85% (strings sustain well)", "Release: 1500-2500ms (very long fade — strings linger after release)", "Tip: automate the attack time — faster attack for rhythmic string stabs, slower for emotional pads"],
      "modulationSettings": ["Vibrato: LFO to pitch at 5-6 Hz, depth 12-18 cents (simulates bow vibrato)", "Delay the vibrato onset by 300-400ms — real string players do not vibrate immediately", "Slow LFO (0.1 Hz) to filter cutoff for gentle timbral drift", "Subtle LFO to volume (tremolo) at 5-6 Hz for realistic bow pressure variation"],
      "eqSettings": ["High-pass at 120-150Hz to leave room for bass instruments", "Gentle boost around 800-1200Hz for warmth and body", "Cut any harshness at 3-5kHz", "Optional: air boost above 10kHz for shimmer on the highest strings"],
      "effects": ["Reverb: large hall (3-5 second decay), 40-55% wet — strings need space to breathe", "Chorus for additional width and ensemble size", "No compression — let the dynamics of the slow attack and release breathe naturally", "EQ after reverb to control any low-end buildup from the long reverb tail"],
      "mixTips": ["String pads are background elements — mix them at a level where they support the melody without competing", "Automate the volume to swell during emotional moments and pull back during verses", "Layer with a real string sample library (like free Spitfire LABS) for added realism", "Use two instances: one playing root+fifth for low strings, one playing the full chord an octave up for violins", "Pan low strings center, high strings wide for a natural orchestral image", "The slow attack makes strings perfect for transition effects — automate volume swells at section changes"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Strings", "confidence": 90}, {"name": "Pad", "confidence": 72}],
      "polyphony": "poly",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '7 days'
);

-- 19. Drill 808 Slide
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Drill 808 Slide',
  'The pitch-bending 808 pattern that defines UK drill and NY drill. Unlike the sustained trap 808, drill 808s feature rapid pitch slides between notes, creating an aggressive, melodic bass line that drives the entire beat. Think Pop Smoke, Central Cee, and 808Melo productions.',
  ARRAY['Bass', 'Drill', 'Hip-Hop'],
  'Bass',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.372",
      "brightness": "0.135",
      "spectralCentroid": "285.4",
      "harmonicity": "0.928",
      "attackTime": "6.2",
      "bpm": {"bpm": 140, "suggestedTempo": 140, "tempoRange": {"min": 136, "max": 144}, "confidence": 0.93},
      "key": {"key": "Bb", "mode": "minor", "scale": "Bb minor", "camelot": "3A", "confidence": 0.88, "notes": ["Bb","C","Db","Eb","F","Gb","Ab"], "compatibleKeys": [{"code":"3A","relation":"Same key"},{"code":"4B","relation":"Perfect fourth"},{"code":"2A","relation":"Perfect fifth"}]},
      "adsr": {"attack": 4, "decay": 60, "sustain": 0.88, "release": 800},
      "waveform": {"type": "sine", "confidence": 92, "description": "Saturated sine wave with pitch slides", "fundamentalFreq": 58.27, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":18},{"harmonic":3,"amplitude":12},{"harmonic":4,"amplitude":6}]},
      "filterEnvelope": {"estimatedCutoff": 220, "filterAttack": 2, "filterDecay": 25, "resonanceIndicator": 8, "sweepDirection": "closing"},
      "modulation": {"lfoRate": 0, "tremoloDepth": 0, "vibratoDepth": 0, "chorusAmount": 0, "hasModulation": false},
      "harmonics": [{"frequency":58.27,"note":"Bb1","amplitude":1.0},{"frequency":116.54,"note":"Bb2","amplitude":0.18}]
    },
    "recommendations": {
      "synthType": ["Drill 808s are the same sine-wave 808 as trap, but the programming is completely different", "The slides (pitch bends between notes) are what define the drill sound", "Use portamento/glide between notes — set it to 40-80ms for fast, aggressive slides", "Write bass patterns that move between notes rapidly with slides connecting every note"],
      "vstSuggestions": ["Vital (Free) — sine oscillator with portamento/glide", "Spinz 808 or other 808 sample packs pitched in a sampler"],
      "nativeInstruments": ["FL Studio: 3x Osc (sine wave with Portamento enabled in Misc tab)", "FL Studio: Channel Rack sampler with an 808 sample and slide notes", "Ableton: Operator (sine carrier with glide)"],
      "oscillatorSettings": ["Pure sine wave — identical to a trap 808 in tone", "Pitch envelope for the initial click: +12 semitones dropping to 0 over 30-50ms", "Monophonic mode with portamento/glide enabled at all times", "Glide time: 40-80ms (faster than R&B portamento — drill slides are snappy, not smooth)", "In FL Studio: use slide notes in the piano roll (right-click note → Slide)"],
      "filterSettings": ["Low-pass filter at 180-250Hz to keep it sub-heavy", "No resonance", "Same as trap 808 — the difference is in the programming, not the tone"],
      "envelopeSettings": ["Attack: 2-5ms (instant hit)", "Decay: 40-70ms (pitch envelope only)", "Sustain: 85-92% (sustained to let slides ring through)", "Release: 600-1000ms (slightly shorter than trap 808 — drill patterns are tighter)", "Tip: experiment with slightly shorter release (400ms) for busier patterns so notes do not bleed into each other"],
      "modulationSettings": ["No LFO or modulation — the slides between notes provide all the movement", "The entire character comes from the piano roll programming, not the synth settings"],
      "eqSettings": ["High-pass at 25Hz to remove inaudible rumble", "Low-pass at 200Hz for a clean sub", "Slight boost at 60-80Hz for weight on speakers and headphones"],
      "effects": ["Light saturation (Fruity Soft Clipper) for harmonics — drill 808s are slightly more saturated than trap 808s", "Sidechain to kick (fast attack, short release around 80-100ms)", "Limiting or soft clipping to keep the peaks controlled during rapid slides", "Keep it dry — no reverb or delay on the 808"],
      "mixTips": ["Write patterns with frequent slides between the root note and notes a 3rd, 4th, or 5th above", "Use short notes with slides connecting them — the pattern should feel like a bass melody, not just sustained notes", "Every note should slide into the next — the slide IS the groove", "Keep it mono, no stereo width", "The 808 carries both the bass AND the melody in drill — your melodic elements should stay in the mids and highs", "Study Pop Smoke type beats on YouTube to understand the slide patterns — they follow specific rhythmic conventions"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Bass", "confidence": 95}, {"name": "Sub-bass", "confidence": 88}],
      "polyphony": "mono",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '6 days'
);

-- 20. Flute Lead (Latin Trap)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Flute Lead (Latin Trap)',
  'A digital flute melody popularized in Latin trap and reggaeton. Made famous by producers like Tainy, Sky Rompiendo, and Ovy on the Drums. This is not a real flute — it is a synthesized or sampled flute tone processed with reverb, delay, and sometimes pitch effects for a modern feel.',
  ARRAY['Lead', 'Latin', 'Trap'],
  'Lead',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.188",
      "brightness": "0.515",
      "spectralCentroid": "2580.2",
      "harmonicity": "0.912",
      "attackTime": "28.5",
      "bpm": {"bpm": 136, "suggestedTempo": 136, "tempoRange": {"min": 132, "max": 140}, "confidence": 0.86},
      "key": {"key": "E", "mode": "minor", "scale": "E minor", "camelot": "9A", "confidence": 0.82, "notes": ["E","F#","G","A","B","C","D"], "compatibleKeys": [{"code":"9A","relation":"Same key"},{"code":"10B","relation":"Perfect fourth"},{"code":"8A","relation":"Perfect fifth"}]},
      "adsr": {"attack": 25, "decay": 180, "sustain": 0.62, "release": 350},
      "waveform": {"type": "triangle", "confidence": 74, "description": "Breathy triangle with air noise", "fundamentalFreq": 659.26, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":15},{"harmonic":3,"amplitude":32},{"harmonic":4,"amplitude":5},{"harmonic":5,"amplitude":18}]},
      "filterEnvelope": {"estimatedCutoff": 4200, "filterAttack": 15, "filterDecay": 120, "resonanceIndicator": 15, "sweepDirection": "stable"},
      "modulation": {"lfoRate": 5.0, "tremoloDepth": 0.08, "vibratoDepth": 0.12, "chorusAmount": 0.08, "hasModulation": true},
      "harmonics": [{"frequency":659.26,"note":"E5","amplitude":1.0},{"frequency":1318.51,"note":"E6","amplitude":0.15},{"frequency":1975.53,"note":"B6","amplitude":0.32}]
    },
    "recommendations": {
      "synthType": ["You can synthesize a flute from a triangle wave with noise layered on top, or use a sample", "The breathiness comes from white noise mixed very quietly behind the main tone", "Real flute samples are often easier and sound more convincing — try free sample libraries", "Keep the melodies pentatonic (5-note scale) for an authentic Latin feel"],
      "vstSuggestions": ["Vital (Free) — triangle oscillator + noise oscillator for the breathy quality", "Spitfire LABS (free) — has usable woodwind and flute samples"],
      "nativeInstruments": ["FL Studio: FLEX (browse Woodwind/Flute category for starting points)", "FL Studio: 3x Osc (triangle wave + noise blend for synthesis approach)", "Ableton: Wavetable or Sampler with flute multisample"],
      "oscillatorSettings": ["Synthesis approach — OSC 1: Triangle wave (the main flute tone)", "OSC 2: White noise, filtered through a bandpass at 3-5kHz, very low volume (10-15%) for the breathy air sound", "Sample approach — load a flute sample into your sampler and play it chromatically", "Play in the E5-E6 range — flute melodies in Latin trap are high-pitched and airy"],
      "filterSettings": ["Low-pass filter at 3500-4500Hz — flutes are bright but not harsh", "High-pass at 300-400Hz — flutes have no low-end content", "Gentle resonance (10-18%) at the cutoff for a slight nasal quality"],
      "envelopeSettings": ["Attack: 20-35ms (slightly soft, like a real breath onset)", "Decay: 150-200ms", "Sustain: 55-65%", "Release: 300-400ms (moderate, with delay filling the gaps)"],
      "modulationSettings": ["Vibrato: LFO to pitch at 4-5 Hz, depth 10-15 cents for a realistic flute vibrato", "Delay the vibrato by 150-200ms so it starts after the note onset", "Very subtle tremolo (amplitude LFO at 5 Hz, depth 5-8%) for breath variation"],
      "eqSettings": ["High-pass at 300-400Hz aggressively — there should be nothing below this", "Gentle boost around 1-2kHz for warmth", "Cut any harshness at 4-6kHz", "Air boost above 10kHz for the breathy quality"],
      "effects": ["Reverb: medium hall (1.5-2s decay), 30-40% wet for spaciousness", "Delay: 1/4 note dotted, 25-35% wet — this fills in the melody and creates a cascading effect", "The delay is crucial — Latin trap flute melodies rely on the echo to sound full", "Light chorus (10%) for subtle width"],
      "mixTips": ["Keep the flute melody simple — 4-8 notes in a pattern, repeated with variations", "Use a pentatonic minor scale for the most authentic Latin trap sound", "The flute should sit above everything else in the frequency spectrum — it is the highest element", "Leave space between notes for the delay to be heard — rapid fire notes will blur together", "Pan the dry signal center, let the reverb and delay tail spread wide", "Layer with a very quiet pad or strings playing the same harmony for depth"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Lead", "confidence": 82}, {"name": "Woodwind", "confidence": 68}],
      "polyphony": "mono",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '5 days'
);

-- 21. Phonk Cowbell
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Phonk Cowbell',
  'The distorted, reverb-drenched cowbell that defines the phonk and Memphis rap aesthetic. Rooted in 90s Memphis hip-hop by Three 6 Mafia and DJ Paul, the phonk cowbell is a lo-fi, crushed percussion element layered with heavy reverb and driven through tape saturation.',
  ARRAY['Drums', 'Phonk', 'Memphis'],
  'Drums',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.198",
      "brightness": "0.725",
      "spectralCentroid": "5680.4",
      "harmonicity": "0.285",
      "attackTime": "1.2",
      "bpm": {"bpm": 130, "suggestedTempo": 130, "tempoRange": {"min": 126, "max": 134}, "confidence": 0.88},
      "key": {"key": "N/A", "mode": "none", "scale": "Chromatic", "camelot": "", "confidence": 0.0, "notes": [], "compatibleKeys": []},
      "adsr": {"attack": 0, "decay": 120, "sustain": 0.08, "release": 250},
      "waveform": {"type": "complex", "confidence": 60, "description": "Metallic percussion with inharmonics", "fundamentalFreq": 800.0, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":72},{"harmonic":3,"amplitude":58},{"harmonic":4,"amplitude":45}]},
      "filterEnvelope": {"estimatedCutoff": 6000, "filterAttack": 0, "filterDecay": 80, "resonanceIndicator": 20, "sweepDirection": "closing"},
      "modulation": {"lfoRate": 0, "tremoloDepth": 0, "vibratoDepth": 0, "chorusAmount": 0, "hasModulation": false},
      "harmonics": [{"frequency":800.0,"note":"","amplitude":1.0},{"frequency":1340.0,"note":"","amplitude":0.72},{"frequency":1720.0,"note":"","amplitude":0.58}]
    },
    "recommendations": {
      "synthType": ["Phonk cowbells are sample-based — find a cowbell sample and destroy it with effects", "The classic source is a Roland TR-808 cowbell sample, then processed through lo-fi effects", "The processing chain is: sample → pitch down slightly → distortion → heavy reverb → more distortion", "The cowbell plays on every beat or half-beat, creating a hypnotic, driving pattern"],
      "vstSuggestions": ["Any DAW sampler with a cowbell sample loaded", "iZotope Vinyl (free) — for the lo-fi vinyl degradation", "CamelCrusher (free) — for the distortion"],
      "nativeInstruments": ["FL Studio: Channel Rack (load a cowbell sample directly)", "FL Studio: FPC with an 808 cowbell sample", "Ableton: Simpler or Drum Rack"],
      "oscillatorSettings": ["Not applicable — use a cowbell sample from a sample pack or your DAW", "If synthesizing: two square wave oscillators at non-harmonic frequencies (800Hz + 540Hz) with fast decay", "Pitch the sample down 2-4 semitones from its original pitch for a darker, heavier tone"],
      "filterSettings": ["Bandpass filter centered around 2-4kHz to isolate the cowbell body", "Remove low frequencies below 500Hz — the cowbell should not interfere with kick or bass", "Cut extreme highs above 8kHz to keep it dark and lo-fi"],
      "envelopeSettings": ["Let the sample play naturally — cowbells have a fast attack and natural decay", "Shorten the decay to 80-120ms for a tight, punchy hit", "Longer decay (200ms+) for an open, ringy cowbell used as an accent"],
      "modulationSettings": ["No modulation on the cowbell itself", "The pattern programming provides all the rhythmic variation needed"],
      "eqSettings": ["High-pass at 400-600Hz", "Low-pass at 6-8kHz for a dark, lo-fi quality", "Boost the fundamental around 800-1000Hz for body"],
      "effects": ["Distortion first: Fruity Soft Clipper, Blood Overdrive, or CamelCrusher for grit", "Reverb: medium room or hall (1-2s decay), 40-55% wet — the reverb is a huge part of the phonk sound", "More saturation AFTER the reverb to crush the reverb tail", "Bit crusher: reduce to 8-12 bit for that lo-fi, crushed texture", "Vinyl simulation (iZotope Vinyl, free) for crackle and wow/flutter"],
      "mixTips": ["The cowbell plays a simple, repetitive pattern — every beat or on the off-beats", "Keep the volume moderate — it should be present but not louder than kick or snare", "Layer multiple cowbell samples with different pitches and processing for a thicker sound", "Add a vinyl noise layer underneath the whole drum bus for authenticity", "Pan the cowbell slightly off-center (10-15%) for a lo-fi, imperfect stereo image", "Study Three 6 Mafia and DJ Paul productions for authentic phonk cowbell patterns and vibes"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Drums", "confidence": 92}],
      "polyphony": "single",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '4 days'
);

-- 22. Jersey Club Kick Pattern
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Jersey Club Kick Pattern',
  'The syncopated, bouncy kick drum pattern that defines Jersey club music. Originating from Newark and the broader New Jersey club scene, this pattern uses rapid, off-beat kick placements to create an infectious, bounceable groove. The kick itself is punchy and tight — the magic is entirely in the rhythm.',
  ARRAY['Drums', 'Jersey Club', 'Dance'],
  'Kick',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.345",
      "brightness": "0.292",
      "spectralCentroid": "980.2",
      "harmonicity": "0.215",
      "attackTime": "1.5",
      "bpm": {"bpm": 130, "suggestedTempo": 130, "tempoRange": {"min": 126, "max": 134}, "confidence": 0.95},
      "key": {"key": "N/A", "mode": "none", "scale": "Chromatic", "camelot": "", "confidence": 0.0, "notes": [], "compatibleKeys": []},
      "adsr": {"attack": 0, "decay": 65, "sustain": 0.0, "release": 80},
      "waveform": {"type": "sine", "confidence": 68, "description": "Tight kick drum transient with sub decay", "fundamentalFreq": 55.0, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":42},{"harmonic":3,"amplitude":25}]},
      "filterEnvelope": {"estimatedCutoff": 2200, "filterAttack": 0, "filterDecay": 30, "resonanceIndicator": 15, "sweepDirection": "closing"},
      "modulation": {"lfoRate": 0, "tremoloDepth": 0, "vibratoDepth": 0, "chorusAmount": 0, "hasModulation": false},
      "harmonics": [{"frequency":55.0,"note":"A1","amplitude":1.0},{"frequency":110.0,"note":"A2","amplitude":0.42}]
    },
    "recommendations": {
      "synthType": ["Jersey club is about the PATTERN, not the sound — use any punchy, tight kick sample", "The kick should be short and snappy with minimal sub tail — this is not an 808", "The signature pattern uses rapid kick rolls and off-beat placements at 130 BPM", "The bed squeak sample is also iconic in Jersey club — layer it with your kicks for authenticity"],
      "vstSuggestions": ["Any sampler with a tight, punchy kick loaded", "No synth needed — this is sample and pattern work"],
      "nativeInstruments": ["FL Studio: Channel Rack or FPC with a short kick sample", "FL Studio: Step Sequencer is perfect for programming Jersey patterns", "Ableton: Drum Rack"],
      "oscillatorSettings": ["Not applicable — use a kick drum sample, not an oscillator", "The ideal kick is short (under 80ms), punchy, and has a clear transient click", "Avoid boomy or sub-heavy kicks — Jersey club kicks need to be tight for the rapid patterns", "Layer a short, punchy acoustic kick with a subtle sine sub hit for weight"],
      "filterSettings": ["High-pass at 30Hz on the kick sample to remove sub rumble", "The kick should have punch in the 60-100Hz range and click in the 2-5kHz range", "Low-pass at 8kHz to keep it controlled"],
      "envelopeSettings": ["The sample should have a very short decay — under 80ms", "No sustain — Jersey kicks are purely transient", "If the kick sample is too long, shorten it manually or use a noise gate"],
      "modulationSettings": ["No modulation on the kick itself", "All the movement and groove comes from the pattern programming"],
      "eqSettings": ["Boost at 60-80Hz for punch", "Boost at 2-4kHz for the click attack", "Cut 200-400Hz to remove boxiness — keeps the kick tight"],
      "effects": ["Light compression (4:1, fast attack 1ms, fast release 50ms) to maximize punch", "No reverb on the kick — keep it dry and tight", "Transient shaper to emphasize the attack if available", "Sidechain your other elements to the kick to make the pattern breathe"],
      "mixTips": ["The classic Jersey club kick pattern: syncopated 16th-note kicks with gaps that create a bounce", "Use FL Studio step sequencer or piano roll at 1/16 resolution", "The pattern typically groups kicks in bursts of 2-3, with rests in between for the bounce", "Add a tight clap or snare on beats 2 and 4 for the backbeat", "The BPM should be 128-134 — typically 130 BPM is the sweet spot", "Layer the kick pattern with vocal chops, bed squeaks, and short stab samples for the full Jersey club sound", "Study producers like DJ Jayhood, Nadus, and Sliink for authentic pattern programming"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Kick", "confidence": 94}, {"name": "Drums", "confidence": 88}],
      "polyphony": "single",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '3 days'
);

-- 23. Detuned Chord Stab (Garage)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Detuned Chord Stab (Garage)',
  'A short, wide chord stab used in UK garage, 2-step, and speed garage. Pitched detuned saw waves playing staccato chords with heavy reverb — the kind of stabby, chopped chord sound you hear in tracks by DJ EZ, MJ Cole, and El-B. Usually plays syncopated rhythms that define the 2-step groove.',
  ARRAY['Pluck', 'Garage', 'UK'],
  'Pluck',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.248",
      "brightness": "0.495",
      "spectralCentroid": "2480.5",
      "harmonicity": "0.725",
      "attackTime": "4.5",
      "bpm": {"bpm": 130, "suggestedTempo": 130, "tempoRange": {"min": 126, "max": 134}, "confidence": 0.91},
      "key": {"key": "C", "mode": "minor", "scale": "C minor", "camelot": "5A", "confidence": 0.84, "notes": ["C","D","Eb","F","G","Ab","Bb"], "compatibleKeys": [{"code":"5A","relation":"Same key"},{"code":"6B","relation":"Perfect fourth"},{"code":"4A","relation":"Perfect fifth"}]},
      "adsr": {"attack": 3, "decay": 85, "sustain": 0.12, "release": 350},
      "waveform": {"type": "saw", "confidence": 84, "description": "Detuned sawtooth chord stab", "fundamentalFreq": 261.63, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":48},{"harmonic":3,"amplitude":32},{"harmonic":4,"amplitude":22},{"harmonic":5,"amplitude":16}]},
      "filterEnvelope": {"estimatedCutoff": 4800, "filterAttack": 1, "filterDecay": 60, "resonanceIndicator": 25, "sweepDirection": "closing"},
      "modulation": {"lfoRate": 0, "tremoloDepth": 0, "vibratoDepth": 0, "chorusAmount": 0.42, "hasModulation": true},
      "harmonics": [{"frequency":261.63,"note":"C4","amplitude":1.0},{"frequency":523.25,"note":"C5","amplitude":0.48},{"frequency":783.99,"note":"G5","amplitude":0.32}]
    },
    "recommendations": {
      "synthType": ["UK garage chord stabs are detuned saw chords with short envelopes and big reverb", "The combination of the staccato envelope and reverb tail creates the signature garage shimmer", "Play minor 7th or 9th chords for authentic garage harmony", "The detune provides width, the short decay provides rhythm, the reverb provides space"],
      "vstSuggestions": ["Vital (Free) — detuned saw oscillators with fast envelope", "TAL-U-NO-62 (free Juno emulation) — the Juno chord stab IS the UK garage sound"],
      "nativeInstruments": ["FL Studio: 3x Osc (detuned saws with short amp envelope + reverb)", "FL Studio: Sytrus (two detuned saw operators)", "Ableton: Analog (detuned saw oscillators with chorus)"],
      "oscillatorSettings": ["OSC 1: Sawtooth wave with 3-5 unison voices, detune at 25-35%", "OSC 2: Sawtooth wave, same octave, detuned from OSC 1 by +8 to +12 cents", "The detune creates a warm, wide chorus effect that defines the garage stab character", "Polyphonic mode — you are playing full chords (3-4+ notes)"],
      "filterSettings": ["Low-pass filter at 4000-5500Hz", "Filter envelope: fast attack (1ms), short decay (40-70ms), low sustain — mimics the amp envelope", "Resonance at 20-30% for a subtle peak during the filter sweep", "This filter sweep on each note gives each stab a slight brightness at the start that fades quickly"],
      "envelopeSettings": ["Attack: 2-5ms (fast but no click)", "Decay: 60-100ms (short — stabs should be punchy and rhythmic)", "Sustain: 5-15% (very low — the stab should not sustain, it should decay into the reverb)", "Release: 250-400ms (let the reverb tail do the sustaining)", "Tip: the decay time directly controls how choppy vs. smooth the stabs feel"],
      "modulationSettings": ["No LFO modulation — the chorus/detune effect provides all the movement needed", "Velocity sensitivity for dynamics in the chord pattern — accented stabs louder, ghost stabs quieter"],
      "eqSettings": ["High-pass at 200-250Hz to leave room for the bass", "Boost around 1-2kHz for warmth and body", "Cut harshness at 4-6kHz if the detune creates sizzle"],
      "effects": ["Chorus is essential if your oscillators do not already have enough detune (TAL-Chorus-LX, free)", "Reverb: plate or medium room (1-2s decay), 30-45% wet — the reverb tail IS the sound", "A touch of delay (1/16 note, 10-15% wet) for rhythmic interest", "No distortion — garage stabs should be clean and smooth"],
      "mixTips": ["Play syncopated chord patterns — NOT on every beat. Garage is about the off-beat rhythm", "The classic 2-step garage rhythm: chords hit on the \"and\" of beat 1 and beat 3, with variations", "Use minor 7th chords (Cm7, Fm7, Gm7) for authentic garage harmony", "The sub bass carries the low end — keep the stabs high-passed above 200Hz", "Pan width from the detune creates the spacious feel — do not collapse to mono", "Layer with a sub bass playing root notes on beats 1 and 3 for the full garage foundation"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Pluck", "confidence": 85}, {"name": "Pad", "confidence": 32}],
      "polyphony": "poly",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '2 days'
);

-- 24. OB-Xd Brass (Synthwave)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'OB-Xd Brass (Synthwave)',
  'An analog-style brass synth patch inspired by the Oberheim OB-X and OB-Xa synthesizers. This thick, warm brass sound was ubiquitous in 80s pop, synthwave, and film scores. Think Van Halen "Jump," A-ha "Take On Me," and modern synthwave artists like Gunship and FM-84.',
  ARRAY['Lead', 'Synthwave', 'Retro'],
  'Lead',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.275",
      "brightness": "0.468",
      "spectralCentroid": "2280.4",
      "harmonicity": "0.788",
      "attackTime": "42.5",
      "bpm": {"bpm": 110, "suggestedTempo": 110, "tempoRange": {"min": 106, "max": 114}, "confidence": 0.82},
      "key": {"key": "F", "mode": "major", "scale": "F major", "camelot": "7B", "confidence": 0.85, "notes": ["F","G","A","Bb","C","D","E"], "compatibleKeys": [{"code":"7B","relation":"Same key"},{"code":"8B","relation":"Perfect fourth"},{"code":"6B","relation":"Perfect fifth"}]},
      "adsr": {"attack": 38, "decay": 300, "sustain": 0.68, "release": 350},
      "waveform": {"type": "saw", "confidence": 88, "description": "Warm detuned sawtooth pair", "fundamentalFreq": 349.23, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":52},{"harmonic":3,"amplitude":35},{"harmonic":4,"amplitude":25},{"harmonic":5,"amplitude":18},{"harmonic":6,"amplitude":14}]},
      "filterEnvelope": {"estimatedCutoff": 3800, "filterAttack": 30, "filterDecay": 180, "resonanceIndicator": 32, "sweepDirection": "opening"},
      "modulation": {"lfoRate": 0, "tremoloDepth": 0, "vibratoDepth": 0.05, "chorusAmount": 0.35, "hasModulation": true},
      "harmonics": [{"frequency":349.23,"note":"F4","amplitude":1.0},{"frequency":698.46,"note":"F5","amplitude":0.52},{"frequency":1047.0,"note":"C6","amplitude":0.35},{"frequency":1396.91,"note":"F6","amplitude":0.25}]
    },
    "recommendations": {
      "synthType": ["Synth brass is two detuned saw waves with a slow filter envelope that opens on each note", "The filter attack creates the brass-like swell — the sound starts muffled and brightens as the filter opens", "Layer with unison detune for that wide, thick Oberheim character", "Play power chords (root + fifth) or octaves for the most impactful brass stabs"],
      "vstSuggestions": ["Vital (Free) — two saw oscillators with filter envelope", "OB-Xd (free Oberheim emulation by discoDSP) — authentic Oberheim brass", "TAL-U-NO-62 (free Juno emulation) — also excellent for retro brass"],
      "nativeInstruments": ["FL Studio: 3x Osc (two saws detuned with filter envelope via Fruity Love Philter)", "FL Studio: Sytrus (two saw operators with filter mod)", "Ableton: Analog (saw oscillators + filter envelope)"],
      "oscillatorSettings": ["OSC 1: Sawtooth wave (main body of the brass sound)", "OSC 2: Sawtooth wave, same octave, detuned +6 to +10 cents for subtle width", "2-4 unison voices per oscillator with 15-25% detune for thickness", "Keep it polyphonic for chords, or monophonic with glide for lead lines"],
      "filterSettings": ["Low-pass filter (12dB/oct for warmth, or 24dB/oct for more dramatic sweep)", "Base cutoff: 400-800Hz (starts muffled)", "Filter envelope: attack 25-45ms, decay 150-200ms, sustain 60-70%", "The filter opens to about 3500-4000Hz during the envelope peak", "Resonance at 25-35% for a slight horn-like edge during the sweep", "This slow filter open IS the brass character — without it, it is just a saw pad"],
      "envelopeSettings": ["Attack: 30-50ms (the slightly slow onset combined with filter attack creates the brass swell)", "Decay: 250-350ms", "Sustain: 65-72%", "Release: 300-400ms", "Tip: faster attack (10-15ms) for stabby brass, slower (50-80ms) for swelling brass pads"],
      "modulationSettings": ["Chorus for width and warmth — this is the 80s secret ingredient", "Very subtle pitch drift LFO (0.05 Hz, 3-5 cents) for analog-style instability", "No vibrato on brass — keep it steady and powerful"],
      "eqSettings": ["High-pass at 150Hz to leave room for bass", "Boost around 1-2kHz for warmth and body", "Gentle boost at 3-4kHz for the brass bite and edge", "Roll off above 8kHz for a warm, vintage character"],
      "effects": ["Chorus is essential — use TAL-Chorus-LX (free) or Vital built-in chorus for 80s width", "Reverb: plate or medium hall (1.5-2s decay), 25-35% wet", "Delay: optional 1/4 note at 15% wet for space", "Light tape saturation for analog warmth — keep it subtle"],
      "mixTips": ["Synth brass should be a prominent element — mix it loud and proud for the 80s effect", "Play sustained chords during choruses and staccato stabs during verses", "Layer two instances: one playing chords in a mid range, one playing octaves an octave higher for power", "The filter envelope attack should match the feel of the track — tighter for uptempo, slower for ballads", "Use velocity to control the filter envelope depth — harder hits should open the filter more", "Reference Jump by Van Halen or any Gunship track for authentic synth brass mixing levels"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Lead", "confidence": 85}, {"name": "Brass", "confidence": 68}],
      "polyphony": "poly",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '1 day'
);

-- 25. Granular Texture (Experimental)
INSERT INTO public.analyses (user_id, title, description, tags, instrument, is_public, post_type, results, created_at)
VALUES (
  seed_user_id,
  'Granular Texture (Experimental)',
  'A shimmering, evolving texture created through granular synthesis. Granular synthesis works by slicing audio into tiny grains (1-100ms) and reassembling them in new ways — stretching, scattering, and layering to create otherworldly textures impossible with traditional synthesis. Used in experimental electronic, ambient, and sound design.',
  ARRAY['Pad', 'Experimental', 'Sound Design'],
  'Pad',
  true,
  'recipe',
  '{
    "features": {
      "rms": "0.135",
      "brightness": "0.425",
      "spectralCentroid": "2050.8",
      "harmonicity": "0.388",
      "attackTime": "450.0",
      "bpm": {"bpm": 100, "suggestedTempo": 100, "tempoRange": {"min": 95, "max": 105}, "confidence": 0.35},
      "key": {"key": "N/A", "mode": "none", "scale": "Chromatic", "camelot": "", "confidence": 0.0, "notes": [], "compatibleKeys": []},
      "adsr": {"attack": 420, "decay": 800, "sustain": 0.60, "release": 3000},
      "waveform": {"type": "complex", "confidence": 45, "description": "Evolving granular texture", "fundamentalFreq": 0, "harmonicProfile": [{"harmonic":1,"amplitude":100},{"harmonic":2,"amplitude":65},{"harmonic":3,"amplitude":72},{"harmonic":4,"amplitude":48},{"harmonic":5,"amplitude":55},{"harmonic":6,"amplitude":38}]},
      "filterEnvelope": {"estimatedCutoff": 4500, "filterAttack": 350, "filterDecay": 1200, "resonanceIndicator": 15, "sweepDirection": "opening"},
      "modulation": {"lfoRate": 0.05, "tremoloDepth": 0.15, "vibratoDepth": 0.08, "chorusAmount": 0.58, "hasModulation": true},
      "harmonics": [{"frequency":220.0,"note":"A3","amplitude":0.65},{"frequency":485.0,"note":"B4","amplitude":0.72},{"frequency":742.0,"note":"F#5","amplitude":0.55},{"frequency":1120.0,"note":"C#6","amplitude":0.48}]
    },
    "recommendations": {
      "synthType": ["Granular synthesis takes any audio source and breaks it into microscopic grains that can be rearranged", "Feed it any sound — a vocal, a piano note, a field recording — and granular synthesis transforms it into something entirely new", "The key parameters are grain size (how long each grain is), density (how many grains play at once), and position (where in the source audio the grains are taken from)", "Start with a simple sound source like a vocal or piano chord, then experiment with grain parameters"],
      "vstSuggestions": ["Vital (Free) — has a sampler oscillator that can do basic granular-like effects", "Granulator II (free Max for Live device in Ableton)", "Ribs (free granular synth by Hvoya Audio)"],
      "nativeInstruments": ["FL Studio: Fruity Granulizer (built-in granular effect)", "FL Studio: Harmor (has granular-like resynthesis capabilities)", "Ableton: Granulator II (free Max for Live device)"],
      "oscillatorSettings": ["Step 1: Load a source sound (vocal, instrument, field recording, anything) into your granular engine", "Step 2: Set grain size to 20-80ms for textural sounds, or 1-5ms for pitch-based frozen tones", "Step 3: Set density to 4-20 grains for a rich, overlapping texture", "Step 4: Slowly scan the position through the source audio for evolving timbre", "Randomize the position slightly for unpredictable, organic movement", "Try loading different source materials — each will produce vastly different textures"],
      "filterSettings": ["Low-pass filter at 3000-5000Hz to tame harshness from the grain boundaries", "Slow filter envelope: attack 300-500ms for gradual brightness reveal", "Very low resonance — granular textures are already complex, resonance adds chaos", "High-pass at 80-120Hz if the grains create rumble"],
      "envelopeSettings": ["Attack: 300-600ms (very slow, textural fade-in)", "Decay: 600-1200ms", "Sustain: 50-65%", "Release: 2000-4000ms (extremely long — let the texture dissolve slowly)", "These long times make the granular texture feel ambient and atmospheric"],
      "modulationSettings": ["LFO to grain position (very slow, 0.02-0.1 Hz) for evolving texture over time", "LFO to grain size for morphing between smooth and stuttery textures", "Random modulation (sample-and-hold LFO) to grain parameters for unpredictability", "LFO to stereo spread for spatial movement", "The modulation is what makes granular textures alive instead of static"],
      "eqSettings": ["High-pass at 80-120Hz to control low-frequency buildup", "Gentle scoop at 300-500Hz if it sounds muddy", "Boost around 2-4kHz for presence and detail", "Air shelf above 10kHz for shimmer"],
      "effects": ["Reverb: very long (5-10 second decay), 50-70% wet — granular textures live in reverb", "Delay: tempo-synced or long free-running delays for cascading echoes", "Chorus or ensemble for additional width and smoothing of grain boundaries", "Compression is optional — if the texture is too dynamic, gentle compression (2:1) can even it out", "Freeze reverb or infinite reverb for drone-like sustained textures"],
      "mixTips": ["Granular textures are background elements — keep them at a low volume, they are atmosphere", "Automate the grain position and size throughout the track for constant evolution", "Layer multiple granular patches from different source materials for richer complexity", "Use granular as a transition effect — freeze a vocal or instrument hit into a texture between sections", "Experiment with feeding drums into the granular engine — rhythmic source material creates fascinating stuttered textures", "There are no rules in granular synthesis — happy accidents are the point. Record everything, keep what sounds good"]
    },
    "detectedInstruments": {
      "detected": [{"name": "Pad", "confidence": 72}, {"name": "Strings", "confidence": 28}],
      "polyphony": "poly",
      "fullMixDetected": false
    }
  }'::jsonb,
  now() - interval '12 hours'
);

END $$;
