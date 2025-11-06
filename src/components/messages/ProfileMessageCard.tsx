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
        {profileData.posts_count !== undefined && (
          <div>
            <span className="font-bold text-foreground">{profileData.posts_count}</span>{' '}
            <span className="text-muted-foreground">{t('userProfile.photos', { ns: 'common' })}</span>
          </div>
        )}
      </div>

      {/* Recent Photos */}
      {profileData.recent_photos && profileData.recent_photos.length > 0 && (
        <div className="grid grid-cols-3 gap-1 mb-3">
          {profileData.recent_photos.slice(0, 3).map((photoUrl, index) => (
            <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
              <img 
                src={photoUrl} 
                alt={`Recent photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <Button 
        onClick={handleViewProfile}
        className="w-full rounded-lg font-semibold"
        size="sm"
      >
        {t('viewProfile', { ns: 'messages' })}
      </Button>
    </div>
  );
};

export default ProfileMessageCard;
