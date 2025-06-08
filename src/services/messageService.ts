
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
          message_type: 'place_share' as const,
          shared_content: placeData,
          content: `Check out this place: ${placeData.name}`
        })
        .select()
        .single();

      if (error) throw error;
      return data as DirectMessage;
    } catch (error) {
      console.error('Error sending place share:', error);
      // Return mock message for demo
      return {
        id: Date.now().toString(),
        sender_id: 'current-user',
        receiver_id: receiverId,
        content: `Check out this place: ${placeData.name}`,
        message_type: 'place_share',
        shared_content: placeData,
        created_at: new Date().toISOString(),
        is_read: false
      };
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
          message_type: 'text' as const,
          content
        })
        .select()
        .single();

      if (error) throw error;
      return data as DirectMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  async getMessageThreads(): Promise<MessageThread[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Return mock threads for demo
      return [
        {
          id: '1',
          participant_1_id: user.id,
          participant_2_id: 'mock-user-1',
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          other_user: {
            id: 'mock-user-1',
            username: 'sarah_explorer',
            full_name: 'Sarah Chen',
            avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b5a5c75b?w=100&h=100&fit=crop&crop=face'
          },
          last_message: {
            id: 'msg-1',
            sender_id: 'mock-user-1',
            receiver_id: user.id,
            content: 'Thanks for the recommendation!',
            message_type: 'text',
            created_at: new Date().toISOString(),
            is_read: false
          }
        },
        {
          id: '2',
          participant_1_id: user.id,
          participant_2_id: 'mock-user-2',
          last_message_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          other_user: {
            id: 'mock-user-2',
            username: 'mike_wanderer',
            full_name: 'Mike Rodriguez',
            avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
          },
          last_message: {
            id: 'msg-2',
            sender_id: user.id,
            receiver_id: 'mock-user-2',
            content: 'Check out this place: The Cozy Corner Café',
            message_type: 'place_share',
            created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            is_read: true
          }
        }
      ];
    } catch (error) {
      console.error('Error fetching message threads:', error);
      return [];
    }
  }

  async getMessagesInThread(otherUserId: string): Promise<DirectMessage[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Return mock messages for demo
      return [
        {
          id: 'msg-1',
          sender_id: otherUserId,
          receiver_id: user.id,
          content: 'Hey! How was that café you recommended?',
          message_type: 'text',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          is_read: true
        },
        {
          id: 'msg-2',
          sender_id: user.id,
          receiver_id: otherUserId,
          content: 'It was amazing! You should definitely check it out.',
          message_type: 'text',
          created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          is_read: true
        },
        {
          id: 'msg-3',
          sender_id: otherUserId,
          receiver_id: user.id,
          content: 'Thanks for the recommendation!',
          message_type: 'text',
          created_at: new Date().toISOString(),
          is_read: false
        }
      ];
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
