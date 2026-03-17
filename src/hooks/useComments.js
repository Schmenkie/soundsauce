import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { trackCommentPosted } from '../lib/posthog';

/**
 * Build a tree of comments from flat DB rows.
 * Top-level comments (parent_id === null) become roots.
 * Replies are nested under their parent as `replies` arrays.
 */
function buildCommentTree(flatComments) {
  const map = new Map();
  const roots = [];

  // First pass: index all comments by id with empty replies array
  for (const c of flatComments) {
    map.set(c.id, { ...c, replies: [] });
  }

  // Second pass: attach children to parents
  for (const c of flatComments) {
    const node = map.get(c.id);
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id).replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Hook for managing comments on a Sound Recipe.
 * Fetches comments for a given analysis ID and provides
 * add/edit/delete with optimistic updates. Builds a tree
 * structure from flat DB rows for threaded display.
 */
export function useComments(analysisId) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fetchIdRef = useRef(0);

  // Build threaded tree from flat comment list
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  // Fetch comments for this recipe
  useEffect(() => {
    if (!analysisId) return;

    const fetchId = ++fetchIdRef.current;
    let cancelled = false;

    async function fetchComments() {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles:user_id(username, display_name, avatar_url, is_admin)')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: true });

      if (cancelled || fetchId !== fetchIdRef.current) return;

      if (!error && data) {
        setComments(data);
      } else if (error) {
        console.error('Failed to fetch comments:', error);
      }
      setLoading(false);
    }

    fetchComments();
    return () => { cancelled = true; };
  }, [analysisId]);

  // Add a new comment (optionally as a reply)
  const addComment = useCallback(async (content, parentId = null) => {
    if (!user || !analysisId || !content.trim()) return false;

    setSubmitting(true);

    const insertData = {
      user_id: user.id,
      analysis_id: analysisId,
      content: content.trim(),
    };
    if (parentId) insertData.parent_id = parentId;

    const { data, error } = await supabase
      .from('comments')
      .insert(insertData)
      .select('*, profiles:user_id(username, display_name, avatar_url, is_admin)')
      .single();

    if (!error && data) {
      setComments(prev => [...prev, data]);
      trackCommentPosted(analysisId, !!parentId);
      setSubmitting(false);
      return true;
    } else {
      console.error('Failed to add comment:', error);
      setSubmitting(false);
      return false;
    }
  }, [user, analysisId]);

  // Edit an existing comment
  const editComment = useCallback(async (commentId, newContent) => {
    if (!user || !newContent.trim()) return false;

    // Capture snapshot via functional updater to avoid stale closure
    let snapshot;
    setComments(prev => {
      snapshot = prev;
      return prev.map(cm =>
        cm.id === commentId ? { ...cm, content: newContent.trim(), updated_at: new Date().toISOString() } : cm
      );
    });

    const { error } = await supabase
      .from('comments')
      .update({ content: newContent.trim() })
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to edit comment:', error);
      setComments(snapshot);
      return false;
    }
    return true;
  }, [user]);

  // Delete a comment (and its replies will be orphaned/hidden)
  const deleteComment = useCallback(async (commentId) => {
    if (!user) return false;

    // Capture snapshot via functional updater to avoid stale closure
    let snapshot;
    setComments(prev => {
      snapshot = prev;
      // Remove the comment and any replies to it
      const idsToRemove = new Set([commentId]);
      // Gather all descendant IDs
      let changed = true;
      while (changed) {
        changed = false;
        for (const cm of prev) {
          if (cm.parent_id && idsToRemove.has(cm.parent_id) && !idsToRemove.has(cm.id)) {
            idsToRemove.add(cm.id);
            changed = true;
          }
        }
      }
      return prev.filter(cm => !idsToRemove.has(cm.id));
    });

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete comment:', error);
      setComments(snapshot);
      return false;
    }
    return true;
  }, [user]);

  // Admin delete — bypasses RLS via /api/admin-actions endpoint
  const adminDeleteComment = useCallback(async (commentId) => {
    if (!user) return false;

    // Optimistic removal with snapshot rollback (same pattern as deleteComment)
    let snapshot;
    setComments(prev => {
      snapshot = prev;
      const idsToRemove = new Set([commentId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const cm of prev) {
          if (cm.parent_id && idsToRemove.has(cm.parent_id) && !idsToRemove.has(cm.id)) {
            idsToRemove.add(cm.id);
            changed = true;
          }
        }
      }
      return prev.filter(cm => !idsToRemove.has(cm.id));
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');

      const res = await fetch('/api/admin-actions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'deleteComment', commentId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete comment');
      }
      return true;
    } catch (err) {
      console.error('Admin delete comment failed:', err);
      setComments(snapshot);
      return false;
    }
  }, [user]);

  return {
    comments: commentTree,
    loading,
    submitting,
    addComment,
    editComment,
    deleteComment,
    adminDeleteComment,
    commentCount: comments.length,
  };
}
