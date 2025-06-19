
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MapPin, MessageCircle, UserPlus, UserCheck } from 'lucide-react';

interface UserCardProps {
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    bio?: string;
    location?: string;
    followers_count?: number;
    following_count?: number;
    posts_count?: number;
    is_following?: boolean;
  };
  onUserClick: (user: any) => void;
  onFollowUser: (userId: string) => void;
  onMessageUser: (userId: string) => void;
}

const UserCard = ({ user, onUserClick, onFollowUser, onMessageUser }: UserCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <Avatar className="w-12 h-12 cursor-pointer" onClick={() => onUserClick(user)}>
          <AvatarImage src={user.avatar_url} />
          <AvatarFallback>{user.full_name?.charAt(0) || user.username?.charAt(0)}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div 
            className="cursor-pointer"
            onClick={() => onUserClick(user)}
          >
            <h3 className="font-semibold text-gray-900 truncate">
              {user.full_name || user.username}
            </h3>
            <p className="text-sm text-gray-500">@{user.username}</p>
          </div>
          
          {user.bio && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{user.bio}</p>
          )}
          
          {user.location && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
              <MapPin className="w-3 h-3" />
              <span>{user.location}</span>
            </div>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>{user.followers_count || 0} followers</span>
            <span>{user.posts_count || 0} posts</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onMessageUser(user.id)}
            className="h-8 w-8 p-0"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
          
          <Button
            size="sm"
            variant={user.is_following ? "secondary" : "default"}
            onClick={() => onFollowUser(user.id)}
            className="h-8 px-3"
          >
            {user.is_following ? (
              <>
                <UserCheck className="w-4 h-4 mr-1" />
                Following
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-1" />
                Follow
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
