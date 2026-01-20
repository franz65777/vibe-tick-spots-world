/**
 * Centralized Realtime Subscription Hook
 * 
 * Consolidates all realtime subscriptions into a single channel per user
 * to reduce Supabase connection usage by ~89% (9+ channels -> 1 channel)
 * 
 * This hook provides a central event bus that components can subscribe to
 * for realtime updates without creating their own channels.
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type RealtimeEvent = 
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
  | { type: 'message_insert'; payload: any };

type EventHandler = (event: RealtimeEvent) => void;

// Global event handlers registry
const eventHandlers = new Set<EventHandler>();

// Singleton channel reference
let globalChannel: ReturnType<typeof supabase.channel> | null = null;
let currentUserId: string | null = null;

export const useCentralizedRealtime = () => {
  const { user } = useAuth();
  const isSetupRef = useRef(false);

  // Subscribe a handler to receive events
  const subscribe = useCallback((handler: EventHandler) => {
    eventHandlers.add(handler);
    return () => {
      eventHandlers.delete(handler);
    };
  }, []);

  // Broadcast event to all handlers
  const broadcastEvent = useCallback((event: RealtimeEvent) => {
    eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (e) {
        console.error('Error in realtime event handler:', e);
      }
    });
  }, []);

  useEffect(() => {
    if (!user?.id) {
      // Cleanup if user logs out
      if (globalChannel) {
        supabase.removeChannel(globalChannel);
        globalChannel = null;
        currentUserId = null;
        isSetupRef.current = false;
      }
      return;
    }

    // Skip if already setup for this user
    if (isSetupRef.current && currentUserId === user.id) {
      return;
    }

    // Cleanup existing channel if switching users
    if (globalChannel && currentUserId !== user.id) {
      supabase.removeChannel(globalChannel);
      globalChannel = null;
    }

    currentUserId = user.id;
    isSetupRef.current = true;

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
      );

    channel.subscribe((status) => {
      console.log('[CentralizedRealtime] Subscription status:', status);
    });

    globalChannel = channel;

    return () => {
      // Don't cleanup on unmount - channel is shared globally
      // It will be cleaned up when user logs out or changes
    };
  }, [user?.id, broadcastEvent]);

  return { subscribe };
};

/**
 * Hook to subscribe to specific realtime events
 * Usage:
 * 
 * useRealtimeEvent('notification_insert', (payload) => {
 *   console.log('New notification:', payload);
 * });
 */
export const useRealtimeEvent = (
  eventType: RealtimeEvent['type'] | RealtimeEvent['type'][],
  handler: (payload: any) => void
) => {
  const { subscribe } = useCentralizedRealtime();
  
  useEffect(() => {
    const types = Array.isArray(eventType) ? eventType : [eventType];
    
    const unsubscribe = subscribe((event) => {
      if (types.includes(event.type)) {
        handler(event.payload);
      }
    });

    return unsubscribe;
  }, [eventType, handler, subscribe]);
};
