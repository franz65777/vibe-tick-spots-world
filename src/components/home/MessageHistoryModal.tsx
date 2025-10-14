import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { messageService, DirectMessage } from '@/services/messageService';
import { useAuth } from '@/contexts/AuthContext';

interface MessageHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessageHistoryModal = ({ isOpen, onClose }: MessageHistoryModalProps) => {
  const { user } = useAuth();
  const [sentMessages, setSentMessages] = useState<DirectMessage[]>([]);
  const [receivedMessages, setReceivedMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');

  useEffect(() => {
    if (isOpen && user) {
      fetchMessages();
    }
  }, [isOpen, user]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const threads = await messageService.getMessageThreads();
      
      const allSentMessages: DirectMessage[] = [];
      const allReceivedMessages: DirectMessage[] = [];
      
      for (const thread of threads) {
        if (thread.other_user?.id) {
          const messages = await messageService.getMessagesInThread(thread.other_user.id);
          const sent = messages.filter(msg => msg.sender_id === user?.id);
          const received = messages.filter(msg => msg.sender_id !== user?.id);
          allSentMessages.push(...sent);
          allReceivedMessages.push(...received);
        }
      }
      
      allSentMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      allReceivedMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setSentMessages(allSentMessages);
      setReceivedMessages(allReceivedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
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

  const handleMessageClick = (message: DirectMessage) => {
    if (message.message_type === 'post_share' && message.shared_content?.id) {
      // Import PostDetailModal dynamically
      import('@/components/explore/PostDetailModal').then(({ PostDetailModal }) => {
        // Create a temporary container to render the modal
        const container = document.createElement('div');
        document.body.appendChild(container);
        
        // Render the modal
        import('react-dom/client').then(({ createRoot }) => {
          const root = createRoot(container);
          root.render(
            <PostDetailModal
              postId={message.shared_content.id}
              isOpen={true}
              onClose={() => {
                root.unmount();
                document.body.removeChild(container);
              }}
            />
          );
        });
      });
    }
  };

  const renderMessage = (message: DirectMessage) => (
    <div
      key={message.id}
      onClick={() => handleMessageClick(message)}
      className={`flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-200 ${
        message.message_type === 'post_share' ? 'cursor-pointer' : ''
      }`}
    >
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
            ) : message.message_type === 'post_share' ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm font-medium text-purple-900 mb-1">📸 Shared a post</p>
                {message.shared_content?.media_urls?.[0] && (
                  <img 
                    src={message.shared_content.media_urls[0]} 
                    alt="Post preview" 
                    className="w-full h-32 object-cover rounded mt-2"
                  />
                )}
                {message.shared_content?.caption && (
                  <p className="text-xs text-purple-700 mt-2 line-clamp-2">
                    {message.shared_content.caption}
                  </p>
                )}
              </div>
            ) : (
              message.content && (
                <p className="text-sm text-gray-900 break-words">
                  {message.content}
                </p>
              )
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
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-16">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[70vh] overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Messages</h2>
              <span className="text-sm text-gray-600">
                {sentMessages.length + receivedMessages.length} total
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mx-6 mt-4 mb-2">
            <TabsTrigger value="received" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Received
              {receivedMessages.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                  {receivedMessages.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <ArrowRight className="w-4 h-4" />
              Sent
              {sentMessages.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                  {sentMessages.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <TabsContent value="received" className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : receivedMessages.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ArrowLeft className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages received</h3>
                  <p className="text-gray-500">You'll see messages from others here</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {receivedMessages.map(renderMessage)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sent" className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                </div>
              ) : sentMessages.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ArrowRight className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages sent yet</h3>
                  <p className="text-gray-500">Start conversations to see your sent messages here</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {sentMessages.map(renderMessage)}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default MessageHistoryModal;
