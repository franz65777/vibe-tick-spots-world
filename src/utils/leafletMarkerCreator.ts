import L from 'leaflet';
import hotel from '@/assets/category-hotel-transparent.png';
import cafe from '@/assets/category-cafe-transparent.png';
import bar from '@/assets/category-bar-transparent.png';
import restaurant from '@/assets/category-restaurant-transparent.png';
import entertainment from '@/assets/category-entertainment-transparent.png';
import museum from '@/assets/category-museum-upload.png';
import bakery from '@/assets/category-bakery-bar-museum.png';

interface MarkerOptions {
  category: string;
  isSaved?: boolean;
  isRecommended?: boolean;
  recommendationScore?: number;
  friendAvatars?: string[];
  isDarkMode?: boolean;
}

// Get category image path
const getCategoryImage = (category: string): string => {
  const categoryLower = category.toLowerCase();
  
  switch (categoryLower) {
    case 'bakery':
      return bakery;
    case 'bar':
    case 'bar & pub':
    case 'nightlife':
    case 'club':
      return bar;
    case 'museum':
    case 'gallery':
    case 'cultural':
      return museum;
    case 'hotel':
    case 'accommodation':
    case 'lodging':
      return hotel;
    case 'cafe':
    case 'café':
    case 'coffee':
    case 'coffee shop':
      return cafe;
    case 'restaurant':
    case 'food':
    case 'dining':
      return restaurant;
    case 'entertainment':
    case 'attraction':
    case 'landmark':
    case 'sightseeing':
      return entertainment;
    default:
      return restaurant;
  }
};

export const createLeafletCustomMarker = (options: MarkerOptions): L.DivIcon => {
  const { category, isSaved, isRecommended, recommendationScore = 0, isDarkMode } = options;
  
  // Get category image
  const categoryImg = getCategoryImage(category);
  
  // Determine pin color based on filter/state
  let pinColor = '#EF4444'; // red for popular (default)
  let ringColor = 'rgba(239, 68, 68, 0.3)';
  let iconColor = '#EF4444'; // Match icon color to pin
  
  if (isSaved) {
    pinColor = '#10B981'; // green for saved
    ringColor = 'rgba(16, 185, 129, 0.3)';
    iconColor = '#10B981';
  } else if (isRecommended) {
    pinColor = '#3B82F6'; // blue for following/recommended
    ringColor = 'rgba(59, 130, 246, 0.3)';
    iconColor = '#3B82F6';
  }
  
  // Create custom marker HTML with larger icon and subtle design
  const markerHtml = `
    <div class="custom-leaflet-marker" style="position: relative; width: 36px; height: 44px;">
      <!-- Subtle shadow ring -->
      <div style="
        position: absolute;
        top: 8px;
        left: 8px;
        width: 20px;
        height: 20px;
        background: ${ringColor};
        border-radius: 50%;
        filter: blur(4px);
      "></div>
      
      <!-- Main pin with minimal design -->
      <svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.2));">
        <path d="M18 2C11.373 2 6 7.373 6 14c0 7.074 12 26 12 26s12-18.926 12-26C30 7.373 24.627 2 18 2z" 
              fill="${pinColor}"
              opacity="0.95"/>
        <circle cx="18" cy="14" r="9" fill="white" opacity="0.98"/>
      </svg>
      
      <!-- Larger category icon with color filter -->
      <img 
        src="${categoryImg}" 
        alt="${category}"
        style="
          position: absolute;
          top: 5px;
          left: 9px;
          width: 18px;
          height: 18px;
          object-fit: contain;
          filter: brightness(0) saturate(100%) invert(0%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%);
        "
      />
    </div>
    
    <style>
      .custom-leaflet-marker {
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .custom-leaflet-marker:hover {
        transform: scale(1.1) translateY(-2px);
      }
    </style>
  `;
  
  return L.divIcon({
    html: markerHtml,
    className: 'custom-leaflet-icon',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });
};

export const createCurrentLocationMarker = (): L.DivIcon => {
  const markerHtml = `
    <div style="position: relative; width: 24px; height: 24px;">
      <!-- Pulsing outer circle -->
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        width: 24px;
        height: 24px;
        background: rgba(66, 133, 244, 0.2);
        border: 2px solid rgba(66, 133, 244, 0.5);
        border-radius: 50%;
        animation: pulse-location 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      "></div>
      
      <!-- Inner dot -->
      <div style="
        position: absolute;
        top: 6px;
        left: 6px;
        width: 12px;
        height: 12px;
        background: #4285F4;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    </div>
    
    <style>
      @keyframes pulse-location {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.5);
          opacity: 0.5;
        }
        100% {
          transform: scale(2);
          opacity: 0;
        }
      }
    </style>
  `;
  
  return L.divIcon({
    html: markerHtml,
    className: 'current-location-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};
