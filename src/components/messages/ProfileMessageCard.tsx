import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ProfileMessageCardProps {
  profileData: {
    id: string;
    username: string;
    avatar_url?: string;
    bio?: string;
    follower_count?: number;
    following_count?: number;
    posts_count?: number;
  };
}

const ProfileMessageCard = ({ profileData }: ProfileMessageCardProps) => {
  const navigate = useNavigate();

  const handleViewProfile = () => {
    navigate(`/profile/${profileData.id}`);
  };

  return (
    <div className="p-4 bg-background">
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-14 w-14">
          <AvatarImage src={profileData.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            {profileData.username?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground">@{profileData.username}</p>
          {profileData.bio && (
            <p className="text-xs text-muted-foreground truncate">{profileData.bio}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm mb-3">
        {profileData.posts_count !== undefined && (
          <div>
            <span className="font-bold text-foreground">{profileData.posts_count}</span>{' '}
            <span className="text-muted-foreground">posts</span>
          </div>
        )}
        {profileData.follower_count !== undefined && (
          <div>
            <span className="font-bold text-foreground">{profileData.follower_count}</span>{' '}
            <span className="text-muted-foreground">followers</span>
          </div>
        )}
        {profileData.following_count !== undefined && (
          <div>
            <span className="font-bold text-foreground">{profileData.following_count}</span>{' '}
            <span className="text-muted-foreground">following</span>
          </div>
        )}
      </div>

      <Button 
        onClick={handleViewProfile}
        className="w-full rounded-lg font-semibold"
        size="sm"
      >
        View Profile
      </Button>
    </div>
  );
};

export default ProfileMessageCard;
