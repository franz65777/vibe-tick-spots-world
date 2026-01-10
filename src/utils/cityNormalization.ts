/**
 * Patterns that indicate a sub-city area that should be mapped to parent city
 * These are globally recognized administrative subdivisions
 */
const SUB_CITY_PATTERNS = [
  /\s+urban\s+municipality$/i,
  /\s+municipality$/i,
  /\s+urban\s+district$/i,
  /\s+district$/i,
  /\s+borough$/i,
  /\s+quarter$/i,
  /\s+neighbourhood$/i,
  /\s+neighborhood$/i,
  /\s+suburb$/i,
  /\s+commune$/i,
  /\s+ward$/i,
  /\s+precinct$/i,
  /\s+arrondissement$/i,
  /\s+stadtbezirk$/i,
  /\s+quartier$/i,
  /\s+circoscrizione$/i,
  /\s+rione$/i,
  /\s+barrio$/i,
  /\s+bairro$/i,
  /\s+dzielnica$/i,
  /\s+raion$/i,
  /\s+opština$/i,
  /\s+opstina$/i,
  /\s+općina$/i,
  /\s+opcina$/i,
  // Serbian (Cyrillic)
  /\s+општина$/i,
  /^градска\s+општина\s+/i,
];

/**
 * Check if a string looks like a sub-city administrative area
 */
const isSubCityName = (name: string): boolean => {
  return SUB_CITY_PATTERNS.some(pattern => pattern.test(name));
};

/**
 * Normalize city names by removing postal codes, counties, and mapping neighborhoods
 */
export const normalizeCity = (city: string | null | undefined): string => {
  if (!city || city.trim() === '') return 'Unknown';

  let normalized = city.trim();

  if (normalized === 'Unknown' || normalized === 'Unknown City') {
    return 'Unknown';
  }

  // Remove postal district numbers (e.g., "Dublin 2" -> "Dublin")
  normalized = normalized.replace(/\s+\d+$/, '');

  // Remove "County" prefix (e.g., "County Dublin" -> "Dublin")
  normalized = normalized.replace(/^County\s+/i, '');

  // Trim whitespace again
  normalized = normalized.trim();

  // Map international aliases to a canonical city name to avoid duplicates (e.g., Torino -> Turin)
  const aliases: Record<string, string> = {
    // Italy
    'torino': 'Turin', 'turin': 'Turin',
    'roma': 'Rome', 'rome': 'Rome',
    'milano': 'Milan', 'milan': 'Milan',
    'napoli': 'Naples', 'naples': 'Naples',
    'firenze': 'Florence', 'florence': 'Florence',
    'venezia': 'Venice', 'venice': 'Venice',
    // Spain/Portugal
    'sevilla': 'Seville', 'seville': 'Seville',
    'lisboa': 'Lisbon', 'lisbon': 'Lisbon',
    'barcelona': 'Barcelona',
    'madrid': 'Madrid',
    // Germany/Austria
    'münchen': 'Munich', 'munchen': 'Munich', 'munich': 'Munich',
    'köln': 'Cologne', 'koln': 'Cologne', 'cologne': 'Cologne',
    'wien': 'Vienna', 'vienna': 'Vienna',
    // Nordics/Central
    'köbenhavn': 'Copenhagen', 'kobenhavn': 'Copenhagen', 'copenhagen': 'Copenhagen',
    'praha': 'Prague', 'prague': 'Prague',
    // Eastern Europe
    'warszawa': 'Warsaw', 'warsaw': 'Warsaw',
    'kraków': 'Kraków', 'krakow': 'Kraków',
    'beograd': 'Belgrade', 'belgrade': 'Belgrade',
    'београд': 'Belgrade',
    // Greece/Russia/China
    'athína': 'Athens', 'athina': 'Athens', 'athens': 'Athens',
    'москва': 'Moscow', 'moskva': 'Moscow', 'moscow': 'Moscow',
  };
  const lower = normalized.toLowerCase();
  if (aliases[lower]) {
    return aliases[lower];
  }

  // Check if it's a numeric postal code or too short
  if (/^\d+$/.test(normalized) || normalized.length <= 2) {
    return 'Unknown';
  }
  
  // Map Dublin neighborhoods/suburbs to "Dublin"
  const dublinNeighborhoods = [
    'Rathmines', 'Ranelagh', 'Ballsbridge', 'Donnybrook', 'Sandymount',
    'Sandymount Village', 'Ringsend', 'Irishtown', 'Ballybough', 'Drumcondra', 'Glasnevin',
    'Cabra', 'Phibsborough', 'Stoneybatter', 'Smithfield', 'Arbour Hill',
    'Inchicore', 'Kilmainham', 'Islandbridge', 'Crumlin', 'Kimmage',
    'Terenure', 'Rathgar', 'Milltown', 'Clonskeagh', 'Dundrum',
    'Stillorgan', 'Blackrock', 'Dun Laoghaire', 'Dalkey', 'Killiney',
    'Shankill', 'Bray', 'Greystones', 'Howth', 'Malahide', 'Swords',
    'Portmarnock', 'Clontarf', 'Raheny', 'Coolock', 'Artane',
    'Whitehall', 'Santry', 'Ballymun', 'Finglas', 'Blanchardstown',
    'Castleknock', 'Lucan', 'Clondalkin', 'Tallaght', 'Rathfarnham',
    'Templeogue', 'Firhouse', 'Ballinteer', 'Churchtown', 'Windy Arbour',
    'Leopardstown', 'Sandyford', 'Stepaside', 'Foxrock', 'Cabinteely',
    'Loughlinstown', 'Cherrywood', 'Carrickmines', 'Cornelscourt',
    'Donabate', 'Rush', 'Skerries', 'Balbriggan', 'Baldoyle',
    'Saint James', 'St James', 'The Coombe', 'Liberties', 'Thomas Street',
    'Christchurch', 'Temple Bar', 'Ballyboden', 'Knocklyon', 'Brittas'
  ];
  
  // Check if city matches any Dublin neighborhood (case insensitive)
  const isDublinNeighborhood = dublinNeighborhoods.some(
    neighborhood => normalized.toLowerCase() === neighborhood.toLowerCase()
  );
  
  if (isDublinNeighborhood) {
    return 'Dublin';
  }
  
  // If it looks like a sub-city area, return Unknown so we can try to get parent city from address
  if (isSubCityName(normalized)) {
    return 'Unknown';
  }
  
  // If input is all-lowercase (common when coming from APIs), title-case it for display.
  // This keeps canonical casing like "Belgrade" and avoids showing "belgrade".
  const isAllLower = normalized === normalized.toLowerCase() && /[a-z]/.test(normalized);
  if (isAllLower) {
    normalized = normalized
      .split(/\s+/)
      .map(w => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  }

  return normalized;
};

/**
 * Extract city from a sub-city name by parsing the display/address format
 * E.g., "Surcin, Belgrade, Serbia" -> "Belgrade"
 */
export const extractParentCityFromAddress = (address: string | null | undefined, subCityName: string | null | undefined): string | null => {
  if (!address || address.trim() === '') return null;

  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  // Find the index of the sub-city name in the address parts
  const subCityLower = (subCityName || '').toLowerCase();
  let subCityIndex = -1;
  
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].toLowerCase().includes(subCityLower) || 
        subCityLower.includes(parts[i].toLowerCase())) {
      subCityIndex = i;
      break;
    }
  }

  // Look for city in parts after the sub-city (usually the next part)
  for (let i = Math.max(1, subCityIndex + 1); i < parts.length - 1; i++) {
    const part = parts[i].trim();
    
    // Skip if it looks like a country or too short
    if (part.length <= 2) continue;
    
    // Skip common country names
    const countriesLower = ['serbia', 'italy', 'france', 'germany', 'spain', 'portugal', 
      'ireland', 'uk', 'united kingdom', 'usa', 'united states', 'croatia', 'bosnia',
      'montenegro', 'north macedonia', 'slovenia', 'hungary', 'romania', 'bulgaria',
      'greece', 'austria', 'switzerland', 'poland', 'czech republic', 'slovakia'];
    if (countriesLower.includes(part.toLowerCase())) continue;
    
    // Skip if it looks like another sub-city type
    if (isSubCityName(part)) continue;
    
    // This is likely the parent city
    return normalizeCity(part);
  }

  return null;
};

export const extractCityFromAddress = (address: string | null | undefined): string | null => {
  if (!address || address.trim() === '') return null;

  const parts = address.split(',').map(p => p.trim()).filter(Boolean);

  if (parts.length < 1) return null;

  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];

    if (part.length <= 2 || /^\d+$/.test(part)) continue;

    if (/(street|st\.|avenue|ave\.|road|rd\.|square|lane|ln\.|drive|dr\.|court|ct\.)/i.test(part)) continue;

    if (/^[A-Z]\d{2}/.test(part)) continue;

    const potentialCity = part.trim();

    if (potentialCity.length > 2) {
      const normalized = normalizeCity(potentialCity);
      if (normalized !== 'Unknown') {
        return normalized;
      }
    }
  }

  return null;
};

export const extractCityFromName = (name: string | null | undefined): string | null => {
  if (!name || name.trim() === '') return null;

  const dublinNeighborhoods = [
    'Rathmines', 'Ranelagh', 'Ballsbridge', 'Donnybrook', 'Sandymount',
    'Sandymount Village', 'Ringsend', 'Irishtown', 'Ballybough', 'Drumcondra', 'Glasnevin',
    'Cabra', 'Phibsborough', 'Stoneybatter', 'Smithfield', 'Arbour Hill',
    'Inchicore', 'Kilmainham', 'Islandbridge', 'Crumlin', 'Kimmage',
    'Terenure', 'Rathgar', 'Milltown', 'Clonskeagh', 'Dundrum',
    'Stillorgan', 'Blackrock', 'Dun Laoghaire', 'Dalkey', 'Killiney',
    'Shankill', 'Bray', 'Greystones', 'Howth', 'Malahide', 'Swords',
    'Portmarnock', 'Clontarf', 'Raheny', 'Coolock', 'Artane',
    'Whitehall', 'Santry', 'Ballymun', 'Finglas', 'Blanchardstown',
    'Castleknock', 'Lucan', 'Clondalkin', 'Tallaght', 'Rathfarnham',
    'Templeogue', 'Firhouse', 'Ballinteer', 'Churchtown', 'Windy Arbour',
    'Leopardstown', 'Sandyford', 'Stepaside', 'Foxrock', 'Cabinteely',
    'Loughlinstown', 'Cherrywood', 'Carrickmines', 'Cornelscourt',
    'Donabate', 'Rush', 'Skerries', 'Balbriggan', 'Baldoyle',
    'Saint James', 'St James', 'The Coombe', 'Liberties', 'Thomas Street',
    'Christchurch', 'Temple Bar', 'Ballyboden', 'Knocklyon', 'Brittas'
  ];

  for (const neighborhood of dublinNeighborhoods) {
    if (name.toLowerCase().includes(neighborhood.toLowerCase())) {
      return 'Dublin';
    }
  }

  return null;
};
