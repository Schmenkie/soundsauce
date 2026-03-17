import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// Mock posthog
vi.mock('../lib/posthog', () => ({
  identifyUser: vi.fn(),
  resetUser: vi.fn(),
  trackSignIn: vi.fn(),
  trackSignUp: vi.fn(),
  trackSignOut: vi.fn(),
}));

// Mock supabase
const mockOnAuthStateChange = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpsert = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
      signUp: (...args) => mockSignUp(...args),
      signInWithOAuth: (...args) => mockSignInWithOAuth(...args),
      signOut: (...args) => mockSignOut(...args),
      resetPasswordForEmail: (...args) => mockResetPasswordForEmail(...args),
      updateUser: (...args) => mockUpdateUser(...args),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
}));

function wrapper({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  let authCallback;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up onAuthStateChange to capture the callback and return a subscription
    mockOnAuthStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return {
        data: {
          subscription: { unsubscribe: vi.fn() },
        },
      };
    });
  });

  it('throws an error when useAuth is used outside of AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  it('starts with loading=true, user=null, profile=null', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('sets loading=false after auth state change fires', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Simulate auth state change with no session
    act(() => {
      authCallback('INITIAL_SESSION', null);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.user).toBeNull();
  });

  it('sets user when signed in', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser = { id: 'user-123', email: 'test@example.com' };

    act(() => {
      authCallback('SIGNED_IN', { user: mockUser });
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.loading).toBe(false);
    });
  });

  it('clears user and profile on sign out', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Sign in first
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    act(() => {
      authCallback('SIGNED_IN', { user: mockUser });
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    // Sign out
    act(() => {
      authCallback('SIGNED_OUT', null);
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.profile).toBeNull();
    });
  });

  it('derives tier helpers correctly from profile', async () => {
    const { supabase } = await import('../lib/supabase');

    // Mock the profile fetch to return a pro user
    supabase.from.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-123',
              username: 'testuser',
              subscription_tier: 'pro',
              is_admin: false,
              unread_notifications: 3,
            },
            error: null,
          }),
        })),
      })),
    }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser = { id: 'user-123', email: 'test@example.com' };
    act(() => {
      authCallback('SIGNED_IN', { user: mockUser });
    });

    await waitFor(() => {
      expect(result.current.profile).not.toBeNull();
    });

    expect(result.current.tier).toBe('pro');
    expect(result.current.isSubscribed).toBe(true);
    expect(result.current.isPro).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.unreadNotifications).toBe(3);
  });

  it('defaults tier to free when profile has no subscription_tier', async () => {
    const { supabase } = await import('../lib/supabase');

    supabase.from.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-123',
              username: 'testuser',
            },
            error: null,
          }),
        })),
      })),
    }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser = { id: 'user-123', email: 'test@example.com' };
    act(() => {
      authCallback('SIGNED_IN', { user: mockUser });
    });

    await waitFor(() => {
      expect(result.current.profile).not.toBeNull();
    });

    expect(result.current.tier).toBe('free');
    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.isPro).toBe(false);
  });

  it('admin flag is correctly derived from profile', async () => {
    const { supabase } = await import('../lib/supabase');

    supabase.from.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-123',
              username: 'testuser',
              subscription_tier: 'pro',
              is_admin: true,
            },
            error: null,
          }),
        })),
      })),
    }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser = { id: 'user-123', email: 'test@example.com' };
    act(() => {
      authCallback('SIGNED_IN', { user: mockUser });
    });

    await waitFor(() => {
      expect(result.current.profile).not.toBeNull();
    });

    expect(result.current.tier).toBe('pro');
    expect(result.current.isSubscribed).toBe(true);
    expect(result.current.isPro).toBe(true);
    expect(result.current.isAdmin).toBe(true);
  });

  it('signInWithEmail calls supabase auth', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for initial loading
    act(() => {
      authCallback('INITIAL_SESSION', null);
    });

    await act(async () => {
      const res = await result.current.signInWithEmail('test@example.com', 'password123');
      expect(res.error).toBeNull();
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('signUpWithEmail passes username in metadata', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      authCallback('INITIAL_SESSION', null);
    });

    await act(async () => {
      await result.current.signUpWithEmail('test@example.com', 'password123', 'myusername');
    });

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        password: 'password123',
        options: expect.objectContaining({
          data: { username: 'myusername' },
        }),
      })
    );
  });

  it('signOut clears user and profile state', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Sign in first
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    act(() => {
      authCallback('SIGNED_IN', { user: mockUser });
    });

    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
    });

    // Sign out
    await act(async () => {
      const res = await result.current.signOut();
      expect(res.error).toBeNull();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('exposes all expected methods and properties', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Check all properties exist
    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('profile');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('tier');
    expect(result.current).toHaveProperty('isSubscribed');
    expect(result.current).toHaveProperty('isPro');
    expect(result.current).toHaveProperty('unreadMessages');
    expect(result.current).toHaveProperty('isAdmin');
    expect(result.current).toHaveProperty('unreadNotifications');
    expect(result.current).toHaveProperty('refreshProfile');

    // Check all methods exist
    expect(typeof result.current.signInWithEmail).toBe('function');
    expect(typeof result.current.signUpWithEmail).toBe('function');
    expect(typeof result.current.signInWithGoogle).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
    expect(typeof result.current.resetPassword).toBe('function');
    expect(typeof result.current.updateProfile).toBe('function');
    expect(typeof result.current.updateEmail).toBe('function');
    expect(typeof result.current.updatePassword).toBe('function');
  });

  it('updateProfile returns error when not authenticated', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      authCallback('INITIAL_SESSION', null);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let res;
    await act(async () => {
      res = await result.current.updateProfile({ username: 'newname' });
    });

    expect(res.error).toBeTruthy();
    expect(res.error.message).toBe('Not authenticated');
  });
});
