import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateRequest {
  name: string;
  latitude: number;
  longitude: number;
}

interface ValidateResponse {
  valid: boolean;
  google_place_id?: string;
  business_status?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, latitude, longitude } = await req.json() as ValidateRequest;

    if (!name || latitude === undefined || longitude === undefined) {
      console.error('Missing required fields:', { name, latitude, longitude });
      return new Response(
        JSON.stringify({ valid: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      // If no API key, allow save but log warning
      return new Response(
        JSON.stringify({ valid: true, error: 'API key not configured - validation skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Find Place API to search for the location
    const searchQuery = encodeURIComponent(name);
    const locationBias = `point:${latitude},${longitude}`;
    
    const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${searchQuery}&inputtype=textquery&locationbias=${locationBias}&fields=place_id,business_status,name,geometry&key=${apiKey}`;

    console.log('Validating location:', { name, latitude, longitude });

    const response = await fetch(findPlaceUrl);
    const data = await response.json();

    console.log('Google Find Place response:', JSON.stringify(data));

    if (data.status === 'ZERO_RESULTS' || !data.candidates || data.candidates.length === 0) {
      console.log('Location not found on Google Maps:', name);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Location not found on Google Maps' 
        } as ValidateResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const candidate = data.candidates[0];
    
    // Check if business is permanently closed
    if (candidate.business_status === 'CLOSED_PERMANENTLY') {
      console.log('Location is permanently closed:', name);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          google_place_id: candidate.place_id,
          business_status: 'CLOSED_PERMANENTLY',
          error: 'This location is permanently closed' 
        } as ValidateResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the location is within reasonable distance (500m) from the provided coordinates
    if (candidate.geometry?.location) {
      const googleLat = candidate.geometry.location.lat;
      const googleLng = candidate.geometry.location.lng;
      const distance = calculateDistance(latitude, longitude, googleLat, googleLng);
      
      if (distance > 0.5) {
        console.log('Location coordinates mismatch, distance:', distance, 'km');
        // Still return valid but log the discrepancy
      }
    }

    console.log('Location validated successfully:', { 
      name, 
      google_place_id: candidate.place_id,
      business_status: candidate.business_status || 'OPERATIONAL'
    });

    return new Response(
      JSON.stringify({ 
        valid: true, 
        google_place_id: candidate.place_id,
        business_status: candidate.business_status || 'OPERATIONAL'
      } as ValidateResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating location:', error);
    // On error, allow save to prevent blocking user actions
    return new Response(
      JSON.stringify({ valid: true, error: 'Validation error - save allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Haversine formula to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
