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

// Map app categories to OSM tags
const categoryToOsmTags: Record<AllowedCategory, string[]> = {
  restaurant: ['amenity=restaurant', 'amenity=fast_food', 'amenity=food_court'],
  cafe: ['amenity=cafe', 'amenity=coffee_shop', 'amenity=ice_cream'],
  bar: ['amenity=bar', 'amenity=pub', 'amenity=biergarten'],
  bakery: ['amenity=bakery'],
  hotel: ['tourism=hotel', 'tourism=hostel', 'tourism=guest_house', 'tourism=motel'],
  museum: ['tourism=museum', 'tourism=gallery', 'amenity=arts_centre'],
  entertainment: ['amenity=nightclub', 'amenity=theatre', 'amenity=cinema', 'leisure=park', 'tourism=theme_park', 'leisure=amusement_arcade'],
};

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
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
 * Search for nearby places by category using Overpass API
 */
export async function searchNearbyByCategory(
  category: AllowedCategory,
  userLocation: { lat: number; lng: number },
  radiusMeters: number = 2000
): Promise<NearbySearchResult[]> {
  console.log('[searchNearbyByCategory] Starting search:', { category, userLocation, radiusMeters });
  
  if (!userLocation || !userLocation.lat || !userLocation.lng) {
    console.warn('[searchNearbyByCategory] No user location provided');
    return [];
  }

  const tags = categoryToOsmTags[category];
  if (!tags || tags.length === 0) {
    console.warn(`[searchNearbyByCategory] Unknown category ${category}`);
    return [];
  }

  // Use only the primary tag for faster query
  const primaryTag = tags[0];
  const [key, value] = primaryTag.split('=');

  // Simplified compact query for speed
  const overpassQuery = `[out:json][timeout:10];node["${key}"="${value}"]["name"](around:${radiusMeters},${userLocation.lat},${userLocation.lng});out 15;`;

  console.log('[searchNearbyByCategory] Query:', overpassQuery);

  // Try multiple Overpass servers for reliability
  const servers = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ];

  for (const server of servers) {
    try {
      console.log('[searchNearbyByCategory] Trying server:', server);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(server, {
        method: 'POST',
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('[searchNearbyByCategory] Server error:', server, response.status);
        continue; // Try next server
      }

      const data = await response.json();
      console.log('[searchNearbyByCategory] Elements received:', data.elements?.length || 0);
      
      if (!data.elements || data.elements.length === 0) {
        continue; // Try next server if no results
      }

      const results: NearbySearchResult[] = [];

      for (const element of data.elements) {
        const elTags = element.tags || {};
        if (!elTags.name) continue;

        const lat = element.lat;
        const lng = element.lon;
        if (!lat || !lng) continue;

        const city = elTags['addr:city'] || elTags['addr:suburb'] || '';
        const street = elTags['addr:street'] || '';
        const houseNumber = elTags['addr:housenumber'] || '';
        const address = [street, houseNumber].filter(Boolean).join(' ').trim() || city;

        const distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);

        results.push({
          id: `osm-${element.id}`,
          name: elTags.name,
          lat,
          lng,
          category,
          city,
          address,
          distance,
        });

        if (results.length >= 15) break;
      }

      results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      console.log('[searchNearbyByCategory] Final results:', results.length);
      
      if (results.length > 0) {
        return results;
      }
    } catch (error: any) {
      console.warn('[searchNearbyByCategory] Server failed:', server, error.message);
      continue; // Try next server
    }
  }

  console.log('[searchNearbyByCategory] All servers failed or no results');
  return [];
}
