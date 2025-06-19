
import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft, Send, MapPin, Search, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { messageService, DirectMessage, MessageThread } from '@/services/messageService';
import { useRealTimeMessages } from '@/hooks/useRealTimeMessages';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUserId?: string;
}

const MessagesModal = ({ isOpen, onClose, initialUserId }: MessagesModalProps) => {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use real-time messages hook
  useRealTimeMessages((message) => {
    if (selectedThread && 
        (message.sender_id === selectedThread.other_user?.id || 
         message.receiver_id === selectedThread.other_user?.id)) {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    }
    // Refresh threads to update last message
    loadThreads();
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadThreads = async () => {
    const threadData = await messageService.getMessageThreads();
    setThreads(threadData);
    
    // Auto-select thread if initialUserId is provided
    if (initialUserId && threadData.length > 0) {
      const targetThread = threadData.find(thread => thread.other_user?.id === initialUserId);
      if (targetThread) {
        handleThreadSelect(targetThread);
      }
    }
  };

  const loadMessages = async (otherUserId: string) => {
    if (!otherUserId) return;
    
    setLoading(true);
    const messageData = await messageService.getMessagesInThread(otherUserId);
    setMessages(messageData);
    
    // Mark messages as read
    await messageService.markMessagesAsRead(otherUserId);
    setLoading(false);
    
    setTimeout(scrollToBottom, 100);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread?.other_user?.id) return;

    const sentMessage = await messageService.sendTextMessage(
      selectedThread.other_user.id, 
      newMessage.trim()
    );

    if (sentMessage) {
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
      scrollToBottom();
      loadThreads(); // Refresh to update last message
    }
  };

  const handleThreadSelect = (thread: MessageThread) => {
    setSelectedThread(thread);
    if (thread.other_user?.id) {
      loadMessages(thread.other_user.id);
    }
  };

  const handleBackToThreads = () => {
    setSelectedThread(null);
    setMessages([]);
    setSearchQuery('');
  };

  useEffect(() => {
    if (isOpen) {
      loadThreads();
    }
  }, [isOpen, initialUserId]);

  const filteredThreads = threads.filter(thread =>
    thread.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.other_user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      return 'now';
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full h-full sm:h-[600px] sm:max-w-md sm:rounded-2xl overflow-hidden flex flex-col">
        {selectedThread ? (
          // Conversation View
          <>
            {/* Conversation Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
              <button
                onClick={handleBackToThreads}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                {selectedThread.other_user?.avatar_url ? (
                  <img 
                    src={selectedThread.other_user.avatar_url} 
                    alt={selectedThread.other_user.full_name || 'User'}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm">
                    {selectedThread.other_user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">
                  {selectedThread.other_user?.full_name || 'Unknown User'}
                </h3>
                <p className="text-sm text-gray-500 truncate">
                  @{selectedThread.other_user?.username || 'unknown'}
                </p>
              </div>

              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-2xl mb-2">👋</div>
                  <p>Start a conversation with {selectedThread.other_user?.full_name}</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === selectedThread.other_user?.id ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl ${
                        message.sender_id === selectedThread.other_user?.id
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {message.message_type === 'place_share' && message.shared_content ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm opacity-80">
                            <MapPin className="w-4 h-4" />
                            <span>Shared a place</span>
                          </div>
                          <div className="p-2 bg-white/10 rounded-lg">
                            <p className="font-medium">{message.shared_content.name}</p>
                            <p className="text-xs opacity-80">{message.shared_content.category}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                      <p className={`text-xs mt-1 ${
                        message.sender_id === selectedThread.other_user?.id ? 'text-gray-500' : 'text-white/70'
                      }`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  size="icon"
                  className="rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          // Thread List View
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
                />
              </div>
            </div>

            {/* Thread List */}
            <div className="flex-1 overflow-y-auto">
              {filteredThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                  <div className="text-4xl mb-4">💬</div>
                  <h3 className="font-medium text-gray-900 mb-2">No conversations yet</h3>
                  <p className="text-sm text-center">
                    Start a conversation by sharing a place or sending a message to other users
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredThreads.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => handleThreadSelect(thread)}
                      className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {thread.other_user?.avatar_url ? (
                            <img 
                              src={thread.other_user.avatar_url} 
                              alt={thread.other_user.full_name || 'User'}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span>
                              {thread.other_user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-gray-900 truncate">
                              {thread.other_user?.full_name || 'Unknown User'}
                            </h3>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatTime(thread.last_message_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-500 truncate">
                            {thread.last_message?.message_type === 'place_share' 
                              ? '📍 Shared a place'
                              : thread.last_message?.content || 'No messages yet'
                            }
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessagesModal;
