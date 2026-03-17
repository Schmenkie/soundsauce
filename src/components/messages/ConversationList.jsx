import { useState } from 'react';
import { MessageSquare, Inbox, Mail } from 'lucide-react';
import { SkeletonCircle, SkeletonBlock } from '../ui/Skeleton';

function formatTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Conversation list with Inbox/Requests tabs.
 * Shows conversation rows with avatar, name, preview text, time, and unread badge.
 */
function ConversationSkeleton({ dark }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <SkeletonCircle theme={dark ? 'dark' : 'light'} className="w-10 h-10" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <SkeletonBlock theme={dark ? 'dark' : 'light'} className="h-3.5 w-24" />
          <SkeletonBlock theme={dark ? 'dark' : 'light'} subtle className="h-3 w-8" />
        </div>
        <SkeletonBlock theme={dark ? 'dark' : 'light'} subtle className="h-3 w-40" />
      </div>
    </div>
  );
}

export function ConversationList({
  inbox,
  requests,
  loading,
  activeConversationId,
  onSelectConversation,
  getUnreadCount,
  getOtherUser,
  theme,
}) {
  const [tab, setTab] = useState('inbox');
  const dark = theme === 'dark';

  const conversations = tab === 'inbox' ? inbox : requests;
  const inboxUnread = inbox.reduce((sum, c) => sum + getUnreadCount(c), 0);
  const requestsUnread = requests.reduce((sum, c) => sum + getUnreadCount(c), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className={`flex border-b ${dark ? 'border-zinc-700' : 'border-stone-200'}`}>
        {[
          { key: 'inbox', label: 'Inbox', icon: Inbox, count: inboxUnread },
          { key: 'requests', label: 'Requests', icon: Mail, count: requestsUnread },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? dark
                  ? 'border-white text-white'
                  : 'border-ember-600 text-ember-600'
                : `border-transparent ${dark ? 'text-zinc-500 hover:text-white' : 'text-stone-400 hover:text-stone-900'}`
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.count > 0 && (
              <span className={`min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold rounded-full px-1 ${
                dark ? 'bg-ember-500 text-zinc-950' : 'bg-ember-600 text-white'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conversation rows */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <ConversationSkeleton key={i} dark={dark} />
            ))}
          </>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <MessageSquare className={`w-8 h-8 mb-3 ${dark ? 'text-zinc-500' : 'text-stone-400'}`} />
            <p className={`text-sm ${dark ? 'text-zinc-500' : 'text-stone-400'}`}>
              {tab === 'inbox' ? 'No conversations yet' : 'No message requests'}
            </p>
          </div>
        ) : (
          conversations.map(conv => {
            const otherUser = getOtherUser(conv);
            const unread = getUnreadCount(conv);
            const isActive = conv.id === activeConversationId;

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  isActive
                    ? dark ? 'bg-zinc-800' : 'bg-amber-50'
                    : dark ? 'hover:bg-zinc-900' : 'hover:bg-stone-50'
                }`}
              >
                {/* Avatar */}
                {otherUser?.avatar_url ? (
                  <img
                    src={otherUser.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    dark ? 'bg-zinc-700 text-zinc-400' : 'bg-amber-50 text-ember-600'
                  }`}>
                    {(otherUser?.display_name || otherUser?.username || '?')[0].toUpperCase()}
                  </div>
                )}

                {/* Name + Preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium truncate ${
                      unread > 0
                        ? dark ? 'text-white' : 'text-stone-900'
                        : dark ? 'text-zinc-400' : 'text-stone-500'
                    }`}>
                      {otherUser?.display_name || otherUser?.username || 'Unknown'}
                    </span>
                    <span className={`text-xs flex-shrink-0 ml-2 ${dark ? 'text-zinc-500' : 'text-stone-400'}`}>
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate ${
                      unread > 0
                        ? dark ? 'text-zinc-400' : 'text-stone-500'
                        : dark ? 'text-zinc-500' : 'text-stone-400'
                    }`}>
                      {conv.last_message_preview || 'No messages yet'}
                    </p>
                    {unread > 0 && (
                      <span className={`min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold rounded-full px-1 ml-2 flex-shrink-0 ${
                        dark ? 'bg-ember-500 text-zinc-950' : 'bg-ember-600 text-white'
                      }`}>
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
