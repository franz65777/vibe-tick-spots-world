import hotelIcon from '@/assets/category-hotel-transparent.png';
import cafeIcon from '@/assets/category-cafe-transparent.png';
import barIcon from '@/assets/category-bar-transparent.png';
import restaurantIcon from '@/assets/category-restaurant-transparent.png';
import entertainmentIcon from '@/assets/category-entertainment-transparent.png';

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

export interface PinOptions {
  category: string;
  isSaved?: boolean;
  friendAvatars?: string[];
  popularScore?: number;
  isDarkMode?: boolean;
}

/**
 * Creates a custom SVG marker for Google Maps with category icon inside a pin
 */
export const createCustomPin = (options: PinOptions): string => {
  const { category, isSaved } = options;
  const assetUrl = getCategoryAsset(category);
  const stroke = isSaved ? '#2D6CF6' : '#CBD5E1';

  const svg = `
    <svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip">
          <circle cx="20" cy="20" r="12" />
        </clipPath>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <path d="M20 2c9.94 0 18 8.06 18 18 0 12-18 30-18 30S2 32 2 20C2 10.06 10.06 2 20 2z" fill="#FFFFFF" stroke="${stroke}" stroke-width="2"/>
        <circle cx="20" cy="20" r="12" fill="#FFFFFF" stroke="${stroke}" stroke-width="1.5"/>
        <image href="${assetUrl}" x="8" y="8" width="24" height="24" preserveAspectRatio="xMidYMid meet" clip-path="url(#clip)"/>
      </g>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

/**
 * Creates a Google Maps marker with custom pin
 */
export const createCustomMarker = (
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  options: PinOptions
): google.maps.Marker => {
  const icon: google.maps.Icon = {
    url: createCustomPin(options),
    scaledSize: new google.maps.Size(40, 52),
    anchor: new google.maps.Point(20, 50),
  };
  
  return new google.maps.Marker({
    map,
    position,
    icon,
    animation: google.maps.Animation.DROP,
  });
};
