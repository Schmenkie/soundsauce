import { useEffect, useRef } from 'react';
import { SPECTRUM_STOPS, hzToSpectrumT } from '../../utils/spectrum';

const NUM_BARS = 64;      // matches useAudioProcessor's spectrum array
const NYQUIST = 22050;    // 44.1k assumption is fine for a visual

// Which of the 5 spectrum bands each of the 64 analyzer bars belongs to
const BAR_BAND = Array.from({ length: NUM_BARS }, (_, i) => {
  const hz = Math.pow(i / NUM_BARS, 2.5) * NYQUIST;
  return Math.min(4, Math.floor(hzToSpectrumT(hz) * 5));
});

/**
 * MiniSpectrum — a five-bar band meter (sub / low / mid / high / air), each bar in its
 * spectrum colour. Reads `spectrumDataRef` (the 64-bar array the audio hook updates at
 * 60fps) directly via requestAnimationFrame while `active`, so it never re-renders React.
 *
 * When idle it shows `profile` (five 0..1 values, e.g. from a stem's analysis) or a
 * quiet resting state.
 */
export function MiniSpectrum({ spectrumDataRef, active, profile, height = 56, className = '' }) {
  const barsRef = useRef([]);
  const smoothRef = useRef([0, 0, 0, 0, 0]);

  useEffect(() => {
    const idle = profile && profile.length === 5 ? profile : [0.18, 0.14, 0.12, 0.1, 0.08];
    const paint = (levels) => {
      levels.forEach((v, i) => {
        const el = barsRef.current[i];
        if (el) el.style.transform = `scaleY(${Math.max(0.04, Math.min(1, v))})`;
      });
    };

    if (!active) {
      smoothRef.current = [...idle];
      paint(idle);
      return undefined;
    }

    let raf;
    const tick = () => {
      const data = spectrumDataRef?.current;
      if (data && data.length === NUM_BARS) {
        const sums = [0, 0, 0, 0, 0], counts = [0, 0, 0, 0, 0];
        for (let i = 0; i < NUM_BARS; i++) {
          sums[BAR_BAND[i]] += data[i];
          counts[BAR_BAND[i]]++;
        }
        const next = smoothRef.current.map((prev, b) => {
          const target = counts[b] ? sums[b] / counts[b] : 0;
          // fast attack, slow release — reads like a real meter
          return target > prev ? prev + (target - prev) * 0.6 : prev + (target - prev) * 0.18;
        });
        smoothRef.current = next;
        paint(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, spectrumDataRef, profile]);

  return (
    <div
      className={`flex items-end gap-[3px] ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      {SPECTRUM_STOPS.map((color, i) => (
        <div key={color} className="flex-1 h-full rounded-[2px] overflow-hidden" style={{ background: 'rgba(127,127,127,0.12)' }}>
          <div
            ref={(el) => { barsRef.current[i] = el; }}
            className="w-full h-full rounded-[2px] origin-bottom"
            style={{ background: color, transform: 'scaleY(0.08)', transition: active ? 'none' : 'transform .4s ease', opacity: active ? 1 : 0.7 }}
          />
        </div>
      ))}
    </div>
  );
}
