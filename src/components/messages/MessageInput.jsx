import { useState, useRef } from 'react';
import { Send } from 'lucide-react';

/**
 * Text input + send button for the message thread.
 * Enter to send, Shift+Enter for newline.
 * Disabled when viewing a request you haven't followed back.
 */
export function MessageInput({ onSend, disabled, sending, theme }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const dark = theme === 'dark';

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!text.trim() || disabled || sending) return;

    const content = text.trim();
    setText('');
    await onSend(content);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-end gap-2 p-3 border-t ${
        dark ? 'border-zinc-700' : 'border-stone-200'
      }`}
    >
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label="Type a message"
        placeholder={disabled ? 'Follow this user back to reply' : 'Type a message...'}
        rows={1}
        maxLength={2000}
        className={`flex-1 resize-none px-3 py-2 text-sm rounded-lg border outline-none transition-colors ${
          dark
            ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 focus:border-ember-500'
            : 'bg-white border-stone-200 text-stone-900 placeholder-stone-400 focus:border-ember-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ maxHeight: '120px', minHeight: '36px' }}
        onInput={(e) => {
          // Auto-resize
          e.target.style.height = 'auto';
          e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
        }}
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled || sending}
        className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
          !text.trim() || disabled || sending
            ? dark
              ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              : 'bg-stone-100 text-stone-400 cursor-not-allowed'
            : dark
              ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
              : 'bg-ember-600 text-white hover:bg-ember-700'
        }`}
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
