import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const NOTIFICATION_QUERY = '*, actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url)';
const POLL_INTERVAL = 30000; // Fallback polling interval

/**
 * Hook for managing user notifications.
 * Uses Supabase Realtime for instant notification delivery, with
 * polling fallback if the Realtime subscription fails.
 * Provides mark-as-read, mark-all-as-read, and delete with optimistic updates.
 */
export function useNotifications() {
  const { user, refreshProfile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(0);
  const notificationsRef = useRef(notifications);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);
  const refreshProfileRef = useRef(refreshProfile);
  useEffect(() => { refreshProfileRef.current = refreshProfile; }, [refreshProfile]);

  // Derived unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Fetch notifications on mount / user change
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const callId = ++abortRef.current;

    async function fetchNotifications() {
      setLoading(true);

      const { data, error } = await supabase
        .from('notifications')
        .select(NOTIFICATION_QUERY)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (callId !== abortRef.current) return;

      if (!error && data) {
        setNotifications(data);
      } else if (error) {
        console.error('Failed to fetch notifications:', error);
      }

      setLoading(false);
    }

    fetchNotifications();
  }, [user]);

  // Realtime subscription for new notifications, with polling fallback
  useEffect(() => {
    if (!user) return;

    let pollTimer = null;
    let usingFallback = false;

    // Handler for new notifications from Realtime
    const handleNewNotification = async (payload) => {
      const newRow = payload?.new;
      if (!newRow || newRow.user_id !== user.id) return;

      // Fetch the full notification with actor profile join
      const { data, error } = await supabase
        .from('notifications')
        .select(NOTIFICATION_QUERY)
        .eq('id', newRow.id)
        .single();

      if (!error && data) {
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          if (existingIds.has(data.id)) return prev;
          return [data, ...prev];
        });
        refreshProfileRef.current?.();
      }
    };

    // Try Realtime subscription
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        handleNewNotification
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
        const current = notificationsRef.current;
        const latestTime = current[0]?.created_at;

        if (!latestTime) {
          // No existing notifications — do a full fetch
          const { data } = await supabase
            .from('notifications')
            .select(NOTIFICATION_QUERY)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

          if (data && data.length > 0) {
            setNotifications(data);
            refreshProfileRef.current?.();
          }
          return;
        }

        // Fetch only newer notifications
        const { data } = await supabase
          .from('notifications')
          .select(NOTIFICATION_QUERY)
          .eq('user_id', user.id)
          .gt('created_at', latestTime)
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newOnes = data.filter(n => !existingIds.has(n.id));
            return [...newOnes, ...prev];
          });
          refreshProfileRef.current?.();
        }
      }, POLL_INTERVAL);
    }

    return () => {
      supabase.removeChannel(channel);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [user]);

  // Mark a single notification as read — optimistic update
  const markAsRead = useCallback(async (id) => {
    if (!user) return false;

    // Optimistic update via functional setState
    let snapshot;
    setNotifications(prev => {
      snapshot = prev;
      return prev.map(n => n.id === id ? { ...n, is_read: true } : n);
    });

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to mark notification as read:', error);
      setNotifications(snapshot);
      return false;
    }

    return true;
  }, [user]);

  // Mark all notifications as read — functional setState with snapshot rollback
  const markAllAsRead = useCallback(async () => {
    if (!user) return false;

    let snapshot;
    setNotifications(prev => {
      snapshot = prev;
      return prev.map(n => ({ ...n, is_read: true }));
    });

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Failed to mark all as read:', error);
      setNotifications(snapshot);
      return false;
    }

    return true;
  }, [user]);

  // Delete a notification — optimistic filter
  const deleteNotification = useCallback(async (id) => {
    if (!user) return false;

    let snapshot;
    setNotifications(prev => {
      snapshot = prev;
      return prev.filter(n => n.id !== id);
    });

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete notification:', error);
      setNotifications(snapshot);
      return false;
    }

    return true;
  }, [user]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
