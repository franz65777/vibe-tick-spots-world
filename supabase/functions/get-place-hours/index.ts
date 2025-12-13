import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { googlePlaceId, lat, lng, name } = await req.json();
    
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    let placeId = googlePlaceId;

    // If no place ID, try to find it using nearby search
    if (!placeId && lat && lng && name) {
      const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=100&keyword=${encodeURIComponent(name)}&key=${apiKey}`;
      
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
      
      if (searchData.results && searchData.results.length > 0) {
        // Find best match by name
        const normalizedName = name.toLowerCase().trim();
        let bestMatch = searchData.results.find((r: any) => 
          r.name?.toLowerCase().trim() === normalizedName
        );
        
        if (!bestMatch) {
          bestMatch = searchData.results.find((r: any) => 
            r.name?.toLowerCase().includes(normalizedName) || 
            normalizedName.includes(r.name?.toLowerCase() || '')
          );
        }
        
        if (!bestMatch) {
          bestMatch = searchData.results[0];
        }
        
        placeId = bestMatch.place_id;
      }
    }

    if (!placeId) {
      return new Response(
        JSON.stringify({ openingHours: null, error: 'Place not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get place details with opening hours
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours,current_opening_hours,business_status&key=${apiKey}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status !== 'OK' || !detailsData.result) {
      return new Response(
        JSON.stringify({ openingHours: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = detailsData.result;
    const openingHours = result.current_opening_hours || result.opening_hours;
    
    if (!openingHours) {
      return new Response(
        JSON.stringify({ openingHours: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current day (0 = Sunday in JS but Google uses Monday = 0)
    const now = new Date();
    const jsDay = now.getDay(); // 0 = Sunday
    const googleDay = jsDay === 0 ? 6 : jsDay - 1; // Convert to Google format (0 = Monday)

    // Get today's periods
    const todayPeriods = openingHours.periods?.filter((p: any) => p.open?.day === jsDay) || [];
    
    let todayHours = null;
    if (todayPeriods.length > 0) {
      todayHours = todayPeriods.map((p: any) => {
        const openTime = p.open?.time || '0000';
        const closeTime = p.close?.time || '2359';
        const formatTime = (t: string) => `${t.slice(0, 2)}:${t.slice(2)}`;
        return `${formatTime(openTime)} – ${formatTime(closeTime)}`;
      }).join(', ');
    }

    // Get weekday text for today
    const weekdayText = openingHours.weekday_text?.[googleDay] || null;

    return new Response(
      JSON.stringify({
        openingHours: {
          isOpen: openingHours.open_now ?? null,
          todayHours,
          weekdayText,
          periods: openingHours.periods,
          businessStatus: result.business_status
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching place hours:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
