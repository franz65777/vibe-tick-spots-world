import { normalizeCity } from './cityNormalization';

/**
 * Formats a location address in the format: "City, Street Name and #"
 * Used in opened location cards to show detailed location information
 */
export const formatDetailedAddress = (params: {
  city?: string | null;
  address?: string | null;
  coordinates?: { lat?: number; lng?: number } | null;
}): string => {
  const { city, address } = params;

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
