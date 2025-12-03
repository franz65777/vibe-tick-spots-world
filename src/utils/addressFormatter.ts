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

/**
 * Formats address for display in search results and location lists.
 * Returns ONLY: City, Street Name, Number - nothing else.
 * Filters out country, county, postal codes, eircodes, etc.
 * 
 * Accepts structured address components (preferred) or falls back to parsing display string.
 */
export const formatSearchResultAddress = (params: {
  name: string;
  address: string;
  city?: string;
  streetName?: string;
  streetNumber?: string;
}): string => {
  const { name, address, city, streetName, streetNumber } = params;
  
  if (!address && !city && !streetName) return '';
  
  // If we have structured address components with street info, use them directly (most accurate)
  if (streetName) {
    const result: string[] = [];
    
    if (city) result.push(city);
    
    if (streetName && streetNumber) {
      result.push(`${streetName}, ${streetNumber}`);
    } else if (streetName) {
      result.push(streetName);
    }
    
    return result.join(', ');
  }
  
  // Fallback: Parse from display_name string
  // Clean address - remove the name if it appears at the beginning
  let cleanAddress = address || '';
  const normalizedName = name.toLowerCase().trim();
  
  if (cleanAddress.toLowerCase().startsWith(normalizedName)) {
    cleanAddress = cleanAddress.substring(name.length).replace(/^[,\s]+/, '');
  }
  
  // Split into parts
  const parts = cleanAddress.split(',').map(p => p.trim()).filter(Boolean);
  
  // Patterns to EXCLUDE (country, county, postal codes, district numbers, etc.)
  const excludePatterns = [
    /^ireland$/i,
    /^éire$/i,
    /^italia$/i,
    /^italy$/i,
    /^uk$/i,
    /^united kingdom$/i,
    /^germany$/i,
    /^france$/i,
    /^spain$/i,
    /county\s/i,
    /^co\.\s/i,
    /^\d{1,2}$/i, // Single or double digit numbers (district numbers like "4")
    /^dublin\s*\d+$/i, // "Dublin 4", "Dublin 2" etc - district codes
    /^\d{2,}\s*[A-Z]{0,2}\d*$/i, // Postal codes like "D04", "12345", "D04 ABC"
    /^[A-Z]\d{2}\s/i, // Eircodes like "D04 ..."
    /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i, // UK postcodes
    /^\d{5}(-\d{4})?$/i, // US zip codes
  ];
  
  // Find city (from parameter or from parts)
  let foundCity = city || '';
  let parsedStreetName = '';
  let parsedStreetNumber = '';
  
  // Track parts we've used to avoid duplication
  const usedParts = new Set<string>();
  if (foundCity) usedParts.add(foundCity.toLowerCase());
  
  for (const part of parts) {
    const trimmed = part.trim();
    const lowerTrimmed = trimmed.toLowerCase();
    
    // Skip excluded patterns
    if (excludePatterns.some(pattern => pattern.test(trimmed))) continue;
    
    // Skip if it matches the name
    if (lowerTrimmed === normalizedName) continue;
    
    // Skip if already used (duplicate city)
    if (usedParts.has(lowerTrimmed)) continue;
    
    // Skip very short parts (likely abbreviations or codes)
    if (trimmed.length < 3) continue;
    
    // Check if this part has a street number pattern (street + number together)
    const numberMatch = trimmed.match(/^(\d+[-–]?\d*)\s+(.+)$/) || // "21-25 Harcourt Street"
                        trimmed.match(/^(.+?)\s+(\d+[-–]?\d*)$/);    // "Harcourt Street 21-25"
    
    if (numberMatch) {
      // This is a street with number
      if (/^\d/.test(numberMatch[1])) {
        parsedStreetNumber = numberMatch[1];
        parsedStreetName = numberMatch[2];
      } else {
        parsedStreetName = numberMatch[1];
        parsedStreetNumber = numberMatch[2];
      }
      usedParts.add(lowerTrimmed);
    } else if (!foundCity && !parsedStreetName) {
      // First non-number part without city could be city or street
      // If it looks like a street name (contains "street", "road", "avenue", etc.)
      if (/\b(street|road|avenue|lane|way|drive|place|square|terrace|close|court|gardens|park|row|hill|view|grove|crescent|parade|via|piazza|corso|viale|strada)\b/i.test(trimmed)) {
        parsedStreetName = trimmed;
      } else if (!foundCity) {
        foundCity = trimmed;
      }
      usedParts.add(lowerTrimmed);
    } else if (!parsedStreetName && trimmed.length > 2) {
      parsedStreetName = trimmed;
      usedParts.add(lowerTrimmed);
    }
  }
  
  // Build result: City, Street Name, Number
  const result: string[] = [];
  
  if (foundCity) result.push(foundCity);
  
  if (parsedStreetName && parsedStreetNumber) {
    result.push(`${parsedStreetName}, ${parsedStreetNumber}`);
  } else if (parsedStreetName) {
    result.push(parsedStreetName);
  }
  
  return result.join(', ');
};
