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
  user_id: string;
  created_at: string;
}

interface UseMapLocationsProps {
  mapFilter: MapFilter;
  selectedCategories: string[];
  currentCity: string;
}

export const useMapLocations = ({ mapFilter, selectedCategories, currentCity }: UseMapLocationsProps) => {
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
  }, [mapFilter, selectedCategories.join(','), currentCity, user?.id]);

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
        case 'following': {
          // Use secure function to get locations saved by people the user follows
          const { data: followingLocations, error: followingError } = await supabase
            .rpc('get_following_saved_locations');

          if (followingError) {
            console.error('Error fetching following locations:', followingError);
            finalLocations = [];
          } else if (followingLocations) {
            finalLocations = followingLocations
              .map(location => ({
                id: location.id,
                name: location.name,
                category: location.category,
                address: location.address,
                city: location.city,
                coordinates: {
                  lat: Number(location.latitude) || 0,
                  lng: Number(location.longitude) || 0
                },
                isFollowing: true,
                user_id: location.created_by,
                created_at: location.created_at
              }));
          }
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
          // Get user's saved locations
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
                created_by
              )
            `)
            .eq('user_id', user.id);

          if (savedData) {
            finalLocations = savedData
              .filter(item => item.locations)
              .map(item => ({
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
              }))
              .filter(location => {
                // Apply category filter
                if (selectedCategories.length > 0 && !selectedCategories.includes(location.category)) {
                  return false;
                }
                return true;
              });
          }
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