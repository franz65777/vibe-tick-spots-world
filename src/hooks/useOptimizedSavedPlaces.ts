import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeCity } from '@/utils/cityNormalization';

interface SavedPlace {
  id: string;
  name: string;
  category: string;
  city: string;
  coordinates: { lat: number; lng: number };
  savedAt: string;
  postsCount?: number;
  google_place_id?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

interface SavedPlacesData {
  [city: string]: SavedPlace[];
}

export const useOptimizedSavedPlaces = () => {
  const { user } = useAuth();

  const { data: savedPlaces = {}, isLoading } = useQuery({
    queryKey: ['savedPlaces', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};

      // 1) Fetch saved_places and user_saved_locations in parallel
      const [savedPlacesRes, userSavedLocationsRes] = await Promise.all([
        supabase.from('saved_places').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('user_saved_locations').select(`
          id,
          created_at,
          locations (
            id,
            name,
            category,
            city,
            latitude,
            longitude,
            google_place_id,
            address
          )
        `).eq('user_id', user.id).order('created_at', { ascending: false })
      ]);

      const savedPlacesData = savedPlacesRes.data || [];
      const userSavedLocations = (userSavedLocationsRes.data || []) as any[];

      console.log('Saved places loaded:', savedPlacesData.length, 'saved_places,', userSavedLocations.length, 'user_saved_locations');

      // 2) Group by city with enhanced deduplication
      const groupedByCity: SavedPlacesData = {};
      const seenPlaceIds = new Set<string>();
      const seenGooglePlaceIds = new Set<string>();
      const seenLocationIds = new Set<string>();

      // Add saved_places data
      savedPlacesData.forEach((place: any) => {
        if (!place.place_name) return;

        const city = normalizeCity(place.city);
        const coords = place.coordinates as any;
        const placeId = place.place_id;

        // Skip if we've seen this place_id, google_place_id, or internal location_id
        if (seenPlaceIds.has(placeId)) return;
        seenPlaceIds.add(placeId);
        // Also track as potential google_place_id
        seenGooglePlaceIds.add(placeId);

        if (!groupedByCity[city]) groupedByCity[city] = [];

        groupedByCity[city].push({
          id: placeId,
          name: place.place_name,
          category: place.place_category || 'place',
          city,
          coordinates: coords || { lat: 0, lng: 0 },
          savedAt: place.created_at || new Date().toISOString(),
          google_place_id: placeId,
          latitude: coords?.lat,
          longitude: coords?.lng
        });
      });

      // Add user_saved_locations data
      userSavedLocations.forEach((item: any) => {
        const location = item.locations;
        if (!location || !location.name) return;

        const city = normalizeCity(location.city);
        const placeId = location.google_place_id || location.id;

        // Enhanced deduplication - check google_place_id and internal id separately
        if (location.google_place_id) {
          if (seenGooglePlaceIds.has(location.google_place_id)) return;
          seenGooglePlaceIds.add(location.google_place_id);
        }
        if (seenLocationIds.has(location.id)) return;
        seenLocationIds.add(location.id);
        
        if (seenPlaceIds.has(placeId)) return;
        seenPlaceIds.add(placeId);

        if (!groupedByCity[city]) groupedByCity[city] = [];

        groupedByCity[city].push({
          id: placeId,
          name: location.name,
          category: location.category || 'place',
          city,
          coordinates: { lat: location.latitude || 0, lng: location.longitude || 0 },
          savedAt: item.created_at || new Date().toISOString(),
          google_place_id: location.google_place_id,
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || undefined
        });
      });

      console.log('Grouped into', Object.keys(groupedByCity).length, 'cities');
      return groupedByCity;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
  });

  const getStats = () => {
    const cities = Object.keys(savedPlaces).length;
    const places = Object.values(savedPlaces).reduce((total, cityPlaces) => total + cityPlaces.length, 0);
    return { cities, places };
  };

  return {
    savedPlaces,
    loading: isLoading,
    getStats,
  };
};
