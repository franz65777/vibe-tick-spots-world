
import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Search, Users, Send, Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { messageService, DirectMessage, MessageThread } from '@/services/messageService';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUserId?: string;
}

const MessagesModal = ({ isOpen, onClose, initialUserId }: MessagesModalProps) => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(initialUserId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState<MessageThread[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      if (initialUserId) {
        startConversationWithUser(initialUserId);
      }
    }
  }, [isOpen, initialUserId]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const threads = await messageService.getMessageThreads();
      setConversations(threads);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherUserId: string) => {
    try {
      const threadMessages = await messageService.getMessagesInThread(otherUserId);
      setMessages(threadMessages);
      
      // Mark messages as read
      await messageService.markMessagesAsRead(otherUserId);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const startConversationWithUser = async (userId: string) => {
    const threadId = await messageService.startConversation(userId);
    if (threadId) {
      setSelectedConversation(userId);
      await fetchConversations(); // Refresh conversations list
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations.find(conv => conv.other_user?.id === selectedConversation);
  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.last_message?.is_read ? 0 : 1), 0);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      await messageService.sendTextMessage(selectedConversation, newMessage.trim());
      setNewMessage('');
      await fetchMessages(selectedConversation);
      await fetchConversations(); // Refresh to update last message
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] overflow-hidden shadow-2xl border border-gray-100 flex">
        
        {/* Conversations List */}
        <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-1/3 border-r border-gray-200`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Messages</h2>
                {totalUnread > 0 && (
                  <span className="text-sm text-gray-600">{totalUnread} unread</span>
                )}
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-md transition-all duration-200 md:hidden"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl border-gray-200 focus:border-blue-300"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-6">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations</h3>
                <p className="text-gray-500">Start a conversation with other explorers!</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.other_user?.id || '')}
                    className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 mb-2 ${
                      selectedConversation === conversation.other_user?.id
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {conversation.other_user?.avatar_url ? (
                          <img
                            src={conversation.other_user.avatar_url}
                            alt={conversation.other_user.full_name || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-gray-600">
                            {(conversation.other_user?.full_name || conversation.other_user?.username || 'U')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {conversation.other_user?.full_name || conversation.other_user?.username || 'Unknown User'}
                        </h4>
                        {conversation.last_message && (
                          <span className="text-xs text-gray-500">
                            {getTimeAgo(conversation.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.last_message?.content || 'No messages yet'}
                        </p>
                        {conversation.last_message && !conversation.last_message.is_read && (
                          <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            1
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat View */}
        {selectedConv ? (
          <div className="flex flex-col w-full md:w-2/3">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {selectedConv.other_user?.avatar_url ? (
                      <img
                        src={selectedConv.other_user.avatar_url}
                        alt={selectedConv.other_user.full_name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-gray-600">
                        {(selectedConv.other_user?.full_name || selectedConv.other_user?.username || 'U')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedConv.other_user?.full_name || selectedConv.other_user?.username || 'Unknown User'}
                  </h3>
                  <p className="text-sm text-gray-500">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="rounded-full">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full">
                  <Video className="w-4 h-4" />
                </Button>
                <button 
                  onClick={onClose} 
                  className="hidden md:flex w-8 h-8 items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === selectedConv.other_user?.id ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-xs ${
                        message.sender_id === selectedConv.other_user?.id
                          ? 'bg-white rounded-2xl rounded-bl-md'
                          : 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                      } px-4 py-3 shadow-sm`}>
                        <p className={message.sender_id === selectedConv.other_user?.id ? 'text-gray-900' : 'text-white'}>
                          {message.content}
                        </p>
                        <span className={`text-xs mt-1 block ${
                          message.sender_id === selectedConv.other_user?.id ? 'text-gray-500' : 'text-blue-200'
                        }`}>
                          {getTimeAgo(message.created_at)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-100 bg-white">
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  className="flex-1 rounded-xl border-gray-200 focus:border-blue-300"
                  disabled={sending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl px-6"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center w-2/3 bg-gray-50">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesModal;
