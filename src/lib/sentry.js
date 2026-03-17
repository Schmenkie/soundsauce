// Sentry error monitoring — crash-safe initialization with dynamic import
// If @sentry/react fails to load (ad blockers, network) or DSN is not set, the app continues normally
// Set VITE_SENTRY_DSN in your environment (Vercel Dashboard or .env.local)

let SentryModule = null;

export async function initSentry() {
  try {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn) {
      console.warn('Sentry: VITE_SENTRY_DSN not set, error monitoring disabled');
      return;
    }

    SentryModule = await import('@sentry/react');
    SentryModule.init({
      dsn,
      environment: import.meta.env.PROD ? 'production' : 'development',
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
    });
  } catch (e) {
    console.warn('Sentry: failed to load, error monitoring disabled:', e);
  }
}

export function captureException(error) {
  if (SentryModule) {
    SentryModule.captureException(error);
  }
}
