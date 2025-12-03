// Allowed categories for food/hospitality/experience locations
export const allowedCategories = [
  'restaurant',
  'bar', 
  'cafe',
  'bakery',
  'hotel',
  'museum',
  'entertainment'
] as const;

export type AllowedCategory = typeof allowedCategories[number];

export const categoryDisplayNames: Record<AllowedCategory, string> = {
  restaurant: 'Restaurant',
  bar: 'Bar & Pub',
  cafe: 'Café',
  bakery: 'Bakery',
  hotel: 'Hotel',
  museum: 'Museum',
  entertainment: 'Fun'
};

export const isAllowedCategory = (category: string): category is AllowedCategory => {
  return allowedCategories.includes(category as AllowedCategory);
};

// Map Google Places types to our categories with priority
export const mapGooglePlaceTypeToCategory = (types: string[]): AllowedCategory => {
  if (!types || types.length === 0) return 'restaurant';
  
  // Priority order for categorization (most specific first)
  // Check in order: bakery > bar/pub > cafe > museum > entertainment > hotel > restaurant
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
    
    // Museum - cultural/art
    'museum': 'museum',
    'art_gallery': 'museum',
    'aquarium': 'museum',
    'zoo': 'museum',
    
    // Entertainment - fun activities
    'movie_theater': 'entertainment',
    'amusement_park': 'entertainment',
    'bowling_alley': 'entertainment',
    'casino': 'entertainment',
    'stadium': 'entertainment',
    'park': 'entertainment',
    'leisure': 'entertainment',
    'playground': 'entertainment',
    'nightclub': 'entertainment',
    'night_club': 'entertainment',
    'music_venue': 'entertainment',
    'tourist_attraction': 'entertainment',
    
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
  
  // Strict whitelist of allowed Nominatim types that match our 7 categories
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
    'museum', 'gallery', 'arts_centre', 'artwork', 'attraction',
    // Entertainment
    'cinema', 'theatre', 'nightclub', 'amusement_arcade', 'theme_park',
    'zoo', 'aquarium', 'park', 'playground', 'sports_centre', 'stadium',
    'music_venue', 'casino', 'leisure'
  ];
  
  // Strict blacklist - exclude these even if they appear in other checks
  const blacklistedTypes = [
    'police', 'post_office', 'townhall', 'embassy', 'courthouse',
    'fire_station', 'hospital', 'clinic', 'dentist', 'pharmacy',
    'bank', 'atm', 'bureau_de_change',
    'fuel', 'charging_station', 'parking', 'parking_space', 'parking_entrance',
    'shop', 'supermarket', 'mall', 'marketplace', 'convenience', 'clothes',
    'school', 'university', 'college', 'library', 'kindergarten',
    'place_of_worship', 'monastery', 'wayside_cross', 'church', 'mosque', 'temple',
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
