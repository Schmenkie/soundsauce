import { SPECTRUM } from './spectrum';

/** DJ / dance form. Colour follows energy the way the spectrum follows frequency: low → high. */
export const SECTION_LABELS = ['intro', 'breakdown', 'buildup', 'drop', 'outro'];

export const SECTION_COLORS = {
  intro: SPECTRUM.sub,
  breakdown: SPECTRUM.low,
  buildup: SPECTRUM.mid,
  drop: SPECTRUM.high,
  outro: SPECTRUM.sub,
};

/** Bar number (1-based) for a time given the grid; null when the tempo is unknown */
export function barAtTime(t, barSec, gridOffset = 0) {
  return barSec > 0 ? Math.floor((t - gridOffset) / barSec + 1e-6) + 1 : null;
}
