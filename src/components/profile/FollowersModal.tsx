
import { UserCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFollowData } from '@/hooks/useFollowStats';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'followers' | 'following';
}

const FollowersModal = ({ isOpen, onClose, type }: FollowersModalProps) => {
  const { users, loading, unfollowUser } = useFollowData(type);

  const getInitials = (username: string) => {
    return username ? username.substring(0, 2).toUpperCase() : 'U';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full h-[80vh] rounded-t-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {type === 'followers' ? 'Followers' : 'Following'}
          </h2>
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
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No {type === 'followers' ? 'followers' : 'following'} yet
              </div>
            ) : (
              users.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt={user.username || 'User'} 
                          className="w-full h-full rounded-full object-cover" 
                        />
                      ) : (
                        <span className="text-sm font-semibold text-gray-600">
                          {getInitials(user.username || 'User')}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.username || 'Unknown User'}</p>
                      <p className="text-sm text-gray-600">{user.full_name || ''}</p>
                    </div>
                  </div>
                  
                  {type === 'following' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unfollowUser(user.id)}
                      className="flex items-center gap-2"
                    >
                      <UserCheck className="w-4 h-4" />
                      Following
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default FollowersModal;
