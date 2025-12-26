/**
 * Nearby Category Search using Overpass API (OpenStreetMap)
 * Searches for places by category near user location
 */

import type { AllowedCategory } from '@/utils/allowedCategories';

export interface NearbySearchResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: AllowedCategory;
  city: string;
  address: string;
  distance?: number;
}

// Extended prompt type that includes subcategories
export type NearbyPrompt = AllowedCategory | 'pizzeria' | 'sushi' | 'burger' | 'gelato' | 'cocktail';

// Map prompts to OSM query parts - search nodes AND ways for better coverage
const promptToOsmQuery: Record<NearbyPrompt, string> = {
  // Main categories - include multiple tags for better results
  restaurant: '["amenity"~"restaurant|fast_food"]',
  cafe: '["amenity"~"cafe|coffee_shop"]',
  bar: '["amenity"~"bar|pub|biergarten"]',
  bakery: '["shop"="bakery"]',
  hotel: '["tourism"~"hotel|hostel|guest_house|motel"]',
  museum: '["tourism"~"museum|gallery"]["name"]',
  entertainment: '["amenity"~"nightclub|cinema|theatre"]',
  // Subcategories - cuisine-specific
  pizzeria: '["cuisine"~"pizza",i]',
  sushi: '["cuisine"~"sushi|japanese",i]',
  burger: '["cuisine"~"burger|american",i]',
  gelato: '["amenity"~"ice_cream|cafe"]["cuisine"~"ice_cream|gelato",i]',
  cocktail: '["amenity"~"bar|cocktail_bar"]',
};

// Map subcategories to parent categories
export const promptToCategory: Record<NearbyPrompt, AllowedCategory> = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  bar: 'bar',
  bakery: 'bakery',
  hotel: 'hotel',
  museum: 'museum',
  entertainment: 'entertainment',
  pizzeria: 'restaurant',
  sushi: 'restaurant',
  burger: 'restaurant',
  gelato: 'cafe',
  cocktail: 'bar',
};

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Search for nearby places by prompt using Overpass API
 */
export async function searchNearbyByCategory(
  prompt: NearbyPrompt,
  userLocation: { lat: number; lng: number },
  radiusMeters: number = 2000
): Promise<NearbySearchResult[]> {
  console.log('[Nearby] Search:', prompt, userLocation);
  
  if (!userLocation?.lat || !userLocation?.lng) {
    console.warn('[Nearby] No location');
    return [];
  }

  const queryPart = promptToOsmQuery[prompt];
  if (!queryPart) {
    console.warn('[Nearby] Unknown prompt:', prompt);
    return [];
  }

  const category = promptToCategory[prompt];
  
  // Search both nodes and ways for better coverage, increase radius
  const searchRadius = radiusMeters < 3000 ? 3000 : radiusMeters;
  const query = `[out:json][timeout:10];(node${queryPart}["name"](around:${searchRadius},${userLocation.lat},${userLocation.lng});way${queryPart}["name"](around:${searchRadius},${userLocation.lat},${userLocation.lng}););out center 15;`;

  console.log('[Nearby] Query:', query);

  // Fast servers first
  const servers = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass-api.de/api/interpreter',
  ];

  for (const server of servers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(server, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const data = await response.json();
      console.log('[Nearby] Elements:', data.elements?.length || 0);
      
      if (!data.elements?.length) continue;

      const results: NearbySearchResult[] = [];

      for (const el of data.elements) {
        // Handle both nodes and ways (ways have center property)
        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        if (!el.tags?.name || !lat || !lon) continue;

        const tags = el.tags;
        const city = tags['addr:city'] || tags['addr:suburb'] || '';
        const street = tags['addr:street'] || '';
        const houseNumber = tags['addr:housenumber'] || '';
        const address = [street, houseNumber].filter(Boolean).join(' ').trim() || city;

        results.push({
          id: `osm-${el.id}`,
          name: tags.name,
          lat,
          lng: lon,
          category,
          city,
          address,
          distance: calculateDistance(userLocation.lat, userLocation.lng, lat, lon),
        });

        if (results.length >= 15) break;
      }

      results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      
      if (results.length > 0) {
        console.log('[Nearby] Found:', results.length);
        return results;
      }
    } catch (e: any) {
      console.warn('[Nearby] Server failed:', server, e.message);
    }
  }

  console.log('[Nearby] No results');
  return [];
}
