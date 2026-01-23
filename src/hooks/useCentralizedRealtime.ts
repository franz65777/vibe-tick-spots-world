/**
 * Centralized Realtime Subscription Hook
 * 
 * Consolidates all realtime subscriptions into a single channel per user
 * to reduce Supabase connection usage by ~95% (40+ channels -> 1 channel)
 * 
 * This hook provides a central event bus that components can subscribe to
 * for realtime updates without creating their own channels.
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type RealtimeEvent = 
  | { type: 'notification_insert'; payload: any }
  | { type: 'notification_update'; payload: any }
  | { type: 'notification_delete'; payload: any }
  | { type: 'saved_location_insert'; payload: any }
  | { type: 'saved_location_delete'; payload: any }
  | { type: 'saved_place_insert'; payload: any }
  | { type: 'saved_place_delete'; payload: any }
  | { type: 'follow_insert'; payload: any }
  | { type: 'follow_delete'; payload: any }
  | { type: 'post_insert'; payload: any }
  | { type: 'post_update'; payload: any }
  | { type: 'post_delete'; payload: any }
  | { type: 'story_insert'; payload: any }
  | { type: 'story_delete'; payload: any }
  | { type: 'message_insert'; payload: any }
  // Post engagement events (global - not user-filtered since they're per-post)
  | { type: 'post_like_insert'; payload: any }
  | { type: 'post_like_delete'; payload: any }
  | { type: 'post_comment_insert'; payload: any }
  | { type: 'post_comment_delete'; payload: any }
  | { type: 'post_share_insert'; payload: any }
  | { type: 'post_share_delete'; payload: any }
  // Profile updates (for current user)
  | { type: 'profile_update'; payload: any }
  // Location shares
  | { type: 'location_share_insert'; payload: any }
  | { type: 'location_share_update'; payload: any }
  | { type: 'location_share_delete'; payload: any };

type EventHandler = (event: RealtimeEvent) => void;

// Global event handlers registry
const eventHandlers = new Set<EventHandler>();

// Singleton channel reference - truly global
let globalChannel: ReturnType<typeof supabase.channel> | null = null;
let currentUserId: string | null = null;
let isGloballySetup = false; // Global flag to prevent multiple subscriptions

// Broadcast event to all handlers
const broadcastEvent = (event: RealtimeEvent) => {
  eventHandlers.forEach(handler => {
    try {
      handler(event);
    } catch (e) {
      console.error('Error in realtime event handler:', e);
    }
  });
};

export const useCentralizedRealtime = () => {
  const { user } = useAuth();

  // Subscribe a handler to receive events
  const subscribe = useCallback((handler: EventHandler) => {
    eventHandlers.add(handler);
    return () => {
      eventHandlers.delete(handler);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      // Cleanup if user logs out
      if (globalChannel) {
        console.log('[CentralizedRealtime] User logged out, cleaning up channel');
        supabase.removeChannel(globalChannel);
        globalChannel = null;
        currentUserId = null;
        isGloballySetup = false;
      }
      return;
    }

    // Skip if already setup for this user (global check)
    if (isGloballySetup && currentUserId === user.id && globalChannel) {
      return;
    }

    // Cleanup existing channel if switching users
    if (globalChannel && currentUserId !== user.id) {
      console.log('[CentralizedRealtime] User changed, cleaning up old channel');
      supabase.removeChannel(globalChannel);
      globalChannel = null;
      isGloballySetup = false;
    }

    // Mark as setting up immediately to prevent race conditions
    isGloballySetup = true;
    currentUserId = user.id;

    console.log('[CentralizedRealtime] Setting up unified channel for user:', user.id);

    // Create a single channel with all subscriptions
    const channel = supabase
      .channel(`unified-user-${user.id}`)
      // Notifications (user-specific)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => broadcastEvent({ type: 'notification_insert', payload: payload.new })
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => broadcastEvent({ type: 'notification_update', payload: payload.new })
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => broadcastEvent({ type: 'notification_delete', payload: payload.old })
      )
      // Saved locations (user-specific)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_saved_locations', filter: `user_id=eq.${user.id}` },
        (payload) => broadcastEvent({ type: 'saved_location_insert', payload: payload.new })
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'user_saved_locations', filter: `user_id=eq.${user.id}` },
        (payload) => broadcastEvent({ type: 'saved_location_delete', payload: payload.old })
      )
      // Saved places (user-specific)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'saved_places', filter: `user_id=eq.${user.id}` },
        (payload) => broadcastEvent({ type: 'saved_place_insert', payload: payload.new })
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'saved_places', filter: `user_id=eq.${user.id}` },
        (payload) => broadcastEvent({ type: 'saved_place_delete', payload: payload.old })
      )
      // Follows - when someone follows current user
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'follows', filter: `following_id=eq.${user.id}` },
        (payload) => broadcastEvent({ type: 'follow_insert', payload: payload.new })
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'follows', filter: `following_id=eq.${user.id}` },
        (payload) => broadcastEvent({ type: 'follow_delete', payload: payload.old })
      )
      // Direct messages (when receiving)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${user.id}` },
        (payload) => broadcastEvent({ type: 'message_insert', payload: payload.new })
      )
      // Profile updates (current user)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => broadcastEvent({ type: 'profile_update', payload: payload.new })
      )
      // Location shares (global - filtered in handlers)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_location_shares' },
        (payload) => broadcastEvent({ type: 'location_share_insert', payload: payload.new })
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_location_shares' },
        (payload) => broadcastEvent({ type: 'location_share_update', payload: payload.new })
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'user_location_shares' },
        (payload) => broadcastEvent({ type: 'location_share_delete', payload: payload.old })
      )
      // Post likes (global - filtered per-post in handlers)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_likes' },
        (payload) => broadcastEvent({ type: 'post_like_insert', payload: payload.new })
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_likes' },
        (payload) => broadcastEvent({ type: 'post_like_delete', payload: payload.old })
      )
      // Post comments (global - filtered per-post in handlers)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_comments' },
        (payload) => broadcastEvent({ type: 'post_comment_insert', payload: payload.new })
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_comments' },
        (payload) => broadcastEvent({ type: 'post_comment_delete', payload: payload.old })
      )
      // Post shares (global - filtered per-post in handlers)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_shares' },
        (payload) => broadcastEvent({ type: 'post_share_insert', payload: payload.new })
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_shares' },
        (payload) => broadcastEvent({ type: 'post_share_delete', payload: payload.old })
      );

    channel.subscribe((status) => {
      console.log('[CentralizedRealtime] Subscription status:', status);
      if (status === 'CHANNEL_ERROR') {
        console.error('[CentralizedRealtime] Channel error, will retry on next mount');
        isGloballySetup = false;
      }
    });

    globalChannel = channel;

    return () => {
      // Don't cleanup on unmount - channel is shared globally
      // It will be cleaned up when user logs out or changes
    };
  }, [user?.id]);

  return { subscribe };
};

/**
 * Hook to subscribe to specific realtime events
 * Usage:
 * 
 * useRealtimeEvent('notification_insert', (payload) => {
 *   console.log('New notification:', payload);
 * });
 * 
 * // For post-specific events, filter by post_id in your handler:
 * useRealtimeEvent(['post_like_insert', 'post_like_delete'], (payload) => {
 *   if (payload.post_id === myPostId) {
 *     // Handle the event
 *   }
 * });
 */
export const useRealtimeEvent = (
  eventType: RealtimeEvent['type'] | RealtimeEvent['type'][],
  handler: (payload: any) => void
) => {
  const { subscribe } = useCentralizedRealtime();
  const handlerRef = useRef(handler);
  
  // Keep handler ref updated without causing re-subscriptions
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  
  useEffect(() => {
    const types = Array.isArray(eventType) ? eventType : [eventType];
    
    const unsubscribe = subscribe((event) => {
      if (types.includes(event.type)) {
        handlerRef.current(event.payload);
      }
    });

    return unsubscribe;
  }, [eventType, subscribe]);
};
