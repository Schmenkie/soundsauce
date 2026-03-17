import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, User, Loader } from 'lucide-react';
import { useUserSearch } from '../../hooks/useUserSearch';
import { FollowButton } from './FollowButton';

/**
 * User search component with dropdown results.
 * Debounced input, shows user avatars, follow buttons, click to navigate to profile.
 */
export function UserSearch({ theme, isFollowing, onToggleFollow }) {
  const { results, loading, query, searchUsers, clearSearch } = useUserSearch();
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const t = theme === 'dark' ? {
    text: 'text-white',
    textMuted: 'text-zinc-400',
    textDimmed: 'text-zinc-500',
    input: 'bg-zinc-900 border-zinc-700 rounded-md',
    dropdown: 'bg-zinc-900 border-zinc-700 rounded-lg',
    item: 'hover:bg-zinc-800',
    avatar: 'bg-zinc-800 text-zinc-400',
  } : {
    text: 'text-stone-900',
    textMuted: 'text-stone-500',
    textDimmed: 'text-stone-400',
    input: 'bg-white border-stone-200 focus-within:border-ember-600 rounded-md',
    dropdown: 'bg-white border-stone-200 shadow-lg shadow-ember-500/10 rounded-lg',
    item: 'hover:bg-stone-50',
    avatar: 'bg-amber-50 text-ember-600',
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInput(value) {
    setInputValue(value);
    clearTimeout(debounceRef.current);
    if (!value.trim()) {
      clearSearch();
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      searchUsers(value);
      setIsOpen(true);
    }, 300);
  }

  function handleClear() {
    setInputValue('');
    clearSearch();
    setIsOpen(false);
  }

  function handleUserClick(username) {
    setIsOpen(false);
    setInputValue('');
    clearSearch();
    navigate(`/user/${username}`);
  }

  const showDropdown = isOpen && (results.length > 0 || loading || (query.length >= 2 && !loading && results.length === 0));

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      {/* Search Input */}
      <div className={`flex items-center gap-2 px-3 py-2 border transition-colors ${t.input}`}>
        <Search className={`w-4 h-4 flex-shrink-0 ${t.textMuted}`} />
        <input
          type="text"
          value={inputValue}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => { if (results.length > 0 || query.length >= 2) setIsOpen(true); }}
          placeholder="Search users..."
          className={`flex-1 bg-transparent outline-none text-sm ${t.text} placeholder:${t.textDimmed}`}
        />
        {inputValue && (
          <button onClick={handleClear} className={`flex-shrink-0 ${t.textMuted}`}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div className={`absolute top-full left-0 right-0 mt-1 border z-50 max-h-72 overflow-y-auto ${t.dropdown}`}>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader className={`w-4 h-4 animate-spin ${t.textMuted}`} />
            </div>
          ) : results.length === 0 ? (
            <div className={`px-4 py-3 text-sm ${t.textMuted}`}>
              No users found matching "{query}"
            </div>
          ) : (
            results.map(profile => (
              <div
                key={profile.id}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${t.item}`}
              >
                {/* Clickable user info area */}
                <div
                  className="flex items-center gap-3 flex-1 min-w-0"
                  onClick={() => handleUserClick(profile.username)}
                >
                  {/* Avatar */}
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-8 h-8 object-cover flex-shrink-0 rounded-full"
                    />
                  ) : (
                    <div className={`w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 rounded-full ${t.avatar}`}>
                      {(profile.display_name || profile.username || '?')[0].toUpperCase()}
                    </div>
                  )}

                  {/* Name + Bio */}
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium truncate ${t.text}`}>
                      {profile.display_name || profile.username}
                    </div>
                    {profile.bio && (
                      <div className={`text-xs truncate ${t.textDimmed}`}>
                        {profile.bio}
                      </div>
                    )}
                  </div>
                </div>

                {/* Follow Button */}
                {isFollowing && onToggleFollow && (
                  <FollowButton
                    following={isFollowing(profile.id)}
                    onToggle={() => onToggleFollow(profile.id)}
                    theme={theme}
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
