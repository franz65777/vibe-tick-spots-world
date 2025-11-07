import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LocationStats {
  totalSaves: number;
  averageRating: number | null;
}

export const useLocationStats = (locationId: string | null, googlePlaceId: string | null) => {
  const [stats, setStats] = useState<LocationStats>({ totalSaves: 0, averageRating: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!locationId && !googlePlaceId) {
      setStats({ totalSaves: 0, averageRating: null });
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch total saves (from both saved_places and user_saved_locations)
        let savesCount = 0;
        
        if (googlePlaceId) {
          const { count: googleSaves } = await supabase
            .from('saved_places')
            .select('*', { count: 'exact', head: true })
            .eq('place_id', googlePlaceId);
          savesCount += googleSaves || 0;
        }
        
        if (locationId) {
          const { count: internalSaves } = await supabase
            .from('user_saved_locations')
            .select('*', { count: 'exact', head: true })
            .eq('location_id', locationId);
          savesCount += internalSaves || 0;
        }

        // Fetch average rating from both interactions AND posts with ratings
        let avgRating = null;
        const allRatings: number[] = [];
        
        if (locationId) {
          // Get ratings from interactions table
          const { data: interactionData } = await supabase
            .from('interactions')
            .select('weight')
            .eq('location_id', locationId)
            .eq('action_type', 'review')
            .not('weight', 'is', null);

          if (interactionData && interactionData.length > 0) {
            const ratings = interactionData.map(i => Number(i.weight)).filter(r => r > 0);
            allRatings.push(...ratings);
          }

          // Get ratings from posts table (posts with rating field)
          const { data: postsData } = await supabase
            .from('posts')
            .select('rating')
            .eq('location_id', locationId)
            .not('rating', 'is', null)
            .gt('rating', 0);

          if (postsData && postsData.length > 0) {
            const postRatings = postsData.map(p => Number(p.rating)).filter(r => r > 0);
            allRatings.push(...postRatings);
          }

          // Calculate average from all ratings
          if (allRatings.length > 0) {
            const sum = allRatings.reduce((acc, r) => acc + r, 0);
            avgRating = Math.round((sum / allRatings.length) * 10) / 10; // Round to 1 decimal
          }
        }
        
        // Also check for Google Place ratings if available (from both interactions and posts)
        if (!avgRating && googlePlaceId) {
          const googleRatings: number[] = [];
          
          // Get matching location IDs for this google_place_id
          const { data: matchingLocations } = await supabase
            .from('locations')
            .select('id')
            .eq('google_place_id', googlePlaceId);

          if (matchingLocations && matchingLocations.length > 0) {
            const matchingLocationIds = matchingLocations.map(l => l.id);
            
            // Get ratings from interactions
            const { data: googleInteractionData } = await supabase
              .from('interactions')
              .select('weight')
              .in('location_id', matchingLocationIds)
              .eq('action_type', 'review')
              .not('weight', 'is', null);

            if (googleInteractionData && googleInteractionData.length > 0) {
              const ratings = googleInteractionData.map(i => Number(i.weight)).filter(r => r > 0);
              googleRatings.push(...ratings);
            }

            // Get ratings from posts
            const { data: googlePostsData } = await supabase
              .from('posts')
              .select('rating')
              .in('location_id', matchingLocationIds)
              .not('rating', 'is', null)
              .gt('rating', 0);

            if (googlePostsData && googlePostsData.length > 0) {
              const postRatings = googlePostsData.map(p => Number(p.rating)).filter(r => r > 0);
              googleRatings.push(...postRatings);
            }

            // Calculate average
            if (googleRatings.length > 0) {
              const sum = googleRatings.reduce((acc, r) => acc + r, 0);
              avgRating = Math.round((sum / googleRatings.length) * 10) / 10;
            }
          }
        }

        setStats({ totalSaves: savesCount, averageRating: avgRating });
      } catch (error) {
        console.error('Error fetching location stats:', error);
        setStats({ totalSaves: 0, averageRating: null });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Set up real-time subscriptions for live updates
    const channels: any[] = [];

    if (googlePlaceId) {
      const savedPlacesChannel = supabase
        .channel(`saved_places_${googlePlaceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'saved_places',
            filter: `place_id=eq.${googlePlaceId}`
          },
          () => {
            fetchStats();
          }
        )
        .subscribe();
      channels.push(savedPlacesChannel);
    }

    if (locationId) {
      const userSavedChannel = supabase
        .channel(`user_saved_locations_${locationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_saved_locations',
            filter: `location_id=eq.${locationId}`
          },
          () => {
            fetchStats();
          }
        )
        .subscribe();
      channels.push(userSavedChannel);

      const interactionsChannel = supabase
        .channel(`interactions_${locationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'interactions',
            filter: `location_id=eq.${locationId}`
          },
          () => {
            fetchStats();
          }
        )
        .subscribe();
      channels.push(interactionsChannel);

      // Listen for posts with ratings
      const postsChannel = supabase
        .channel(`posts_ratings_${locationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'posts',
            filter: `location_id=eq.${locationId}`
          },
          () => {
            fetchStats();
          }
        )
        .subscribe();
      channels.push(postsChannel);
    }

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [locationId, googlePlaceId]);

  return { stats, loading };
};
