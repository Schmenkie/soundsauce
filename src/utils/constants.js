// Theme classes for dark/light mode
// Dark: Obsidian Ember — true black with warm amber/gold accent
// Light: Warm stone with amber accent
export const themeClasses = {
  dark: {
    bg: 'bg-zinc-950',
    text: 'text-zinc-50',
    textMuted: 'text-zinc-400',
    textDimmed: 'text-zinc-500',
    card: 'bg-zinc-900 rounded-lg',
    cardAlt: 'bg-zinc-800 rounded-lg',
    cardBorder: 'border-zinc-700',
    input: 'bg-zinc-900 border-zinc-700 rounded-md',
    button: 'bg-zinc-800 text-zinc-50 hover:bg-zinc-700 rounded-md',
    buttonPrimary: 'bg-ember-500 text-zinc-950 hover:bg-ember-600 rounded-md font-medium',
    buttonActive: 'bg-ember-500 text-zinc-950 rounded-md font-medium',
    accent: 'text-ember-500',
    accentBg: 'bg-ember-500',
    gradientText: 'text-ember-500',
    gradientBg: 'bg-ember-500',
    tag: 'bg-zinc-800 text-zinc-300 rounded-full',
    tagActive: 'bg-ember-500 text-zinc-950 rounded-full font-medium',
  },
  light: {
    bg: 'bg-stone-50',
    text: 'text-stone-900',
    textMuted: 'text-stone-500',
    textDimmed: 'text-stone-400',
    card: 'bg-white rounded-lg',
    cardAlt: 'bg-stone-100 rounded-lg',
    cardBorder: 'border-stone-200',
    input: 'bg-white border-stone-300 rounded-md',
    button: 'bg-stone-900 text-white hover:bg-stone-800 rounded-md',
    buttonPrimary: 'bg-ember-600 text-white hover:bg-ember-700 rounded-md font-medium',
    buttonActive: 'bg-ember-600 text-white rounded-md font-medium',
    accent: 'text-ember-600',
    accentBg: 'bg-ember-600',
    accentOrange: 'text-ember-700',
    gradientText: 'text-ember-600',
    gradientBg: 'bg-ember-600',
    tag: 'bg-amber-50 text-ember-700 border border-amber-200 rounded-full',
    tagActive: 'bg-ember-600 text-white rounded-full font-medium',
  }
};

// Instrument labels with lucide-react icon names (no emojis)
export const instrumentLabels = {
  'full': { label: 'Whole Track', icon: 'Music' },
  'kick': { label: 'Kick', icon: 'Disc' },
  'snare': { label: 'Snare', icon: 'Circle' },
  'hihat': { label: 'Hi-Hat', icon: 'Minus' },
  'drums': { label: 'Drums', icon: 'Drum' },
  'bass': { label: 'Bass', icon: 'Activity' },
  'sub-bass': { label: 'Sub-Bass', icon: 'Volume2' },
  'sub': { label: 'Sub', icon: 'Volume1' },
  'guitar': { label: 'Guitar', icon: 'Music2' },
  'lead': { label: 'Lead Synth', icon: 'Zap' },
  'synth': { label: 'Synth', icon: 'Waves' },
  'keys': { label: 'Keys', icon: 'Piano' },
  'pad': { label: 'Pad', icon: 'Cloud' },
  'pluck': { label: 'Pluck', icon: 'Target' },
  'strings': { label: 'Strings', icon: 'Music2' },
  'brass': { label: 'Brass', icon: 'Megaphone' },
  'woodwind': { label: 'Woodwind', icon: 'Wind' },
  'vocal': { label: 'Vocal', icon: 'Mic' },
  'fx': { label: 'FX', icon: 'Sparkles' },
  'electronic': { label: 'Electronic', icon: 'Radio' }
};

// Tooltip definitions for audio terms
export const tooltipDefinitions = {
  'ADSR': 'Attack, Decay, Sustain, Release - The four stages of a sound\'s volume envelope. Attack is how fast the sound reaches full volume, Decay is the drop after attack, Sustain is the held level, Release is how long it takes to fade after letting go.',
  'Attack': 'How quickly a sound reaches its maximum level. Fast attack (0-10ms) = punchy/percussive. Slow attack (100ms+) = soft/pad-like.',
  'Decay': 'How quickly the sound drops from peak to sustain level. Short decay = plucky. Long decay = sustained.',
  'Sustain': 'The level the sound holds while a note is pressed. 0% = sound dies out. 100% = full volume maintained.',
  'Release': 'How long the sound takes to fade out after releasing the note. Short = tight/staccato. Long = ambient/washy.',
  'Cutoff': 'The frequency where a filter starts reducing sound. Lower cutoff = darker/bassier. Higher cutoff = brighter.',
  'Resonance': 'Boosts frequencies around the cutoff point, creating a peak or "squelchy" quality. Higher resonance = more pronounced effect.',
  'LFO': 'Low Frequency Oscillator - A slow, repeating wave that modulates other parameters like pitch, filter, or volume to create movement.',
  'Unison': 'Playing multiple slightly detuned copies of the same oscillator together for a thicker, wider sound.',
  'Detune': 'Slightly shifting the pitch of oscillators apart from each other. Creates thickness and movement.',
  'Oscillator': 'The core sound generator in a synth. Produces basic waveforms (sine, saw, square) that get shaped by filters and effects.',
  'Low-pass': 'A filter that lets low frequencies through and cuts high frequencies. Makes sounds darker/warmer.',
  'High-pass': 'A filter that lets high frequencies through and cuts low frequencies. Removes rumble and mud.',
  'RMS': 'Root Mean Square - A measure of average loudness. Higher RMS = louder overall level.',
  'Brightness': 'How much high-frequency content is in the sound. Bright = present/cutting. Dark = warm/mellow.',
  'Spectral Centroid': 'The "center of mass" of the frequency spectrum, measured in Hz. Higher values indicate brighter, more treble-heavy sounds. Lower values indicate darker, bass-heavy sounds.',
  'Harmonicity': 'How "tonal" vs "noisy" a sound is. High harmonicity = clear pitch. Low = noise/texture.',
  'Sidechain': 'Ducking one sound when another plays. Commonly used to make bass duck when kick hits.',
  'Saturation': 'Adding harmonic distortion for warmth and presence. Subtle = analog warmth. Heavy = distortion.',
  'BPM': 'Beats Per Minute — the tempo of the track. Useful for syncing delays, LFOs, and arpeggios to the beat.',
  'Key': 'The musical key and scale of the sound. Helps you tune oscillators and choose compatible notes for layering.',
  'Waveform': 'The oscillator shape detected in the sound (sine, saw, square, triangle, pulse). Determines the harmonic character.',
  'RMS Level': 'Root Mean Square level — the average loudness of the sound. Higher = louder.',
  'Tone': 'How bright or dark the sound is, based on high-frequency content. Directly maps to your synth\'s filter cutoff.',
  'Frequency Center': 'The center of mass of the frequency spectrum. Shows where the sound "lives" in the mix — low, mid, or high.',
  'Texture': 'How tonal vs noisy the sound is. Tonal sounds use pitched oscillators; noisy sounds benefit from noise layers or FM.',
  'Level': 'The overall loudness/RMS of the sound. Affects gain staging and processing headroom.',
  'Filter Envelope': 'How the filter cutoff changes over time. Filter movement creates the classic "wah" or sweep effect in synth sounds.',
  'Harmonic Profile': 'The relative strength of each harmonic overtone. Determines the timbre — what makes a saw sound different from a square.',
};

// Frequency band labels for display
export const frequencyBandLabels = {
  subBass: 'Sub',
  bass: 'Bass',
  lowMid: 'Low',
  mid: 'Mid',
  highMid: 'Hi-Mid',
  high: 'High'
};

// Frequency band ranges with Hz values
export const frequencyBandRanges = {
  subBass: '20-60 Hz',
  bass: '60-250 Hz',
  lowMid: '250-500 Hz',
  mid: '500-2000 Hz',
  highMid: '2-6 kHz',
  high: '6-20 kHz'
};
