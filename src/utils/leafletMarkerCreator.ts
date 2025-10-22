import L from 'leaflet';

interface MarkerOptions {
  category: string;
  isSaved?: boolean;
  isRecommended?: boolean;
  recommendationScore?: number;
  friendAvatars?: string[];
  isDarkMode?: boolean;
}

// SVG icon paths for categories (copied from lucide-react)
const getCategoryIconSvg = (category: string): string => {
  const categoryLower = category.toLowerCase();
  
  switch (categoryLower) {
    case 'restaurant':
    case 'food':
    case 'dining':
      return '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
    case 'hotel':
    case 'accommodation':
    case 'lodging':
      return '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2 M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2 M10 6h4 M10 10h4 M10 14h4 M10 18h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
    case 'cafe':
    case 'coffee':
    case 'coffee shop':
      return '<path d="M10 2v2 M14 2v2 M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
    case 'shopping':
    case 'shop':
    case 'store':
    case 'mall':
      return '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z M3 6h18 M16 10a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
    case 'bar':
    case 'nightlife':
    case 'club':
      return '<path d="M9 18V5l12-2v13 M6 14v4 M18 8v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="6" cy="20" r="2" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="18" cy="14" r="2" stroke="currentColor" stroke-width="2" fill="none"/>';
    case 'attraction':
    case 'landmark':
    case 'sightseeing':
      return '<path d="M14.5 4h-5L7 14 M12 6v8 M12 14l3 8 M12 14l-3 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="12" cy="2" r="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M2 12h20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    case 'gym':
    case 'fitness':
    case 'sports':
      return '<path d="M14.4 14.4 9.6 9.6 M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z M21.5 21.5l-1.4-1.4 M3.9 3.9 2.5 2.5 M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
    case 'museum':
    case 'gallery':
    case 'cultural':
      return '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20 M6 2v4 M8 2v4 M10 2v4 M12 2v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
    default:
      return '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
  }
};

export const createLeafletCustomMarker = (options: MarkerOptions): L.DivIcon => {
  const { category, isSaved, isRecommended, recommendationScore = 0, isDarkMode } = options;
  
  // Get category icon SVG
  const iconSvg = getCategoryIconSvg(category);
  
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
  
  // Create custom marker HTML - smaller size
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
      <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25));">
        <path d="M16 0C9.373 0 4 5.373 4 12c0 6.627 12 28 12 28s12-21.373 12-28C28 5.373 22.627 0 16 0z" 
              fill="${pinColor}"/>
        <circle cx="16" cy="12" r="6" fill="white"/>
      </svg>
      
      <!-- Category icon -->
      <svg width="12" height="12" viewBox="0 0 24 24" style="
        position: absolute;
        top: 6px;
        left: 10px;
        color: ${pinColor};
      ">
        ${iconSvg}
      </svg>
      
      <!-- Recommendation badge -->
      ${isRecommended && recommendationScore > 70 ? `
        <div style="
          position: absolute;
          top: -3px;
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
