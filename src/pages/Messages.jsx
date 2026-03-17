import { useState, useCallback } from 'react';
import { ArrowLeft, MessageSquare, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConversations, useMessages, useFollows, usePageTitle } from '../hooks';
import { ConversationList, MessageThread, MessageInput } from '../components/messages';
import { FollowButton } from '../components/recipe';

/**
 * Messages page — /messages
 * Master-detail layout: conversation list (left) + thread (right).
 * Mobile: list OR thread with back button.
 * Refreshes conversations after follow-back to promote requests→inbox.
 */
export function Messages({ theme, t }) {
  usePageTitle('Messages');
  const { user } = useAuth();
  const {
    inbox, requests, loading: convsLoading,
    getUnreadCount, getOtherUser,
    markConversationRead, updateConversationPreview, refreshConversations,
  } = useConversations();
  const { isFollowing, toggleFollow } = useFollows();

  const [activeConversation, setActiveConversation] = useState(null);

  const {
    messages, loading: msgsLoading, sending, hasOlder,
    sendMessage, fetchOlderMessages,
  } = useMessages(activeConversation?.id);

  const dark = theme === 'dark';

  // Wrap sendMessage to also update conversation preview in the left panel
  const handleSendMessage = useCallback(async (content) => {
    const success = await sendMessage(content);
    if (success && activeConversation?.id) {
      updateConversationPreview(activeConversation.id, content.trim());
    }
    return success;
  }, [sendMessage, activeConversation?.id, updateConversationPreview]);

  // Select a conversation
  const handleSelectConversation = useCallback((conv) => {
    setActiveConversation(conv);
    markConversationRead(conv.id);
  }, [markConversationRead]);

  // Back to list (mobile)
  const handleBack = useCallback(() => {
    setActiveConversation(null);
    refreshConversations();
  }, [refreshConversations]);

  // Follow back from request banner — promotes conversation from requests→inbox
  const handleFollowBack = useCallback(async (targetUserId) => {
    await toggleFollow(targetUserId);
    // Small delay for DB trigger to update is_request, then refresh
    setTimeout(async () => {
      await refreshConversations();
      // Also update the active conversation's is_request flag optimistically
      setActiveConversation(prev => prev ? { ...prev, is_request: false } : prev);
    }, 500);
  }, [toggleFollow, refreshConversations]);

  // Determine if the current user can reply
  // They can reply if the conversation is NOT a request,
  // OR if the conversation IS a request but they are NOT the receiver (i.e., they initiated it)
  const canReply = useCallback(() => {
    if (!activeConversation || !user) return false;
    if (!activeConversation.is_request) return true;
    const otherUser = getOtherUser(activeConversation);
    if (!otherUser) return false;
    // If WE follow THEM, we can send (either we initiated or we just followed back)
    return isFollowing(otherUser.id);
  }, [activeConversation, user, getOtherUser, isFollowing]);

  // Guest view
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className={`p-12 border rounded-lg text-center ${
          dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-stone-200'
        }`}>
          <MessageSquare className={`w-12 h-12 mx-auto mb-4 ${dark ? 'text-zinc-500' : 'text-stone-400'}`} />
          <h2 className={`text-xl font-bold mb-2 ${t.text}`}>Sign in to message</h2>
          <p className={t.textMuted}>Connect with other producers through direct messages.</p>
        </div>
      </div>
    );
  }

  const otherUser = activeConversation ? getOtherUser(activeConversation) : null;

  return (
    <div className="max-w-5xl mx-auto py-2" style={{ height: 'calc(100vh - 80px)' }}>
      <div className={`flex h-full border rounded-lg overflow-hidden ${
        dark ? 'border-zinc-800' : 'border-stone-200'
      }`}>
        {/* Conversation list (left panel) */}
        <div className={`w-full md:w-1/3 md:border-r flex-shrink-0 ${
          dark ? 'md:border-zinc-800' : 'md:border-stone-200'
        } ${activeConversation ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
          <div className={`px-4 py-3 border-b flex items-center justify-between ${
            dark ? 'border-zinc-800' : 'border-stone-200'
          }`}>
            <h1 className={`text-lg font-bold ${t.text}`}>Messages</h1>
          </div>
          <ConversationList
            inbox={inbox}
            requests={requests}
            loading={convsLoading}
            activeConversationId={activeConversation?.id}
            onSelectConversation={handleSelectConversation}
            getUnreadCount={getUnreadCount}
            getOtherUser={getOtherUser}
            theme={theme}
          />
        </div>

        {/* Message thread (right panel) */}
        <div className={`flex-1 flex flex-col ${
          !activeConversation ? 'hidden md:flex' : 'flex'
        }`}>
          {activeConversation ? (
            <>
              {/* Thread header */}
              <div className={`px-4 py-3 border-b flex items-center gap-3 ${
                dark ? 'border-zinc-800' : 'border-stone-200'
              }`}>
                {/* Back button (mobile) */}
                <button
                  onClick={handleBack}
                  className={`md:hidden p-1 rounded-md ${
                    dark ? 'hover:bg-zinc-800' : 'hover:bg-stone-100'
                  }`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Other user info */}
                {otherUser?.avatar_url ? (
                  <img src={otherUser.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    dark ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-50 text-ember-600'
                  }`}>
                    {(otherUser?.display_name || otherUser?.username || '?')[0].toUpperCase()}
                  </div>
                )}
                <span className={`text-sm font-medium ${t.text}`}>
                  {otherUser?.display_name || otherUser?.username || 'Unknown'}
                </span>
              </div>

              {/* Request banner — follow back to promote to inbox and enable replies */}
              {activeConversation.is_request && !canReply() && otherUser && (
                <div className={`px-4 py-3 flex items-center justify-between border-b ${
                  dark ? 'bg-zinc-900 border-zinc-800' : 'bg-amber-50/50 border-stone-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <UserPlus className={`w-4 h-4 ${dark ? 'text-ember-500' : 'text-ember-600'}`} />
                    <span className={`text-sm ${dark ? 'text-zinc-400' : 'text-stone-500'}`}>
                      <strong className={t.text}>{otherUser.display_name || otherUser.username}</strong> wants to message you. Follow them back to reply.
                    </span>
                  </div>
                  <FollowButton
                    following={isFollowing(otherUser.id)}
                    onToggle={() => handleFollowBack(otherUser.id)}
                    theme={theme}
                  />
                </div>
              )}

              {/* Messages */}
              <MessageThread
                messages={messages}
                loading={msgsLoading}
                hasOlder={hasOlder}
                onLoadOlder={fetchOlderMessages}
                currentUserId={user.id}
                theme={theme}
              />

              {/* Input */}
              <MessageInput
                onSend={handleSendMessage}
                disabled={activeConversation.is_request && !canReply()}
                sending={sending}
                theme={theme}
              />
            </>
          ) : (
            // Empty state (desktop)
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className={`w-12 h-12 mx-auto mb-4 ${dark ? 'text-zinc-800' : 'text-stone-200'}`} />
                <p className={`text-sm ${dark ? 'text-zinc-500' : 'text-stone-400'}`}>
                  Select a conversation to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
