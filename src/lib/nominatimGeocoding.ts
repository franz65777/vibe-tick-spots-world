/**
 * FREE Geocoding using OpenStreetMap Nominatim
 * No API key required, completely free
 * Rate limit: ~1 request/second (respectful usage)
 */

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  name?: string; // POI name when available
  display_name: string;
  type?: string;
  class?: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    borough?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
    road?: string;
    street?: string;
    pedestrian?: string;
    house_number?: string;
  };
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  city: string;
  address: string;
  displayName: string;
  name?: string; // Clean POI name (without address)
  type?: string;
  class?: string;
  // Structured address components for accurate display
  streetName?: string;
  streetNumber?: string;
}

class NominatimGeocoding {
  private baseUrl = 'https://nominatim.openstreetmap.org';
  private lastRequestTime = 0;
  private minRequestInterval = 1000; // 1 second between requests

  /**
   * Enforce rate limiting
   */
  private async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Forward geocoding: Search for a place by name
   * FREE - No API key needed
   * Optionally accepts user location to prioritize nearby results
   */
  async searchPlace(
    query: string, 
    language?: string,
    userLocation?: { lat: number; lng: number },
    options?: { skipViewbox?: boolean }
  ): Promise<GeocodeResult[]> {
    await this.rateLimit();

    try {
      // Use wildcard suffix for partial matching - Nominatim supports this
      const searchQuery = query.endsWith('*') ? query : `${query}*`;
      
      const params = new URLSearchParams({
        q: searchQuery,
        format: 'json',
        addressdetails: '1',
        limit: '50', // Increased significantly for better partial matching
        'accept-language': language || 'en',
      });

      // Add viewbox parameter if user location is provided AND not skipped
      // DO NOT use bounded=1 as it restricts results too much
      if (userLocation && !options?.skipViewbox) {
        // Create a bounding box around user location (~100km radius for bias, not restriction)
        const latDelta = 1.0; // ~100km
        const lngDelta = 1.0;
        const viewbox = [
          userLocation.lng - lngDelta,
          userLocation.lat + latDelta,
          userLocation.lng + lngDelta,
          userLocation.lat - latDelta
        ].join(',');
        params.append('viewbox', viewbox);
        // Don't use bounded=1 - allow results outside viewbox but prefer nearby
      }

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          'User-Agent': 'SpottApp/1.0', // Nominatim requires a user agent
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim error: ${response.status}`);
      }

      const results: NominatimResult[] = await response.json();

      let geocodeResults = results.map(result => {
        // Extract structured address components
        const streetName = result.address.road || result.address.street || result.address.pedestrian || '';
        const streetNumber = result.address.house_number || '';
        
        // Get the parent city - prioritize city > town > village
        // This ensures suburbs/municipalities get their parent city
        const city = result.address.city || result.address.town || result.address.village || '';
        
        // Use the name field if available (POI name), otherwise extract from display_name
        const poiName = result.name || result.display_name.split(',')[0].trim();
        
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          city,
          address: result.display_name,
          displayName: result.display_name,
          name: poiName,
          type: result.type,
          class: result.class,
          streetName,
          streetNumber,
        };
      });

      // Sort by distance if user location provided
      if (userLocation) {
        geocodeResults = geocodeResults
          .map(result => ({
            ...result,
            distance: this.calculateDistance(
              userLocation.lat,
              userLocation.lng,
              result.lat,
              result.lng
            )
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10); // Return top 10 closest
      }

      return geocodeResults;
    } catch (error) {
      console.error('Nominatim search error:', error);
      return [];
    }
  }

  /**
   * Search specifically for cities worldwide (no location bias)
   * Uses multiple strategies to ensure we find cities reliably
   */
  async searchCities(query: string, language?: string): Promise<GeocodeResult[]> {
    await this.rateLimit();

    const allResults: GeocodeResult[] = [];
    const seenCities = new Set<string>();

    try {
      // Strategy 1: Search with featuretype=city (most direct)
      const cityParams = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '10',
        'accept-language': language || 'en',
        featuretype: 'city',
      });

      try {
        const cityResponse = await fetch(`${this.baseUrl}/search?${cityParams}`, {
          headers: { 'User-Agent': 'SpottApp/1.0' },
        });

        if (cityResponse.ok) {
          const cityResults: NominatimResult[] = await cityResponse.json();
          for (const result of cityResults) {
            const cityName = result.address.city || result.address.town || result.address.village || result.display_name.split(',')[0].trim();
            const normalizedKey = cityName.toLowerCase().trim();

            // If Nominatim returns a district/municipality name in `name`, ignore it for city searches.
            const canonicalCity = cityName;
            
            if (!seenCities.has(normalizedKey)) {
              seenCities.add(normalizedKey);
              allResults.push({
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                city: canonicalCity,
                address: result.display_name,
                displayName: result.display_name,
                name: canonicalCity,
                type: result.type,
                class: result.class,
              });
            }
          }
        }
      } catch (e) {
        console.warn('City featuretype search failed:', e);
      }

      // Strategy 2: Search with place class filter (finds city/town/village types)
      if (allResults.length < 5) {
        await this.rateLimit();
        
        const placeParams = new URLSearchParams({
          q: `${query} city`,
          format: 'json',
          addressdetails: '1',
          limit: '15',
          'accept-language': language || 'en',
        });

        try {
          const placeResponse = await fetch(`${this.baseUrl}/search?${placeParams}`, {
            headers: { 'User-Agent': 'SpottApp/1.0' },
          });

          if (placeResponse.ok) {
            const placeResults: NominatimResult[] = await placeResponse.json();
            
            // Filter to only city/town/village types
            for (const result of placeResults) {
              if (result.class === 'place' && ['city', 'town', 'village'].includes(result.type || '')) {
                const cityName = result.address.city || result.address.town || result.address.village || result.display_name.split(',')[0].trim();
                const normalizedKey = cityName.toLowerCase().trim();

                if (!seenCities.has(normalizedKey)) {
                  seenCities.add(normalizedKey);
                  allResults.push({
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon),
                    city: cityName,
                    address: result.display_name,
                    displayName: result.display_name,
                    name: cityName,
                    type: result.type,
                    class: result.class,
                  });
                }
              }
            }
          }
        } catch (e) {
          console.warn('Place class search failed:', e);
        }
      }

      return allResults.slice(0, 10);
    } catch (error) {
      console.error('Nominatim city search error:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

  /**
   * Reverse geocoding: Get address from coordinates
   * FREE - No API key needed
   */
  async reverseGeocode(lat: number, lng: number, language?: string): Promise<GeocodeResult | null> {
    await this.rateLimit();

    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lng.toString(),
        format: 'json',
        addressdetails: '1',
        'accept-language': language || 'en',
      });

      const response = await fetch(`${this.baseUrl}/reverse?${params}`, {
        headers: {
          'User-Agent': 'SpottApp/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim error: ${response.status}`);
      }

      const result: NominatimResult = await response.json();

      // Prioritize locality (main city)
      const city = result.address.city || 
                   result.address.town || 
                   result.address.village || 
                   '';

      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        city,
        address: result.display_name,
        displayName: result.display_name,
        type: result.type,
        class: result.class,
      };
    } catch (error) {
      console.error('Nominatim reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Get city name from coordinates (cached version)
   */
  async getCityFromCoordinates(lat: number, lng: number, language?: string): Promise<string> {
    const result = await this.reverseGeocode(lat, lng, language);
    return result?.city || 'Unknown City';
  }
}

export const nominatimGeocoding = new NominatimGeocoding();
