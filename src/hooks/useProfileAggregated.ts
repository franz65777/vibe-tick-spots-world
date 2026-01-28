import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeEvent } from '@/hooks/useCentralizedRealtime';

interface CategoryCounts {
  all: number;
  been: number;
  toTry: number;
  favourite: number;
}

interface ProfileStats {
  followersCount: number;
  followingCount: number;
  postsCount: number;
  locationsCount: number;
}

interface ProfileAggregatedData {
  profile: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
    bio?: string;
    current_city?: string;
    email?: string;
    posts_count?: number;
    follower_count?: number;
    following_count?: number;
    cities_visited?: number;
    places_visited?: number;
    is_business_user?: boolean;
    created_at?: string;
    updated_at?: string;
  } | null;
  stats: ProfileStats;
  categoryCounts: CategoryCounts;
}

/**
 * Consolidated profile hook - fetches profile, stats, and category counts in a single parallel query
 * 
 * PERFORMANCE: Reduces 5-6 separate queries to 1 parallel batch
 * - Profile data
 * - Followers count
 * - Following count  
 * - Saved locations (with save_tag for category counts)
 * - Saved places (with save_tag for category counts)
 * 
 * Expected improvement: ~400ms -> ~100ms
 */
export const useProfileAggregated = (userId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['profile-aggregated', targetUserId],
    queryFn: async (): Promise<ProfileAggregatedData | null> => {
      if (!targetUserId) return null;

      // PARALLEL: All critical queries together - single round trip
      const [
        profileRes,
        followersRes,
        followingRes,
        savedLocationsRes,
        savedPlacesRes
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .maybeSingle(),
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', targetUserId),
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', targetUserId),
        supabase
          .from('user_saved_locations')
          .select('location_id, save_tag, locations(city)')
          .eq('user_id', targetUserId),
        supabase
          .from('saved_places')
          .select('id, city, save_tag')
          .eq('user_id', targetUserId),
      ]);

      // Handle profile not existing - create if needed
      let profile = profileRes.data;
      if (!profile && profileRes.error?.code === 'PGRST116') {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: targetUserId,
            username: user?.email?.split('@')[0] || 'user',
            email: user?.email,
          })
          .select()
          .single();
        profile = newProfile;
      }

      // Calculate category counts from saved locations and places
      const savedLocations = savedLocationsRes.data || [];
      const savedPlaces = savedPlacesRes.data || [];

      let beenCount = 0;
      let toTryCount = 0;
      let favouriteCount = 0;
      let totalCount = 0;

      // Count from user_saved_locations
      savedLocations.forEach((loc: any) => {
        totalCount++;
        if (loc.save_tag === 'been') beenCount++;
        else if (loc.save_tag === 'to-try' || loc.save_tag === 'to_try' || loc.save_tag === 'general') toTryCount++;
        else if (loc.save_tag === 'favourite') favouriteCount++;
        else toTryCount++; // Default to to-try
      });

      // Count from saved_places (Google Places)
      savedPlaces.forEach((sp: any) => {
        totalCount++;
        if (sp.save_tag === 'been') beenCount++;
        else if (sp.save_tag === 'to-try' || sp.save_tag === 'to_try' || sp.save_tag === 'general') toTryCount++;
        else if (sp.save_tag === 'favourite') favouriteCount++;
        else toTryCount++;
      });

      const categoryCounts: CategoryCounts = {
        all: totalCount,
        been: beenCount,
        toTry: toTryCount,
        favourite: favouriteCount
      };

      const stats: ProfileStats = {
        followersCount: followersRes.count || 0,
        followingCount: followingRes.count || 0,
        postsCount: profile?.posts_count || 0,
        locationsCount: totalCount,
      };

      console.log('Profile aggregated loaded:', profile?.username, 'Stats:', stats);

      return {
        profile,
        stats,
        categoryCounts,
      };
    },
    enabled: !!targetUserId,
    staleTime: 2 * 60 * 1000, // 2 minutes - profile data doesn't change frequently
    gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
    refetchOnMount: 'always',
  });

  // Invalidation callback for realtime events
  const invalidate = useCallback(() => {
    if (targetUserId) {
      queryClient.invalidateQueries({ queryKey: ['profile-aggregated', targetUserId] });
    }
  }, [queryClient, targetUserId]);

  // Subscribe to relevant realtime events
  useRealtimeEvent(['follow_insert', 'follow_delete'], useCallback((payload: any) => {
    if (payload.following_id === targetUserId || payload.follower_id === targetUserId) {
      invalidate();
    }
  }, [targetUserId, invalidate]));

  useRealtimeEvent(['saved_location_insert', 'saved_location_delete', 'saved_place_insert', 'saved_place_delete'], useCallback((payload: any) => {
    if (payload?.user_id === targetUserId) {
      invalidate();
    }
  }, [targetUserId, invalidate]));

  useRealtimeEvent('profile_update', useCallback((payload: any) => {
    if (payload?.id === targetUserId) {
      invalidate();
    }
  }, [targetUserId, invalidate]));

  return {
    data,
    profile: data?.profile || null,
    stats: data?.stats || { followersCount: 0, followingCount: 0, postsCount: 0, locationsCount: 0 },
    categoryCounts: data?.categoryCounts || { all: 0, been: 0, toTry: 0, favourite: 0 },
    loading: isLoading,
    error: error?.message,
    refetch,
  };
};
