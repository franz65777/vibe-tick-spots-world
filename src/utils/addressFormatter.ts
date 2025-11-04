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

  // If address is missing but we have coordinates, try reverse geocoding
  if (!address && coordinates?.lat && coordinates?.lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.lat}&lon=${coordinates.lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Spott App',
            'Accept-Language': 'en',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Extract street address from Nominatim response
        const addr = data.address;
        const street = addr?.road || addr?.street || '';
        const houseNumber = addr?.house_number || '';
        if (street) {
          address = houseNumber ? `${street} ${houseNumber}` : street;
        }
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
  }

  // Get normalized city
  const normalizedCity = normalizeCity(city || null);
  
  // Extract street address (first part before the first comma, or the whole address if no comma)
  let streetPart = '';
  if (address) {
    const parts = address.split(',').map(p => p.trim());
    // The first part is usually the street name and number
    streetPart = parts[0] || '';
  }

  // Return formatted address
  if (normalizedCity !== 'Unknown' && streetPart) {
    return `${normalizedCity}, ${streetPart}`;
  } else if (normalizedCity !== 'Unknown') {
    return normalizedCity;
  } else if (streetPart) {
    return streetPart;
  }
  
  return 'Unknown Location';
};
