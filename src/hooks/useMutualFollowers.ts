import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MutualFollower {
  id: string;
  username: string;
  avatar_url: string | null;
  savedPlacesCount?: number;
  isFollowing?: boolean;
}

export const useMutualFollowers = (viewedUserId?: string, fetchAll: boolean = false) => {
  const { user: currentUser } = useAuth();
  const [mutualFollowers, setMutualFollowers] = useState<MutualFollower[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip if no valid user id
    if (!viewedUserId) {
      setMutualFollowers([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    const fetchMutualFollowers = async () => {
      if (!currentUser || currentUser.id === viewedUserId) {
        setMutualFollowers([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      try {
        // Get people who follow the viewed user
        const { data: viewedUserFollowers, error: followersError } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', viewedUserId);

        if (followersError) throw followersError;

        // Get people the current user follows
        const { data: currentUserFollows, error: followsError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id);

        if (followsError) throw followsError;

        // Find intersection: people current user follows who also follow the viewed user
        const followerIds = new Set(viewedUserFollowers?.map(f => f.follower_id) || []);
        const followingIds = new Set(currentUserFollows?.map(f => f.following_id) || []);
        
        const mutualIds = Array.from(followingIds).filter(id => followerIds.has(id));

        if (mutualIds.length === 0) {
          setMutualFollowers([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }

        // Fetch profiles for mutual followers - get all if fetchAll, otherwise limit to 3
        const profilesQuery = supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', fetchAll ? mutualIds : mutualIds.slice(0, 3));

        const { data: profiles, error: profilesError } = await profilesQuery;

        if (profilesError) throw profilesError;

        // If fetching all, also get saved places count
        if (fetchAll && profiles) {
          const userIds = profiles.map(p => p.id);
          
          const [savedPlacesResult, userSavedLocationsResult] = await Promise.all([
            supabase
              .from('saved_places')
              .select('user_id, place_id')
              .in('user_id', userIds),
            supabase
              .from('user_saved_locations')
              .select('user_id, location_id')
              .in('user_id', userIds)
          ]);

          const savedPlacesDistinct = new Map<string, Set<string>>();
          savedPlacesResult.data?.forEach((sp: any) => {
            if (!sp.user_id || !sp.place_id) return;
            if (!savedPlacesDistinct.has(sp.user_id)) savedPlacesDistinct.set(sp.user_id, new Set());
            savedPlacesDistinct.get(sp.user_id)!.add(`sp_${sp.place_id}`);
          });

          userSavedLocationsResult.data?.forEach((usl: any) => {
            if (!usl.user_id || !usl.location_id) return;
            if (!savedPlacesDistinct.has(usl.user_id)) savedPlacesDistinct.set(usl.user_id, new Set());
            savedPlacesDistinct.get(usl.user_id)!.add(`usl_${usl.location_id}`);
          });

          const enrichedProfiles = profiles.map(p => ({
            ...p,
            savedPlacesCount: savedPlacesDistinct.get(p.id)?.size || 0,
            isFollowing: true, // They're mutual, so current user follows them
          }));

          setMutualFollowers(enrichedProfiles);
        } else {
          setMutualFollowers(profiles || []);
        }

        setTotalCount(mutualIds.length);
      } catch (err) {
        console.error('Error fetching mutual followers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMutualFollowers();
  }, [currentUser, viewedUserId, fetchAll]);

  return { mutualFollowers, totalCount, loading };
};
