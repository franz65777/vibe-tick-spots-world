import L from 'leaflet';
import { getCategoryImage } from '@/utils/categoryIcons';

interface MarkerOptions {
  category: string;
  name?: string;
  isSaved?: boolean;
  isRecommended?: boolean;
  recommendationScore?: number;
  friendAvatars?: string[];
  isDarkMode?: boolean;
  hasCampaign?: boolean;
  sharedByUserAvatar?: string | null;
  sharedByUsers?: Array<{ id: string; avatar_url: string | null; username: string }>;
  onSharersClick?: () => void;
  isSelected?: boolean;
}

export const createLeafletCustomMarker = (options: MarkerOptions): L.DivIcon => {
  const { category, name, isSaved, isRecommended, isDarkMode, hasCampaign, sharedByUserAvatar, sharedByUsers, isSelected = false } = options;
  
  // Get category image
  const categoryImg = getCategoryImage(category);
  
  // Sizes based on selected state - like Forêt app
  const size = isSelected ? 56 : 40;
  const baseIconSize = isSelected ? 28 : 20;
  const borderWidth = isSelected ? 3 : 2;
  
  // Category-specific icon size multipliers (some icons have too much padding)
  const categoryLower = category.toLowerCase();
  let iconSizeMultiplier = 1;
  if (categoryLower === 'restaurant' || categoryLower === 'food' || categoryLower === 'dining') {
    iconSizeMultiplier = 1.4; // Restaurant icons need to be bigger
  } else if (categoryLower === 'hotel' || categoryLower === 'accommodation' || categoryLower === 'lodging') {
    iconSizeMultiplier = 1.15; // Hotel slightly bigger
  }
  const iconSize = Math.round(baseIconSize * iconSizeMultiplier);
  
  // Background color based on dark mode
  const bgColor = isDarkMode ? '#2a2a2a' : 'white';
  const borderColor = isSelected 
    ? (isDarkMode ? '#ffffff' : '#1a1a1a') 
    : (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)');
  
  // User avatar overlay for shared locations - support multiple users
  let avatarOverlay = '';
  
  if (sharedByUsers && sharedByUsers.length > 0) {
    const firstUser = sharedByUsers[0];
    const hasMultiple = sharedByUsers.length > 1;
    const avatarUrl = firstUser.avatar_url || '';
    
    avatarOverlay = `
      <div class="location-sharers-badge" style="
        position: absolute;
        top: -4px;
        right: -4px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        overflow: hidden;
        background: white;
        z-index: 20;
        cursor: ${hasMultiple ? 'pointer' : 'default'};
      ">
        <img 
          src="${avatarUrl}" 
          alt="User"
          style="width: 100%; height: 100%; object-fit: cover;"
          onerror="this.parentElement.style.background='#9333EA'; this.style.display='none';"
        />
        ${hasMultiple ? `
          <div style="
            position: absolute;
            bottom: -3px;
            right: -3px;
            background: #FF4757;
            color: white;
            border-radius: 50%;
            width: 14px;
            height: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-weight: 800;
            border: 2px solid white;
          ">+</div>
        ` : ''}
      </div>
    `;
  } else if (sharedByUserAvatar) {
    avatarOverlay = `
      <div style="
        position: absolute;
        top: -4px;
        right: -4px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        overflow: hidden;
        background: white;
        z-index: 20;
      ">
        <img 
          src="${sharedByUserAvatar}" 
          alt="User"
          style="width: 100%; height: 100%; object-fit: cover;"
          onerror="this.parentElement.style.background='#9333EA'; this.style.display='none';"
        />
      </div>
    `;
  }
  
  // Campaign sparkle effect
  const campaignEffect = hasCampaign ? `
    <div style="
      position: absolute;
      top: -3px;
      right: -3px;
      width: 12px;
      height: 12px;
      background: linear-gradient(135deg, #FFD700, #FFA500);
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      animation: campaign-pulse 2s ease-in-out infinite;
    "></div>
  ` : '';

  // Selected state pointer (small triangle at bottom pointing down)
  const selectedPointer = isSelected ? `
    <div style="
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 10px solid ${bgColor};
      filter: drop-shadow(0 2px 2px rgba(0,0,0,0.15));
    "></div>
  ` : '';
  // Truncate name for display (max ~20 chars)
  const displayName = name ? (name.length > 18 ? name.substring(0, 18) + '...' : name) : '';
  const textColor = isDarkMode ? '#e2e8f0' : '#1f2937';
  
  // Calculate total width for label positioning
  const labelOffset = size / 2 + 4;
  
  // Create simple circular marker with name label like the reference image
  const markerHtml = `
    <div class="custom-leaflet-marker ${isSelected ? 'selected' : ''}" style="
      position: relative; 
      width: ${size}px; 
      height: ${size + (isSelected ? 10 : 0)}px;
      ${isSelected ? 'filter: drop-shadow(0 8px 16px rgba(0,0,0,0.3));' : ''}
    ">
      ${avatarOverlay}
      ${campaignEffect}
      
      <!-- Main circular pin -->
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${bgColor};
        border: ${borderWidth}px solid ${borderColor};
        box-shadow: ${isSelected 
          ? '0 8px 24px rgba(0,0,0,0.35), 0 4px 8px rgba(0,0,0,0.2)' 
          : '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)'};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        ${isSelected ? 'transform: scale(1.05);' : ''}
      ">
        <img 
          src="${categoryImg}" 
          alt="${category}"
          style="
            width: ${iconSize}px;
            height: ${iconSize}px;
            object-fit: contain;
          "
        />
      </div>
      
      ${selectedPointer}
      
      <!-- Name label -->
      ${displayName ? `
        <div style="
          position: absolute;
          left: ${labelOffset}px;
          top: 50%;
          transform: translateY(-50%);
          white-space: nowrap;
          pointer-events: none;
          display: flex;
          align-items: center;
        ">
          <span style="
            font-size: ${isSelected ? '11px' : '10px'};
            font-weight: ${isSelected ? '600' : '500'};
            color: ${textColor};
            text-shadow: 
              -1px -1px 0 ${isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)'},
              1px -1px 0 ${isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)'},
              -1px 1px 0 ${isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)'},
              1px 1px 0 ${isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)'};
            letter-spacing: -0.01em;
          ">${displayName}</span>
        </div>
      ` : ''}
    </div>
    
    <style>
      .custom-leaflet-marker {
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .custom-leaflet-marker:hover:not(.selected) {
        transform: scale(1.1);
      }
      .custom-leaflet-marker.selected {
        z-index: 1000 !important;
      }
      
      @keyframes campaign-pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.2);
          opacity: 0.8;
        }
      }
    </style>
  `;
  
  // Calculate icon size including label width
  const estimatedLabelWidth = displayName ? displayName.length * 6 + 10 : 0;
  const totalWidth = size + estimatedLabelWidth;
  
  return L.divIcon({
    html: markerHtml,
    className: 'custom-leaflet-icon',
    iconSize: [totalWidth, size + (isSelected ? 10 : 0)],
    iconAnchor: [size / 2, size + (isSelected ? 10 : 0)],
    popupAnchor: [0, -(size + (isSelected ? 10 : 0))],
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
      <!-- Direction cone - wide at top (away from person), narrows to point at bottom (near person) -->
      <!-- Solid at bottom near person, fades to transparent at the wide end -->
      <div class="direction-cone" style="
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%) rotate(${rotation}deg);
        transform-origin: center ${personCenterY}px;
        width: ${baseConeWidth * 2}px;
        height: ${baseConeHeight}px;
        background: linear-gradient(to top, rgba(66, 133, 244, 0.6) 0%, rgba(66, 133, 244, 0.4) 30%, rgba(66, 133, 244, 0.15) 70%, rgba(66, 133, 244, 0) 100%);
        clip-path: polygon(0% 0%, 100% 0%, 50% 100%);
        filter: blur(${0.5 * scale}px);
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
