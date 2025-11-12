import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MapFilter } from '@/contexts/MapFilterContext';

interface MapLocation {
  id: string;
  name: string;
  category: string;
  address?: string;
  city?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  isFollowing?: boolean;
  isNew?: boolean;
  isSaved?: boolean;
  isRecommended?: boolean;
  recommendationScore?: number;
  user_id: string;
  created_at: string;
  sharedByUser?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface UseMapLocationsProps {
  mapFilter: MapFilter;
  selectedCategories: string[];
  currentCity: string;
  selectedFollowedUserIds?: string[];
}

export const useMapLocations = ({ mapFilter, selectedCategories, currentCity, selectedFollowedUserIds = [] }: UseMapLocationsProps) => {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLocations([]);
      return;
    }
    
    fetchLocations();
    
    // Set up realtime subscription for map updates
    const channel = supabase
      .channel('map-locations-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_places' }, () => {
        console.log('🔄 Saved places changed, refreshing map...');
        fetchLocations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_saved_locations' }, () => {
        console.log('🔄 User saved locations changed, refreshing map...');
        fetchLocations();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [mapFilter, selectedCategories.join(','), currentCity, user?.id, selectedFollowedUserIds.join(',')]);

  const fetchLocations = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      console.log(`🗺️ Fetching ${mapFilter} locations for categories:`, selectedCategories);

      let query = supabase.from('locations').select(`
        id,
        name,
        category,
        address,
        city,
        latitude,
        longitude,
        created_by,
        created_at,
        user_saved_locations!left(id)
      `);

      // Apply category filters if any selected
      if (selectedCategories.length > 0) {
        query = query.in('category', selectedCategories);
      }

      // Apply city filter if available
      if (currentCity && currentCity !== 'Unknown City') {
        query = query.or(`city.ilike.%${currentCity}%,address.ilike.%${currentCity}%`);
      }

      let finalLocations: MapLocation[] = [];

      switch (mapFilter) {
        case 'shared': {
          // Fetch current user's followers and close friends
          const { data: followData } = await supabase
            .from('follows')
            .select('follower_id')
            .eq('following_id', user.id);
          
          const { data: closeFriendData } = await supabase
            .from('close_friends')
            .select('friend_id')
            .eq('user_id', user.id);

          const followerIds = followData?.map(f => f.follower_id) || [];
          const closeFriendIds = closeFriendData?.map(cf => cf.friend_id) || [];

          // Fetch ALL location shares
          const { data: allShares, error: sharedError } = await supabase
            .from('user_location_shares')
            .select(`
              id,
              location_id,
              location_name,
              location_address,
              latitude,
              longitude,
              share_type,
              created_at,
              user_id,
              shared_with_user_ids
            `)
            .order('created_at', { ascending: false })
            .limit(200);

          if (sharedError) {
            console.error('Error fetching shared locations:', sharedError);
          }

          // Filter shares based on visibility rules
          const visibleShares = (allShares || []).filter(share => {
            // Can't see own shares
            if (share.user_id === user.id) return false;
            
            // Check visibility based on share_type
            if (share.share_type === 'all_followers') {
              return followerIds.includes(share.user_id);
            } else if (share.share_type === 'close_friends') {
              return closeFriendIds.includes(share.user_id);
            } else if (share.share_type === 'specific_users') {
              return share.shared_with_user_ids?.includes(user.id);
            }
            return false;
          });

          // Fetch profiles for all visible shares
          const userIds = [...new Set(visibleShares.map(s => s.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', userIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

          finalLocations = visibleShares.map(share => ({
            id: share.location_id || share.id,
            name: share.location_name,
            category: 'restaurant', // Default category for shared locations
            address: share.location_address,
            city: '',
            coordinates: {
              lat: Number(share.latitude) || 0,
              lng: Number(share.longitude) || 0
            },
            user_id: share.user_id,
            created_at: share.created_at,
            isFollowing: true,
            sharedByUser: profileMap.get(share.user_id) || undefined
          })).filter(loc => {
            // Apply category filter if any
            if (selectedCategories.length > 0 && !selectedCategories.includes(loc.category)) return false;
            return true;
          });
          break;
        }

        case 'following': {
          // Fetch locations saved by people the user follows from both internal locations and Google saved places
          const [locRes, placesRes] = await Promise.all([
            supabase.rpc('get_following_saved_locations'),
            supabase.rpc('get_following_saved_places', { limit_count: 200 })
          ]);

          if (locRes.error) {
            console.error('Error fetching following internal locations:', locRes.error);
          }
          if (placesRes.error) {
            console.error('Error fetching following saved places:', placesRes.error);
          }

          const fromLocations: MapLocation[] = (locRes.data as any[] | null)?.map((row: any) => ({
            id: row.id,
            name: row.name,
            category: row.category,
            address: row.address,
            city: row.city,
            coordinates: {
              lat: Number(row.latitude) || 0,
              lng: Number(row.longitude) || 0,
            },
            isFollowing: true,
            user_id: row.created_by,
            created_at: row.created_at,
          })) ?? [];

          const fromSavedPlaces: MapLocation[] = (placesRes.data as any[] | null)?.map((row: any) => {
            const coords = (row.coordinates as any) || {};
            return {
              id: row.place_id,
              name: row.place_name,
              category: row.place_category || 'Unknown',
              address: undefined,
              city: row.city || undefined,
              coordinates: {
                lat: Number(coords.lat) || 0,
                lng: Number(coords.lng) || 0,
              },
              isFollowing: true,
              user_id: row.user_id,
              created_at: row.created_at,
            } as MapLocation;
          }) ?? [];

          // Merge and apply filters
          const merged = [...fromLocations, ...fromSavedPlaces].filter((loc) => {
            // Apply category filter
            if (selectedCategories.length > 0 && !selectedCategories.includes(loc.category)) return false;
            
            // Apply specific user filter if provided
            if (selectedFollowedUserIds.length > 0 && !selectedFollowedUserIds.includes(loc.user_id)) return false;
            
            return true;
          });

          finalLocations = merged;
          break;
        }

        case 'recommended': {
          // Get recommended locations using the recommendation service
          const { getRecommendedLocations } = await import('@/services/recommendationService');
          const recommendations = await getRecommendedLocations(
            user.id,
            currentCity && currentCity !== 'Unknown City' ? currentCity : undefined,
            100,
            selectedCategories.length === 1 ? selectedCategories[0] : null
          );

          finalLocations = recommendations.map(rec => ({
            id: rec.id,
            name: rec.name,
            category: rec.category,
            address: rec.address,
            city: rec.city,
            coordinates: {
              lat: Number(rec.latitude) || 0,
              lng: Number(rec.longitude) || 0
            },
            isRecommended: true,
            recommendationScore: rec.score * 10, // Convert 0-1 score to 1-10
            user_id: user.id,
            created_at: new Date().toISOString()
          }));
          break;
        }

        case 'popular': {
          // Get popular locations based on likes and saves
          const { data: popularData } = await query
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .order('created_at', { ascending: false })
            .limit(50);

          if (popularData) {
            finalLocations = popularData.map(location => ({
              id: location.id,
              name: location.name,
              category: location.category,
              address: location.address,
              city: location.city,
              coordinates: {
                lat: Number(location.latitude) || 0,
                lng: Number(location.longitude) || 0
              },
              user_id: location.created_by,
              created_at: location.created_at,
              isSaved: location.user_saved_locations && location.user_saved_locations.length > 0
            }));
          }
          break;
        }

        case 'saved': {
          // Get user's saved locations from user_saved_locations
          const { data: savedData } = await supabase
            .from('user_saved_locations')
            .select(`
              location_id,
              created_at,
              locations!inner(
                id,
                name,
                category,
                address,
                city,
                latitude,
                longitude,
                created_by,
                google_place_id
              )
            `)
            .eq('user_id', user.id);

          // Get user's saved places from saved_places (Google Places)
          const { data: savedPlaces } = await supabase
            .from('saved_places')
            .select('place_id, place_name, place_category, city, coordinates, created_at')
            .eq('user_id', user.id);

          // Combine both sources
          const locationMap = new Map<string, MapLocation>();

          // Add locations from user_saved_locations
          if (savedData) {
            savedData
              .filter(item => item.locations)
              .forEach(item => {
                const key = item.locations.google_place_id || item.locations.id;
                if (!locationMap.has(key)) {
                  locationMap.set(key, {
                    id: item.locations.id,
                    name: item.locations.name,
                    category: item.locations.category,
                    address: item.locations.address,
                    city: item.locations.city,
                    coordinates: {
                      lat: Number(item.locations.latitude) || 0,
                      lng: Number(item.locations.longitude) || 0
                    },
                    isSaved: true,
                    user_id: item.locations.created_by,
                    created_at: item.created_at
                  });
                }
              });
          }

          // Add places from saved_places
          if (savedPlaces) {
            savedPlaces.forEach(sp => {
              const coords = (sp.coordinates as any) || {};
              const key = sp.place_id;
              if (!locationMap.has(key)) {
                // Create a pseudo location for Google Place
                locationMap.set(key, {
                  id: sp.place_id,
                  name: sp.place_name,
                  category: sp.place_category || 'Unknown',
                  address: '',
                  city: sp.city || 'Unknown',
                  coordinates: {
                    lat: Number(coords.lat) || 0,
                    lng: Number(coords.lng) || 0
                  },
                  isSaved: true,
                  user_id: user.id,
                  created_at: sp.created_at
                });
              }
            });
          }

          finalLocations = Array.from(locationMap.values())
            .filter(location => {
              // Apply category filter
              if (selectedCategories.length > 0 && !selectedCategories.includes(location.category)) {
                return false;
              }
              return true;
            });
          break;
        }
      }

      // Deduplicate by location id
      const byId = new Map<string, MapLocation>();
      for (const loc of finalLocations) {
        if (loc?.id) byId.set(loc.id, loc);
      }
      finalLocations = Array.from(byId.values());

      // Filter out locations with invalid coordinates
      finalLocations = finalLocations.filter((location) => {
        const { lat, lng } = location.coordinates || { lat: 0, lng: 0 };
        return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
      });

      // If following filter, indicate presence
      if (mapFilter === 'following') {
        console.log('✅ Following locations after filter:', finalLocations.length);
      }

      console.log(`✅ Found ${finalLocations.length} ${mapFilter} locations (after dedupe)`);
      setLocations(finalLocations);

    } catch (err: any) {
      console.error('❌ Error fetching map locations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    locations,
    loading,
    error,
    refetch: fetchLocations
  };
};