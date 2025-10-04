import { getCategoryIcon } from './categoryIcons';
import hotelIcon from '@/assets/category-hotel-transparent.png';
import cafeIcon from '@/assets/category-cafe-transparent.png';
import barIcon from '@/assets/category-bar-transparent.png';
import restaurantIcon from '@/assets/category-restaurant-transparent.png';
import entertainmentIcon from '@/assets/category-entertainment-transparent.png';

export interface PinOptions {
  category: string;
  isSaved?: boolean;
  friendAvatars?: string[];
  popularScore?: number;
  isDarkMode?: boolean;
}

/**
 * Creates a custom SVG marker for Google Maps with category icon
 */
export const createCustomPin = (options: PinOptions): string => {
  // For now, return a simple data URL since we're using direct assets
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iIzAwN2NmZiIvPjwvc3ZnPgo=';
};

// Map category to asset URL (transparent background)
const getCategoryAsset = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes('hotel')) return hotelIcon;
  if (c.includes('cafe') || c.includes('café') || c.includes('coffee')) return cafeIcon;
  if (c.includes('bar') || c.includes('pub')) return barIcon;
  if (c.includes('entertain')) return entertainmentIcon;
  if (c.includes('restaurant') || c.includes('food') || c.includes('dining')) return restaurantIcon;
  return restaurantIcon;
};

/**
 * Creates a Google Maps marker with custom pin
 */
export const createCustomMarker = (
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  options: PinOptions
): google.maps.Marker => {
  const assetUrl = getCategoryAsset(options.category);
  const icon: google.maps.Icon = {
    url: assetUrl,
    scaledSize: new google.maps.Size(40, 40),
    anchor: new google.maps.Point(20, 20),
  };
  
  return new google.maps.Marker({
    map,
    position,
    icon,
    animation: google.maps.Animation.DROP,
  });
};
