import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhotoResult {
  photos: string[];
  source: string;
  fetched_at: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { locationId, googlePlaceId, forceRefresh = false, maxPhotos = 6 } = await req.json();

    if (!locationId && !googlePlaceId) {
      return new Response(
        JSON.stringify({ error: 'locationId or googlePlaceId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get location data if we have locationId
    let location: any = null;
    let placeId = googlePlaceId;

    if (locationId) {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, google_place_id, photos, photos_fetched_at')
        .eq('id', locationId)
        .single();

      if (error) {
        console.error('Error fetching location:', error);
      } else {
        location = data;
        placeId = placeId || location.google_place_id;

        // Check if we already have photos and don't need to refresh
        if (!forceRefresh && location.photos && location.photos.length > 0) {
          return new Response(
            JSON.stringify({
              photos: location.photos,
              source: 'cache',
              fetched_at: location.photos_fetched_at
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    if (!placeId) {
      return new Response(
        JSON.stringify({ error: 'No Google Place ID available', photos: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!googleApiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Google API key not configured', photos: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch place details with photos from Google
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${googleApiKey}`;
    
    console.log(`Fetching photos for place: ${placeId}`);
    
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status !== 'OK' || !detailsData.result?.photos) {
      console.log('No photos available from Google:', detailsData.status);
      return new Response(
        JSON.stringify({ photos: [], source: 'google', fetched_at: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const photoReferences = detailsData.result.photos
      .slice(0, maxPhotos)
      .map((p: any) => p.photo_reference);

    console.log(`Found ${photoReferences.length} photos`);

    // Fetch and upload each photo to Supabase Storage
    const uploadedPhotos: string[] = [];

    for (let i = 0; i < photoReferences.length; i++) {
      const photoRef = photoReferences[i];
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${googleApiKey}`;

      try {
        // Fetch the photo from Google
        const photoResponse = await fetch(photoUrl);
        
        if (!photoResponse.ok) {
          console.error(`Failed to fetch photo ${i}:`, photoResponse.status);
          continue;
        }

        const photoBlob = await photoResponse.blob();
        const photoBuffer = await photoBlob.arrayBuffer();
        const photoBytes = new Uint8Array(photoBuffer);

        // Generate filename
        const targetId = locationId || placeId;
        const fileName = `${targetId}/photo-${i}.jpg`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('location-photos')
          .upload(fileName, photoBytes, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error(`Error uploading photo ${i}:`, uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('location-photos')
          .getPublicUrl(fileName);

        uploadedPhotos.push(urlData.publicUrl);
        console.log(`Uploaded photo ${i + 1}/${photoReferences.length}`);

      } catch (photoError) {
        console.error(`Error processing photo ${i}:`, photoError);
      }
    }

    // Update the location record with photos
    if (locationId && uploadedPhotos.length > 0) {
      const { error: updateError } = await supabase
        .from('locations')
        .update({
          photos: uploadedPhotos,
          photos_fetched_at: new Date().toISOString()
        })
        .eq('id', locationId);

      if (updateError) {
        console.error('Error updating location with photos:', updateError);
      }
    }

    const result: PhotoResult = {
      photos: uploadedPhotos,
      source: 'google',
      fetched_at: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-place-photos:', error);
    return new Response(
      JSON.stringify({ error: error.message, photos: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
