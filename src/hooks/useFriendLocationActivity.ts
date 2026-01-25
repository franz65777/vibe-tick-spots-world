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
  snippet?: string;
  hasRealSnippet?: boolean; // true if snippet is from real caption
  postId?: string; // ID of the post for navigation
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
        const allUserIds = new Set<string>();
        
        // Temporary storage for activities before profile merge
        const postsData: Array<{ id: string; user_id: string; rating: number | null; caption: string | null; created_at: string }> = [];
        const savedLocationsData: Array<{ user_id: string; save_tag: string | null; created_at: string }> = [];
        const savedPlacesData: Array<{ user_id: string; save_tag: string | null; created_at: string }> = [];
        const likesData: Array<{ user_id: string; created_at: string }> = [];

        // 2. Query posts from followed users (by location_id OR by google_place_id)
        if (locationId && isValidUUID(locationId)) {
          const { data: friendPosts } = await supabase
            .from('posts')
            .select('id, user_id, rating, caption, created_at')
            .eq('location_id', locationId)
            .in('user_id', followedUserIds)
            .order('created_at', { ascending: false })
            .limit(10);

          friendPosts?.forEach((post) => {
            allUserIds.add(post.user_id);
            postsData.push(post);
          });
        }
        
        // 2b. Also query posts by google_place_id (find location first, then get posts)
        if (googlePlaceId && postsData.length === 0) {
          // First find the location by google_place_id
          const { data: locationByGoogle } = await supabase
            .from('locations')
            .select('id')
            .eq('google_place_id', googlePlaceId)
            .limit(1)
            .single();
          
          if (locationByGoogle?.id) {
            const { data: friendPostsByGoogle } = await supabase
              .from('posts')
              .select('id, user_id, rating, caption, created_at')
              .eq('location_id', locationByGoogle.id)
              .in('user_id', followedUserIds)
              .order('created_at', { ascending: false })
              .limit(10);

            friendPostsByGoogle?.forEach((post) => {
              allUserIds.add(post.user_id);
              postsData.push(post);
            });
          }
        }

        // 3. Query saved locations (NO join with profiles)
        if (locationId && isValidUUID(locationId)) {
          const { data: friendSavedLocations } = await supabase
            .from('user_saved_locations')
            .select('user_id, save_tag, created_at')
            .eq('location_id', locationId)
            .in('user_id', followedUserIds)
            .order('created_at', { ascending: false })
            .limit(10);

          friendSavedLocations?.forEach((save) => {
            allUserIds.add(save.user_id);
            savedLocationsData.push(save);
          });
        }

        // 4. Query saved places by google_place_id (NO join with profiles)
        if (googlePlaceId) {
          const { data: friendSavedPlaces } = await supabase
            .from('saved_places')
            .select('user_id, save_tag, created_at')
            .eq('place_id', googlePlaceId)
            .in('user_id', followedUserIds)
            .order('created_at', { ascending: false })
            .limit(10);

          friendSavedPlaces?.forEach((save) => {
            allUserIds.add(save.user_id);
            savedPlacesData.push(save);
          });
        }

        // 5. Query location likes (NO join with profiles)
        if (locationId && isValidUUID(locationId)) {
          const { data: friendLikes } = await supabase
            .from('location_likes')
            .select('user_id, created_at')
            .eq('location_id', locationId)
            .in('user_id', followedUserIds)
            .order('created_at', { ascending: false })
            .limit(5);

          friendLikes?.forEach((like) => {
            allUserIds.add(like.user_id);
            likesData.push(like);
          });
        }

        // 6. If no activities found, return early
        if (allUserIds.size === 0) {
          setActivities([]);
          setLoading(false);
          return;
        }

        // 7. Fetch profiles separately for all users who have activities
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', Array.from(allUserIds));

        // Create profile map for quick lookup
        const profileMap = new Map<string, { username: string | null; avatar_url: string | null }>();
        profiles?.forEach(p => profileMap.set(p.id, { username: p.username, avatar_url: p.avatar_url }));

        // 8. Build activity map with profile data
        const activityMap = new Map<string, FriendActivity>();

        // Process posts (highest priority)
        postsData.forEach((post) => {
          if (!activityMap.has(post.user_id)) {
            const profile = profileMap.get(post.user_id);
            if (profile) {
              const hasReview = post.rating && post.rating > 0;
              const rawSnippet = post.caption?.slice(0, 60);
              // Fallback snippet if no caption
              const fallbackSnippet = hasReview 
                ? 'ha lasciato una review' 
                : 'ha postato una foto';
              
              activityMap.set(post.user_id, {
                userId: post.user_id,
                username: profile.username || 'User',
                avatarUrl: profile.avatar_url,
                actionType: hasReview ? 'review' : 'posted',
                createdAt: post.created_at,
                snippet: rawSnippet || fallbackSnippet,
                hasRealSnippet: !!rawSnippet,
                postId: post.id
              });
            }
          }
        });

        // Process saved locations
        savedLocationsData.forEach((save) => {
          if (!activityMap.has(save.user_id)) {
            const profile = profileMap.get(save.user_id);
            if (profile) {
              const saveTag = (save.save_tag as 'favourite' | 'been' | 'to_try' | 'general') || 'general';
              activityMap.set(save.user_id, {
                userId: save.user_id,
                username: profile.username || 'User',
                avatarUrl: profile.avatar_url,
                actionType: saveTag === 'favourite' ? 'favourite' : saveTag === 'been' ? 'been' : 'saved',
                saveTag,
                createdAt: save.created_at
              });
            }
          }
        });

        // Process saved places
        savedPlacesData.forEach((save) => {
          if (!activityMap.has(save.user_id)) {
            const profile = profileMap.get(save.user_id);
            if (profile) {
              const saveTag = (save.save_tag as 'favourite' | 'been' | 'to_try' | 'general') || 'general';
              activityMap.set(save.user_id, {
                userId: save.user_id,
                username: profile.username || 'User',
                avatarUrl: profile.avatar_url,
                actionType: saveTag === 'favourite' ? 'favourite' : saveTag === 'been' ? 'been' : 'saved',
                saveTag,
                createdAt: save.created_at
              });
            }
          }
        });

        // Process likes (lowest priority)
        likesData.forEach((like) => {
          if (!activityMap.has(like.user_id)) {
            const profile = profileMap.get(like.user_id);
            if (profile) {
              activityMap.set(like.user_id, {
                userId: like.user_id,
                username: profile.username || 'User',
                avatarUrl: profile.avatar_url,
                actionType: 'liked',
                createdAt: like.created_at
              });
            }
          }
        });

        // Convert map to array, sorted by priority (post/review first) then by date
        const priorityMap: Record<string, number> = {
          'review': 1,
          'posted': 2,
          'favourite': 3,
          'saved': 4,
          'been': 5,
          'liked': 6
        };
        
        const activitiesArray = Array.from(activityMap.values())
          .sort((a, b) => {
            const aPriority = priorityMap[a.actionType] || 99;
            const bPriority = priorityMap[b.actionType] || 99;
            if (aPriority !== bPriority) {
              return aPriority - bPriority;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });

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
