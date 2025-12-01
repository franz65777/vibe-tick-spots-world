/**
 * FREE Geocoding using OpenStreetMap Nominatim
 * No API key required, completely free
 * Rate limit: ~1 request/second (respectful usage)
 */

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  class?: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    road?: string;
    house_number?: string;
  };
}

interface GeocodeResult {
  lat: number;
  lng: number;
  city: string;
  address: string;
  displayName: string;
  type?: string;
  class?: string;
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
    userLocation?: { lat: number; lng: number }
  ): Promise<GeocodeResult[]> {
    await this.rateLimit();

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '20', // Increased to get more results for better proximity sorting
        'accept-language': language || 'en',
      });

      // Add viewbox parameter if user location is provided (prioritizes nearby results)
      if (userLocation) {
        // Create a bounding box around user location (~50km radius)
        const latDelta = 0.5; // ~50km
        const lngDelta = 0.5;
        const viewbox = [
          userLocation.lng - lngDelta,
          userLocation.lat + latDelta,
          userLocation.lng + lngDelta,
          userLocation.lat - latDelta
        ].join(',');
        params.append('viewbox', viewbox);
        params.append('bounded', '1'); // Restrict results to viewbox
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

      let geocodeResults = results.map(result => ({
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        city: result.address.city || result.address.town || result.address.village || '',
        address: result.display_name,
        displayName: result.display_name,
        type: result.type,
        class: result.class,
      }));

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
