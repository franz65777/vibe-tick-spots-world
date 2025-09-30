import { supabase } from '@/integrations/supabase/client';

export interface Chat {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  participants: Participant[];
  last_message?: Message;
  unread_count: number;
}

export interface Participant {
  user_id: string;
  username: string;
  avatar_url: string | null;
  joined_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  content: string;
  location_id: string | null;
  created_at: string;
  username?: string;
  avatar_url?: string;
  location?: {
    id: string;
    name: string;
    category: string;
    image_url: string | null;
  };
}

/**
 * Get all chats for a user
 */
export async function getUserChats(userId: string): Promise<Chat[]> {
  try {
    const { data: chatParticipants, error } = await supabase
      .from('chat_participants')
      .select(`
        chat_id,
        chats!inner(
          id,
          name,
          is_group,
          created_by,
          created_at
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    const chats: Chat[] = [];

    for (const cp of chatParticipants || []) {
      const chat = cp.chats as any;
      
      // Get participants
      const { data: participants } = await supabase
        .from('chat_participants')
        .select(`
          user_id,
          joined_at,
          profiles!inner(username, avatar_url)
        `)
        .eq('chat_id', chat.id);

      // Get last message
      const { data: lastMessage } = await supabase
        .from('chat_messages')
        .select('id, chat_id, content, created_at, user_id, location_id')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Count unread messages
      const { data: lastRead } = await supabase
        .from('chat_participants')
        .select('last_read_at')
        .eq('chat_id', chat.id)
        .eq('user_id', userId)
        .single();

      const { count: unreadCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chat.id)
        .gt('created_at', lastRead?.last_read_at || '1970-01-01');

      chats.push({
        id: chat.id,
        name: chat.name,
        is_group: chat.is_group,
        created_by: chat.created_by,
        created_at: chat.created_at,
        participants: (participants || []).map((p: any) => ({
          user_id: p.user_id,
          username: p.profiles?.username || 'User',
          avatar_url: p.profiles?.avatar_url || null,
          joined_at: p.joined_at,
        })),
        last_message: lastMessage || undefined,
        unread_count: unreadCount || 0,
      });
    }

    return chats.sort((a, b) => 
      new Date(b.last_message?.created_at || b.created_at).getTime() - 
      new Date(a.last_message?.created_at || a.created_at).getTime()
    );
  } catch (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
}

/**
 * Create a new chat
 */
export async function createChat(
  createdBy: string,
  participantIds: string[],
  isGroup: boolean = false,
  name?: string
): Promise<string | null> {
  try {
    // Create chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        created_by: createdBy,
        is_group: isGroup,
        name: name || null,
      })
      .select('id')
      .single();

    if (chatError) throw chatError;

    // Add all participants including creator
    const allParticipants = Array.from(new Set([createdBy, ...participantIds]));
    const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert(
        allParticipants.map(userId => ({
          chat_id: chat.id,
          user_id: userId,
        }))
      );

    if (participantsError) throw participantsError;

    return chat.id;
  } catch (error) {
    console.error('Error creating chat:', error);
    return null;
  }
}

/**
 * Get messages for a chat
 */
export async function getChatMessages(chatId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        id,
        chat_id,
        user_id,
        content,
        location_id,
        created_at,
        profiles!inner(username, avatar_url),
        locations(id, name, category, image_url)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((msg: any) => ({
      id: msg.id,
      chat_id: msg.chat_id,
      user_id: msg.user_id,
      content: msg.content,
      location_id: msg.location_id,
      created_at: msg.created_at,
      username: msg.profiles?.username || 'User',
      avatar_url: msg.profiles?.avatar_url || null,
      location: msg.locations ? {
        id: msg.locations.id,
        name: msg.locations.name,
        category: msg.locations.category,
        image_url: msg.locations.image_url,
      } : undefined,
    }));
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

/**
 * Send a message
 */
export async function sendMessage(
  chatId: string,
  userId: string,
  content: string,
  locationId?: string
): Promise<Message | null> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        user_id: userId,
        content: content.trim(),
        location_id: locationId || null,
      })
      .select(`
        id,
        chat_id,
        user_id,
        content,
        location_id,
        created_at
      `)
      .single();

    if (error) throw error;

    // Update last_read_at for sender
    await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('chat_id', chatId)
      .eq('user_id', userId);

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();

    return {
      ...data,
      username: profile?.username || 'User',
      avatar_url: profile?.avatar_url || null,
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
}

/**
 * Mark chat as read
 */
export async function markChatAsRead(chatId: string, userId: string): Promise<void> {
  try {
    await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('chat_id', chatId)
      .eq('user_id', userId);
  } catch (error) {
    console.error('Error marking chat as read:', error);
  }
}
