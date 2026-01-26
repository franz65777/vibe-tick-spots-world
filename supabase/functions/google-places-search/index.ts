/**
 * Google Places Text Search (ID Only) - Edge Function
 * 
 * Uses fieldMask to get only id + displayName = UNLIMITED FREE SEARCHES
 * Place Details Essentials = 10,000 free/month
 * 
 * This keeps API costs at $0 for normal usage
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PlacePrediction {
  place_id: string;
  name: string;
  formatted_address?: string;
  types?: string[];
}

interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

// Map Google place types to our categories
function mapGoogleTypeToCategory(types: string[]): string {
  const typeMapping: Record<string, string> = {
    restaurant: 'restaurant',
    food: 'restaurant',
    meal_takeaway: 'restaurant',
    meal_delivery: 'restaurant',
    bar: 'bar',
    night_club: 'bar',
    cafe: 'cafe',
    coffee_shop: 'cafe',
    bakery: 'cafe',
    hotel: 'hotel',
    lodging: 'hotel',
    resort: 'hotel',
    motel: 'hotel',
    museum: 'culture',
    art_gallery: 'culture',
    tourist_attraction: 'culture',
    movie_theater: 'culture',
    theater: 'culture',
    park: 'nature',
    natural_feature: 'nature',
    campground: 'nature',
    zoo: 'nature',
    aquarium: 'nature',
    shopping_mall: 'shopping',
    store: 'shopping',
    clothing_store: 'shopping',
    shoe_store: 'shopping',
    electronics_store: 'shopping',
    spa: 'wellness',
    gym: 'wellness',
    health: 'wellness',
    beauty_salon: 'wellness',
  };

  for (const type of types) {
    if (typeMapping[type]) {
      return typeMapping[type];
    }
  }
  return 'place';
}

// Extract city from address components
function extractCity(addressComponents?: Array<{ long_name: string; types: string[] }>): string {
  if (!addressComponents) return '';
  
  for (const component of addressComponents) {
    if (component.types.includes('locality')) {
      return component.long_name;
    }
  }
  for (const component of addressComponents) {
    if (component.types.includes('administrative_area_level_3')) {
      return component.long_name;
    }
  }
  for (const component of addressComponents) {
    if (component.types.includes('administrative_area_level_2')) {
      return component.long_name;
    }
  }
  return '';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userLat, userLng, action, placeId } = await req.json();
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!googleApiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTION 1: Text Search with ID Only (FREE UNLIMITED)
    if (action === 'search' && query) {
      console.log(`🔍 Text Search (ID Only): "${query}"`);
      
      // Build the request for Places API (New)
      const searchBody: any = {
        textQuery: query,
        maxResultCount: 10,
      };

      // Add location bias if provided
      if (userLat && userLng) {
        searchBody.locationBias = {
          circle: {
            center: { latitude: userLat, longitude: userLng },
            radius: 50000.0 // 50km radius
          }
        };
      }

      const searchResponse = await fetch(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleApiKey,
            // ID Only field mask = FREE UNLIMITED
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types',
          },
          body: JSON.stringify(searchBody),
        }
      );

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('Google Places API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Search failed', results: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const searchData = await searchResponse.json();
      const places = searchData.places || [];

      const results: PlacePrediction[] = places.map((place: any) => ({
        place_id: place.id,
        name: place.displayName?.text || '',
        formatted_address: place.formattedAddress || '',
        types: place.types || [],
      }));

      console.log(`✅ Found ${results.length} places`);
      
      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTION 2: Get Place Details (10,000 FREE/month with Essentials)
    if (action === 'details' && placeId) {
      console.log(`📍 Getting details for: ${placeId}`);

      const detailsResponse = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleApiKey,
            // Essentials field mask - 10k free/month
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,types,addressComponents',
          },
        }
      );

      if (!detailsResponse.ok) {
        const errorText = await detailsResponse.text();
        console.error('Google Place Details error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Details fetch failed', details: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const place = await detailsResponse.json();
      
      const details: PlaceDetails = {
        place_id: place.id,
        name: place.displayName?.text || '',
        formatted_address: place.formattedAddress || '',
        geometry: {
          location: {
            lat: place.location?.latitude || 0,
            lng: place.location?.longitude || 0,
          },
        },
        types: place.types || [],
        address_components: place.addressComponents?.map((c: any) => ({
          long_name: c.longText || '',
          short_name: c.shortText || '',
          types: c.types || [],
        })),
      };

      const city = extractCity(details.address_components);
      const category = mapGoogleTypeToCategory(details.types || []);

      console.log(`✅ Got details: ${details.name} in ${city}`);

      return new Response(
        JSON.stringify({ 
          details: {
            ...details,
            city,
            category,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action', results: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message, results: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
