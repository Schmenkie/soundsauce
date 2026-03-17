import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, Compass, Upload, Zap, ArrowRight } from 'lucide-react';
import { RecipeCardSkeleton } from '../components/ui/Skeleton';
import { useRecipes, useLikes, usePresetPost, usePageTitle } from '../hooks';
import { RecipeGrid, PresetPostModal } from '../components/recipe';
import { useAuth } from '../contexts/AuthContext';
import { trackDiscoverFiltered } from '../lib/posthog';

const TAGS = ['Bass', 'Lead', 'Pad', 'Pluck', 'Kick', 'Drums', 'Strings', 'Vocal', 'FX'];

/**
 * Discover page — browse, search, and filter public Sound Recipes.
 * Reads ?tag= query parameter from URL to pre-select tag filters (from Home page category pills).
 */
export function Discover({ theme, t }) {
  usePageTitle('Discover');
  const [searchParams] = useSearchParams();
  const {
    recipes,
    loading,
    hasMore,
    searchQuery,
    selectedTags,
    fetchRecipes,
    fetchMore,
    search,
    toggleTag,
    clearTags,
    sortBy,
    setSortBy,
  } = useRecipes();

  const { isLiked, toggleLike } = useLikes();
  const { user } = useAuth();
  const { postPreset, status: presetStatus, error: presetError, reset: resetPreset } = usePresetPost();
  const navigate = useNavigate();

  const [inputValue, setInputValue] = useState('');
  const [showPresetModal, setShowPresetModal] = useState(false);
  const debounceRef = useRef(null);
  const appliedUrlTagRef = useRef(false);

  const isDark = theme === 'dark';

  // Apply ?tag= query parameter from URL on mount
  useEffect(() => {
    if (appliedUrlTagRef.current) return;
    const urlTag = searchParams.get('tag');
    if (urlTag && TAGS.includes(urlTag) && !selectedTags.includes(urlTag)) {
      appliedUrlTagRef.current = true;
      toggleTag(urlTag);
    }
  }, [searchParams, selectedTags, toggleTag]);

  // Initial fetch + re-fetch when filters change
  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  // Track filter changes (skip initial mount)
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }
    trackDiscoverFiltered(sortBy, selectedTags);
  }, [sortBy, selectedTags]);

  // Debounced search input
  function handleSearchInput(value) {
    setInputValue(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(value);
    }, 350);
  }

  function handleClearSearch() {
    setInputValue('');
    search('');
  }

  async function handlePresetSubmit(data) {
    const newId = await postPreset(data);
    if (newId) {
      setShowPresetModal(false);
      resetPreset();
      navigate(`/recipe/${newId}`);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className={`text-3xl font-bold font-display mb-2 ${t.text}`}>Discover</h1>
          <p className={t.textMuted}>Browse Sound Sauces shared by the community</p>
        </div>
        {user && (
          <button
            onClick={() => setShowPresetModal(true)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors rounded-md ${
              isDark
                ? 'bg-zinc-800 text-zinc-50 hover:bg-zinc-700'
                : 'bg-ember-600 text-white hover:bg-ember-700'
            }`}
          >
            <Upload className="w-4 h-4" />
            Post Preset
          </button>
        )}
      </div>

      {/* Preset Post Modal */}
      <PresetPostModal
        isOpen={showPresetModal}
        onClose={() => { setShowPresetModal(false); resetPreset(); }}
        onSubmit={handlePresetSubmit}
        theme={theme}
        status={presetStatus}
        error={presetError}
      />

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className={`flex-1 flex items-center gap-2 px-4 py-3 border rounded-md ${
          isDark
            ? 'bg-zinc-900 border-zinc-700 focus-within:border-ember-500 focus-within:ring-2 focus-within:ring-ember-500/30'
            : 'bg-white border-stone-200 focus-within:border-ember-600 focus-within:ring-2 focus-within:ring-ember-600/20'
        } transition-colors`}>
          <Search className={`w-5 h-5 flex-shrink-0 ${t.textMuted}`} />
          <input
            type="text"
            value={inputValue}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder="Search Sound Sauces by title or description..."
            className={`flex-1 bg-transparent outline-none ${t.text} ${isDark ? 'placeholder:text-zinc-500' : 'placeholder:text-stone-400'}`}
          />
          {inputValue && (
            <button onClick={handleClearSearch} className={`flex-shrink-0 ${t.textMuted}`}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tag Chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {TAGS.map((tag) => {
          const isActive = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-4 py-2 text-sm font-medium border transition-colors rounded-full ${
                isDark
                  ? isActive
                    ? 'bg-ember-500 text-zinc-950 border-ember-500'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-zinc-200 hover:border-zinc-500'
                  : isActive
                    ? 'bg-ember-600 text-white border-ember-600'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400'
              }`}
            >
              {tag}
            </button>
          );
        })}
        {selectedTags.length > 0 && (
          <button
            onClick={clearTags}
            className={`px-4 py-2 text-sm transition-colors ${
              isDark
                ? 'text-zinc-500 hover:text-zinc-200'
                : 'text-stone-400 hover:text-ember-600'
            }`}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Sort Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <span className={`text-sm ${t.textDimmed}`}>Sort by:</span>
        {['recent', 'popular'].map(option => (
          <button
            key={option}
            onClick={() => setSortBy(option)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors rounded-md ${
              sortBy === option
                ? isDark
                  ? 'bg-ember-500 text-zinc-950'
                  : 'bg-ember-600 text-white'
                : isDark
                  ? 'text-zinc-500 hover:text-zinc-200'
                  : 'text-stone-400 hover:text-ember-600'
            }`}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>

      {/* Results */}
      {!loading && recipes.length === 0 ? (
        <div className={`p-16 border-2 border-dashed text-center rounded-lg ${
          isDark ? 'border-zinc-700' : 'border-stone-200'
        }`}>
          <Compass className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-zinc-600' : 'text-stone-300'}`} />
          <h2 className={`text-xl font-bold mb-2 ${t.text}`}>
            {searchQuery || selectedTags.length > 0 ? 'No recipes found' : 'No recipes yet'}
          </h2>
          <p className={`max-w-md mx-auto ${t.textMuted}`}>
            {searchQuery || selectedTags.length > 0
              ? 'Try adjusting your search or filters.'
              : 'Be the first to publish a Sound Sauce! Analyze a sound and hit the Publish button.'}
          </p>
        </div>
      ) : (
        <RecipeGrid
          recipes={recipes}
          hasMore={hasMore}
          loading={loading}
          onLoadMore={fetchMore}
          theme={theme}
          isLiked={isLiked}
          onToggleLike={toggleLike}
        />
      )}

      {/* Loading indicator — skeleton row for "load more" */}
      {loading && recipes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {[1, 2, 3].map(i => (
            <RecipeCardSkeleton key={i} theme={theme} />
          ))}
        </div>
      )}

      {/* Pro CTA — shown to guests */}
      {!user && (
        <div className={`mt-12 p-6 border text-center rounded-lg ${
          isDark
            ? 'bg-zinc-900 border-zinc-800'
            : 'bg-amber-50/50 border-amber-200'
        }`}>
          <Zap className={`w-6 h-6 mx-auto mb-2 ${isDark ? 'text-ember-500' : 'text-ember-600'}`} />
          <h3 className={`text-lg font-bold mb-1 ${t.text}`}>Want to create your own Sound Sauces?</h3>
          <p className={`text-sm mb-4 ${t.textMuted}`}>
            Analyze any sound and share your recipes with the community.
          </p>
          <Link
            to="/analyze"
            className={`inline-flex items-center gap-2 px-6 py-3 font-medium transition-all rounded-md ${
              isDark
                ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
                : 'bg-ember-600 text-white hover:bg-ember-700'
            }`}
          >
            Start Analyzing Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
