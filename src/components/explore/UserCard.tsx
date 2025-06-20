
import React, { useState } from 'react';
import { MessageCircle, UserPlus, UserCheck, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type SortBy = 'proximity' | 'likes' | 'saves' | 'following' | 'recent';

interface UserCardProps {
  user: any;
  onUserClick: (user: any) => void;
  onFollowUser: (userId: string) => void;
  onMessageUser: (userId: string) => void;
  sortBy?: SortBy;
}

const UserCard = ({
  user,
  onUserClick,
  onFollowUser,
  onMessageUser,
  sortBy
}: UserCardProps) => {
  const [isOptimisticFollowing, setIsOptimisticFollowing] = useState(user.is_following || user.isFollowing);
  const [showPreview, setShowPreview] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFollowLoading) return;
    
    setIsFollowLoading(true);
    const previousState = isOptimisticFollowing;
    
    // Optimistic update
    setIsOptimisticFollowing(!isOptimisticFollowing);
    
    try {
      await onFollowUser(user.id);
    } catch (error) {
      // Revert on error
      setIsOptimisticFollowing(previousState);
      console.error('Failed to update follow status:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMessageUser(user.id);
  };

  const handleRowClick = () => {
    setShowPreview(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-red-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <>
      <div 
        className="flex items-center justify-between p-4 rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md hover:bg-gray-50 transition-all duration-200 cursor-pointer group"
        onClick={handleRowClick}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="w-12 h-12 ring-2 ring-white shadow-sm">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className={`${getAvatarColor(user.name)} text-white font-semibold`}>
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-gray-900 truncate">{user.name}</p>
              {user.follows_you && (
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                  Follows you
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-gray-500 truncate">@{user.username}</p>
            
            {user.mutual_followers > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {user.mutual_followers} mutual friend{user.mutual_followers !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-3">
          <Button 
            size="sm"
            variant={isOptimisticFollowing ? "outline" : "default"}
            onClick={handleFollowClick}
            disabled={isFollowLoading}
            className={`min-h-[44px] px-4 transition-all ${
              isOptimisticFollowing 
                ? 'text-gray-600 hover:text-red-600 hover:border-red-300' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            aria-label={isOptimisticFollowing ? 'Unfollow user' : 'Follow user'}
          >
            {isFollowLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isOptimisticFollowing ? (
              <>
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Following</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Follow</span>
              </>
            )}
          </Button>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleMessageClick}
            className="min-h-[44px] px-3"
            aria-label="Send message to user"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Message</span>
          </Button>
        </div>
      </div>

      {/* User Profile Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">User Profile Preview</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-4 p-0 h-8 w-8"
              onClick={() => setShowPreview(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>
          
          <div className="flex flex-col items-center text-center space-y-4 py-4">
            <Avatar className="w-20 h-20 ring-4 ring-white shadow-lg">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className={`${getAvatarColor(user.name)} text-white text-xl font-bold`}>
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h3 className="font-bold text-xl text-gray-900">{user.name}</h3>
              <p className="text-gray-500">@{user.username}</p>
            </div>

            {user.bio && (
              <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
                {user.bio}
              </p>
            )}

            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-900">{user.followers || 0}</div>
                <div className="text-gray-500">Followers</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">{user.following || 0}</div>
                <div className="text-gray-500">Following</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">{user.savedPlaces || 0}</div>
                <div className="text-gray-500">Places</div>
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <Button 
                variant={isOptimisticFollowing ? "outline" : "default"}
                onClick={handleFollowClick}
                disabled={isFollowLoading}
                className="flex-1"
              >
                {isFollowLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isOptimisticFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Follow
                  </>
                )}
              </Button>
              
              <Button variant="outline" onClick={handleMessageClick} className="flex-1">
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
              </Button>
            </div>

            <Button 
              variant="ghost" 
              className="text-blue-600 hover:text-blue-700"
              onClick={() => {
                setShowPreview(false);
                onUserClick(user);
              }}
            >
              View Full Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserCard;
