
import { supabase } from '@/integrations/supabase/client';

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content?: string;
  message_type: 'text' | 'place_share' | 'trip_share' | 'post_share';
  shared_content?: any;
  created_at: string;
  read_at?: string;
  is_read: boolean;
  sender?: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

export interface MessageThread {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_id?: string;
  last_message_at: string;
  created_at: string;
  other_user?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
  last_message?: DirectMessage;
}

class MessageService {
  async sendPlaceShare(receiverId: string, placeData: any): Promise<DirectMessage | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          message_type: 'place_share',
          shared_content: placeData,
          content: `Check out this place: ${placeData.name}`
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending place share:', error);
      return null;
    }
  }

  async sendTextMessage(receiverId: string, content: string): Promise<DirectMessage | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          message_type: 'text',
          content
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  async getMessageThreads(): Promise<MessageThread[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: threads, error } = await supabase
        .from('message_threads')
        .select(`
          *,
          direct_messages!message_threads_last_message_id_fkey (
            *,
            profiles!direct_messages_sender_id_fkey (
              username,
              full_name,
              avatar_url
            )
          )
        `)
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get other user info for each thread
      const threadsWithUsers = await Promise.all(
        (threads || []).map(async (thread) => {
          const otherUserId = thread.participant_1_id === user.id 
            ? thread.participant_2_id 
            : thread.participant_1_id;

          const { data: otherUser } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', otherUserId)
            .single();

          return {
            ...thread,
            other_user: otherUser,
            last_message: thread.direct_messages
          };
        })
      );

      return threadsWithUsers;
    } catch (error) {
      console.error('Error fetching message threads:', error);
      return [];
    }
  }

  async getMessagesInThread(otherUserId: string): Promise<DirectMessage[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: messages, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          profiles!direct_messages_sender_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (messages || []).map(message => ({
        ...message,
        sender: message.profiles
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async markMessagesAsRead(senderId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await supabase
        .from('direct_messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('sender_id', senderId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }
}

export const messageService = new MessageService();
