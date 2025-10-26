import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map Foursquare category IDs to our 7 allowed categories
const categoryMapping: Record<string, string> = {
  // Restaurants
  '13065': 'restaurant', // Restaurant
  '13034': 'restaurant', // Cafe (but we'll map cafes separately)
  '13003': 'restaurant', // Asian Restaurant
  '13064': 'restaurant', // Pizza Place
  '13145': 'restaurant', // Fast Food
  '13383': 'restaurant', // Steakhouse
  
  // Bars
  '13003': 'bar', // Bar
  '13035': 'bar', // Pub
  '13036': 'bar', // Wine Bar
  '13119': 'bar', // Cocktail Bar
  '13038': 'bar', // Nightclub
  
  // Cafes
  '13034': 'cafe', // Cafe
  '13035': 'cafe', // Coffee Shop
  
  // Bakery
  '13002': 'bakery', // Bakery
  
  // Hotels
  '19014': 'hotel', // Hotel
  '19013': 'hotel', // Hostel
  '19001': 'hotel', // Bed & Breakfast
  
  // Museums
  '10027': 'museum', // Museum
  '10028': 'museum', // Art Museum
  '10029': 'museum', // History Museum
  
  // Entertainment
  '10032': 'entertainment', // Movie Theater
  '10033': 'entertainment', // Theater
  '10001': 'entertainment', // Arts & Entertainment
  '10024': 'entertainment', // Concert Hall
  '18021': 'entertainment', // Stadium
};

// Foursquare category IDs to include in search (only our 7 categories)
const allowedFoursquareCategoryIds = [
  '13065', // Restaurant
  '13003', // Bar  
  '13034', // Cafe
  '13002', // Bakery
  '19014', // Hotel
  '10027', // Museum
  '10001', // Entertainment
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FOURSQUARE_API_KEY = Deno.env.get('FOURSQUARE_API_KEY');
    if (!FOURSQUARE_API_KEY) {
      throw new Error('FOURSQUARE_API_KEY is not configured');
    }

    const { lat, lng, query, limit = 10 } = await req.json();

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching Foursquare: lat=${lat}, lng=${lng}, query=${query}, limit=${limit}`);

    // Build Foursquare API request
    const params = new URLSearchParams({
      ll: `${lat},${lng}`,
      radius: '1000', // 1km radius
      limit: String(limit),
      categories: allowedFoursquareCategoryIds.join(','),
    });

    if (query) {
      params.append('query', query);
    }

    const foursquareUrl = `https://api.foursquare.com/v3/places/search?${params.toString()}`;

    const response = await fetch(foursquareUrl, {
      headers: {
        'Authorization': FOURSQUARE_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Foursquare API error:', response.status, errorText);
      throw new Error(`Foursquare API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Foursquare returned ${data.results?.length || 0} results`);

    // Transform and filter results
    const places = (data.results || [])
      .map((place: any) => {
        // Get the first category and map it to our allowed categories
        const foursquareCategory = place.categories?.[0]?.id;
        const mappedCategory = categoryMapping[foursquareCategory];

        // Only include if it maps to one of our 7 categories
        if (!mappedCategory) {
          console.log(`Skipping place ${place.name} - category ${foursquareCategory} not in allowed list`);
          return null;
        }

        const location = place.geocodes?.main || place.geocodes?.roof;
        const address = place.location?.formatted_address || 
                       `${place.location?.address || ''} ${place.location?.locality || ''}`.trim();

        return {
          fsq_id: place.fsq_id,
          name: place.name,
          category: mappedCategory,
          address: address || 'Address not available',
          city: place.location?.locality || place.location?.region || 'Unknown',
          lat: location?.latitude,
          lng: location?.longitude,
          distance: place.distance,
        };
      })
      .filter((place: any) => place !== null); // Remove null entries

    console.log(`Returning ${places.length} filtered places`);

    return new Response(
      JSON.stringify({ places }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in foursquare-search:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to search Foursquare' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
