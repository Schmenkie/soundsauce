import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { trackMessageSent } from '../lib/posthog';

const PAGE_SIZE = 50;
const POLL_INTERVAL = 4000; // Fallback polling interval
const MESSAGE_QUERY = '*, sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url)';

/**
 * Hook for managing messages within a single conversation.
 * Uses Supabase Realtime for instant new message delivery, with
 * polling fallback if the Realtime subscription fails.
 * Supports sending with optimistic insert and loading older messages on scroll-up.
 */
export function useMessages(conversationId) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const fetchIdRef = useRef(0);
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Fetch initial messages (newest PAGE_SIZE, reversed for chronological display)
  useEffect(() => {
    if (!conversationId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;

    async function fetchMessages() {
      setLoading(true);

      const { data, error } = await supabase
        .from('messages')
        .select(MESSAGE_QUERY)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (fetchId !== fetchIdRef.current) return;

      if (!error && data) {
        // Reverse so oldest is first (for display top-to-bottom)
        setMessages(data.reverse());
        setHasOlder(data.length === PAGE_SIZE);
      } else if (error) {
        console.error('Failed to fetch messages:', error);
      }

      setLoading(false);
    }

    fetchMessages();

    // Cleanup
    return () => { fetchIdRef.current++; };
  }, [conversationId, user]);

  // Realtime subscription for new messages, with polling fallback
  useEffect(() => {
    if (!conversationId || !user) return;

    let pollTimer = null;
    let usingFallback = false;

    // Handler to merge new messages (shared by Realtime and polling)
    const handleNewMessage = async (payload) => {
      const newRow = payload?.new;
      if (!newRow) return;

      // Skip messages we sent (already optimistically inserted)
      if (newRow.sender_id === user.id) {
        // Replace the optimistic message with the real DB row if it exists
        setMessages(prev => {
          const hasOptimistic = prev.some(m => m._optimistic && m.sender_id === user.id);
          if (hasOptimistic) {
            // Fetch the full message with sender profile
            fetchSingleMessage(newRow.id);
          }
          return prev;
        });
        return;
      }

      // Fetch the full message with sender profile join
      fetchSingleMessage(newRow.id);
    };

    const fetchSingleMessage = async (messageId) => {
      const { data, error } = await supabase
        .from('messages')
        .select(MESSAGE_QUERY)
        .eq('id', messageId)
        .single();

      if (!error && data) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          // Replace optimistic message or append new one
          const optimisticIdx = prev.findIndex(m => m._optimistic && m.sender_id === data.sender_id);
          if (optimisticIdx !== -1 && data.sender_id === user.id) {
            const updated = [...prev];
            updated[optimisticIdx] = data;
            return updated;
          }
          if (existingIds.has(data.id)) return prev;
          return [...prev, data];
        });
      }
    };

    // Try Realtime subscription
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        handleNewMessage
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Realtime failed — fall back to polling
          if (!usingFallback) {
            usingFallback = true;
            startPolling();
          }
        }
      });

    // Polling fallback
    function startPolling() {
      pollTimer = setInterval(async () => {
        const current = messagesRef.current;
        if (current.length === 0) return;

        const latestTime = current[current.length - 1]?.created_at;
        if (!latestTime) return;

        const { data, error } = await supabase
          .from('messages')
          .select(MESSAGE_QUERY)
          .eq('conversation_id', conversationId)
          .gt('created_at', latestTime)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMessages = data.filter(m => !existingIds.has(m.id));
            if (newMessages.length === 0) return prev;
            return [...prev, ...newMessages];
          });
        }
      }, POLL_INTERVAL);
    }

    return () => {
      supabase.removeChannel(channel);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [conversationId, user]);

  // Send a message — optimistic insert with snapshot rollback
  const sendMessage = useCallback(async (content) => {
    if (!user || !conversationId || !content.trim()) return false;

    setSending(true);

    const optimisticMessage = {
      id: `optimistic-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        username: profile?.username || null,
        display_name: profile?.display_name || null,
        avatar_url: profile?.avatar_url || null,
      },
      _optimistic: true,
    };

    // Optimistic insert
    let snapshot;
    setMessages(prev => {
      snapshot = prev;
      return [...prev, optimisticMessage];
    });

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select(MESSAGE_QUERY)
      .single();

    if (error) {
      console.error('Failed to send message:', error);
      setMessages(snapshot);
      setSending(false);
      return false;
    }

    // Replace optimistic message with real one
    setMessages(prev =>
      prev.map(m => m.id === optimisticMessage.id ? data : m)
    );

    trackMessageSent(conversationId);
    setSending(false);
    return true;
  }, [user, conversationId]);

  // Load older messages (scroll-up pagination) — uses ref to avoid stale closure
  const fetchOlderMessages = useCallback(async () => {
    const current = messagesRef.current;
    if (!conversationId || !user || current.length === 0 || !hasOlder) return;

    const oldestTime = current[0]?.created_at;
    if (!oldestTime) return;

    const { data, error } = await supabase
      .from('messages')
      .select(MESSAGE_QUERY)
      .eq('conversation_id', conversationId)
      .lt('created_at', oldestTime)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (!error && data) {
      setMessages(prev => [...data.reverse(), ...prev]);
      setHasOlder(data.length === PAGE_SIZE);
    }
  }, [conversationId, user, hasOlder]);

  return {
    messages,
    loading,
    sending,
    hasOlder,
    sendMessage,
    fetchOlderMessages,
  };
}
