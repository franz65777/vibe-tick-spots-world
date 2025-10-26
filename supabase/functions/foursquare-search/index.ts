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
    // If the key is missing, do NOT throw. We'll gracefully fallback to OpenStreetMap.
    // We'll still attempt Foursquare when a key is present.

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
      sort: 'DISTANCE',
      fields: 'fsq_id,name,location,geocodes,categories,distance'
    });

    if (query) {
      params.append('query', query);
    }

    const foursquareUrl = `https://api.foursquare.com/v3/places/search?${params.toString()}`;

    const response = await fetch(foursquareUrl, {
      headers: {
        'Authorization': FOURSQUARE_API_KEY || '',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Foursquare API error:', response.status, response.statusText);
      // Fallback to OpenStreetMap Nominatim if Foursquare fails
      try {
        const deltaLat = 0.009; // ~1km
        const deltaLng = 0.009 / Math.cos((lat * Math.PI) / 180);
        const left = (lng - deltaLng).toFixed(6);
        const right = (lng + deltaLng).toFixed(6);
        const top = (lat + deltaLat).toFixed(6);
        const bottom = (lat - deltaLat).toFixed(6);
        const q = query ? encodeURIComponent(query) : encodeURIComponent('restaurant|cafe|bar|bakery|hotel|museum|cinema|theatre');
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&namedetails=1&addressdetails=1&limit=${limit}&viewbox=${left},${top},${right},${bottom}&bounded=1&q=${q}`;
        const osmRes = await fetch(nominatimUrl, { headers: { 'Accept': 'application/json', 'User-Agent': 'SpottApp/1.0 (contact: support@spott.app)' }});
        if (osmRes.ok) {
          const osmData = await osmRes.json();
          const toCategory = (item: any): string | null => {
            const cls = String(item.class || '').toLowerCase();
            const typ = String(item.type || '').toLowerCase();
            const name = String(item.namedetails?.name || item.display_name || '').toLowerCase();
            if (typ.includes('restaurant') || name.includes('restaurant') || name.includes('food')) return 'restaurant';
            if (typ.includes('bar') || typ.includes('pub') || typ.includes('nightclub') || name.includes('bar') || name.includes('pub') || name.includes('cocktail') || name.includes('wine')) return 'bar';
            if (typ.includes('cafe') || name.includes('cafe') || name.includes('coffee')) return 'cafe';
            if (typ.includes('bakery') || name.includes('bakery') || name.includes('patisserie') || name.includes('bake')) return 'bakery';
            if ((cls === 'tourism' && (typ.includes('hotel') || typ.includes('hostel') || typ.includes('guest_house'))) || name.includes('hotel') || name.includes('hostel')) return 'hotel';
            if ((cls === 'tourism' && typ.includes('museum')) || name.includes('museum')) return 'museum';
            if (typ.includes('cinema') || typ.includes('theatre') || name.includes('cinema') || name.includes('theater') || name.includes('theatre') || name.includes('concert')) return 'entertainment';
            return null;
          };
          const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371000;
            const toRad = (v: number) => v * Math.PI / 180;
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return Math.round(R * c);
          };
          const places = (Array.isArray(osmData) ? osmData : []).map((item: any) => {
            const mapped = toCategory(item);
            if (!mapped) return null;
            const plat = parseFloat(item.lat);
            const plng = parseFloat(item.lon);
            const addressObj = item.address || {};
            const city = addressObj.city || addressObj.town || addressObj.village || addressObj.hamlet || addressObj.county || addressObj.state || 'Unknown';
            return {
              fsq_id: item.osm_id ? `osm_${item.osm_id}` : item.place_id ? `osm_place_${item.place_id}` : `osm_${plat}_${plng}`,
              name: item.namedetails?.name || item.display_name?.split(',')[0] || 'Unknown place',
              category: mapped,
              address: item.display_name || 'Address not available',
              city,
              lat: plat,
              lng: plng,
              distance: haversine(lat, lng, plat, plng),
            };
          }).filter((p: any) => p !== null);
          console.log(`OSM fallback returning ${places.length} places`);
          return new Response(
            JSON.stringify({ places }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
        console.error('OSM fallback failed:', e);
      }
      return new Response(
        JSON.stringify({ 
          error: `Foursquare API returned ${response.status}: ${response.statusText}. Please check your API key.`,
          places: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`Foursquare returned ${data.results?.length || 0} results`);

    // Transform and filter results
    const mapToAllowedCategory = (categories: any[] | undefined): string | null => {
      if (!categories || !Array.isArray(categories)) return null;
      for (const c of categories) {
        const id = String(c.id ?? '');
        const name = String(c.name ?? '').toLowerCase();
        // Prefer name-based matching to avoid taxonomy drift
        if (name.includes('restaurant') || name.includes('food')) return 'restaurant';
        if (name.includes('bar') || name.includes('pub') || name.includes('cocktail') || name.includes('wine')) return 'bar';
        if (name.includes('cafe') || name.includes('coffee')) return 'cafe';
        if (name.includes('bakery') || name.includes('patisserie') || name.includes('bake')) return 'bakery';
        if (name.includes('hotel') || name.includes('hostel') || name.includes('bed & breakfast')) return 'hotel';
        if (name.includes('museum')) return 'museum';
        if (name.includes('movie') || name.includes('cinema') || name.includes('theater') || name.includes('theatre') || name.includes('concert') || name.includes('stadium') || name.includes('arts & entertainment') || name.includes('arcade')) return 'entertainment';
        // Fallback to id mapping if name didn't match
        if (categoryMapping[id]) return categoryMapping[id];
      }
      return null;
    };

    const places = (data.results || [])
      .map((place: any) => {
        const mappedCategory = mapToAllowedCategory(place.categories);
        if (!mappedCategory) {
          console.log(`Skipping place ${place.name} - no allowed category match`);
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
    // As a last resort, try OSM fallback as well
    try {
      const deltaLat = 0.009; // ~1km
      const deltaLng = 0.009 / Math.cos((lat * Math.PI) / 180);
      const left = (lng - deltaLng).toFixed(6);
      const right = (lng + deltaLng).toFixed(6);
      const top = (lat + deltaLat).toFixed(6);
      const bottom = (lat - deltaLat).toFixed(6);
      const q = query ? encodeURIComponent(query) : encodeURIComponent('restaurant|cafe|bar|bakery|hotel|museum|cinema|theatre');
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&namedetails=1&addressdetails=1&limit=${limit}&viewbox=${left},${top},${right},${bottom}&bounded=1&q=${q}`;
      const osmRes = await fetch(nominatimUrl, { headers: { 'Accept': 'application/json', 'User-Agent': 'SpottApp/1.0 (contact: support@spott.app)' }});
      if (osmRes.ok) {
        const osmData = await osmRes.json();
        const toCategory = (item: any): string | null => {
          const cls = String(item.class || '').toLowerCase();
          const typ = String(item.type || '').toLowerCase();
          const name = String(item.namedetails?.name || item.display_name || '').toLowerCase();
          if (typ.includes('restaurant') || name.includes('restaurant') || name.includes('food')) return 'restaurant';
          if (typ.includes('bar') || typ.includes('pub') || typ.includes('nightclub') || name.includes('bar') || name.includes('pub') || name.includes('cocktail') || name.includes('wine')) return 'bar';
          if (typ.includes('cafe') || name.includes('cafe') || name.includes('coffee')) return 'cafe';
          if (typ.includes('bakery') || name.includes('bakery') || name.includes('patisserie') || name.includes('bake')) return 'bakery';
          if ((cls === 'tourism' && (typ.includes('hotel') || typ.includes('hostel') || typ.includes('guest_house'))) || name.includes('hotel') || name.includes('hostel')) return 'hotel';
          if ((cls === 'tourism' && typ.includes('museum')) || name.includes('museum')) return 'museum';
          if (typ.includes('cinema') || typ.includes('theatre') || name.includes('cinema') || name.includes('theater') || name.includes('theatre') || name.includes('concert')) return 'entertainment';
          return null;
        };
        const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371000;
          const toRad = (v: number) => v * Math.PI / 180;
          const dLat = toRad(lat2 - lat1);
          const dLon = toRad(lon2 - lon1);
          const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return Math.round(R * c);
        };
        const places = (Array.isArray(osmData) ? osmData : []).map((item: any) => {
          const mapped = toCategory(item);
          if (!mapped) return null;
          const plat = parseFloat(item.lat);
          const plng = parseFloat(item.lon);
          const addressObj = item.address || {};
          const city = addressObj.city || addressObj.town || addressObj.village || addressObj.hamlet || addressObj.county || addressObj.state || 'Unknown';
          return {
            fsq_id: item.osm_id ? `osm_${item.osm_id}` : item.place_id ? `osm_place_${item.place_id}` : `osm_${plat}_${plng}`,
            name: item.namedetails?.name || item.display_name?.split(',')[0] || 'Unknown place',
            category: mapped,
            address: item.display_name || 'Address not available',
            city,
            lat: plat,
            lng: plng,
            distance: haversine(lat, lng, plat, plng),
          };
        }).filter((p: any) => p !== null);
        console.log(`OSM fallback returning ${places.length} places`);
        return new Response(
          JSON.stringify({ places }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (e) {
      console.error('OSM fallback failed in catch:', e);
    }
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to search places' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
