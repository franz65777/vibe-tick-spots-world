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
  entertainment: 'Entertainment'
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

// Nominatim-specific type filtering (whitelist approach)
export const isAllowedNominatimType = (type?: string, osmClass?: string): boolean => {
  if (!type && !osmClass) return false;
  
  // Whitelist of allowed Nominatim types that match our 7 categories
  const allowedTypes = [
    // Restaurant
    'restaurant', 'fast_food', 'food_court', 'biergarten',
    // Bar
    'bar', 'pub', 'biergarten',
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
    'music_venue', 'casino'
  ];
  
  // Whitelist of allowed OSM classes
  const allowedClasses = [
    'amenity', 'tourism', 'leisure'
  ];
  
  // Check type
  if (type && allowedTypes.includes(type.toLowerCase())) {
    return true;
  }
  
  // For tourism/leisure classes, be more permissive
  if (osmClass && allowedClasses.includes(osmClass.toLowerCase())) {
    // But still exclude obvious non-matches
    const blacklistedTypes = [
      'police', 'post_office', 'townhall', 'embassy', 'courthouse',
      'fire_station', 'hospital', 'clinic', 'dentist', 'pharmacy',
      'bank', 'atm', 'bureau_de_change',
      'fuel', 'charging_station', 'parking',
      'shop', 'supermarket', 'mall', 'marketplace',
      'school', 'university', 'college', 'library',
      'place_of_worship', 'monastery', 'wayside_cross',
      'airport', 'aerodrome', 'helipad', 'ferry_terminal'
    ];
    
    if (type && blacklistedTypes.includes(type.toLowerCase())) {
      return false;
    }
    
    return true;
  }
  
  return false;
};