import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RecipeDetail, RecreationUpload, RecreationResult, RecreationLeaderboard, CommentsSection } from '../components/recipe';
import { useLikes, useFollows, useRecreation, useComments, usePageTitle, useDownloadedPresets } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { trackRecipeViewed } from '../lib/posthog';

/**
 * Recipe detail page — /recipe/:id
 * Fetches a public analysis by ID and displays it as a Sound Recipe.
 */
export function Recipe({ theme, t }) {
  const { id } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isLiked, toggleLike } = useLikes();
  const { isFollowing, toggleFollow } = useFollows();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const recreation = useRecreation();
  const { comments, commentCount, loading: commentsLoading, submitting: commentsSubmitting, addComment, editComment, deleteComment, adminDeleteComment } = useComments(id);
  const { hasCommunityDownload, trackCommunityDownload } = useDownloadedPresets();
  usePageTitle('Sound Sauce', recipe?.title || undefined);
  const viewTrackedRef = useRef(false);

  // Track recipe view once per mount
  useEffect(() => {
    if (id && !viewTrackedRef.current) {
      viewTrackedRef.current = true;
      trackRecipeViewed(id);
    }
  }, [id]);

  // Admin: toggle Staff Pick via /api/admin-actions
  const handleToggleFeature = useCallback(async () => {
    if (!recipe) return;
    const newFeatured = !recipe.is_featured;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');

      const res = await fetch('/api/admin-actions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'toggleFeature', analysisId: recipe.id, isFeatured: newFeatured }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to toggle staff pick');
      }

      setRecipe(prev => ({ ...prev, is_featured: newFeatured }));
    } catch (err) {
      alert(`Failed to toggle staff pick: ${err.message}`);
    }
  }, [recipe]);

  // Admin: unpublish recipe via /api/admin-actions
  const handleUnpublish = useCallback(async () => {
    if (!window.confirm(`Unpublish "${recipe?.title || 'Untitled'}"? It will no longer be visible publicly.`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');

      const res = await fetch('/api/admin-actions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'unpublish', analysisId: recipe.id }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to unpublish');
      }

      navigate('/discover');
    } catch (err) {
      alert(`Failed to unpublish: ${err.message}`);
    }
  }, [recipe, navigate]);

  useEffect(() => {
    async function fetchRecipe() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('analyses')
        .select('*, profiles:user_id(username, display_name, avatar_url)')
        .eq('id', id)
        .eq('is_public', true)
        .single();

      if (fetchError || !data) {
        setError('Recipe not found or is private.');
      } else {
        setRecipe(data);
      }
      setLoading(false);
    }

    if (id) fetchRecipe();
  }, [id]);

  if (loading) {
    const bg = theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200';
    const bgSubtle = theme === 'dark' ? 'bg-zinc-800/60' : 'bg-stone-100';
    const cardBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200';
    return (
      <div className="max-w-4xl mx-auto">
        {/* Header card skeleton */}
        <div className={`p-6 border rounded-lg animate-pulse mb-4 ${cardBg}`}>
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-10 h-10 rounded-full ${bg} flex-shrink-0`} />
            <div className="flex-1 space-y-2">
              <div className={`h-6 w-2/3 rounded ${bg}`} />
              <div className={`h-3.5 w-32 rounded ${bgSubtle}`} />
            </div>
          </div>
          <div className={`h-3 w-full rounded ${bgSubtle} mb-2`} />
          <div className={`h-3 w-4/5 rounded ${bgSubtle} mb-4`} />
          <div className="flex gap-2">
            {[1, 2, 3].map(i => <div key={i} className={`h-6 w-14 rounded-full ${bgSubtle}`} />)}
          </div>
        </div>
        {/* Collapsible sections skeleton */}
        {[1, 2].map(i => (
          <div key={i} className={`p-5 border rounded-lg animate-pulse mb-4 ${cardBg}`}>
            <div className={`h-5 w-40 rounded ${bg} mb-3`} />
            <div className={`h-3 w-full rounded ${bgSubtle} mb-2`} />
            <div className={`h-3 w-3/4 rounded ${bgSubtle}`} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className={`p-8 text-center border ${
          theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'
        }`}>
          <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${t.textDimmed}`} />
          <p className={`text-lg font-medium mb-2 ${t.text}`}>{error}</p>
          <Link
            to="/discover"
            className={`inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium ${
              theme === 'dark'
                ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                : 'bg-ember-600 text-white hover:opacity-90'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Browse Recipes
          </Link>
        </div>
      </div>
    );
  }

  const cardClass = theme === 'dark'
    ? 'bg-zinc-900 border border-zinc-800'
    : 'bg-white border border-stone-200';

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <RecipeDetail
        recipe={recipe}
        theme={theme}
        t={t}
        liked={isLiked(recipe.id)}
        onToggleLike={toggleLike}
        isFollowingAuthor={isFollowing(recipe.user_id)}
        onToggleFollow={toggleFollow}
        currentUserId={user?.id}
        hasCommunityDownload={hasCommunityDownload}
        onTrackCommunityDownload={trackCommunityDownload}
        isAdmin={isAdmin}
        onUnpublish={handleUnpublish}
        onToggleFeature={handleToggleFeature}
      />

      {/* Comments Section */}
      <div className={`p-6 ${cardClass}`}>
        <CommentsSection
          comments={comments}
          commentCount={commentCount}
          loading={commentsLoading}
          submitting={commentsSubmitting}
          onAddComment={addComment}
          onEditComment={editComment}
          onDeleteComment={deleteComment}
          onAdminDeleteComment={isAdmin ? adminDeleteComment : undefined}
          isAdmin={isAdmin}
          theme={theme}
        />
      </div>

      {/* Recreation Section */}
      {recipe.audio_url && (
        <div className={`p-6 ${cardClass}`}>
          <h2 className={`text-lg font-bold mb-4 ${t.text}`}>Try to Recreate This Sound</h2>
          {recreation.result ? (
            <div className="space-y-4">
              <RecreationResult result={recreation.result} theme={theme} />
              <button
                onClick={recreation.reset}
                className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-400 hover:text-ember-600'
                }`}
              >
                Try again
              </button>
            </div>
          ) : (
            <RecreationUpload
              onUpload={(file) => recreation.submitRecreation(recipe.id, recipe.audio_url, file)}
              isProcessing={recreation.isProcessing}
              progress={recreation.progress}
              theme={theme}
            />
          )}
          {recreation.error && (
            <p className="text-red-500 text-sm mt-2">{recreation.error}</p>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className={`p-6 ${cardClass}`}>
        <RecreationLeaderboard analysisId={recipe.id} theme={theme} />
      </div>
    </div>
  );
}
