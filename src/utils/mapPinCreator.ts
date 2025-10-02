import { getCategoryIcon } from './categoryIcons';

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
  const { category, isSaved, friendAvatars = [], popularScore, isDarkMode } = options;
  
  const pinColor = isSaved ? '#0E7C86' : (isDarkMode ? '#374151' : '#ffffff');
  const iconColor = isSaved ? '#ffffff' : '#0E7C86';
  const glowColor = isSaved ? 'rgba(14, 124, 134, 0.4)' : 'transparent';
  
  // Get category icon name
  const iconMap: Record<string, string> = {
    restaurant: '🍴',
    food: '🍴',
    cafe: '☕',
    coffee: '☕',
    bar: '🍺',
    nightlife: '🎶',
    club: '🎶',
    museum: '🏛️',
    gallery: '🎨',
    park: '🌳',
    nature: '🌳',
    attraction: '📸',
    landmark: '📸',
  };
  
  const emoji = iconMap[category.toLowerCase()] || '📍';
  
  // Create SVG
  const svg = `
    <svg width="48" height="60" viewBox="0 0 48 60" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${isSaved ? `
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        ` : ''}
      </defs>
      
      <!-- Glow effect for saved pins -->
      ${isSaved ? `<circle cx="24" cy="24" r="20" fill="${glowColor}" filter="url(#glow)"/>` : ''}
      
      <!-- Main pin circle -->
      <circle cx="24" cy="24" r="16" fill="${pinColor}" stroke="${iconColor}" stroke-width="2" 
        ${isSaved ? 'filter="url(#glow)"' : ''}
      />
      
      <!-- Category emoji -->
      <text x="24" y="30" text-anchor="middle" font-size="18">${emoji}</text>
      
      <!-- Popular score badge -->
      ${popularScore ? `
        <circle cx="38" cy="14" r="10" fill="#fbbf24" stroke="#ffffff" stroke-width="2"/>
        <text x="38" y="18" text-anchor="middle" font-size="9" font-weight="bold" fill="#1f2937">${popularScore}</text>
      ` : ''}
      
      <!-- Friend avatars badge -->
      ${friendAvatars.length > 0 ? `
        <circle cx="10" cy="14" r="8" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
        <text x="10" y="17" text-anchor="middle" font-size="8" font-weight="bold" fill="#ffffff">${friendAvatars.length}</text>
      ` : ''}
      
      <!-- Pin tail -->
      <path d="M 24 40 L 24 55 L 24 40" stroke="${iconColor}" stroke-width="2" fill="none"/>
    </svg>
  `;
  
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
  const icon = {
    url: createCustomPin(options),
    scaledSize: new google.maps.Size(48, 60),
    anchor: new google.maps.Point(24, 55),
  };
  
  return new google.maps.Marker({
    map,
    position,
    icon,
    animation: google.maps.Animation.DROP,
  });
};
