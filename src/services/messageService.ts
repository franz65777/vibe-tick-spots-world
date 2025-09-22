
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
        .select('*')
        .single();

      if (error) throw error;

      // Get sender profile separately
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', user.id)
        .single();
      
      return {
        ...data,
        sender: senderProfile ? {
          username: senderProfile.username || 'Unknown',
          full_name: senderProfile.full_name || 'Unknown User',
          avatar_url: senderProfile.avatar_url || ''
        } : {
          username: 'Unknown',
          full_name: 'Unknown User',
          avatar_url: ''
        }
      } as DirectMessage;
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
          message_type: 'text' as const,
          content
        })
        .select('*')
        .single();

      if (error) throw error;

      // Get sender profile separately
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', user.id)
        .single();
      
      return {
        ...data,
        sender: senderProfile ? {
          username: senderProfile.username || 'Unknown',
          full_name: senderProfile.full_name || 'Unknown User',
          avatar_url: senderProfile.avatar_url || ''
        } : {
          username: 'Unknown',
          full_name: 'Unknown User',
          avatar_url: ''
        }
      } as DirectMessage;
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
          last_message:direct_messages!last_message_id (
            id,
            content,
            message_type,
            created_at,
            is_read,
            sender_id,
            receiver_id
          )
        `)
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get other participant details for each thread
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
            last_message: thread.last_message as DirectMessage
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

      // Use secure function to fetch messages with privacy protection
      const { data: messages, error } = await supabase
        .rpc('get_secure_messages', { other_user_id: otherUserId });

      if (error) {
        console.error('Error fetching secure messages:', error);
        return [];
      }

      // Get sender profiles separately for the messages
      const senderIds = [...new Set(messages?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return (messages || []).map(message => {
        const senderProfile = profileMap.get(message.sender_id);
        return {
          id: message.id,
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
          content: message.content,
          message_type: message.message_type as 'text' | 'place_share' | 'trip_share' | 'post_share',
          shared_content: null, // Not returned by secure function for privacy
          created_at: message.created_at,
          read_at: null, // Not returned by secure function for privacy
          is_read: message.is_read,
          sender: senderProfile ? {
            username: senderProfile.username || 'Unknown',
            full_name: senderProfile.full_name || 'Unknown User',
            avatar_url: senderProfile.avatar_url || ''
          } : {
            username: 'Unknown',
            full_name: 'Unknown User',
            avatar_url: ''
          }
        };
      });
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

  async startConversation(userId: string): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if thread already exists
      const { data: existingThread } = await supabase
        .from('message_threads')
        .select('id')
        .eq('participant_1_id', user.id < userId ? user.id : userId)
        .eq('participant_2_id', user.id < userId ? userId : user.id)
        .single();

      if (existingThread) {
        return existingThread.id;
      }

      // Create new thread
      const { data: newThread, error } = await supabase
        .from('message_threads')
        .insert({
          participant_1_id: user.id < userId ? user.id : userId,
          participant_2_id: user.id < userId ? userId : user.id
        })
        .select('id')
        .single();

      if (error) throw error;
      return newThread.id;
    } catch (error) {
      console.error('Error starting conversation:', error);
      return null;
    }
  }
}

export const messageService = new MessageService();
