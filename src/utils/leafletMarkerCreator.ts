import L from 'leaflet';
import { getCategoryImage } from '@/utils/categoryIcons';

// Import campaign type icons
import trendingIcon from '@/assets/foam-finger.png';
import discountIcon from '@/assets/discount-icon.png';
import eventIcon from '@/assets/event-icon.png';
import promotionIcon from '@/assets/filter-promotion.png';
import newIcon from '@/assets/new-icon.png';

// Get campaign icon based on campaign type
const getCampaignIcon = (campaignType?: string): string => {
  switch (campaignType?.toLowerCase()) {
    case 'discount':
      return discountIcon;
    case 'event':
      return eventIcon;
    case 'promotion':
      return promotionIcon;
    case 'new':
      return newIcon;
    case 'trending':
    default:
      return trendingIcon;
  }
};

interface MarkerOptions {
  category: string;
  name?: string;
  isSaved?: boolean;
  isRecommended?: boolean;
  recommendationScore?: number;
  friendAvatars?: string[];
  isDarkMode?: boolean;
  hasCampaign?: boolean;
  campaignType?: string;
  sharedByUserAvatar?: string | null;
  sharedByUsers?: Array<{ id: string; avatar_url: string | null; username: string }>;
  onSharersClick?: () => void;
  isSelected?: boolean;
  // Friends filter mode - avatar as pin center
  friendsFilterMode?: boolean;
  friendAvatar?: string | null;
  friendUsername?: string;
  friendAction?: 'saved' | 'liked' | 'faved' | 'posted';
}

export const createLeafletCustomMarker = (options: MarkerOptions): L.DivIcon => {
  const { 
    category, name, isSaved, isRecommended, isDarkMode, hasCampaign, campaignType, 
    sharedByUserAvatar, sharedByUsers, isSelected = false,
    friendsFilterMode = false, friendAvatar, friendUsername, friendAction
  } = options;
  
  // Get category image
  const categoryImg = getCategoryImage(category);
  
  // Get campaign icon based on type
  const campaignIcon = getCampaignIcon(campaignType);
  
  // ========== FRIENDS FILTER MODE ==========
  // Show avatar with category badge, @username (italic) and location name below
  if (friendsFilterMode && friendUsername) {
    const size = isSelected ? 48 : 40;
    const avatarSize = size;
    const badgeSize = 18;
    const bgColor = isDarkMode ? '#2a2a2a' : 'white';
    const textColor = isDarkMode ? '#e2e8f0' : '#1f2937';
    const mutedTextColor = isDarkMode ? '#94a3b8' : '#6b7280';
    
    // Location name for friends filter
    const friendDisplayName = name && name.length > 25 ? name.substring(0, 22) + '...' : name;
    const initial = (friendUsername[0] || 'U').toUpperCase();
    const hasAvatar = !!friendAvatar;
    
    const markerHtml = `
      <div class="friend-filter-marker" style="
        position: relative;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 6px;
        ${isSelected ? 'filter: drop-shadow(0 8px 16px rgba(0,0,0,0.3));' : ''}
      ">
        <!-- Avatar with category badge -->
        <div style="position: relative; flex-shrink: 0;">
          <!-- Main avatar -->
          <div style="
            width: ${avatarSize}px;
            height: ${avatarSize}px;
            border-radius: 50%;
            border: 3px solid ${bgColor};
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            overflow: hidden;
            background: #9333EA;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${hasAvatar 
              ? `<img 
                  src="${friendAvatar}" 
                  alt="${friendUsername}"
                  style="width: 100%; height: 100%; object-fit: cover;"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                />
                <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">${initial}</div>`
              : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">${initial}</div>`
            }
          </div>
          
          <!-- Category badge top-left -->
          <div style="
            position: absolute;
            top: -3px;
            left: -3px;
            width: ${badgeSize}px;
            height: ${badgeSize}px;
            border-radius: 50%;
            background: ${bgColor};
            border: 2px solid ${bgColor};
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
          ">
            <img src="${categoryImg}" alt="${category}" style="width: 12px; height: 12px; object-fit: contain;" />
          </div>
        </div>
        
        <!-- Labels: @username (italic) + location name -->
        <div style="
          max-width: 100px;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          gap: 0px;
        ">
          <span style="
            font-size: 9px;
            font-style: italic;
            font-weight: 500;
            color: ${mutedTextColor};
            line-height: 1.2;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-shadow: 
              -1px -1px 0 ${isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.95)'},
              1px -1px 0 ${isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.95)'},
              -1px 1px 0 ${isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.95)'},
              1px 1px 0 ${isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.95)'};
          ">@${friendUsername}</span>
          ${friendDisplayName ? `
            <span style="
              font-size: ${isSelected ? '11px' : '10px'};
              font-weight: 700;
              color: ${textColor};
              line-height: 1.2;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
              text-shadow: 
                -1px -1px 0 ${isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.95)'},
                1px -1px 0 ${isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.95)'},
                -1px 1px 0 ${isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.95)'},
                1px 1px 0 ${isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.95)'},
                0 0 4px ${isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)'};
            ">${friendDisplayName}</span>
          ` : ''}
        </div>
      </div>
    `;
    
    return L.divIcon({
      html: markerHtml,
      className: 'custom-leaflet-icon friend-mode',
      iconSize: [avatarSize + 110, avatarSize + 10],
      iconAnchor: [avatarSize / 2, avatarSize / 2],
      popupAnchor: [0, -avatarSize / 2],
    });
  }
  
  // ========== SELECTED MODE (SIMPLIFIED - NO ACTIVITY BUBBLE) ==========
  // Activity stack is now shown as a separate component above PinDetailCard
  
  // ========== DEFAULT MODE ==========
  
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
  
  // Border color - show special color when saved
  const savedBorderColor = '#3b82f6'; // Blue color for saved markers
  const borderColor = isSaved 
    ? savedBorderColor
    : isSelected 
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
  
  // Campaign effect - small campaign type badge at bottom-right corner
  const campaignEffect = hasCampaign ? `
    <div class="campaign-badge" style="
      position: absolute;
      bottom: -6px;
      right: -6px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: white;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: campaign-flame-pulse 1.5s ease-in-out infinite;
      z-index: 100;
    ">
      <img src="${campaignIcon}" alt="" style="width: 16px; height: 16px; object-fit: contain;" />
    </div>
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
  // Display name - no truncation, allow up to 2 lines
  const displayName = name || '';
  const textColor = isDarkMode ? '#e2e8f0' : '#1f2937';
  
  // Create simple circular marker with name label to the RIGHT like the reference
  const markerHtml = `
    <div class="custom-leaflet-marker ${isSelected ? 'selected' : ''}" style="
      position: relative; 
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 6px;
      ${isSelected ? 'filter: drop-shadow(0 8px 16px rgba(0,0,0,0.3));' : ''}
    ">
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
        flex-shrink: 0;
        position: relative;
        transition: all 0.2s ease;
        ${isSelected ? 'transform: scale(1.05);' : ''}
      ">
        ${avatarOverlay}
        ${campaignEffect}
        <img 
          src="${categoryImg}" 
          alt="${category}"
          style="
            width: ${iconSize}px;
            height: ${iconSize}px;
            object-fit: contain;
          "
        />
        ${selectedPointer}
      </div>
      
      <!-- Name label to the right -->
      ${displayName ? `
        <div style="
          max-width: 100px;
          pointer-events: none;
        ">
          <span style="
            font-size: ${isSelected ? '11px' : '10px'};
            font-weight: 700;
            color: ${textColor};
            line-height: 1.25;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-shadow: 
              -1px -1px 0 ${isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.95)'},
              1px -1px 0 ${isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.95)'},
              -1px 1px 0 ${isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.95)'},
              1px 1px 0 ${isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.95)'},
              0 0 4px ${isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)'};
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
      
      @keyframes campaign-flame-pulse {
        0%, 100% {
          transform: scale(1);
          box-shadow: 0 2px 6px rgba(255,69,0,0.5);
        }
        50% {
          transform: scale(1.15);
          box-shadow: 0 3px 10px rgba(255,69,0,0.7);
        }
      }
    </style>
  `;
  
  // Calculate total width including label
  const labelWidth = displayName ? 106 : 0; // 100px max + 6px gap
  const totalWidth = size + labelWidth;
  
  return L.divIcon({
    html: markerHtml,
    className: 'custom-leaflet-icon',
    iconSize: [totalWidth, size + (isSelected ? 10 : 0)],
    iconAnchor: [size / 2, (size + (isSelected ? 10 : 0)) / 2],
    popupAnchor: [0, -size / 2],
  });
};

export const createCurrentLocationMarker = (heading?: number, scale: number = 1, animate: boolean = false): L.DivIcon => {
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
  
  // Animation class for drop-in effect
  const animationClass = animate ? 'user-location-drop-in' : '';
  
  const markerHtml = `
    <div class="${animationClass}" style="position: relative; width: ${containerWidth}px; height: ${containerHeight}px;">
      <!-- Landing shadow - only visible during animation -->
      ${animate ? `
        <div class="landing-shadow" style="
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: ${basePersonSize * 0.8}px;
          height: ${basePersonSize * 0.3}px;
          background: radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 70%);
          border-radius: 50%;
          animation: shadow-grow 0.8s ease-out forwards;
        "></div>
      ` : ''}
      
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
    
    <style>
      @keyframes user-drop-in {
        0% {
          transform: scale(3) translateY(-30px);
          opacity: 0;
          filter: blur(4px);
        }
        15% {
          opacity: 1;
          filter: blur(2px);
        }
        50% {
          transform: scale(1.5) translateY(0);
          filter: blur(0);
        }
        75% {
          transform: scale(0.9) translateY(5px);
        }
        90% {
          transform: scale(1.05) translateY(-2px);
        }
        100% {
          transform: scale(1) translateY(0);
          filter: blur(0);
        }
      }
      
      @keyframes shadow-grow {
        0% {
          opacity: 0;
          transform: translateX(-50%) scale(0.1);
        }
        40% {
          opacity: 0.2;
          transform: translateX(-50%) scale(0.5);
        }
        70% {
          opacity: 0.5;
          transform: translateX(-50%) scale(1.2);
        }
        85% {
          opacity: 0.4;
          transform: translateX(-50%) scale(0.9);
        }
        100% {
          opacity: 0;
          transform: translateX(-50%) scale(1);
        }
      }
      
      .user-location-drop-in {
        animation: user-drop-in 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }
    </style>
  `;
  
  return L.divIcon({
    html: markerHtml,
    className: 'current-location-marker',
    iconSize: [containerWidth, containerHeight],
    iconAnchor: [containerWidth / 2, personCenterY],
  });
};
