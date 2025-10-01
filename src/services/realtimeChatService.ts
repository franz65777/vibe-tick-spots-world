import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export class RealtimeChatService {
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Subscribe to new messages in a specific chat thread
   */
  subscribeToThread(
    userId: string,
    otherUserId: string,
    onNewMessage: (message: any) => void
  ): () => void {
    const channelId = [userId, otherUserId].sort().join('-');
    
    if (this.channels.has(channelId)) {
      console.log('Already subscribed to channel:', channelId);
      return () => this.unsubscribeFromThread(channelId);
    }

    console.log('Subscribing to chat channel:', channelId);

    const channel = supabase
      .channel(`chat:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${otherUserId},receiver_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New message received:', payload);
          onNewMessage(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('Chat subscription status:', status);
      });

    this.channels.set(channelId, channel);

    return () => this.unsubscribeFromThread(channelId);
  }

  /**
   * Subscribe to all message threads for a user
   */
  subscribeToAllThreads(
    userId: string,
    onNewMessage: (message: any) => void
  ): () => void {
    const channelId = `all-threads-${userId}`;
    
    if (this.channels.has(channelId)) {
      return () => this.unsubscribeFromThread(channelId);
    }

    const channel = supabase
      .channel(`all-messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New message in any thread:', payload);
          onNewMessage(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('All threads subscription status:', status);
      });

    this.channels.set(channelId, channel);

    return () => this.unsubscribeFromThread(channelId);
  }

  /**
   * Unsubscribe from a specific channel
   */
  private unsubscribeFromThread(channelId: string) {
    const channel = this.channels.get(channelId);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelId);
      console.log('Unsubscribed from channel:', channelId);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    this.channels.forEach((channel, channelId) => {
      supabase.removeChannel(channel);
      console.log('Unsubscribed from channel:', channelId);
    });
    this.channels.clear();
  }

  /**
   * Subscribe to user presence in a chat
   */
  subscribeToPresence(
    chatId: string,
    userId: string,
    username: string,
    onPresenceChange: (presences: any) => void
  ): () => void {
    const channelId = `presence:${chatId}`;
    
    if (this.channels.has(channelId)) {
      return () => this.unsubscribeFromThread(channelId);
    }

    const channel = supabase.channel(`presence-${chatId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presences = channel.presenceState();
        onPresenceChange(presences);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            username,
            online_at: new Date().toISOString(),
          });
        }
      });

    this.channels.set(channelId, channel);

    return () => this.unsubscribeFromThread(channelId);
  }
}

export const realtimeChatService = new RealtimeChatService();
