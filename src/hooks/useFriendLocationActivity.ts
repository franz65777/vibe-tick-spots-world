import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FriendActivity {
  userId: string;
  username: string;
  avatarUrl: string | null;
  actionType: 'saved' | 'been' | 'favourite' | 'liked' | 'posted' | 'review';
  saveTag?: 'favourite' | 'been' | 'to_try' | 'general';
  createdAt: string;
}

interface UseFriendLocationActivityResult {
  activities: FriendActivity[];
  loading: boolean;
}

// Utility to check if string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const useFriendLocationActivity = (
  locationId: string | null,
  googlePlaceId?: string | null
): UseFriendLocationActivityResult => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFriendActivities = async () => {
      if (!user?.id || (!locationId && !googlePlaceId)) {
        setActivities([]);
        return;
      }

      setLoading(true);
      try {
        // 1. Get list of followed users
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (!follows || follows.length === 0) {
          setActivities([]);
          setLoading(false);
          return;
        }

        const followedUserIds = follows.map(f => f.following_id);
        const activityMap = new Map<string, FriendActivity>();

        // 2. Query posts from followed users for this location
        if (locationId && isValidUUID(locationId)) {
          const { data: friendPosts } = await supabase
            .from('posts')
            .select(`
              user_id,
              caption,
              rating,
              created_at,
              profiles!inner(id, username, avatar_url)
            `)
            .eq('location_id', locationId)
            .in('user_id', followedUserIds)
            .order('created_at', { ascending: false })
            .limit(10);

          friendPosts?.forEach((post: any) => {
            if (!activityMap.has(post.user_id)) {
              const hasReview = post.rating && post.rating > 0;
              activityMap.set(post.user_id, {
                userId: post.user_id,
                username: post.profiles.username || 'User',
                avatarUrl: post.profiles.avatar_url,
                actionType: hasReview ? 'review' : 'posted',
                createdAt: post.created_at
              });
            }
          });
        }

        // 3. Query saved locations from followed users
        if (locationId && isValidUUID(locationId)) {
          const { data: friendSavedLocations } = await supabase
            .from('user_saved_locations')
            .select(`
              user_id,
              save_tag,
              created_at,
              profiles!inner(id, username, avatar_url)
            `)
            .eq('location_id', locationId)
            .in('user_id', followedUserIds)
            .order('created_at', { ascending: false })
            .limit(10);

          friendSavedLocations?.forEach((save: any) => {
            // Only add if this user doesn't already have a post activity
            if (!activityMap.has(save.user_id)) {
              const saveTag = (save.save_tag as 'favourite' | 'been' | 'to_try' | 'general') || 'general';
              activityMap.set(save.user_id, {
                userId: save.user_id,
                username: save.profiles.username || 'User',
                avatarUrl: save.profiles.avatar_url,
                actionType: saveTag === 'favourite' ? 'favourite' : saveTag === 'been' ? 'been' : 'saved',
                saveTag,
                createdAt: save.created_at
              });
            }
          });
        }

        // 4. Query saved places by google_place_id if no internal location_id results
        if (googlePlaceId && activityMap.size < 5) {
          const { data: friendSavedPlaces } = await supabase
            .from('saved_places')
            .select(`
              user_id,
              save_tag,
              created_at,
              profiles!inner(id, username, avatar_url)
            `)
            .eq('place_id', googlePlaceId)
            .in('user_id', followedUserIds)
            .order('created_at', { ascending: false })
            .limit(10);

          friendSavedPlaces?.forEach((save: any) => {
            if (!activityMap.has(save.user_id)) {
              const saveTag = (save.save_tag as 'favourite' | 'been' | 'to_try' | 'general') || 'general';
              activityMap.set(save.user_id, {
                userId: save.user_id,
                username: save.profiles.username || 'User',
                avatarUrl: save.profiles.avatar_url,
                actionType: saveTag === 'favourite' ? 'favourite' : saveTag === 'been' ? 'been' : 'saved',
                saveTag,
                createdAt: save.created_at
              });
            }
          });
        }

        // 5. Query location likes from followed users
        if (locationId && isValidUUID(locationId) && activityMap.size < 10) {
          const { data: friendLikes } = await supabase
            .from('location_likes')
            .select(`
              user_id,
              created_at,
              profiles!inner(id, username, avatar_url)
            `)
            .eq('location_id', locationId)
            .in('user_id', followedUserIds)
            .order('created_at', { ascending: false })
            .limit(5);

          friendLikes?.forEach((like: any) => {
            if (!activityMap.has(like.user_id)) {
              activityMap.set(like.user_id, {
                userId: like.user_id,
                username: like.profiles.username || 'User',
                avatarUrl: like.profiles.avatar_url,
                actionType: 'liked',
                createdAt: like.created_at
              });
            }
          });
        }

        // Convert map to array, sorted by most recent
        const activitiesArray = Array.from(activityMap.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setActivities(activitiesArray);
      } catch (error) {
        console.error('Error fetching friend location activities:', error);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFriendActivities();
  }, [user?.id, locationId, googlePlaceId]);

  return { activities, loading };
};
