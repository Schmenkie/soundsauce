/**
 * Generate instrument-specific synthesis recommendations based on audio features.
 * @param {string} instrument - The detected or selected instrument type
 * @param {Object|null} features - Audio features from analysis
 * @param {string|null} dawPreference - DAW name (only 'Ableton Live' is known)
 * @returns {Object} Recommendations object with various synthesis settings
 */
export function generateInstrumentRecommendations(instrument, features = null, dawPreference = null) {
  const recs = {
    synthType: [],
    vstSuggestions: [],
    nativeInstruments: [],
    oscillatorSettings: [],
    filterSettings: [],
    envelopeSettings: [],
    modulationSettings: [],
    eqSettings: [],
    effects: [],
    analyzedSettings: [] // Specific settings derived from analysis
  };

  // ===== DYNAMIC RECOMMENDATIONS FROM ACTUAL ANALYSIS =====

  // Waveform-based oscillator recommendations
  if (features?.waveform) {
    const wf = features.waveform;
    recs.analyzedSettings.push(`Detected waveform: ${wf.type} (${wf.confidence}% confidence)`);
    recs.oscillatorSettings.push(wf.synthRecommendation);
    if (wf.fundamentalFreq) {
      recs.oscillatorSettings.push(`Fundamental frequency: ${wf.fundamentalFreq}Hz`);
    }

    // VST suggestions based on waveform complexity
    if (wf.type === 'complex') {
      recs.vstSuggestions.push('Serum by Xfer (wavetable import)', 'Vital (Free!) - drag audio to create wavetable', 'Phase Plant by Kilohearts');
      recs.synthType.push('Wavetable synthesis - import the sample as a wavetable');
    } else if (wf.type === 'saw') {
      recs.vstSuggestions.push('Sylenth1 by LennarDigital', 'Serum by Xfer', 'Diva by u-he');
      recs.synthType.push('Subtractive synthesis with sawtooth oscillator');
    } else if (wf.type === 'square' || wf.type === 'pulse') {
      recs.vstSuggestions.push('TAL-U-NO-LX (Juno emulation)', 'Diva by u-he', 'Repro by u-he');
      recs.synthType.push('Subtractive synthesis with square/pulse oscillator');
    } else if (wf.type === 'sine') {
      recs.vstSuggestions.push('Operator (FM synthesis)', 'Sytrus', 'Any synth with clean sine');
      recs.synthType.push('Simple sine oscillator or FM synthesis');
    }
  }

  // Amplitude ADSR from analysis
  if (features?.adsr) {
    const { attack, decay, sustain, release } = features.adsr;
    recs.envelopeSettings.push(`Amp envelope: A=${attack}ms, D=${decay}ms, S=${sustain}%, R=${release}ms`);

    // Categorize the envelope shape
    if (attack < 10 && decay < 200 && sustain < 30) {
      recs.analyzedSettings.push('Envelope shape: Percussive/plucky');
    } else if (attack > 100 && sustain > 60) {
      recs.analyzedSettings.push('Envelope shape: Pad-like/sustained');
    } else if (attack < 20 && sustain > 50) {
      recs.analyzedSettings.push('Envelope shape: Synth lead/brass');
    }
  }

  // Filter envelope recommendations
  if (features?.filterEnvelope) {
    const fe = features.filterEnvelope;
    recs.filterSettings.push(`Estimated cutoff: ~${fe.estimatedCutoff}Hz`);

    if (fe.sweepDirection === 'closing') {
      recs.filterSettings.push(`Filter envelope: Opening then closing (decay: ${fe.filterDecay}%)`);
      recs.filterSettings.push('Set filter env amount positive, moderate decay');
    } else if (fe.sweepDirection === 'opening') {
      recs.filterSettings.push('Filter sweeps open over time - use slow filter attack');
    } else {
      recs.filterSettings.push('Filter is relatively static - minimal envelope needed');
    }

    if (fe.resonanceIndicator > 30) {
      recs.filterSettings.push(`Resonance detected (${fe.resonanceIndicator}%) - add resonance 30-50%`);
    }
  }

  // Modulation recommendations
  if (features?.modulation) {
    const mod = features.modulation;

    if (mod.hasLfo && mod.lfoRate) {
      recs.modulationSettings.push(`LFO Rate: ${mod.suggestedLfoRate}`);
    }

    if (mod.hasTremolo) {
      recs.modulationSettings.push(`Tremolo depth: ~${mod.tremoloDepth}% - route LFO to volume`);
    }

    if (mod.hasVibrato) {
      recs.modulationSettings.push(`Vibrato: ${mod.suggestedVibratoDepth} - route LFO to pitch`);
    }

    if (mod.hasChorus) {
      recs.modulationSettings.push(`Chorus/detune detected: ${mod.suggestedChorusAmount}`);
      recs.effects.push('Add chorus or unison detune');
    }

    if (!mod.hasLfo && !mod.hasTremolo && !mod.hasVibrato) {
      recs.modulationSettings.push('Minimal modulation detected - keep it static or add subtle movement');
    }
  }

  // Brightness-based recommendations
  if (features?.brightness) {
    const brightness = parseFloat(features.brightness);
    const centroid = parseFloat(features.spectralCentroid || 0);

    if (brightness < 0.25) {
      recs.eqSettings.push(`Dark sound (brightness: ${Math.round(brightness * 100)}%) - low-pass around ${Math.round(centroid * 1.5)}Hz`);
    } else if (brightness > 0.6) {
      recs.eqSettings.push(`Bright sound (brightness: ${Math.round(brightness * 100)}%) - filter is open or high-passed`);
    } else {
      recs.eqSettings.push(`Balanced brightness (${Math.round(brightness * 100)}%) - moderate filtering`);
    }
  }

  // ===== INSTRUMENT-SPECIFIC ADDITIONS =====
  // (These complement the dynamic recommendations above)

  // Native DAW instrument recommendations per instrument type
  const dawInstrumentMap = {
    kick: {
      'Ableton Live': 'Ableton: Operator with pitch envelope',
    },
    bass: {
      'Ableton Live': 'Ableton: Wavetable with sub osc',
    },
    lead: {
      'Ableton Live': 'Ableton: Wavetable with unison',
    },
    pad: {
      'Ableton Live': 'Ableton: Wavetable',
    },
    pluck: {
      'Ableton Live': 'Ableton: Analog',
    },
    guitar: {
      'Ableton Live': 'Ableton: Drift or Analog (plucky clean tone)',
    },
    brass: {
      'Ableton Live': 'Ableton: Analog (saw + filter envelope)',
    },
    woodwind: {
      'Ableton Live': 'Ableton: Wavetable or Simpler with samples',
    },
    strings: {
      'Ableton Live': 'Ableton: Wavetable with unison and slow attack',
    },
  };

  const daw = dawPreference || 'Ableton Live';

  const addNativeInstruments = (type) => {
    const map = dawInstrumentMap[type];
    if (!map) return;

    // Show user's DAW first
    if (map[daw]) {
      recs.nativeInstruments.push(map[daw]);
    }
    // Then show others as alternatives
    for (const [dawName, rec] of Object.entries(map)) {
      if (dawName !== daw) {
        recs.nativeInstruments.push(rec);
      }
    }
  };

  if (instrument === 'kick') {
    if (!features?.waveform) recs.synthType.push('Sub-bass synthesis with pitch envelope');
    addNativeInstruments('kick');
    if (!recs.oscillatorSettings.length) {
      recs.oscillatorSettings.push('Sine wave with pitch envelope: +12 to +24 semitones → 0');
    }
    recs.effects.push('Saturation for punch', 'Compression: fast attack, 4:1');
  } else if (instrument === 'bass' || instrument === 'sub-bass') {
    if (!features?.waveform) recs.synthType.push('Layered sub (sine) + mid (saw)');
    addNativeInstruments('bass');
    recs.effects.push('Saturation for warmth', 'Sidechain compression');
  } else if (instrument === 'lead') {
    if (!features?.waveform) recs.synthType.push('Supersaw or FM synthesis');
    addNativeInstruments('lead');
    recs.effects.push('Reverb (medium room)', 'Delay (1/8 or dotted)', 'Optional distortion');
  } else if (instrument === 'pad') {
    if (!features?.waveform) recs.synthType.push('Wavetable with slow attack');
    addNativeInstruments('pad');
    recs.effects.push('Large reverb (4-8s)', 'Chorus for width', 'Delay for space');
  } else if (instrument === 'pluck') {
    if (!features?.waveform) recs.synthType.push('Fast attack, quick decay');
    addNativeInstruments('pluck');
    recs.effects.push('Short reverb', 'Subtle delay');
  } else if (instrument === 'guitar') {
    if (!features?.waveform) recs.synthType.push('Subtractive synthesis: saw/triangle blend for body');
    addNativeInstruments('guitar');
    recs.effects.push('Chorus for body resonance', 'Reverb (small room)', 'Subtle compression');
    recs.analyzedSettings.push('For realistic guitar, try Spitfire LABS (free sample library)');
  } else if (instrument === 'brass') {
    if (!features?.waveform) recs.synthType.push('Saw wave with filter envelope for brass attack');
    addNativeInstruments('brass');
    recs.effects.push('Subtle reverb (medium room)', 'Optional vibrato via LFO to pitch');
    recs.analyzedSettings.push('For realistic brass, try Spitfire LABS (free sample library)');
  } else if (instrument === 'woodwind') {
    if (!features?.waveform) recs.synthType.push('Sine + noise layer for breathy quality');
    addNativeInstruments('woodwind');
    recs.effects.push('Reverb for air', 'Gentle chorus for breath texture');
    recs.analyzedSettings.push('For realistic woodwind, try Spitfire LABS (free sample library)');
  } else if (instrument === 'strings') {
    if (!features?.waveform) recs.synthType.push('Unison saw waves with slow attack for ensemble');
    addNativeInstruments('strings');
    recs.effects.push('Large reverb', 'Chorus for ensemble width');
    recs.analyzedSettings.push('For realistic strings, try Spitfire LABS (free sample library)');
  } else if (instrument === 'vocal') {
    if (!features?.waveform) recs.synthType.push('Formant-style synthesis or sample-based');
    addNativeInstruments('lead');
    recs.effects.push('Reverb', 'Delay (1/4 or 1/8)', 'Subtle compression');
    recs.analyzedSettings.push('Vocal synthesis is limited in wavetable synths; for realism, use a sampler or vocal plugin');
  }

  // Fallback VST suggestions if none added
  if (recs.vstSuggestions.length === 0) {
    recs.vstSuggestions.push('Serum by Xfer', 'Vital (Free!)', 'Massive X');
  }

  return recs;
}
