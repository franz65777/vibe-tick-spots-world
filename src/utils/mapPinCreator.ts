import hotelIcon from '@/assets/category-hotel-upload.png';
import cafeIcon from '@/assets/category-cafe-upload.png';
import barIcon from '@/assets/category-bar-upload.png';
import restaurantIcon from '@/assets/category-restaurant-upload.png';
import entertainmentIcon from '@/assets/category-entertainment-upload.png';
import bakeryIcon from '@/assets/category-bakery-upload.png';
import museumIcon from '@/assets/category-museum-upload.png';

// Map category to asset URL (new 3D icons)
const getCategoryAsset = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes('hotel')) return hotelIcon;
  if (c.includes('cafe') || c.includes('café') || c.includes('coffee')) return cafeIcon;
  if (c.includes('bar') || c.includes('pub')) return barIcon;
  if (c.includes('entertain')) return entertainmentIcon;
  if (c.includes('restaurant') || c.includes('food') || c.includes('dining')) return restaurantIcon;
  if (c.includes('bakery')) return bakeryIcon;
  if (c.includes('museum')) return museumIcon;
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
    <svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip">
          <circle cx="14" cy="14" r="8" />
        </clipPath>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.2"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <path d="M14 2c6.627 0 12 5.373 12 12 0 8-12 20-12 20S2 22 2 14C2 7.373 7.373 2 14 2z" fill="#FFFFFF" stroke="${stroke}" stroke-width="1.5"/>
        <circle cx="14" cy="14" r="8" fill="#FFFFFF" stroke="${stroke}" stroke-width="1"/>
        <image href="${assetUrl}" x="8" y="8" width="12" height="12" preserveAspectRatio="xMidYMid meet" clip-path="url(#clip)"/>
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
    scaledSize: new google.maps.Size(28, 38),
    anchor: new google.maps.Point(14, 36),
  };
  
  return new google.maps.Marker({
    map,
    position,
    icon,
    animation: google.maps.Animation.DROP,
  });
};
