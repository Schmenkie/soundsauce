import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// -----------------------------------------------------------
// Mock dependencies
// -----------------------------------------------------------

// Track dispatchEvent calls
const mockDispatchEvent = vi.fn();

// Mock posthog
vi.mock('../lib/posthog', () => ({
  trackRecipePublished: vi.fn(),
}));

// Create mock chain builders
let mockSupabaseData = {};
let mockSupabaseError = null;

function createMockQueryChain(overrides = {}) {
  const chainResult = {
    data: overrides.data ?? mockSupabaseData,
    error: overrides.error ?? mockSupabaseError,
    count: overrides.count ?? 0,
  };

  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(chainResult)),
    then: (cb) => Promise.resolve(chainResult).then(cb),
  };

  // Make the chain itself thenable
  chain[Symbol.toPrimitive] = () => chainResult;

  return chain;
}

const mockFrom = vi.fn(() => createMockQueryChain());

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

// Mock AuthContext
let mockUser = null;
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// We need to import after mocks are set up
const { useHistory } = await import('../hooks/useHistory');

// -----------------------------------------------------------
// Tests
// -----------------------------------------------------------

describe('useHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockSupabaseData = {};
    mockSupabaseError = null;

    // Mock localStorage
    const store = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => { store[key] = val; });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { delete store[key]; });
  });

  describe('guest mode (no user)', () => {
    it('loads history from localStorage', () => {
      Storage.prototype.getItem.mockReturnValue(JSON.stringify([
        { id: '1', title: 'Test', timestamp: Date.now() },
      ]));

      const { result } = renderHook(() => useHistory());

      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].title).toBe('Test');
    });

    it('starts with empty history when localStorage is empty', () => {
      Storage.prototype.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useHistory());

      expect(result.current.history).toEqual([]);
    });

    it('handles corrupted localStorage gracefully', () => {
      Storage.prototype.getItem.mockReturnValue('not-valid-json');

      const { result } = renderHook(() => useHistory());

      expect(result.current.history).toEqual([]);
    });

    it('adds entry to local history for guests', async () => {
      Storage.prototype.getItem.mockReturnValue('[]');

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.addToHistory({
          id: 'local-1',
          title: 'New Analysis',
          timestamp: Date.now(),
          features: { bpm: { bpm: 120 } },
        });
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].title).toBe('New Analysis');
    });

    it('deletes entry from local history for guests', async () => {
      Storage.prototype.getItem.mockReturnValue(JSON.stringify([
        { id: '1', title: 'First' },
        { id: '2', title: 'Second' },
      ]));

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.deleteFromHistory('1');
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].id).toBe('2');
    });
  });

  describe('publishRecipe', () => {
    it('returns false when user is not authenticated', async () => {
      mockUser = null;
      const { result } = renderHook(() => useHistory());

      let success;
      await act(async () => {
        success = await result.current.publishRecipe('some-id', {
          title: 'My Recipe',
          description: 'A description',
          tags: ['bass'],
        });
      });

      expect(success).toBe(false);
    });

    it('calls supabase update with correct fields when authenticated', async () => {
      mockUser = { id: 'user-123' };

      // Mock the cloud history load
      const loadChain = createMockQueryChain({
        data: [
          {
            id: 'analysis-1',
            title: 'Test Analysis',
            is_public: false,
            results: { features: {}, recommendations: {} },
            created_at: new Date().toISOString(),
            user_id: 'user-123',
          },
        ],
      });
      // Make the chain return .data as an array (not wrapped in single)
      loadChain.limit = vi.fn(() => Promise.resolve({ data: loadChain.select().eq().order().data, error: null }));

      // Set up the update chain
      const updateChain = createMockQueryChain({ data: null, error: null });

      let callCount = 0;
      mockFrom.mockImplementation((table) => {
        callCount++;
        if (table === 'analyses') {
          // Return a proper chain for loading and updating
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({
                    data: [{
                      id: 'analysis-1',
                      title: 'Test Analysis',
                      is_public: false,
                      results: { features: {}, recommendations: {} },
                      created_at: new Date().toISOString(),
                      user_id: 'user-123',
                    }],
                    error: null,
                  })),
                })),
              })),
            })),
            update: vi.fn((updates) => {
              // Verify the correct fields are being updated
              expect(updates.is_public).toBe(true);
              expect(updates.description).toBe('A great bass sound');
              expect(updates.tags).toEqual(['bass', 'synth']);
              expect(updates.title).toBe('My Bass Recipe');

              return {
                eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
              };
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: null })),
              })),
            })),
          };
        }
        return createMockQueryChain();
      });

      const { result } = renderHook(() => useHistory());

      // Wait for initial cloud load
      await waitFor(() => {
        expect(result.current.history.length).toBeGreaterThanOrEqual(0);
      });

      // Mock window.dispatchEvent
      const originalDispatch = window.dispatchEvent;
      window.dispatchEvent = mockDispatchEvent;

      let success;
      await act(async () => {
        success = await result.current.publishRecipe('analysis-1', {
          title: 'My Bass Recipe',
          description: 'A great bass sound',
          tags: ['bass', 'synth'],
        });
      });

      // Restore
      window.dispatchEvent = originalDispatch;

      expect(success).toBe(true);
    });

    it('includes vitalPresetUrl in update when provided', async () => {
      mockUser = { id: 'user-123' };

      let capturedUpdates = null;

      mockFrom.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'a-1',
                  title: 'Test',
                  is_public: false,
                  results: {},
                  created_at: new Date().toISOString(),
                  user_id: 'user-123',
                }],
                error: null,
              })),
            })),
          })),
        })),
        update: vi.fn((updates) => {
          capturedUpdates = updates;
          return {
            eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
          };
        }),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      }));

      const { result } = renderHook(() => useHistory());

      await waitFor(() => {
        expect(result.current.history.length).toBeGreaterThanOrEqual(0);
      });

      const originalDispatch = window.dispatchEvent;
      window.dispatchEvent = vi.fn();

      await act(async () => {
        await result.current.publishRecipe('a-1', {
          title: 'Preset Recipe',
          description: 'Has a preset',
          tags: ['lead'],
          vitalPresetUrl: 'https://blob.vercel.com/presets/test.vital',
        });
      });

      window.dispatchEvent = originalDispatch;

      expect(capturedUpdates).toBeDefined();
      expect(capturedUpdates.vital_preset_url).toBe('https://blob.vercel.com/presets/test.vital');
      expect(capturedUpdates.is_public).toBe(true);
    });

    it('returns false and logs error when supabase update fails', async () => {
      mockUser = { id: 'user-123' };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFrom.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'a-1',
                  title: 'Test',
                  is_public: false,
                  results: {},
                  created_at: new Date().toISOString(),
                  user_id: 'user-123',
                }],
                error: null,
              })),
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: null,
            error: { message: 'DB error', code: '42P01' },
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      }));

      const { result } = renderHook(() => useHistory());

      await waitFor(() => {
        expect(result.current.history.length).toBeGreaterThanOrEqual(0);
      });

      let success;
      await act(async () => {
        success = await result.current.publishRecipe('a-1', {
          title: 'Failing',
          description: '',
          tags: [],
        });
      });

      expect(success).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to publish recipe:', expect.any(Object));
      consoleSpy.mockRestore();
    });

    it('dispatches recipe-mutation event on successful publish', async () => {
      mockUser = { id: 'user-123' };

      mockFrom.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'a-1',
                  title: 'Test',
                  is_public: false,
                  results: {},
                  created_at: new Date().toISOString(),
                  user_id: 'user-123',
                }],
                error: null,
              })),
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      }));

      const { result } = renderHook(() => useHistory());

      await waitFor(() => {
        expect(result.current.history.length).toBeGreaterThanOrEqual(0);
      });

      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      await act(async () => {
        await result.current.publishRecipe('a-1', {
          title: 'Test',
          description: '',
          tags: [],
        });
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'recipe-mutation',
        })
      );

      dispatchSpy.mockRestore();
    });
  });

  describe('data conversion functions', () => {
    // Test the pure toSupabaseRow / fromSupabaseRow conversion logic inline
    it('toSupabaseRow converts local entry to Supabase format', () => {
      function toSupabaseRow(entry, userId) {
        return {
          user_id: userId,
          title: entry.title || 'Untitled',
          instrument: entry.instrument || null,
          stem_type: entry.analyzedStem || null,
          results: {
            features: entry.features || {},
            recommendations: entry.recommendations || {},
            detectedInstruments: entry.detectedInstruments || {},
          },
          is_public: false,
          created_at: entry.timestamp
            ? new Date(entry.timestamp).toISOString()
            : new Date().toISOString(),
        };
      }

      const entry = {
        title: 'My Bass Sound',
        instrument: 'bass',
        timestamp: 1700000000000,
        features: { bpm: { bpm: 120 } },
        recommendations: { oscillator: 'saw' },
      };

      const row = toSupabaseRow(entry, 'user-123');

      expect(row.user_id).toBe('user-123');
      expect(row.title).toBe('My Bass Sound');
      expect(row.instrument).toBe('bass');
      expect(row.is_public).toBe(false);
      expect(row.results.features.bpm.bpm).toBe(120);
    });

    it('fromSupabaseRow converts Supabase row to local format', () => {
      function fromSupabaseRow(row) {
        return {
          id: row.id,
          title: row.title,
          instrument: row.instrument,
          timestamp: new Date(row.created_at).getTime(),
          features: row.results?.features || {},
          recommendations: row.results?.recommendations || {},
          detectedInstruments: row.results?.detectedInstruments || {},
          analyzedStem: row.stem_type,
          isPublic: row.is_public || false,
          isCloud: true,
        };
      }

      const row = {
        id: 'uuid-123',
        title: 'Cloud Analysis',
        instrument: 'lead',
        created_at: '2025-02-01T12:00:00Z',
        results: {
          features: { brightness: 0.5 },
          recommendations: {},
          detectedInstruments: {},
        },
        stem_type: 'vocals',
        is_public: true,
      };

      const entry = fromSupabaseRow(row);

      expect(entry.id).toBe('uuid-123');
      expect(entry.title).toBe('Cloud Analysis');
      expect(entry.instrument).toBe('lead');
      expect(entry.isPublic).toBe(true);
      expect(entry.isCloud).toBe(true);
      expect(entry.analyzedStem).toBe('vocals');
      expect(entry.features.brightness).toBe(0.5);
      expect(typeof entry.timestamp).toBe('number');
    });

    it('toSupabaseRow defaults title to Untitled', () => {
      function toSupabaseRow(entry, userId) {
        return {
          user_id: userId,
          title: entry.title || 'Untitled',
          instrument: entry.instrument || null,
          stem_type: entry.analyzedStem || null,
          results: {
            features: entry.features || {},
            recommendations: entry.recommendations || {},
            detectedInstruments: entry.detectedInstruments || {},
          },
          is_public: false,
          created_at: entry.timestamp
            ? new Date(entry.timestamp).toISOString()
            : new Date().toISOString(),
        };
      }

      const row = toSupabaseRow({}, 'user-1');
      expect(row.title).toBe('Untitled');
      expect(row.instrument).toBeNull();
      expect(row.stem_type).toBeNull();
    });

    it('fromSupabaseRow handles missing results gracefully', () => {
      function fromSupabaseRow(row) {
        return {
          id: row.id,
          title: row.title,
          instrument: row.instrument,
          timestamp: new Date(row.created_at).getTime(),
          features: row.results?.features || {},
          recommendations: row.results?.recommendations || {},
          detectedInstruments: row.results?.detectedInstruments || {},
          analyzedStem: row.stem_type,
          isPublic: row.is_public || false,
          isCloud: true,
        };
      }

      const row = {
        id: 'uuid-456',
        title: 'No Results',
        instrument: null,
        created_at: '2025-01-01T00:00:00Z',
        results: null,
        stem_type: null,
        is_public: false,
      };

      const entry = fromSupabaseRow(row);

      expect(entry.features).toEqual({});
      expect(entry.recommendations).toEqual({});
      expect(entry.detectedInstruments).toEqual({});
    });
  });

  describe('hook API shape', () => {
    it('exposes all expected methods and properties', () => {
      const { result } = renderHook(() => useHistory());

      expect(result.current).toHaveProperty('history');
      expect(result.current).toHaveProperty('isOpen');
      expect(result.current).toHaveProperty('setIsOpen');
      expect(result.current).toHaveProperty('toggleOpen');
      expect(result.current).toHaveProperty('addToHistory');
      expect(result.current).toHaveProperty('deleteFromHistory');
      expect(result.current).toHaveProperty('clearHistory');
      expect(result.current).toHaveProperty('togglePublic');
      expect(result.current).toHaveProperty('publishRecipe');
      expect(result.current).toHaveProperty('cloudLoaded');

      expect(typeof result.current.addToHistory).toBe('function');
      expect(typeof result.current.deleteFromHistory).toBe('function');
      expect(typeof result.current.publishRecipe).toBe('function');
      expect(typeof result.current.togglePublic).toBe('function');
      expect(typeof result.current.toggleOpen).toBe('function');
    });
  });
});
