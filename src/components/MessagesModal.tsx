
import { useState } from 'react';
import { X, Search, Send, Camera, Smile } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

interface Chat {
  id: string;
  user: {
    name: string;
    avatar: string;
    isOnline: boolean;
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
      user: { name: 'Emma', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', isOnline: true },
      lastMessage: 'Hey! How was that cafe you went to?',
      timestamp: '2m',
      unreadCount: 2,
      messages: [
        { id: '1', senderId: 'emma', text: 'Hey! How was that cafe you went to?', timestamp: '2m', isRead: false },
        { id: '2', senderId: 'emma', text: 'I saw your story, it looks amazing!', timestamp: '1m', isRead: false },
      ]
    },
    {
      id: '2',
      user: { name: 'Michael', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', isOnline: false },
      lastMessage: 'Thanks for the recommendation!',
      timestamp: '1h',
      unreadCount: 0,
      messages: [
        { id: '3', senderId: 'me', text: 'You should try the rooftop bar downtown', timestamp: '2h', isRead: true },
        { id: '4', senderId: 'michael', text: 'Thanks for the recommendation!', timestamp: '1h', isRead: true },
      ]
    },
    {
      id: '3',
      user: { name: 'Sophia', avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png', isOnline: true },
      lastMessage: 'Are you free this weekend?',
      timestamp: '3h',
      unreadCount: 1,
      messages: [
        { id: '5', senderId: 'sophia', text: 'Are you free this weekend?', timestamp: '3h', isRead: false },
      ]
    },
  ];

  const handleSendMessage = () => {
    if (messageText.trim() && selectedChat) {
      // In a real app, this would send the message to the backend
      console.log('Sending message:', messageText);
      setMessageText('');
    }
  };

  const selectedChatData = mockChats.find(chat => chat.id === selectedChat);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-16">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {selectedChat ? (
          // Chat View
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-100">
              <button 
                onClick={() => setSelectedChat(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-medium">{selectedChatData?.user.name[0]}</span>
                </div>
                {selectedChatData?.user.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{selectedChatData?.user.name}</h3>
                <p className="text-xs text-gray-500">
                  {selectedChatData?.user.isOnline ? 'Active now' : 'Offline'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedChatData?.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.senderId === 'me' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-xs px-4 py-2 rounded-2xl text-sm",
                      message.senderId === 'me'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    )}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                  <Camera className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1 relative">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Message..."
                    className="pr-10 rounded-full border-gray-300"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button className="absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center">
                    <Smile className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <button 
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50"
                >
                  <Send className="w-5 h-5 text-blue-600" />
                </button>
              </div>
            </div>
          </>
        ) : (
          // Chat List View
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold">Messages</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="pl-10 rounded-full border-gray-300"
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
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer"
                >
                  {/* User Avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium">{chat.user.name[0]}</span>
                    </div>
                    {chat.user.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm truncate">{chat.user.name}</h3>
                      <span className="text-xs text-gray-500">{chat.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">{chat.lastMessage}</p>
                  </div>

                  {/* Unread Count */}
                  {chat.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
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
