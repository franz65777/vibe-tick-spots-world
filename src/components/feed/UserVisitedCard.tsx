import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { it, enUS, es, fr, de } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { getCategoryImage } from '@/utils/categoryIcons';

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

const getDateLocale = (lang: string) => {
  switch (lang) {
    case 'it': return it;
    case 'es': return es;
    case 'fr': return fr;
    case 'de': return de;
    default: return enUS;
  }
};

const UserVisitedCard = memo(({ activity }: UserVisitedCardProps) => {
  const { t, i18n } = useTranslation();
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

  const categoryIcon = getCategoryImage(activity.location_category);
  const dateLocale = getDateLocale(i18n.language);
  const formattedDate = formatDistanceToNow(new Date(activity.created_at), { 
    addSuffix: true, 
    locale: dateLocale 
  });

  return (
    <div className="mx-4">
      {/* Card */}
      <div
        onClick={handleCardClick}
        className="bg-white/60 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/20 rounded-xl shadow-lg shadow-black/5 dark:shadow-black/20 overflow-hidden cursor-pointer"
      >
        <div className="p-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <button onClick={handleUserClick} className="shrink-0">
              <Avatar className="h-10 w-10">
                <AvatarImage src={activity.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                  {activity.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleUserClick}
                  className="font-semibold text-sm hover:opacity-70 truncate text-foreground"
                >
                  {activity.username}
                </button>
                <span className="text-xs text-muted-foreground">
                  {t('visited', { ns: 'common', defaultValue: 'visited' })}
                </span>
              </div>

              <h4 className="font-bold text-foreground text-sm truncate">
                {activity.location_name}
              </h4>

              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <img src={categoryIcon} alt="" className="w-3.5 h-3.5" />
                {activity.location_city && (
                  <span>{activity.location_city}</span>
                )}
              </p>
            </div>

            {/* Follow button */}
            {!activity.is_following && user?.id !== activity.user_id && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs shrink-0 bg-background/50 rounded-full px-3"
                onClick={handleFollow}
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                {t('follow', { defaultValue: 'Follow' })}
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Date below the card */}
      <p className="text-xs text-muted-foreground mt-1.5 px-1">
        {formattedDate}
      </p>
    </div>
  );
});

UserVisitedCard.displayName = 'UserVisitedCard';

export default UserVisitedCard;
