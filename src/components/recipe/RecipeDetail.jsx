import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { User, Clock, Tag, Music, Zap, BarChart2, ArrowLeft, Download, Sliders, ExternalLink, CheckCircle, ChevronDown, Shield, EyeOff, Award, Heart, MessageSquare, Hash } from 'lucide-react';
import { LikeButton } from './LikeButton';
import { FollowButton } from './FollowButton';
import { supabase } from '../../lib/supabase';
import { trackPresetDownloaded } from '../../lib/posthog';
// Lazy-loaded — only fetched when user downloads a preset
const getPresetGenerator = () => import('../../services/vitalPresetGenerator');
import { sanitize } from '../../utils/sanitize';
import { findCuratedPresetForRecipe } from '../../data/vitalPresets';

/**
 * Full recipe detail view.
 * Displays recipe metadata (author, description, tags) plus
 * key analysis results from the stored results jsonb.
 */
export function RecipeDetail({ recipe, theme, t, liked, onToggleLike, isFollowingAuthor, onToggleFollow, currentUserId, hasCommunityDownload, onTrackCommunityDownload, isAdmin, onUnpublish, onToggleFeature }) {
  const profile = recipe.profiles;
  const features = recipe.results?.features || {};
  const recommendations = recipe.results?.recommendations || {};
  const detectedInstruments = recipe.results?.detectedInstruments || {};
  const isPresetPost = recipe.post_type === 'preset';
  const hasAnalysisData = features && Object.keys(features).length > 0;
  const [localDownloadCount, setLocalDownloadCount] = useState(recipe.download_count || 0);

  const alreadyDownloaded = hasCommunityDownload?.(recipe.id);

  // Fallback: find a curated preset for seed recipes that lack a vital_preset_url
  const fallbackPreset = useMemo(() => {
    if (recipe.vital_preset_url) return null;
    return findCuratedPresetForRecipe(recipe);
  }, [recipe]);

  async function handleDownload() {
    // Always trigger the file download and analytics
    trackPresetDownloaded(recipe.id);
    if (recipe.vital_preset_url) {
      const { downloadRemotePreset, buildPresetFilename } = await getPresetGenerator();
      // Build clean filename with recipe title and author info
      const authorName = profile?.username || 'SoundSauce';
      const filename = buildPresetFilename({ presetName: recipe.title });
      downloadRemotePreset(recipe.vital_preset_url, filename, {
        preset_name: recipe.title || 'Community Preset',
        author: authorName,
        comments: `${recipe.title || 'Untitled'} by ${authorName}. Downloaded from SoundSauce (soundsauce.app).`,
      });
    } else if (fallbackPreset) {
      // Build preset client-side from curated preset data
      const { buildVitalPreset, downloadVitalPreset, buildPresetFilename } = await getPresetGenerator();
      const preset = buildVitalPreset(fallbackPreset.presetId, {}, {
        presetName: fallbackPreset.preset.name,
        audioTitle: recipe.title,
      });
      const filename = buildPresetFilename({
        presetName: fallbackPreset.preset.name,
        audioTitle: recipe.title,
      });
      downloadVitalPreset(preset, filename);
    }

    // Skip count increment and DB insert if already downloaded
    if (alreadyDownloaded) return;

    setLocalDownloadCount(prev => prev + 1);
    if (onTrackCommunityDownload) {
      onTrackCommunityDownload(recipe.id);
    } else {
      supabase
        .from('downloads')
        .insert({ analysis_id: recipe.id, user_id: currentUserId || null })
        .then(() => {})
        .catch(() => {});
    }
  }

  const cardClass = theme === 'dark'
    ? 'bg-zinc-900 border border-zinc-700 rounded-lg'
    : 'bg-white border border-stone-200 rounded-lg';

  const tagClass = theme === 'dark'
    ? 'bg-zinc-800 text-zinc-400 rounded-full'
    : 'bg-amber-50 text-ember-700 rounded-full';

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/discover"
        className={`inline-flex items-center gap-2 text-sm font-medium ${t.textMuted} hover:${t.text} transition-colors`}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Discover
      </Link>

      {/* Header: Title + Author */}
      <div className={`p-6 ${cardClass}`}>
        <h1 className={`text-2xl font-bold mb-3 ${t.text}`}>{sanitize(recipe.title)}</h1>

        {recipe.description && (
          <p className={`mb-4 ${t.textMuted}`}>{sanitize(recipe.description)}</p>
        )}

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.tags.map(tag => (
              <span key={tag} className={`px-3 py-1 text-sm font-medium ${tagClass}`}>
                <Tag className="w-3 h-3 inline mr-1" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Author + Date */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            to={profile?.username ? `/user/${profile.username}` : '#'}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-8 h-8 object-cover rounded-full" />
            ) : (
              <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-full ${
                theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-amber-50 text-ember-700'
              }`}>
                {(profile?.display_name || profile?.username || '?')[0].toUpperCase()}
              </div>
            )}
            <span className={`font-medium ${t.text}`}>{sanitize(profile?.display_name || profile?.username || 'Anonymous')}</span>
          </Link>
          {onToggleFollow && currentUserId && recipe.user_id !== currentUserId && (
            <FollowButton
              following={isFollowingAuthor}
              onToggle={() => onToggleFollow(recipe.user_id)}
              theme={theme}
            />
          )}
          <div className="flex items-center gap-1">
            <Clock className={`w-4 h-4 ${t.textDimmed}`} />
            <span className={`text-sm ${t.textDimmed}`}>
              {new Date(recipe.created_at).toLocaleDateString()}
            </span>
          </div>
          {isPresetPost ? (
            <div className="flex items-center gap-1">
              <Sliders className={`w-4 h-4 ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`} />
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`}>
                Preset
              </span>
            </div>
          ) : recipe.instrument && recipe.instrument !== 'full' ? (
            <div className="flex items-center gap-1">
              <Music className={`w-4 h-4 ${t.textDimmed}`} />
              <span className={`text-sm ${t.textDimmed}`}>
                {recipe.instrument.charAt(0).toUpperCase() + recipe.instrument.slice(1)}
              </span>
            </div>
          ) : null}
          {onToggleLike && (
            <LikeButton
              liked={liked}
              likeCount={recipe.like_count || 0}
              onToggle={() => onToggleLike(recipe.id)}
              theme={theme}
            />
          )}
          {(recipe.vital_preset_url || fallbackPreset) && (
            <>
              <button
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md ${
                  theme === 'dark'
                    ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                    : 'bg-ember-600 text-white hover:bg-ember-700 shadow-sm shadow-ember-500/20'
                }`}
                onClick={handleDownload}
              >
                <Download className="w-3.5 h-3.5" />
                {fallbackPreset && !recipe.vital_preset_url
                  ? `Vital Preset (${fallbackPreset.preset.name})`
                  : 'Vital Preset'}
                {localDownloadCount > 0 && (
                  <span className="text-xs opacity-80">({localDownloadCount})</span>
                )}
              </button>
              {alreadyDownloaded && (
                <span className={`inline-flex items-center gap-1 text-xs ${
                  theme === 'dark' ? 'text-zinc-400' : 'text-stone-500'
                }`}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Already in your library
                </span>
              )}
            </>
          )}
        </div>

        {/* Staff Pick badge (visible to all) */}
        {recipe.is_featured && (
          <div className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1 text-sm font-bold rounded-full ${
            theme === 'dark' ? 'bg-ember-500/15 text-ember-500' : 'bg-ember-600/10 text-ember-600'
          }`}>
            <Award className="w-4 h-4" />
            Staff Pick
          </div>
        )}

        {/* Admin actions */}
        {isAdmin && (
          <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-zinc-700' : 'border-stone-200'}`}>
            <div className="flex items-center gap-3 flex-wrap">
              <Shield className={`w-4 h-4 ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`} />
              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`}>Admin</span>
              <button
                onClick={onToggleFeature}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  recipe.is_featured
                    ? theme === 'dark'
                      ? 'bg-ember-500/20 text-ember-500 hover:bg-ember-500/30'
                      : 'bg-ember-600/10 text-ember-600 hover:bg-ember-600/20'
                    : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 hover:text-ember-500 hover:bg-zinc-800'
                      : 'bg-amber-50 text-stone-400 hover:text-ember-600 hover:bg-amber-100'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                {recipe.is_featured ? 'Remove Staff Pick' : 'Staff Pick'}
              </button>
              <button
                onClick={onUnpublish}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  theme === 'dark'
                    ? 'bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-950'
                    : 'bg-amber-50 text-stone-400 hover:text-red-500 hover:bg-red-50'
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                Unpublish
              </button>
            </div>

            {/* Admin Stats Overlay */}
            <div className={`mt-3 pt-3 border-t ${theme === 'dark' ? 'border-zinc-700' : 'border-stone-200'} grid grid-cols-5 gap-3`}>
              <div className="text-center">
                <div className={`text-xs ${t.textDimmed}`}>Likes</div>
                <div className={`text-sm font-bold flex items-center justify-center gap-1 ${t.text}`}>
                  <Heart className="w-3 h-3" />
                  {recipe.like_count || 0}
                </div>
              </div>
              <div className="text-center">
                <div className={`text-xs ${t.textDimmed}`}>Downloads</div>
                <div className={`text-sm font-bold flex items-center justify-center gap-1 ${t.text}`}>
                  <Download className="w-3 h-3" />
                  {localDownloadCount}
                </div>
              </div>
              <div className="text-center">
                <div className={`text-xs ${t.textDimmed}`}>Comments</div>
                <div className={`text-sm font-bold flex items-center justify-center gap-1 ${t.text}`}>
                  <MessageSquare className="w-3 h-3" />
                  {recipe.comment_count || 0}
                </div>
              </div>
              <div className="text-center">
                <div className={`text-xs ${t.textDimmed}`}>Published</div>
                <div className={`text-sm font-bold ${t.text}`}>
                  {new Date(recipe.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="text-center">
                <div className={`text-xs ${t.textDimmed}`}>ID</div>
                <div className={`text-xs font-mono ${t.textDimmed} truncate`} title={recipe.id}>
                  {recipe.id?.slice(0, 8)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vital explainer for regular recipes with preset */}
      {!isPresetPost && (recipe.vital_preset_url || fallbackPreset) && (
        <div className={`px-4 py-3 flex items-center gap-2 text-xs rounded-lg ${
          theme === 'dark' ? 'bg-zinc-900 border border-zinc-700' : 'bg-amber-50 border border-stone-200'
        } ${t.textMuted}`}>
          <Sliders className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            This Sound Sauce includes a <strong className={t.text}>Vital</strong> synth preset.
            Don't have Vital?{' '}
            <a
              href="https://vital.audio/"
              target="_blank"
              rel="noopener noreferrer"
              className={`font-medium inline-flex items-center gap-0.5 ${theme === 'dark' ? 'text-ember-500 hover:underline' : 'text-ember-600 hover:underline'}`}
            >
              Download it free <ExternalLink className="w-3 h-3" />
            </a>
          </span>
        </div>
      )}

      {/* Preset Download Card (for standalone preset posts) */}
      {isPresetPost && recipe.vital_preset_url && (
        <div className={`p-6 ${cardClass}`}>
          <div className="flex items-center gap-2 mb-4">
            <Sliders className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
            <h2 className={`text-xl font-bold ${t.text}`}>Vital Preset</h2>
          </div>
          <p className={`text-sm mb-4 ${t.textMuted}`}>
            Download this preset and load it into <strong className={t.text}>Vital</strong> to try it out.
            Vital is a free, powerful wavetable synthesizer — perfect for recreating sounds from SoundSauce.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-md ${
                theme === 'dark'
                  ? 'bg-white text-black hover:bg-zinc-200'
                  : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-500/20'
              }`}
              onClick={handleDownload}
            >
              <Download className="w-4 h-4" />
              Download Preset
              {localDownloadCount > 0 && (
                <span className="text-xs opacity-80">({localDownloadCount})</span>
              )}
            </button>
            {alreadyDownloaded && (
              <span className={`inline-flex items-center gap-1 text-xs ${
                theme === 'dark' ? 'text-zinc-400' : 'text-stone-500'
              }`}>
                <CheckCircle className="w-3.5 h-3.5" />
                Already in your library
              </span>
            )}
            <a
              href="https://vital.audio/"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                theme === 'dark'
                  ? 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                  : 'bg-amber-50 text-ember-600 hover:bg-amber-100'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Get Vital (Free)
            </a>
          </div>
        </div>
      )}

      {/* Sound Sauce — collapsible */}
      {hasAnalysisData && recommendations.synthType && (
        <CollapsibleSection title="Sound Sauce" icon={Zap} theme={theme} t={t} cardClass={cardClass}>
          <div className="space-y-3">
            {recommendations.synthType.map((rec, i) => (
              <div key={i} className={`p-3 border rounded-md ${
                theme === 'dark' ? 'bg-zinc-950 border-zinc-700' : 'bg-stone-50 border-stone-200'
              } ${t.text}`}>
                {rec}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Key Analysis Features — collapsible */}
      {hasAnalysisData && (
        <CollapsibleSection title="Analysis Details" icon={BarChart2} theme={theme} t={t} cardClass={cardClass}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {features.bpm?.bpm && (
              <FeatureItem
                label="BPM"
                value={features.bpm.suggestedTempo || features.bpm.bpm}
                theme={theme}
                t={t}
              />
            )}
            {features.key?.key && (
              <FeatureItem
                label="Key"
                value={`${features.key.key} ${features.key.mode}`}
                theme={theme}
                t={t}
              />
            )}
            {features.brightness !== undefined && (
              <FeatureItem
                label="Brightness"
                value={`${(parseFloat(features.brightness) * 100).toFixed(0)}%`}
                theme={theme}
                t={t}
              />
            )}
            {features.rms !== undefined && (
              <FeatureItem
                label="RMS Level"
                value={`${(parseFloat(features.rms) * 100).toFixed(0)}%`}
                theme={theme}
                t={t}
              />
            )}
            {features.adsr && (
              <>
                <FeatureItem
                  label="Attack"
                  value={`${features.adsr.attack}ms`}
                  theme={theme}
                  t={t}
                />
                <FeatureItem
                  label="Release"
                  value={`${features.adsr.release}ms`}
                  theme={theme}
                  t={t}
                />
              </>
            )}
            {features.waveform?.type && (
              <FeatureItem
                label="Waveform"
                value={features.waveform.type.charAt(0).toUpperCase() + features.waveform.type.slice(1)}
                theme={theme}
                t={t}
              />
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Detected Instruments — collapsible */}
      {hasAnalysisData && detectedInstruments?.detected?.length > 0 && (
        <CollapsibleSection title="Detected Instruments" icon={Music} theme={theme} t={t} cardClass={cardClass}>
          <div className="flex flex-wrap gap-2">
            {detectedInstruments.detected.map((inst, i) => (
              <span key={i} className={`px-3 py-1.5 text-sm font-medium ${tagClass}`}>
                {inst.name} ({inst.confidence}%)
              </span>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Mix Tips — collapsible */}
      {hasAnalysisData && recommendations.mixTips && recommendations.mixTips.length > 0 && (
        <CollapsibleSection title="Mix Tips" icon={Zap} theme={theme} t={t} cardClass={cardClass}>
          <div className="space-y-2">
            {recommendations.mixTips.map((tip, i) => (
              <div key={i} className={`p-3 border rounded-md ${
                theme === 'dark' ? 'bg-zinc-950 border-zinc-700' : 'bg-stone-50 border-stone-200'
              } text-sm ${t.textMuted}`}>
                {tip}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

/**
 * Collapsible card section — collapsed by default, click header to expand.
 * Used for analysis content sections on recipe detail pages.
 */
function CollapsibleSection({ title, icon: Icon, theme, t, cardClass, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`${cardClass} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
          <h2 className={`text-lg font-bold ${t.text}`}>{title}</h2>
        </div>
        <ChevronDown className={`w-5 h-5 ${t.textMuted} transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-6">
          {children}
        </div>
      )}
    </div>
  );
}

function FeatureItem({ label, value, theme, t }) {
  return (
    <div className={`p-3 border rounded-lg ${
      theme === 'dark' ? 'bg-zinc-950 border-zinc-700' : 'bg-stone-50 border-stone-200'
    }`}>
      <div className={`text-xs font-medium mb-1 ${t.textDimmed}`}>{label}</div>
      <div className={`text-lg font-bold ${t.text}`}>{value}</div>
    </div>
  );
}
