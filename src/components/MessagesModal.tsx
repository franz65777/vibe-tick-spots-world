
import { useState } from 'react';
import { X, Search, Send, Paperclip, MoreHorizontal, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  senderId: string;
  text?: string;
  timestamp: string;
  isRead: boolean;
  sharedLocation?: {
    name: string;
    category: string;
    image?: string;
  };
}

interface Chat {
  id: string;
  user: {
    name: string;
    avatar: string;
    isOnline: boolean;
    lastSeen?: string;
  };
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  messages: Message[];
}

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessagesModal = ({ isOpen, onClose }: MessagesModalProps) => {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const mockChats: Chat[] = [
    {
      id: '1',
      user: { 
        name: 'Emma Wilson', 
        avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', 
        isOnline: true 
      },
      lastMessage: 'Check out this place I found!',
      timestamp: '2m ago',
      unreadCount: 2,
      messages: [
        { id: '1', senderId: 'emma', text: 'Hey! How was that cafe you went to?', timestamp: '2:34 PM', isRead: false },
        { 
          id: '2', 
          senderId: 'emma', 
          timestamp: '2:35 PM', 
          isRead: false,
          sharedLocation: {
            name: 'Golden Gate Cafe',
            category: 'Restaurant',
            image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop'
          }
        },
      ]
    },
    {
      id: '2',
      user: { 
        name: 'Michael Chen', 
        avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', 
        isOnline: false,
        lastSeen: 'Last seen 1h ago'
      },
      lastMessage: 'Thanks for the recommendation!',
      timestamp: '1h ago',
      unreadCount: 0,
      messages: [
        { id: '3', senderId: 'me', text: 'You should try the rooftop bar downtown', timestamp: '1:15 PM', isRead: true },
        { id: '4', senderId: 'michael', text: 'Thanks for the recommendation!', timestamp: '1:20 PM', isRead: true },
      ]
    },
    {
      id: '3',
      user: { 
        name: 'Sophia Rodriguez', 
        avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', 
        isOnline: true 
      },
      lastMessage: 'Are you free this weekend?',
      timestamp: '3h ago',
      unreadCount: 1,
      messages: [
        { id: '5', senderId: 'sophia', text: 'Are you free this weekend?', timestamp: '11:30 AM', isRead: false },
      ]
    },
  ];

  const handleSendMessage = () => {
    if (messageText.trim() && selectedChat) {
      console.log('Sending message:', messageText);
      setMessageText('');
    }
  };

  const selectedChatData = mockChats.find(chat => chat.id === selectedChat);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-16">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
        {selectedChat ? (
          // Chat View
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-gray-50">
              <button 
                onClick={() => setSelectedChat(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  <span className="text-sm font-medium text-gray-600">
                    {selectedChatData?.user.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                {selectedChatData?.user.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{selectedChatData?.user.name}</h3>
                <p className="text-xs text-gray-500">
                  {selectedChatData?.user.isOnline ? 'Online' : selectedChatData?.user.lastSeen}
                </p>
              </div>
              <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors">
                <MoreHorizontal className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {selectedChatData?.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.senderId === 'me' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div className={cn(
                    "max-w-xs",
                    message.senderId === 'me' ? 'items-end' : 'items-start'
                  )}>
                    {message.sharedLocation ? (
                      // Shared Location Message
                      <div className="rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                        <div className="relative">
                          {message.sharedLocation.image && (
                            <img 
                              src={message.sharedLocation.image} 
                              alt={message.sharedLocation.name}
                              className="w-full h-32 object-cover"
                            />
                          )}
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium text-sm text-gray-900">{message.sharedLocation.name}</h4>
                          <p className="text-xs text-gray-500">{message.sharedLocation.category}</p>
                        </div>
                      </div>
                    ) : (
                      // Text Message
                      <div
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm max-w-full break-words",
                          message.senderId === 'me'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        )}
                      >
                        {message.text}
                      </div>
                    )}
                    <div className={cn(
                      "text-xs text-gray-500 mt-1",
                      message.senderId === 'me' ? 'text-right' : 'text-left'
                    )}>
                      {message.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                  <Paperclip className="w-4 h-4 text-gray-600" />
                </button>
                <div className="flex-1 relative">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="pr-10 rounded-full border-gray-300 focus:border-blue-400 focus:ring-blue-400/20"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                </div>
                <button 
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </>
        ) : (
          // Chat List View
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="pl-10 rounded-full border-gray-300 focus:border-blue-400 focus:ring-blue-400/20"
                />
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
              {mockChats
                .filter(chat => 
                  chat.user.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  {/* User Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      <span className="text-sm font-medium text-gray-600">
                        {chat.user.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    {chat.user.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm text-gray-900 truncate">{chat.user.name}</h3>
                      <span className="text-xs text-gray-500 flex-shrink-0">{chat.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                  </div>

                  {/* Unread Count */}
                  {chat.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessagesModal;
