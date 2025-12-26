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

/**
 * Search for nearby places by category using Overpass API
 */
export async function searchNearbyByCategory(
  category: AllowedCategory,
  userLocation: { lat: number; lng: number },
  radiusMeters: number = 5000
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

  console.log('[searchNearbyByCategory] Using OSM tags:', tags);

  try {
    // Build Overpass query - simplified and more robust
    const tagQueries = tags.map(tag => {
      const [key, value] = tag.split('=');
      return `
        nwr["${key}"="${value}"]["name"](around:${radiusMeters},${userLocation.lat},${userLocation.lng});`;
    }).join('');

    const overpassQuery = `
      [out:json][timeout:25];
      (${tagQueries}
      );
      out center body 30;
    `;

    console.log('[searchNearbyByCategory] Overpass query:', overpassQuery.substring(0, 200) + '...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('[searchNearbyByCategory] Response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.warn('[searchNearbyByCategory] API error:', response.status, text.substring(0, 200));
      return [];
    }

    const data = await response.json();
    console.log('[searchNearbyByCategory] Elements received:', data.elements?.length || 0);
    
    const results: NearbySearchResult[] = [];

    if (!data.elements || !Array.isArray(data.elements)) {
      console.log('[searchNearbyByCategory] No elements in response');
      return [];
    }

    for (const element of data.elements) {
      const tags = element.tags || {};
      if (!tags.name) continue;

      // Get coordinates (ways have center, nodes have lat/lon directly)
      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;

      if (!lat || !lng) continue;

      const city = tags['addr:city'] || tags['addr:suburb'] || '';
      const street = tags['addr:street'] || '';
      const houseNumber = tags['addr:housenumber'] || '';
      const address = [street, houseNumber].filter(Boolean).join(' ').trim() || city;

      const distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);

      results.push({
        id: `osm-${element.id}`,
        name: tags.name,
        lat,
        lng,
        category,
        city,
        address,
        distance,
      });

      if (results.length >= 20) break;
    }

    // Sort by distance
    results.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    console.log('[searchNearbyByCategory] Final results:', results.length);
    if (results.length > 0) {
      console.log('[searchNearbyByCategory] First result:', results[0]);
    }

    return results;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.log('[searchNearbyByCategory] Timed out');
      return [];
    }
    console.error('[searchNearbyByCategory] Error:', error);
    return [];
  }
}

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
