
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

interface Conversation {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export const useRealTimeMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get all conversations for the current user
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url),
          recipient:profiles!messages_recipient_id_fkey(id, username, full_name, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation partner
      const conversationMap = new Map<string, Conversation>();
      
      messagesData?.forEach((message: any) => {
        const isFromCurrentUser = message.sender_id === user.id;
        const otherUser = isFromCurrentUser ? message.recipient : message.sender;
        const otherUserId = otherUser.id;

        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            user_id: otherUserId,
            username: otherUser.username,
            full_name: otherUser.full_name,
            avatar_url: otherUser.avatar_url,
            last_message: message.content,
            last_message_time: message.created_at,
            unread_count: 0
          });
        }

        // Count unread messages from other user
        if (!isFromCurrentUser && !message.read) {
          const conv = conversationMap.get(otherUserId)!;
          conv.unread_count += 1;
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load messages for a specific conversation
  const loadMessages = useCallback(async (otherUserId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url)
        `)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
      setActiveConversation(otherUserId);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', otherUserId)
        .eq('recipient_id', user.id)
        .eq('read', false);

    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [user]);

  // Send a message
  const sendMessage = useCallback(async (recipientId: string, content: string) => {
    if (!user || !content.trim()) return false;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          content: content.trim(),
          read: false
        });

      if (error) throw error;

      // Refresh conversations and messages
      await loadConversations();
      if (activeConversation === recipientId) {
        await loadMessages(recipientId);
      }

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, [user, loadConversations, loadMessages, activeConversation]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel('messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          loadConversations();
          if (activeConversation) {
            loadMessages(activeConversation);
          }
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
    };
  }, [user, loadConversations, loadMessages, activeConversation]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    messages,
    loading,
    activeConversation,
    loadMessages,
    sendMessage,
    loadConversations
  };
};
