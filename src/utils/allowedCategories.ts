// Allowed categories for food/hospitality/experience locations
export const allowedCategories = [
  'restaurant',
  'bar', 
  'cafe',
  'bakery',
  'hotel',
  'museum',
  'entertainment',
  'park',
  'historical',
  'nightclub'
] as const;

export type AllowedCategory = typeof allowedCategories[number];

export const categoryDisplayNames: Record<AllowedCategory, string> = {
  restaurant: 'Restaurant',
  bar: 'Bar & Pub',
  cafe: 'Café',
  bakery: 'Bakery',
  hotel: 'Hotel',
  museum: 'Museum',
  entertainment: 'Fun',
  park: 'Park',
  historical: 'Historical',
  nightclub: 'Nightclub'
};

export const isAllowedCategory = (category: string): category is AllowedCategory => {
  return allowedCategories.includes(category as AllowedCategory);
};

// Map Google Places types to our categories with priority
export const mapGooglePlaceTypeToCategory = (types: string[]): AllowedCategory => {
  if (!types || types.length === 0) return 'restaurant';
  
  // Priority order for categorization (most specific first)
  const categoryMap: Record<string, AllowedCategory> = {
    // Bakery - highest priority (most specific)
    'bakery': 'bakery',
    
    // Bar - alcohol-serving establishments
    'bar': 'bar',
    'pub': 'bar',
    'liquor_store': 'bar',
    
    // Cafe - coffee/tea specific
    'cafe': 'cafe',
    'coffee_shop': 'cafe',
    
    // Museum - cultural/art (NOT historical)
    'museum': 'museum',
    'art_gallery': 'museum',
    'aquarium': 'museum',
    'zoo': 'museum',
    
    // Nightclub - clubs and late-night venues
    'nightclub': 'nightclub',
    'night_club': 'nightclub',
    
    // Park - outdoor green spaces
    'park': 'park',
    'playground': 'park',
    'garden': 'park',
    'national_park': 'park',
    
    // Historical - landmarks, monuments, historical sites
    'tourist_attraction': 'historical',
    'landmark': 'historical',
    'monument': 'historical',
    'historical_place': 'historical',
    'university': 'historical',
    'church': 'historical',
    'cathedral': 'historical',
    'place_of_worship': 'historical',
    'castle': 'historical',
    'fort': 'historical',
    'city_hall': 'historical',
    'town_square': 'historical',
    
    // Entertainment - fun activities (excluding parks, nightclubs, historical)
    'movie_theater': 'entertainment',
    'amusement_park': 'entertainment',
    'bowling_alley': 'entertainment',
    'casino': 'entertainment',
    'stadium': 'entertainment',
    'leisure': 'entertainment',
    'music_venue': 'entertainment',
    'arcade': 'entertainment',
    'theme_park': 'entertainment',
    
    // Hotel - accommodation
    'lodging': 'hotel',
    'hotel': 'hotel',
    'guest_house': 'hotel',
    'campground': 'hotel',
    
    // Restaurant - general dining (lowest priority)
    'restaurant': 'restaurant',
    'food': 'restaurant',
    'meal_delivery': 'restaurant',
    'meal_takeaway': 'restaurant',
  };
  
  // Check types in order of array (Google prioritizes them)
  for (const type of types) {
    const mappedCategory = categoryMap[type];
    if (mappedCategory) {
      return mappedCategory;
    }
  }
  
  // Default fallback
  return 'restaurant';
};

// Nominatim-specific type filtering (strict whitelist approach)
export const isAllowedNominatimType = (type?: string, osmClass?: string): boolean => {
  if (!type && !osmClass) return false;
  
  // Strict whitelist of allowed Nominatim types that match our 10 categories
  const allowedTypes = [
    // Restaurant
    'restaurant', 'fast_food', 'food_court', 'biergarten',
    // Bar
    'bar', 'pub',
    // Cafe
    'cafe', 'coffee_shop',
    // Bakery
    'bakery',
    // Hotel
    'hotel', 'motel', 'guest_house', 'hostel', 'chalet', 'apartment',
    // Museum
    'museum', 'gallery', 'arts_centre', 'artwork',
    // Entertainment
    'cinema', 'theatre', 'amusement_arcade', 'theme_park',
    'sports_centre', 'stadium', 'music_venue', 'casino', 'bowling_alley',
    // Park
    'park', 'playground', 'garden', 'nature_reserve',
    // Historical
    'attraction', 'monument', 'memorial', 'castle', 'ruins', 'archaeological_site',
    'church', 'cathedral', 'place_of_worship', 'university', 'city_hall', 'town_hall',
    // Nightclub
    'nightclub', 'discotheque'
  ];
  
  // Strict blacklist - exclude these even if they appear in other checks
  const blacklistedTypes = [
    'police', 'post_office', 'townhall', 'embassy', 'courthouse',
    'fire_station', 'hospital', 'clinic', 'dentist', 'pharmacy',
    'bank', 'atm', 'bureau_de_change',
    'fuel', 'charging_station', 'parking', 'parking_space', 'parking_entrance',
    'shop', 'supermarket', 'mall', 'marketplace', 'convenience', 'clothes',
    'school', 'kindergarten',
    'monastery', 'wayside_cross', 'mosque', 'temple',
    'airport', 'aerodrome', 'helipad', 'ferry_terminal', 'bus_station',
    'social_facility', 'community_centre', 'bicycle_parking'
  ];
  
  const normalizedType = type?.toLowerCase() || '';
  const normalizedClass = osmClass?.toLowerCase() || '';
  
  // First check blacklist - reject immediately if blacklisted
  if (normalizedType && blacklistedTypes.includes(normalizedType)) {
    return false;
  }
  
  // Check if type is explicitly whitelisted
  if (normalizedType && allowedTypes.includes(normalizedType)) {
    return true;
  }
  
  // For tourism and leisure classes, be more permissive but still check against types
  if (normalizedClass === 'tourism' || normalizedClass === 'leisure') {
    // Tourism/leisure is generally OK unless blacklisted
    return !blacklistedTypes.includes(normalizedType);
  }
  
  // For amenity class, ONLY accept if type is whitelisted
  if (normalizedClass === 'amenity') {
    return normalizedType && allowedTypes.includes(normalizedType);
  }
  
  return false;
};

// Map Nominatim types to our categories
export const mapNominatimTypeToCategory = (type?: string, osmClass?: string): AllowedCategory => {
  const normalizedType = type?.toLowerCase() || '';
  
  // Specific mappings
  const typeMap: Record<string, AllowedCategory> = {
    // Cafe - coffee places
    'cafe': 'cafe',
    'coffee_shop': 'cafe',
    
    // Bakery
    'bakery': 'bakery',
    
    // Bar
    'bar': 'bar',
    'pub': 'bar',
    
    // Hotel
    'hotel': 'hotel',
    'motel': 'hotel',
    'guest_house': 'hotel',
    'hostel': 'hotel',
    
    // Museum
    'museum': 'museum',
    'gallery': 'museum',
    'arts_centre': 'museum',
    
    // Nightclub
    'nightclub': 'nightclub',
    'discotheque': 'nightclub',
    
    // Park
    'park': 'park',
    'playground': 'park',
    'garden': 'park',
    'nature_reserve': 'park',
    
    // Historical
    'attraction': 'historical',
    'monument': 'historical',
    'memorial': 'historical',
    'castle': 'historical',
    'ruins': 'historical',
    'archaeological_site': 'historical',
    'church': 'historical',
    'cathedral': 'historical',
    'university': 'historical',
    
    // Entertainment
    'cinema': 'entertainment',
    'theatre': 'entertainment',
    'amusement_arcade': 'entertainment',
    'theme_park': 'entertainment',
    
    // Restaurant (default for food)
    'restaurant': 'restaurant',
    'fast_food': 'restaurant',
    'food_court': 'restaurant',
  };
  
  if (normalizedType && typeMap[normalizedType]) {
    return typeMap[normalizedType];
  }
  
  // Default
  return 'restaurant';
};
