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
  radiusMeters: number = 3000
): Promise<NearbySearchResult[]> {
  if (!userLocation) {
    console.warn('searchNearbyByCategory: No user location provided');
    return [];
  }

  const tags = categoryToOsmTags[category];
  if (!tags || tags.length === 0) {
    console.warn(`searchNearbyByCategory: Unknown category ${category}`);
    return [];
  }

  try {
    // Build Overpass query for the category
    const tagQueries = tags.map(tag => {
      const [key, value] = tag.split('=');
      return `node["${key}"="${value}"](around:${radiusMeters},${userLocation.lat},${userLocation.lng});
              way["${key}"="${value}"](around:${radiusMeters},${userLocation.lat},${userLocation.lng});`;
    }).join('\n');

    const overpassQuery = `
      [out:json][timeout:15];
      (
        ${tagQueries}
      );
      out center body;
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('Overpass API error:', response.status);
      return [];
    }

    const data = await response.json();
    const results: NearbySearchResult[] = [];

    if (!data.elements || !Array.isArray(data.elements)) {
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

    return results;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.log('Nearby search timed out');
      return [];
    }
    console.error('Nearby search error:', error);
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
