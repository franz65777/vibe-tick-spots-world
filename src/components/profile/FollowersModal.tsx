
import { useState } from 'react';
import { X, UserPlus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'followers' | 'following';
}

const FollowersModal = ({ isOpen, onClose, type }: FollowersModalProps) => {
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set(['2', '4', '6']));

  // Demo data - in real app, this would come from the database
  const users = [
    { id: '1', username: 'sarah_travels', fullName: 'Sarah Johnson', avatar: null, isFollowing: false },
    { id: '2', username: 'mike_foodie', fullName: 'Mike Chen', avatar: null, isFollowing: true },
    { id: '3', username: 'emma_photography', fullName: 'Emma Wilson', avatar: null, isFollowing: false },
    { id: '4', username: 'alex_adventures', fullName: 'Alex Rodriguez', avatar: null, isFollowing: true },
    { id: '5', username: 'lisa_wanderlust', fullName: 'Lisa Thompson', avatar: null, isFollowing: false },
    { id: '6', username: 'david_explorer', fullName: 'David Kim', avatar: null, isFollowing: true },
    { id: '7', username: 'maria_cuisine', fullName: 'Maria Garcia', avatar: null, isFollowing: false },
    { id: '8', username: 'john_backpacker', fullName: 'John Smith', avatar: null, isFollowing: false },
  ];

  const toggleFollow = (userId: string) => {
    setFollowingUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
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
            {users.map((user) => {
              const isFollowing = followingUsers.has(user.id);
              return (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold text-gray-600">{getInitials(user.username)}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.username}</p>
                      <p className="text-sm text-gray-600">{user.fullName}</p>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant={isFollowing ? "outline" : "default"}
                    onClick={() => toggleFollow(user.id)}
                    className="flex items-center gap-2"
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Follow
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default FollowersModal;
