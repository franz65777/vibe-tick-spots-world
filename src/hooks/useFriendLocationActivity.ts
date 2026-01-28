import { useQuery } from '@tanstack/react-query';
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
  hasRealSnippet?: boolean;
  postId?: string;
}

interface UseFriendLocationActivityResult {
  activities: FriendActivity[];
  loading: boolean;
}

const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const useFriendLocationActivity = (
  locationId: string | null,
  googlePlaceId?: string | null
): UseFriendLocationActivityResult => {
  const { user } = useAuth();

  const { data: activities = [], isLoading: loading } = useQuery({
    queryKey: ['friend-activity', locationId, googlePlaceId, user?.id],
    queryFn: async (): Promise<FriendActivity[]> => {
      if (!user?.id || (!locationId && !googlePlaceId)) return [];

      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (!follows || follows.length === 0) return [];

      const followedUserIds = follows.map(f => f.following_id);
      const allUserIds = new Set<string>();
      const postsData: Array<{ id: string; user_id: string; rating: number | null; caption: string | null; created_at: string }> = [];
      const savedLocationsData: Array<{ user_id: string; save_tag: string | null; created_at: string }> = [];
      const savedPlacesData: Array<{ user_id: string; save_tag: string | null; created_at: string }> = [];
      const likesData: Array<{ user_id: string; created_at: string }> = [];

      let resolvedLocationId = locationId && isValidUUID(locationId) ? locationId : null;
      
      if (!resolvedLocationId && googlePlaceId) {
        const { data: locationByGoogle } = await supabase
          .from('locations')
          .select('id')
          .eq('google_place_id', googlePlaceId)
          .limit(1)
          .single();
        if (locationByGoogle?.id) resolvedLocationId = locationByGoogle.id;
      }

      const [postsResult, savedLocationsResult, savedPlacesResult, likesResult] = await Promise.all([
        resolvedLocationId
          ? supabase.from('posts').select('id, user_id, rating, caption, created_at')
              .eq('location_id', resolvedLocationId).in('user_id', followedUserIds)
              .order('created_at', { ascending: false }).limit(10)
          : Promise.resolve({ data: null }),
        resolvedLocationId
          ? supabase.from('user_saved_locations').select('user_id, save_tag, created_at')
              .eq('location_id', resolvedLocationId).in('user_id', followedUserIds)
              .order('created_at', { ascending: false }).limit(10)
          : Promise.resolve({ data: null }),
        googlePlaceId
          ? supabase.from('saved_places').select('user_id, save_tag, created_at')
              .eq('place_id', googlePlaceId).in('user_id', followedUserIds)
              .order('created_at', { ascending: false }).limit(10)
          : Promise.resolve({ data: null }),
        resolvedLocationId
          ? supabase.from('location_likes').select('user_id, created_at')
              .eq('location_id', resolvedLocationId).in('user_id', followedUserIds)
              .order('created_at', { ascending: false }).limit(5)
          : Promise.resolve({ data: null }),
      ]);

      postsResult.data?.forEach(post => { allUserIds.add(post.user_id); postsData.push(post); });
      savedLocationsResult.data?.forEach(save => { allUserIds.add(save.user_id); savedLocationsData.push(save); });
      savedPlacesResult.data?.forEach(save => { allUserIds.add(save.user_id); savedPlacesData.push(save); });
      likesResult.data?.forEach(like => { allUserIds.add(like.user_id); likesData.push(like); });

      if (allUserIds.size === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', Array.from(allUserIds));

      const profileMap = new Map<string, { username: string | null; avatar_url: string | null }>();
      profiles?.forEach(p => profileMap.set(p.id, { username: p.username, avatar_url: p.avatar_url }));

      const activityMap = new Map<string, FriendActivity>();

      postsData.forEach(post => {
        if (!activityMap.has(post.user_id)) {
          const profile = profileMap.get(post.user_id);
          if (profile) {
            const hasReview = post.rating && post.rating > 0;
            const rawSnippet = post.caption?.slice(0, 60);
            const fallbackSnippet = hasReview ? 'ha lasciato una review' : 'ha postato una foto';
            activityMap.set(post.user_id, {
              userId: post.user_id, username: profile.username || 'User', avatarUrl: profile.avatar_url,
              actionType: hasReview ? 'review' : 'posted', createdAt: post.created_at,
              snippet: rawSnippet || fallbackSnippet, hasRealSnippet: !!rawSnippet, postId: post.id
            });
          }
        }
      });

      savedLocationsData.forEach(save => {
        if (!activityMap.has(save.user_id)) {
          const profile = profileMap.get(save.user_id);
          if (profile) {
            const saveTag = (save.save_tag as 'favourite' | 'been' | 'to_try' | 'general') || 'general';
            activityMap.set(save.user_id, {
              userId: save.user_id, username: profile.username || 'User', avatarUrl: profile.avatar_url,
              actionType: saveTag === 'favourite' ? 'favourite' : saveTag === 'been' ? 'been' : 'saved',
              saveTag, createdAt: save.created_at
            });
          }
        }
      });

      savedPlacesData.forEach(save => {
        if (!activityMap.has(save.user_id)) {
          const profile = profileMap.get(save.user_id);
          if (profile) {
            const saveTag = (save.save_tag as 'favourite' | 'been' | 'to_try' | 'general') || 'general';
            activityMap.set(save.user_id, {
              userId: save.user_id, username: profile.username || 'User', avatarUrl: profile.avatar_url,
              actionType: saveTag === 'favourite' ? 'favourite' : saveTag === 'been' ? 'been' : 'saved',
              saveTag, createdAt: save.created_at
            });
          }
        }
      });

      likesData.forEach(like => {
        if (!activityMap.has(like.user_id)) {
          const profile = profileMap.get(like.user_id);
          if (profile) {
            activityMap.set(like.user_id, {
              userId: like.user_id, username: profile.username || 'User', avatarUrl: profile.avatar_url,
              actionType: 'liked', createdAt: like.created_at
            });
          }
        }
      });

      const priorityMap: Record<string, number> = { review: 1, posted: 2, favourite: 3, saved: 4, been: 5, liked: 6 };
      return Array.from(activityMap.values()).sort((a, b) => {
        const aPriority = priorityMap[a.actionType] || 99;
        const bPriority = priorityMap[b.actionType] || 99;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    },
    enabled: !!user?.id && (!!locationId || !!googlePlaceId),
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 10 * 60 * 1000,
  });

  return { activities, loading };
};
