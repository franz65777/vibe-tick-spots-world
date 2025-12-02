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
  hasCampaign?: boolean;
  sharedByUserAvatar?: string | null;
  sharedByUsers?: Array<{ id: string; avatar_url: string | null; username: string }>;
  onSharersClick?: () => void;
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
  const { category, isSaved, isRecommended, recommendationScore = 0, isDarkMode, hasCampaign, sharedByUserAvatar, sharedByUsers } = options;
  
  // Get category image
  const categoryImg = getCategoryImage(category);
  
  // Determine pin color based on state
  let pinColor = '#EF4444'; // red for popular (default)
  let ringColor = 'rgba(239, 68, 68, 0.3)';
  
  // Purple for shared locations
  const hasSharedUsers = (sharedByUsers && sharedByUsers.length > 0) || sharedByUserAvatar;
  if (hasSharedUsers) {
    pinColor = '#9333EA'; // purple for shared
    ringColor = 'rgba(147, 51, 234, 0.3)';
  } else if (isSaved) {
    pinColor = '#10B981'; // green for saved
    ringColor = 'rgba(16, 185, 129, 0.3)';
  } else if (isRecommended) {
    pinColor = '#3B82F6'; // blue for following/recommended
    ringColor = 'rgba(59, 130, 246, 0.3)';
  }
  
  // User avatar overlay for shared locations - support multiple users
  let avatarOverlay = '';
  
  if (sharedByUsers && sharedByUsers.length > 0) {
    const firstUser = sharedByUsers[0];
    const hasMultiple = sharedByUsers.length > 1;
    const avatarUrl = firstUser.avatar_url || '';
    
    avatarOverlay = `
      <!-- User avatar badge -->
      <div class="location-sharers-badge" style="
        position: absolute;
        top: -6px;
        right: -6px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
        overflow: hidden;
        background: white;
        z-index: 20;
        cursor: ${hasMultiple ? 'pointer' : 'default'};
      ">
        <img 
          src="${avatarUrl}" 
          alt="User"
          style="
            width: 100%;
            height: 100%;
            object-fit: cover;
          "
          onerror="this.parentElement.style.background='#9333EA'; this.style.display='none';"
        />
        ${hasMultiple ? `
          <div style="
            position: absolute;
            bottom: -4px;
            right: -4px;
            background: linear-gradient(135deg, #FF6B6B 0%, #FF4757 100%);
            color: white;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 800;
            border: 2.5px solid white;
            box-shadow: 0 3px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.1);
            font-family: system-ui, -apple-system, sans-serif;
          ">+</div>
        ` : ''}
      </div>
    `;
  } else if (sharedByUserAvatar) {
    avatarOverlay = `
      <!-- User avatar badge -->
      <div style="
        position: absolute;
        top: -6px;
        right: -6px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
        overflow: hidden;
        background: white;
        z-index: 20;
      ">
        <img 
          src="${sharedByUserAvatar}" 
          alt="User"
          style="
            width: 100%;
            height: 100%;
            object-fit: cover;
          "
          onerror="this.parentElement.style.background='#9333EA'; this.style.display='none';"
        />
      </div>
    `;
  }
  
  // Campaign sparkle effect - 5 sparkles max, closer to pin
  const campaignEffect = hasCampaign ? `
    <!-- Animated sparkle effect for campaigns -->
    <div class="campaign-sparkle" style="
      position: absolute;
      top: -4px;
      left: -4px;
      width: 44px;
      height: 52px;
      pointer-events: none;
    ">
      <!-- Top center -->
      <div class="sparkle sparkle-1" style="
        position: absolute;
        top: -2px;
        left: 18px;
        width: 7px;
        height: 7px;
        background: linear-gradient(135deg, #FFD700, #FFA500);
        border-radius: 50%;
        animation: sparkle-float 1.8s ease-in-out infinite;
      "></div>
      <!-- Top right -->
      <div class="sparkle sparkle-2" style="
        position: absolute;
        top: 2px;
        right: 4px;
        width: 5px;
        height: 5px;
        background: linear-gradient(135deg, #FF6B6B, #FF8E53);
        border-radius: 50%;
        animation: sparkle-float 1.8s ease-in-out 0.3s infinite;
      "></div>
      <!-- Top left -->
      <div class="sparkle sparkle-3" style="
        position: absolute;
        top: 2px;
        left: 4px;
        width: 5px;
        height: 5px;
        background: linear-gradient(135deg, #4ECDC4, #44A08D);
        border-radius: 50%;
        animation: sparkle-float 1.8s ease-in-out 0.6s infinite;
      "></div>
      <!-- Side left -->
      <div class="sparkle sparkle-4" style="
        position: absolute;
        top: 12px;
        left: 0px;
        width: 6px;
        height: 6px;
        background: linear-gradient(135deg, #A8E6CF, #FFD3B6);
        border-radius: 50%;
        animation: sparkle-float 1.8s ease-in-out 0.9s infinite;
      "></div>
      <!-- Side right -->
      <div class="sparkle sparkle-5" style="
        position: absolute;
        top: 12px;
        right: 0px;
        width: 6px;
        height: 6px;
        background: linear-gradient(135deg, #FFD700, #FFA500);
        border-radius: 50%;
        animation: sparkle-float 1.8s ease-in-out 1.2s infinite;
      "></div>
    </div>
    
    <!-- Pulsing glow ring -->
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, transparent 70%);
      animation: campaign-pulse 2s ease-in-out infinite;
    "></div>
  ` : '';
  
  // Create custom marker HTML with larger icon and subtle design
  const markerHtml = `
    <div class="custom-leaflet-marker" style="position: relative; width: 36px; height: 44px;">
      ${avatarOverlay}
      ${campaignEffect}
      
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
      
      <!-- Larger category icon (perfectly fits inside the white circle) -->
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
          border-radius: 50%;
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
      
      @keyframes sparkle-float {
        0%, 100% {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
        25% {
          transform: translateY(-8px) scale(1.2);
          opacity: 0.8;
        }
        50% {
          transform: translateY(-12px) scale(1);
          opacity: 0.6;
        }
        75% {
          transform: translateY(-6px) scale(1.1);
          opacity: 0.9;
        }
      }
      
      @keyframes campaign-pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 0.6;
        }
        50% {
          transform: scale(1.3);
          opacity: 0.3;
        }
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

export const createCurrentLocationMarker = (heading?: number, scale: number = 1): L.DivIcon => {
  // Default heading to 0 (north) if not provided
  const rotation = heading ?? 0;
  
  // Scale sizes based on zoom level
  const basePersonSize = 40 * scale;
  const baseConeWidth = 24 * scale;
  const baseConeHeight = 50 * scale;
  const containerWidth = 60 * scale;
  // Cone overlaps with person icon now
  const coneOverlap = 12 * scale;
  const containerHeight = baseConeHeight + basePersonSize - coneOverlap;
  
  // Person center should be the anchor point (adjusted for overlap)
  const personTop = baseConeHeight - coneOverlap;
  const personCenterY = personTop + (basePersonSize / 2);
  
  const markerHtml = `
    <div style="position: relative; width: ${containerWidth}px; height: ${containerHeight}px;">
      <!-- Direction cone - wide at top (near person), narrows to point at bottom (away) -->
      <div class="direction-cone" style="
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%) rotate(${rotation}deg);
        transform-origin: center ${personCenterY}px;
        width: ${baseConeWidth * 2}px;
        height: ${baseConeHeight}px;
        background: linear-gradient(to bottom, rgba(66, 133, 244, 0.5) 0%, rgba(66, 133, 244, 0.3) 40%, rgba(66, 133, 244, 0.1) 70%, rgba(66, 133, 244, 0) 100%);
        clip-path: polygon(0% 0%, 100% 0%, 50% 100%);
        filter: blur(${1 * scale}px);
        z-index: 5;
      "></div>
      
      <!-- Person icon from top view -->
      <div style="
        position: absolute;
        top: ${personTop}px;
        left: 50%;
        transform: translateX(-50%) rotate(${rotation}deg);
        width: ${basePersonSize}px;
        height: ${basePersonSize}px;
        z-index: 10;
      ">
        <img 
          src="/images/location-person.png" 
          alt="Your location" 
          style="
            width: 100%;
            height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          "
        />
      </div>
    </div>
  `;
  
  return L.divIcon({
    html: markerHtml,
    className: 'current-location-marker',
    iconSize: [containerWidth, containerHeight],
    iconAnchor: [containerWidth / 2, personCenterY],
  });
};
