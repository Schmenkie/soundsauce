import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getLabToken, labSignIn, labSignOut, labVerify } from '../lib/labAuth';

/**
 * Lab auth. There is exactly one user, so "auth" is a password gate for the paid API
 * routes (Replicate GPU, Blob uploads) — see api/_auth.js.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(() => !!getLabToken());
  const [loading, setLoading] = useState(true);

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

  const value = useMemo(() => ({
    isSignedIn,
    loading,
    signIn,
    signOut,
  }), [isSignedIn, loading, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
