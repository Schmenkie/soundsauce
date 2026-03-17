import { useState, useCallback } from 'react';
import { Trophy, Plus, X, Search as SearchIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useChallenges, useSubscription, usePageTitle } from '../hooks';
import { ChallengeGrid } from '../components/challenges';
import { supabase } from '../lib/supabase';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ended', label: 'Ended' },
];

/**
 * Browse all challenges with filter tabs and "Create Challenge" button.
 * Create form: title, description, Sound Sauce picker, start/end date.
 * Pro only for creation.
 */
export function Challenges({ theme, t }) {
  usePageTitle('Challenges');
  const { user } = useAuth();
  const { canCreateChallenge } = useSubscription();
  const {
    challenges, loading, hasMore, filter, setFilter,
    fetchMore, createChallenge,
  } = useChallenges();

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sauceSearch, setSauceSearch] = useState('');
  const [sauceResults, setSauceResults] = useState([]);
  const [selectedSauce, setSelectedSauce] = useState(null);
  const [, setSearchingFor] = useState(false);

  const dark = theme === 'dark';
  const canCreate = user && canCreateChallenge();

  // Search user's published Sound Sauces
  const handleSauceSearch = useCallback(async (query) => {
    setSauceSearch(query);
    if (!query.trim() || !user) {
      setSauceResults([]);
      return;
    }

    setSearchingFor(true);
    const { data } = await supabase
      .from('analyses')
      .select('id, title, audio_url')
      .eq('user_id', user.id)
      .eq('is_public', true)
      .ilike('title', `%${query}%`)
      .limit(5);

    setSauceResults(data || []);
    setSearchingFor(false);
  }, [user]);

  // Handle create
  const handleCreate = useCallback(async () => {
    if (!title.trim() || !startDate || !endDate) {
      setCreateError('Please fill in title, start date, and end date.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      setCreateError('End date must be after start date.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    const result = await createChallenge({
      title: title.trim(),
      description: description.trim(),
      soundSauceId: selectedSauce?.id || null,
      referenceAudioUrl: selectedSauce?.audio_url || null,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    if (result) {
      setShowCreate(false);
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setSelectedSauce(null);
      setSauceSearch('');
    } else {
      setCreateError('Failed to create challenge. Make sure you have a Pro subscription.');
    }

    setCreating(false);
  }, [title, description, startDate, endDate, selectedSauce, createChallenge]);

  return (
    <div className="max-w-5xl mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className={`w-6 h-6 ${dark ? 'text-ember-500' : 'text-ember-600'}`} />
          <h1 className={`text-2xl font-bold ${t.text}`}>Challenges</h1>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              dark
                ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-500/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            Create Challenge
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className={`p-6 border rounded-lg mb-6 ${
          dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-bold ${t.text}`}>New Challenge</h2>
            <button onClick={() => setShowCreate(false)} className={t.textDimmed}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.textMuted}`}>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="e.g. Recreate this 808 Bass"
                className={`w-full px-3 py-2 text-sm rounded-md border outline-none ${
                  dark
                    ? 'bg-zinc-950 border-zinc-800 text-white focus:border-ember-500'
                    : 'bg-white border-stone-200 text-stone-900 focus:border-ember-600'
                }`}
              />
            </div>

            {/* Description */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.textMuted}`}>Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Describe what participants should try to recreate..."
                className={`w-full px-3 py-2 text-sm rounded-md border outline-none resize-none ${
                  dark
                    ? 'bg-zinc-950 border-zinc-800 text-white focus:border-ember-500'
                    : 'bg-white border-stone-200 text-stone-900 focus:border-ember-600'
                }`}
              />
            </div>

            {/* Sound Sauce picker */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.textMuted}`}>
                Reference Sound Sauce
              </label>
              {selectedSauce ? (
                <div className={`flex items-center justify-between px-3 py-2 rounded-md border ${
                  dark ? 'bg-zinc-950 border-zinc-800' : 'bg-amber-50 border-stone-200'
                }`}>
                  <span className={`text-sm ${t.text}`}>{selectedSauce.title}</span>
                  <button onClick={() => { setSelectedSauce(null); setSauceSearch(''); }} className={t.textDimmed}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <SearchIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    dark ? 'text-zinc-500' : 'text-stone-400'
                  }`} />
                  <input
                    type="text"
                    value={sauceSearch}
                    onChange={(e) => handleSauceSearch(e.target.value)}
                    placeholder="Search your published Sound Sauces..."
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-md border outline-none ${
                      dark
                        ? 'bg-zinc-950 border-zinc-800 text-white focus:border-ember-500'
                        : 'bg-white border-stone-200 text-stone-900 focus:border-ember-600'
                    }`}
                  />
                  {sauceResults.length > 0 && (
                    <div className={`absolute top-full left-0 right-0 mt-1 border rounded-md z-10 max-h-40 overflow-y-auto ${
                      dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'
                    }`}>
                      {sauceResults.map(sauce => (
                        <button
                          key={sauce.id}
                          onClick={() => {
                            setSelectedSauce(sauce);
                            setSauceSearch('');
                            setSauceResults([]);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            dark ? 'hover:bg-zinc-800 text-white' : 'hover:bg-amber-50 text-stone-900'
                          }`}
                        >
                          {sauce.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textMuted}`}>Start Date</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-md border outline-none ${
                    dark
                      ? 'bg-zinc-950 border-zinc-800 text-white focus:border-ember-500'
                      : 'bg-white border-stone-200 text-stone-900 focus:border-ember-600'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textMuted}`}>End Date</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-md border outline-none ${
                    dark
                      ? 'bg-zinc-950 border-zinc-800 text-white focus:border-ember-500'
                      : 'bg-white border-stone-200 text-stone-900 focus:border-ember-600'
                  }`}
                />
              </div>
            </div>

            {/* Error */}
            {createError && (
              <p className="text-sm text-red-500">{createError}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleCreate}
              disabled={creating || !title.trim() || !startDate || !endDate}
              className={`w-full py-2.5 text-sm font-medium rounded-md transition-colors ${
                creating || !title.trim() || !startDate || !endDate
                  ? dark ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                  : dark
                    ? 'bg-white text-black hover:bg-stone-200'
                    : 'bg-ember-600 text-white hover:bg-ember-700'
              }`}
            >
              {creating ? 'Creating...' : 'Create Challenge'}
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className={`flex gap-0 border-b mb-6 ${
        dark ? 'border-zinc-800' : 'border-stone-200'
      }`}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              filter === tab.key
                ? dark
                  ? 'border-white text-white'
                  : 'border-ember-600 text-ember-600'
                : `border-transparent ${t.textDimmed} ${
                    dark ? 'hover:text-white' : 'hover:text-stone-900'
                  }`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Challenge grid */}
      {challenges.length === 0 && !loading ? (
        <div className={`p-12 border-2 border-dashed text-center rounded-lg ${
          dark ? 'border-zinc-800' : 'border-stone-200'
        }`}>
          <Trophy className={`w-8 h-8 mx-auto mb-3 ${dark ? 'text-zinc-500' : 'text-stone-400'}`} />
          <p className={t.textMuted}>
            {filter === 'all' ? 'No challenges yet.' :
             filter === 'active' ? 'No active challenges right now.' :
             filter === 'upcoming' ? 'No upcoming challenges.' :
             'No ended challenges.'}
          </p>
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className={`mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md ${
                dark
                  ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                  : 'bg-ember-600 text-white hover:bg-ember-700'
              }`}
            >
              <Plus className="w-4 h-4" />
              Create the first one
            </button>
          )}
        </div>
      ) : (
        <ChallengeGrid
          challenges={challenges}
          hasMore={hasMore}
          loading={loading}
          onLoadMore={fetchMore}
          theme={theme}
        />
      )}
    </div>
  );
}
