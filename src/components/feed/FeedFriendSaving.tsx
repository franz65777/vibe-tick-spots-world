import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MapPin, Bookmark, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

interface FriendSaveActivity {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  save_tag: string;
  location_name: string;
  location_category: string;
  location_city: string | null;
  location_id: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  is_following: boolean;
}

const FeedFriendSaving = memo(() => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<FriendSaveActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchActivities = async () => {
      try {
        // Get who user follows
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = following?.map(f => f.following_id) || [];

        if (followingIds.length === 0) {
          setLoading(false);
          return;
        }

        // Get recent saves from followed users (from saved_places and user_saved_locations)
        const { data: recentSaves, error } = await supabase
          .from('saved_places')
          .select(`
            id,
            user_id,
            place_name,
            place_category,
            city,
            save_tag,
            created_at
          `)
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        // Get profiles for these users
        const userIds = [...new Set(recentSaves?.map(s => s.user_id) || [])];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const activitiesWithProfiles: FriendSaveActivity[] = (recentSaves || []).map(save => {
          const profile = profileMap.get(save.user_id);
          return {
            id: save.id,
            user_id: save.user_id,
            username: profile?.username || 'user',
            avatar_url: profile?.avatar_url || null,
            save_tag: save.save_tag || 'to-try',
            location_name: save.place_name,
            location_category: save.place_category || 'restaurant',
            location_city: save.city,
            location_id: null, // Google place, not in our locations table directly
            latitude: null,
            longitude: null,
            created_at: save.created_at,
            is_following: true
          };
        });

        setActivities(activitiesWithProfiles);
      } catch (err) {
        console.error('Error fetching friend activities:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [user?.id]);

  if (loading || activities.length === 0) return null;

  const getSaveTagDisplay = (tag: string) => {
    switch (tag) {
      case 'been':
        return { icon: '✓', text: t('been', { defaultValue: 'been' }) };
      case 'to-try':
      case 'to_try':
        return { icon: '☐', text: t('wantToTry', { defaultValue: 'want to try' }) };
      case 'favourite':
        return { icon: '★', text: t('fav', { defaultValue: 'fav' }) };
      default:
        return { icon: '☐', text: t('wantToTry', { defaultValue: 'want to try' }) };
    }
  };

  const handleUserClick = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Save scroll position before navigating
    sessionStorage.setItem('feed_scroll_anchor', JSON.stringify({ scrollTop: window.scrollY }));
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="py-4 bg-card mx-4 rounded-xl shadow-sm">
      {activities.slice(0, 5).map((activity, idx) => {
        const tagDisplay = getSaveTagDisplay(activity.save_tag);
        
        return (
          <div 
            key={activity.id}
            className={`px-4 py-3 ${idx < activities.slice(0, 5).length - 1 ? 'border-b border-border/50' : ''}`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <button onClick={(e) => handleUserClick(activity.user_id, e)}>
                <Avatar className="h-10 w-10">
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
                      onClick={(e) => handleUserClick(activity.user_id, e)}
                      className="font-semibold text-sm hover:opacity-70 truncate"
                    >
                      {activity.username}
                    </button>
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Bookmark className="w-3 h-3" />
                      {tagDisplay.text}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs shrink-0">
                    <UserPlus className="w-3 h-3 mr-1" />
                    {t('follow', { defaultValue: 'follow' })}
                  </Button>
                </div>

                <h4 className="font-bold text-foreground mt-0.5 truncate">{activity.location_name}</h4>
                
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
        );
      })}
    </div>
  );
});

FeedFriendSaving.displayName = 'FeedFriendSaving';

export default FeedFriendSaving;
