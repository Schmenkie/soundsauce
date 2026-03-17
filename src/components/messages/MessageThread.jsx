import { useEffect, useRef } from 'react';
import { sanitize } from '../../utils/sanitize';
import { SkeletonBlock } from '../ui/Skeleton';

function formatMessageTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDateSeparator(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / 86400000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function shouldShowDateSeparator(messages, index) {
  if (index === 0) return true;
  const prev = new Date(messages[index - 1].created_at).toDateString();
  const curr = new Date(messages[index].created_at).toDateString();
  return prev !== curr;
}

/**
 * Scrollable message thread with sent/received alignment,
 * date separators, and auto-scroll to bottom.
 */
export function MessageThread({ messages, loading, hasOlder, onLoadOlder, currentUserId, theme }) {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const prevLengthRef = useRef(0);
  const dark = theme === 'dark';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      bottomRef.current?.scrollIntoView();
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-end gap-3 px-4 py-4 animate-pulse">
        <div className="flex justify-start"><SkeletonBlock theme={theme} subtle className="h-8 w-48 rounded-2xl" /></div>
        <div className="flex justify-end"><SkeletonBlock theme={theme} className="h-8 w-36 rounded-2xl" /></div>
        <div className="flex justify-start"><SkeletonBlock theme={theme} subtle className="h-8 w-56 rounded-2xl" /></div>
        <div className="flex justify-end"><SkeletonBlock theme={theme} className="h-8 w-44 rounded-2xl" /></div>
        <div className="flex justify-start"><SkeletonBlock theme={theme} subtle className="h-8 w-32 rounded-2xl" /></div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className={`text-sm ${dark ? 'text-zinc-500' : 'text-stone-400'}`}>
          No messages yet. Send the first one!
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
      {/* Load older button */}
      {hasOlder && (
        <div className="text-center mb-4">
          <button
            onClick={onLoadOlder}
            className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
              dark
                ? 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            Load older messages
          </button>
        </div>
      )}

      {messages.map((msg, index) => {
        const isSent = msg.sender_id === currentUserId;
        const showDate = shouldShowDateSeparator(messages, index);

        return (
          <div key={msg.id}>
            {/* Date separator */}
            {showDate && (
              <div className="flex items-center gap-3 my-4">
                <div className={`flex-1 h-px ${dark ? 'bg-zinc-700' : 'bg-stone-200'}`} />
                <span className={`text-xs ${dark ? 'text-zinc-500' : 'text-stone-400'}`}>
                  {formatDateSeparator(msg.created_at)}
                </span>
                <div className={`flex-1 h-px ${dark ? 'bg-zinc-700' : 'bg-stone-200'}`} />
              </div>
            )}

            {/* Message bubble */}
            <div className={`flex mb-2 ${isSent ? 'justify-end' : 'justify-start'}`}>
              {/* Receiver avatar */}
              {!isSent && (
                msg.sender?.avatar_url ? (
                  <img
                    src={msg.sender.avatar_url}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0 mr-2 mt-1"
                  />
                ) : (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mr-2 mt-1 ${
                    dark ? 'bg-zinc-700 text-zinc-400' : 'bg-amber-50 text-ember-600'
                  }`}>
                    {sanitize((msg.sender?.display_name || msg.sender?.username || '?')[0].toUpperCase())}
                  </div>
                )
              )}

              <div className={`max-w-[70%] ${isSent ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-3 py-2 text-sm rounded-lg ${
                    isSent
                      ? dark
                        ? 'bg-ember-500 text-zinc-950 rounded-br-sm'
                        : 'bg-ember-600 text-white rounded-br-sm'
                      : dark
                        ? 'bg-zinc-900 text-white rounded-bl-sm'
                        : 'bg-stone-100 text-stone-900 rounded-bl-sm'
                  }`}
                >
                  {sanitize(msg.content)}
                </div>
                <p className={`text-[10px] mt-0.5 ${
                  isSent ? 'text-right' : 'text-left'
                } ${dark ? 'text-zinc-500' : 'text-stone-400'}`}>
                  {formatMessageTime(msg.created_at)}
                  {msg._optimistic && ' · Sending...'}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
