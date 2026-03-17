/**
 * Audio Analysis Web Worker
 * Runs heavy DSP computations off the main thread.
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
// Utility Functions
// =============================================================================

function frequencyToNote(freq) {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const a4 = 440;
  const semitones = 12 * Math.log2(freq / a4);
  const noteIndex = Math.round(semitones) + 9 + 48;
  const octave = Math.floor(noteIndex / 12);
  const note = noteNames[((noteIndex % 12) + 12) % 12];
  return `${note}${octave}`;
}

function findAttackTime(data, sampleRate) {
  const length = data.length;
  let maxVal = 0;
  let maxIndex = 0;

  for (let i = 0; i < length; i++) {
    const absVal = Math.abs(data[i]);
    if (absVal > maxVal) {
      maxVal = absVal;
      maxIndex = i;
    }
  }

  const threshold = maxVal * 0.1;
  let attackStart = 0;
  for (let i = 0; i < maxIndex; i++) {
    if (Math.abs(data[i]) > threshold) {
      attackStart = i;
      break;
    }
  }

  const attackSamples = maxIndex - attackStart;
  return (attackSamples / sampleRate) * 1000;
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

function detectKey(channelData, sampleRate) {
  const windowSize = 4096;
  const hopSize = windowSize / 2;
  const numWindows = Math.floor((channelData.length - windowSize) / hopSize);

  if (numWindows === 0) return null;

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const freqResolution = sampleRate / windowSize;

  const windowsToProcess = Math.min(numWindows, 30);
  const chromaPerWindow = [];
  const windowEnergies = [];

  for (let w = 0; w < windowsToProcess; w++) {
    const start = w * hopSize;
    const windowData = channelData.slice(start, start + windowSize);

    const magnitudes = computeMagnitudeSpectrum(windowData, windowSize);

    const chroma = new Array(12).fill(0);
    let windowEnergy = 0;

    for (let i = 1; i < magnitudes.length; i++) {
      const freq = i * freqResolution;
      if (freq < 80 || freq > 4000) continue;

      const mag = magnitudes[i];
      windowEnergy += mag * mag;

      const semitone = 12 * Math.log2(freq / 440);
      const noteIndex = Math.round(semitone) % 12;
      const pitchClass = ((noteIndex % 12) + 12) % 12;
      chroma[pitchClass] += mag * mag;
    }

    chromaPerWindow.push(chroma);
    windowEnergies.push(windowEnergy);
  }

  const totalEnergy = windowEnergies.reduce((a, b) => a + b, 0);
  const avgChroma = new Array(12).fill(0);
  for (let i = 0; i < chromaPerWindow.length; i++) {
    const weight = totalEnergy > 0 ? windowEnergies[i] / totalEnergy : 1 / chromaPerWindow.length;
    for (let j = 0; j < 12; j++) {
      avgChroma[j] += chromaPerWindow[i][j] * weight;
    }
  }

  const maxChroma = Math.max(...avgChroma);
  const normalizedChroma = avgChroma.map(c => maxChroma > 0 ? c / maxChroma : 0);

  // Krumhansl-Schmuckler key profiles
  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

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

  const rotateArray = (arr, shift) => {
    const n = arr.length;
    return arr.map((_, i) => arr[(i + shift) % n]);
  };

  let bestKey = null;
  let bestCorr = -Infinity;

  for (let i = 0; i < 12; i++) {
    const rotatedChroma = rotateArray(normalizedChroma, i);

    const majorCorr = correlate(rotatedChroma, majorProfile);
    if (majorCorr > bestCorr) {
      bestCorr = majorCorr;
      bestKey = { note: noteNames[(12 - i) % 12], mode: 'major', index: (12 - i) % 12 };
    }

    const minorCorr = correlate(rotatedChroma, minorProfile);
    if (minorCorr > bestCorr) {
      bestCorr = minorCorr;
      bestKey = { note: noteNames[(12 - i) % 12], mode: 'minor', index: (12 - i) % 12 };
    }
  }

  if (!bestKey) return null;

  const confidence = Math.min(100, Math.round((bestCorr + 1) * 50));

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
    compatibleKeys,
    chroma: noteNames.map((note, i) => ({ note, value: normalizedChroma[i] }))
  };
}

// =============================================================================
// ADSR Analysis
// =============================================================================

function calculateADSR(channelData, sampleRate) {
  const length = channelData.length;

  // Use 0.5ms resolution for better accuracy on percussive sounds
  const msPerPoint = 0.5;
  const samplesPerPoint = Math.floor((msPerPoint / 1000) * sampleRate);
  const downsampleFactor = Math.max(1, samplesPerPoint);

  // Build amplitude envelope using peak detection per window
  const envelope = [];
  for (let i = 0; i < length; i += downsampleFactor) {
    const end = Math.min(i + downsampleFactor, length);
    let maxVal = 0;
    for (let j = i; j < end; j++) {
      maxVal = Math.max(maxVal, Math.abs(channelData[j]));
    }
    envelope.push(maxVal);
  }

  if (envelope.length === 0) return { attack: 0, decay: 0, sustain: 0, release: 0 };

  // Find global maximum for normalization
  const maxEnvelope = Math.max(...envelope);
  if (maxEnvelope < 0.001) return { attack: 0, decay: 0, sustain: 0, release: 0 };

  // Normalize envelope to 0-1
  const env = envelope.map(v => v / maxEnvelope);

  // ===== STEP 1: Find sound boundaries =====
  // Sound starts when amplitude exceeds 1% of max
  const noiseFloor = 0.01;
  let soundStart = 0;
  for (let i = 0; i < env.length; i++) {
    if (env[i] > noiseFloor) {
      soundStart = i;
      break;
    }
  }

  // Sound ends at last point above noise floor
  let soundEnd = env.length - 1;
  for (let i = env.length - 1; i >= soundStart; i--) {
    if (env[i] > noiseFloor) {
      soundEnd = i;
      break;
    }
  }

  const soundDurationPoints = soundEnd - soundStart;
  if (soundDurationPoints <= 1) {
    return { attack: 0, decay: 0, sustain: 0, release: 0 };
  }

  // ===== STEP 2: Find the FIRST strong peak (for percussive sounds) =====
  // For kicks/snares, the peak is at the very beginning
  // Strategy: Find the maximum in the first 100ms - if it's strong (>50% of global max),
  // use it as THE peak for attack calculation

  const first100msPoints = Math.min(Math.ceil(100 / msPerPoint), soundDurationPoints);
  let peakIndex = soundStart;
  let peakValue = 0;

  // Find the maximum in the ENTIRE sound first
  let globalPeakIndex = soundStart;
  let globalPeakValue = 0;
  for (let i = soundStart; i <= soundEnd; i++) {
    if (env[i] > globalPeakValue) {
      globalPeakValue = env[i];
      globalPeakIndex = i;
    }
  }

  // Find the maximum in the first 100ms
  let earlyPeakIndex = soundStart;
  let earlyPeakValue = 0;
  for (let i = soundStart; i < soundStart + first100msPoints && i <= soundEnd; i++) {
    if (env[i] > earlyPeakValue) {
      earlyPeakValue = env[i];
      earlyPeakIndex = i;
    }
  }

  // If the early peak is at least 50% of the global max, it's the real transient
  // This handles kicks/snares where there might be a slightly louder artifact later
  const earlyPeakThreshold = 0.50;
  let foundEarlyPeak = earlyPeakValue >= globalPeakValue * earlyPeakThreshold;

  if (foundEarlyPeak) {
    // Use the early peak - this is the percussive transient
    peakIndex = earlyPeakIndex;
    peakValue = earlyPeakValue;
  } else {
    // No significant early peak - use global peak (sustained sounds)
    peakIndex = globalPeakIndex;
    peakValue = globalPeakValue;
  }

  // ===== STEP 3: ATTACK - time from sound start to peak =====
  // For percussive sounds, this will be very short (0-10ms)
  const attackPoints = peakIndex - soundStart;
  const attack = Math.max(0, attackPoints * msPerPoint);

  // ===== STEP 4: Determine if this is a PERCUSSIVE sound =====
  // Percussive sounds: attack < 50ms and peak in first 100ms
  const soundDurationMs = soundDurationPoints * msPerPoint;
  const isPercussive = attack < 50 && foundEarlyPeak;

  // ===== STEP 5: Find SUSTAIN level =====
  let sustainLevel;

  if (isPercussive) {
    // For percussive sounds, sustain is essentially 0 or very low
    // Measure the level at ~80% through the sound (the tail)
    const tailIndex = Math.floor(soundStart + soundDurationPoints * 0.8);
    sustainLevel = env[Math.min(tailIndex, soundEnd)] || 0;
    // Cap at 20% for percussive sounds
    sustainLevel = Math.min(sustainLevel, 0.2);
  } else {
    // For sustained sounds, look at middle 50%
    const middleStart = Math.floor(soundStart + soundDurationPoints * 0.25);
    const middleEnd = Math.floor(soundStart + soundDurationPoints * 0.75);

    let sustainSum = 0;
    let sustainCount = 0;
    for (let i = middleStart; i <= middleEnd && i <= soundEnd; i++) {
      sustainSum += env[i];
      sustainCount++;
    }
    sustainLevel = sustainCount > 0 ? sustainSum / sustainCount : 0;
  }

  // For very short sounds (< 200ms), sustain is basically 0
  if (soundDurationMs < 200) {
    sustainLevel = 0;
  }

  const sustain = Math.round(sustainLevel * 100);

  // ===== STEP 6: DECAY - time from peak to reach low level =====
  let decayEndIndex = peakIndex;

  if (isPercussive) {
    // For percussive sounds, decay = time from peak to 10% of peak
    // This measures how long the "body" of the sound takes to fade
    const decayTarget = peakValue * 0.1;
    for (let i = peakIndex + 1; i <= soundEnd; i++) {
      if (env[i] <= decayTarget) {
        decayEndIndex = i;
        break;
      }
    }
    // If never reached 10%, use when it reaches 20%
    if (decayEndIndex === peakIndex) {
      const fallbackTarget = peakValue * 0.2;
      for (let i = peakIndex + 1; i <= soundEnd; i++) {
        if (env[i] <= fallbackTarget) {
          decayEndIndex = i;
          break;
        }
      }
    }
  } else {
    // For sustained sounds, decay = time from peak to sustain level
    const decayTarget = sustainLevel + (peakValue - sustainLevel) * 0.1;
    for (let i = peakIndex + 1; i <= soundEnd; i++) {
      if (env[i] <= decayTarget) {
        decayEndIndex = i;
        break;
      }
    }
  }

  // If we never reached the target, decay goes to end of sound
  if (decayEndIndex === peakIndex && peakIndex < soundEnd) {
    decayEndIndex = soundEnd;
  }

  const decayPoints = decayEndIndex - peakIndex;
  const decay = Math.max(0, decayPoints * msPerPoint);

  // ===== STEP 7: RELEASE - time for final fade out =====
  // For percussive sounds, release is the tail after the main decay

  // Find where signal drops to 10% of sustain (or 1% of peak if sustain is 0)
  const releaseThreshold = Math.max(sustainLevel * 0.1, peakValue * 0.01);
  let releaseEndIndex = soundEnd;

  for (let i = decayEndIndex; i <= soundEnd; i++) {
    if (env[i] <= releaseThreshold) {
      releaseEndIndex = i;
      break;
    }
  }

  // Release is from decay end to where it fades out
  const releasePoints = releaseEndIndex - decayEndIndex;
  const release = Math.max(0, releasePoints * msPerPoint);

  return {
    attack: Math.round(attack),
    decay: Math.round(decay),
    sustain,
    release: Math.round(release)
  };
}

// =============================================================================
// Filter Envelope Analysis
// =============================================================================

function analyzeFilterEnvelope(channelData, sampleRate) {
  const windowSize = 2048;
  const hopSize = 1024;
  const numFrames = Math.floor((channelData.length - windowSize) / hopSize);

  if (numFrames < 5) return null;

  const maxFrames = 50;
  const frameStep = Math.max(1, Math.floor(numFrames / maxFrames));
  const actualFrames = Math.min(numFrames, maxFrames);

  const brightnessOverTime = [];

  for (let frame = 0; frame < actualFrames; frame++) {
    const frameIndex = frame * frameStep;
    const start = frameIndex * hopSize;
    const windowData = channelData.slice(start, start + windowSize);

    const magnitudes = computeMagnitudeSpectrum(windowData, windowSize);

    let weightedSum = 0;
    let sum = 0;
    for (let i = 0; i < magnitudes.length; i++) {
      weightedSum += magnitudes[i] * i;
      sum += magnitudes[i];
    }
    const centroidBin = sum > 0 ? weightedSum / sum : 0;
    brightnessOverTime.push(centroidBin / (windowSize / 4));
  }

  const avgBrightness = brightnessOverTime.reduce((a, b) => a + b, 0) / brightnessOverTime.length;

  // Filter attack
  let filterAttack = 0;
  const attackThreshold = avgBrightness * 0.8;
  for (let i = 0; i < brightnessOverTime.length; i++) {
    if (brightnessOverTime[i] >= attackThreshold) {
      filterAttack = Math.round((i / actualFrames) * (channelData.length / sampleRate) * 1000);
      break;
    }
  }

  // Sweep direction — improved to detect rise-then-fall patterns (bandpass/peak sweeps)
  // and measure the full range of filter movement, not just endpoints
  const firstQuarter = brightnessOverTime.slice(0, Math.floor(actualFrames / 4));
  const lastQuarter = brightnessOverTime.slice(-Math.floor(actualFrames / 4));
  const middleHalf = brightnessOverTime.slice(Math.floor(actualFrames / 4), Math.floor(actualFrames * 3 / 4));
  const avgFirst = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
  const avgLast = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;
  const avgMiddle = middleHalf.length > 0 ? middleHalf.reduce((a, b) => a + b, 0) / middleHalf.length : avgBrightness;

  // Find peak brightness position and value
  let peakBrightnessIdx = 0;
  let peakBrightnessVal = 0;
  for (let i = 0; i < brightnessOverTime.length; i++) {
    if (brightnessOverTime[i] > peakBrightnessVal) {
      peakBrightnessVal = brightnessOverTime[i];
      peakBrightnessIdx = i;
    }
  }
  const peakPosition = peakBrightnessIdx / (actualFrames - 1); // 0-1, where in time the peak occurs

  let sweepDirection = 'stable';
  // Check for rise-then-fall (bandpass sweep): middle is brighter than both start and end
  if (avgMiddle > avgFirst * 1.3 && avgMiddle > avgLast * 1.3) {
    sweepDirection = 'bandpass'; // Opens then closes
  } else if (avgLast > avgFirst * 1.2) {
    sweepDirection = 'opening';
  } else if (avgLast < avgFirst * 0.8) {
    sweepDirection = 'closing';
  }
  // Also check if there's significant total movement even if start/end are similar
  if (sweepDirection === 'stable') {
    const maxBrightnessVal = Math.max(...brightnessOverTime);
    const minBrightnessVal = Math.min(...brightnessOverTime);
    const brightnessRange = maxBrightnessVal - minBrightnessVal;
    // If brightness varies by more than 40% of its range, there's meaningful movement
    if (brightnessRange > avgBrightness * 0.4 && avgBrightness > 0.01) {
      // Determine direction from peak position
      if (peakPosition < 0.3) sweepDirection = 'closing';
      else if (peakPosition > 0.7) sweepDirection = 'opening';
      else sweepDirection = 'bandpass';
    }
  }

  // Filter decay
  const maxBrightness = Math.max(...brightnessOverTime);
  const minBrightness = Math.min(...brightnessOverTime);
  const filterDecay = Math.round(((maxBrightness - minBrightness) / maxBrightness) * 100);

  // Resonance indicator
  const brightnessVariance = brightnessOverTime.reduce((sum, b) =>
    sum + Math.pow(b - avgBrightness, 2), 0
  ) / brightnessOverTime.length;
  const resonanceIndicator = Math.min(100, Math.round(brightnessVariance * 500));

  // Estimated cutoff - convert normalized centroid back to Hz using actual frequency resolution
  const freqResolution = sampleRate / windowSize;
  const estimatedCutoff = Math.round(avgBrightness * (windowSize / 4) * freqResolution);

  // Peak cutoff (maximum brightness point) — useful for filter sweeps where
  // the average cutoff underrepresents the actual filter range
  const peakCutoff = Math.round(peakBrightnessVal * (windowSize / 4) * freqResolution);

  // Min cutoff (darkest point)
  const minBrightnessForCutoff = Math.min(...brightnessOverTime);
  const minCutoff = Math.round(minBrightnessForCutoff * (windowSize / 4) * freqResolution);

  return {
    filterAttack,
    filterDecay,
    sweepDirection,
    estimatedCutoff,
    peakCutoff,
    minCutoff,
    peakPosition,
    resonanceIndicator,
    envelope: brightnessOverTime
  };
}

// =============================================================================
// Modulation Detection
// =============================================================================

function detectModulation(channelData, sampleRate) {
  const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
  const hopSize = Math.floor(windowSize / 2);
  const numWindows = Math.floor((channelData.length - windowSize) / hopSize);

  if (numWindows < 20) return { hasLfo: false, hasTremolo: false, hasVibrato: false, hasChorus: false };

  const maxWindows = 200;
  const windowStep = Math.max(1, Math.floor(numWindows / maxWindows));
  const actualWindows = Math.min(numWindows, maxWindows);

  const amplitudes = [];
  const spectralWidths = [];

  for (let w = 0; w < actualWindows; w++) {
    const windowIndex = w * windowStep;
    const start = windowIndex * hopSize;
    const end = start + windowSize;

    // Amplitude
    let sum = 0;
    for (let i = start; i < end && i < channelData.length; i++) {
      sum += Math.abs(channelData[i]);
    }
    amplitudes.push(sum / windowSize);

    // Spectral width
    const windowData = channelData.slice(start, Math.min(end, channelData.length));
    const magnitudes = computeMagnitudeSpectrum(windowData, windowSize);

    let magSum = 0;
    let weightedSum = 0;
    let weightedSqSum = 0;
    for (let i = 0; i < magnitudes.length; i++) {
      magSum += magnitudes[i];
      weightedSum += magnitudes[i] * i;
      weightedSqSum += magnitudes[i] * i * i;
    }
    const centroid = magSum > 0 ? weightedSum / magSum : 0;
    const variance = magSum > 0 ? (weightedSqSum / magSum) - (centroid * centroid) : 0;
    spectralWidths.push(Math.sqrt(Math.abs(variance)));
  }

  // Normalize
  const maxAmp = Math.max(...amplitudes);
  const normalizedAmps = amplitudes.map(a => maxAmp > 0 ? a / maxAmp : 0);

  // Tremolo detection — analyze the MIDDLE portion of the sound only
  // This avoids false positives from the natural ADSR amplitude envelope.
  // A one-shot sound with attack/decay/release has high amplitude variance across the whole
  // signal but that's just the envelope shape, NOT tremolo. True tremolo is periodic oscillation
  // during the sustained portion.
  // Use the middle 60% of samples (skip first 20% = attack, last 20% = release)
  const middleStart = Math.floor(normalizedAmps.length * 0.2);
  const middleEnd = Math.floor(normalizedAmps.length * 0.8);
  const middleAmps = normalizedAmps.slice(middleStart, middleEnd);

  let hasTremolo = false;
  let tremoloDepth = 0;
  let lfoRate = 0;
  let hasLfo = false;

  if (middleAmps.length > 10) {
    const ampMean = middleAmps.reduce((a, b) => a + b, 0) / middleAmps.length;
    const ampVariance = middleAmps.reduce((sum, a) =>
      sum + Math.pow(a - ampMean, 2), 0
    ) / middleAmps.length;

    // Require higher threshold on middle portion — true tremolo shows periodic variation
    const candidateTremolo = ampVariance > 0.01;

    // LFO rate detection via autocorrelation on middle portion
    if (candidateTremolo && middleAmps.length > 10) {
      const maxLag = Math.min(middleAmps.length / 2, 50);
      let bestCorr = 0;
      let bestLag = 0;

      for (let lag = 2; lag < maxLag; lag++) {
        let corr = 0;
        let count = 0;
        for (let i = 0; i < middleAmps.length - lag; i++) {
          corr += (middleAmps[i] - ampMean) * (middleAmps[i + lag] - ampMean);
          count++;
        }
        corr /= count;
        if (corr > bestCorr) {
          bestCorr = corr;
          bestLag = lag;
        }
      }

      // Require autocorrelation to confirm periodic behavior — tremolo MUST have repeating pattern
      // bestCorr > 0.15 (raised from 0.1) to require stronger periodicity evidence
      if (bestCorr > 0.15 && bestLag > 0) {
        hasLfo = true;
        const periodInSeconds = (bestLag * hopSize * windowStep) / sampleRate;
        lfoRate = 1 / periodInSeconds;

        // Only flag tremolo if we have confirmed periodic LFO behavior
        // Non-periodic amplitude changes (filter sweeps, envelopes) won't pass autocorrelation
        hasTremolo = true;
        tremoloDepth = Math.round(Math.sqrt(ampVariance) * 100);
      }
    }
  }

  // Chorus detection (spectral width variation)
  const avgWidth = spectralWidths.reduce((a, b) => a + b, 0) / spectralWidths.length;
  const widthVariance = spectralWidths.reduce((sum, w) =>
    sum + Math.pow(w - avgWidth, 2), 0
  ) / spectralWidths.length;
  const hasChorus = widthVariance > 10;

  // Vibrato (simplified - would need pitch tracking for accuracy)
  const hasVibrato = hasLfo && lfoRate > 3 && lfoRate < 10;

  // Generate suggestions
  let suggestedLfoRate = 'N/A';
  if (hasLfo && lfoRate > 0) {
    if (lfoRate < 1) suggestedLfoRate = `${(lfoRate).toFixed(2)} Hz (very slow)`;
    else if (lfoRate < 4) suggestedLfoRate = `${(lfoRate).toFixed(1)} Hz (slow)`;
    else if (lfoRate < 8) suggestedLfoRate = `${(lfoRate).toFixed(1)} Hz (medium)`;
    else suggestedLfoRate = `${(lfoRate).toFixed(1)} Hz (fast)`;
  }

  return {
    hasLfo,
    hasTremolo,
    hasVibrato,
    hasChorus,
    lfoRate: lfoRate > 0 ? parseFloat(lfoRate.toFixed(2)) : null,
    tremoloDepth: hasTremolo ? tremoloDepth : 0,
    suggestedLfoRate,
    suggestedVibratoDepth: hasVibrato ? 'Subtle (5-15 cents)' : 'N/A',
    suggestedChorusAmount: hasChorus ? 'Light chorus (10-30%)' : 'N/A'
  };
}

// =============================================================================
// Waveform Type Detection
// =============================================================================

function detectWaveformType(channelData, sampleRate, attackTimeMs) {
  const fftSize = 4096;

  // Skip past the attack transient to analyze the sustained portion
  const attackSamples = attackTimeMs ? Math.floor((attackTimeMs / 1000) * sampleRate) : 0;
  const safetyMargin = Math.floor(sampleRate * 0.01); // 10ms extra past attack
  const baseOffset = Math.max(0, Math.min(attackSamples + safetyMargin, channelData.length - fftSize));

  // Multi-window averaging: analyze 3-4 windows and average harmonic profiles
  const availableSamples = channelData.length - baseOffset;
  const numWindows = Math.min(4, Math.max(1, Math.floor(availableSamples / fftSize)));

  // Lower fundamental search range to 30 Hz for kick detection
  const minBin = Math.floor(30 * fftSize / sampleRate);
  const maxBin = Math.floor(2000 * fftSize / sampleRate);

  // Accumulate harmonic amplitudes across all windows
  let totalFundamentalFreq = 0;
  const accumulatedHarmonics = new Array(8).fill(0);
  let validWindows = 0;

  for (let w = 0; w < numWindows; w++) {
    const offset = baseOffset + w * fftSize;
    if (offset + fftSize > channelData.length) break;

    const windowData = channelData.slice(offset, offset + fftSize);
    const magnitudes = computeMagnitudeSpectrum(windowData, fftSize);

    // Find fundamental frequency in this window
    let fundamentalBin = minBin;
    let maxMag = 0;
    for (let i = minBin; i < maxBin; i++) {
      if (magnitudes[i] > maxMag) {
        maxMag = magnitudes[i];
        fundamentalBin = i;
      }
    }

    if (maxMag === 0) continue;

    totalFundamentalFreq += fundamentalBin * sampleRate / fftSize;

    // Analyze first 8 harmonics for this window
    for (let h = 1; h <= 8; h++) {
      const harmonicBin = Math.round(fundamentalBin * h);
      if (harmonicBin >= magnitudes.length) break;

      const searchRange = 3;
      let peakMag = 0;
      for (let i = harmonicBin - searchRange; i <= harmonicBin + searchRange; i++) {
        if (i >= 0 && i < magnitudes.length && magnitudes[i] > peakMag) {
          peakMag = magnitudes[i];
        }
      }
      accumulatedHarmonics[h - 1] += peakMag / maxMag;
    }
    validWindows++;
  }

  if (validWindows === 0) return null;

  // Average across windows
  const fundamentalFreq = totalFundamentalFreq / validWindows;
  const harmonicAmplitudes = accumulatedHarmonics.map(v => v / validWindows);

  // Ideal waveform patterns
  const patterns = {
    sine: [1, 0.1, 0.05, 0.02, 0.01, 0.01, 0.01, 0.01],
    saw: [1, 0.5, 0.33, 0.25, 0.2, 0.17, 0.14, 0.125],
    square: [1, 0.1, 0.33, 0.1, 0.2, 0.1, 0.14, 0.1],
    triangle: [1, 0.1, 0.11, 0.05, 0.04, 0.03, 0.02, 0.015],
    pulse: [1, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2]
  };

  // Calculate similarity scores
  const scores = {};
  for (const [type, pattern] of Object.entries(patterns)) {
    let error = 0;
    for (let i = 0; i < Math.min(harmonicAmplitudes.length, pattern.length); i++) {
      error += Math.pow(harmonicAmplitudes[i] - pattern[i], 2);
    }
    scores[type] = Math.max(0, Math.round((1 - error / 4) * 100));
  }

  // Find best match
  let bestType = 'complex';
  let bestScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  // If no good match, label as complex
  if (bestScore < 40) bestType = 'complex';

  const descriptions = {
    sine: 'Pure tone with minimal harmonics',
    saw: 'Bright, buzzy with all harmonics',
    square: 'Hollow, reedy with odd harmonics only',
    triangle: 'Soft, mellow with weak harmonics',
    pulse: 'Nasal, rich in harmonics',
    complex: 'Complex waveform with unique harmonic structure'
  };

  const recommendations = {
    sine: 'Use a sine oscillator - simplest waveform',
    saw: 'Use a sawtooth oscillator, possibly with detuned unison',
    square: 'Use a square/pulse oscillator',
    triangle: 'Use a triangle oscillator or filtered saw',
    pulse: 'Use a pulse oscillator with PWM',
    complex: 'Use wavetable synthesis or import as wavetable'
  };

  return {
    type: bestType,
    confidence: bestScore,
    fundamentalFreq: Math.round(fundamentalFreq),
    harmonicProfile: harmonicAmplitudes.map((amp, i) => ({
      harmonic: i + 1,
      amplitude: Math.round(amp * 100)
    })),
    description: descriptions[bestType],
    synthRecommendation: recommendations[bestType],
    scores: Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, Math.round(v)])
    )
  };
}

// =============================================================================
// Spectral Match Calculation
// =============================================================================

function calculateSpectralMatch(channelDataA, channelDataB, sampleRate) {
  const fftSize = 4096;
  const lengthA = Math.min(fftSize, channelDataA.length);
  const lengthB = Math.min(fftSize, channelDataB.length);

  const windowA = channelDataA.slice(0, lengthA);
  const windowB = channelDataB.slice(0, lengthB);

  const magA = computeMagnitudeSpectrum(windowA, fftSize);
  const magB = computeMagnitudeSpectrum(windowB, fftSize);

  // Normalize spectra
  const maxA = Math.max(...magA);
  const maxB = Math.max(...magB);
  const normA = magA.map(m => maxA > 0 ? m / maxA : 0);
  const normB = magB.map(m => maxB > 0 ? m / maxB : 0);

  // Overall correlation
  let dotProduct = 0;
  let normASum = 0;
  let normBSum = 0;
  for (let i = 0; i < normA.length; i++) {
    dotProduct += normA[i] * normB[i];
    normASum += normA[i] * normA[i];
    normBSum += normB[i] * normB[i];
  }
  const overallMatch = Math.round(
    (dotProduct / (Math.sqrt(normASum) * Math.sqrt(normBSum) + 0.0001)) * 100
  );

  // Band-by-band comparison
  const bands = {
    subBass: { min: 20, max: 60 },
    bass: { min: 60, max: 250 },
    lowMid: { min: 250, max: 500 },
    mid: { min: 500, max: 2000 },
    highMid: { min: 2000, max: 6000 },
    high: { min: 6000, max: 20000 }
  };

  const freqResolution = sampleRate / fftSize;
  const bandDifferences = {};
  const eqSuggestions = [];

  for (const [band, range] of Object.entries(bands)) {
    const minBin = Math.floor(range.min / freqResolution);
    const maxBin = Math.min(Math.floor(range.max / freqResolution), normA.length - 1);

    let sumA = 0, sumB = 0;
    for (let i = minBin; i <= maxBin; i++) {
      sumA += normA[i];
      sumB += normB[i];
    }

    const avgA = sumA / (maxBin - minBin + 1);
    const avgB = sumB / (maxBin - minBin + 1);
    const diff = avgA - avgB;
    const similarity = Math.max(0, Math.round((1 - Math.abs(diff) * 2) * 100));

    bandDifferences[band] = {
      similarity,
      targetLevel: avgA.toFixed(4),
      currentLevel: avgB.toFixed(4),
      difference: diff.toFixed(4)
    };

    // Generate EQ suggestions
    if (similarity < 70) {
      const action = diff > 0 ? 'boost' : 'cut';
      const amount = Math.round(Math.abs(diff) * 100);
      eqSuggestions.push({
        band,
        action,
        amount,
        freqRange: `${range.min}-${range.max} Hz`
      });
    }
  }

  // Generate verdict
  let verdict = '';
  if (overallMatch >= 85) verdict = 'Excellent match! Very similar spectral content.';
  else if (overallMatch >= 70) verdict = 'Good match. Minor adjustments needed.';
  else if (overallMatch >= 50) verdict = 'Moderate match. Consider EQ adjustments.';
  else verdict = 'Low match. Significant spectral differences.';

  return {
    overallMatch,
    bandDifferences,
    eqSuggestions,
    verdict
  };
}

// =============================================================================
// Frequency Band Analysis
// =============================================================================

function analyzeFrequencyBands(channelData, sampleRate) {
  const fftSize = 4096;
  const freqResolution = sampleRate / fftSize;

  // Analyze multiple windows spread across the audio to capture evolving timbre
  // (e.g., filter sweeps, slow attacks). Old approach only used the first ~93ms.
  const numWindows = Math.min(6, Math.max(1, Math.floor(channelData.length / fftSize)));
  const hopSize = numWindows > 1
    ? Math.floor((channelData.length - fftSize) / (numWindows - 1))
    : 0;

  const bandDefs = {
    subBass: { min: 20, max: 60 },
    bass: { min: 60, max: 250 },
    lowMid: { min: 250, max: 500 },
    mid: { min: 500, max: 2000 },
    highMid: { min: 2000, max: 6000 },
    high: { min: 6000, max: 20000 }
  };

  // Accumulate energy across all windows
  const bandTotals = {};
  for (const name of Object.keys(bandDefs)) bandTotals[name] = 0;
  let grandTotalEnergy = 0;

  for (let w = 0; w < numWindows; w++) {
    const offset = w * hopSize;
    const windowData = channelData.slice(offset, offset + fftSize);
    // For short audio, zero-pad the last window instead of skipping
    if (windowData.length < fftSize) {
      if (windowData.length < 256) break; // Too short to be meaningful
      const padded = new Float32Array(fftSize);
      padded.set(windowData);
      const magnitudes = computeMagnitudeSpectrum(padded, fftSize);
      for (let i = 0; i < magnitudes.length; i++) {
        const freq = i * freqResolution;
        const mag = magnitudes[i] * magnitudes[i];
        grandTotalEnergy += mag;
        for (const [name, def] of Object.entries(bandDefs)) {
          if (freq >= def.min && freq < def.max) { bandTotals[name] += mag; break; }
        }
      }
      break;
    }

    const magnitudes = computeMagnitudeSpectrum(windowData, fftSize);

    for (let i = 0; i < magnitudes.length; i++) {
      const freq = i * freqResolution;
      const mag = magnitudes[i] * magnitudes[i];
      grandTotalEnergy += mag;

      for (const [name, def] of Object.entries(bandDefs)) {
        if (freq >= def.min && freq < def.max) {
          bandTotals[name] += mag;
          break;
        }
      }
    }
  }

  const result = {};
  for (const name of Object.keys(bandDefs)) {
    result[name] = grandTotalEnergy > 0 ? bandTotals[name] / grandTotalEnergy : 0;
  }

  return result;
}

// =============================================================================
// Envelope Analysis
// =============================================================================

function analyzeEnvelope(channelData, sampleRate) {
  const windowSize = Math.floor(sampleRate * 0.01); // 10ms windows
  const numWindows = Math.floor(channelData.length / windowSize);

  if (numWindows < 10) return { isPercussive: false, decayTime: 0, sustainLevel: 0 };

  const envelope = [];
  for (let i = 0; i < numWindows; i++) {
    const start = i * windowSize;
    let max = 0;
    for (let j = 0; j < windowSize; j++) {
      max = Math.max(max, Math.abs(channelData[start + j]));
    }
    envelope.push(max);
  }

  const maxEnvelope = Math.max(...envelope);
  if (maxEnvelope === 0) return { isPercussive: false, decayTime: 0, sustainLevel: 0 };

  const normalized = envelope.map(v => v / maxEnvelope);

  // Find peak
  let peakIndex = 0;
  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i] === 1) {
      peakIndex = i;
      break;
    }
  }

  // Sustain level (average in middle portion) — compute FIRST, needed for isPercussive
  const middleStart = Math.floor(normalized.length * 0.4);
  const middleEnd = Math.floor(normalized.length * 0.6);
  let sustainSum = 0;
  for (let i = middleStart; i < middleEnd; i++) {
    sustainSum += normalized[i];
  }
  const sustainLevel = sustainSum / (middleEnd - middleStart);

  // Is percussive: peak in first 20% AND sound decays significantly after peak
  // A pad/lead peaks early (fast attack) but sustains — that's NOT percussive
  const peakEarly = peakIndex < normalized.length * 0.2;
  const isPercussive = peakEarly && sustainLevel < 0.4;

  // Decay time (time to reach 30% of peak — 50% was too close to sustain for many sounds)
  let decayIndex = peakIndex;
  for (let i = peakIndex; i < normalized.length; i++) {
    if (normalized[i] < 0.3) {
      decayIndex = i;
      break;
    }
  }
  // If we never dropped below 30%, decayTime = entire remaining duration (sustained)
  const decayTime = decayIndex === peakIndex
    ? ((normalized.length - peakIndex) * windowSize / sampleRate) * 1000
    : ((decayIndex - peakIndex) * windowSize / sampleRate) * 1000;

  return { isPercussive, decayTime: Math.round(decayTime), sustainLevel: Math.round(sustainLevel * 100) };
}

// =============================================================================
// Spectral Flux - Measures how much the spectrum changes between frames
// =============================================================================

function analyzeSpectralFlux(channelData, _sampleRate) {
  const windowSize = 2048;
  const hopSize = 512;
  const numWindows = Math.floor((channelData.length - windowSize) / hopSize);

  if (numWindows < 3) return 0;

  let previousMagnitudes = null;
  let fluxSum = 0;
  let fluxCount = 0;

  for (let w = 0; w < Math.min(numWindows, 30); w++) {
    const start = w * hopSize;
    const windowData = channelData.slice(start, start + windowSize);
    const magnitudes = computeMagnitudeSpectrum(windowData, windowSize);

    if (previousMagnitudes) {
      let flux = 0;
      for (let i = 0; i < magnitudes.length; i++) {
        const diff = magnitudes[i] - previousMagnitudes[i];
        if (diff > 0) flux += diff; // Only positive differences (onsets)
      }
      fluxSum += flux;
      fluxCount++;
    }
    previousMagnitudes = magnitudes;
  }

  return fluxCount > 0 ? fluxSum / fluxCount / 1000 : 0; // Normalize
}

// =============================================================================
// Crest Factor - Peak-to-RMS ratio (high = percussive)
// =============================================================================

function analyzeCrestFactor(channelData) {
  let peak = 0;
  let sumSquares = 0;

  for (let i = 0; i < channelData.length; i++) {
    const abs = Math.abs(channelData[i]);
    if (abs > peak) peak = abs;
    sumSquares += channelData[i] * channelData[i];
  }

  const rms = Math.sqrt(sumSquares / channelData.length);
  return rms > 0.001 ? peak / rms : 1;
}

// =============================================================================
// Temporal Centroid - Where the amplitude "center of gravity" sits (0-1)
// Kick drums: 0.05-0.20 (energy in first 5-20%)
// Bass synths: 0.30-0.50 (energy spread across duration)
// Pads: 0.40-0.60 (slow attack, sustained)
// =============================================================================

function analyzeTemporalCentroid(channelData, sampleRate) {
  const windowSize = Math.floor(sampleRate * 0.005); // 5ms windows for fine resolution
  const numWindows = Math.floor(channelData.length / windowSize);
  if (numWindows < 4) return 0.5;

  // Compute RMS energy per window
  const energies = new Float32Array(numWindows);
  let totalEnergy = 0;
  for (let i = 0; i < numWindows; i++) {
    const start = i * windowSize;
    let sum = 0;
    for (let j = 0; j < windowSize && start + j < channelData.length; j++) {
      sum += channelData[start + j] * channelData[start + j];
    }
    energies[i] = Math.sqrt(sum / windowSize);
    totalEnergy += energies[i];
  }

  if (totalEnergy === 0) return 0.5;

  // Temporal centroid = weighted average of time positions
  let weightedSum = 0;
  for (let i = 0; i < numWindows; i++) {
    weightedSum += energies[i] * (i / numWindows);
  }

  return weightedSum / totalEnergy;
}

// =============================================================================
// Pitch Envelope - Track fundamental frequency over first 100ms
// Kick drums: pitch DROPS rapidly (150Hz → 50Hz in 30-80ms)
// Bass/lead/pad: pitch is STABLE (stays within ±10%)
// Returns: { isStable, sweepRatio, fundamentalHz }
// =============================================================================

function analyzePitchEnvelope(channelData, sampleRate) {
  // Analyze in overlapping 10ms windows across the first 150ms
  const windowSize = Math.floor(sampleRate * 0.015); // 15ms windows (need enough cycles for low frequencies)
  const hopSize = Math.floor(sampleRate * 0.005); // 5ms hop
  const analysisLength = Math.min(channelData.length, Math.floor(sampleRate * 0.15)); // First 150ms
  const numWindows = Math.floor((analysisLength - windowSize) / hopSize);

  if (numWindows < 3) return { isStable: true, sweepRatio: 1.0, fundamentalHz: 0 };

  const pitches = [];

  for (let w = 0; w < numWindows; w++) {
    const offset = w * hopSize;
    const windowData = channelData.slice(offset, offset + windowSize);

    // Autocorrelation-based pitch detection
    // Search for fundamental from 30Hz to 500Hz
    const minLag = Math.floor(sampleRate / 500); // 500Hz
    const maxLag = Math.floor(sampleRate / 30);  // 30Hz
    const searchMax = Math.min(maxLag, windowData.length - 1);

    if (searchMax <= minLag) { pitches.push(0); continue; }

    // Compute normalized autocorrelation
    let bestLag = 0;
    let bestCorr = -1;
    let energy = 0;
    for (let i = 0; i < windowData.length; i++) energy += windowData[i] * windowData[i];
    if (energy < 1e-8) { pitches.push(0); continue; }

    for (let lag = minLag; lag <= searchMax; lag++) {
      let corr = 0;
      let e1 = 0, e2 = 0;
      const len = windowData.length - lag;
      for (let i = 0; i < len; i++) {
        corr += windowData[i] * windowData[i + lag];
        e1 += windowData[i] * windowData[i];
        e2 += windowData[i + lag] * windowData[i + lag];
      }
      const norm = Math.sqrt(e1 * e2);
      if (norm > 0) corr /= norm;
      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }

    // Only accept pitch if autocorrelation is strong enough (pitched sound)
    if (bestCorr > 0.5 && bestLag > 0) {
      pitches.push(sampleRate / bestLag);
    } else {
      pitches.push(0); // Unpitched/noisy window
    }
  }

  // Filter out zero/noisy readings
  const validPitches = pitches.filter(p => p > 0);
  if (validPitches.length < 2) return { isStable: true, sweepRatio: 1.0, fundamentalHz: 0 };

  // Compare early pitch vs late pitch
  const earlyPitches = validPitches.slice(0, Math.ceil(validPitches.length / 3));
  const latePitches = validPitches.slice(-Math.ceil(validPitches.length / 3));

  const earlyAvg = earlyPitches.reduce((a, b) => a + b, 0) / earlyPitches.length;
  const lateAvg = latePitches.reduce((a, b) => a + b, 0) / latePitches.length;

  if (lateAvg === 0 || earlyAvg === 0) return { isStable: true, sweepRatio: 1.0, fundamentalHz: earlyAvg || lateAvg };

  const sweepRatio = earlyAvg / lateAvg; // >1.5 means pitch dropped significantly (kick characteristic)
  const isStable = sweepRatio > 0.8 && sweepRatio < 1.2; // Within ±20% = stable pitch

  return {
    isStable,
    sweepRatio,
    fundamentalHz: validPitches.reduce((a, b) => a + b, 0) / validPitches.length
  };
}

// =============================================================================
// MFCCs (Mel-Frequency Cepstral Coefficients) - 13 coefficients
// The #1 feature for timbre discrimination in all audio ML research.
// Captures the spectral envelope shape in a perceptually-weighted representation.
// Also returns spectral contrast (peak-to-valley ratio across mel bands).
// =============================================================================

function computeMFCCs(channelData, sampleRate) {
  const fftSize = 2048;
  const numMelBands = 26; // Standard for 13 MFCCs
  const numCoeffs = 13;

  // Analyze multiple windows and average for stability
  const numWindows = Math.min(6, Math.max(1, Math.floor(channelData.length / fftSize)));
  const hopSize = numWindows > 1 ? Math.floor((channelData.length - fftSize) / (numWindows - 1)) : 0;

  const mfccAccumulator = new Float32Array(numCoeffs);
  const contrastAccumulator = new Float32Array(numMelBands);
  let windowCount = 0;

  // Pre-compute mel filterbank
  const melFilters = createMelFilterbank(numMelBands, fftSize, sampleRate);

  for (let w = 0; w < numWindows; w++) {
    const offset = w * hopSize;
    let windowData;
    if (offset + fftSize <= channelData.length) {
      windowData = channelData.slice(offset, offset + fftSize);
    } else {
      windowData = new Float32Array(fftSize);
      windowData.set(channelData.slice(offset, Math.min(offset + fftSize, channelData.length)));
    }

    if (windowData.length < fftSize) continue;

    // Get magnitude spectrum
    const magnitudes = computeMagnitudeSpectrum(windowData, fftSize);

    // Apply mel filterbank
    const melEnergies = new Float32Array(numMelBands);
    for (let m = 0; m < numMelBands; m++) {
      let energy = 0;
      let peakVal = 0;
      let valleyVal = Infinity;
      for (let i = melFilters[m].startBin; i < melFilters[m].endBin && i < magnitudes.length; i++) {
        const weighted = magnitudes[i] * melFilters[m].weights[i - melFilters[m].startBin];
        energy += weighted * weighted;
        peakVal = Math.max(peakVal, magnitudes[i]);
        if (magnitudes[i] > 0) valleyVal = Math.min(valleyVal, magnitudes[i]);
      }
      melEnergies[m] = Math.max(energy, 1e-10); // Floor to avoid log(0)

      // Spectral contrast: ratio of peak to valley (higher = more harmonic)
      if (valleyVal === Infinity || valleyVal === 0) valleyVal = 1e-10;
      contrastAccumulator[m] += Math.log10(peakVal / valleyVal);
    }

    // Apply log
    for (let m = 0; m < numMelBands; m++) {
      melEnergies[m] = Math.log(melEnergies[m]);
    }

    // DCT (Type-II) to get MFCCs
    for (let k = 0; k < numCoeffs; k++) {
      let sum = 0;
      for (let m = 0; m < numMelBands; m++) {
        sum += melEnergies[m] * Math.cos(Math.PI * k * (m + 0.5) / numMelBands);
      }
      mfccAccumulator[k] += sum;
    }

    windowCount++;
  }

  if (windowCount === 0) return { mfccs: new Float32Array(numCoeffs), spectralContrast: 0 };

  // Average across windows
  const mfccs = new Float32Array(numCoeffs);
  for (let k = 0; k < numCoeffs; k++) {
    mfccs[k] = mfccAccumulator[k] / windowCount;
  }

  // Average spectral contrast across bands and windows
  let totalContrast = 0;
  for (let m = 0; m < numMelBands; m++) {
    totalContrast += contrastAccumulator[m] / windowCount;
  }
  const spectralContrast = totalContrast / numMelBands;

  return { mfccs, spectralContrast };
}

/**
 * Create a mel filterbank for MFCC computation.
 * Maps linear frequency bins to mel-spaced triangular filters.
 */
function createMelFilterbank(numBands, fftSize, sampleRate) {
  const freqToMel = (f) => 2595 * Math.log10(1 + f / 700);
  const melToFreq = (m) => 700 * (Math.pow(10, m / 2595) - 1);

  const minMel = freqToMel(20);
  const maxMel = freqToMel(sampleRate / 2);
  const freqResolution = sampleRate / fftSize;

  // Mel-spaced center frequencies
  const melPoints = [];
  for (let i = 0; i <= numBands + 1; i++) {
    melPoints.push(melToFreq(minMel + (maxMel - minMel) * i / (numBands + 1)));
  }

  const filters = [];
  for (let m = 0; m < numBands; m++) {
    const startFreq = melPoints[m];
    const centerFreq = melPoints[m + 1];
    const endFreq = melPoints[m + 2];

    const startBin = Math.max(0, Math.floor(startFreq / freqResolution));
    const endBin = Math.min(fftSize / 2, Math.ceil(endFreq / freqResolution));

    const weights = new Float32Array(endBin - startBin);
    for (let i = startBin; i < endBin; i++) {
      const freq = i * freqResolution;
      if (freq < centerFreq) {
        weights[i - startBin] = (centerFreq - startFreq) > 0 ? (freq - startFreq) / (centerFreq - startFreq) : 0;
      } else {
        weights[i - startBin] = (endFreq - centerFreq) > 0 ? (endFreq - freq) / (endFreq - centerFreq) : 0;
      }
    }

    filters.push({ startBin, endBin, weights });
  }

  return filters;
}

// =============================================================================
// Instrument Detection
// =============================================================================

function detectInstruments(channelData, sampleRate) {
  const bands = analyzeFrequencyBands(channelData, sampleRate);
  const envelope = analyzeEnvelope(channelData, sampleRate);
  const attackTime = findAttackTime(channelData, sampleRate);
  const spectralFlux = analyzeSpectralFlux(channelData, sampleRate);
  const crestFactor = analyzeCrestFactor(channelData);
  const temporalCentroid = analyzeTemporalCentroid(channelData, sampleRate);
  const pitchEnvelope = analyzePitchEnvelope(channelData, sampleRate);
  const { mfccs, spectralContrast } = computeMFCCs(channelData, sampleRate);

  // Calculate harmonicity from zero crossing rate
  let zeroCrossings = 0;
  for (let i = 1; i < channelData.length; i++) {
    if ((channelData[i] >= 0) !== (channelData[i - 1] >= 0)) zeroCrossings++;
  }
  const harmonicity = 1 - Math.min((zeroCrossings / channelData.length) * 50, 1);

  // Initialize scores for all instruments
  const scores = {
    kick: 0,
    bass: 0,
    'sub-bass': 0,
    lead: 0,
    pad: 0,
    pluck: 0,
    guitar: 0,
    strings: 0,
    brass: 0,
    woodwind: 0,
    vocal: 0
  };

  // Precompute energy ratios used by multiple instruments
  const lowEnergy = bands.subBass + bands.bass;
  const midEnergy = bands.mid + bands.highMid;
  const broadEnergy = bands.lowMid + bands.mid + bands.highMid;
  // Spectral spread: how evenly energy is distributed across bands (0 = concentrated, 1 = even)
  const bandValues = [bands.subBass, bands.bass, bands.lowMid, bands.mid, bands.highMid, bands.high];
  const maxBand = Math.max(...bandValues);
  const spectralSpread = maxBand > 0 ? 1 - (maxBand - (1 / 6)) : 0;
  // Precomputed MFCC-derived features used across multiple instruments
  const mfcc34variance = Math.abs(mfccs[3]) + Math.abs(mfccs[4]); // Inharmonicity/complexity indicator

  // ===== ADVANCED FEATURES: temporal centroid, pitch envelope, MFCCs, spectral contrast =====
  // These features dramatically improve discrimination between similar instruments.
  // - temporalCentroid: 0-1, where amplitude energy is concentrated (kick=0.05-0.15, bass=0.25-0.50)
  // - pitchEnvelope.sweepRatio: >1.5 = pitch drops (kick), ~1.0 = stable pitch (bass/lead/pad)
  // - pitchEnvelope.isStable: true = pitched instrument, false = pitch sweeps or noise
  // - spectralContrast: high = harmonic (clear peaks), low = noisy/breathy
  //
  // MFCC coefficients (13 values from DCT of log mel-filterbank energies):
  // - mfccs[0]: Overall spectral energy/loudness — high for dense sounds (pads, chords), lower for thin sounds
  // - mfccs[1]: Spectral slope/tilt — negative = energy concentrated low (bass/kick), positive = brighter (lead/vocal/hi-hat)
  // - mfccs[2]: Spectral shape — high magnitude = peaky/narrow spectrum (pluck, lead), low = smooth/broad (pad)
  // - mfccs[3]: Fine timbre detail — helps separate vocal formants from instrument harmonics
  // - mfccs[4+]: Increasingly fine spectral detail, less useful for broad categories
  //
  // Key MFCC-based discriminations:
  // - Kick vs Bass: kick has near-zero mfccs[1] (flat/noisy), bass has negative mfccs[1] (low-concentrated)
  // - Pad vs Lead: pad has low |mfccs[2]| (smooth), lead has high |mfccs[2]| (peaky harmonics)
  // - Guitar vs Synth: guitar has higher mfccs[3-4] variance (inharmonic partials)
  // - Vocal vs Instrument: vocals have distinctive mfccs[3-4] from formant structure

  // KICK - sub-bass dominant, percussive, VERY fast decay, low sustain, noise-like, PITCH SWEEPS DOWN
  // The pitch envelope is the single most reliable kick identifier — kicks sweep from ~150Hz to ~50Hz.
  // CRITICAL: A bass LINE (sequence of bass notes) can look percussive because each note has a fast attack.
  // The key differentiators: kicks have pitch SWEEPS (not stable pitch), kicks are NOISE-like (low harmonicity),
  // and kicks are SINGLE hits (not sequences of notes with harmonic content).
  scores.kick += bands.subBass * 3;
  scores.kick += bands.bass * 2;
  scores.kick += envelope.isPercussive ? 2 : 0; // Reduced from 3 — pluck bass also triggers isPercussive
  // Decay time: kicks die fast — but require VERY fast (<80ms) for full bonus
  scores.kick += envelope.decayTime < 80 ? 4 : envelope.decayTime < 150 ? 2 : envelope.decayTime < 300 ? 0.5 : 0;
  scores.kick += crestFactor > 8 ? 2 : crestFactor > 5 ? 1 : 0;
  scores.kick += envelope.sustainLevel < 15 ? 2.5 : envelope.sustainLevel < 25 ? 1 : 0;
  // Pitch envelope — THE most reliable kick feature. Kicks sweep pitch down.
  scores.kick += pitchEnvelope.sweepRatio > 2.0 ? 5 : pitchEnvelope.sweepRatio > 1.5 ? 3.5 : pitchEnvelope.sweepRatio > 1.2 ? 1.5 : 0;
  scores.kick -= pitchEnvelope.isStable ? 4 : 0; // Stable pitch = NOT a kick (increased from 3)
  // Temporal centroid — kicks have energy concentrated at the very start
  scores.kick += temporalCentroid < 0.10 ? 3 : temporalCentroid < 0.18 ? 1.5 : 0;
  scores.kick -= temporalCentroid > 0.35 ? 3 : temporalCentroid > 0.25 ? 1.5 : 0;
  // Low spectral contrast = noise-like transient (kick). High = harmonic (bass note).
  scores.kick += spectralContrast < 0.5 ? 1.5 : 0;
  scores.kick -= spectralContrast > 1.5 ? 2.5 : spectralContrast > 1.0 ? 1.5 : 0; // Increased penalty for harmonic content
  // MFCC: Kicks have near-zero mfccs[1] (flat/noisy spectrum, no spectral tilt)
  // and low mfccs[0] (short, not energy-dense). High mfccs[1] = pitched instrument, not kick.
  scores.kick += mfccs[1] > -2 && mfccs[1] < 2 ? 2 : 0; // Near-zero slope = noise-like
  scores.kick -= mfccs[1] < -5 ? 3 : mfccs[1] < -3 ? 1.5 : 0; // Strong low-tilt = bass note, not kick (increased)
  scores.kick += mfccs[0] < -5 ? 1.5 : 0; // Low overall energy = short transient
  scores.kick -= bands.mid * 1.5;
  scores.kick -= bands.highMid * 1.5;
  scores.kick -= envelope.sustainLevel > 50 ? 2 : 0;
  scores.kick -= harmonicity > 0.5 ? 4 : harmonicity > 0.3 ? 2 : 0; // Increased — harmonicity is a killer for kicks
  scores.kick -= broadEnergy > 0.25 ? 2 : 0;
  scores.kick -= envelope.sustainLevel > 40 ? 2 : 0;
  scores.kick -= envelope.decayTime > 300 ? 2.5 : envelope.decayTime > 200 ? 1.5 : 0;

  // SUB-BASS - sub-bass dominant, sustained, not percussive, concentrated low energy, STABLE PITCH
  scores['sub-bass'] += bands.subBass * 5;
  scores['sub-bass'] += bands.bass * 1.5;
  scores['sub-bass'] += envelope.sustainLevel > 40 ? 2 : 0;
  scores['sub-bass'] += !envelope.isPercussive ? 2 : 0;
  scores['sub-bass'] += harmonicity > 0.3 ? 1.5 : 0;
  // Stable pitch confirms it's a note, not a kick
  scores['sub-bass'] += pitchEnvelope.isStable ? 2 : 0;
  scores['sub-bass'] -= !pitchEnvelope.isStable && pitchEnvelope.sweepRatio > 1.5 ? 3 : 0;
  // Later temporal centroid = sustained energy (not a transient)
  scores['sub-bass'] += temporalCentroid > 0.25 ? 1.5 : 0;
  scores['sub-bass'] -= temporalCentroid < 0.10 ? 2 : 0;
  // MFCC: Sub-bass has strongly negative mfccs[1] (all energy concentrated low)
  // and low |mfccs[2]| (simple spectral shape — pure sine-like sub fundamentals)
  scores['sub-bass'] += mfccs[1] < -4 ? 2 : mfccs[1] < -2 ? 1 : 0;
  scores['sub-bass'] += Math.abs(mfccs[2]) < 3 ? 1 : 0; // Simple spectral shape
  scores['sub-bass'] -= mfccs[1] > 0 ? 2 : 0; // Positive tilt = bright, not sub-bass
  scores['sub-bass'] -= bands.mid * 2;
  scores['sub-bass'] -= bands.highMid * 3;
  scores['sub-bass'] -= bands.high * 3;
  scores['sub-bass'] -= envelope.isPercussive ? 2 : 0;
  scores['sub-bass'] -= envelope.decayTime < 100 ? 2 : 0;
  scores['sub-bass'] -= broadEnergy > 0.2 ? 3 : broadEnergy > 0.1 ? 1.5 : 0;

  // BASS - bass dominant, pitched/harmonic, STABLE PITCH, later temporal centroid
  // Bass instruments are LOW-frequency focused — penalize heavily when mid/high energy competes.
  // CRITICAL: A bass LINE has plucky notes with fast attacks — isPercussive can trigger, but
  // the KEY differentiator from kick is: bass has HARMONIC content (clear pitch) and STABLE pitch.
  scores.bass += bands.bass * 4;
  scores.bass += bands.subBass * 2;
  scores.bass += bands.lowMid * 2;
  scores.bass += envelope.sustainLevel > 30 ? 2 : envelope.sustainLevel > 15 ? 1 : 0;
  scores.bass += !envelope.isPercussive ? 1.5 : 0; // Reduced from 2 — pluck bass CAN be percussive
  scores.bass += harmonicity > 0.5 ? 3.5 : harmonicity > 0.3 ? 2 : harmonicity > 0.15 ? 1 : 0; // Increased — harmonicity is the best bass identifier
  scores.bass += envelope.decayTime > 200 ? 2 : envelope.decayTime > 100 ? 1 : 0;
  // Stable pitch is THE bass identifier (vs kick which sweeps)
  scores.bass += pitchEnvelope.isStable ? 4 : 0; // Increased from 3 — stable pitch STRONGLY favors bass
  scores.bass -= pitchEnvelope.sweepRatio > 1.5 ? 3 : 0; // Pitch sweep = kick, not bass
  // Bass has energy spread over time, not concentrated at the start
  scores.bass += temporalCentroid > 0.20 ? 2 : temporalCentroid > 0.15 ? 1 : 0;
  scores.bass -= temporalCentroid < 0.08 ? 2 : 0; // Very early centroid = kick
  // High spectral contrast = harmonic content (bass notes have clear pitch)
  scores.bass += spectralContrast > 1.0 ? 2 : spectralContrast > 0.5 ? 1 : 0; // Increased
  // MFCC: Bass has strongly negative mfccs[1] (energy tilted low — THE key bass vs kick discriminator)
  // Bass notes produce a clear low-concentrated spectral slope; kicks are noise-like (near zero slope)
  scores.bass += mfccs[1] < -4 ? 3 : mfccs[1] < -2 ? 2 : 0; // Increased from 2.5/1.5
  scores.bass -= mfccs[1] > 0 ? 1.5 : 0; // Positive slope = bright instrument, not bass
  // Bass has moderate mfccs[0] (sustained energy but not as dense as pads/chords)
  scores.bass += (mfccs[0] > -8 && mfccs[0] < -2) ? 1 : 0;
  scores.bass -= bands.highMid * 2;
  scores.bass -= bands.high * 2;
  // Percussive penalty reduced — a pluck bass line triggers isPercussive but is still bass
  // The key differentiator is harmonicity + pitch stability, not percussiveness
  scores.bass -= (envelope.isPercussive && harmonicity < 0.3) ? 1.5 : 0; // Only penalize if ALSO low harmonicity (noise-like = kick)
  scores.bass -= envelope.decayTime < 80 ? 2 : envelope.decayTime < 100 ? 1 : 0; // Tightened — only very fast decay suggests kick
  scores.bass -= midEnergy > 0.15 ? 2.5 : midEnergy > 0.08 ? 1 : 0;
  // Broad harmonic content = chord/pad/lead, NOT bass. Bass has energy concentrated in low bands.
  // A sawtooth chord has harmonics all the way up — bass instruments don't.
  scores.bass -= broadEnergy > 0.25 ? 4 : broadEnergy > 0.15 ? 2.5 : broadEnergy > 0.08 ? 1 : 0;
  // If mid-range energy rivals bass energy, it's a chord/synth, not a bass
  scores.bass -= (midEnergy > lowEnergy * 0.5) ? 2 : 0;

  // LEAD - harmonic synth sound, fast attack, sustained, mid-range focus
  // Leads and pads are both synth sounds — lead has faster attack, more focused mid energy
  scores.lead += bands.mid * 4;
  scores.lead += bands.highMid * 3;
  scores.lead += bands.lowMid * 2.5;
  scores.lead += harmonicity > 0.5 ? 1.5 : 0;
  scores.lead -= envelope.isPercussive ? 1.5 : 0;
  scores.lead += attackTime < 100 ? 1.5 : attackTime < 200 ? 0.5 : 0;
  scores.lead -= crestFactor > 8 ? 1 : 0;
  if (lowEnergy > midEnergy * 3 && midEnergy < 0.05) scores.lead -= 2;
  scores.lead += spectralSpread > 0.6 ? 1.5 : spectralSpread > 0.4 ? 0.5 : 0;
  scores.lead += (envelope.sustainLevel > 40 && broadEnergy > 0.25) ? 2 : 0;
  // Leads have stable pitch and moderate temporal centroid (not too early like kick)
  scores.lead += pitchEnvelope.isStable ? 1 : 0;
  scores.lead += (temporalCentroid > 0.2 && temporalCentroid < 0.5) ? 1 : 0;
  // High spectral contrast = clear harmonics (leads have bright, defined harmonics)
  scores.lead += spectralContrast > 1.2 ? 1.5 : spectralContrast > 0.8 ? 0.5 : 0;
  // Broad harmonic energy with sustain is a synth sound (lead or pad territory, not bass/guitar)
  scores.lead += (broadEnergy > 0.15 && envelope.sustainLevel > 25) ? 1.5 : 0;
  // MFCC: Leads have high |mfccs[2]| (peaky, focused harmonics — not smooth like pads)
  // and positive or near-zero mfccs[1] (brighter spectral tilt than bass)
  scores.lead += Math.abs(mfccs[2]) > 5 ? 2 : Math.abs(mfccs[2]) > 3 ? 1 : 0;
  scores.lead += mfccs[1] > -2 ? 1 : 0; // Not strongly low-tilted (that's bass)
  scores.lead -= mfccs[1] < -5 ? 1.5 : 0; // Very low tilt = bass instrument

  // PAD - sustained, wide frequency spread, SMOOTH, broad harmonic content
  // Pads are the most common synth chord sound — sawtooth chords, detuned stacks, etc.
  // Key discriminators: broad energy (harmonics across spectrum), sustained, smooth spectral flux
  scores.pad += envelope.sustainLevel > 50 ? 2.5 : envelope.sustainLevel > 30 ? 1.5 : envelope.sustainLevel > 15 ? 0.5 : 0;
  scores.pad += attackTime > 200 ? 3 : attackTime > 100 ? 2 : attackTime > 50 ? 1 : attackTime > 20 ? 0.5 : 0;
  scores.pad += bands.lowMid * 2;
  scores.pad += bands.mid * 2;
  scores.pad += bands.highMid * 1;
  scores.pad -= envelope.isPercussive ? 3 : 0;
  scores.pad -= crestFactor > 5 ? 1 : 0;
  scores.pad -= spectralFlux > 0.15 ? 2 : spectralFlux > 0.08 ? 1.5 : spectralFlux > 0.05 ? 1 : 0;
  scores.pad += (spectralSpread > 0.6 && attackTime > 50) ? 2 : 0;
  scores.pad += (envelope.sustainLevel > 40 && broadEnergy > 0.2 && spectralFlux < 0.08) ? 2 : 0;
  scores.pad -= attackTime < 30 ? 2.5 : 0;
  scores.pad -= (harmonicity > 0.5 && attackTime < 50) ? 1.5 : 0;
  // Pads have late temporal centroid (slow attack, sustained body)
  scores.pad += temporalCentroid > 0.40 ? 2 : temporalCentroid > 0.30 ? 1 : 0;
  scores.pad -= temporalCentroid < 0.15 ? 2 : 0;
  // Pads are smoother — lower spectral contrast than leads/guitar
  scores.pad += (spectralContrast < 1.0 && envelope.sustainLevel > 40) ? 1.5 : 0;
  // KEY: Broad harmonic content is THE pad identifier — synth chords have harmonics everywhere
  // Bass instruments concentrate energy low; pads spread it across the spectrum
  scores.pad += broadEnergy > 0.25 ? 3 : broadEnergy > 0.15 ? 2 : broadEnergy > 0.08 ? 1 : 0;
  // Stable pitch + sustained = pad chord territory
  scores.pad += (pitchEnvelope.isStable && envelope.sustainLevel > 30) ? 1.5 : 0;
  // MFCC: Pads have low |mfccs[2]| (smooth, broad spectral shape — THE pad vs lead discriminator)
  // High mfccs[0] (dense spectral energy from multiple detuned oscillators/chords)
  scores.pad += Math.abs(mfccs[2]) < 3 ? 2 : Math.abs(mfccs[2]) < 5 ? 1 : 0;
  scores.pad -= Math.abs(mfccs[2]) > 7 ? 1.5 : 0; // Very peaky = lead, not pad
  scores.pad += mfccs[0] > -3 ? 1.5 : mfccs[0] > -5 ? 0.5 : 0; // Dense energy

  // PLUCK - percussive, fast decay, mid-range, NOT sustained, EARLY temporal centroid
  scores.pluck += envelope.isPercussive ? 3 : 0;
  scores.pluck += (envelope.isPercussive && envelope.decayTime < 500) ? 2 : 0;
  scores.pluck += bands.mid * 2;
  scores.pluck += bands.highMid * 1.5;
  scores.pluck += (crestFactor > 4 && crestFactor < 10) ? 1 : 0;
  scores.pluck += spectralFlux > 0.1 ? 0.5 : 0;
  scores.pluck -= envelope.sustainLevel > 50 ? 3 : envelope.sustainLevel > 35 ? 2 : 0;
  scores.pluck -= bands.subBass * 2;
  scores.pluck -= !envelope.isPercussive ? 3 : 0;
  // Plucks have early temporal centroid (sharp attack, quick decay)
  scores.pluck += temporalCentroid < 0.25 ? 1.5 : 0;
  // Plucks have stable pitch (unlike kicks)
  scores.pluck += pitchEnvelope.isStable ? 1 : 0;
  // MFCC: Plucks have high |mfccs[2]| (sharp spectral peak from the attack transient)
  // and moderate mfccs[1] (not strongly low-tilted like bass)
  scores.pluck += Math.abs(mfccs[2]) > 4 ? 1.5 : 0;
  scores.pluck += mfccs[1] > -3 ? 1 : 0; // Not bass-heavy

  // GUITAR - mid-range focus, body resonance, harmonic, transient-rich, HIGH spectral contrast
  // Guitar is distinguished from synth by: spectral flux (strumming transients), inharmonic partials
  scores.guitar += bands.mid * 3;
  scores.guitar += bands.lowMid * 2.5;
  scores.guitar += bands.highMid * 2;
  scores.guitar += bands.bass * 1.5;
  scores.guitar += attackTime < 80 ? 2 : attackTime < 150 ? 1 : 0;
  scores.guitar += spectralFlux > 0.12 ? 3 : spectralFlux > 0.08 ? 2 : spectralFlux > 0.05 ? 1 : 0;
  scores.guitar += harmonicity > 0.5 ? 1.5 : 0;
  scores.guitar -= envelope.isPercussive ? 2 : 0;
  scores.guitar -= bands.subBass * 3;
  scores.guitar -= envelope.sustainLevel > 80 ? 2 : 0;
  scores.guitar += (crestFactor > 3 && crestFactor < 8) ? 1 : 0;
  scores.guitar += (envelope.decayTime > 100 && envelope.decayTime < 2000) ? 1 : 0;
  scores.guitar -= spectralFlux < 0.04 ? 3 : spectralFlux < 0.06 ? 1.5 : 0;
  // Guitar strings produce slightly inharmonic partials → high spectral contrast
  scores.guitar += spectralContrast > 1.5 ? 2 : spectralContrast > 1.0 ? 1 : 0;
  // Stable pitch (not a drum/kick)
  scores.guitar += pitchEnvelope.isStable ? 1 : 0;
  // Synth chords have very broad, even harmonic energy — real guitars are more focused
  // High sustain + broad energy is a synth pad, not a guitar
  scores.guitar -= (broadEnergy > 0.2 && envelope.sustainLevel > 50) ? 3 : 0;
  scores.guitar -= (broadEnergy > 0.3) ? 2 : 0;
  // MFCC: Guitars have higher variance in mfccs[3-4] (inharmonic partials from string vibration)
  // and moderate mfccs[2] (more spectral complexity than a pure synth tone)
  // NOTE: mfcc34variance defined above in precomputed values section
  scores.guitar += mfcc34variance > 6 ? 2 : mfcc34variance > 3 ? 1 : 0;
  scores.guitar -= mfcc34variance < 1.5 ? 1 : 0; // Very clean harmonics = synth, not guitar

  // STRINGS - high-mid dominant, harmonic, moderate attack, sustained, NOT bass-heavy
  scores.strings += bands.highMid * 2.5;
  scores.strings += bands.mid * 1.5;
  scores.strings += harmonicity > 0.7 ? 2 : harmonicity > 0.5 ? 1 : 0;
  scores.strings += (attackTime > 30 && attackTime < 150) ? 1.5 : 0;
  scores.strings += envelope.sustainLevel > 40 ? 1.5 : 0;
  scores.strings -= envelope.isPercussive ? 2 : 0;
  scores.strings -= bands.subBass * 2.5;
  scores.strings -= bands.bass * 1.5;
  scores.strings -= crestFactor > 6 ? 1 : 0;
  if (bands.subBass + bands.bass > bands.mid + bands.highMid) scores.strings -= 3;
  // Strings have high spectral contrast (bowed harmonics) and stable pitch
  scores.strings += spectralContrast > 1.2 ? 1 : 0;
  scores.strings += pitchEnvelope.isStable ? 1 : 0;
  scores.strings += temporalCentroid > 0.30 ? 1 : 0; // Sustained bow strokes
  // MFCC: Strings have moderate mfcc34 variance (some inharmonicity from bow/vibrato but less than guitar)
  // and moderate mfccs[2] (richer spectral shape than pure synth, less than guitar)
  scores.strings += (mfcc34variance > 3 && mfcc34variance < 8) ? 1 : 0;
  scores.strings += (Math.abs(mfccs[2]) > 2 && Math.abs(mfccs[2]) < 6) ? 1 : 0;

  // BRASS - mid-range dominant, bright, fast attack, harmonic, NOT bass-heavy
  scores.brass += bands.mid * 2.5;
  scores.brass += bands.highMid * 2;
  scores.brass += harmonicity > 0.6 ? 1.5 : 0;
  scores.brass += attackTime < 50 ? 1.5 : attackTime < 100 ? 0.5 : 0;
  scores.brass -= bands.subBass * 4;
  scores.brass -= bands.bass * 3;
  scores.brass -= envelope.sustainLevel > 60 ? 1 : 0;
  scores.brass += spectralFlux > 0.15 ? 0.5 : 0;
  const brassLowEnergy = bands.subBass + bands.bass;
  const brassMidEnergy = bands.mid + bands.highMid;
  if (brassLowEnergy > brassMidEnergy) scores.brass -= 3;
  // Brass has very high spectral contrast (strong even harmonics) and stable pitch
  scores.brass += spectralContrast > 1.5 ? 1.5 : 0;
  scores.brass += pitchEnvelope.isStable ? 1 : 0;
  // MFCC: Brass has positive mfccs[1] (bright, energy tilted high from strong upper harmonics)
  // and high mfccs[0] (dense harmonic energy). Strong mfcc34 variance from rich overtone structure
  scores.brass += mfccs[1] > 0 ? 1.5 : 0; // Bright spectral tilt
  scores.brass -= mfccs[1] < -4 ? 2 : 0; // Low tilt = bass/sub, not brass
  scores.brass += mfcc34variance > 4 ? 1 : 0; // Rich overtone complexity

  // WOODWIND - high frequencies, harmonic, breathy, NOT bass-heavy
  scores.woodwind += bands.highMid * 2.5;
  scores.woodwind += bands.high * 1.5;
  scores.woodwind += bands.mid * 1;
  scores.woodwind += harmonicity > 0.6 ? 1.5 : 0;
  scores.woodwind += (attackTime > 20 && attackTime < 100) ? 1 : 0;
  scores.woodwind -= bands.subBass * 4;
  scores.woodwind -= bands.bass * 3;
  scores.woodwind -= envelope.isPercussive ? 1.5 : 0;
  if (bands.subBass + bands.bass > bands.highMid + bands.high) scores.woodwind -= 3;
  // Woodwinds have breathy quality — moderate spectral contrast (not as peaky as brass)
  scores.woodwind += (spectralContrast > 0.5 && spectralContrast < 1.5) ? 1 : 0;
  scores.woodwind += pitchEnvelope.isStable ? 1 : 0;
  // MFCC: Woodwinds have moderate positive mfccs[1] (bright but not as extreme as brass)
  // and moderate mfcc34 variance (breath noise adds spectral complexity but less than brass overtones)
  scores.woodwind += (mfccs[1] > -1 && mfccs[1] < 3) ? 1 : 0; // Moderate brightness
  scores.woodwind += (mfcc34variance > 2 && mfcc34variance < 6) ? 1 : 0; // Moderate complexity

  // VOCAL - mid-range focus, very harmonic, sustained, NOT bass-heavy
  scores.vocal += bands.mid * 2.5;
  scores.vocal += bands.highMid * 1.5;
  scores.vocal += harmonicity > 0.7 ? 2 : harmonicity > 0.5 ? 1 : 0;
  scores.vocal += (attackTime > 30 && attackTime < 200) ? 1.5 : 0;
  scores.vocal += envelope.sustainLevel > 35 ? 1 : 0;
  scores.vocal -= bands.subBass * 4;
  scores.vocal -= bands.bass * 2.5;
  scores.vocal -= envelope.isPercussive ? 2 : 0;
  scores.vocal -= crestFactor > 8 ? 1 : 0;
  if (bands.subBass + bands.bass > bands.mid + bands.highMid) scores.vocal -= 3;
  // Vocals have moderate spectral contrast and stable pitch
  scores.vocal += pitchEnvelope.isStable ? 1 : 0;
  scores.vocal += (temporalCentroid > 0.25 && temporalCentroid < 0.55) ? 1 : 0;
  // MFCC: Vocals have distinctive mfccs[3-4] from formant structure (vowel resonances)
  // High mfcc34 variance = formant peaks at specific frequencies (separates vocal from instruments)
  // Positive mfccs[1] (vocals are bright, especially with sibilance/consonants)
  scores.vocal += mfcc34variance > 5 ? 2 : mfcc34variance > 3 ? 1 : 0;
  scores.vocal += mfccs[1] > 0 ? 1 : 0; // Bright spectral tilt from voice
  // Low mfcc34 variance = clean synth/instrument harmonics, not a voice
  scores.vocal -= mfcc34variance < 2 ? 1.5 : 0;

  // Instrument profiles for confidence calculation
  // Lower thresholds to allow detection, filtering handles multiple results
  const instrumentProfiles = {
    kick: { minScore: 2.0, idealAttack: 5, idealBands: ['subBass', 'bass'] },
    bass: { minScore: 1.5, idealAttack: 20, idealBands: ['bass', 'subBass', 'lowMid'] },
    'sub-bass': { minScore: 1.0, idealAttack: 30, idealBands: ['subBass'] },
    lead: { minScore: 1.5, idealAttack: 30, idealBands: ['mid', 'highMid'] },
    pad: { minScore: 1.5, idealAttack: 150, idealBands: ['lowMid', 'mid', 'highMid'] },
    pluck: { minScore: 2.0, idealAttack: 10, idealBands: ['mid', 'highMid'] },
    guitar: { minScore: 2.0, idealAttack: 40, idealBands: ['mid', 'lowMid', 'highMid'] },
    strings: { minScore: 2.0, idealAttack: 80, idealBands: ['highMid', 'mid'] },
    brass: { minScore: 2.5, idealAttack: 40, idealBands: ['mid', 'highMid'] },
    woodwind: { minScore: 2.0, idealAttack: 50, idealBands: ['highMid', 'high'] },
    vocal: { minScore: 2.0, idealAttack: 100, idealBands: ['mid', 'highMid'] }
  };

  // Convert scores to detected instruments with confidence
  // Use RELATIVE scoring so confidence reflects how dominant each instrument is compared to the top.
  // A sound engineer hears one dominant instrument — the confidence should communicate that clearly.
  const detected = [];
  const maxScore = Math.max(...Object.values(scores), 1);
  for (const [instrument, score] of Object.entries(scores)) {
    const profile = instrumentProfiles[instrument];
    if (score >= profile.minScore) {
      // Relative confidence: top scorer gets ~90%, others scale proportionally
      // If pad scores 15 and bass scores 10, pad=90% and bass=60% (clear winner visible)
      const relativeRatio = score / maxScore; // 0 to 1
      // Map ratio to confidence: 1.0→90%, 0.7→63%, 0.5→45%, 0.3→27%
      const baseConfidence = Math.round(relativeRatio * 90);

      // Small bonus for attack time match (±5 max, not ±10)
      const attackDiff = Math.abs(attackTime - profile.idealAttack);
      const attackBonus = attackDiff < 30 ? 5 : attackDiff < 60 ? 2 : 0;

      // Small bonus for ideal band match (±5 max)
      const idealBandScore = profile.idealBands.reduce((sum, band) => sum + (bands[band] || 0), 0);
      const bandBonus = idealBandScore > 0.3 ? 5 : idealBandScore > 0.15 ? 2 : 0;

      const confidence = Math.min(95, Math.max(15, baseConfidence + attackBonus + bandBonus));

      detected.push({ instrument, confidence: Math.round(confidence), score });
    }
  }

  // Sort by score (raw) for accurate comparison
  detected.sort((a, b) => b.score - a.score);

  // Detect full mix using multiple indicators (before filtering)
  // IMPORTANT: If one instrument clearly dominates, skip full-mix detection entirely.
  // A synth chord naturally has some energy in bass + mid + highMid bands, which causes
  // multiple instruments to score positive — but that doesn't make it a "mix."
  let isFullMix = false;

  // Duration guard: short audio clips (≤10 seconds) are NEVER full mixes.
  // A 3-second synth chord or bass loop simply cannot be a "full mix" that needs stem separation.
  // This prevents false positives from rich harmonic sounds (sawtooth chords, layered synths)
  // that naturally produce energy across multiple frequency bands.
  const audioDurationSec = channelData.length / sampleRate;
  const isShortAudio = audioDurationSec <= 10;

  // Skip full-mix detection if top instrument is clearly dominant
  // Guitar specifically: broad spectrum (body + strings + presence) can falsely trigger
  // broad-spectrum detection, so treat a guitar winner as a clean winner at a lower threshold
  const topIsGuitar = detected.length > 0 && detected[0].instrument === 'guitar';
  const cleanWinnerThreshold = topIsGuitar ? 1.2 : 1.5;
  const hasCleanWinner = detected.length >= 2 && detected[0].score > detected[1].score * cleanWinnerThreshold;

  if (!isShortAudio && !hasCleanWinner) {
    // Method 1: Entropy-based detection — requires high entropy (scores very evenly spread)
    const totalScore = Object.values(scores).reduce((a, b) => a + Math.max(0, b), 0);
    if (totalScore > 0) {
      const normalizedScores = Object.values(scores).map(s => Math.max(0, s) / totalScore);
      const entropy = -normalizedScores
        .filter(s => s > 0)
        .reduce((sum, s) => sum + s * Math.log2(s), 0);
      const maxEntropy = Math.log2(Object.keys(scores).length);
      const normalizedEntropy = entropy / maxEntropy;

      // Raised from 0.5 to 0.7 — a single synth chord with harmonics across bands
      // reaches ~0.53 entropy; real mixes with kick+bass+lead+vocals reach 0.75+
      if (normalizedEntropy > 0.7 && detected.length >= 3) {
        // Guard: if all top-scoring instruments are harmonic/synth types, this is a rich
        // synth sound (sawtooth chord, layered pad) — not a mix. Real mixes include
        // kick/drums/vocal alongside harmonic content.
        const harmonicTypes = new Set(['pad', 'lead', 'bass', 'sub-bass', 'pluck', 'guitar', 'strings', 'keys', 'brass', 'woodwind']);
        const topThreeEntropy = detected.slice(0, 3);
        const allHarmonicEntropy = topThreeEntropy.length >= 2 && topThreeEntropy.every(d => harmonicTypes.has(d.instrument));
        if (!allHarmonicEntropy) {
          isFullMix = true;

        }
      }
    }

    // Method 2: Broad spectrum check - mixes have SIGNIFICANT energy across all ranges
    // Thresholds must be high enough that a single rich synth (sawtooth chord) doesn't trigger this.
    // Sawtooth chords have harmonic overtones in mid/highMid plus sub layers, so thresholds
    // need to be quite high. Real mixes have dedicated instruments in each range (kick/bass,
    // vocals/guitars in mid, cymbals/hats in high) producing much more balanced energy.
    if (!isFullMix) {
      const hasLow = bands.subBass > 0.2 || bands.bass > 0.2;
      const hasMid = bands.mid > 0.18 || bands.lowMid > 0.15;
      const hasHigh = bands.highMid > 0.15 || bands.high > 0.1;

      if (hasLow && hasMid && hasHigh) {
        // Guard: if ALL top scoring instruments are harmonic/pitched types, this is likely
        // a synth sound with wide harmonics, not a mix with distinct instruments.
        // Include guitar/strings because synth chords score them from band energy alone.
        // A real mix would include kick/drums/vocal — non-harmonic or non-pitched elements.
        const harmonicInstruments = new Set(['pad', 'lead', 'bass', 'sub-bass', 'pluck', 'guitar', 'strings', 'keys']);
        const topThree = detected.slice(0, 3);
        const allHarmonic = topThree.length >= 2 && topThree.every(d => harmonicInstruments.has(d.instrument));
        if (!allHarmonic) {
          isFullMix = true;

        }
      }
    }

    // Method 3: Multiple instruments detected with competitive scores
    // Only flag as full mix if 3+ instruments AND the top scores are close together
    // AND the instruments are from DIFFERENT families (not all synth-type)
    if (!isFullMix && detected.length >= 3) {
      const topScore = detected[0].score;
      const thirdScore = detected[2].score;
      // 3rd-place must be at least 65% of top score (raised from 60%)
      if (thirdScore >= topScore * 0.65) {
        // Guard: if top 3 are all synth-type instruments, it's a rich synth sound, not a mix
        // A sawtooth chord naturally scores pad/lead/bass/strings competitively — that's not a mix
        const synthTypes = new Set(['pad', 'lead', 'bass', 'sub-bass', 'pluck', 'keys', 'strings']);
        const topThree = detected.slice(0, 3);
        const allSynthType = topThree.every(d => synthTypes.has(d.instrument));
        if (!allSynthType) {
          isFullMix = true;
        }
      }
    }

    // Method 4: Check for typical mix characteristics
    // Requires percussive kick + bass + melodic content simultaneously
    if (!isFullMix) {
      const hasPercussiveKick = scores.kick > 3 && envelope.isPercussive;
      const hasBass = scores.bass > 2 || scores['sub-bass'] > 2;
      const hasMidContent = scores.lead > 2 || scores.pad > 2 || scores.pluck > 2 || scores.vocal > 2;

      if (hasPercussiveKick && hasBass && hasMidContent) {
        isFullMix = true;
      }
    }
  }

  // Apply filtering based on whether it's a full mix or isolated sound
  let filteredDetected = detected;

  // 1. Confidence floor: remove instruments with very low confidence
  // For full mixes, use lower threshold since scores are distributed
  const confidenceThreshold = isFullMix ? 15 : 20;
  filteredDetected = filteredDetected.filter(d => d.confidence >= confidenceThreshold);

  if (!isFullMix) {
    // For isolated sounds, apply aggressive filtering

    // 2. Score gap requirement: if top score is notably higher than #2, only show top
    if (filteredDetected.length >= 2) {
      const topScore = filteredDetected[0].score;
      const secondScore = filteredDetected[1].score;
      // If top instrument's score is 1.3x higher than second, it's clearly dominant
      if (topScore > secondScore * 1.3) {
        filteredDetected = [filteredDetected[0]];
      }
    }

    // 3. Single-sound detection: if one instrument has very high confidence (>70%),
    // it's likely an isolated sound - only show that one
    if (filteredDetected.length > 0 && filteredDetected[0].confidence > 70) {
      filteredDetected = [filteredDetected[0]];
    }

    // 4. Cap isolated sounds at 3 results max
    filteredDetected = filteredDetected.slice(0, 3);
  } else {
    // For full mixes, show all instruments that passed the minScore threshold
    // The minScore already filters out noise, so just limit count for UI clarity
    filteredDetected = filteredDetected.slice(0, 6);
  }

  // Re-sort by confidence for final display
  filteredDetected.sort((a, b) => b.confidence - a.confidence);

  // Remove the internal score property before returning
  const finalDetected = filteredDetected.map(({ instrument, confidence }) => ({ instrument, confidence }));

  // Count how many instruments passed minScore threshold (before any filtering)
  // This helps the UI detect "probable mix" even when one instrument dominates scoring
  const instrumentsAboveThreshold = detected.length;

  return { detected: finalDetected, isFullMix, instrumentsAboveThreshold, bands };
}

// =============================================================================
// Detect Harmonics
// =============================================================================

function detectHarmonics(channelData, sampleRate) {
  const fftSize = 8192;
  const windowData = channelData.slice(0, Math.min(fftSize, channelData.length));

  const magnitudes = computeMagnitudeSpectrum(windowData, fftSize);
  const freqResolution = sampleRate / fftSize;

  // Find peaks
  const peaks = [];
  const minBin = Math.floor(80 / freqResolution);
  const maxBin = Math.floor(8000 / freqResolution);

  for (let i = minBin + 1; i < Math.min(maxBin, magnitudes.length - 1); i++) {
    if (magnitudes[i] > magnitudes[i - 1] && magnitudes[i] > magnitudes[i + 1]) {
      const prominence = magnitudes[i] / ((magnitudes[i - 1] + magnitudes[i + 1]) / 2);
      if (prominence > 1.2) {
        peaks.push({
          bin: i,
          frequency: Math.round(i * freqResolution),
          amplitude: magnitudes[i],
          note: frequencyToNote(i * freqResolution)
        });
      }
    }
  }

  // Sort by amplitude
  peaks.sort((a, b) => b.amplitude - a.amplitude);

  // Normalize
  const maxAmp = peaks.length > 0 ? peaks[0].amplitude : 1;
  const normalizedPeaks = peaks.slice(0, 8).map(p => ({
    ...p,
    amplitude: p.amplitude / maxAmp
  }));

  return normalizedPeaks;
}

// =============================================================================
// Full Audio Feature Calculation
// =============================================================================

function calculateAudioFeatures(channelData, sampleRate, reportProgress) {
  const length = channelData.length;

  if (reportProgress) reportProgress(5, 'Calculating RMS...');

  // RMS calculation
  let sumSquares = 0;
  for (let i = 0; i < length; i++) {
    sumSquares += channelData[i] * channelData[i];
  }
  const rms = Math.sqrt(sumSquares / length);

  if (reportProgress) reportProgress(10, 'Calculating zero crossings...');

  // Zero crossing rate
  let zeroCrossings = 0;
  for (let i = 1; i < length; i++) {
    if ((channelData[i] >= 0 && channelData[i - 1] < 0) || (channelData[i] < 0 && channelData[i - 1] >= 0)) {
      zeroCrossings++;
    }
  }
  const zcr = zeroCrossings / length;

  if (reportProgress) reportProgress(15, 'Computing FFT...');

  // Spectral analysis using FFT — multi-window averaging for sounds with filter sweeps
  // Previously only analyzed first 4096 samples (~93ms at 44.1kHz), which missed
  // filter sweeps and timbral evolution entirely (e.g., a filter starting at 200Hz
  // would report brightness=0.03 even if it sweeps to 3500Hz mid-sound)
  const windowSize = Math.min(4096, length);
  const numSpectralWindows = Math.min(6, Math.max(1, Math.floor(length / windowSize)));
  const spectralHopSize = numSpectralWindows > 1
    ? Math.floor((length - windowSize) / (numSpectralWindows - 1))
    : 0;

  let totalCentroidBin = 0;
  let validSpectralWindows = 0;

  for (let w = 0; w < numSpectralWindows; w++) {
    const offset = w * spectralHopSize;
    if (offset + windowSize > length) break;

    const windowData = channelData.slice(offset, offset + windowSize);
    const magnitudes = computeMagnitudeSpectrum(windowData, windowSize);

    let weightedSum = 0;
    let sum = 0;
    for (let i = 0; i < magnitudes.length; i++) {
      weightedSum += magnitudes[i] * i;
      sum += magnitudes[i];
    }

    if (sum > 0) {
      totalCentroidBin += weightedSum / sum;
      validSpectralWindows++;
    }
  }

  const spectralCentroidBin = validSpectralWindows > 0 ? totalCentroidBin / validSpectralWindows : 0;
  const brightness = Math.min(1, spectralCentroidBin / (windowSize / 4));
  const frequencyResolution = sampleRate / windowSize;
  const spectralCentroidHz = spectralCentroidBin * frequencyResolution;

  if (reportProgress) reportProgress(20, 'Detecting attack...');
  const attackTime = findAttackTime(channelData, sampleRate);
  const harmonicity = 1 - Math.min(zcr * 50, 1);

  if (reportProgress) reportProgress(30, 'Detecting BPM...');
  const bpmResult = detectBPM(channelData, sampleRate);

  if (reportProgress) reportProgress(50, 'Detecting key...');
  const keyResult = detectKey(channelData, sampleRate);

  if (reportProgress) reportProgress(55, 'Calculating ADSR...');
  const adsrResult = calculateADSR(channelData, sampleRate);

  if (reportProgress) reportProgress(65, 'Detecting waveform type...');
  // Pass ADSR attack time so waveform detection skips the transient
  const waveform = detectWaveformType(channelData, sampleRate, adsrResult?.attack);

  if (reportProgress) reportProgress(75, 'Analyzing filter envelope...');
  const filterEnvelope = analyzeFilterEnvelope(channelData, sampleRate);

  if (reportProgress) reportProgress(85, 'Detecting modulation...');
  const modulation = detectModulation(channelData, sampleRate);

  if (reportProgress) reportProgress(100, 'Complete!');

  return {
    rms: rms.toFixed(3),
    brightness: brightness.toFixed(3),
    spectralCentroid: spectralCentroidHz.toFixed(1),
    harmonicity: harmonicity.toFixed(3),
    attackTime: attackTime.toFixed(3),
    bpm: bpmResult,
    key: keyResult,
    adsr: adsrResult,
    filterEnvelope,
    modulation,
    waveform
  };
}

// =============================================================================
// ML Feature Extraction
// =============================================================================

/**
 * Extract normalized features suitable for ML model input.
 * Returns a flat Float32Array for direct use with TensorFlow.js.
 */
function extractMLFeaturesFromAudio(channelData, sampleRate) {
  // Run all feature extractions
  const bands = analyzeFrequencyBands(channelData, sampleRate);
  const envelope = analyzeEnvelope(channelData, sampleRate);
  const waveform = detectWaveformType(channelData, sampleRate);
  const filterEnv = analyzeFilterEnvelope(channelData, sampleRate);
  const modulation = detectModulation(channelData, sampleRate);

  // Calculate basic spectral features
  const windowSize = Math.min(4096, channelData.length);
  const magnitudes = computeMagnitudeSpectrum(channelData.slice(0, windowSize), windowSize);

  let weightedSum = 0, sum = 0;
  for (let i = 0; i < magnitudes.length; i++) {
    weightedSum += magnitudes[i] * i;
    sum += magnitudes[i];
  }
  const spectralCentroidBin = sum > 0 ? weightedSum / sum : 0;
  const brightness = Math.min(1, spectralCentroidBin / (windowSize / 4));

  // RMS
  let sumSquares = 0;
  for (let i = 0; i < channelData.length; i++) {
    sumSquares += channelData[i] * channelData[i];
  }
  const rms = Math.sqrt(sumSquares / channelData.length);

  // Zero crossing rate for harmonicity
  let zeroCrossings = 0;
  for (let i = 1; i < channelData.length; i++) {
    if ((channelData[i] >= 0) !== (channelData[i - 1] >= 0)) zeroCrossings++;
  }
  const harmonicity = 1 - Math.min((zeroCrossings / channelData.length) * 50, 1);

  // Normalize helper functions
  const normalizeFreq = (f) => {
    const logMin = Math.log10(20);
    const logMax = Math.log10(20000);
    return Math.max(0, Math.min(1, (Math.log10(Math.max(f, 20)) - logMin) / (logMax - logMin)));
  };

  const normalizeTime = (ms, max) => Math.max(0, Math.min(1, ms / max));

  // Build feature vector (28 features total)
  const features = new Float32Array([
    // Spectral (3)
    brightness,
    normalizeFreq(spectralCentroidBin * (sampleRate / windowSize)),
    harmonicity,

    // Temporal (6)
    normalizeTime(envelope.attackTime || 0, 500),
    Math.tanh(rms * 2), // soft-clipped RMS
    normalizeTime(envelope.decayTime || 0, 1000),
    normalizeTime(envelope.decayTime || 0, 2000), // decay
    envelope.sustainLevel || 0,
    normalizeTime(envelope.releaseTime || 100, 3000),

    // Frequency bands (6)
    bands.subBass || 0,
    bands.bass || 0,
    bands.lowMid || 0,
    bands.mid || 0,
    bands.highMid || 0,
    bands.high || 0,

    // Waveform one-hot (6)
    waveform.type === 'sine' ? 1 : 0,
    waveform.type === 'saw' ? 1 : 0,
    waveform.type === 'square' ? 1 : 0,
    waveform.type === 'triangle' ? 1 : 0,
    waveform.type === 'pulse' ? 1 : 0,
    waveform.type === 'complex' ? 1 : 0,

    // Filter (3)
    normalizeFreq(filterEnv.cutoff || 1000),
    filterEnv.resonance || 0,
    filterEnv.sweepDirection === 'opening' ? 1 : filterEnv.sweepDirection === 'closing' ? -1 : 0,

    // Modulation (4)
    normalizeFreq(modulation.lfoRate || 0),
    modulation.tremolo || 0,
    modulation.vibrato || 0,
    modulation.chorus || 0
  ]);

  return {
    vector: Array.from(features), // Convert to regular array for postMessage
    length: features.length,
    featureNames: [
      'brightness', 'centroid', 'harmonicity',
      'attackTime', 'rms', 'attack', 'decay', 'sustain', 'release',
      'subBass', 'bass', 'lowMid', 'mid', 'highMid', 'high',
      'wf_sine', 'wf_saw', 'wf_square', 'wf_triangle', 'wf_pulse', 'wf_complex',
      'filterCutoff', 'resonance', 'sweepDir',
      'lfoRate', 'tremolo', 'vibrato', 'chorus'
    ],
    // Also return raw values for debugging
    raw: {
      brightness,
      rms,
      harmonicity,
      bands,
      waveformType: waveform.type,
      filterCutoff: filterEnv.cutoff,
      modulation
    }
  };
}

// =============================================================================
// Message Handler
// =============================================================================

self.onmessage = function(e) {
  const { type, payload, id } = e.data;

  try {
    let result;

    const reportProgress = (percent, status) => {
      self.postMessage({ type: 'PROGRESS', id, percent, status });
    };

    switch (type) {
      case 'ANALYZE_FULL':
        result = calculateAudioFeatures(
          new Float32Array(payload.channelData),
          payload.sampleRate,
          reportProgress
        );
        break;

      case 'DETECT_BPM':
        result = detectBPM(new Float32Array(payload.channelData), payload.sampleRate);
        break;

      case 'DETECT_KEY':
        result = detectKey(new Float32Array(payload.channelData), payload.sampleRate);
        break;

      case 'DETECT_INSTRUMENTS':
        result = detectInstruments(new Float32Array(payload.channelData), payload.sampleRate);
        break;

      case 'SPECTRAL_MATCH':
        result = calculateSpectralMatch(
          new Float32Array(payload.channelDataA),
          new Float32Array(payload.channelDataB),
          payload.sampleRate
        );
        break;

      case 'DETECT_HARMONICS':
        result = detectHarmonics(new Float32Array(payload.channelData), payload.sampleRate);
        break;

      case 'DETECT_WAVEFORM':
        result = detectWaveformType(new Float32Array(payload.channelData), payload.sampleRate, payload.attackTimeMs);
        break;

      case 'ANALYZE_FILTER_ENVELOPE':
        result = analyzeFilterEnvelope(new Float32Array(payload.channelData), payload.sampleRate);
        break;

      case 'DETECT_MODULATION':
        result = detectModulation(new Float32Array(payload.channelData), payload.sampleRate);
        break;

      case 'CALCULATE_ADSR':
        result = calculateADSR(new Float32Array(payload.channelData), payload.sampleRate);
        break;

      // --- ML Pipeline Handlers ---
      // These extract features in formats ready for TensorFlow.js models

      case 'EXTRACT_ML_FEATURES':
        // Extract normalized features for ML model input
        result = extractMLFeaturesFromAudio(
          new Float32Array(payload.channelData),
          payload.sampleRate
        );
        break;

      case 'PREDICT_INSTRUMENT_ML':
        // Placeholder for ML-based instrument prediction
        // Will integrate TensorFlow.js model here
        result = {
          status: 'not_implemented',
          message: 'ML model not yet loaded. Using heuristic detection.',
          fallback: detectInstruments(new Float32Array(payload.channelData), payload.sampleRate)
        };
        break;

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
