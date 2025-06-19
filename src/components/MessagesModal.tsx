import React, { useState, useEffect } from 'react';
import { X, Send, Search, MessageSquare, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { messageService } from '@/services/messageService';
import { useAuth } from '@/contexts/AuthContext';
import MessageHistoryModal from './home/MessageHistoryModal';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUserId?: string;
}

const MessagesModal = ({ isOpen, onClose, initialUserId }: MessagesModalProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Mock users data - replace with actual user search
  const [users] = useState([
    { id: '1', username: 'john_doe', full_name: 'John Doe', avatar_url: 'https://i.pravatar.cc/40?img=1' },
    { id: '2', username: 'sarah_smith', full_name: 'Sarah Smith', avatar_url: 'https://i.pravatar.cc/40?img=2' },
    { id: '3', username: 'mike_wilson', full_name: 'Mike Wilson', avatar_url: 'https://i.pravatar.cc/40?img=3' },
    { id: '4', username: 'emma_davis', full_name: 'Emma Davis', avatar_url: 'https://i.pravatar.cc/40?img=4' },
  ]);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!selectedUser || !messageText.trim() || !user) return;

    setSending(true);
    try {
      const success = await messageService.sendTextMessage(selectedUser.id, messageText.trim());
      if (success) {
        setMessageText('');
        // Show success feedback
        alert('Message sent successfully!');
      } else {
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
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

  useEffect(() => {
    if (initialUserId && users.length > 0) {
      const user = users.find(u => u.id === initialUserId);
      if (user) {
        setSelectedUser(user);
      }
    }
  }, [initialUserId, users]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Messages</h2>
                <span className="text-sm text-gray-600">Send a message</span>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-md transition-all duration-200"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('compose')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'compose'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Compose
            </button>
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex-1 py-3 px-4 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              History
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto max-h-96 p-4">
            {activeTab === 'compose' && (
              <div className="space-y-4">
                {/* User Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Selected User Display */}
                {selectedUser && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedUser.avatar_url}
                        alt={selectedUser.full_name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-blue-900">{selectedUser.full_name}</div>
                        <div className="text-sm text-blue-700">@{selectedUser.username}</div>
                      </div>
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* User List */}
                {!selectedUser && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p>No users found</p>
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => setSelectedUser(user)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                        >
                          <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="w-10 h-10 rounded-full"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{user.full_name}</div>
                            <div className="text-sm text-gray-500 truncate">@{user.username}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Message Input */}
                {selectedUser && (
                  <div className="space-y-3">
                    <div className="relative">
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={`Message ${selectedUser.full_name}...`}
                        className="w-full p-3 pr-12 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        disabled={sending}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() || sending}
                        className="absolute bottom-3 right-3 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {sending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    
                    <div className="text-xs text-gray-500 text-center">
                      Press Enter to send • Shift + Enter for new line
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message History Modal */}
      <MessageHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </>
  );
};

export default MessagesModal;
