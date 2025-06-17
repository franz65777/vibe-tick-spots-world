
import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Clock } from 'lucide-react';
import { messageService, DirectMessage } from '@/services/messageService';
import { useAuth } from '@/contexts/AuthContext';

interface MessageHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessageHistoryModal = ({ isOpen, onClose }: MessageHistoryModalProps) => {
  const { user } = useAuth();
  const [sentMessages, setSentMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchSentMessages();
    }
  }, [isOpen, user]);

  const fetchSentMessages = async () => {
    try {
      setLoading(true);
      const threads = await messageService.getMessageThreads();
      
      // Get all messages from all threads where current user is sender
      const allMessages: DirectMessage[] = [];
      
      for (const thread of threads) {
        if (thread.other_user?.id) {
          const messages = await messageService.getMessagesInThread(thread.other_user.id);
          const userSentMessages = messages.filter(msg => msg.sender_id === user?.id);
          allMessages.push(...userSentMessages);
        }
      }
      
      // Sort by creation date (newest first)
      allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setSentMessages(allMessages);
    } catch (error) {
      console.error('Error fetching sent messages:', error);
    } finally {
      setLoading(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-16">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden shadow-2xl border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">My Messages</h2>
              <span className="text-sm text-gray-600">{sentMessages.length} sent</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-md transition-all duration-200"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Messages List */}
        <div className="overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : sentMessages.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages sent yet</h3>
              <p className="text-gray-500">Start conversations to see your message history here!</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {sentMessages.map((message) => (
                <div
                  key={message.id}
                  className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-200"
                >
                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1">
                        {message.message_type === 'place_share' ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-blue-900 mb-1">📍 Shared a place</p>
                            <p className="text-sm text-blue-700">
                              {message.shared_content?.name || 'Unknown location'}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-900 break-words">
                            {message.content}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(message.created_at)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">
                        {message.is_read ? '✓✓ Read' : '✓ Sent'}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full capitalize">
                        {message.message_type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageHistoryModal;
