/**
 * Validates required environment variables for a serverless function.
 * Returns an error response if any are missing.
 *
 * @param {object} res - Vercel response object
 * @param {string[]} requiredVars - Array of env var names to check
 * @returns {boolean} true if validation failed (response already sent), false if OK
 */
export function validateServerEnv(res, requiredVars) {
  const missing = requiredVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    res.status(500).json({
      error: 'Server configuration error. Please contact support.'
    });
    return true; // validation failed
  }

  return false; // all good
}
