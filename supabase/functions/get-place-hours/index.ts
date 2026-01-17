import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cost constants (in USD) - matching Google's pricing
const COSTS = {
  FIND_PLACE: 0.017,          // Find Place from Text (Basic)
  PLACE_DETAILS_HOURS: 0.02,  // Place Details (Contact) - opening_hours field
};

// Helper to get current billing month
function getCurrentBillingMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

interface OpeningHoursResult {
  isOpen: boolean | null;
  todayHours: string | null;
  source: string;
}

// Validate if a Google Place ID is real (not fake OSM-generated)
function isValidGooglePlaceId(placeId: string | null | undefined): boolean {
  if (!placeId || typeof placeId !== 'string') return false;
  // Real Google Place IDs start with "ChIJ" 
  // Fake IDs often start with "osm-", "osm_", "photon-", or coordinates
  if (placeId.startsWith('ChIJ')) return true;
  return false;
}

// Use Google Find Place API to get a Place ID from name + coordinates
async function findGooglePlaceId(
  name: string,
  lat: number,
  lng: number,
  apiKey: string
): Promise<string | null> {
  try {
    // Use Find Place from Text with location bias
    const input = encodeURIComponent(name);
    const locationBias = `point:${lat},${lng}`;
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${input}&inputtype=textquery&locationbias=${locationBias}&fields=place_id&key=${apiKey}`;
    
    console.log(`Find Place API call for: ${name}`);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.candidates && data.candidates.length > 0) {
      const placeId = data.candidates[0].place_id;
      console.log(`Find Place API found: ${placeId}`);
      return placeId;
    }
    
    console.log(`Find Place API no results: ${data.status}`);
    return null;
  } catch (error) {
    console.error('Find Place API error:', error);
    return null;
  }
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
    const { lat, lng, name, locationId, googlePlaceId: requestedPlaceId } = await req.json();

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'Missing coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching hours for ${name} at ${lat}, ${lng}, locationId: ${locationId}, googlePlaceId: ${requestedPlaceId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    let openingHours: OpeningHoursResult | null = null;
    let cacheData: any = null;
    let cachedLocation: any = null;

    // Step 1: Check database cache and get existing google_place_id
    if (locationId) {
      const { data } = await supabase
        .from('locations')
        .select('opening_hours_data, opening_hours_fetched_at, opening_hours_source, google_place_id, name')
        .eq('id', locationId)
        .maybeSingle();

      cachedLocation = data;
      console.log(`DB location: google_place_id=${cachedLocation?.google_place_id}, source=${cachedLocation?.opening_hours_source}`);
    }

    // Step 2: Determine the best Google Place ID to use
    // Priority: 1) Valid ID from request, 2) Valid ID from database
    let googlePlaceId: string | null = null;
    
    if (isValidGooglePlaceId(requestedPlaceId)) {
      googlePlaceId = requestedPlaceId;
      console.log(`Using valid Google Place ID from request: ${googlePlaceId}`);
    } else if (isValidGooglePlaceId(cachedLocation?.google_place_id)) {
      googlePlaceId = cachedLocation.google_place_id;
      console.log(`Using valid Google Place ID from database: ${googlePlaceId}`);
    }

    // Step 3: If we have cached Google data, use it immediately
    if (cachedLocation?.opening_hours_data && cachedLocation?.opening_hours_source === 'google') {
      console.log('Using cached Google opening hours');
      const cached = cachedLocation.opening_hours_data as any;
      
      let isOpen = cached.isOpen ?? null;
      let todayHours = cached.todayHours ?? null;

      if (cached.periods) {
        const parsed = parseGoogleHours(cached.periods, cached.weekdayText || []);
        isOpen = parsed.isOpen;
        todayHours = parsed.todayHours;
      }

      return new Response(
        JSON.stringify({
          openingHours: { isOpen, todayHours, source: 'google' }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: If no valid Google Place ID, try to find one using Find Place API
    let usedFindPlaceApi = false;
    if (!googlePlaceId && googleApiKey && name) {
      console.log('No valid Google Place ID, trying Find Place API...');
      const foundPlaceId = await findGooglePlaceId(name, lat, lng, googleApiKey);
      usedFindPlaceApi = true; // Track that we made a Find Place API call
      
      if (foundPlaceId) {
        googlePlaceId = foundPlaceId;
        
        // Save the found Google Place ID to the database
        if (locationId) {
          try {
            await supabase
              .from('locations')
              .update({ google_place_id: foundPlaceId })
              .eq('id', locationId);
            console.log(`Saved new Google Place ID to database: ${foundPlaceId}`);
          } catch (err) {
            console.error('Failed to save Google Place ID:', err);
          }
        }
      }
    }

    // Step 5: Try Google Places Details API for opening hours
    let usedPlaceDetailsApi = false;
    if (googleApiKey && googlePlaceId) {
      try {
        console.log(`Fetching opening hours from Google Places API for: ${googlePlaceId}`);
        
        const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=opening_hours&key=${googleApiKey}`;
        
        const googleResponse = await fetch(googleUrl);
        const googleData = await googleResponse.json();
        usedPlaceDetailsApi = true; // Track that we made a Place Details API call

        if (googleData.status === 'OK' && googleData.result?.opening_hours) {
          const hours = googleData.result.opening_hours;
          openingHours = parseGoogleHours(hours.periods || [], hours.weekday_text || []);
          
          cacheData = {
            periods: hours.periods,
            weekdayText: hours.weekday_text,
            todayHours: openingHours.todayHours,
            isOpen: openingHours.isOpen
          };
          
          console.log('Google Places API success:', openingHours);
        } else {
          console.log('Google Places API returned no opening hours:', googleData.status, googleData.error_message);
        }
      } catch (googleError) {
        console.error('Google Places API error:', googleError);
      }
    }

    // Track Google API costs with API key identifier
    const currentMonth = getCurrentBillingMonth();
    const apiKeyIdentifier = googleApiKey ? googleApiKey.slice(-6) : null;
    const costEntries = [];

    if (usedFindPlaceApi) {
      costEntries.push({
        api_type: 'find_place',
        location_id: locationId || null,
        cost_usd: COSTS.FIND_PLACE,
        request_count: 1,
        billing_month: currentMonth,
        api_key_identifier: apiKeyIdentifier,
        metadata: { source: 'user_hours_fetch' }
      });
    }

    if (usedPlaceDetailsApi) {
      costEntries.push({
        api_type: 'place_details',
        location_id: locationId || null,
        cost_usd: COSTS.PLACE_DETAILS_HOURS,
        request_count: 1,
        billing_month: currentMonth,
        api_key_identifier: apiKeyIdentifier,
        metadata: { source: 'user_hours_fetch', fields: ['opening_hours'] }
      });
    }

    // Insert cost tracking records
    if (costEntries.length > 0) {
      const { error: costError } = await supabase
        .from('google_api_costs')
        .insert(costEntries);
      
      if (costError) {
        console.error('Error tracking API costs:', costError);
      } else {
        const totalCost = costEntries.reduce((sum, e) => sum + e.cost_usd, 0);
        console.log(`Tracked API costs: $${totalCost.toFixed(4)}`);
      }
    }

    // Step 6: Fallback to OSM Overpass API
    if (!openingHours) {
      try {
        console.log('Falling back to OSM Overpass API...');
        
        const radius = 50;
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

    // If external APIs failed but we have cached data, use it as fallback
    if (!openingHours && cachedLocation?.opening_hours_data) {
      console.log('Using existing cached opening hours as fallback');
      const cached = cachedLocation.opening_hours_data as any;

      if (cached.periods) {
        const parsed = parseGoogleHours(cached.periods, cached.weekdayText || []);
        openingHours = {
          isOpen: parsed.isOpen,
          todayHours: parsed.todayHours,
          source: cachedLocation.opening_hours_source || 'cached',
        };
      } else if (cached.osmHours) {
        const parsed = parseOsmHours(cached.osmHours);
        openingHours = {
          ...parsed,
          source: cachedLocation.opening_hours_source || parsed.source,
        };
      } else {
        openingHours = {
          isOpen: cached.isOpen ?? null,
          todayHours: cached.todayHours ?? null,
          source: cachedLocation.opening_hours_source || 'cached',
        };
      }
    }

    // Step 7: Save to database cache if we got new results
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
