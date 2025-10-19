import { supabase } from '@/integrations/supabase/client';
import { normalizeCity } from '@/utils/cityNormalization';

interface GooglePlaceDetails {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  geometry?: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
  types?: string[];
  rating?: number;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export class EnhancedLocationSaveService {
  static async saveLocationWithCompleteData(
    userId: string,
    placeDetails: GooglePlaceDetails,
    category?: string
  ): Promise<{ success: boolean; locationId?: string; error?: string }> {
    try {
      let enrichedData: {
        name: string;
        address: string;
        city: string;
        latitude: number;
        longitude: number;
        google_place_id: string;
        category: string;
      };

      const lat = placeDetails.geometry?.location?.lat();
      const lng = placeDetails.geometry?.location?.lng();

      if (!lat || !lng) {
        return { success: false, error: 'Invalid coordinates' };
      }

      const address = placeDetails.formatted_address || placeDetails.vicinity || '';
      let city = this.extractCityFromAddressComponents(placeDetails.address_components);

      if (!city || city === 'Unknown') {
        const reverseGeoResult = await this.reverseGeocode(lat, lng);
        if (reverseGeoResult) {
          city = reverseGeoResult.city || city;
        }
      }

      enrichedData = {
        name: placeDetails.name,
        address,
        city: normalizeCity(city) || 'Unknown City',
        latitude: lat,
        longitude: lng,
        google_place_id: placeDetails.place_id,
        category: category || this.determineCategoryFromTypes(placeDetails.types) || 'place'
      };

      const { data: existingLocation } = await supabase
        .from('locations')
        .select('id')
        .eq('google_place_id', enrichedData.google_place_id)
        .maybeSingle();

      let locationId: string;

      if (existingLocation) {
        locationId = existingLocation.id;

        await supabase
          .from('locations')
          .update({
            address: enrichedData.address,
            city: enrichedData.city,
            latitude: enrichedData.latitude,
            longitude: enrichedData.longitude
          })
          .eq('id', locationId);
      } else {
        const { data: newLocation, error: insertError } = await supabase
          .from('locations')
          .insert({
            ...enrichedData,
            created_by: userId
          })
          .select('id')
          .single();

        if (insertError || !newLocation) {
          return { success: false, error: 'Failed to create location' };
        }

        locationId = newLocation.id;
      }

      const { data: existingSave } = await supabase
        .from('user_saved_locations')
        .select('id')
        .eq('user_id', userId)
        .eq('location_id', locationId)
        .maybeSingle();

      if (!existingSave) {
        await supabase
          .from('user_saved_locations')
          .insert({
            user_id: userId,
            location_id: locationId
          });
      }

      const { data: existingSavedPlace } = await supabase
        .from('saved_places')
        .select('id')
        .eq('user_id', userId)
        .eq('place_id', enrichedData.google_place_id)
        .maybeSingle();

      if (!existingSavedPlace) {
        await supabase
          .from('saved_places')
          .insert({
            user_id: userId,
            place_id: enrichedData.google_place_id,
            place_name: enrichedData.name,
            place_category: enrichedData.category,
            coordinates: { lat: enrichedData.latitude, lng: enrichedData.longitude },
            city: enrichedData.city,
            address: enrichedData.address
          });
      }

      return { success: true, locationId };
    } catch (error) {
      console.error('Error saving location with complete data:', error);
      return { success: false, error: 'Failed to save location' };
    }
  }

  private static extractCityFromAddressComponents(
    components?: Array<{ long_name: string; types: string[] }>
  ): string {
    if (!components) return '';

    const cityComponent = components.find(
      comp =>
        comp.types.includes('locality') ||
        comp.types.includes('postal_town') ||
        comp.types.includes('administrative_area_level_2')
    );

    return cityComponent?.long_name || '';
  }

  private static determineCategoryFromTypes(types?: string[]): string {
    if (!types || types.length === 0) return 'place';

    const categoryMap: Record<string, string> = {
      restaurant: 'restaurant',
      cafe: 'cafe',
      bar: 'bar',
      night_club: 'nightlife',
      museum: 'museum',
      park: 'park',
      shopping_mall: 'shopping',
      store: 'shopping',
      gym: 'fitness',
      spa: 'wellness',
      hotel: 'hotel',
      lodging: 'hotel',
      tourist_attraction: 'attraction'
    };

    for (const type of types) {
      if (categoryMap[type]) {
        return categoryMap[type];
      }
    }

    return 'place';
  }

  private static async reverseGeocode(lat: number, lng: number): Promise<{ city: string } | null> {
    try {
      const { data, error } = await supabase.functions.invoke('reverse-geocode', {
        body: { latitude: lat, longitude: lng }
      });

      if (error || !data) return null;

      return { city: data.city || '' };
    } catch (error) {
      console.error('Reverse geocode error:', error);
      return null;
    }
  }

  static async batchUpdateMissingCityNames(): Promise<number> {
    try {
      const { data: locationsWithoutCity } = await supabase
        .from('locations')
        .select('id, latitude, longitude')
        .or('city.is.null,city.eq.Unknown,city.eq.Unknown City')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(50);

      if (!locationsWithoutCity || locationsWithoutCity.length === 0) {
        return 0;
      }

      let updated = 0;
      for (const location of locationsWithoutCity) {
        const geoResult = await this.reverseGeocode(location.latitude, location.longitude);
        if (geoResult?.city) {
          await supabase
            .from('locations')
            .update({ city: normalizeCity(geoResult.city) })
            .eq('id', location.id);
          updated++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return updated;
    } catch (error) {
      console.error('Error batch updating city names:', error);
      return 0;
    }
  }
}
