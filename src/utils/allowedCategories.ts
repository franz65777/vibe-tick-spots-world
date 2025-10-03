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
  const categoryMap: Record<string, AllowedCategory> = {
    // Bakery - highest priority for bakery-specific types
    'bakery': 'bakery',
    
    // Bar - specific bar types
    'bar': 'bar',
    'night_club': 'bar',
    'pub': 'bar',
    
    // Cafe - coffee/tea specific
    'cafe': 'cafe',
    'coffee_shop': 'cafe',
    
    // Restaurant - general dining
    'restaurant': 'restaurant',
    'meal_delivery': 'restaurant',
    'meal_takeaway': 'restaurant',
    
    // Hotel - accommodation
    'lodging': 'hotel',
    'hotel': 'hotel',
    
    // Museum - cultural
    'museum': 'museum',
    'art_gallery': 'museum',
    
    // Entertainment
    'movie_theater': 'entertainment',
    'amusement_park': 'entertainment',
    'bowling_alley': 'entertainment',
    'casino': 'entertainment',
    'tourist_attraction': 'entertainment',
  };
  
  // Check types in order of priority
  for (const type of types) {
    const mappedCategory = categoryMap[type];
    if (mappedCategory) {
      return mappedCategory;
    }
  }
  
  // Default fallback
  return 'restaurant';
};