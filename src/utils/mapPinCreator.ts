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
  
  const pinColor = isSaved ? 'hsl(var(--primary))' : (isDarkMode ? '#374151' : '#ffffff');
  const strokeColor = isSaved ? '#ffffff' : 'hsl(var(--primary))';
  const glowColor = isSaved ? 'rgba(14, 124, 134, 0.4)' : 'transparent';
  
  // Better category icon mapping
  const iconMap: Record<string, string> = {
    restaurant: '🍴',
    food: '🍴',
    cafe: '☕',
    café: '☕',
    coffee: '☕',
    bakery: '🥐',
    bar: '🍺',
    'bar & pub': '🍺',
    nightlife: '🎶',
    club: '🎶',
    museum: '🏛️',
    gallery: '🎨',
    hotel: '🏨',
    entertainment: '🎭',
    park: '🌳',
    nature: '🌳',
    attraction: '📸',
    landmark: '📸',
  };
  
  const emoji = iconMap[category.toLowerCase()] || '📍';
  
  // Create SVG with larger size
  const svg = `
    <svg width="56" height="70" viewBox="0 0 56 70" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${isSaved ? `
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        ` : ''}
        <filter id="shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Glow effect for saved pins -->
      ${isSaved ? `<circle cx="28" cy="28" r="24" fill="${glowColor}" filter="url(#glow)"/>` : ''}
      
      <!-- Main pin circle with shadow -->
      <circle cx="28" cy="28" r="20" fill="${pinColor}" stroke="${strokeColor}" stroke-width="2.5" 
        filter="url(#shadow)"
      />
      
      <!-- Category emoji - larger -->
      <text x="28" y="35" text-anchor="middle" font-size="22">${emoji}</text>
      
      <!-- Popular score badge -->
      ${popularScore ? `
        <circle cx="44" cy="16" r="11" fill="#fbbf24" stroke="#ffffff" stroke-width="2.5"/>
        <text x="44" y="20" text-anchor="middle" font-size="10" font-weight="bold" fill="#1f2937">${popularScore}</text>
      ` : ''}
      
      <!-- Friend avatars badge -->
      ${friendAvatars.length > 0 ? `
        <circle cx="12" cy="16" r="10" fill="#10b981" stroke="#ffffff" stroke-width="2.5"/>
        <text x="12" y="20" text-anchor="middle" font-size="9" font-weight="bold" fill="#ffffff">${friendAvatars.length}</text>
      ` : ''}
      
      <!-- Pin tail - more prominent -->
      <path d="M 28 48 L 28 65" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="28" cy="65" r="2" fill="${strokeColor}"/>
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
    scaledSize: new google.maps.Size(56, 70),
    anchor: new google.maps.Point(28, 65),
  };
  
  return new google.maps.Marker({
    map,
    position,
    icon,
    animation: google.maps.Animation.DROP,
  });
};
