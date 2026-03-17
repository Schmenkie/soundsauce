/**
 * Core Web Vitals tracking — sends metrics to PostHog.
 * Tracks: LCP, INP, CLS, TTFB for Google search ranking visibility.
 * Note: FID was deprecated in web-vitals v4 — INP replaces it.
 */
import { onCLS, onINP, onLCP, onTTFB } from 'web-vitals';

let captureMetric = null;

// Lazy-load the PostHog capture to avoid circular deps
async function ensureCapture() {
  if (captureMetric) return;
  try {
    const mod = await import('./posthog.js');
    captureMetric = mod.trackWebVital;
  } catch {
    // PostHog not available
  }
}

function reportMetric({ name, value, rating }) {
  ensureCapture().then(() => {
    if (captureMetric) {
      captureMetric(name, Math.round(name === 'CLS' ? value * 1000 : value), rating);
    }
  });
}

/** Initialize Web Vitals tracking. Call once on app mount. */
export function initWebVitals() {
  try {
    onCLS(reportMetric);
    onINP(reportMetric);
    onLCP(reportMetric);
    onTTFB(reportMetric);
  } catch {
    // web-vitals not available
  }
}
