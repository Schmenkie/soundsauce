import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search as SearchIcon, X, User, Loader, TrendingUp, Clock, Sliders, MoreHorizontal } from 'lucide-react';
import { useRecipes, useLikes, useFollows, useFeed, usePageTitle } from '../hooks';
import { useUserSearch } from '../hooks/useUserSearch';
import { useAuth } from '../contexts/AuthContext';
import { trackSearch } from '../lib/posthog';
import { RecipeGrid, FollowButton } from '../components/recipe';

/**
 * Search page — unified search for users and recipes.
 * Shows trending/recent content when no query is entered.
 */
export function Search({ theme, t }) {
  usePageTitle('Search');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search state
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all | recipes | users
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceRef = useRef(null);

  // User search
  const { results: userResults, loading: usersLoading, searchUsers, clearSearch: clearUserSearch } = useUserSearch();

  // Recipe search
  const {
    recipes,
    loading: recipesLoading,
    hasMore,
    fetchRecipes,
    fetchMore,
    search: searchRecipes,
  } = useRecipes();

  const { isLiked, toggleLike } = useLikes();
  const { isFollowing, toggleFollow, followingIds } = useFollows();

  // Feed for suggestions when not searching
  const { feedItems, loading: feedLoading, fetchFeed } = useFeed(followingIds);

  // Initial load: fetch trending/feed content
  useEffect(() => {
    fetchFeed();
    fetchRecipes();
  }, [fetchFeed, fetchRecipes]);

  const hasQuery = inputValue.trim().length >= 2;

  // Track search after results return
  const lastTrackedQueryRef = useRef('');
  useEffect(() => {
    if (hasQuery && !usersLoading && !recipesLoading && !isDebouncing) {
      const query = inputValue.trim();
      if (query !== lastTrackedQueryRef.current) {
        lastTrackedQueryRef.current = query;
        trackSearch(query, userResults.length + recipes.length);
      }
    }
  }, [hasQuery, usersLoading, recipesLoading, isDebouncing, inputValue, userResults.length, recipes.length]);

  function handleInput(value) {
    setInputValue(value);
    clearTimeout(debounceRef.current);

    if (!value.trim() || value.trim().length < 2) {
      setIsDebouncing(false);
      clearUserSearch();
      searchRecipes('');
      return;
    }

    setIsDebouncing(true);
    debounceRef.current = setTimeout(() => {
      setIsDebouncing(false);
      searchUsers(value);
      searchRecipes(value);
    }, 300);
  }

  function handleClear() {
    setInputValue('');
    clearUserSearch();
    searchRecipes('');
  }

  function handleUserClick(username) {
    navigate(`/user/${username}`);
  }

  const showUsers = activeTab === 'all' || activeTab === 'users';
  const showRecipes = activeTab === 'all' || activeTab === 'recipes';

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-3xl font-bold mb-2 ${t.text}`}>Search</h1>
        <p className={t.textMuted}>Find producers and sound recipes</p>
      </div>

      {/* Search Bar */}
      <div className={`flex items-center gap-2 px-4 py-3 border mb-6 rounded-md ${
        theme === 'dark'
          ? 'bg-zinc-900 border-zinc-800 focus-within:border-ember-500 focus-within:ring-2 focus-within:ring-ember-500/30'
          : 'bg-white border-stone-200 focus-within:border-ember-600 focus-within:ring-2 focus-within:ring-ember-600/20'
      } transition-colors`}>
        <SearchIcon className={`w-5 h-5 flex-shrink-0 ${t.textMuted}`} />
        <input
          type="text"
          value={inputValue}
          onChange={e => handleInput(e.target.value)}
          placeholder="Search for users or recipes..."
          autoFocus
          className={`flex-1 bg-transparent outline-none ${t.text} placeholder:text-zinc-400`}
        />
        {isDebouncing && (
          <MoreHorizontal className={`w-4 h-4 flex-shrink-0 animate-pulse ${t.textDimmed}`} />
        )}
        {inputValue && (
          <button onClick={handleClear} className={`flex-shrink-0 ${t.textMuted}`}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Tabs (show when searching) */}
      {hasQuery && (
        <div className={`flex gap-0 border-b mb-6 ${
          theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
        }`}>
          {[
            { key: 'all', label: 'All' },
            { key: 'recipes', label: 'Recipes' },
            { key: 'users', label: 'Users' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? theme === 'dark'
                    ? 'border-white text-white'
                    : 'border-ember-600 text-ember-600'
                  : `border-transparent ${t.textDimmed} ${
                    theme === 'dark' ? 'hover:text-white' : 'hover:text-stone-900'
                  }`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {hasQuery ? (
        /* ===== SEARCH RESULTS ===== */
        <div className="space-y-8">
          {/* User Results */}
          {showUsers && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <User className={`w-4 h-4 ${t.textMuted}`} />
                <h2 className={`text-sm font-bold uppercase tracking-wider ${t.textMuted}`}>Users</h2>
              </div>
              {usersLoading ? (
                <div className="flex justify-center py-6">
                  <Loader className={`w-5 h-5 animate-spin ${t.textMuted}`} />
                </div>
              ) : userResults.length === 0 ? (
                <p className={`text-sm py-4 ${t.textDimmed}`}>No users found</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {userResults.map(profile => (
                    <div
                      key={profile.id}
                      className={`flex items-center gap-3 p-4 border cursor-pointer transition-all rounded-lg ${
                        theme === 'dark'
                          ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:shadow-lg hover:shadow-ember-500/10'
                          : 'bg-white border-stone-200 hover:border-ember-600 hover:shadow-lg hover:shadow-ember-500/10'
                      }`}
                    >
                      <div
                        className="flex items-center gap-3 flex-1 min-w-0"
                        onClick={() => handleUserClick(profile.username)}
                      >
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-10 h-10 object-cover flex-shrink-0 rounded-full" />
                        ) : (
                          <div className={`w-10 h-10 flex items-center justify-center text-sm font-bold flex-shrink-0 rounded-full ${
                            theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-50 text-ember-600'
                          }`}>
                            {(profile.display_name || profile.username || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-medium truncate ${t.text}`}>{profile.display_name || profile.username}</div>
                          {profile.bio && (
                            <div className={`text-xs truncate ${t.textDimmed}`}>{profile.bio}</div>
                          )}
                        </div>
                      </div>
                      {user && isFollowing && (
                        <FollowButton
                          following={isFollowing(profile.id)}
                          onToggle={() => toggleFollow(profile.id)}
                          theme={theme}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Recipe Results */}
          {showRecipes && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Sliders className={`w-4 h-4 ${t.textMuted}`} />
                <h2 className={`text-sm font-bold uppercase tracking-wider ${t.textMuted}`}>Recipes</h2>
              </div>
              {recipesLoading ? (
                <div className="flex justify-center py-6">
                  <Loader className={`w-5 h-5 animate-spin ${t.textMuted}`} />
                </div>
              ) : recipes.length === 0 ? (
                <p className={`text-sm py-4 ${t.textDimmed}`}>No recipes found</p>
              ) : (
                <RecipeGrid
                  recipes={recipes}
                  hasMore={hasMore}
                  loading={recipesLoading}
                  onLoadMore={fetchMore}
                  theme={theme}
                  isLiked={isLiked}
                  onToggleLike={toggleLike}
                />
              )}
            </section>
          )}
        </div>
      ) : (
        /* ===== SUGGESTIONS (no query) ===== */
        <div className="space-y-8">
          {/* Trending Recipes */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className={`w-5 h-5 ${t.textMuted}`} />
              <h2 className={`text-lg font-bold ${t.text}`}>Trending</h2>
            </div>
            {feedLoading ? (
              <div className="flex justify-center py-8">
                <Loader className={`w-5 h-5 animate-spin ${t.textMuted}`} />
              </div>
            ) : feedItems.length === 0 ? (
              <div className={`p-12 border-2 border-dashed text-center rounded-lg ${
                theme === 'dark' ? 'border-zinc-800' : 'border-stone-200'
              }`}>
                <p className={t.textMuted}>No recipes yet. Be the first to publish a Sound Sauce!</p>
              </div>
            ) : (
              <RecipeGrid
                recipes={feedItems}
                hasMore={false}
                loading={false}
                onLoadMore={() => {}}
                theme={theme}
                isLiked={isLiked}
                onToggleLike={toggleLike}
              />
            )}
          </section>

          {/* Recent Recipes */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${t.textMuted}`} />
                <h2 className={`text-lg font-bold ${t.text}`}>Recent</h2>
              </div>
              <Link
                to="/discover"
                className={`text-sm font-medium ${
                  theme === 'dark'
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-ember-600 hover:text-ember-700'
                }`}
              >
                View all
              </Link>
            </div>
            {recipesLoading ? (
              <div className="flex justify-center py-8">
                <Loader className={`w-5 h-5 animate-spin ${t.textMuted}`} />
              </div>
            ) : recipes.length === 0 ? (
              <p className={`text-sm py-4 ${t.textDimmed}`}>No recipes published yet.</p>
            ) : (
              <RecipeGrid
                recipes={recipes}
                hasMore={false}
                loading={false}
                onLoadMore={() => {}}
                theme={theme}
                isLiked={isLiked}
                onToggleLike={toggleLike}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
