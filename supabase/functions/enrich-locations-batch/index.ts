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

interface EnrichmentResult {
  locationId: string;
  locationName: string;
  success: boolean;
  photosAdded: number;
  hasHours: boolean;
  googlePlaceId?: string;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      batchSize = 10, 
      offset = 0, 
      enrichPhotos = true, 
      enrichHours = true,
      maxPhotosPerLocation = 4,
      dryRun = false 
    } = await req.json();

    console.log(`Starting batch enrichment: offset=${offset}, batchSize=${batchSize}, dryRun=${dryRun}`);

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
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
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

    // Fetch locations that need enrichment
    // Priority: locations with google_place_id but missing photos/hours
    const { data: locations, error: fetchError, count } = await supabase
      .from('locations')
      .select('id, name, google_place_id, latitude, longitude, photos, opening_hours_data', { count: 'exact' })
      .or('photos.is.null,opening_hours_data.is.null')
      .not('google_place_id', 'is', null)
      .like('google_place_id', 'ChIJ%') // Only valid Google Place IDs
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      throw new Error(`Failed to fetch locations: ${fetchError.message}`);
    }

    if (!locations || locations.length === 0) {
      // Try locations without Google Place ID (will use Find Place API)
      const { data: noPlaceIdLocations, count: totalCount } = await supabase
        .from('locations')
        .select('id, name, google_place_id, latitude, longitude, photos, opening_hours_data', { count: 'exact' })
        .or('photos.is.null,opening_hours_data.is.null')
        .or('google_place_id.is.null,google_place_id.not.like.ChIJ%')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .range(offset, offset + batchSize - 1);

      if (!noPlaceIdLocations || noPlaceIdLocations.length === 0) {
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
            nextOffset: offset,
            message: 'All locations are enriched!'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      locations.push(...noPlaceIdLocations);
    }

    console.log(`Processing ${locations.length} locations`);

    const results: EnrichmentResult[] = [];
    let totalBatchCost = 0;

    for (const location of locations) {
      // Check if we still have budget
      if (remainingBudget - totalBatchCost < COSTS.PLACE_DETAILS) {
        console.log('Budget limit reached during batch');
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

        // Step 1: Find Google Place ID if not available
        if (!isValidGooglePlaceId(googlePlaceId) && location.latitude && location.longitude) {
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
              
              // Update location with new Place ID
              await supabase
                .from('locations')
                .update({ google_place_id: googlePlaceId })
                .eq('id', location.id);
                
              console.log(`Found and saved place ID: ${googlePlaceId}`);
            }
          } else {
            result.costs.findPlace = COSTS.FIND_PLACE;
          }
        } else {
          result.googlePlaceId = googlePlaceId;
        }

        // Step 2: Get place details (photos + hours)
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
                const updateData: any = {};
                
                // Process photos
                if (needsPhotos && detailsData.result?.photos) {
                  const photoRefs = detailsData.result.photos
                    .slice(0, maxPhotosPerLocation)
                    .map((p: any) => p.photo_reference);
                  
                  const uploadedPhotos: string[] = [];
                  
                  for (let i = 0; i < photoRefs.length; i++) {
                    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRefs[i]}&key=${googleApiKey}`;
                    
                    try {
                      const photoResponse = await fetch(photoUrl);
                      result.costs.placePhotos += COSTS.PLACE_PHOTOS;
                      
                      if (photoResponse.ok) {
                        const photoBlob = await photoResponse.blob();
                        const photoBuffer = await photoBlob.arrayBuffer();
                        const photoBytes = new Uint8Array(photoBuffer);
                        
                        const fileName = `${location.id}/photo-${i}.jpg`;
                        
                        const { error: uploadError } = await supabase.storage
                          .from('location-photos')
                          .upload(fileName, photoBytes, {
                            contentType: 'image/jpeg',
                            upsert: true
                          });
                        
                        if (!uploadError) {
                          const { data: urlData } = supabase.storage
                            .from('location-photos')
                            .getPublicUrl(fileName);
                          
                          uploadedPhotos.push(urlData.publicUrl);
                        }
                      }
                    } catch (photoError) {
                      console.error(`Photo ${i} error:`, photoError);
                    }
                  }
                  
                  if (uploadedPhotos.length > 0) {
                    updateData.photos = uploadedPhotos;
                    updateData.photos_fetched_at = new Date().toISOString();
                    result.photosAdded = uploadedPhotos.length;
                  }
                }
                
                // Process hours
                if (needsHours && detailsData.result?.opening_hours) {
                  const hours = detailsData.result.opening_hours;
                  updateData.opening_hours_data = {
                    periods: hours.periods,
                    weekdayText: hours.weekday_text,
                  };
                  updateData.opening_hours_source = 'google';
                  updateData.opening_hours_fetched_at = new Date().toISOString();
                  result.hasHours = true;
                }
                
                // Update location
                if (Object.keys(updateData).length > 0) {
                  await supabase
                    .from('locations')
                    .update(updateData)
                    .eq('id', location.id);
                }
                
                result.success = true;
              }
            } else {
              // Dry run - estimate costs
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

        // Log cost to database (not in dry run)
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
        result.error = locationError.message;
        results.push(result);
      }

      // Small delay between locations to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const successCount = results.filter(r => r.success).length;
    const newMonthlySpend = monthlySpend + totalBatchCost;
    const newRemainingBudget = MONTHLY_FREE_CREDIT - newMonthlySpend;

    // Check if there are more locations to process
    const { count: remainingCount } = await supabase
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .or('photos.is.null,opening_hours_data.is.null');

    const batchResult: BatchResult = {
      processed: results.length,
      successful: successCount,
      failed: results.length - successCount,
      results,
      totalCost: totalBatchCost,
      monthlySpend: newMonthlySpend,
      remainingBudget: newRemainingBudget,
      hasMore: (remainingCount || 0) > 0 && newRemainingBudget > COSTS.PLACE_DETAILS,
      nextOffset: offset + results.length,
    };

    console.log(`Batch complete: ${successCount}/${results.length} successful, cost: $${totalBatchCost.toFixed(4)}`);

    return new Response(
      JSON.stringify(batchResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Batch enrichment error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
