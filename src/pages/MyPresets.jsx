import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Download, Sliders, User, Check, Library, Package } from 'lucide-react';
import { SkeletonCard, SkeletonBlock, SkeletonPill } from '../components/ui/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle, useDownloadedPresets } from '../hooks';
// Lazy-loaded — only fetched when user downloads a preset
const getPresetGenerator = () => import('../services/vitalPresetGenerator');
import { CURATED_PRESETS, PRESET_CATEGORIES } from '../data/vitalPresets';
import { sanitize } from '../utils/sanitize';
import { AuthModal } from '../components/auth';

function getRelativeTime(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffMonth > 0) return `${diffMonth}mo ago`;
  if (diffWeek > 0) return `${diffWeek}w ago`;
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'just now';
}

function PresetCardSkeleton({ theme }) {
  return (
    <SkeletonCard theme={theme}>
      <div className="flex items-center gap-2 mb-3">
        <SkeletonBlock theme={theme} className="h-4 w-1/2" />
        <SkeletonPill theme={theme} subtle className="h-5 w-14" />
      </div>
      <SkeletonBlock theme={theme} subtle className="h-3 w-full mb-2" />
      <SkeletonBlock theme={theme} subtle className="h-3 w-3/4 mb-3" />
      <SkeletonBlock theme={theme} className="h-9 w-28" />
    </SkeletonCard>
  );
}

/**
 * My Presets page - Two tabs: "Starter Presets" (40 curated) and "My Collection" (community downloads).
 * Accessible from sidebar navigation.
 */
export function MyPresets({ theme, t }) {
  usePageTitle('My Presets');
  const { user, loading: authLoading } = useAuth();
  const { curatedDownloads, communityDownloads, loading: downloadsLoading, trackCuratedDownload } = useDownloadedPresets();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('starter');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const cardClass = theme === 'dark'
    ? 'bg-zinc-900 border-zinc-700'
    : 'bg-white border-stone-200';

  // Count presets per category for pill labels
  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const cat of PRESET_CATEGORIES) {
      counts[cat.id] = CURATED_PRESETS.filter(p => p.category === cat.id).length;
    }
    return counts;
  }, []);

  // Filter curated presets by selected category
  const filteredPresets = useMemo(() => {
    if (selectedCategory === 'all') return CURATED_PRESETS;
    return CURATED_PRESETS.filter(p => p.category === selectedCategory);
  }, [selectedCategory]);

  const collectionCount = curatedDownloads.length + communityDownloads.length;

  // Guest view - sign in prompt
  if (!authLoading && !user) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${t.text}`}>My Presets</h1>
          <p className={t.textMuted}>Browse and download Vital presets</p>
        </div>

        <div className={`p-8 border rounded-lg ${cardClass}`}>
          <div className="text-center">
            <Sliders className={`w-10 h-10 mx-auto mb-4 ${t.textDimmed}`} />
            <h2 className={`text-xl font-bold mb-2 ${t.text}`}>Sign in to view your presets</h2>
            <p className={`text-sm mb-6 ${t.textMuted}`}>
              Create an account to track your downloaded presets and access them anytime.
            </p>
            <button
              onClick={() => setAuthModalOpen(true)}
              className={`px-6 py-3 font-medium rounded-md ${
                theme === 'dark'
                  ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
                  : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-500/20'
              }`}
            >
              Sign In / Create Account
            </button>
          </div>
        </div>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          theme={theme}
        />
      </div>
    );
  }

  // Loading state — skeleton cards
  if (downloadsLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${t.text}`}>My Presets</h1>
          <p className={t.textMuted}>Browse and download Vital presets</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <PresetCardSkeleton key={i} theme={theme} />
          ))}
        </div>
      </div>
    );
  }

  // Main view with tabs
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className={`text-3xl font-bold mb-2 ${t.text}`}>My Presets</h1>
        <p className={t.textMuted}>Browse and download Vital presets</p>
      </div>

      {/* Tab bar */}
      <div className={`flex gap-1 mb-6 p-1 rounded-lg ${theme === 'dark' ? 'bg-zinc-900' : 'bg-stone-100'}`}>
        <button
          onClick={() => setActiveTab('starter')}
          className={`flex items-center gap-2 flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'starter'
              ? theme === 'dark'
                ? 'bg-zinc-800 text-white'
                : 'bg-white text-stone-900 shadow-sm'
              : theme === 'dark'
                ? 'text-zinc-400 hover:text-white'
                : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <Package className="w-4 h-4" />
          Starter Presets
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            activeTab === 'starter'
              ? theme === 'dark' ? 'bg-zinc-700' : 'bg-stone-100'
              : theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'
          }`}>
            {CURATED_PRESETS.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('collection')}
          className={`flex items-center gap-2 flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'collection'
              ? theme === 'dark'
                ? 'bg-zinc-800 text-white'
                : 'bg-white text-stone-900 shadow-sm'
              : theme === 'dark'
                ? 'text-zinc-400 hover:text-white'
                : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <Library className="w-4 h-4" />
          My Collection
          {collectionCount > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'collection'
                ? theme === 'dark' ? 'bg-zinc-700' : 'bg-stone-100'
                : theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'
            }`}>
              {collectionCount}
            </span>
          )}
        </button>
      </div>

      {/* === STARTER PRESETS TAB === */}
      {activeTab === 'starter' && (
        <div className="space-y-4">
          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                selectedCategory === 'all'
                  ? theme === 'dark'
                    ? 'bg-ember-500 text-zinc-950'
                    : 'bg-ember-600 text-white'
                  : theme === 'dark'
                    ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                    : 'bg-amber-50 text-ember-700 hover:bg-amber-100'
              }`}
            >
              All ({CURATED_PRESETS.length})
            </button>
            {PRESET_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  selectedCategory === cat.id
                    ? theme === 'dark'
                      ? 'bg-ember-500 text-zinc-950'
                      : 'bg-ember-600 text-white'
                    : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                      : 'bg-amber-50 text-ember-700 hover:bg-amber-100'
                }`}
              >
                {cat.label} ({categoryCounts[cat.id] || 0})
              </button>
            ))}
          </div>

          {/* Preset cards */}
          <div className="space-y-2">
            {filteredPresets.map((preset) => {
              const category = PRESET_CATEGORIES.find(c => c.id === preset.category);
              const isDownloaded = curatedDownloads.some(d => d.presetId === preset.id);

              return (
                <div
                  key={preset.id}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${cardClass} ${
                    theme === 'dark' ? 'hover:border-zinc-600' : 'hover:border-ember-600'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${t.text}`}>
                        {preset.name}
                      </span>
                      {category && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-50 text-ember-700'
                        }`}>
                          {category.label}
                        </span>
                      )}
                      {isDownloaded && (
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                          theme === 'dark' ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
                        }`}>
                          <Check className="w-3 h-3" />
                          Downloaded
                        </span>
                      )}
                    </div>
                    {preset.description && (
                      <p className={`text-xs mt-0.5 line-clamp-1 ${t.textDimmed}`}>
                        {preset.description}
                      </p>
                    )}
                    {preset.matchReason && (
                      <p className={`text-xs mt-0.5 line-clamp-1 ${t.textDimmed} italic`}>
                        {preset.matchReason}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      const { buildVitalPreset, downloadVitalPreset, buildPresetFilename } = await getPresetGenerator();
                      const categoryLabel = preset.category ? preset.category.charAt(0).toUpperCase() + preset.category.slice(1) : '';
                      const built = buildVitalPreset(preset.id, {}, {
                        instrument: categoryLabel,
                        presetName: preset.name || 'SoundSauce Export',
                      });
                      const filename = buildPresetFilename({
                        instrument: categoryLabel,
                        presetName: preset.name,
                      });
                      downloadVitalPreset(built, filename);
                      trackCuratedDownload(preset.id, preset.name);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all flex-shrink-0 ml-3 ${
                      theme === 'dark'
                        ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                        : 'bg-ember-600 text-white hover:bg-ember-700'
                    }`}
                  >
                    <Download className="w-3 h-3" />
                    {isDownloaded ? 'Re-download' : 'Download'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === MY COLLECTION TAB === */}
      {activeTab === 'collection' && (
        <div className="space-y-6">
          {/* Empty state */}
          {collectionCount === 0 && (
            <div className={`p-8 border rounded-lg text-center ${cardClass}`}>
              <Library className={`w-10 h-10 mx-auto mb-4 ${t.textDimmed}`} />
              <h3 className={`text-lg font-bold mb-2 ${t.text}`}>No presets in your collection yet</h3>
              <p className={`text-sm mb-4 ${t.textMuted}`}>
                Download starter presets or browse community presets on Sound Sauce pages to build your collection.
              </p>
              <button
                onClick={() => setActiveTab('starter')}
                className={`px-5 py-2.5 font-medium rounded-md ${
                  theme === 'dark'
                    ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                    : 'bg-ember-600 text-white hover:bg-ember-700'
                }`}
              >
                Browse Starter Presets
              </button>
            </div>
          )}

          {/* Downloaded curated presets */}
          {curatedDownloads.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sliders className={`w-4 h-4 ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`} />
                <h3 className={`text-sm font-bold ${t.text}`}>Downloaded Starter Presets</h3>
                <span className={`text-xs ${t.textDimmed}`}>({curatedDownloads.length})</span>
              </div>
              <div className="space-y-2">
                {curatedDownloads.map((dl) => {
                  const preset = CURATED_PRESETS.find(p => p.id === dl.presetId);
                  const category = preset ? PRESET_CATEGORIES.find(c => c.id === preset.category) : null;
                  return (
                    <div
                      key={dl.presetId}
                      className={`flex items-center justify-between p-4 border rounded-lg ${cardClass}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${t.text}`}>{dl.presetName || dl.presetId}</span>
                          {category && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-50 text-ember-700'
                            }`}>
                              {category.label}
                            </span>
                          )}
                        </div>
                        <div className={`text-xs mt-1 ${t.textDimmed}`}>
                          Downloaded {getRelativeTime(dl.downloadedAt)}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (preset) {
                            const { buildVitalPreset, downloadVitalPreset, buildPresetFilename } = await getPresetGenerator();
                            const categoryLabel = preset.category ? preset.category.charAt(0).toUpperCase() + preset.category.slice(1) : '';
                            const built = buildVitalPreset(preset.id, {}, {
                              instrument: categoryLabel,
                              presetName: preset.name || 'SoundSauce Export',
                            });
                            const filename = buildPresetFilename({
                              instrument: categoryLabel,
                              presetName: preset.name,
                            });
                            downloadVitalPreset(built, filename);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all flex-shrink-0 ml-3 ${
                          theme === 'dark'
                            ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                            : 'bg-stone-900 text-white hover:bg-stone-800'
                        }`}
                      >
                        <Download className="w-3 h-3" />
                        Re-download
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Community downloads */}
          {communityDownloads.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className={`w-4 h-4 ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`} />
                <h3 className={`text-sm font-bold ${t.text}`}>Community Presets</h3>
                <span className={`text-xs ${t.textDimmed}`}>({communityDownloads.length})</span>
              </div>
              <div className="space-y-2">
                {communityDownloads.map((dl) => {
                  const analysis = dl.analyses;
                  if (!analysis) return null;
                  return (
                    <div
                      key={dl.id}
                      className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${cardClass} ${
                        theme === 'dark' ? 'hover:border-zinc-600' : 'hover:border-ember-600'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/recipe/${analysis.id}`}
                          className={`font-medium text-sm hover:underline ${t.text}`}
                        >
                          {sanitize(analysis.title || 'Untitled')}
                        </Link>
                        {analysis.profiles && (
                          <div className={`flex items-center gap-1.5 mt-0.5 ${t.textDimmed}`}>
                            <Link
                              to={`/user/${sanitize(analysis.profiles.username || '')}`}
                              className="flex items-center gap-1.5 hover:underline"
                            >
                              {analysis.profiles.avatar_url ? (
                                <img src={analysis.profiles.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                              ) : (
                                <User className="w-3.5 h-3.5" />
                              )}
                              <span className="text-xs">{sanitize(analysis.profiles.username || 'Anonymous')}</span>
                            </Link>
                          </div>
                        )}
                        {analysis.description && (
                          <p className={`text-xs mt-1 line-clamp-1 ${t.textDimmed}`}>
                            {sanitize(analysis.description)}
                          </p>
                        )}
                        <div className={`text-xs mt-1 ${t.textDimmed}`}>
                          Downloaded {getRelativeTime(dl.created_at)}
                        </div>
                      </div>
                      {analysis.vital_preset_url && (
                        <button
                          onClick={async () => { const { downloadRemotePreset } = await getPresetGenerator(); downloadRemotePreset(analysis.vital_preset_url, sanitize(analysis.title || 'preset')); }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all flex-shrink-0 ml-3 ${
                            theme === 'dark'
                              ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                              : 'bg-stone-900 text-white hover:bg-stone-800'
                          }`}
                        >
                          <Download className="w-3 h-3" />
                          Re-download
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
