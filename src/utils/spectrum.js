/**
 * Signal Deck colour system — colour is frequency.
 *
 * Five hues map to five regions of the spectrum, low → high:
 *   violet (sub/bass) → blue (low-mids) → green (mids) → yellow (high-mids) → red (air)
 * Everything coloured in the app derives from this: waveforms coloured by spectral
 * centroid, the analyzer bars, stem strips, band readouts.
 */

export const SPECTRUM = {
  sub: '#8B5CF6',
  low: '#3B82F6',
  mid: '#22C55E',
  high: '#FACC15',
  air: '#EF4444',
};

export const SPECTRUM_STOPS = [SPECTRUM.sub, SPECTRUM.low, SPECTRUM.mid, SPECTRUM.high, SPECTRUM.air];

/** CSS gradient strings (horizontal = along time/frequency, vertical = level) */
export const SPECTRUM_GRADIENT = `linear-gradient(90deg, ${SPECTRUM_STOPS.map((c, i) => `${c} ${i * 25}%`).join(', ')})`;
export const SPECTRUM_GRADIENT_V = `linear-gradient(0deg, ${SPECTRUM_STOPS.map((c, i) => `${c} ${i * 25}%`).join(', ')})`;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const STOP_RGB = SPECTRUM_STOPS.map(hexToRgb);

/**
 * Interpolate the spectrum at t ∈ [0, 1] (0 = sub, 1 = air).
 * @returns {[number, number, number]} rgb
 */
export function spectrumRgb(t) {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (STOP_RGB.length - 1);
  const i = Math.min(STOP_RGB.length - 2, Math.floor(x));
  const f = x - i;
  const a = STOP_RGB[i], b = STOP_RGB[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

/** `rgb(...)` / `rgba(...)` string for t ∈ [0, 1] */
export function spectrumColor(t, alpha = 1) {
  const [r, g, b] = spectrumRgb(t);
  return alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Map a frequency in Hz to a spectrum position using a log scale from 40 Hz to 12 kHz —
 * roughly where a spectral centroid lands for sub-bass vs. hi-hats.
 */
export function hzToSpectrumT(hz) {
  if (!hz || hz <= 0) return 0;
  const lo = Math.log10(40), hi = Math.log10(12000);
  return Math.min(1, Math.max(0, (Math.log10(hz) - lo) / (hi - lo)));
}

/** Per-stem colours — chosen by where each stem typically lives in the spectrum */
export const STEM_COLORS = {
  bass: { hex: SPECTRUM.sub, t: 0.0 },
  piano: { hex: SPECTRUM.low, t: 0.25 },
  other: { hex: SPECTRUM.low, t: 0.3, gradient: `linear-gradient(135deg, ${SPECTRUM.sub}, ${SPECTRUM.low}, ${SPECTRUM.mid})` },
  guitar: { hex: SPECTRUM.mid, t: 0.5 },
  drums: { hex: SPECTRUM.high, t: 0.75 },
  vocals: { hex: SPECTRUM.air, t: 0.95 },
};

export function stemColor(stemType) {
  return STEM_COLORS[stemType] || STEM_COLORS.other;
}

/** Frequency band labels used by the analyzer, with their spectrum colours */
export const BAND_COLORS = {
  subBass: SPECTRUM.sub,
  bass: SPECTRUM.sub,
  lowMid: SPECTRUM.low,
  mid: SPECTRUM.mid,
  highMid: SPECTRUM.high,
  high: SPECTRUM.air,
};
