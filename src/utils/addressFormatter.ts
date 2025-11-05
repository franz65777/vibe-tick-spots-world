import { normalizeCity } from './cityNormalization';

/**
 * Formats a location address in the format: "City, Street Name and #"
 * Used in opened location cards to show detailed location information
 * If address is missing but coordinates exist, attempts reverse geocoding
 */
export const formatDetailedAddress = async (params: {
  city?: string | null;
  address?: string | null;
  coordinates?: { lat?: number; lng?: number } | null;
}): Promise<string> => {
  const { city, coordinates } = params;
  let { address } = params;

  // Get normalized city first
  const normalizedCity = normalizeCity(city || null);

  // If address is missing but we have coordinates, try reverse geocoding
  if (!address && coordinates?.lat && coordinates?.lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.lat}&lon=${coordinates.lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Spott App',
            'Accept-Language': 'it,en',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const addr = data.address;
        
        // Try to build complete address: street + house_number
        const road = addr?.road || addr?.street || addr?.pedestrian || '';
        const houseNumber = addr?.house_number || '';
        const suburb = addr?.suburb || '';
        const cityName = addr?.city || addr?.town || addr?.village || '';
        
        // Build street address with number
        if (road && houseNumber) {
          address = `${road} ${houseNumber}`;
        } else if (road) {
          address = road;
        } else if (suburb) {
          address = suburb;
        }
        
        // Override city if we got better data from geocoding
        if (cityName && normalizedCity === 'Unknown') {
          return address ? `${cityName}, ${address}` : cityName;
        }
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
  }
  
  // Extract street address (first part before the first comma)
  let streetPart = '';
  if (address) {
    const parts = address.split(',').map(p => p.trim());
    streetPart = parts[0] || '';
  }

  // Return formatted address: "City, Street Number"
  if (normalizedCity !== 'Unknown' && streetPart) {
    return `${normalizedCity}, ${streetPart}`;
  } else if (normalizedCity !== 'Unknown') {
    return normalizedCity;
  } else if (streetPart) {
    return streetPart;
  }
  
  return 'Indirizzo non disponibile';
};
