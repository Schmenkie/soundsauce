import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getLabToken, labSignIn, labSignOut, labVerify } from '../lib/labAuth';

/**
 * Lab auth + local preferences.
 *
 * Replaces the old Supabase-backed AuthProvider. There is exactly one user, so
 * "auth" is a password gate for the paid API routes, and "profile" collapses to a
 * few preferences kept in localStorage (DAW, artist name for stem filenames).
 */

const PREFS_KEY = 'soundsauce_prefs';
const DEFAULT_PREFS = {
  dawPreference: 'Ableton Live',
  artistName: '',
};

function readPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...(JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(() => !!getLabToken());
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState(readPrefs);

  // Validate the stored token once on mount (drops sessions the server no longer accepts)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await labVerify();
      if (!cancelled) {
        setIsSignedIn(ok);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async (password) => {
    await labSignIn(password);
    setIsSignedIn(true);
  }, []);

  const signOut = useCallback(() => {
    labSignOut();
    setIsSignedIn(false);
  }, []);

  const updatePrefs = useCallback((patch) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    isSignedIn,
    loading,
    signIn,
    signOut,
    prefs,
    updatePrefs,
  }), [isSignedIn, loading, signIn, signOut, prefs, updatePrefs]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
