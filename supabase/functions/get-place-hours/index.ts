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
    const { lat, lng, name } = await req.json();
    
    const apiKey = Deno.env.get('FOURSQUARE_API_KEY');
    if (!apiKey) {
      console.error('Foursquare API key not configured');
      return new Response(
        JSON.stringify({ error: 'Foursquare API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ openingHours: null, error: 'Coordinates required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for place: ${name} at ${lat}, ${lng}`);

    // Search for the place using Foursquare
    const searchUrl = `https://api.foursquare.com/v3/places/search?ll=${lat},${lng}&radius=100${name ? `&query=${encodeURIComponent(name)}` : ''}&limit=5`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Foursquare search error:', errorText);
      return new Response(
        JSON.stringify({ openingHours: null, error: 'Search failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchData = await searchResponse.json();
    console.log(`Found ${searchData.results?.length || 0} places`);

    if (!searchData.results || searchData.results.length === 0) {
      return new Response(
        JSON.stringify({ openingHours: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find best match by name
    let bestMatch = searchData.results[0];
    if (name) {
      const normalizedName = name.toLowerCase().trim();
      const exactMatch = searchData.results.find((r: any) => 
        r.name?.toLowerCase().trim() === normalizedName
      );
      if (exactMatch) {
        bestMatch = exactMatch;
      } else {
        const partialMatch = searchData.results.find((r: any) => {
          const placeName = r.name?.toLowerCase() || '';
          return placeName.includes(normalizedName) || normalizedName.includes(placeName);
        });
        if (partialMatch) {
          bestMatch = partialMatch;
        }
      }
    }

    console.log(`Best match: ${bestMatch.name} (fsq_id: ${bestMatch.fsq_id})`);

    // Get place details with hours
    const detailsUrl = `https://api.foursquare.com/v3/places/${bestMatch.fsq_id}?fields=hours,hours_popular`;
    
    const detailsResponse = await fetch(detailsUrl, {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!detailsResponse.ok) {
      const errorText = await detailsResponse.text();
      console.error('Foursquare details error:', errorText);
      return new Response(
        JSON.stringify({ openingHours: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const detailsData = await detailsResponse.json();
    console.log('Place details:', JSON.stringify(detailsData));

    const hours = detailsData.hours;
    
    if (!hours || !hours.regular) {
      console.log('No hours data available');
      return new Response(
        JSON.stringify({ openingHours: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current day (1 = Monday, 7 = Sunday in Foursquare)
    const now = new Date();
    const jsDay = now.getDay(); // 0 = Sunday in JS
    const fsqDay = jsDay === 0 ? 7 : jsDay; // Convert to Foursquare format
    const currentTime = now.getHours() * 100 + now.getMinutes(); // e.g., 1430 for 14:30

    // Find today's hours
    const todayHours = hours.regular.filter((h: any) => h.day === fsqDay);
    
    let isOpen = false;
    let todayHoursStr = null;

    if (todayHours.length > 0) {
      // Format hours for display
      const formatTime = (time: string) => {
        const hour = parseInt(time.slice(0, 2));
        const min = time.slice(2);
        return `${hour}:${min}`;
      };

      todayHoursStr = todayHours.map((h: any) => {
        const open = formatTime(h.open);
        const close = formatTime(h.close);
        return `${open} – ${close}`;
      }).join(', ');

      // Check if currently open
      for (const period of todayHours) {
        const openTime = parseInt(period.open);
        let closeTime = parseInt(period.close);
        
        // Handle overnight closing (e.g., closes at 0030 = 00:30)
        if (closeTime < openTime) {
          // If we're before midnight
          if (currentTime >= openTime || currentTime < closeTime) {
            isOpen = true;
            break;
          }
        } else {
          if (currentTime >= openTime && currentTime < closeTime) {
            isOpen = true;
            break;
          }
        }
      }
    }

    // Also check open_now if available
    if (hours.open_now !== undefined) {
      isOpen = hours.open_now;
    }

    console.log(`Result: isOpen=${isOpen}, todayHours=${todayHoursStr}`);

    return new Response(
      JSON.stringify({
        openingHours: {
          isOpen,
          todayHours: todayHoursStr
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
