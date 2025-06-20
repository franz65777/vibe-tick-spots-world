import React from 'react';
import { MessageCircle, UserPlus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

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
  const isFollowing = user.is_following || user.isFollowing;

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-white shadow-sm border border-gray-100">
      <div className="flex items-center gap-3" onClick={() => onUserClick(user)} style={{cursor: 'pointer'}}>
        <Avatar>
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-gray-900">{user.name}</p>
          <p className="text-sm text-gray-500">@{user.username}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isFollowing ? (
          <Button size="icon" variant="outline" onClick={() => onFollowUser(user.id)}>
            <UserPlus className="w-4 h-4" />
          </Button>
        ) : (
          <Button size="icon" variant="outline" onClick={() => onFollowUser(user.id)}>
            <UserCheck className="w-4 h-4" />
          </Button>
        )}
        <Button size="icon" onClick={() => onMessageUser(user.id)}>
          <MessageCircle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default UserCard;
