import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface ProfileMessageCardProps {
  profileData: {
    id: string;
    username: string;
    avatar_url?: string;
    bio?: string;
    places_visited?: number;
    cities_visited?: number;
    posts_count?: number;
    recent_photos?: string[];
  };
}

const ProfileMessageCard = ({ profileData }: ProfileMessageCardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleViewProfile = () => {
    navigate(`/profile/${profileData.id}`);
  };

  // Remove @ from username if present
  const displayUsername = profileData.username?.startsWith('@') 
    ? profileData.username.slice(1) 
    : profileData.username;

  return (
    <div 
      className="p-4 bg-muted/30 rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={handleViewProfile}
    >
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={profileData.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {profileData.username?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-base">{displayUsername}</p>
          {profileData.bio && (
            <p className="text-xs text-muted-foreground truncate">{profileData.bio}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        {profileData.posts_count !== undefined && (
          <div>
            <span className="font-bold text-foreground">{profileData.posts_count}</span>{' '}
            <span className="text-muted-foreground">{t('userProfile.photos', { ns: 'common' })}</span>
          </div>
        )}
        {profileData.places_visited !== undefined && (
          <div>
            <span className="font-bold text-foreground">{profileData.places_visited}</span>{' '}
            <span className="text-muted-foreground">{t('userProfile.saved', { ns: 'common' })}</span>
          </div>
        )}
        {profileData.cities_visited !== undefined && (
          <div>
            <span className="font-bold text-foreground">{profileData.cities_visited}</span>{' '}
            <span className="text-muted-foreground">{t('userProfile.cities', { ns: 'common' })}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileMessageCard;
