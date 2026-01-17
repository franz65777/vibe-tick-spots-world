import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google API costs per 1000 requests (as of 2024)
const COSTS = {
  PLACE_DETAILS: 0.017, // $17 per 1000 = $0.017 each
  PLACE_PHOTOS: 0.007,  // $7 per 1000 = $0.007 each
  FIND_PLACE: 0.017,    // $17 per 1000 = $0.017 each
};

const MONTHLY_FREE_CREDIT = 200; // $200 free credit
const MAX_BATCH_SIZE = 3; // Limit batch size to prevent memory issues with more photos

interface EnrichmentResult {
  locationId: string;
  locationName: string;
  success: boolean;
  photosAdded: number;
  hasHours: boolean;
  googlePlaceId?: string;
  deleted?: boolean;
  error?: string;
  costs: {
    placeDetails: number;
    placePhotos: number;
    findPlace: number;
    total: number;
  };
}

interface BatchResult {
  processed: number;
  successful: number;
  failed: number;
  deleted: number;
  results: EnrichmentResult[];
  totalCost: number;
  monthlySpend: number;
  remainingBudget: number;
  hasMore: boolean;
  nextOffset: number;
}

// Validate if a Google Place ID is real
function isValidGooglePlaceId(placeId: string | null | undefined): boolean {
  if (!placeId || typeof placeId !== 'string') return false;
  return placeId.startsWith('ChIJ');
}

// Process a single photo - fetch and upload without keeping in memory
async function processPhoto(
  photoRef: string,
  locationId: string,
  photoIndex: number,
  googleApiKey: string,
  supabase: any
): Promise<string | null> {
  const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${photoRef}&key=${googleApiKey}`;
  
  try {
    const photoResponse = await fetch(photoUrl);
    
    if (!photoResponse.ok) {
      return null;
    }
    
    // Read as ArrayBuffer directly, smaller size
    const photoBuffer = await photoResponse.arrayBuffer();
    const photoBytes = new Uint8Array(photoBuffer);
    
    const fileName = `${locationId}/photo-${photoIndex}.jpg`;
    
    const { error: uploadError } = await supabase.storage
      .from('location-photos')
      .upload(fileName, photoBytes, {
        contentType: 'image/jpeg',
        upsert: true
      });
    
    if (uploadError) {
      console.error(`Upload error for photo ${photoIndex}:`, uploadError.message);
      return null;
    }
    
    const { data: urlData } = supabase.storage
      .from('location-photos')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error(`Photo ${photoIndex} processing error:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    let { 
      batchSize = 5, 
      offset = 0, 
      enrichPhotos = true, 
      enrichHours = true,
      maxPhotosPerLocation = 2, // Reduced default
      // IMPORTANT: Finding/creating Google Place IDs can be costly and can loop forever when Google returns no match.
      // Keep it opt-in from the dashboard.
      resolvePlaceIds = false,
      dryRun = false 
    } = requestBody;

    // Enforce limits to prevent memory issues
    batchSize = Math.min(batchSize, MAX_BATCH_SIZE);
    maxPhotosPerLocation = Math.min(maxPhotosPerLocation, 6);

    console.log(`Starting batch: offset=${offset}, batchSize=${batchSize}, maxPhotos=${maxPhotosPerLocation}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current month's spending
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: spendData } = await supabase
      .rpc('get_google_api_monthly_spend', { target_month: currentMonth });
    
    const monthlySpend = spendData?.[0]?.total_cost || 0;
    let remainingBudget = MONTHLY_FREE_CREDIT - monthlySpend;

    console.log(`Monthly spend: $${monthlySpend.toFixed(2)}, Remaining: $${remainingBudget.toFixed(2)}`);

    if (remainingBudget <= 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Monthly budget exhausted',
          monthlySpend,
          remainingBudget: 0
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch locations with valid place IDs first
    // IMPORTANT: do NOT use offset-based pagination here.
    // As we enrich locations, the filtered result set shrinks, which makes `range(offset, ...)`
    // skip remaining rows and can prematurely end the enrichment loop.
    // We always take the first N remaining locations each call.
    const { data: locationsWithPlaceId, error: fetchError } = await supabase
      .from('locations')
      .select('id, name, google_place_id, latitude, longitude, photos, opening_hours_data')
      .or('photos.is.null,opening_hours_data.is.null')
      .not('google_place_id', 'is', null)
      .like('google_place_id', 'ChIJ%')
      .range(0, batchSize - 1);

    if (fetchError) {
      throw new Error(`Failed to fetch locations: ${fetchError.message}`);
    }

    let locations = locationsWithPlaceId || [];

    // If no locations with valid place IDs, optionally try to resolve place IDs (expensive)
    if (locations.length === 0) {
      if (!resolvePlaceIds) {
        return new Response(
          JSON.stringify({
            processed: 0,
            successful: 0,
            failed: 0,
            results: [],
            totalCost: 0,
            monthlySpend,
            remainingBudget,
            hasMore: false,
            nextOffset: 0,
            message: 'Nessuna location con Google Place ID valido da arricchire. Attiva "Trova Google ID" per provare a risolverli (costo extra).'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch locations without valid Google Place ID
      const { data: noPlaceIdLocations, error: fetchError2 } = await supabase
        .from('locations')
        .select('id, name, google_place_id, latitude, longitude, photos, opening_hours_data')
        .or('photos.is.null,opening_hours_data.is.null')
        .or('google_place_id.is.null,google_place_id.not.like.ChIJ%')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .range(0, batchSize - 1);

      if (fetchError2) {
        throw new Error(`Failed to fetch locations: ${fetchError2.message}`);
      }

      locations = noPlaceIdLocations || [];

      if (locations.length === 0) {
        return new Response(
          JSON.stringify({
            processed: 0,
            successful: 0,
            failed: 0,
            deleted: 0,
            results: [],
            totalCost: 0,
            monthlySpend,
            remainingBudget,
            hasMore: false,
            nextOffset: 0,
            message: 'All locations are enriched!'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Processing ${locations.length} locations`);

    const results: EnrichmentResult[] = [];
    let totalBatchCost = 0;

    for (const location of locations) {
      if (remainingBudget - totalBatchCost < COSTS.PLACE_DETAILS) {
        console.log('Budget limit reached');
        break;
      }

      const result: EnrichmentResult = {
        locationId: location.id,
        locationName: location.name,
        success: false,
        photosAdded: 0,
        hasHours: false,
        costs: {
          placeDetails: 0,
          placePhotos: 0,
          findPlace: 0,
          total: 0,
        }
      };

      try {
        let googlePlaceId = location.google_place_id;

        // Step 1: Find Google Place ID if needed (OPTIONAL, can be expensive)
        if (
          resolvePlaceIds &&
          !isValidGooglePlaceId(googlePlaceId) &&
          location.latitude &&
          location.longitude
        ) {
          console.log(`Finding place ID for: ${location.name}`);

          if (!dryRun) {
            const input = encodeURIComponent(location.name);
            const locationBias = `point:${location.latitude},${location.longitude}`;
            const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${input}&inputtype=textquery&locationbias=${locationBias}&fields=place_id&key=${googleApiKey}`;

            const findResponse = await fetch(findUrl);
            const findData = await findResponse.json();

            result.costs.findPlace = COSTS.FIND_PLACE;

            if (findData.status === 'OK' && findData.candidates?.[0]?.place_id) {
              googlePlaceId = findData.candidates[0].place_id;
              result.googlePlaceId = googlePlaceId;

              await supabase
                .from('locations')
                .update({ google_place_id: googlePlaceId })
                .eq('id', location.id);

              console.log(`Found place ID: ${googlePlaceId}`);
            } else {
              // CRITICAL: Location not found on Google - DELETE it from the database
              // This prevents wasting money on repeated find_place calls and removes orphan locations
              console.log(`Place not found for ${location.name}, DELETING location`);
              
              const { error: deleteError } = await supabase
                .from('locations')
                .delete()
                .eq('id', location.id);
              
              if (deleteError) {
                console.error(`Failed to delete location ${location.id}:`, deleteError.message);
                result.error = `Google FindPlace: ${findData.status || 'NO_RESULT'} - eliminazione fallita: ${deleteError.message}`;
              } else {
                result.deleted = true;
                result.error = `Eliminata: non trovata su Google`;
              }
            }
          } else {
            result.costs.findPlace = COSTS.FIND_PLACE;
          }
        } else {
          result.googlePlaceId = googlePlaceId;
        }

        // Step 2: Get place details
        if (googlePlaceId && isValidGooglePlaceId(googlePlaceId)) {
          const needsPhotos = enrichPhotos && (!location.photos || (Array.isArray(location.photos) && location.photos.length === 0));
          const needsHours = enrichHours && !location.opening_hours_data;
          
          if (needsPhotos || needsHours) {
            const fields = [];
            if (needsPhotos) fields.push('photos');
            if (needsHours) fields.push('opening_hours');
            
            console.log(`Fetching ${fields.join(', ')} for ${location.name}`);
            
            if (!dryRun) {
              const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=${fields.join(',')}&key=${googleApiKey}`;
              const detailsResponse = await fetch(detailsUrl);
              const detailsData = await detailsResponse.json();
              
              result.costs.placeDetails = COSTS.PLACE_DETAILS;
              
              if (detailsData.status === 'OK') {
                const updateData: Record<string, any> = {};
                
                // Process photos one at a time
                if (needsPhotos && detailsData.result?.photos) {
                  const photoRefs = detailsData.result.photos
                    .slice(0, maxPhotosPerLocation)
                    .map((p: any) => p.photo_reference);
                  
                  const uploadedPhotos: string[] = [];
                  
                  for (let i = 0; i < photoRefs.length; i++) {
                    result.costs.placePhotos += COSTS.PLACE_PHOTOS;
                    
                    const photoUrl = await processPhoto(
                      photoRefs[i],
                      location.id,
                      i,
                      googleApiKey,
                      supabase
                    );
                    
                    if (photoUrl) {
                      uploadedPhotos.push(photoUrl);
                    }
                    
                    // Small delay between photos
                    await new Promise(r => setTimeout(r, 100));
                  }
                  
                  if (uploadedPhotos.length > 0) {
                    updateData.photos = uploadedPhotos;
                    updateData.photos_fetched_at = new Date().toISOString();
                    result.photosAdded = uploadedPhotos.length;
                  }
                }
                
                // Process hours (mark as fetched even if Google has no hours)
                if (needsHours) {
                  const hours = detailsData.result?.opening_hours;

                  if (hours) {
                    updateData.opening_hours_data = {
                      periods: hours.periods,
                      weekdayText: hours.weekday_text,
                    };
                    result.hasHours = true;
                  } else {
                    // Some places (parks/streets/etc.) may not have opening hours in Google.
                    // We still mark the field as fetched so the dashboard doesn't keep counting it forever.
                    updateData.opening_hours_data = { unavailable: true };
                    result.hasHours = false;
                  }

                  updateData.opening_hours_source = 'google';
                  updateData.opening_hours_fetched_at = new Date().toISOString();
                }
                
                if (Object.keys(updateData).length > 0) {
                  await supabase
                    .from('locations')
                    .update(updateData)
                    .eq('id', location.id);
                }
                
                result.success = true;
              }
            } else {
              result.costs.placeDetails = COSTS.PLACE_DETAILS;
              if (needsPhotos) {
                result.costs.placePhotos = COSTS.PLACE_PHOTOS * maxPhotosPerLocation;
              }
              result.success = true;
            }
          }
        }

        result.costs.total = result.costs.findPlace + result.costs.placeDetails + result.costs.placePhotos;
        totalBatchCost += result.costs.total;

        // Log costs
        if (!dryRun && result.costs.total > 0) {
          const costEntries = [];
          
          if (result.costs.findPlace > 0) {
            costEntries.push({
              api_type: 'find_place',
              location_id: location.id,
              cost_usd: result.costs.findPlace,
              request_count: 1,
              billing_month: currentMonth,
            });
          }
          
          if (result.costs.placeDetails > 0) {
            costEntries.push({
              api_type: 'place_details',
              location_id: location.id,
              cost_usd: result.costs.placeDetails,
              request_count: 1,
              billing_month: currentMonth,
            });
          }
          
          if (result.costs.placePhotos > 0) {
            costEntries.push({
              api_type: 'place_photos',
              location_id: location.id,
              cost_usd: result.costs.placePhotos,
              request_count: Math.ceil(result.costs.placePhotos / COSTS.PLACE_PHOTOS),
              billing_month: currentMonth,
            });
          }
          
          if (costEntries.length > 0) {
            await supabase.from('google_api_costs').insert(costEntries);
          }
        }

        results.push(result);
        
      } catch (locationError) {
        console.error(`Error processing ${location.name}:`, locationError);
        result.error = locationError instanceof Error ? locationError.message : String(locationError);
        results.push(result);
      }

      // Delay between locations
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    const successCount = results.filter(r => r.success).length;
    const deletedCount = results.filter(r => r.deleted).length;
    const newMonthlySpend = monthlySpend + totalBatchCost;
    const newRemainingBudget = MONTHLY_FREE_CREDIT - newMonthlySpend;

    const remainingQuery = supabase
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .or('photos.is.null,opening_hours_data.is.null');

    // If we are NOT resolving Place IDs, only consider locations that already have a valid Place ID.
    // This prevents spending money looping over locations that Google can't match.
    const { count: remainingCount } = resolvePlaceIds
      ? await remainingQuery
      : await remainingQuery.like('google_place_id', 'ChIJ%');

    const batchResult: BatchResult = {
      processed: results.length,
      successful: successCount,
      failed: results.length - successCount - deletedCount,
      deleted: deletedCount,
      results,
      totalCost: totalBatchCost,
      monthlySpend: newMonthlySpend,
      remainingBudget: newRemainingBudget,
      hasMore: (remainingCount || 0) > 0 && newRemainingBudget > COSTS.PLACE_DETAILS,
      // Keep offset at 0; we always process the "first" remaining items each call.
      nextOffset: 0,
    };

    console.log(`Batch done: ${successCount}/${results.length}, cost: $${totalBatchCost.toFixed(4)}`);

    return new Response(
      JSON.stringify(batchResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Batch error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
