
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const caption = formData.get('caption') as string;
    const locationId = formData.get('locationId') as string;
    const locationName = formData.get('locationName') as string;
    const locationAddress = formData.get('locationAddress') as string;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `stories/${user.id}/${Date.now()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(uploadData.path);

    // Find or create location in database if locationId is provided
    let finalLocationId = null;
    
    if (locationId) {
      // Check if this is already a UUID (existing location in our database)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(locationId)) {
        // Already a valid UUID from our database
        finalLocationId = locationId;
      } else {
        // It's a google_place_id or OSM id - try to find existing location
        const { data: existingLocation } = await supabase
          .from('locations')
          .select('id')
          .eq('google_place_id', locationId)
          .maybeSingle();
        
        if (existingLocation) {
          finalLocationId = existingLocation.id;
        } else {
          console.log('Location not found in database, story will be created without location_id');
          // We'll just store the location name and address without the UUID reference
        }
      }
    }

    // Create story record
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .insert({
        user_id: user.id,
        location_id: finalLocationId,
        media_url: publicUrl,
        media_type: file.type.startsWith('image/') ? 'image' : 'video',
        caption: caption || null,
        location_name: locationName || null,
        location_address: locationAddress || null,
      })
      .select()
      .single();

    if (storyError) {
      console.error('Story creation error:', storyError);
      return new Response(
        JSON.stringify({ error: 'Failed to create story' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, story }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
