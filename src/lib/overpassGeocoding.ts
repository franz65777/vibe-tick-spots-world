/**
 * Overpass API - Direct OpenStreetMap queries for POIs
 * Completely FREE with no API key required
 * Excellent for finding specific establishment types
 * https://wiki.openstreetmap.org/wiki/Overpass_API
 */

import type { AllowedCategory } from '@/utils/allowedCategories';

export interface OverpassResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: AllowedCategory;
  city: string;
  address: string;
}

// Map OSM tags to our app categories
function getOsmTagsForSearch(): string {
  return `
    node["amenity"="restaurant"];
    node["amenity"="cafe"];
    node["amenity"="bar"];
    node["amenity"="pub"];
    node["amenity"="bakery"];
    node["tourism"="hotel"];
    node["tourism"="hostel"];
    node["tourism"="guest_house"];
    node["tourism"="museum"];
    node["amenity"="nightclub"];
    node["amenity"="theatre"];
    node["amenity"="cinema"];
    node["leisure"="park"];
    way["amenity"="restaurant"];
    way["amenity"="cafe"];
    way["amenity"="bar"];
    way["tourism"="hotel"];
    way["tourism"="museum"];
  `;
}

function mapOsmTagToCategory(tags: Record<string, string>): AllowedCategory {
  const amenity = tags.amenity?.toLowerCase();
  const tourism = tags.tourism?.toLowerCase();
  const leisure = tags.leisure?.toLowerCase();

  if (amenity === 'restaurant' || amenity === 'fast_food') return 'restaurant';
  if (amenity === 'cafe' || amenity === 'ice_cream') return 'cafe';
  if (amenity === 'bar' || amenity === 'pub') return 'bar';
  if (amenity === 'bakery') return 'bakery';
  if (tourism === 'hotel' || tourism === 'hostel' || tourism === 'guest_house' || tourism === 'motel') return 'hotel';
  if (tourism === 'museum' || amenity === 'arts_centre') return 'museum';
  if (amenity === 'nightclub' || amenity === 'theatre' || amenity === 'cinema' || leisure === 'park') return 'entertainment';
  
  return 'restaurant'; // Default fallback
}

/**
 * Search for POIs near a location using Overpass API
 * This finds establishments that may not appear in Nominatim text search
 */
export async function searchOverpass(
  query: string,
  userLocation?: { lat: number; lng: number },
  radiusKm: number = 10
): Promise<OverpassResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  // If no user location, we can't do a geographic search
  if (!userLocation) {
    return [];
  }

  const queryLower = query.toLowerCase().trim();
  const radiusMeters = radiusKm * 1000;

  try {
    // Build Overpass query - search for POIs by name within radius
    const overpassQuery = `
      [out:json][timeout:10];
      (
        node["name"~"${escapeRegex(queryLower)}", i](around:${radiusMeters},${userLocation.lat},${userLocation.lng})["amenity"~"restaurant|cafe|bar|pub|bakery|nightclub|theatre|cinema"];
        node["name"~"${escapeRegex(queryLower)}", i](around:${radiusMeters},${userLocation.lat},${userLocation.lng})["tourism"~"hotel|hostel|guest_house|museum"];
        node["name"~"${escapeRegex(queryLower)}", i](around:${radiusMeters},${userLocation.lat},${userLocation.lng})["leisure"="park"];
        way["name"~"${escapeRegex(queryLower)}", i](around:${radiusMeters},${userLocation.lat},${userLocation.lng})["amenity"~"restaurant|cafe|bar|pub"];
        way["name"~"${escapeRegex(queryLower)}", i](around:${radiusMeters},${userLocation.lat},${userLocation.lng})["tourism"~"hotel|museum"];
      );
      out center body;
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

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
    const results: OverpassResult[] = [];

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

      const category = mapOsmTagToCategory(tags);
      const city = tags['addr:city'] || tags['addr:suburb'] || '';
      const street = tags['addr:street'] || '';
      const houseNumber = tags['addr:housenumber'] || '';
      const address = [city, street, houseNumber].filter(Boolean).join(', ');

      results.push({
        id: `overpass-${element.id}`,
        name: tags.name,
        lat,
        lng,
        category,
        city,
        address,
      });

      if (results.length >= 15) break;
    }

    // Sort by distance from user
    if (results.length > 0) {
      results.sort((a, b) => {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distA - distB;
      });
    }

    return results;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.log('Overpass search timed out');
      return [];
    }
    console.error('Overpass search error:', error);
    return [];
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
