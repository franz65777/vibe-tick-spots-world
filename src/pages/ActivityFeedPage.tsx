import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, MapPin, MessageCircle, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'saved' | 'review' | 'post';
  user_id: string;
  username: string;
  avatar_url: string | null;
  location_name?: string;
  location_id?: string;
  post_id?: string;
  content?: string;
  created_at: string;
}

const ActivityFeedPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadActivityFeed();
  }, [user, navigate]);

  const loadActivityFeed = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get following users
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = following?.map(f => f.following_id) || [];

      if (followingIds.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const activities: Activity[] = [];

      // Get saved locations
      const { data: savedLocations } = await supabase
        .from('user_saved_locations')
        .select(`
          id,
          user_id,
          location_id,
          created_at,
          locations (name),
          profiles (username, avatar_url)
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(20);

      savedLocations?.forEach((item: any) => {
        activities.push({
          id: item.id,
          type: 'saved',
          user_id: item.user_id,
          username: item.profiles?.username || 'Unknown',
          avatar_url: item.profiles?.avatar_url,
          location_name: item.locations?.name,
          location_id: item.location_id,
          created_at: item.created_at
        });
      });

      // Get posts
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          caption,
          created_at,
          location_id,
          locations (name),
          profiles (username, avatar_url)
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(20);

      posts?.forEach((item: any) => {
        activities.push({
          id: item.id,
          type: 'post',
          user_id: item.user_id,
          username: item.profiles?.username || 'Unknown',
          avatar_url: item.profiles?.avatar_url,
          location_name: item.locations?.name,
          location_id: item.location_id,
          post_id: item.id,
          content: item.caption,
          created_at: item.created_at
        });
      });

      // Sort by date
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivities(activities.slice(0, 50));
    } catch (error) {
      console.error('Error loading activity feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'saved':
        return <Heart className="w-5 h-5 text-red-500" fill="currentColor" />;
      case 'post':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <MapPin className="w-5 h-5 text-green-500" />;
    }
  };

  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case 'saved':
        return `saved ${activity.location_name}`;
      case 'post':
        return `posted about ${activity.location_name || 'a place'}`;
      default:
        return 'did something';
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Activity Feed</h1>
        </div>
      </div>

      {/* Activity Feed */}
      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="max-w-2xl mx-auto p-4 space-y-3">
          {loading ? (
            // Loading skeleton
            [...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No Activity Yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Follow people to see their activity here
              </p>
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  if (activity.location_id) {
                    navigate(`/`);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={activity.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {activity.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getActivityIcon(activity.type)}
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-semibold">{activity.username}</span>{' '}
                        <span className="text-gray-600 dark:text-gray-400">{getActivityText(activity)}</span>
                      </p>
                    </div>

                    {activity.content && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {activity.content}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ActivityFeedPage;
