import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OpeningHoursResult {
  isOpen: boolean | null;
  todayHours: string | null;
  source: string;
}

// Parse Google Places opening hours
function parseGoogleHours(periods: any[], weekdayText: string[]): OpeningHoursResult {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const currentTime = now.getHours() * 100 + now.getMinutes();
  
  let isOpen = false;
  let todayHours: string | null = null;

  // Get today's text from weekday_text (Google uses Monday = 0)
  const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  if (weekdayText && weekdayText[googleDayIndex]) {
    // Extract hours part after day name (e.g., "Monday: 9:00 AM – 10:00 PM" -> "9:00 AM – 10:00 PM")
    const colonIndex = weekdayText[googleDayIndex].indexOf(':');
    if (colonIndex !== -1) {
      todayHours = weekdayText[googleDayIndex].substring(colonIndex + 1).trim();
    }
  }

  // Check if currently open using periods
  if (periods && periods.length > 0) {
    for (const period of periods) {
      if (!period.open) continue;
      
      const openDay = period.open.day;
      const openTime = period.open.time ? parseInt(period.open.time) : 0;
      const closeDay = period.close?.day ?? openDay;
      const closeTime = period.close?.time ? parseInt(period.close.time) : 2400;

      // Handle same day
      if (openDay === dayOfWeek && closeDay === dayOfWeek) {
        if (currentTime >= openTime && currentTime < closeTime) {
          isOpen = true;
          break;
        }
      }
      // Handle overnight (closes next day)
      else if (openDay === dayOfWeek && closeDay !== dayOfWeek) {
        if (currentTime >= openTime) {
          isOpen = true;
          break;
        }
      }
      // Check if we're in the closing period from yesterday
      else if (closeDay === dayOfWeek && openDay !== dayOfWeek) {
        if (currentTime < closeTime) {
          isOpen = true;
          break;
        }
      }
      // 24/7 case (no close time)
      else if (!period.close) {
        isOpen = true;
        break;
      }
    }
  }

  return { isOpen, todayHours, source: 'google' };
}

// Fallback: Parse OSM opening_hours format
function parseOsmHours(hoursString: string): OpeningHoursResult {
  if (!hoursString || hoursString.trim() === '') {
    return { isOpen: null, todayHours: null, source: 'osm' };
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const currentDayShort = dayNames[dayOfWeek];

  // Handle 24/7
  if (hoursString.toLowerCase().includes('24/7')) {
    return { isOpen: true, todayHours: '00:00 - 24:00', source: 'osm' };
  }

  let isOpen = false;
  let todayHours: string | null = null;

  // Parse rules like "Mo-Fr 09:00-18:00; Sa 10:00-14:00"
  const rules = hoursString.split(';').map(r => r.trim());

  for (const rule of rules) {
    if (!rule) continue;

    // Extract days and times
    const match = rule.match(/^([A-Za-z,-]+)\s+(.+)$/);
    if (!match) continue;

    const [, daysStr, timesStr] = match;

    // Check if current day is in the days range
    const dayRanges = daysStr.split(',');
    let appliesToToday = false;

    for (const dayRange of dayRanges) {
      if (dayRange.includes('-')) {
        const [startDay, endDay] = dayRange.split('-');
        const startIdx = dayNames.indexOf(startDay);
        const endIdx = dayNames.indexOf(endDay);
        if (startIdx !== -1 && endIdx !== -1) {
          if (startIdx <= endIdx) {
            appliesToToday = dayOfWeek >= startIdx && dayOfWeek <= endIdx;
          } else {
            // Wrap around (e.g., Fr-Mo)
            appliesToToday = dayOfWeek >= startIdx || dayOfWeek <= endIdx;
          }
        }
      } else {
        appliesToToday = dayRange === currentDayShort;
      }
      if (appliesToToday) break;
    }

    if (!appliesToToday) continue;

    todayHours = timesStr;

    // Check if currently open
    const timeRanges = timesStr.split(',').map(t => t.trim());
    for (const timeRange of timeRanges) {
      const timeMatch = timeRange.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const [, openH, openM, closeH, closeM] = timeMatch;
        const openTime = parseInt(openH) * 60 + parseInt(openM);
        let closeTime = parseInt(closeH) * 60 + parseInt(closeM);
        
        // Handle midnight (00:00) as 24:00
        if (closeTime === 0) closeTime = 24 * 60;
        
        if (currentTime >= openTime && currentTime < closeTime) {
          isOpen = true;
          break;
        }
      }
    }
  }

  return { isOpen, todayHours, source: 'osm' };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, name, locationId, googlePlaceId } = await req.json();

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'Missing coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching hours for ${name} at ${lat}, ${lng}, locationId: ${locationId}, googlePlaceId: ${googlePlaceId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Check database cache first
    if (locationId) {
      const { data: cachedLocation } = await supabase
        .from('locations')
        .select('opening_hours_data, opening_hours_fetched_at, opening_hours_source')
        .eq('id', locationId)
        .single();

      if (cachedLocation?.opening_hours_data) {
        console.log('Using cached opening hours from database');
        const cached = cachedLocation.opening_hours_data as any;
        
        // Recalculate isOpen and todayHours based on current time
        let isOpen = cached.isOpen;
        let todayHours = cached.todayHours;
        
        if (cached.periods) {
          const parsed = parseGoogleHours(cached.periods, cached.weekdayText || []);
          isOpen = parsed.isOpen;
          todayHours = parsed.todayHours;
        }
        
        return new Response(
          JSON.stringify({
            openingHours: {
              isOpen,
              todayHours,
              source: cachedLocation.opening_hours_source || 'cached'
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Step 2: Try Google Places API
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    let openingHours: OpeningHoursResult | null = null;
    let cacheData: any = null;

    if (googleApiKey && googlePlaceId) {
      try {
        console.log('Fetching from Google Places API...');
        
        // Use Place Details API with only opening_hours field to minimize cost
        const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=opening_hours&key=${googleApiKey}`;
        
        const googleResponse = await fetch(googleUrl);
        const googleData = await googleResponse.json();

        if (googleData.status === 'OK' && googleData.result?.opening_hours) {
          const hours = googleData.result.opening_hours;
          openingHours = parseGoogleHours(hours.periods || [], hours.weekday_text || []);
          
          // Store periods for future recalculation
          cacheData = {
            periods: hours.periods,
            weekdayText: hours.weekday_text,
            todayHours: openingHours.todayHours,
            isOpen: openingHours.isOpen
          };
          
          console.log('Google Places API success:', openingHours);
        } else {
          console.log('Google Places API returned no opening hours:', googleData.status);
        }
      } catch (googleError) {
        console.error('Google Places API error:', googleError);
      }
    }

    // Step 3: Fallback to OSM Overpass API
    if (!openingHours) {
      try {
        console.log('Falling back to OSM Overpass API...');
        
        const radius = 50; // meters
        const query = `
          [out:json][timeout:10];
          (
            node["opening_hours"](around:${radius},${lat},${lng});
            way["opening_hours"](around:${radius},${lat},${lng});
          );
          out body;
        `;

        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        const overpassResponse = await fetch(overpassUrl, {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const osmData = await overpassResponse.json();

        if (osmData.elements && osmData.elements.length > 0) {
          // Find best match by name if provided
          let bestMatch = osmData.elements[0];
          
          if (name) {
            const nameLower = name.toLowerCase();
            for (const element of osmData.elements) {
              const elementName = element.tags?.name?.toLowerCase() || '';
              if (elementName.includes(nameLower) || nameLower.includes(elementName)) {
                bestMatch = element;
                break;
              }
            }
          }

          const osmHours = bestMatch.tags?.opening_hours;
          if (osmHours) {
            openingHours = parseOsmHours(osmHours);
            cacheData = {
              osmHours,
              todayHours: openingHours.todayHours,
              isOpen: openingHours.isOpen
            };
            console.log('OSM Overpass success:', openingHours);
          }
        }
      } catch (osmError) {
        console.error('OSM Overpass API error:', osmError);
      }
    }

    // Step 4: Save to database cache if we got results
    if (openingHours && cacheData && locationId) {
      try {
        await supabase
          .from('locations')
          .update({
            opening_hours_data: cacheData,
            opening_hours_fetched_at: new Date().toISOString(),
            opening_hours_source: openingHours.source
          })
          .eq('id', locationId);
        
        console.log('Cached opening hours to database');
      } catch (cacheError) {
        console.error('Failed to cache opening hours:', cacheError);
      }
    }

    return new Response(
      JSON.stringify({
        openingHours: openingHours || { isOpen: null, todayHours: null, source: 'none' }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-place-hours:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
