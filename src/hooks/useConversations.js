import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { trackConversationCreated, trackConversationOpened } from '../lib/posthog';

const CONVERSATION_QUERY = '*, user_a:profiles!conversations_user_a_id_fkey(id, username, display_name, avatar_url), user_b:profiles!conversations_user_b_id_fkey(id, username, display_name, avatar_url)';

/**
 * Hook for managing DM conversations.
 * Fetches all conversations with profile joins, splits into inbox/requests,
 * provides get-or-create and mark-as-read with optimistic updates.
 * Automatically refreshes when follow state changes (request→inbox promotion).
 * Pattern: useNotifications.js
 */
export function useConversations() {
  const { user, refreshProfile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(0);

  // Ref synced with conversations to avoid stale closures in callbacks
  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  // Split conversations into inbox and requests
  const inbox = useMemo(() => conversations.filter(c => !c.is_request), [conversations]);
  const requests = useMemo(() => conversations.filter(c => c.is_request), [conversations]);

  // Get unread count for a conversation for the current user
  const getUnreadCount = useCallback((conv) => {
    if (!user) return 0;
    if (user.id === conv.user_a_id) return conv.unread_a;
    if (user.id === conv.user_b_id) return conv.unread_b;
    return 0;
  }, [user]);

  // Get the other user's profile from a conversation
  const getOtherUser = useCallback((conv) => {
    if (!user) return null;
    if (user.id === conv.user_a_id) return conv.user_b;
    return conv.user_a;
  }, [user]);

  // Fetch all conversations on mount / user change
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const callId = ++abortRef.current;

    async function fetchConversations() {
      setLoading(true);

      const { data, error } = await supabase
        .from('conversations')
        .select(CONVERSATION_QUERY)
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (callId !== abortRef.current) return;

      if (!error && data) {
        setConversations(data);
      } else if (error) {
        console.error('Failed to fetch conversations:', error);
      }

      setLoading(false);
    }

    fetchConversations();
  }, [user]);

  // Get or create conversation with a target user
  const getOrCreateConversation = useCallback(async (targetUserId) => {
    if (!user || !targetUserId) return null;
    if (user.id === targetUserId) return null;

    try {
      const { data, error } = await supabase
        .rpc('get_or_create_conversation', {
          p_user_1: user.id,
          p_user_2: targetUserId,
        });

      if (error) {
        console.error('Failed to get/create conversation:', error);
        return null;
      }

      trackConversationCreated();

      // Refresh conversation list to include the new one
      const refreshCallId = ++abortRef.current;
      const { data: refreshData } = await supabase
        .from('conversations')
        .select(CONVERSATION_QUERY)
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (refreshCallId === abortRef.current && refreshData) {
        setConversations(refreshData);
      }

      return data; // Returns conversation ID
    } catch (err) {
      console.error('get_or_create_conversation error:', err);
      return null;
    }
  }, [user]);

  // Mark conversation as read for current user — optimistic update
  const markConversationRead = useCallback(async (conversationId) => {
    if (!user) return;

    // Read from ref to avoid stale closure over conversations state
    const conv = conversationsRef.current.find(c => c.id === conversationId);
    if (!conv) return;

    const isUserA = user.id === conv.user_a_id;
    const currentUnread = isUserA ? conv.unread_a : conv.unread_b;

    if (currentUnread === 0) return;

    // Optimistic update
    let snapshot;
    setConversations(prev => {
      snapshot = prev;
      return prev.map(c => {
        if (c.id !== conversationId) return c;
        return isUserA
          ? { ...c, unread_a: 0 }
          : { ...c, unread_b: 0 };
      });
    });

    // Update conversation unread count + mark messages as read in parallel
    const updateField = isUserA ? { unread_a: 0 } : { unread_b: 0 };

    const [convResult] = await Promise.all([
      supabase
        .from('conversations')
        .update(updateField)
        .eq('id', conversationId),
      supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false),
    ]);

    if (convResult.error) {
      console.error('Failed to mark conversation as read:', convResult.error);
      setConversations(snapshot);
      return;
    }

    // Refresh profile to update sidebar unread badge (profile trigger handles the count)
    refreshProfile?.();

    trackConversationOpened(conversationId);
  }, [user, refreshProfile]);

  // Optimistically update a conversation's preview text and timestamp (e.g. after sending a message)
  const updateConversationPreview = useCallback((conversationId, previewText) => {
    const now = new Date().toISOString();
    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === conversationId
          ? { ...c, last_message_preview: previewText, last_message_at: now }
          : c
      );
      // Re-sort so the updated conversation floats to the top
      return updated.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
    });
  }, []);

  // Refresh conversations
  const refreshConversations = useCallback(async () => {
    if (!user) return;

    const callId = ++abortRef.current;

    const { data, error } = await supabase
      .from('conversations')
      .select(CONVERSATION_QUERY)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (callId !== abortRef.current) return;

    if (!error && data) {
      setConversations(data);
    }
  }, [user]);

  return {
    conversations,
    inbox,
    requests,
    loading,
    getUnreadCount,
    getOtherUser,
    getOrCreateConversation,
    markConversationRead,
    updateConversationPreview,
    refreshConversations,
  };
}
