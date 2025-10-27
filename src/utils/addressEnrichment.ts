import { supabase } from '@/integrations/supabase/client';

/**
 * Enriches locations with complete address data (city, street, number)
 * using reverse geocoding
 */
export const enrichLocationAddress = async (
  locationId: string,
  latitude: number,
  longitude: number
): Promise<{ city: string; address: string } | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('reverse-geocode', {
      body: { latitude, longitude }
    });

    if (error || !data) {
      console.error('Reverse geocode error:', error);
      return null;
    }

    return {
      city: data.city || 'Unknown',
      address: data.formatted_address || ''
    };
  } catch (error) {
    console.error('Error enriching address:', error);
    return null;
  }
};

/**
 * Batch update locations missing city or address data
 */
export const batchEnrichLocations = async (limit = 50): Promise<number> => {
  try {
    // Get locations missing city or address with coordinates
    const { data: locations, error } = await supabase
      .from('locations')
      .select('id, name, city, address, latitude, longitude')
      .or('city.is.null,address.is.null')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(limit);

    if (error || !locations) {
      console.error('Error fetching locations:', error);
      return 0;
    }

    let updateCount = 0;

    for (const location of locations) {
      if (!location.latitude || !location.longitude) continue;

      const enriched = await enrichLocationAddress(
        location.id,
        location.latitude,
        location.longitude
      );

      if (enriched) {
        const updates: any = {};
        
        if (!location.city && enriched.city) {
          updates.city = enriched.city;
        }
        
        if (!location.address && enriched.address) {
          updates.address = enriched.address;
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('locations')
            .update(updates)
            .eq('id', location.id);

          if (!updateError) {
            updateCount++;
            console.log(`Updated location ${location.name}:`, updates);
          }
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return updateCount;
  } catch (error) {
    console.error('Error in batch enrichment:', error);
    return 0;
  }
};
