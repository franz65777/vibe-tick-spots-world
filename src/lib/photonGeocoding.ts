/**
 * Photon API - Free search-as-you-type geocoder built on OpenStreetMap
 * https://photon.komoot.io/
 * Optimized for autocomplete with partial text matching
 * No API key required, fast response times
 */

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
  type: string;
  osmKey: string;
  osmValue: string;
  displayAddress: string;
}

// Allowed OSM keys/values for our app categories
const ALLOWED_OSM_TYPES: Record<string, string[]> = {
  amenity: ['restaurant', 'bar', 'cafe', 'pub', 'fast_food', 'nightclub', 'bakery', 'ice_cream', 'biergarten', 'food_court'],
  tourism: ['hotel', 'hostel', 'guest_house', 'motel', 'museum', 'gallery', 'attraction', 'viewpoint', 'theme_park', 'zoo', 'aquarium'],
  leisure: ['park', 'playground', 'garden', 'sports_centre', 'stadium', 'water_park', 'amusement_arcade', 'bowling_alley', 'miniature_golf'],
  shop: ['bakery', 'pastry'],
};

function isAllowedType(osmKey?: string, osmValue?: string): boolean {
  if (!osmKey || !osmValue) return true; // Allow if type unknown
  const key = osmKey.toLowerCase();
  const value = osmValue.toLowerCase();
  
  const allowedValues = ALLOWED_OSM_TYPES[key];
  if (allowedValues) {
    return allowedValues.includes(value);
  }
  
  // Allow places that are commonly POIs
  if (key === 'place' || key === 'building') return true;
  
  return false;
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
      
      const city = props.city || props.state || '';
      const streetName = props.street || '';
      const streetNumber = props.housenumber || '';
      
      // Create display address: City, Street, Number
      const addressParts = [city, streetName, streetNumber].filter(Boolean);
      const displayAddress = addressParts.join(', ');

      results.push({
        id: `photon-${props.osm_id || `${lat}-${lng}`}`,
        name: props.name,
        city,
        streetName,
        streetNumber,
        lat,
        lng,
        type: props.osm_value || props.type || 'place',
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
