
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  followers: number;
  following: number;
  savedPlaces: number;
  isFollowing: boolean;
}

interface UserCardProps {
  user: User;
}

const UserCard = ({ user }: UserCardProps) => {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <Avatar className="w-12 h-12">
          <AvatarImage 
            src={`https://images.unsplash.com/${user.avatar}?w=100&h=100&fit=crop&crop=face`} 
            alt={user.name}
          />
          <AvatarFallback>{user.name[0]}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{user.name}</h3>
          <p className="text-sm text-gray-500">{user.username}</p>
          <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
            <span>{user.followers} followers</span>
            <span>{user.savedPlaces} places</span>
          </div>
        </div>
        
        <Button 
          variant={user.isFollowing ? "outline" : "default"}
          size="sm"
          className="px-4"
        >
          {user.isFollowing ? 'Following' : 'Follow'}
        </Button>
      </div>
    </div>
  );
};

export default UserCard;
