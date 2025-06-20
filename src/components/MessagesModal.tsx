
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Search, Phone, Video, MoreVertical } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender?: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message?: Message;
  last_message_at: string;
  other_user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
  unread_count: number;
}

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUserId?: string | null;
}

const MessagesModal = ({ isOpen, onClose, initialUserId }: MessagesModalProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadConversations();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (initialUserId && conversations.length > 0) {
      const conversation = conversations.find(c => 
        c.other_user.id === initialUserId
      );
      if (conversation) {
        setSelectedConversation(conversation);
        loadMessages(conversation.id);
      }
    }
  }, [initialUserId, conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    if (!user) return;

    try {
      // Mock conversations for now - in real app this would be from Supabase
      const mockConversations: Conversation[] = [
        {
          id: '1',
          participant_1_id: user.id,
          participant_2_id: 'user1',
          last_message_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          other_user: {
            id: 'user1',
            username: 'sarah_explorer',
            full_name: 'Sarah Chen',
            avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b5a5c75b?w=100&h=100&fit=crop&crop=face'
          },
          unread_count: 2
        },
        {
          id: '2',
          participant_1_id: user.id,
          participant_2_id: 'user2',
          last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          other_user: {
            id: 'user2',
            username: 'mike_wanderer',
            full_name: 'Mike Rodriguez',
            avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
          },
          unread_count: 0
        }
      ];

      setConversations(mockConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      // Mock messages for now
      const mockMessages: Message[] = [
        {
          id: '1',
          sender_id: 'user1',
          receiver_id: user?.id || '',
          content: 'Hey! I saw your post about that amazing café in Milano. Is it really as good as it looks?',
          created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          is_read: true,
          sender: {
            username: 'sarah_explorer',
            full_name: 'Sarah Chen',
            avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b5a5c75b?w=100&h=100&fit=crop&crop=face'
          }
        },
        {
          id: '2',
          sender_id: user?.id || '',
          receiver_id: 'user1',
          content: 'Yes! The espresso was incredible and the atmosphere is perfect for working. You should definitely check it out!',
          created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          is_read: true
        },
        {
          id: '3',
          sender_id: 'user1',
          receiver_id: user?.id || '',
          content: 'Perfect! Planning to visit Milano next month. Would love to get more recommendations from you 😊',
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          is_read: false
        }
      ];

      setMessages(mockMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user || sending) return;

    setSending(true);
    try {
      const message: Message = {
        id: Date.now().toString(),
        sender_id: user.id,
        receiver_id: selectedConversation.other_user.id,
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        is_read: false
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[600px] overflow-hidden flex shadow-2xl">
        {/* Conversations List */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Messages</h3>
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search conversations..."
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Send className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">No conversations yet</p>
              </div>
            ) : (
              <div className="p-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversation(conversation);
                      loadMessages(conversation.id);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConversation?.id === conversation.id ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={conversation.other_user.avatar_url} />
                      <AvatarFallback>
                        {conversation.other_user.full_name?.charAt(0) || conversation.other_user.username?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 truncate">
                          {conversation.other_user.full_name || conversation.other_user.username}
                        </h4>
                        {conversation.unread_count > 0 && (
                          <div className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                            {conversation.unread_count}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">@{conversation.other_user.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedConversation.other_user.avatar_url} />
                    <AvatarFallback>
                      {selectedConversation.other_user.full_name?.charAt(0) || selectedConversation.other_user.username?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {selectedConversation.other_user.full_name || selectedConversation.other_user.username}
                    </h4>
                    <p className="text-sm text-gray-500">@{selectedConversation.other_user.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Video className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-2 max-w-[70%] ${message.sender_id === user?.id ? 'flex-row-reverse' : ''}`}>
                        {message.sender_id !== user?.id && (
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={message.sender?.avatar_url} />
                            <AvatarFallback>
                              {message.sender?.full_name?.charAt(0) || message.sender?.username?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            message.sender_id === user?.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    size="icon"
                    className="rounded-full"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500 text-sm">Choose a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesModal;
