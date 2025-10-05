import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!googleMapsApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const { latitude, longitude, locationId, batchMode = false } = await req.json();

    // If batch mode, fetch all locations from DB
    if (batchMode) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Fetch locations missing city or with invalid coordinates
      const { data: locations, error } = await supabase
        .from('locations')
        .select('id, latitude, longitude, city, name')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(50);

      if (error) throw error;

      console.log(`Processing ${locations?.length || 0} locations`);

      let updated = 0;
      let errors = 0;

      for (const location of locations || []) {
        try {
          // Skip if city already exists and looks valid
          if (location.city && location.city.length > 2) {
            console.log(`Skipping ${location.name} - city already set: ${location.city}`);
            continue;
          }

          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.latitude},${location.longitude}&key=${googleMapsApiKey}`;
          
          const response = await fetch(geocodeUrl);
          const data = await response.json();

          if (data.status === 'OK' && data.results.length > 0) {
            // Extract city from address components
            const result = data.results[0];
            let city = '';

            for (const component of result.address_components) {
              if (component.types.includes('locality')) {
                city = component.long_name;
                break;
              } else if (component.types.includes('administrative_area_level_2')) {
                city = component.long_name;
              } else if (component.types.includes('administrative_area_level_1') && !city) {
                city = component.long_name;
              }
            }

            if (city) {
              const { error: updateError } = await supabase
                .from('locations')
                .update({ city })
                .eq('id', location.id);

              if (updateError) {
                console.error(`Error updating ${location.name}:`, updateError);
                errors++;
              } else {
                console.log(`✅ Updated ${location.name} with city: ${city}`);
                updated++;
              }
            }
          }

          // Rate limiting - wait 100ms between requests
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Error processing location ${location.id}:`, error);
          errors++;
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Updated ${updated} locations, ${errors} errors` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single location mode
    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleMapsApiKey}`;
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      let city = '';

      // Extract city from address components
      for (const component of result.address_components) {
        if (component.types.includes('locality')) {
          city = component.long_name;
          break;
        } else if (component.types.includes('administrative_area_level_2')) {
          city = component.long_name;
        } else if (component.types.includes('administrative_area_level_1') && !city) {
          city = component.long_name;
        }
      }

      // Update location if locationId provided
      if (locationId && city) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase
          .from('locations')
          .update({ city })
          .eq('id', locationId);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          city,
          formatted_address: result.formatted_address 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Geocoding failed: ${data.status}`);

  } catch (error) {
    console.error('Error in reverse-geocode function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to reverse geocode location',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
