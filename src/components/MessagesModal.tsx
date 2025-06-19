
import React, { useState, useEffect } from 'react';
import { X, Send, Search, MessageSquare, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRealTimeMessages } from '@/hooks/useRealTimeMessages';
import { useAuth } from '@/contexts/AuthContext';
import MessageHistoryModal from './home/MessageHistoryModal';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUserId?: string;
}

const MessagesModal = ({ isOpen, onClose, initialUserId }: MessagesModalProps) => {
  const { user } = useAuth();
  const { conversations, messages, loading, activeConversation, loadMessages, sendMessage } = useRealTimeMessages();
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<'conversations' | 'chat'>('conversations');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const filteredConversations = conversations.filter(conv => 
    conv.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationClick = async (userId: string) => {
    await loadMessages(userId);
    setView('chat');
  };

  const handleSendMessage = async () => {
    if (!activeConversation || !messageText.trim()) return;

    setSending(true);
    try {
      const success = await sendMessage(activeConversation, messageText.trim());
      if (success) {
        setMessageText('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getActiveConversationUser = () => {
    return conversations.find(conv => conv.user_id === activeConversation);
  };

  useEffect(() => {
    if (initialUserId && conversations.length > 0) {
      handleConversationClick(initialUserId);
    }
  }, [initialUserId, conversations]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-3">
              {view === 'chat' && (
                <button
                  onClick={() => setView('conversations')}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-md transition-all duration-200"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {view === 'chat' ? getActiveConversationUser()?.full_name || 'Chat' : 'Messages'}
                </h2>
                <span className="text-sm text-gray-600">
                  {view === 'chat' 
                    ? `@${getActiveConversationUser()?.username || 'user'}`
                    : `${conversations.length} conversations`
                  }
                </span>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-md transition-all duration-200"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {view === 'conversations' ? (
            <>
              {/* Search */}
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto max-h-96">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations yet</h3>
                    <p className="text-gray-500 text-sm">Start a conversation by messaging someone from the explore page!</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {filteredConversations.map((conversation) => (
                      <button
                        key={conversation.user_id}
                        onClick={() => handleConversationClick(conversation.user_id)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left border border-gray-100"
                      >
                        <img
                          src={conversation.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.full_name)}&background=3b82f6&color=fff`}
                          alt={conversation.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-semibold text-gray-900 truncate">{conversation.full_name}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(conversation.last_message_time).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 truncate">{conversation.last_message}</div>
                          {conversation.unread_count > 0 && (
                            <div className="inline-flex mt-1">
                              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                {conversation.unread_count}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* History Button */}
              <div className="p-4 border-t border-gray-100">
                <Button
                  onClick={() => setIsHistoryModalOpen(true)}
                  variant="outline"
                  className="w-full"
                >
                  View Message History
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto max-h-64 p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl ${
                        message.sender_id === user?.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sending}
                    className="px-4"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <MessageHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </>
  );
};

export default MessagesModal;
