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
    'night_club': 'bar',
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