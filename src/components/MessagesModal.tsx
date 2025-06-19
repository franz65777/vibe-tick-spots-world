
import React, { useState, useEffect } from 'react';
import { X, Send, ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useRealTimeMessages } from '@/hooks/useRealTimeMessages';
import { formatDistanceToNow } from 'date-fns';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUserId?: string | null;
}

const MessagesModal = ({ isOpen, onClose, initialUserId }: MessagesModalProps) => {
  const {
    conversations,
    messages,
    loading,
    activeConversation,
    loadMessages,
    sendMessage
  } = useRealTimeMessages();
  
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Load specific conversation if initialUserId is provided
  useEffect(() => {
    if (initialUserId && isOpen) {
      loadMessages(initialUserId);
    }
  }, [initialUserId, isOpen, loadMessages]);

  const handleSendMessage = async () => {
    if (!activeConversation || !newMessage.trim() || sending) return;

    setSending(true);
    const success = await sendMessage(activeConversation, newMessage);
    if (success) {
      setNewMessage('');
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const activeUser = conversations.find(c => c.user_id === activeConversation);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full h-full sm:h-[600px] sm:max-w-md sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            {activeConversation && (
              <Button
                onClick={() => loadMessages('')}
                variant="ghost"
                size="icon"
                className="rounded-full sm:hidden"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <h3 className="font-bold text-lg">
              {activeConversation && activeUser ? activeUser.full_name : 'Messages'}
            </h3>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!activeConversation ? (
            // Conversations List
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                  <User className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm">No conversations yet</p>
                  <p className="text-gray-400 text-xs">Start chatting with other users!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.user_id}
                      onClick={() => loadMessages(conversation.user_id)}
                      className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={conversation.avatar_url} />
                        <AvatarFallback>
                          {conversation.full_name?.charAt(0) || conversation.username?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-gray-900 truncate">
                            {conversation.full_name || conversation.username}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(conversation.last_message_time), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 truncate">
                            {conversation.last_message}
                          </p>
                          {conversation.unread_count > 0 && (
                            <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Message Thread
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                  const isOwnMessage = message.sender_id !== activeConversation;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          isOwnMessage
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesModal;
