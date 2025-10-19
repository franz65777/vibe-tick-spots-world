import { supabase } from '@/integrations/supabase/client';
import { normalizeCity } from '@/utils/cityNormalization';

export interface UnifiedLocation {
  id: string;
  name: string;
  category: string;
  city: string;
  address?: string;
  google_place_id?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: {
    lat?: number;
    lng?: number;
  };
  savedAt: string;
  source: 'locations' | 'saved_places';
  rating?: number;
  savedCount?: number;
  postsCount?: number;
}

const locationCache = new Map<string, { data: UnifiedLocation[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000;

export class UnifiedLocationService {
  static async getUserSavedLocations(userId: string, forceRefresh = false): Promise<UnifiedLocation[]> {
    const cacheKey = `user_locations_${userId}`;

    if (!forceRefresh) {
      const cached = locationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }

    try {
      const [locationsResult, savedPlacesResult] = await Promise.all([
        supabase
          .from('user_saved_locations')
          .select(`
            location_id,
            created_at,
            locations!inner (
              id,
              name,
              category,
              city,
              address,
              google_place_id,
              latitude,
              longitude
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),

        supabase
          .from('saved_places')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ]);

      const locations: UnifiedLocation[] = [];
      const seenPlaceIds = new Set<string>();

      if (locationsResult.data) {
        for (const item of locationsResult.data) {
          const loc = (item as any).locations;
          if (!loc) continue;

          const placeId = loc.google_place_id || loc.id;
          if (seenPlaceIds.has(placeId)) continue;
          seenPlaceIds.add(placeId);

          locations.push({
            id: placeId,
            name: loc.name || 'Unknown Location',
            category: loc.category || 'place',
            city: normalizeCity(loc.city) || 'Unknown City',
            address: loc.address,
            google_place_id: loc.google_place_id,
            latitude: loc.latitude,
            longitude: loc.longitude,
            coordinates: {
              lat: loc.latitude,
              lng: loc.longitude
            },
            savedAt: item.created_at,
            source: 'locations'
          });
        }
      }

      if (savedPlacesResult.data) {
        for (const place of savedPlacesResult.data) {
          const placeId = place.place_id;
          if (seenPlaceIds.has(placeId)) continue;
          seenPlaceIds.add(placeId);

          const coords = place.coordinates as any;
          locations.push({
            id: placeId,
            name: place.place_name || 'Unknown Location',
            category: place.place_category || 'place',
            city: normalizeCity(place.city) || 'Unknown City',
            address: place.address,
            google_place_id: placeId,
            latitude: coords?.lat,
            longitude: coords?.lng,
            coordinates: coords,
            savedAt: place.created_at,
            source: 'saved_places'
          });
        }
      }

      locationCache.set(cacheKey, { data: locations, timestamp: Date.now() });
      return locations;
    } catch (error) {
      console.error('Error fetching unified locations:', error);
      return [];
    }
  }

  static async enrichLocationData(location: Partial<UnifiedLocation>): Promise<UnifiedLocation | null> {
    try {
      if (!location.google_place_id && !location.id) {
        return null;
      }

      const placeId = location.google_place_id || location.id!;

      if (!location.address || !location.city) {
        const { data, error } = await supabase.functions.invoke('reverse-geocode', {
          body: {
            latitude: location.latitude || location.coordinates?.lat,
            longitude: location.longitude || location.coordinates?.lng
          }
        });

        if (!error && data) {
          return {
            ...location,
            address: location.address || data.formatted_address,
            city: normalizeCity(data.city) || location.city || 'Unknown City',
            coordinates: {
              lat: location.latitude || location.coordinates?.lat,
              lng: location.longitude || location.coordinates?.lng
            }
          } as UnifiedLocation;
        }
      }

      return location as UnifiedLocation;
    } catch (error) {
      console.error('Error enriching location data:', error);
      return location as UnifiedLocation;
    }
  }

  static clearCache(userId?: string) {
    if (userId) {
      locationCache.delete(`user_locations_${userId}`);
    } else {
      locationCache.clear();
    }
  }

  static async groupByCity(locations: UnifiedLocation[]): Promise<Record<string, UnifiedLocation[]>> {
    const grouped: Record<string, UnifiedLocation[]> = {};

    for (const location of locations) {
      const city = location.city || 'Unknown City';
      if (!grouped[city]) {
        grouped[city] = [];
      }
      grouped[city].push(location);
    }

    return grouped;
  }

  static async updateLocationInCache(userId: string, locationId: string, updates: Partial<UnifiedLocation>) {
    const cacheKey = `user_locations_${userId}`;
    const cached = locationCache.get(cacheKey);

    if (cached) {
      const updatedData = cached.data.map(loc =>
        loc.id === locationId ? { ...loc, ...updates } : loc
      );
      locationCache.set(cacheKey, { data: updatedData, timestamp: Date.now() });
    }
  }
}
