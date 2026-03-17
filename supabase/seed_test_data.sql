-- ============================================
-- Test Data Seed Script
-- Creates fake users, recipes, likes, follows, and comments
-- Run this in Supabase SQL Editor (runs as postgres superuser)
--
-- WARNING: This inserts test data into auth.users and public tables.
-- Only run this on development/staging databases.
-- To clean up, run the cleanup section at the bottom.
-- ============================================

-- ============================================
-- 1. Create test users in auth.users
-- ============================================
-- Generate 8 test user UUIDs (deterministic so we can reference them)
DO $$
DECLARE
  user_ids uuid[] := ARRAY[
    'a1111111-1111-1111-1111-111111111111',
    'b2222222-2222-2222-2222-222222222222',
    'c3333333-3333-3333-3333-333333333333',
    'd4444444-4444-4444-4444-444444444444',
    'e5555555-5555-5555-5555-555555555555',
    'f6666666-6666-6666-6666-666666666666',
    'a7777777-7777-7777-7777-777777777777',
    'b8888888-8888-8888-8888-888888888888'
  ];
  emails text[] := ARRAY[
    'beatmaker_kai@test.soundrecipe.com',
    'synthwave_luna@test.soundrecipe.com',
    'bass_hunter_303@test.soundrecipe.com',
    'padqueen_aria@test.soundrecipe.com',
    'drumcode_max@test.soundrecipe.com',
    'melodic_sage@test.soundrecipe.com',
    'noisecraft_zoe@test.soundrecipe.com',
    'deephouse_rio@test.soundrecipe.com'
  ];
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    -- Skip if user already exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_ids[i]) THEN
      INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token
      ) VALUES (
        user_ids[i],
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        emails[i],
        crypt('testpassword123', gen_salt('bf')),
        now() - interval '30 days' + (i * interval '2 days'),
        '{"provider":"email","providers":["email"]}',
        '{}',
        now() - interval '30 days' + (i * interval '2 days'),
        now(),
        '',
        ''
      );

      -- Also add identity row (required by Supabase auth)
      INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        provider,
        identity_data,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        user_ids[i],
        user_ids[i]::text,
        'email',
        jsonb_build_object('sub', user_ids[i]::text, 'email', emails[i]),
        now(),
        now() - interval '30 days' + (i * interval '2 days'),
        now()
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- 2. Create profiles (the trigger may have done this, but let's be safe)
-- ============================================
INSERT INTO public.profiles (id, username, bio, skill_level, daw_preference, avatar_url) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'beatmaker_kai',    'FL Studio producer making hard-hitting beats. Love 808s and melodies.', 'intermediate', 'FL Studio', NULL),
  ('b2222222-2222-2222-2222-222222222222', 'synthwave_luna',   'Analog synth enthusiast. Blade Runner vibes only.', 'advanced', 'Ableton Live', NULL),
  ('c3333333-3333-3333-3333-333333333333', 'bass_hunter_303',  'Dubstep and DnB. If it doesn''t wobble, I don''t want it.', 'professional', 'Ableton Live', NULL),
  ('d4444444-4444-4444-4444-444444444444', 'padqueen_aria',    'Ambient textures and lush pads. Making music to dream to.', 'intermediate', 'Logic Pro', NULL),
  ('e5555555-5555-5555-5555-555555555555', 'drumcode_max',     'Techno producer. Drums are everything.', 'advanced', 'Ableton Live', NULL),
  ('f6666666-6666-6666-6666-666666666666', 'melodic_sage',     'Future bass and melodic dubstep. Big chords, bigger drops.', 'intermediate', 'FL Studio', NULL),
  ('a7777777-7777-7777-7777-777777777777', 'noisecraft_zoe',   'Sound designer. I make weird noises and call it art.', 'professional', 'Bitwig', NULL),
  ('b8888888-8888-8888-8888-888888888888', 'deephouse_rio',    'Deep house and lo-fi. Smooth grooves and warm chords.', 'beginner', 'FL Studio', NULL)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  bio = EXCLUDED.bio,
  skill_level = EXCLUDED.skill_level,
  daw_preference = EXCLUDED.daw_preference;

-- ============================================
-- 3. Create published Sound Recipes (analyses with is_public=true)
-- ============================================
-- Each user gets 2-4 published recipes with realistic analysis data
INSERT INTO public.analyses (id, user_id, title, description, tags, instrument, is_public, like_count, comment_count, vital_preset_url, results, created_at) VALUES

-- beatmaker_kai's recipes
('11111111-aaaa-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111',
 'Massive 808 Sub Bass', 'Deep 808 bass sound with long sustain and pitch glide. Key to any trap beat.',
 ARRAY['Bass', 'Kick', 'FX'], 'bass', true, 0, 0,
 'https://example.com/preset1.vital',
 '{"features":{"bpm":{"bpm":140,"suggestedTempo":140},"key":{"key":"C","mode":"minor"},"brightness":0.15,"rms":0.82,"adsr":{"attack":5,"decay":200,"sustain":80,"release":400},"waveform":{"type":"sine","confidence":0.9}},"recommendations":{"synthType":["Start with a sine wave oscillator","Add saturation/distortion for harmonics","Use a pitch envelope for the initial click","Long release, mono mode"],"mixTips":["High-pass everything else above 80Hz","Sidechain the kick to the 808","Boost around 60Hz for chest thump"]},"detectedInstruments":{"detected":[{"name":"Sub-bass","confidence":95},{"name":"Kick","confidence":72}]}}'::jsonb,
 now() - interval '12 days'),

('11111111-aaaa-2222-1111-111111111111', 'a1111111-1111-1111-1111-111111111111',
 'Crispy Hi-Hat Roll', 'Fast hi-hat pattern with velocity variation and subtle pitch modulation.',
 ARRAY['Drums', 'FX'], 'drums', true, 0, 0, NULL,
 '{"features":{"bpm":{"bpm":140,"suggestedTempo":140},"key":{"key":"N/A","mode":""},"brightness":0.88,"rms":0.35,"adsr":{"attack":1,"decay":30,"sustain":10,"release":50},"waveform":{"type":"complex","confidence":0.7}},"recommendations":{"synthType":["Use noise oscillator with band-pass filter","Short decay envelope","Add subtle pitch modulation for rolls","Layer with a click transient"],"mixTips":["High-pass at 8kHz for airiness","Pan slightly off-center","Use velocity to create groove"]},"detectedInstruments":{"detected":[{"name":"Drums","confidence":88}]}}'::jsonb,
 now() - interval '10 days'),

('11111111-aaaa-3333-1111-111111111111', 'a1111111-1111-1111-1111-111111111111',
 'Vintage Piano Chords', 'Warm lo-fi piano with subtle detuning and tape saturation feel.',
 ARRAY['Pluck', 'Strings'], 'pluck', true, 0, 0, NULL,
 '{"features":{"bpm":{"bpm":85,"suggestedTempo":85},"key":{"key":"Eb","mode":"major"},"brightness":0.42,"rms":0.55,"adsr":{"attack":10,"decay":300,"sustain":45,"release":600},"waveform":{"type":"complex","confidence":0.5}},"recommendations":{"synthType":["Layer saw + square with slight detune","Low-pass filter around 3kHz","Add chorus for width","Subtle reverb, medium room"],"mixTips":["Cut below 200Hz if layering with bass","Boost presence around 2-4kHz","Stereo widening on the reverb tail"]},"detectedInstruments":{"detected":[{"name":"Pluck","confidence":65},{"name":"Pad","confidence":40}]}}'::jsonb,
 now() - interval '5 days'),

-- synthwave_luna's recipes
('22222222-aaaa-1111-2222-222222222222', 'b2222222-2222-2222-2222-222222222222',
 'Retro Synthwave Lead', 'Classic analog-style lead with portamento and chorus. Think midnight drive.',
 ARRAY['Lead', 'FX'], 'lead', true, 0, 0,
 'https://example.com/preset2.vital',
 '{"features":{"bpm":{"bpm":118,"suggestedTempo":118},"key":{"key":"A","mode":"minor"},"brightness":0.65,"rms":0.6,"adsr":{"attack":15,"decay":100,"sustain":70,"release":300},"waveform":{"type":"saw","confidence":0.85}},"recommendations":{"synthType":["Two detuned saw oscillators","Low-pass filter at 4kHz with slight resonance","Chorus effect for width","Add portamento/glide for expression"],"mixTips":["Boost around 2kHz for presence","Add stereo delay (dotted 8th)","Layer with a sub one octave down"]},"detectedInstruments":{"detected":[{"name":"Lead","confidence":92}]}}'::jsonb,
 now() - interval '14 days'),

('22222222-aaaa-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222',
 'Dreamy Arp Sequence', 'Arpeggiated synth pad with long reverb tail. Great for intros and breakdowns.',
 ARRAY['Pad', 'Lead', 'FX'], 'pad', true, 0, 0,
 'https://example.com/preset3.vital',
 '{"features":{"bpm":{"bpm":120,"suggestedTempo":120},"key":{"key":"D","mode":"minor"},"brightness":0.55,"rms":0.4,"adsr":{"attack":50,"decay":200,"sustain":60,"release":800},"waveform":{"type":"triangle","confidence":0.75}},"recommendations":{"synthType":["Triangle/sine oscillator blend","Gentle low-pass filter sweep","Long reverb (hall or plate)","Stereo ping-pong delay"],"mixTips":["Keep it subtle in the mix","High-pass at 300Hz","Let the reverb tail breathe"]},"detectedInstruments":{"detected":[{"name":"Pad","confidence":85},{"name":"Lead","confidence":45}]}}'::jsonb,
 now() - interval '8 days'),

-- bass_hunter_303's recipes
('33333333-aaaa-1111-3333-333333333333', 'c3333333-3333-3333-3333-333333333333',
 'Filthy Dubstep Growl', 'Mid-range growl bass with aggressive FM modulation. Absolute face-melter.',
 ARRAY['Bass', 'FX'], 'bass', true, 0, 0,
 'https://example.com/preset4.vital',
 '{"features":{"bpm":{"bpm":150,"suggestedTempo":75},"key":{"key":"F","mode":"minor"},"brightness":0.72,"rms":0.78,"adsr":{"attack":2,"decay":150,"sustain":65,"release":100},"waveform":{"type":"complex","confidence":0.6}},"recommendations":{"synthType":["FM synthesis with feedback","Heavy distortion/waveshaping","Automate filter cutoff aggressively","Layer with sub for low end"],"mixTips":["Mono below 200Hz","Multiband compression","Automate stereo width with filter"]},"detectedInstruments":{"detected":[{"name":"Bass","confidence":88},{"name":"Lead","confidence":30}]}}'::jsonb,
 now() - interval '11 days'),

('33333333-aaaa-2222-3333-333333333333', 'c3333333-3333-3333-3333-333333333333',
 'Reese Bass Layer', 'Classic reese bass using detuned saws. The backbone of any DnB track.',
 ARRAY['Bass'], 'bass', true, 0, 0, NULL,
 '{"features":{"bpm":{"bpm":174,"suggestedTempo":174},"key":{"key":"E","mode":"minor"},"brightness":0.38,"rms":0.72,"adsr":{"attack":8,"decay":100,"sustain":80,"release":200},"waveform":{"type":"saw","confidence":0.88}},"recommendations":{"synthType":["2-3 detuned saw oscillators","Unison voices with spread","Low-pass filter around 2kHz","Subtle phaser for movement"],"mixTips":["Mono the sub frequencies","Layer with a clean sub sine","Automate filter for variation"]},"detectedInstruments":{"detected":[{"name":"Bass","confidence":94}]}}'::jsonb,
 now() - interval '6 days'),

('33333333-aaaa-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333',
 'Neurofunk Snare Hit', 'Punchy layered snare with metallic overtones. Cuts through any mix.',
 ARRAY['Drums'], 'drums', true, 0, 0, NULL,
 '{"features":{"bpm":{"bpm":174,"suggestedTempo":174},"brightness":0.76,"rms":0.85,"adsr":{"attack":1,"decay":80,"sustain":5,"release":120},"waveform":{"type":"complex","confidence":0.55}},"recommendations":{"synthType":["Layer noise with pitched sine","Fast pitch envelope down","Parallel compression","Add a short reverb burst"],"mixTips":["Boost 200Hz for body","Cut 400Hz to reduce boxiness","Add presence at 4-5kHz"]},"detectedInstruments":{"detected":[{"name":"Drums","confidence":92}]}}'::jsonb,
 now() - interval '3 days'),

-- padqueen_aria's recipes
('44444444-aaaa-1111-4444-444444444444', 'd4444444-4444-4444-4444-444444444444',
 'Ethereal Choir Pad', 'Lush vocal-style pad with slow attack and long release. Pure atmosphere.',
 ARRAY['Pad', 'Vocal', 'Strings'], 'pad', true, 0, 0,
 'https://example.com/preset5.vital',
 '{"features":{"bpm":{"bpm":70,"suggestedTempo":70},"key":{"key":"G","mode":"major"},"brightness":0.35,"rms":0.45,"adsr":{"attack":400,"decay":500,"sustain":75,"release":2000},"waveform":{"type":"sine","confidence":0.7}},"recommendations":{"synthType":["Wavetable with formant shapes","Very slow attack (400ms+)","Long release with reverb","Layer multiple octaves softly"],"mixTips":["High-pass at 250Hz","Wide stereo field","Keep it in the background, don''t let it dominate"]},"detectedInstruments":{"detected":[{"name":"Pad","confidence":96},{"name":"Strings","confidence":55}]}}'::jsonb,
 now() - interval '9 days'),

('44444444-aaaa-2222-4444-444444444444', 'd4444444-4444-4444-4444-444444444444',
 'Crystal Bell Texture', 'Shimmery bell-like texture with granular feel. Perfect for ambient interludes.',
 ARRAY['Pluck', 'FX'], 'pluck', true, 0, 0, NULL,
 '{"features":{"bpm":{"bpm":0,"suggestedTempo":0},"key":{"key":"B","mode":"major"},"brightness":0.78,"rms":0.3,"adsr":{"attack":5,"decay":400,"sustain":20,"release":1500},"waveform":{"type":"sine","confidence":0.65}},"recommendations":{"synthType":["Sine wave with harmonics","Fast attack, long decay","Heavy reverb (shimmer or plate)","Subtle pitch randomization"],"mixTips":["Keep volume low, it''s a texture","Pan wide with stereo spread","Layer with noise for lo-fi feel"]},"detectedInstruments":{"detected":[{"name":"Pluck","confidence":70}]}}'::jsonb,
 now() - interval '4 days'),

-- drumcode_max's recipes
('55555555-aaaa-1111-5555-555555555555', 'e5555555-5555-5555-5555-555555555555',
 'Punchy Techno Kick', 'Hard-hitting techno kick with controlled sub and click transient.',
 ARRAY['Kick', 'Drums'], 'kick', true, 0, 0,
 'https://example.com/preset6.vital',
 '{"features":{"bpm":{"bpm":130,"suggestedTempo":130},"brightness":0.25,"rms":0.9,"adsr":{"attack":1,"decay":120,"sustain":0,"release":150},"waveform":{"type":"sine","confidence":0.85}},"recommendations":{"synthType":["Sine oscillator with pitch envelope","Fast pitch drop (3 octaves in 50ms)","Light saturation for harmonics","Short, tight envelope"],"mixTips":["High-pass at 30Hz to remove DC offset","Slight boost at 60Hz for thump","Sidechain everything to this kick"]},"detectedInstruments":{"detected":[{"name":"Kick","confidence":97}]}}'::jsonb,
 now() - interval '13 days'),

('55555555-aaaa-2222-5555-555555555555', 'e5555555-5555-5555-5555-555555555555',
 'Industrial Clap Stack', 'Layered clap with distortion and room reverb. Raw and aggressive.',
 ARRAY['Drums'], 'drums', true, 0, 0, NULL,
 '{"features":{"bpm":{"bpm":130,"suggestedTempo":130},"brightness":0.68,"rms":0.75,"adsr":{"attack":2,"decay":60,"sustain":15,"release":200},"waveform":{"type":"complex","confidence":0.5}},"recommendations":{"synthType":["Layer 3-4 noise bursts with slight timing offset","Band-pass filter around 1-2kHz","Short room reverb","Parallel distortion"],"mixTips":["Cut below 300Hz","Boost 1-2kHz for crack","Compress hard for punch"]},"detectedInstruments":{"detected":[{"name":"Drums","confidence":90}]}}'::jsonb,
 now() - interval '7 days'),

-- melodic_sage's recipes
('66666666-aaaa-1111-6666-666666666666', 'f6666666-6666-6666-6666-666666666666',
 'Future Bass Supersaw', 'Massive detuned supersaw chord stab. The drop essential.',
 ARRAY['Lead', 'Pad'], 'lead', true, 0, 0,
 'https://example.com/preset7.vital',
 '{"features":{"bpm":{"bpm":150,"suggestedTempo":150},"key":{"key":"Ab","mode":"major"},"brightness":0.7,"rms":0.65,"adsr":{"attack":20,"decay":200,"sustain":55,"release":400},"waveform":{"type":"saw","confidence":0.9}},"recommendations":{"synthType":["7+ unison saw voices with heavy detune","OTT compression","Sidechain to kick pattern","Layer with sub one octave down"],"mixTips":["Stereo widen the highs only","Mono below 200Hz","Add a short plate reverb"]},"detectedInstruments":{"detected":[{"name":"Lead","confidence":85},{"name":"Pad","confidence":60}]}}'::jsonb,
 now() - interval '11 days'),

('66666666-aaaa-2222-6666-666666666666', 'f6666666-6666-6666-6666-666666666666',
 'Vocal Chop Melody', 'Processed vocal chop turned into a melodic hook. Pitched and sliced.',
 ARRAY['Vocal', 'Lead', 'FX'], 'lead', true, 0, 0, NULL,
 '{"features":{"bpm":{"bpm":150,"suggestedTempo":150},"key":{"key":"C","mode":"major"},"brightness":0.6,"rms":0.5,"adsr":{"attack":5,"decay":100,"sustain":40,"release":200},"waveform":{"type":"complex","confidence":0.45}},"recommendations":{"synthType":["Sample a vocal and pitch shift","Slice into rhythmic pattern","Add formant shifting","Reverb throws on select hits"],"mixTips":["De-ess if sibilant","Keep centered in the mix","Use delay for rhythmic interest"]},"detectedInstruments":{"detected":[{"name":"Vocal","confidence":75},{"name":"Lead","confidence":50}]}}'::jsonb,
 now() - interval '2 days'),

-- noisecraft_zoe's recipes
('77777777-aaaa-1111-7777-777777777777', 'a7777777-7777-7777-7777-777777777777',
 'Granular Texture Cloud', 'Evolving granular texture from a field recording. Pure experimental bliss.',
 ARRAY['Pad', 'FX'], 'pad', true, 0, 0, NULL,
 '{"features":{"bpm":{"bpm":0,"suggestedTempo":0},"brightness":0.5,"rms":0.25,"adsr":{"attack":800,"decay":1000,"sustain":60,"release":3000},"waveform":{"type":"complex","confidence":0.3}},"recommendations":{"synthType":["Granular synthesis with long grains","Randomize grain position and size","Stack multiple instances at different pitches","Automate everything slowly"],"mixTips":["This IS the mix — let it fill the space","Gentle high-pass at 100Hz","Add very subtle movement with LFO on pan"]},"detectedInstruments":{"detected":[{"name":"Pad","confidence":70}]}}'::jsonb,
 now() - interval '15 days'),

('77777777-aaaa-2222-7777-777777777777', 'a7777777-7777-7777-7777-777777777777',
 'Metallic Impact FX', 'Short metallic impact designed for transitions. Hit it hard.',
 ARRAY['FX', 'Drums'], 'drums', true, 0, 0,
 'https://example.com/preset8.vital',
 '{"features":{"bpm":{"bpm":0,"suggestedTempo":0},"brightness":0.82,"rms":0.88,"adsr":{"attack":0,"decay":200,"sustain":0,"release":500},"waveform":{"type":"complex","confidence":0.4}},"recommendations":{"synthType":["Layer metallic samples with noise","Ring modulation for metallic quality","Very fast attack, medium decay","Distortion + convolution reverb"],"mixTips":["Use as a one-shot, not looped","Boost 3-5kHz for bite","Add sub impact layer for weight"]},"detectedInstruments":{"detected":[{"name":"Drums","confidence":60},{"name":"FX","confidence":55}]}}'::jsonb,
 now() - interval '1 day'),

-- deephouse_rio's recipes
('88888888-aaaa-1111-8888-888888888888', 'b8888888-8888-8888-8888-888888888888',
 'Warm House Chord Stab', 'Classic filtered house chord. Rhodes-like warmth with a modern twist.',
 ARRAY['Pad', 'Pluck'], 'pluck', true, 0, 0, NULL,
 '{"features":{"bpm":{"bpm":124,"suggestedTempo":124},"key":{"key":"F","mode":"minor"},"brightness":0.45,"rms":0.5,"adsr":{"attack":15,"decay":250,"sustain":40,"release":500},"waveform":{"type":"saw","confidence":0.65}},"recommendations":{"synthType":["Saw + square blend","Low-pass filter with slow envelope","Subtle chorus for warmth","Short reverb"],"mixTips":["High-pass at 200Hz","Boost 400Hz for body","Keep it groovy, not overwhelming"]},"detectedInstruments":{"detected":[{"name":"Pluck","confidence":72},{"name":"Pad","confidence":50}]}}'::jsonb,
 now() - interval '8 days'),

('88888888-aaaa-2222-8888-888888888888', 'b8888888-8888-8888-8888-888888888888',
 'Lo-Fi Vinyl Crackle Pad', 'Nostalgic pad with vinyl noise texture baked in. Chill vibes.',
 ARRAY['Pad', 'FX'], 'pad', true, 0, 0, NULL,
 '{"features":{"bpm":{"bpm":80,"suggestedTempo":80},"key":{"key":"Db","mode":"major"},"brightness":0.3,"rms":0.35,"adsr":{"attack":200,"decay":400,"sustain":65,"release":1200},"waveform":{"type":"triangle","confidence":0.6}},"recommendations":{"synthType":["Triangle wave with bit reduction","Layer vinyl noise underneath","Gentle low-pass filter (2kHz)","Tape saturation"],"mixTips":["Don''t filter out the noise — it''s the vibe","Stereo width on the pad only","Keep mono compatible below 150Hz"]},"detectedInstruments":{"detected":[{"name":"Pad","confidence":82}]}}'::jsonb,
 now() - interval '3 days')

ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. Create follows (build a social graph)
-- ============================================
INSERT INTO public.follows (follower_id, following_id) VALUES
  -- beatmaker_kai follows
  ('a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222'),
  ('a1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333'),
  ('a1111111-1111-1111-1111-111111111111', 'f6666666-6666-6666-6666-666666666666'),
  -- synthwave_luna follows
  ('b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111'),
  ('b2222222-2222-2222-2222-222222222222', 'd4444444-4444-4444-4444-444444444444'),
  ('b2222222-2222-2222-2222-222222222222', 'a7777777-7777-7777-7777-777777777777'),
  -- bass_hunter follows
  ('c3333333-3333-3333-3333-333333333333', 'e5555555-5555-5555-5555-555555555555'),
  ('c3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111'),
  -- padqueen follows
  ('d4444444-4444-4444-4444-444444444444', 'b2222222-2222-2222-2222-222222222222'),
  ('d4444444-4444-4444-4444-444444444444', 'a7777777-7777-7777-7777-777777777777'),
  ('d4444444-4444-4444-4444-444444444444', 'b8888888-8888-8888-8888-888888888888'),
  -- drumcode_max follows
  ('e5555555-5555-5555-5555-555555555555', 'c3333333-3333-3333-3333-333333333333'),
  ('e5555555-5555-5555-5555-555555555555', 'a7777777-7777-7777-7777-777777777777'),
  -- melodic_sage follows
  ('f6666666-6666-6666-6666-666666666666', 'a1111111-1111-1111-1111-111111111111'),
  ('f6666666-6666-6666-6666-666666666666', 'b2222222-2222-2222-2222-222222222222'),
  ('f6666666-6666-6666-6666-666666666666', 'd4444444-4444-4444-4444-444444444444'),
  ('f6666666-6666-6666-6666-666666666666', 'b8888888-8888-8888-8888-888888888888'),
  -- noisecraft_zoe follows
  ('a7777777-7777-7777-7777-777777777777', 'c3333333-3333-3333-3333-333333333333'),
  ('a7777777-7777-7777-7777-777777777777', 'd4444444-4444-4444-4444-444444444444'),
  -- deephouse_rio follows
  ('b8888888-8888-8888-8888-888888888888', 'a1111111-1111-1111-1111-111111111111'),
  ('b8888888-8888-8888-8888-888888888888', 'b2222222-2222-2222-2222-222222222222'),
  ('b8888888-8888-8888-8888-888888888888', 'd4444444-4444-4444-4444-444444444444'),
  ('b8888888-8888-8888-8888-888888888888', 'f6666666-6666-6666-6666-666666666666')
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. Create likes (spread across recipes)
-- ============================================
INSERT INTO public.likes (user_id, analysis_id) VALUES
  -- Massive 808 Sub Bass gets lots of love
  ('b2222222-2222-2222-2222-222222222222', '11111111-aaaa-1111-1111-111111111111'),
  ('c3333333-3333-3333-3333-333333333333', '11111111-aaaa-1111-1111-111111111111'),
  ('f6666666-6666-6666-6666-666666666666', '11111111-aaaa-1111-1111-111111111111'),
  ('b8888888-8888-8888-8888-888888888888', '11111111-aaaa-1111-1111-111111111111'),
  ('e5555555-5555-5555-5555-555555555555', '11111111-aaaa-1111-1111-111111111111'),
  -- Retro Synthwave Lead
  ('a1111111-1111-1111-1111-111111111111', '22222222-aaaa-1111-2222-222222222222'),
  ('d4444444-4444-4444-4444-444444444444', '22222222-aaaa-1111-2222-222222222222'),
  ('f6666666-6666-6666-6666-666666666666', '22222222-aaaa-1111-2222-222222222222'),
  ('b8888888-8888-8888-8888-888888888888', '22222222-aaaa-1111-2222-222222222222'),
  -- Filthy Dubstep Growl
  ('a1111111-1111-1111-1111-111111111111', '33333333-aaaa-1111-3333-333333333333'),
  ('e5555555-5555-5555-5555-555555555555', '33333333-aaaa-1111-3333-333333333333'),
  ('a7777777-7777-7777-7777-777777777777', '33333333-aaaa-1111-3333-333333333333'),
  -- Ethereal Choir Pad
  ('b2222222-2222-2222-2222-222222222222', '44444444-aaaa-1111-4444-444444444444'),
  ('a7777777-7777-7777-7777-777777777777', '44444444-aaaa-1111-4444-444444444444'),
  ('b8888888-8888-8888-8888-888888888888', '44444444-aaaa-1111-4444-444444444444'),
  ('f6666666-6666-6666-6666-666666666666', '44444444-aaaa-1111-4444-444444444444'),
  -- Punchy Techno Kick
  ('c3333333-3333-3333-3333-333333333333', '55555555-aaaa-1111-5555-555555555555'),
  ('a7777777-7777-7777-7777-777777777777', '55555555-aaaa-1111-5555-555555555555'),
  ('a1111111-1111-1111-1111-111111111111', '55555555-aaaa-1111-5555-555555555555'),
  -- Future Bass Supersaw
  ('a1111111-1111-1111-1111-111111111111', '66666666-aaaa-1111-6666-666666666666'),
  ('b2222222-2222-2222-2222-222222222222', '66666666-aaaa-1111-6666-666666666666'),
  ('d4444444-4444-4444-4444-444444444444', '66666666-aaaa-1111-6666-666666666666'),
  ('b8888888-8888-8888-8888-888888888888', '66666666-aaaa-1111-6666-666666666666'),
  ('c3333333-3333-3333-3333-333333333333', '66666666-aaaa-1111-6666-666666666666'),
  ('e5555555-5555-5555-5555-555555555555', '66666666-aaaa-1111-6666-666666666666'),
  -- Dreamy Arp
  ('a1111111-1111-1111-1111-111111111111', '22222222-aaaa-2222-2222-222222222222'),
  ('d4444444-4444-4444-4444-444444444444', '22222222-aaaa-2222-2222-222222222222'),
  -- Metallic Impact
  ('c3333333-3333-3333-3333-333333333333', '77777777-aaaa-2222-7777-777777777777'),
  ('e5555555-5555-5555-5555-555555555555', '77777777-aaaa-2222-7777-777777777777'),
  -- Warm House Chord
  ('b2222222-2222-2222-2222-222222222222', '88888888-aaaa-1111-8888-888888888888'),
  ('d4444444-4444-4444-4444-444444444444', '88888888-aaaa-1111-8888-888888888888'),
  ('f6666666-6666-6666-6666-666666666666', '88888888-aaaa-1111-8888-888888888888'),
  -- Reese Bass
  ('a1111111-1111-1111-1111-111111111111', '33333333-aaaa-2222-3333-333333333333'),
  ('e5555555-5555-5555-5555-555555555555', '33333333-aaaa-2222-3333-333333333333'),
  -- Vocal Chop
  ('b2222222-2222-2222-2222-222222222222', '66666666-aaaa-2222-6666-666666666666'),
  ('d4444444-4444-4444-4444-444444444444', '66666666-aaaa-2222-6666-666666666666'),
  ('a7777777-7777-7777-7777-777777777777', '66666666-aaaa-2222-6666-666666666666'),
  -- Lo-Fi Vinyl
  ('a1111111-1111-1111-1111-111111111111', '88888888-aaaa-2222-8888-888888888888'),
  ('b2222222-2222-2222-2222-222222222222', '88888888-aaaa-2222-8888-888888888888'),
  -- Granular Texture
  ('d4444444-4444-4444-4444-444444444444', '77777777-aaaa-1111-7777-777777777777'),
  ('b8888888-8888-8888-8888-888888888888', '77777777-aaaa-1111-7777-777777777777')
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. Create comments
-- ============================================
INSERT INTO public.comments (id, user_id, analysis_id, content, created_at) VALUES
  -- Comments on Massive 808
  (gen_random_uuid(), 'c3333333-3333-3333-3333-333333333333', '11111111-aaaa-1111-1111-111111111111',
   'This 808 is insane. How do you get that pitch glide so smooth?', now() - interval '11 days'),
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', '11111111-aaaa-1111-1111-111111111111',
   'Thanks! I use a pitch envelope on the oscillator with about 200ms decay. The key is using a sine wave and adding saturation after.', now() - interval '11 days' + interval '2 hours'),
  (gen_random_uuid(), 'f6666666-6666-6666-6666-666666666666', '11111111-aaaa-1111-1111-111111111111',
   'Just tried recreating this in Vital. The preset is spot on, got 87% match on my first try!', now() - interval '9 days'),

  -- Comments on Retro Synthwave Lead
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', '22222222-aaaa-1111-2222-222222222222',
   'Love the midnight drive vibes. What chorus plugin are you using?', now() - interval '13 days'),
  (gen_random_uuid(), 'b2222222-2222-2222-2222-222222222222', '22222222-aaaa-1111-2222-222222222222',
   'TAL Chorus is free and sounds amazing for this. The Juno-style chorus is perfect.', now() - interval '13 days' + interval '1 hour'),

  -- Comments on Filthy Dubstep Growl
  (gen_random_uuid(), 'e5555555-5555-5555-5555-555555555555', '33333333-aaaa-1111-3333-333333333333',
   'Absolutely disgusting sound. Mean that as a compliment.', now() - interval '10 days'),
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', '33333333-aaaa-1111-3333-333333333333',
   'How do you get the FM modulation to not sound chaotic? Mine always goes too far.', now() - interval '9 days'),
  (gen_random_uuid(), 'c3333333-3333-3333-3333-333333333333', '33333333-aaaa-1111-3333-333333333333',
   'The trick is automating the FM amount slowly. Don''t just crank it. Let it breathe and build.', now() - interval '9 days' + interval '3 hours'),

  -- Comments on Ethereal Choir Pad
  (gen_random_uuid(), 'b2222222-2222-2222-2222-222222222222', '44444444-aaaa-1111-4444-444444444444',
   'This is beautiful. Using it as an intro pad for my new track. The slow attack is so dreamy.', now() - interval '7 days'),
  (gen_random_uuid(), 'b8888888-8888-8888-8888-888888888888', '44444444-aaaa-1111-4444-444444444444',
   'Would love to hear this layered with some lo-fi processing. Might try that myself.', now() - interval '6 days'),

  -- Comments on Future Bass Supersaw
  (gen_random_uuid(), 'b2222222-2222-2222-2222-222222222222', '66666666-aaaa-1111-6666-666666666666',
   'The OTT tip is game-changing. Tried it and my supersaws sound so much wider now.', now() - interval '10 days'),
  (gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', '66666666-aaaa-1111-6666-666666666666',
   'How many unison voices are you running? My CPU starts crying after 5.', now() - interval '9 days'),
  (gen_random_uuid(), 'f6666666-6666-6666-6666-666666666666', '66666666-aaaa-1111-6666-666666666666',
   '7 voices! But bounce it to audio once you''re happy with the sound. Saves CPU and you can process it further.', now() - interval '9 days' + interval '1 hour'),
  (gen_random_uuid(), 'e5555555-5555-5555-5555-555555555555', '66666666-aaaa-1111-6666-666666666666',
   'This preset is really well made. Downloaded it and it sounds great out of the box.', now() - interval '5 days'),

  -- Comments on Punchy Techno Kick
  (gen_random_uuid(), 'c3333333-3333-3333-3333-333333333333', '55555555-aaaa-1111-5555-555555555555',
   'Clean kick. The pitch envelope settings are exactly what I was looking for.', now() - interval '12 days'),
  (gen_random_uuid(), 'a7777777-7777-7777-7777-777777777777', '55555555-aaaa-1111-5555-555555555555',
   'Tried layering this with a short click sample. Absolutely punches through the mix now.', now() - interval '8 days'),

  -- Comments on Vocal Chop
  (gen_random_uuid(), 'd4444444-4444-4444-4444-444444444444', '66666666-aaaa-2222-6666-666666666666',
   'The formant shifting tip is great. Gives it that Flume-esque quality.', now() - interval '1 day'),

  -- Comments on Warm House Chord
  (gen_random_uuid(), 'f6666666-6666-6666-6666-666666666666', '88888888-aaaa-1111-8888-888888888888',
   'This has that classic Kerri Chandler feel. Warm and groovy.', now() - interval '5 days'),
  (gen_random_uuid(), 'd4444444-4444-4444-4444-444444444444', '88888888-aaaa-1111-8888-888888888888',
   'Love the filter envelope suggestion. Subtle but makes such a big difference.', now() - interval '4 days')

ON CONFLICT DO NOTHING;

-- ============================================
-- 7. Fix denormalized counts
-- (The triggers handle new inserts, but since we bulk-inserted, update manually)
-- ============================================
UPDATE public.analyses a
SET like_count = (SELECT count(*) FROM public.likes WHERE analysis_id = a.id);

UPDATE public.analyses a
SET comment_count = (SELECT count(*) FROM public.comments WHERE analysis_id = a.id);


-- ============================================
-- CLEANUP SCRIPT (run this to remove all test data)
-- Uncomment and run when you want to clean up
-- ============================================
/*
-- Delete test data (cascades will handle likes, follows, comments)
DELETE FROM public.analyses WHERE user_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'd4444444-4444-4444-4444-444444444444',
  'e5555555-5555-5555-5555-555555555555',
  'f6666666-6666-6666-6666-666666666666',
  'a7777777-7777-7777-7777-777777777777',
  'b8888888-8888-8888-8888-888888888888'
);

DELETE FROM public.follows WHERE follower_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'd4444444-4444-4444-4444-444444444444',
  'e5555555-5555-5555-5555-555555555555',
  'f6666666-6666-6666-6666-666666666666',
  'a7777777-7777-7777-7777-777777777777',
  'b8888888-8888-8888-8888-888888888888'
) OR following_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'd4444444-4444-4444-4444-444444444444',
  'e5555555-5555-5555-5555-555555555555',
  'f6666666-6666-6666-6666-666666666666',
  'a7777777-7777-7777-7777-777777777777',
  'b8888888-8888-8888-8888-888888888888'
);

DELETE FROM public.profiles WHERE id IN (
  'a1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'd4444444-4444-4444-4444-444444444444',
  'e5555555-5555-5555-5555-555555555555',
  'f6666666-6666-6666-6666-666666666666',
  'a7777777-7777-7777-7777-777777777777',
  'b8888888-8888-8888-8888-888888888888'
);

DELETE FROM auth.identities WHERE user_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'd4444444-4444-4444-4444-444444444444',
  'e5555555-5555-5555-5555-555555555555',
  'f6666666-6666-6666-6666-666666666666',
  'a7777777-7777-7777-7777-777777777777',
  'b8888888-8888-8888-8888-888888888888'
);

DELETE FROM auth.users WHERE id IN (
  'a1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'd4444444-4444-4444-4444-444444444444',
  'e5555555-5555-5555-5555-555555555555',
  'f6666666-6666-6666-6666-666666666666',
  'a7777777-7777-7777-7777-777777777777',
  'b8888888-8888-8888-8888-888888888888'
);
*/
