
import { useState } from 'react';
import { X, UserPlus, UserMinus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { sendLocalizedNotification } from '@/services/notificationLocalizationService';

interface FriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FriendRequestsModal = ({ isOpen, onClose }: FriendRequestsModalProps) => {
  const { pendingRequests, acceptFriendRequest, blockUser, loading } = useFriendRequests();
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const handleAcceptRequest = async (requestId: string, requesterId: string) => {
    setProcessingRequest(requestId);
    try {
      const result = await acceptFriendRequest(requestId);
      if (result.success) {
        // Send localized notification to requester
        await sendLocalizedNotification(
          requesterId,
          'friend_accepted',
          {}
        );
        console.log('Friend request accepted successfully');
      } else {
        console.error('Failed to accept friend request:', result.error);
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleBlockUser = async (userId: string) => {
    setProcessingRequest(userId);
    try {
      const result = await blockUser(userId);
      if (result.success) {
        console.log('User blocked successfully');
      } else {
        console.error('Failed to block user:', result.error);
      }
    } catch (error) {
      console.error('Error blocking user:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const getInitials = (name: string) => {
    return name ? name.substring(0, 2).toUpperCase() : 'U';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full h-[80vh] rounded-t-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Friend Requests</h2>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        
        <ScrollArea className="h-[calc(80vh-80px)]">
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <UserPlus className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No pending friend requests</p>
              </div>
            ) : (
              pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      {request.requester?.avatar_url ? (
                        <img 
                          src={request.requester.avatar_url} 
                          alt={request.requester.username || 'User'} 
                          className="w-full h-full rounded-full object-cover" 
                        />
                      ) : (
                        <span className="text-sm font-semibold text-gray-600">
                          {getInitials(request.requester?.username || 'User')}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {request.requester?.username || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {request.requester?.username || 'User'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptRequest(request.id, request.requester_id)}
                      disabled={processingRequest === request.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBlockUser(request.requester_id)}
                      disabled={processingRequest === request.requester_id}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Shield className="w-4 h-4 mr-1" />
                      Block
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default FriendRequestsModal;
