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