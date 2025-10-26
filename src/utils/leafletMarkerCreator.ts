import L from 'leaflet';
import hotel from '@/assets/category-hotel-upload.png';
import cafe from '@/assets/category-cafe-upload.png';
import bar from '@/assets/category-bar-upload.png';
import restaurant from '@/assets/category-restaurant-upload.png';
import entertainment from '@/assets/category-entertainment-upload.png';
import bakery from '@/assets/category-bakery-upload.png';
import museum from '@/assets/category-museum-upload.png';

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
  
  // Determine pin color based on state
  let pinColor = '#EF4444'; // default red
  let ringColor = '#FCA5A5';
  
  if (isSaved) {
    pinColor = '#3B82F6'; // blue for saved
    ringColor = '#93C5FD';
  } else if (isRecommended && recommendationScore > 70) {
    pinColor = '#10B981'; // green for highly recommended
    ringColor = '#6EE7B7';
  } else if (isRecommended) {
    pinColor = '#F59E0B'; // amber for recommended
    ringColor = '#FCD34D';
  }
  
  // Create custom marker HTML with category image inside
  const markerHtml = `
    <div class="custom-leaflet-marker" style="position: relative; width: 32px; height: 40px;">
      <!-- Animated ring for recommended places -->
      ${isRecommended ? `
        <div style="
          position: absolute;
          top: 6px;
          left: 6px;
          width: 20px;
          height: 20px;
          border: 2px solid ${ringColor};
          border-radius: 50%;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        "></div>
      ` : ''}
      
      <!-- Main pin -->
      <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <path d="M16 0C9.373 0 4 5.373 4 12c0 7.074 12 28 12 28s12-20.926 12-28C28 5.373 22.627 0 16 0z" 
              fill="${pinColor}"/>
        <circle cx="16" cy="12" r="7" fill="white"/>
      </svg>
      
      <!-- Category image inside pin -->
      <img 
        src="${categoryImg}" 
        alt="${category}"
        style="
          position: absolute;
          top: 4px;
          left: 8px;
          width: 16px;
          height: 16px;
          object-fit: contain;
        "
      />
      
      <!-- Recommendation badge -->
      ${isRecommended && recommendationScore > 70 ? `
        <div style="
          position: absolute;
          top: -2px;
          right: 3px;
          background: #10B981;
          color: white;
          border-radius: 9999px;
          width: 14px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: bold;
          box-shadow: 0 1px 2px rgba(0,0,0,0.3);
        ">★</div>
      ` : ''}
    </div>
    
    <style>
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.5;
          transform: scale(1.2);
        }
      }
      .custom-leaflet-marker {
        cursor: pointer;
        transition: transform 0.2s;
      }
      .custom-leaflet-marker:hover {
        transform: scale(1.15);
      }
    </style>
  `;
  
  return L.divIcon({
    html: markerHtml,
    className: 'custom-leaflet-icon',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
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
