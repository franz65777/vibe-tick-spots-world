import { supabase } from '@/integrations/supabase/client';
import { normalizeCity, extractCityFromAddress, extractCityFromName } from '@/utils/cityNormalization';

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

          let cityValue = loc.city && loc.city.trim() !== '' ? normalizeCity(loc.city) : null;

          if (!cityValue || cityValue === 'Unknown') {
            const extractedFromAddress = extractCityFromAddress(loc.address);
            if (extractedFromAddress && extractedFromAddress !== 'Unknown') {
              cityValue = extractedFromAddress;
            }
          }

          if (!cityValue || cityValue === 'Unknown') {
            const extractedFromName = extractCityFromName(loc.name);
            if (extractedFromName && extractedFromName !== 'Unknown') {
              cityValue = extractedFromName;
            }
          }

          const hasMissingCity = !cityValue || cityValue === 'Unknown';

          locations.push({
            id: placeId,
            name: loc.name || 'Unknown Location',
            category: loc.category || 'place',
            city: cityValue || 'Unknown City',
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

          if (hasMissingCity && loc.latitude && loc.longitude) {
            this.enrichLocationData({
              id: loc.id,
              google_place_id: loc.google_place_id,
              latitude: loc.latitude,
              longitude: loc.longitude,
              city: cityValue
            } as UnifiedLocation).then(async (enriched) => {
              if (enriched && enriched.city && enriched.city !== 'Unknown City') {
                await supabase
                  .from('locations')
                  .update({ city: enriched.city })
                  .eq('id', loc.id);
              }
            }).catch(err => console.error('Error enriching location:', err));
          }
        }
      }

      if (savedPlacesResult.data) {
        for (const place of savedPlacesResult.data) {
          const placeId = place.place_id;
          if (seenPlaceIds.has(placeId)) continue;
          seenPlaceIds.add(placeId);

          const coords = place.coordinates as any;
          let cityValue = place.city && place.city.trim() !== '' ? normalizeCity(place.city) : null;

          if (!cityValue || cityValue === 'Unknown') {
            const extractedFromAddress = extractCityFromAddress(place.address);
            if (extractedFromAddress && extractedFromAddress !== 'Unknown') {
              cityValue = extractedFromAddress;
            }
          }

          if (!cityValue || cityValue === 'Unknown') {
            const extractedFromName = extractCityFromName(place.place_name);
            if (extractedFromName && extractedFromName !== 'Unknown') {
              cityValue = extractedFromName;
            }
          }

          const hasMissingCity = !cityValue || cityValue === 'Unknown';

          locations.push({
            id: placeId,
            name: place.place_name || 'Unknown Location',
            category: place.place_category || 'place',
            city: cityValue || 'Unknown City',
            address: place.address,
            google_place_id: placeId,
            latitude: coords?.lat,
            longitude: coords?.lng,
            coordinates: coords,
            savedAt: place.created_at,
            source: 'saved_places'
          });

          if (hasMissingCity && coords?.lat && coords?.lng) {
            this.enrichLocationData({
              id: placeId,
              google_place_id: placeId,
              latitude: coords.lat,
              longitude: coords.lng,
              city: cityValue
            } as UnifiedLocation).then(async (enriched) => {
              if (enriched && enriched.city && enriched.city !== 'Unknown City') {
                await supabase
                  .from('saved_places')
                  .update({ city: enriched.city })
                  .eq('place_id', placeId)
                  .eq('user_id', userId);
              }
            }).catch(err => console.error('Error enriching saved place:', err));
          }
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
