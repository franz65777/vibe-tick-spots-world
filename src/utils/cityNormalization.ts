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

  // Check if it's a numeric postal code or too short
  if (/^\d+$/.test(normalized.trim()) || normalized.trim().length <= 2) {
    return 'Unknown';
  }

  // Trim whitespace again
  normalized = normalized.trim();
  
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
  
  return normalized;
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

    const normalized = normalizeCity(part);
    if (normalized !== 'Unknown') {
      return normalized;
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
