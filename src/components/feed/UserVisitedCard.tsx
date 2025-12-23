import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus, Check, Bookmark } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export interface VisitedSaveActivity {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  location_name: string;
  location_category: string;
  location_city: string | null;
  location_id: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  is_following: boolean;
}

interface UserVisitedCardProps {
  activity: VisitedSaveActivity;
}

const UserVisitedCard = memo(({ activity }: UserVisitedCardProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${activity.user_id}`);
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: activity.user_id,
        });

      if (error) throw error;

      toast.success(t('followingUser', { defaultValue: 'Now following!' }));
      queryClient.invalidateQueries({ queryKey: ['visited-saves'] });
    } catch (err) {
      console.error('Error following user:', err);
    }
  };

  const handleCardClick = () => {
    if (activity.latitude && activity.longitude && activity.location_id) {
      navigate('/', {
        state: {
          centerMap: {
            lat: activity.latitude,
            lng: activity.longitude,
            locationId: activity.location_id,
            shouldFocus: true,
          },
          openPinDetail: {
            id: activity.location_id,
            name: activity.location_name,
            lat: activity.latitude,
            lng: activity.longitude,
            category: activity.location_category,
          },
          returnTo: '/feed',
        },
      });
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="mx-4 bg-white/60 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/20 rounded-xl shadow-lg shadow-black/5 dark:shadow-black/20 overflow-hidden cursor-pointer"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <button onClick={handleUserClick} className="shrink-0">
            <Avatar className="h-11 w-11">
              <AvatarImage src={activity.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {activity.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  onClick={handleUserClick}
                  className="font-semibold text-sm hover:opacity-70 truncate text-foreground"
                >
                  {activity.username}
                </button>
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Bookmark className="w-3 h-3" />
                  {t('been', { defaultValue: 'been' })}
                </span>
              </div>
              {!activity.is_following && user?.id !== activity.user_id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs shrink-0 bg-background/50"
                  onClick={handleFollow}
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  {t('follow', { defaultValue: 'Follow' })}
                </Button>
              )}
            </div>

            <h4 className="font-bold text-foreground mt-1 truncate">
              {activity.location_name}
            </h4>

            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <span>{activity.location_category}</span>
              {activity.location_city && (
                <>
                  <span>•</span>
                  <span>{activity.location_city}</span>
                </>
              )}
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

UserVisitedCard.displayName = 'UserVisitedCard';

export default UserVisitedCard;
