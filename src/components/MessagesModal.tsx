
import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Search, Users, Send, Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    avatar: string;
    isOnline: boolean;
  };
  lastMessage: Message;
  unreadCount: number;
}

const MessagesModal = ({ isOpen, onClose }: MessagesModalProps) => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');

  // Demo conversations data
  const [conversations] = useState<Conversation[]>([
    {
      id: '1',
      participant: {
        id: 'user1',
        name: 'Alice Johnson',
        avatar: 'https://i.pravatar.cc/40?img=1',
        isOnline: true
      },
      lastMessage: {
        id: 'msg1',
        senderId: 'user1',
        content: 'Hey! I saw you visited that amazing café in Milan. How was it?',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        isRead: false
      },
      unreadCount: 2
    },
    {
      id: '2',
      participant: {
        id: 'user2',
        name: 'Bob Smith',
        avatar: 'https://i.pravatar.cc/40?img=2',
        isOnline: false
      },
      lastMessage: {
        id: 'msg2',
        senderId: 'current',
        content: 'Thanks for the recommendation!',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: true
      },
      unreadCount: 0
    },
    {
      id: '3',
      participant: {
        id: 'user3',
        name: 'Emma Wilson',
        avatar: 'https://i.pravatar.cc/40?img=3',
        isOnline: true
      },
      lastMessage: {
        id: 'msg3',
        senderId: 'user3',
        content: 'Let\'s explore Paris together next week!',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        isRead: false
      },
      unreadCount: 1
    }
  ]);

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
    conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations.find(conv => conv.id === selectedConversation);
  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      console.log('Sending message:', newMessage);
      setNewMessage('');
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
            {filteredConversations.length === 0 ? (
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
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 mb-2 ${
                      selectedConversation === conversation.id
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={conversation.participant.avatar}
                        alt={conversation.participant.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {conversation.participant.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {conversation.participant.name}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {getTimeAgo(conversation.lastMessage.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.lastMessage.senderId === 'current' ? 'You: ' : ''}
                          {conversation.lastMessage.content}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {conversation.unreadCount}
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
                  <img
                    src={selectedConv.participant.avatar}
                    alt={selectedConv.participant.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {selectedConv.participant.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedConv.participant.name}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedConv.participant.isOnline ? 'Online' : 'Offline'}
                  </p>
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
                <div className="text-center">
                  <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full">
                    Today
                  </span>
                </div>
                <div className="flex">
                  <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 max-w-xs shadow-sm">
                    <p className="text-gray-900">{selectedConv.lastMessage.content}</p>
                    <span className="text-xs text-gray-500 mt-1 block">
                      {getTimeAgo(selectedConv.lastMessage.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-100 bg-white">
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 rounded-xl border-gray-200 focus:border-blue-300"
                />
                <Button
                  onClick={handleSendMessage}
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
