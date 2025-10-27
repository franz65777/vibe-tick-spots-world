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
   */
  async searchPlace(query: string, language?: string): Promise<GeocodeResult[]> {
    await this.rateLimit();

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '5',
        'accept-language': language || 'en',
      });

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          'User-Agent': 'SpottApp/1.0', // Nominatim requires a user agent
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim error: ${response.status}`);
      }

      const results: NominatimResult[] = await response.json();

      return results.map(result => ({
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        city: result.address.city || result.address.town || result.address.village || '',
        address: result.display_name,
        displayName: result.display_name,
      }));
    } catch (error) {
      console.error('Nominatim search error:', error);
      return [];
    }
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
