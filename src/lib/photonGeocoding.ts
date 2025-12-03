/**
 * Photon API - Free search-as-you-type geocoder built on OpenStreetMap
 * https://photon.komoot.io/
 * Optimized for autocomplete with partial text matching
 * No API key required, fast response times
 */

import type { AllowedCategory } from '@/utils/allowedCategories';

interface PhotonFeature {
  type: 'Feature';
  geometry: {
    coordinates: [number, number]; // [lng, lat]
    type: 'Point';
  };
  properties: {
    osm_id?: number;
    osm_type?: string;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    district?: string;
    locality?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    type?: string;
  };
}

interface PhotonResponse {
  type: 'FeatureCollection';
  features: PhotonFeature[];
}

export interface PhotonResult {
  id: string;
  name: string;
  city: string;
  streetName: string;
  streetNumber: string;
  lat: number;
  lng: number;
  category: AllowedCategory;
  osmKey: string;
  osmValue: string;
  displayAddress: string;
}

// Map OSM key+value combinations to our app categories
function mapOsmToCategory(osmKey?: string, osmValue?: string): AllowedCategory | null {
  if (!osmKey || !osmValue) return null;
  
  const key = osmKey.toLowerCase();
  const value = osmValue.toLowerCase();
  
  // Restaurant mappings
  if (value === 'restaurant' || value === 'fast_food' || value === 'food_court' || value === 'biergarten') {
    return 'restaurant';
  }
  
  // Bar mappings
  if (value === 'bar' || value === 'pub') {
    return 'bar';
  }
  
  // Cafe mappings
  if (value === 'cafe' || value === 'coffee_shop' || value === 'ice_cream') {
    return 'cafe';
  }
  
  // Bakery mappings
  if (value === 'bakery' || value === 'pastry') {
    return 'bakery';
  }
  
  // Hotel mappings
  if (value === 'hotel' || value === 'hostel' || value === 'guest_house' || value === 'motel' || value === 'chalet' || value === 'apartment') {
    return 'hotel';
  }
  
  // Museum mappings
  if (value === 'museum' || value === 'gallery' || value === 'artwork' || value === 'arts_centre') {
    return 'museum';
  }
  
  // Entertainment mappings
  if (value === 'nightclub' || value === 'theatre' || value === 'cinema' || 
      value === 'park' || value === 'playground' || value === 'garden' ||
      value === 'sports_centre' || value === 'stadium' || value === 'water_park' ||
      value === 'amusement_arcade' || value === 'bowling_alley' || value === 'theme_park' ||
      value === 'zoo' || value === 'aquarium' || value === 'attraction' ||
      value === 'miniature_golf' || value === 'dance' || value === 'music_venue') {
    return 'entertainment';
  }
  
  // Tourism attractions default to entertainment
  if (key === 'tourism' && (value === 'attraction' || value === 'viewpoint' || value === 'theme_park')) {
    return 'entertainment';
  }
  
  // Leisure venues default to entertainment
  if (key === 'leisure') {
    return 'entertainment';
  }
  
  return null;
}

// Check if OSM type is allowed for our app
function isAllowedType(osmKey?: string, osmValue?: string): boolean {
  return mapOsmToCategory(osmKey, osmValue) !== null;
}

export async function searchPhoton(
  query: string,
  userLocation?: { lat: number; lng: number },
  limit: number = 20
): Promise<PhotonResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query.trim(),
      limit: String(limit),
      lang: 'en',
    });

    // Bias results towards user location
    if (userLocation) {
      params.append('lat', String(userLocation.lat));
      params.append('lon', String(userLocation.lng));
    }

    const response = await fetch(`https://photon.komoot.io/api/?${params}`);
    
    if (!response.ok) {
      console.error('Photon API error:', response.status);
      return [];
    }

    const data: PhotonResponse = await response.json();
    
    if (!data.features || !Array.isArray(data.features)) {
      return [];
    }

    const results: PhotonResult[] = [];
    const normalizedQuery = query.toLowerCase().trim();

    for (const feature of data.features) {
      const props = feature.properties;
      const [lng, lat] = feature.geometry.coordinates;
      
      // Skip if no name
      if (!props.name) continue;
      
      // Filter by allowed types
      if (!isAllowedType(props.osm_key, props.osm_value)) continue;
      
      // Check if name contains query (case insensitive)
      const normalizedName = props.name.toLowerCase();
      if (!normalizedName.includes(normalizedQuery)) continue;
      
      // Better city extraction - prioritize actual city/town/village over neighborhoods/districts
      // props.district and props.locality are often neighborhoods (e.g., "Ranelagh", "Dundrum")
      // props.city, props.town, props.village are actual place names
      const city = props.city || props.town || props.village || props.county || props.state || '';
      const streetName = props.street || '';
      const streetNumber = props.housenumber || '';
      
      // Create display address: City, Street, Number
      const addressParts = [city, streetName, streetNumber].filter(Boolean);
      const displayAddress = addressParts.join(', ');

      // Get properly mapped category
      const category = mapOsmToCategory(props.osm_key, props.osm_value) || 'restaurant';
      
      results.push({
        id: `photon-${props.osm_id || `${lat}-${lng}`}`,
        name: props.name,
        city,
        streetName,
        streetNumber,
        lat,
        lng,
        category,
        osmKey: props.osm_key || '',
        osmValue: props.osm_value || '',
        displayAddress,
      });
    }

    // Sort by distance if user location provided
    if (userLocation) {
      results.sort((a, b) => {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distA - distB;
      });
    }

    return results;
  } catch (error) {
    console.error('Photon search error:', error);
    return [];
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export { calculateDistance };
