import { supabase } from '@/integrations/supabase/client';

interface LazyPhotoResult {
  photos: string[];
  source: 'cache' | 'google' | 'none';
  enriched: boolean;
}

/**
 * Lazy-loads photos for a location.
 * If photos exist in DB, returns them immediately.
 * If not, fetches from Google Places API and saves to DB.
 */
export async function lazyLoadLocationPhotos(
  locationId: string,
  googlePlaceId?: string | null,
  maxPhotos = 6
): Promise<LazyPhotoResult> {
  try {
    // First check if location already has photos
    const { data: location, error: fetchError } = await supabase
      .from('locations')
      .select('photos, google_place_id, needs_enrichment')
      .eq('id', locationId)
      .single();

    if (fetchError) {
      console.error('Error fetching location:', fetchError);
      return { photos: [], source: 'none', enriched: false };
    }

    // If photos exist, return them
    if (location?.photos && Array.isArray(location.photos) && location.photos.length > 0) {
      return {
        photos: location.photos as string[],
        source: 'cache',
        enriched: false,
      };
    }

    // Use googlePlaceId from location if not provided
    const placeId = googlePlaceId || location?.google_place_id;

    // If no Google Place ID, we can't fetch photos
    if (!placeId) {
      return { photos: [], source: 'none', enriched: false };
    }

    // Fetch photos from edge function
    const { data, error } = await supabase.functions.invoke('get-place-photos', {
      body: {
        locationId,
        googlePlaceId: placeId,
        maxPhotos,
        forceRefresh: false,
      },
    });

    if (error) {
      console.error('Error fetching photos from edge function:', error);
      return { photos: [], source: 'none', enriched: false };
    }

    if (data?.photos && data.photos.length > 0) {
      // Mark location as enriched
      await supabase
        .from('locations')
        .update({ needs_enrichment: false })
        .eq('id', locationId);

      return {
        photos: data.photos,
        source: 'google',
        enriched: true,
      };
    }

    return { photos: [], source: 'none', enriched: false };
  } catch (error) {
    console.error('Lazy load photos error:', error);
    return { photos: [], source: 'none', enriched: false };
  }
}

/**
 * Gets seeding statistics for admin dashboard
 */
export async function getSeedingStats(): Promise<{
  totalLocations: number;
  systemSeeded: number;
  userCreated: number;
  needsEnrichment: number;
  enrichedLocations: number;
  cityCounts: Record<string, number>;
}> {
  try {
    // Get total locations count
    const { count: totalLocations } = await supabase
      .from('locations')
      .select('*', { count: 'exact', head: true });

    // Get system seeded count
    const { count: systemSeeded } = await supabase
      .from('locations')
      .select('*', { count: 'exact', head: true })
      .eq('is_system_seeded', true);

    // Get needs enrichment count
    const { count: needsEnrichment } = await supabase
      .from('locations')
      .select('*', { count: 'exact', head: true })
      .eq('needs_enrichment', true);

    // Get city distribution for seeded locations
    const { data: cityData } = await supabase
      .from('locations')
      .select('city')
      .eq('is_system_seeded', true)
      .not('city', 'is', null);

    const cityCounts: Record<string, number> = {};
    if (cityData) {
      for (const loc of cityData) {
        if (loc.city) {
          cityCounts[loc.city] = (cityCounts[loc.city] || 0) + 1;
        }
      }
    }

    return {
      totalLocations: totalLocations || 0,
      systemSeeded: systemSeeded || 0,
      userCreated: (totalLocations || 0) - (systemSeeded || 0),
      needsEnrichment: needsEnrichment || 0,
      enrichedLocations: (totalLocations || 0) - (needsEnrichment || 0),
      cityCounts,
    };
  } catch (error) {
    console.error('Error getting seeding stats:', error);
    return {
      totalLocations: 0,
      systemSeeded: 0,
      userCreated: 0,
      needsEnrichment: 0,
      enrichedLocations: 0,
      cityCounts: {},
    };
  }
}

interface SeedingBatchResult {
  success: boolean;
  dryRun?: boolean;
  stats?: {
    citiesProcessed: number;
    locationsFound: number;
    locationsInserted: number;
    elapsedMs: number;
  };
  batch?: {
    start: number;
    size: number;
    citiesProcessed: string[];
  };
  next?: {
    batchStart: number;
    remaining: number;
  } | null;
  completed?: boolean;
  totalCities?: number;
  error?: string;
}

/**
 * Triggers the seed-locations edge function for a batch of cities
 */
export async function runLocationSeeding(options?: {
  cities?: string[];
  batchStart?: number;
  batchSize?: number;
  dryRun?: boolean;
}): Promise<SeedingBatchResult> {
  try {
    const { data, error } = await supabase.functions.invoke('seed-locations', {
      body: options || {},
    });

    if (error) {
      console.error('Seed locations error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: data?.success || false,
      dryRun: data?.dryRun,
      stats: data?.stats,
      batch: data?.batch,
      next: data?.next,
      completed: data?.completed,
      totalCities: data?.totalCities,
      error: data?.error,
    };
  } catch (error) {
    console.error('Run seeding error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Runs seeding for all cities in batches
 */
export async function runFullSeeding(
  onProgress?: (progress: { 
    currentBatch: number; 
    totalBatches: number; 
    citiesProcessed: string[];
    locationsInserted: number;
  }) => void,
  dryRun = false
): Promise<{ success: boolean; totalInserted: number; error?: string }> {
  const batchSize = 3;
  let batchStart = 0;
  let totalInserted = 0;
  let batchNumber = 0;
  
  while (true) {
    batchNumber++;
    
    const result = await runLocationSeeding({
      batchStart,
      batchSize,
      dryRun,
    });
    
    if (!result.success) {
      return { success: false, totalInserted, error: result.error };
    }
    
    totalInserted += result.stats?.locationsInserted || 0;
    
    if (onProgress && result.batch) {
      onProgress({
        currentBatch: batchNumber,
        totalBatches: Math.ceil((result.totalCities || 36) / batchSize),
        citiesProcessed: result.batch.citiesProcessed,
        locationsInserted: totalInserted,
      });
    }
    
    if (result.completed || !result.next) {
      break;
    }
    
    batchStart = result.next.batchStart;
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return { success: true, totalInserted };
}
