/**
 * Audio Analysis Web Worker
 * Tempo, key, section detection and waveform rendering data — off the main thread.
 */

// =============================================================================
// FFT (Fast Fourier Transform) - Cooley-Tukey radix-2 DIT algorithm
// =============================================================================

function fft(real, imag) {
  const n = real.length;
  if (n <= 1) return;

  // Bit-reversal permutation
  for (let i = 0, j = 0; i < n; i++) {
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  // Cooley-Tukey iterative FFT
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = -2 * Math.PI / len;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curReal = 1, curImag = 0;
      for (let j = 0; j < halfLen; j++) {
        const idx1 = i + j;
        const idx2 = i + j + halfLen;
        const tReal = curReal * real[idx2] - curImag * imag[idx2];
        const tImag = curReal * imag[idx2] + curImag * real[idx2];
        real[idx2] = real[idx1] - tReal;
        imag[idx2] = imag[idx1] - tImag;
        real[idx1] += tReal;
        imag[idx1] += tImag;
        const newCurReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = newCurReal;
      }
    }
  }
}

function computeMagnitudeSpectrum(data, windowSize) {
  const n = windowSize;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);

  // Apply Hann window and copy data
  for (let i = 0; i < n && i < data.length; i++) {
    const hannWindow = 0.5 * (1 - Math.cos(2 * Math.PI * i / n));
    real[i] = data[i] * hannWindow;
  }

  fft(real, imag);

  // Compute magnitudes for positive frequencies
  const magnitudes = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }

  return magnitudes;
}

// =============================================================================
// BPM Detection
// =============================================================================

function detectBPM(channelData, sampleRate) {
  const windowSize = Math.floor(sampleRate * 0.02);
  const hopSize = Math.floor(windowSize / 2);
  const numWindows = Math.floor((channelData.length - windowSize) / hopSize);

  if (numWindows < 10) return null;

  const energy = [];
  for (let i = 0; i < numWindows; i++) {
    let sum = 0;
    const start = i * hopSize;
    for (let j = 0; j < windowSize; j++) {
      sum += channelData[start + j] * channelData[start + j];
    }
    energy.push(sum / windowSize);
  }

  const onsets = [];
  for (let i = 1; i < energy.length; i++) {
    onsets.push(Math.max(0, energy[i] - energy[i - 1]));
  }

  const maxOnset = Math.max(...onsets);
  if (maxOnset === 0) return null;
  const normalizedOnsets = onsets.map(o => o / maxOnset);

  const minBPM = 60;
  const maxBPM = 200;
  const minLag = Math.floor((60 / maxBPM) * sampleRate / hopSize);
  const maxLag = Math.floor((60 / minBPM) * sampleRate / hopSize);

  const correlations = [];

  for (let lag = minLag; lag <= Math.min(maxLag, normalizedOnsets.length / 2); lag++) {
    let correlation = 0;
    let count = 0;
    for (let i = 0; i < normalizedOnsets.length - lag; i++) {
      correlation += normalizedOnsets[i] * normalizedOnsets[i + lag];
      count++;
    }
    correlation /= count;
    const bpmForLag = 60 / ((lag * hopSize) / sampleRate);
    correlations.push({ lag, correlation, bpm: bpmForLag });
  }

  correlations.sort((a, b) => b.correlation - a.correlation);
  const topPeaks = correlations.slice(0, 5);

  if (topPeaks.length === 0) return null;

  let bestCandidate = topPeaks[0];
  let harmonicBonus = 0;

  for (const peak of topPeaks) {
    let bonus = 0;
    const peakBPM = peak.bpm;

    const doubleTempo = correlations.find(c =>
      Math.abs(c.bpm - peakBPM * 2) < 5 && c.correlation > peak.correlation * 0.5
    );
    if (doubleTempo) bonus += 0.15;

    const halfTempo = correlations.find(c =>
      Math.abs(c.bpm - peakBPM / 2) < 3 && c.correlation > peak.correlation * 0.5
    );
    if (halfTempo) bonus += 0.15;

    const nearbyCorrs = correlations.filter(c =>
      Math.abs(c.bpm - peakBPM) > 3 && Math.abs(c.bpm - peakBPM) < 15
    );
    const avgNearby = nearbyCorrs.length > 0
      ? nearbyCorrs.reduce((sum, c) => sum + c.correlation, 0) / nearbyCorrs.length
      : 0;
    const peakStrength = peak.correlation / (avgNearby + 0.001);
    if (peakStrength > 2) bonus += 0.1;

    if (peak.correlation + bonus > bestCandidate.correlation + harmonicBonus) {
      bestCandidate = peak;
      harmonicBonus = bonus;
    }
  }

  const baseConfidence = bestCandidate.correlation;
  const peakRatio = topPeaks.length > 1
    ? bestCandidate.correlation / topPeaks[1].correlation
    : 2;
  const clarityBonus = Math.min(0.2, (peakRatio - 1) * 0.15);

  const confidence = Math.min(100, Math.round(
    (baseConfidence + harmonicBonus + clarityBonus) * 120
  ));

  const detectedBPM = Math.round(bestCandidate.bpm);
  const halfTempoVal = Math.round(detectedBPM / 2);
  const doubleTempoVal = Math.round(detectedBPM * 2);

  let suggestedTempo = detectedBPM;
  if (detectedBPM < 80 && doubleTempoVal >= 80 && doubleTempoVal <= 180) {
    suggestedTempo = doubleTempoVal;
  } else if (detectedBPM > 180 && halfTempoVal >= 80 && halfTempoVal <= 180) {
    suggestedTempo = halfTempoVal;
  }

  return {
    bpm: detectedBPM,
    confidence,
    halfTempo: halfTempoVal,
    doubleTempo: doubleTempoVal,
    suggestedTempo,
    tempoRange: detectedBPM < 90 ? 'slow' : detectedBPM < 120 ? 'moderate' : detectedBPM < 150 ? 'upbeat' : detectedBPM < 180 ? 'fast' : 'very fast'
  };
}

// =============================================================================
// Key Detection
// =============================================================================

// Tuned against 117 tracks from Spencer's Rekordbox library (scripts/key-bench.mjs,
// ground truth in scripts/key-truth.json). Leave-one-out: 64% exact / 87% usable
// (exact, relative or ±1 Camelot) / 13% wrong — up from 46% / 65% / 35% with the
// Krumhansl-Schmuckler profiles and the old extractor. Things that did NOT help, so
// don't re-add them: harmonic sub-voting (f/2 is the same pitch class, f/3 pulls energy a
// fifth down and adds neighbour errors), bigger FFT windows, bass-only chroma, per-segment
// voting, discriminatively trained profiles.
const KEY_DETECT_DEFAULTS = {
  windowSize: 8192,  // 5.4 Hz bins at 44.1k — larger windows tested worse
  loHz: 65,          // lowest peak considered (C2)
  hiHz: 2100,        // highest peak considered
  bassHz: 260,       // peaks below this get bassBoost
  bassBoost: 1,
  harmonics: 1,      // each peak votes for f/1..f/harmonics (1 = no sub-harmonic voting)
  harmonicDecay: 0.6,
  peakFloor: 0.02,   // fraction of the window's loudest peak
  magPower: 0.5,     // peak weight = mag^magPower
  silenceGate: 0.15, // skip windows quieter than this × mean energy
  maxWindows: 200,
  topPeaks: 12,      // only the N loudest peaks per window (0 = all above the floor)
  tuning: true,      // estimate and fold out the track's deviation from A440
  windowNorm: true,  // max-normalise each window's chroma before averaging
  profiles: 'lab'
};

const KEY_PROFILES = {
  // Learned: 75% the mean standardised chroma of the library's tracks rotated to their
  // tonic (reflects the music — house / tech house / hip hop — and this extractor's
  // biases, e.g. it barely sees thirds under a heavy bassline) + 25% standardised K-S,
  // which restores enough of the third to break tonic/dominant near-ties.
  lab: {
    major: [1.633, -0.629, 0.214, -0.713, 0.602, -0.009, -0.621, 0.777, -0.86, 0.138, -0.652, 0.118],
    minor: [1.81, -0.717, -0.014, 0.59, -0.752, 0.164, -0.787, 1.179, -0.147, -0.705, 0.056, -0.678]
  },
  ks: {
    major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
    minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
  },
  temperley: {
    major: [5.0, 2.0, 3.5, 2.0, 4.5, 4.0, 2.0, 4.5, 2.0, 3.5, 1.5, 4.0],
    minor: [5.0, 2.0, 3.5, 4.5, 2.0, 4.0, 2.0, 4.5, 3.5, 2.0, 1.5, 4.0]
  }
};

function detectKey(channelData, sampleRate, options = {}) {
  const P = { ...KEY_DETECT_DEFAULTS, ...options };
  // 8192-point windows give ~5.4 Hz bins at 44.1k — enough to separate semitones down to
  // C2 (65 Hz) where the bass lives. Windows are spread evenly across the WHOLE track
  // (the previous version only looked at the first ~1.4 seconds — i.e. the intro).
  const windowSize = P.windowSize;
  if (channelData.length < windowSize) return null;

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const freqResolution = sampleRate / windowSize;

  const maxWindows = P.maxWindows;
  const available = Math.floor((channelData.length - windowSize) / (windowSize / 2)) + 1;
  const windowsToProcess = Math.min(available, maxWindows);
  const stride = windowsToProcess > 1 ? (channelData.length - windowSize) / (windowsToProcess - 1) : 0;

  // Pass 1: pick spectral peaks per window. Only PEAKS contribute (broadband drums and
  // noise otherwise fill all twelve bins).
  const peaksPerWindow = [];
  const windowEnergies = [];
  const loBin = Math.ceil(P.loHz / freqResolution);

  for (let w = 0; w < windowsToProcess; w++) {
    const start = Math.floor(w * stride);
    const windowData = channelData.subarray(start, start + windowSize);
    const magnitudes = computeMagnitudeSpectrum(windowData, windowSize);
    const hiBin = Math.min(magnitudes.length - 2, Math.floor(P.hiHz / freqResolution));

    let windowMax = 0;
    let windowEnergy = 0;
    for (let i = loBin; i <= hiBin; i++) {
      windowEnergy += magnitudes[i];
      if (magnitudes[i] > windowMax) windowMax = magnitudes[i];
    }
    const peakFloor = windowMax * P.peakFloor;
    const peaks = [];

    for (let i = loBin; i <= hiBin; i++) {
      const mag = magnitudes[i];
      if (mag < peakFloor || mag <= magnitudes[i - 1] || mag < magnitudes[i + 1]) continue;

      // Parabolic interpolation for a sub-bin frequency estimate
      const a = magnitudes[i - 1], b = mag, c = magnitudes[i + 1];
      const denom = a - 2 * b + c;
      const shift = denom !== 0 ? 0.5 * (a - c) / denom : 0;
      const freq = (i + shift) * freqResolution;
      const weight = Math.pow(mag, P.magPower) * (freq < P.bassHz ? P.bassBoost : 1);
      peaks.push({ freq, weight });
    }

    if (P.topPeaks > 0 && peaks.length > P.topPeaks) {
      peaks.sort((a, b) => b.weight - a.weight);
      peaks.length = P.topPeaks;
    }
    peaksPerWindow.push(peaks);
    windowEnergies.push(windowEnergy);
  }

  // Tuning: old records, pitched edits and vinyl rips aren't at A440. Find the dominant
  // fractional-semitone offset of all peaks (circular mean) and fold it out before
  // binning, so a track 40 cents flat doesn't smear every note across two bins.
  let tuningOffset = 0;
  if (P.tuning) {
    let sx = 0, sy = 0;
    for (const peaks of peaksPerWindow) {
      for (const { freq, weight } of peaks) {
        const dev = 12 * Math.log2(freq / 440);
        const frac = dev - Math.round(dev); // [-0.5, 0.5)
        sx += weight * Math.cos(2 * Math.PI * frac);
        sy += weight * Math.sin(2 * Math.PI * frac);
      }
    }
    if (sx !== 0 || sy !== 0) tuningOffset = Math.atan2(sy, sx) / (2 * Math.PI);
  }

  // Pass 2: harmonic pitch-class profile. Each peak votes for the pitch class of the
  // fundamentals it could be a harmonic of (f/1..f/harmonics) with decaying weight, which
  // pulls energy back onto roots. The bass register gets a boost — in club music the
  // bassline states the key.
  const chromaPerWindow = [];
  const normalise = (chroma) => {
    if (!P.windowNorm) return chroma;
    const m = Math.max(...chroma);
    if (m > 0) for (let j = 0; j < 12; j++) chroma[j] /= m;
    return chroma;
  };
  for (const peaks of peaksPerWindow) {
    const chroma = new Array(12).fill(0);
    for (const { freq, weight } of peaks) {
      for (let h = 1; h <= P.harmonics; h++) {
        const f0 = freq / h;
        if (f0 < 30) break;
        const semitoneFromA = 12 * Math.log2(f0 / 440) - tuningOffset;
        const pitchClass = (((Math.round(semitoneFromA) + 9) % 12) + 12) % 12;
        chroma[pitchClass] += weight * Math.pow(P.harmonicDecay, h - 1);
      }
    }
    chromaPerWindow.push(normalise(chroma));
  }

  // Skip near-silent windows (intros/outros) so they don't dilute the estimate
  const meanEnergy = windowEnergies.reduce((a, b) => a + b, 0) / windowEnergies.length;
  const avgChroma = new Array(12).fill(0);
  let used = 0;
  for (let i = 0; i < chromaPerWindow.length; i++) {
    if (windowEnergies[i] < meanEnergy * P.silenceGate) continue;
    for (let j = 0; j < 12; j++) avgChroma[j] += chromaPerWindow[i][j];
    used++;
  }
  if (used === 0) return null;

  const maxChroma = Math.max(...avgChroma);
  const normalizedChroma = avgChroma.map(c => maxChroma > 0 ? c / maxChroma : 0);

  // Key profiles (index 0 = tonic). 'ks' = Krumhansl-Schmuckler probe-tone ratings;
  // 'temperley' = Temperley's Bayesian profiles; custom profiles can be passed in options.
  const profileSet = P.majorProfile && P.minorProfile
    ? { major: P.majorProfile, minor: P.minorProfile }
    : KEY_PROFILES[P.profiles] || KEY_PROFILES.ks;
  const majorProfile = profileSet.major;
  const minorProfile = profileSet.minor;

  // Pearson correlation
  const correlate = (a, b) => {
    const n = a.length;
    const meanA = a.reduce((s, v) => s + v, 0) / n;
    const meanB = b.reduce((s, v) => s + v, 0) / n;
    let num = 0, denA = 0, denB = 0;
    for (let i = 0; i < n; i++) {
      const diffA = a[i] - meanA;
      const diffB = b[i] - meanB;
      num += diffA * diffB;
      denA += diffA * diffA;
      denB += diffB * diffB;
    }
    return denA > 0 && denB > 0 ? num / Math.sqrt(denA * denB) : 0;
  };

  // For each candidate tonic, rotate the chroma so that tonic sits at index 0
  const candidates = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    const rotated = normalizedChroma.map((_, j) => normalizedChroma[(j + tonic) % 12]);
    candidates.push({ note: noteNames[tonic], index: tonic, mode: 'major', corr: correlate(rotated, majorProfile) });
    candidates.push({ note: noteNames[tonic], index: tonic, mode: 'minor', corr: correlate(rotated, minorProfile) });
  }
  candidates.sort((a, b) => b.corr - a.corr);

  const bestKey = candidates[0];
  const bestCorr = bestKey.corr;
  // Confidence is driven by the absolute fit: on the benchmark, correlation < 0.7 was
  // usable only ~half the time, ≥ 0.7 about 90%. The margin over the runner-up adds
  // little (the runner-up is usually the relative or neighbouring key, which still
  // transposes cleanly), so it only nudges.
  const margin = bestCorr - candidates[1].corr;
  const confidence = Math.max(0, Math.min(100, Math.round(-40 + bestCorr * 140 + Math.min(10, margin * 50))));
  const alternatives = candidates.slice(1, 4).map(c => ({ key: c.note, mode: c.mode, corr: Math.round(c.corr * 100) / 100 }));

  // Generate scale notes
  const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
  const minorIntervals = [0, 2, 3, 5, 7, 8, 10];
  const intervals = bestKey.mode === 'major' ? majorIntervals : minorIntervals;
  const scaleNotes = intervals.map(interval =>
    noteNames[(bestKey.index + interval) % 12]
  );

  // Camelot wheel notation
  const camelotMajor = ['8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B'];
  const camelotMinor = ['5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A'];
  const camelot = bestKey.mode === 'major'
    ? camelotMajor[bestKey.index]
    : camelotMinor[bestKey.index];

  // Compatible keys
  const camelotNumber = parseInt(camelot);
  const camelotLetter = camelot.slice(-1);
  const compatibleKeys = [];

  // Same key (energy match)
  compatibleKeys.push({ code: camelot, relation: 'Same key' });

  // +1 semitone (energy boost)
  const plus1 = ((camelotNumber % 12) + 1) || 12;
  compatibleKeys.push({ code: `${plus1}${camelotLetter}`, relation: '+1 energy' });

  // -1 semitone (energy drop)
  const minus1 = ((camelotNumber - 2 + 12) % 12) + 1;
  compatibleKeys.push({ code: `${minus1}${camelotLetter}`, relation: '-1 energy' });

  // Relative major/minor
  compatibleKeys.push({
    code: `${camelotNumber}${camelotLetter === 'A' ? 'B' : 'A'}`,
    relation: camelotLetter === 'A' ? 'Relative major' : 'Relative minor'
  });

  return {
    key: bestKey.note,
    mode: bestKey.mode,
    scale: `${bestKey.note} ${bestKey.mode}`,
    scaleNotes,
    camelot,
    confidence,
    alternatives,
    compatibleKeys,
    chroma: noteNames.map((note, i) => ({ note, value: normalizedChroma[i] })),
    windows: P.debugWindows ? chromaPerWindow.map((c, i) => ({ c, e: windowEnergies[i] / meanEnergy })) : undefined,
    tuningCents: Math.round(tuningOffset * 100)
  };
}

// =============================================================================
// Section detection — intro / breakdown / buildup / drop / outro
// =============================================================================

/** RBJ biquad (Q = 0.707) applied in place-ish: returns a filtered copy */
function biquad(data, sampleRate, type, hz) {
  const w0 = 2 * Math.PI * hz / sampleRate;
  const cosw = Math.cos(w0), sinw = Math.sin(w0);
  const alpha = sinw / (2 * 0.7071);
  let b0, b1, b2;
  if (type === 'lowpass') { b0 = (1 - cosw) / 2; b1 = 1 - cosw; b2 = (1 - cosw) / 2; }
  else { b0 = (1 + cosw) / 2; b1 = -(1 + cosw); b2 = (1 + cosw) / 2; }
  const a0 = 1 + alpha, a1 = -2 * cosw, a2 = 1 - alpha;
  b0 /= a0; b1 /= a0; b2 /= a0;
  const na1 = a1 / a0, na2 = a2 / a0;
  const out = new Float32Array(data.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < data.length; i++) {
    const x0 = data[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - na1 * y1 - na2 * y2;
    out[i] = y0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
  }
  return out;
}

/** Mean power per bar for one signal, added into `acc` */
function accumulateBarPower(data, sampleRate, starts, duration, acc) {
  for (let b = 0; b < starts.length; b++) {
    const s0 = Math.max(0, Math.floor(starts[b] * sampleRate));
    const s1 = Math.min(data.length, Math.floor((b + 1 < starts.length ? starts[b + 1] : duration) * sampleRate));
    if (s1 <= s0) continue;
    let sq = 0;
    for (let i = s0; i < s1; i++) sq += data[i] * data[i];
    acc[b] += sq / (s1 - s0);
  }
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Normalise a per-bar dB array to 0..1 between its p10 and p90 over the active bars */
function normaliseBars(db, active) {
  const vals = [];
  for (let i = 0; i < db.length; i++) if (active[i]) vals.push(db[i]);
  vals.sort((a, b) => a - b);
  const lo = percentile(vals, 0.1), hi = percentile(vals, 0.9);
  const span = Math.max(3, hi - lo);
  return db.map((v, i) => active[i] ? Math.min(1, Math.max(0, (v - lo) / span)) : 0);
}

const mean = (arr, from, to) => {
  let s = 0, n = 0;
  for (let i = from; i < to; i++) { s += arr[i]; n++; }
  return n ? s / n : 0;
};

/**
 * Label the arrangement from per-bar energy. Works on the full mix (first pass, right
 * after decode) or on stems (drums / bass / instrumental give cleaner signals; the vocal
 * is ignored because a vocal-only breakdown is still a breakdown).
 *
 * Intensity per bar = 0.25 × overall level + 0.3 × low band (< 150 Hz) + 0.45 × mid band
 * (300 Hz – 3 kHz), each normalised to the track's p10–p90. Bass says "the drop is in";
 * the mid band says there's musical content — an extended-mix intro or outro has kick
 * and bass but nothing in the mids, and that's what keeps it from reading as a drop.
 * The track is cut where the 4-bar energy steps, segments within 0.25 of the track's
 * own drop level are drops, the rest are intro / breakdown / outro, and the rising tail
 * of a low segment before a drop (level + high band > 4 kHz climbing) is the buildup.
 *
 * @param {{ role: string, data: Float32Array }[]} layers  'mix' | 'vocals' | 'drums' | 'bass' | 'other' | …
 * @returns {{ sections: { label: string, start: number }[], bars: { start: number, intensity: number }[], barSec: number }}
 */
function detectSections(layers, sampleRate, { bpm = 0, gridOffset = 0 } = {}) {
  const barSec = bpm > 0 ? 240 / bpm : 2;
  const length = Math.max(...layers.map(l => l.data.length));
  const duration = length / sampleRate;
  const offset = ((gridOffset % barSec) + barSec) % barSec;
  const starts = [];
  if (offset > 0.05) starts.push(0); // pickup before bar 1
  for (let t = offset; t < duration - 0.05; t += barSec) starts.push(t);
  const n = starts.length;
  if (n < 2) return { sections: [{ label: 'intro', start: 0 }], bars: starts.map(s => ({ start: s, intensity: 0 })), barSec };

  const backing = layers.filter(l => l.role !== 'vocals');
  const body = backing.length ? backing : layers;
  const bassStem = layers.find(l => l.role === 'bass');
  const drumStem = layers.find(l => l.role === 'drums');
  const lowSrc = bassStem ? [bassStem] : body;
  const highSrc = drumStem ? [drumStem] : body;

  const totalP = new Float64Array(n), lowP = new Float64Array(n), midP = new Float64Array(n), highP = new Float64Array(n);
  for (const l of body) {
    accumulateBarPower(l.data, sampleRate, starts, duration, totalP);
    accumulateBarPower(biquad(biquad(l.data, sampleRate, 'highpass', 300), sampleRate, 'lowpass', 3000), sampleRate, starts, duration, midP);
  }
  for (const l of lowSrc) accumulateBarPower(biquad(l.data, sampleRate, 'lowpass', 150), sampleRate, starts, duration, lowP);
  for (const l of highSrc) accumulateBarPower(biquad(l.data, sampleRate, 'highpass', 4000), sampleRate, starts, duration, highP);

  const dB = p => 10 * Math.log10(p + 1e-12);
  const totalDb = Array.from(totalP, dB), lowDb = Array.from(lowP, dB), midDb = Array.from(midP, dB), highDb = Array.from(highP, dB);
  const peak = Math.max(...totalDb);
  const active = totalDb.map(v => v > peak - 40);
  const T = normaliseBars(totalDb, active), B = normaliseBars(lowDb, active), M = normaliseBars(midDb, active), H = normaliseBars(highDb, active);
  const intensity = T.map((t, i) => 0.25 * t + 0.3 * B[i] + 0.45 * M[i]);

  // Boundaries where the 4-bar mean steps by more than 0.2 (local maxima of the novelty,
  // at least 4 bars apart), then segments shorter than 4 bars are absorbed by the
  // neighbour whose level is closer.
  const W = 4, MIN_SEG = 4;
  const novelty = new Float64Array(n);
  for (let i = W; i <= n - W; i++) novelty[i] = Math.abs(mean(intensity, i, i + W) - mean(intensity, i - W, i));
  const cuts = [0];
  for (let i = W; i <= n - W; i++) {
    if (novelty[i] < 0.2) continue;
    let isPeak = true;
    for (let j = Math.max(0, i - W + 1); j < Math.min(n, i + W); j++) if (novelty[j] > novelty[i]) { isPeak = false; break; }
    if (isPeak && i - cuts[cuts.length - 1] >= MIN_SEG) cuts.push(i);
  }
  let segs = cuts.map((from, k) => ({ from, to: k + 1 < cuts.length ? cuts[k + 1] : n }));
  const level = seg => mean(intensity, seg.from, seg.to);
  for (;;) {
    const idx = segs.findIndex(sg => sg.to - sg.from < MIN_SEG);
    if (idx < 0 || segs.length < 2) break;
    const victim = segs[idx];
    const prev = segs[idx - 1], next = segs[idx + 1];
    const into = !prev ? next : !next ? prev
      : Math.abs(level(prev) - level(victim)) <= Math.abs(level(next) - level(victim)) ? prev : next;
    if (into === prev) prev.to = victim.to; else next.from = victim.from;
    segs.splice(idx, 1);
  }
  // Trailing silence belongs to the outro, not a section of its own
  while (segs.length > 1 && !active.slice(segs[segs.length - 1].from, segs[segs.length - 1].to).some(Boolean)) {
    segs[segs.length - 2].to = segs[segs.length - 1].to;
    segs.pop();
  }

  // Drop level = p80 of the active bars; anything within 0.25 of it is a drop
  const activeVals = intensity.filter((_, i) => active[i]).sort((a, b) => a - b);
  const dropCut = percentile(activeVals, 0.8) - 0.25;
  segs.forEach(sg => { sg.level = level(sg); sg.high = sg.level >= dropCut; });

  // Buildup = the rising tail (level + high band climbing) of a low segment that leads
  // into a drop; a short low segment that rises as a whole is a buildup outright
  const rise = T.map((t, i) => 0.5 * t + 0.5 * H[i]);
  const buildupLength = (sg, isFirst) => {
    const len = sg.to - sg.from;
    for (const L of [16, 8, 4]) {
      if (L > len - MIN_SEG) continue;
      if (mean(rise, sg.to - L, sg.to) - mean(rise, sg.from, sg.to - L) > 0.15) return L;
    }
    // A short low segment that climbs end to end is a buildup outright — unless it's the
    // opening bars, which stay "intro"
    if (!isFirst && len <= 16 && len >= MIN_SEG && mean(rise, sg.to - 2, sg.to) - mean(rise, sg.from, sg.from + 2) > 0.2) return len;
    return 0;
  };

  // Everything before the first drop is intro, everything after the last is outro
  const firstHigh = segs.findIndex(sg => sg.high);
  const lastHigh = segs.length - 1 - [...segs].reverse().findIndex(sg => sg.high);
  const sections = [];
  segs.forEach((sg, idx) => {
    if (sg.high) { sections.push({ label: 'drop', start: starts[sg.from] }); return; }
    const base = firstHigh < 0 ? 'intro' : idx < firstHigh ? 'intro' : idx > lastHigh ? 'outro' : 'breakdown';
    const next = segs[idx + 1];
    const L = next && next.high ? buildupLength(sg, idx === 0) : 0;
    if (L < sg.to - sg.from) sections.push({ label: base, start: starts[sg.from] });
    if (L) sections.push({ label: 'buildup', start: starts[sg.to - L] });
  });
  // Collapse adjacent segments that ended up with the same label
  const merged = sections.filter((sec, i) => i === 0 || sec.label !== sections[i - 1].label);

  return {
    sections: merged.map(s => ({ label: s.label, start: Math.round(s.start * 1000) / 1000 })),
    bars: starts.map((s, i) => ({ start: Math.round(s * 1000) / 1000, intensity: Math.round(intensity[i] * 100) / 100 })),
    barSec,
  };
}

// =============================================================================
// Beat tracking — the grid a tempo lock is bent onto
// =============================================================================
//
// Run this on the FULL MIX or the instrumental, never the vocal: the whole method is
// transients, and an acapella has almost none (that is exactly why Live's Auto-Warp
// gives up on one). Spectral-flux onset envelope -> Ellis-style dynamic-programming beat
// tracker -> sub-frame refine -> local linear fit of beat index against time. The last
// step matters twice: it removes frame quantisation, and it keeps the stretch ratio the
// renderer derives from these beats smooth, which is what stops the audio warbling.

const BEAT_TARGET_SR = 22050;
const BEAT_HOP = 256;
const BEAT_WIN = 1024;
const BEAT_SMOOTH = 16;   // ± beats in the local linear fit
const BEAT_TIGHTNESS = 680; // DP penalty on straying from the global period

/**
 * Spectral flux onset envelope, plus per-frame low-band magnitude (for the downbeat).
 * @returns {{ env: Float32Array, low: Float32Array, fps: number, frames: number }}
 */
function onsetEnvelope(channelData, sampleRate) {
  // Decimate to ~22 kHz — beats live well below Nyquist and this is 2× less FFT
  const by = Math.max(1, Math.round(sampleRate / BEAT_TARGET_SR));
  const sr = sampleRate / by;
  const n = Math.floor(channelData.length / by);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < by; k++) s += channelData[i * by + k];
    x[i] = s / by;
  }

  const fps = sr / BEAT_HOP;
  const frames = Math.max(0, Math.floor((n - BEAT_WIN) / BEAT_HOP));
  const flux = new Float32Array(frames);
  const low = new Float32Array(frames);
  if (!frames) return { env: flux, low, fps, frames };

  const win = new Float32Array(BEAT_WIN);
  for (let i = 0; i < BEAT_WIN; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (BEAT_WIN - 1));
  const re = new Float32Array(BEAT_WIN);
  const im = new Float32Array(BEAT_WIN);
  const prev = new Float32Array(BEAT_WIN / 2);
  const lowBin = Math.max(1, Math.round(150 / sr * BEAT_WIN));

  for (let f = 0; f < frames; f++) {
    const off = f * BEAT_HOP;
    for (let i = 0; i < BEAT_WIN; i++) { re[i] = x[off + i] * win[i]; im[i] = 0; }
    fft(re, im);
    let sum = 0, lo = 0;
    for (let k = 0; k < BEAT_WIN / 2; k++) {
      // log magnitude: a hat on top of a loud drop still reads as an onset
      const m = Math.log1p(100 * Math.hypot(re[k], im[k]));
      const d = m - prev[k];
      if (d > 0) sum += d;
      prev[k] = m;
      if (k <= lowBin) lo += m;
    }
    flux[f] = sum;
    low[f] = lo;
  }

  // Subtract a local mean so a loud section does not outvote a quiet one, then normalise
  const env = new Float32Array(frames);
  const W = Math.max(1, Math.round(fps * 0.8));
  let running = 0;
  for (let f = 0; f < Math.min(frames, W); f++) running += flux[f];
  let lo = 0, hi = Math.min(frames, W);
  for (let f = 0; f < frames; f++) {
    const want = Math.max(0, f - W), wantHi = Math.min(frames, f + W);
    while (lo < want) { running -= flux[lo++]; }
    while (hi < wantHi) { running += flux[hi++]; }
    env[f] = Math.max(0, flux[f] - running / (hi - lo));
  }
  let max = 0;
  for (let f = 0; f < frames; f++) if (env[f] > max) max = env[f];
  if (max > 0) for (let f = 0; f < frames; f++) env[f] /= max;

  return { env, low, fps, frames };
}

/** Autocorrelation of the onset envelope at a beat period, summed over 1/2/4 beats. */
function tempoScore(env, frames, lagFrames) {
  let total = 0, count = 0;
  for (const mult of [1, 2, 4]) {
    const L = Math.round(lagFrames * mult);
    if (L < 1 || L >= frames) continue;
    for (let f = 0; f + L < frames; f++) { total += env[f] * env[f + L]; count++; }
  }
  return count ? total / count : 0;
}

/** Coarse-then-fine search for the global tempo. */
function globalTempo(env, frames, fps, minBpm, maxBpm) {
  let best = { bpm: 0, score: -1 };
  for (let bpm = minBpm; bpm <= maxBpm; bpm += 0.5) {
    const score = tempoScore(env, frames, 60 / bpm * fps);
    if (score > best.score) best = { bpm, score };
  }
  const from = Math.max(minBpm, best.bpm - 0.5);
  const to = Math.min(maxBpm, best.bpm + 0.5);
  for (let bpm = from; bpm <= to; bpm += 0.02) {
    const score = tempoScore(env, frames, 60 / bpm * fps);
    if (score > best.score) best = { bpm, score };
  }
  return best;
}

/** Local linear fit of beat index -> time over ±K beats. Smooths the tempo curve. */
function smoothBeats(times, K) {
  return times.map((_, i) => {
    const a = Math.max(0, i - K);
    const z = Math.min(times.length - 1, i + K);
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let j = a; j <= z; j++) { n++; sx += j; sy += times[j]; sxx += j * j; sxy += j * times[j]; }
    const den = n * sxx - sx * sx;
    if (!den) return times[i];
    const slope = (n * sxy - sx * sy) / den;
    return (sy - slope * sx) / n + slope * i;
  });
}

/**
 * Track the beats of a piece of audio.
 * @param {Float32Array} channelData mono samples — the mix or the instrumental
 * @param {number} sampleRate
 * @param {{ minBpm?: number, maxBpm?: number }} [options]
 * @returns {{ beats: number[], bpm: number, tempoRange: {min:number,max:number},
 *             downbeatIndex: number, confidence: number, trackedBpm: number }}
 */
function detectBeats(channelData, sampleRate, { minBpm = 70, maxBpm = 190 } = {}) {
  const { env, low, fps, frames } = onsetEnvelope(channelData, sampleRate);
  if (frames < 64) return { beats: [], bpm: 0, tempoRange: { min: 0, max: 0 }, downbeatIndex: 0, confidence: 0, trackedBpm: 0 };

  const { bpm: trackedBpm } = globalTempo(env, frames, fps, minBpm, maxBpm);
  const tau = 60 / trackedBpm * fps;

  // Ellis DP: maximise (onset strength at each beat) − tightness × log(interval/τ)²
  const lo = Math.max(1, Math.round(tau * 0.55));
  const hi = Math.round(tau * 1.75);
  const cost = new Float64Array(frames).fill(-1e18);
  const back = new Int32Array(frames).fill(-1);
  for (let t = 0; t < frames; t++) {
    if (t < hi) { cost[t] = env[t]; continue; }
    let bestScore = -1e18, bestPrev = -1;
    for (let d = lo; d <= hi; d++) {
      const v = t - d;
      if (v < 0) break;
      const r = Math.log(d / tau);
      const s = cost[v] - BEAT_TIGHTNESS * r * r;
      if (s > bestScore) { bestScore = s; bestPrev = v; }
    }
    cost[t] = env[t] + bestScore;
    back[t] = bestPrev;
  }
  let end = -1, endScore = -1e18;
  for (let t = Math.max(0, frames - hi); t < frames; t++) if (cost[t] > endScore) { endScore = cost[t]; end = t; }
  const frameIdx = [];
  for (let t = end; t >= 0; t = back[t]) frameIdx.push(t);
  frameIdx.reverse();
  if (frameIdx.length < 4) return { beats: [], bpm: 0, tempoRange: { min: 0, max: 0 }, downbeatIndex: 0, confidence: 0, trackedBpm };

  // Sub-frame: parabolic peak of the envelope within ±2 frames of each beat
  const refined = frameIdx.map((f) => {
    let bf = f, bv = -1;
    for (let d = -2; d <= 2; d++) {
      const g = f + d;
      if (g < 1 || g >= frames - 1) continue;
      if (env[g] > bv) { bv = env[g]; bf = g; }
    }
    const y0 = env[bf - 1] || 0, y1 = env[bf] || 0, y2 = env[bf + 1] || 0;
    const den = y0 - 2 * y1 + y2;
    const dx = den !== 0 ? 0.5 * (y0 - y2) / den : 0;
    return (bf + Math.max(-1, Math.min(1, dx))) / fps;
  });

  const smooth = smoothBeats(refined, BEAT_SMOOTH);
  // The fit can in principle go flat; a non-increasing grid is unusable downstream
  const beats = [];
  for (const t of smooth) if (!beats.length || t > beats[beats.length - 1] + 1e-6) beats.push(t);

  // Downbeat: of the four phases, the one whose beats carry the most low end
  let downbeatIndex = 0, bestLow = -1;
  for (let p = 0; p < 4; p++) {
    let sum = 0, n = 0;
    for (let i = p; i < beats.length; i += 4) {
      const f = Math.round(beats[i] * fps);
      if (f >= 0 && f < frames) { sum += low[f]; n++; }
    }
    if (n && sum / n > bestLow) { bestLow = sum / n; downbeatIndex = p; }
  }

  // How well the grid sits on the onsets — a vocal-only file scores near zero
  let align = 0;
  for (const t of beats) {
    const p = t * fps, f = Math.floor(p), fr = p - f;
    if (f >= 0 && f + 1 < frames) align += env[f] * (1 - fr) + env[f + 1] * fr;
  }
  align /= beats.length || 1;

  const gaps = [];
  for (let i = 1; i < beats.length; i++) gaps.push(60 / (beats[i] - beats[i - 1]));
  gaps.sort((a, b) => a - b);

  return {
    beats: beats.map(t => Math.round(t * 1e6) / 1e6),
    bpm: gaps.length ? gaps[gaps.length >> 1] : trackedBpm,
    tempoRange: { min: gaps[0] || 0, max: gaps[gaps.length - 1] || 0 },
    downbeatIndex,
    // Calibrated so a full mix lands around 70 and a vocal-only file (which tracks the
    // wrong tempo entirely) around 25 — the UI warns below 40.
    confidence: Math.max(0, Math.min(100, Math.round(align * 500))),
    trackedBpm,
  };
}

// =============================================================================
// Message handler
// =============================================================================

self.onmessage = function(e) {
  const { type, payload, id } = e.data;

  try {
    let result;

    switch (type) {
      case 'DETECT_BPM':
        result = detectBPM(new Float32Array(payload.channelData), payload.sampleRate);
        break;

      case 'DETECT_KEY':
        result = detectKey(new Float32Array(payload.channelData), payload.sampleRate);
        break;

      case 'DETECT_BEATS':
        result = detectBeats(new Float32Array(payload.channelData), payload.sampleRate, payload.options || {});
        break;

      case 'DETECT_SECTIONS':
        result = detectSections(
          payload.layers.map(l => ({ role: l.role, data: new Float32Array(l.channelData) })),
          payload.sampleRate,
          payload.options || {}
        );
        break;

      case 'GENERATE_WAVEFORM_COLORS': {
        // Signal Deck: colour the waveform by frequency content. For each of N columns
        // across the track, average the spectral centroid over several 2048-sample FFTs
        // spanning that column (not one 46 ms snapshot, which flips hue on every hat),
        // then smooth with a ~1.2 s moving average so colour follows sections rather than
        // beats. Mapped onto [0,1] with a log scale from 120 Hz to 8 kHz — the range a full
        // mix's centroid actually covers (filtered breakdown → blue, open drop → yellow).
        // Returns a Float32Array of t values (-1 = silence).
        const channelData = new Float32Array(payload.channelData);
        const sampleRate = payload.sampleRate;
        const numColumns = Math.max(16, Math.min(2048, payload.numColumns || 512));
        const win = 2048;
        const total = channelData.length;
        const raw = new Float32Array(numColumns);
        const binHz = sampleRate / win;
        const lo = Math.log10(120), hi = Math.log10(8000);
        const slice = new Float32Array(win);
        const maxBin = Math.min(win / 2, Math.floor(16000 / binHz));
        const span = total / numColumns;
        const fftsPerColumn = Math.max(1, Math.min(6, Math.floor(span / win)));
        for (let c = 0; c < numColumns; c++) {
          let num = 0, den = 0;
          for (let k = 0; k < fftsPerColumn; k++) {
            const center = Math.floor((c + (k + 0.5) / fftsPerColumn) * span);
            const start = Math.max(0, Math.min(total - win, center - win / 2));
            slice.fill(0);
            slice.set(channelData.subarray(start, Math.min(total, start + win)));
            const mags = computeMagnitudeSpectrum(slice, win);
            // skip DC and anything above 16 kHz — cymbal sizzle shouldn't drag the centroid
            for (let b = 1; b < maxBin; b++) {
              const m = mags[b];
              num += m * b * binHz;
              den += m;
            }
          }
          const centroid = den > 1e-6 * fftsPerColumn ? num / den : 0;
          raw[c] = centroid > 0 ? Math.log10(centroid) : NaN;
        }
        // Moving average over ~1.2 s of columns (silent columns don't contribute)
        const durationSec = total / sampleRate;
        const radius = Math.max(1, Math.round((0.6 / durationSec) * numColumns));
        const out = new Float32Array(numColumns);
        for (let c = 0; c < numColumns; c++) {
          if (Number.isNaN(raw[c])) { out[c] = -1; continue; }
          let sum = 0, n = 0;
          for (let j = Math.max(0, c - radius); j <= Math.min(numColumns - 1, c + radius); j++) {
            if (Number.isNaN(raw[j])) continue;
            sum += raw[j];
            n++;
          }
          out[c] = Math.min(1, Math.max(0, (sum / n - lo) / (hi - lo)));
        }
        self.postMessage({ type: 'SUCCESS', id, result: { colors: out.buffer, numColumns } }, [out.buffer]);
        return;
      }

      case 'GENERATE_WAVEFORM_DATA': {
        const channelData = new Float32Array(payload.channelData);
        const totalSamples = channelData.length;
        const sampleRate = payload.sampleRate;

        // Target ~1 min/max pair per 64 samples, capped at 200k pairs
        const targetBlocks = Math.min(200000, Math.ceil(totalSamples / 64));
        const blockSize = Math.max(1, Math.floor(totalSamples / targetBlocks));
        const numBlocks = Math.ceil(totalSamples / blockSize);

        const mins = new Float32Array(numBlocks);
        const maxes = new Float32Array(numBlocks);

        for (let i = 0; i < numBlocks; i++) {
          let blockMin = Infinity;
          let blockMax = -Infinity;
          const start = i * blockSize;
          const end = Math.min(start + blockSize, totalSamples);

          for (let j = start; j < end; j++) {
            const sample = channelData[j];
            if (sample < blockMin) blockMin = sample;
            if (sample > blockMax) blockMax = sample;
          }

          mins[i] = blockMin;
          maxes[i] = blockMax;
        }

        // Transfer buffers for zero-copy (skip the generic postMessage below)
        self.postMessage(
          { type: 'SUCCESS', id, result: { mins: mins.buffer, maxes: maxes.buffer, numBlocks, blockSize, totalSamples, sampleRate } },
          [mins.buffer, maxes.buffer]
        );
        return;
      }


      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    self.postMessage({ type: 'SUCCESS', id, result });
  } catch (error) {
    self.postMessage({ type: 'ERROR', id, error: error.message });
  }
};
