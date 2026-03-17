import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { identifyUser, resetUser, trackSignIn, trackSignUp, trackSignOut } from '../lib/posthog';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state — only set user here, no DB calls
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          setProfile(null);
          resetUser();
        }
        // Track auth events
        if (event === 'SIGNED_IN' && session?.user) {
          const method = session.user.app_metadata?.provider === 'google' ? 'google' : 'email';
          trackSignIn(method);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile in a separate effect when user changes
  useEffect(() => {
    if (user) {
      fetchProfile(user.id);
    }
  }, [user]);

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      setProfile(data ?? null);
      if (data) identifyUser({ id: userId, email: user?.email, created_at: user?.created_at }, data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setProfile(null);
    }
  }

  async function updateProfile(updates) {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (!error) setProfile(data);
    return { data, error };
  }

  async function signInWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  async function signUpWithEmail(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username || null },
        emailRedirectTo: window.location.origin,
      },
    });

    // Supabase returns a fake user with empty identities when email already exists
    // (email confirmation enabled). Detect this and return a clear error.
    if (!error && data?.user && data.user.identities?.length === 0) {
      return {
        data: null,
        error: { message: 'An account with this email already exists. Try signing in instead.' },
      };
    }

    if (!error) trackSignUp('email');
    return { data, error };
  }

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { data, error };
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      trackSignOut();
      setUser(null);
      setProfile(null);
    }
    return { error };
  }

  async function resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/profile`,
    });
    return { data, error };
  }

  async function updateEmail(newEmail) {
    const { data, error } = await supabase.auth.updateUser({ email: newEmail });
    return { data, error };
  }

  async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    return { data, error };
  }

  // Subscription tier helpers — derived from profile, zero extra queries
  const tier = profile?.subscription_tier || 'free';
  const isSubscribed = tier !== 'free';
  const isPro = tier === 'pro';

  // Admin helper — derived from profile, zero extra queries
  const isAdmin = profile?.is_admin === true;

  // Notification count — derived from profile, zero extra queries (fast-path for sidebar badge)
  const unreadNotifications = profile?.unread_notifications || 0;

  // Message count — derived from profile, zero extra queries (fast-path for sidebar badge)
  const unreadMessages = profile?.unread_messages || 0;

  // Re-fetch profile (used after checkout to pick up webhook-updated tier)
  function refreshProfile() {
    if (user) fetchProfile(user.id);
  }

  const value = {
    user,
    profile,
    loading,
    // Subscription helpers
    tier,
    isSubscribed,
    isPro,
    refreshProfile,
    // Admin
    isAdmin,
    // Notifications
    unreadNotifications,
    // Messages
    unreadMessages,
    // Auth methods
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
    updateEmail,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
