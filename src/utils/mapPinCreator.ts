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
  isRecommended?: boolean;
  recommendationScore?: number;
}

/**
 * Get circle fill color based on recommendation score (1-10)
 */
const getScoreColor = (score: number): string => {
  // Score 1-3: Red
  if (score < 3.5) return '#EF4444';
  // Score 3.5-5: Orange
  if (score < 5.5) return '#F97316';
  // Score 5.5-7: Yellow
  if (score < 7.5) return '#EAB308';
  // Score 7.5-9: Light Green
  if (score < 9) return '#84CC16';
  // Score 9-10: Green
  return '#22C55E';
};

/**
 * Creates a custom SVG marker for Google Maps with category icon inside a pin
 */
export const createCustomPin = (options: PinOptions): string => {
  const { category, isSaved, isRecommended, recommendationScore } = options;
  const assetUrl = getCategoryAsset(category);
  const stroke = isSaved ? '#2D6CF6' : '#CBD5E1';

  // For recommended pins, show score instead of icon
  if (isRecommended && recommendationScore !== undefined) {
    const score = Math.min(10, Math.max(0, recommendationScore)); // Clamp between 0-10
    const fillColor = getScoreColor(score);
    const displayScore = score.toFixed(1);

    const svg = `
      <svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.2"/>
          </filter>
        </defs>
        <g filter="url(#shadow)">
          <path d="M14 2c6.627 0 12 5.373 12 12 0 8-12 20-12 20S2 22 2 14C2 7.373 7.373 2 14 2z" fill="#FFFFFF" stroke="${stroke}" stroke-width="1.5"/>
          <circle cx="14" cy="14" r="8" fill="${fillColor}" stroke="${stroke}" stroke-width="1"/>
          <text x="14" y="17" font-family="Arial, sans-serif" font-size="7" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${displayScore}</text>
        </g>
      </svg>`;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  // Regular pin with category icon
  const svg = `
    <svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.2"/>
        </filter>
        <clipPath id="circleClip">
          <circle cx="14" cy="14" r="6.5" />
        </clipPath>
      </defs>
      <g filter="url(#shadow)">
        <path d="M14 2c6.627 0 12 5.373 12 12 0 8-12 20-12 20S2 22 2 14C2 7.373 7.373 2 14 2z" fill="#FFFFFF" stroke="${stroke}" stroke-width="1.5"/>
        <circle cx="14" cy="14" r="7.5" fill="#FFFFFF" stroke="${stroke}" stroke-width="1"/>
        <g clip-path="url(#circleClip)">
          <image href="${assetUrl}" x="7.5" y="7.5" width="13" height="13" preserveAspectRatio="xMidYMid meet"/>
        </g>
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
