/**
 * Validates required environment variables on app startup.
 * Logs warnings for missing optional vars, throws for critical ones.
 * Only runs in production (import.meta.env.PROD).
 */
export function validateEnv() {
  if (!import.meta.env.PROD) return; // Skip in dev — vars may be missing intentionally

  // The frontend needs nothing to boot; every secret lives server-side (LAB_PASSWORD,
  // REPLICATE_API_TOKEN, BLOB_READ_WRITE_TOKEN, GEMINI_API_KEY) and is checked per endpoint.
  const required = [];

  const optional = [
    'VITE_POSTHOG_KEY',
    'VITE_SENTRY_DSN',
  ];

  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    console.error(
      `[SoundSauce] Missing required environment variables: ${missing.join(', ')}. ` +
      'The app may not function correctly. Check your Vercel environment settings.'
    );
  }

  const missingOptional = optional.filter(key => !import.meta.env[key]);
  if (missingOptional.length > 0) {
    console.warn(
      `[SoundSauce] Missing optional environment variables: ${missingOptional.join(', ')}. ` +
      'Analytics / error tracking may be disabled.'
    );
  }
}
