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

    const reqData = await req.json();
    const lat = reqData?.lat;
    const lng = reqData?.lng;
    const query = reqData?.query;
    let limit = typeof reqData?.limit === 'number' ? reqData.limit : 10;
    const fast: boolean = Boolean(reqData?.fast);
    const providedRadiusKm = typeof reqData?.radiusKm === 'number' 
      ? Math.max(0.2, Math.min(2.0, reqData.radiusKm)) 
      : (fast ? 0.6 : 1.0);

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ultra-fast mode: skip Foursquare and use OSM directly with tight radius
    if (fast) {
      try {
        const radiusKm = providedRadiusKm;
        const dy = radiusKm / 111;
        const dx = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
        const left = lng - dx;
        const right = lng + dx;
        const top = lat + dy;
        const bottom = lat - dy;

        const queries = query ? [query] : ['restaurant', 'cafe', 'bar'];

        const fetchPromises = queries.map(async (searchTerm) => {
          const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&namedetails=1&addressdetails=1&limit=${Math.max(6, limit)}&bounded=1&viewbox=${left},${top},${right},${bottom}&q=${encodeURIComponent(searchTerm)}`;
          try {
            const osmRes = await fetch(nominatimUrl, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'SpottApp/1.0 (contact: support@spott.app)'
              }
            });
            if (osmRes.ok) {
              const osmData = await osmRes.json();
              return Array.isArray(osmData) ? osmData : [];
            }
          } catch (_) {}
          return [];
        });

        const results = await Promise.all(fetchPromises);
        const allResults = results.flat();

        const toCategory = (item: any): string => {
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
          return 'restaurant';
        };

        const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371000; const toRad = (v: number) => v * Math.PI / 180;
          const dLat = toRad(lat2 - lat1); const dLon = toRad(lon2 - lon1);
          const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return Math.round(R * c);
        };

        const levenshtein = (a: string, b: string) => {
          a = a.toLowerCase(); b = b.toLowerCase();
          const m = a.length, n = b.length; const dp: number[] = Array(n + 1).fill(0);
          for (let j = 0; j <= n; j++) dp[j] = j;
          for (let i = 1; i <= m; i++) { let prev = i - 1; dp[0] = i; for (let j = 1; j <= n; j++) { const temp = dp[j]; dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = temp; } }
          return dp[n];
        };
        const similarity = (name: string, q: string) => {
          if (!q) return 0; const dist = levenshtein(name, q);
          const maxLen = Math.max(name.length, q.length) || 1; const score = 1 - dist / maxLen;
          const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
          const containsBonus = tokens.every(t => name.toLowerCase().includes(t)) ? 0.15 : 0;
          return Math.max(0, Math.min(1, score + containsBonus));
        };

        let places = allResults.map((item: any) => {
          const mapped = toCategory(item);
          const plat = parseFloat(item.lat); const plng = parseFloat(item.lon);
          const distance = haversine(lat, lng, plat, plng);
          if (isNaN(plat) || isNaN(plng) || distance > Math.round(providedRadiusKm * 1000)) return null;
          const addressObj = item.address || {};
          const city = addressObj.city || addressObj.town || addressObj.village || addressObj.hamlet || addressObj.county || addressObj.state || 'Unknown';
          const addressParts: string[] = [];
          if (addressObj.road) { let streetPart = addressObj.road; if (addressObj.house_number) streetPart = `${addressObj.road} ${addressObj.house_number}`; addressParts.push(streetPart); }
          if (city && city !== 'Unknown') addressParts.push(city);
          const formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : item.display_name || 'Address not available';
          const name = item.namedetails?.name || item.display_name?.split(',')[0] || 'Unknown place';
          return { fsq_id: item.osm_id ? `osm_${item.osm_id}` : item.place_id ? `osm_place_${item.place_id}` : `osm_${plat}_${plng}`, name, category: mapped, address: formattedAddress, city, lat: plat, lng: plng, distance, _nameScore: query ? similarity(name, query) : 0 } as any;
        }).filter((p: any) => p !== null);

        const seen = new Set<string>();
        places = places.filter((p: any) => { const key = `${p.name.toLowerCase()}_${p.city.toLowerCase()}`; if (seen.has(key)) return false; seen.add(key); return true; });

        places.sort((a: any, b: any) => { if (query && b._nameScore !== a._nameScore) return b._nameScore - a._nameScore; return a.distance - b.distance; });

        places = places.slice(0, limit).map((p: any) => ({ fsq_id: p.fsq_id, name: p.name, category: p.category, address: p.address, city: p.city, lat: p.lat, lng: p.lng, distance: p.distance }));

        return new Response(JSON.stringify({ places }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e) {
        console.error('Fast OSM path failed:', e);
      }
    }

    console.log(`Searching Foursquare: lat=${lat}, lng=${lng}, query=${query}, limit=${limit}`);

    // Build Foursquare API request
    const params = new URLSearchParams({
      ll: `${lat},${lng}`,
      radius: String(Math.round(providedRadiusKm * 1000)),
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
      console.log('Using OSM fallback for nearby search');
      try {
        // Search in a tight radius for faster, more relevant results
        const radiusKm = providedRadiusKm;
        const dy = radiusKm / 111; // approx degrees latitude per km
        const dx = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
        const left = lng - dx;
        const right = lng + dx;
        const top = lat + dy;
        const bottom = lat - dy;

        const queries = query ? [query] : ['restaurant', 'cafe', 'bar', 'bakery', 'hotel', 'museum'];
        
        // Fetch all queries in parallel for maximum speed
        const fetchPromises = queries.map(async (searchTerm) => {
          const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&namedetails=1&addressdetails=1&limit=12&bounded=1&viewbox=${left},${top},${right},${bottom}&q=${encodeURIComponent(searchTerm)}`;
          console.log(`Searching OSM for: ${searchTerm}`);
          try {
            const osmRes = await fetch(nominatimUrl, { 
              headers: { 
                'Accept': 'application/json', 
                'User-Agent': 'SpottApp/1.0 (contact: support@spott.app)'
              }
            });
            if (osmRes.ok) {
              const osmData = await osmRes.json();
              return Array.isArray(osmData) ? osmData : [];
            }
          } catch (e) {
            console.error(`OSM fetch failed for ${searchTerm}:`, e);
          }
          return [];
        });
        
        const results = await Promise.all(fetchPromises);
        const allResults = results.flat();
        
        console.log(`OSM returned ${allResults.length} total results`);
        
        const toCategory = (item: any): string => {
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
          // Fallback to restaurant so we never drop otherwise good results
          return 'restaurant';
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
        
        // Simple typo-tolerant similarity using Levenshtein distance
        const levenshtein = (a: string, b: string) => {
          a = a.toLowerCase();
          b = b.toLowerCase();
          const m = a.length, n = b.length;
          const dp: number[] = Array(n + 1).fill(0);
          for (let j = 0; j <= n; j++) dp[j] = j;
          for (let i = 1; i <= m; i++) {
            let prev = i - 1;
            dp[0] = i;
            for (let j = 1; j <= n; j++) {
              const temp = dp[j];
              dp[j] = Math.min(
                dp[j] + 1, // deletion
                dp[j - 1] + 1, // insertion
                prev + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
              );
              prev = temp;
            }
          }
          return dp[n];
        };
        const similarity = (name: string, q: string) => {
          if (!q) return 0;
          const dist = levenshtein(name, q);
          const maxLen = Math.max(name.length, q.length) || 1;
          const score = 1 - dist / maxLen;
          // Bonus if query tokens are contained directly
          const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
          const containsBonus = tokens.every(t => name.toLowerCase().includes(t)) ? 0.15 : 0;
          return Math.max(0, Math.min(1, score + containsBonus));
        };
        // Map raw OSM results to our shape and rank by proximity and name similarity (if query provided)
        let places = allResults.map((item: any) => {
          const mapped = toCategory(item);
          const plat = parseFloat(item.lat);
          const plng = parseFloat(item.lon);
          const distance = haversine(lat, lng, plat, plng);
          
          // Filter by distance (1km radius for faster results)
          if (isNaN(plat) || isNaN(plng) || distance > 1000) return null;
          
          const addressObj = item.address || {};
          const city = addressObj.city || addressObj.town || addressObj.village || addressObj.hamlet || addressObj.county || addressObj.state || 'Unknown';
          
          // Build formatted address: "Street Name Number, City"
          const addressParts: string[] = [];
          if (addressObj.road) {
            let streetPart = addressObj.road;
            if (addressObj.house_number) {
              streetPart = `${addressObj.road} ${addressObj.house_number}`;
            }
            addressParts.push(streetPart);
          }
          if (city && city !== 'Unknown') {
            addressParts.push(city);
          }
          const formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : item.display_name || 'Address not available';
          
          const name = item.namedetails?.name || item.display_name?.split(',')[0] || 'Unknown place';
          return {
            fsq_id: item.osm_id ? `osm_${item.osm_id}` : item.place_id ? `osm_place_${item.place_id}` : `osm_${plat}_${plng}`,
            name,
            category: mapped,
            address: formattedAddress,
            city,
            lat: plat,
            lng: plng,
            distance,
            _nameScore: query ? similarity(name, query) : 0,
          } as any;
        }).filter((p: any) => p !== null);
        
        // De-duplicate by name+city
        const seen = new Set<string>();
        places = places.filter((p: any) => {
          const key = `${p.name.toLowerCase()}_${p.city.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        
        // Sort by similarity (desc) then distance (asc) when searching, otherwise by distance only
        places.sort((a: any, b: any) => {
          if (query) {
            if (b._nameScore !== a._nameScore) return b._nameScore - a._nameScore;
          }
          return a.distance - b.distance;
        });
        
        // Trim to requested limit and remove private fields
        places = places.slice(0, limit).map((p: any) => ({
          fsq_id: p.fsq_id,
          name: p.name,
          category: p.category,
          address: p.address,
          city: p.city,
          lat: p.lat,
          lng: p.lng,
          distance: p.distance,
        }));
        
        console.log(`OSM fallback returning ${places.length} places`);
        return new Response(
          JSON.stringify({ places }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to search places',
        places: []
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
