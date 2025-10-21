import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { getCategoryIcon } from './categoryIcons';

interface MarkerOptions {
  category: string;
  isSaved?: boolean;
  isRecommended?: boolean;
  recommendationScore?: number;
  friendAvatars?: string[];
  isDarkMode?: boolean;
}

export const createLeafletCustomMarker = (options: MarkerOptions): L.DivIcon => {
  const { category, isSaved, isRecommended, recommendationScore = 0, isDarkMode } = options;
  
  // Get category icon
  const IconComponent = getCategoryIcon(category);
  const iconSvg = renderToString(<IconComponent className="w-4 h-4" />);
  
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
  
  // Create custom marker HTML
  const markerHtml = `
    <div class="custom-leaflet-marker" style="position: relative; width: 40px; height: 50px;">
      <!-- Animated ring for recommended places -->
      ${isRecommended ? `
        <div style="
          position: absolute;
          top: 8px;
          left: 8px;
          width: 24px;
          height: 24px;
          border: 2px solid ${ringColor};
          border-radius: 50%;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        "></div>
      ` : ''}
      
      <!-- Main pin -->
      <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <path d="M20 0C11.716 0 5 6.716 5 15c0 8.284 15 35 15 35s15-26.716 15-35C35 6.716 28.284 0 20 0z" 
              fill="${pinColor}"/>
        <circle cx="20" cy="15" r="8" fill="white"/>
      </svg>
      
      <!-- Category icon -->
      <div style="
        position: absolute;
        top: 7px;
        left: 12px;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${pinColor};
      ">
        ${iconSvg}
      </div>
      
      <!-- Recommendation badge -->
      ${isRecommended && recommendationScore > 70 ? `
        <div style="
          position: absolute;
          top: -4px;
          right: 4px;
          background: #10B981;
          color: white;
          border-radius: 9999px;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
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
        transform: scale(1.1);
      }
    </style>
  `;
  
  return L.divIcon({
    html: markerHtml,
    className: 'custom-leaflet-icon',
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -50],
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
