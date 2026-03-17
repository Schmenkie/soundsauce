import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Send, Pencil, Trash2, X, Check, Loader, Reply, ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { sanitize } from '../../utils/sanitize';

function getTimeAgo(dateString) {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

/**
 * Single comment row with edit/delete/reply actions.
 * Renders replies recursively with indentation (max 3 levels deep).
 */
function CommentItem({ comment, depth, theme, t, user, isAdmin, replyingTo, setReplyingTo, replyContent, setReplyContent, onReply, onEdit, onDelete, onAdminDelete, submitting }) {
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [repliesCollapsed, setRepliesCollapsed] = useState(false);

  const profile = comment.profiles;
  const isOwn = user?.id === comment.user_id;
  const isEditing = editingId === comment.id;
  const wasEdited = comment.updated_at !== comment.created_at;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const isReplyingHere = replyingTo === comment.id;
  // Cap visual nesting at 3 levels — deeper replies render at level 3
  const visualDepth = Math.min(depth, 3);

  const startEdit = () => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleEdit = async () => {
    if (!editContent.trim() || editSaving) return;
    setEditSaving(true);
    const success = await onEdit(comment.id, editContent);
    setEditSaving(false);
    if (success) {
      setEditingId(null);
      setEditContent('');
    }
  };

  const handleDelete = async () => {
    if (deletingId) return;
    setDeletingId(comment.id);
    await onDelete(comment.id);
    setDeletingId(null);
  };

  const handleAdminDelete = async () => {
    if (deletingId || !onAdminDelete) return;
    if (!window.confirm('Delete this comment as admin?')) return;
    setDeletingId(comment.id);
    await onAdminDelete(comment.id);
    setDeletingId(null);
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || submitting) return;
    const success = await onReply(replyContent, comment.id);
    if (success) {
      setReplyContent('');
      setReplyingTo(null);
    }
  };

  return (
    <div className={visualDepth > 0 ? 'mt-2' : ''}>
      <div
        className={`p-3 border ${t.commentBg} ${visualDepth > 0 ? 'ml-6 border-l-2' : ''}`}
        style={visualDepth > 0 ? {
          borderLeftColor: theme === 'dark' ? '#3f3f46' : '#d97706',
        } : undefined}
      >
        {/* Comment header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Link
              to={profile?.username ? `/user/${profile.username}` : '#'}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-6 h-6 object-cover rounded-full" />
              ) : (
                <div className={`w-6 h-6 flex items-center justify-center text-xs font-bold ${t.avatar}`}>
                  {(profile?.display_name || profile?.username || '?')[0].toUpperCase()}
                </div>
              )}
              <span className={`text-sm font-medium ${t.text}`}>{sanitize(profile?.display_name || profile?.username || 'Anonymous')}</span>
            </Link>
            {profile?.is_admin && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                theme === 'dark' ? 'bg-zinc-800 text-ember-500' : 'bg-amber-50 text-ember-600'
              }`}>
                <Shield className="w-2.5 h-2.5" />
                Admin
              </span>
            )}
            <span className={`text-xs ${t.textDimmed}`}>
              {getTimeAgo(comment.created_at)}
              {wasEdited && ' (edited)'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {user && !isEditing && (
              <button
                onClick={() => {
                  if (isReplyingHere) {
                    setReplyingTo(null);
                  } else {
                    setReplyingTo(comment.id);
                    setReplyContent('');
                  }
                }}
                className={`p-1 ${t.buttonMuted}`}
                title="Reply"
                aria-label="Reply"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
            )}
            {isOwn && !isEditing && (
              <button
                onClick={startEdit}
                disabled={!!deletingId}
                className={`p-1 ${t.buttonMuted} disabled:opacity-30`}
                title="Edit"
                aria-label="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {(isOwn || isAdmin) && !isEditing && (
              <button
                onClick={isOwn ? handleDelete : handleAdminDelete}
                disabled={deletingId === comment.id}
                className={`p-1 ${t.buttonMuted} disabled:opacity-30`}
                title={isOwn ? 'Delete' : 'Delete (Admin)'}
                aria-label={isOwn ? 'Delete' : 'Delete (Admin)'}
              >
                {deletingId === comment.id ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Comment body */}
        {isEditing ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className={`flex-1 px-3 py-1.5 border text-sm ${t.input} focus:outline-none`}
              maxLength={2000}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
            />
            <button onClick={handleEdit} disabled={editSaving} className={`p-1.5 ${t.buttonMuted} disabled:opacity-30`} title="Save" aria-label="Save">
              {editSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button onClick={cancelEdit} className={`p-1.5 ${t.buttonMuted}`} title="Cancel" aria-label="Cancel">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className={`text-sm ${t.textMuted} whitespace-pre-wrap break-words`}>
            {sanitize(comment.content)}
          </p>
        )}

        {/* Inline reply input */}
        {isReplyingHere && (
          <form onSubmit={handleReplySubmit} className="flex gap-2 mt-3">
            <input
              type="text"
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              className={`flex-1 px-3 py-1.5 border text-sm ${t.input} focus:outline-none`}
              placeholder={`Reply to ${profile?.display_name || profile?.username || 'Anonymous'}...`}
              aria-label="Write a reply"
              maxLength={2000}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setReplyingTo(null);
                  setReplyContent('');
                }
              }}
            />
            <button
              type="submit"
              disabled={!replyContent.trim() || submitting}
              className={`px-3 py-1.5 flex items-center gap-1.5 text-sm font-medium ${t.button} disabled:opacity-50`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { setReplyingTo(null); setReplyContent(''); }}
              className={`p-1.5 ${t.buttonMuted}`}
              title="Cancel"
              aria-label="Cancel reply"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* Replies */}
      {hasReplies && (
        <div>
          <button
            onClick={() => setRepliesCollapsed(!repliesCollapsed)}
            className={`flex items-center gap-1 ml-6 mt-1 mb-1 text-xs font-medium ${t.buttonMuted}`}
          >
            {repliesCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
          </button>
          {!repliesCollapsed && comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              theme={theme}
              t={t}
              user={user}
              isAdmin={isAdmin}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onAdminDelete={onAdminDelete}
              submitting={submitting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Comments section for a Sound Sauce.
 * Shows threaded comments with reply support.
 */
export function CommentsSection({ comments, commentCount, loading, submitting, onAddComment, onEditComment, onDeleteComment, onAdminDeleteComment, isAdmin, theme }) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  const t = theme === 'dark' ? {
    text: 'text-white',
    textMuted: 'text-zinc-400',
    textDimmed: 'text-zinc-500',
    input: 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 rounded-md',
    commentBg: 'bg-zinc-950 border-zinc-700 rounded-lg',
    avatar: 'bg-zinc-800 text-white rounded-full',
    button: 'bg-white text-black hover:bg-zinc-200 rounded-md',
    buttonMuted: 'text-zinc-500 hover:text-white',
    divider: 'border-zinc-700',
  } : {
    text: 'text-stone-900',
    textMuted: 'text-stone-500',
    textDimmed: 'text-stone-400',
    input: 'bg-white border-stone-200 text-stone-900 placeholder-stone-400 rounded-md',
    commentBg: 'bg-stone-50 border-stone-200 rounded-lg',
    avatar: 'bg-amber-50 text-ember-700 rounded-full',
    button: 'bg-ember-600 text-white hover:bg-ember-700 rounded-md',
    buttonMuted: 'text-stone-400 hover:text-ember-600',
    divider: 'border-stone-200',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    const success = await onAddComment(newComment);
    if (success) setNewComment('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-ember-600'}`} />
        <h2 className={`text-lg font-bold ${t.text}`}>
          Comments {commentCount > 0 && `(${commentCount})`}
        </h2>
      </div>

      {/* Comment input */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            className={`flex-1 px-3 py-2 border ${t.input} focus:outline-none`}
            placeholder="Add a comment..."
            aria-label="Write a comment"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className={`px-4 py-2 flex items-center gap-2 text-sm font-medium ${t.button} disabled:opacity-50`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <p className={`text-sm ${t.textDimmed}`}>
          Sign in to leave a comment.
        </p>
      )}

      {/* Comments list (threaded) */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-16 rounded-lg ${theme === 'dark' ? 'bg-zinc-900' : 'bg-stone-100'} animate-pulse`} />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className={`text-sm py-4 ${t.textDimmed}`}>
          No comments yet. Be the first to share your thoughts!
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              depth={0}
              theme={theme}
              t={t}
              user={user}
              isAdmin={isAdmin}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              onReply={onAddComment}
              onEdit={onEditComment}
              onDelete={onDeleteComment}
              onAdminDelete={onAdminDeleteComment}
              submitting={submitting}
            />
          ))}
        </div>
      )}
    </div>
  );
}
