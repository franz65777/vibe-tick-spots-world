import React, { useMemo } from 'react';

import { getCategoryImage } from '@/utils/categoryIcons';
import CityLabel from '@/components/common/CityLabel';
import { normalizeCategoryToBase } from '@/utils/normalizeCategoryToBase';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface PlaceMessageCardProps {
  placeData: {
    id?: string;
    place_id?: string;
    name: string;
    category: string;
    address?: string;
    city?: string;
    image?: string;
    image_url?: string;
    photos?: unknown;
    coordinates?: { lat: number; lng: number };
    latitude?: number;
    longitude?: number;
    google_place_id?: string;
  };
  onViewPlace: (place: any) => void;
  overlayMode?: boolean;
}

// Helper to extract the first photo URL from the locations.photos JSONB column
const extractFirstPhotoUrl = (photos: unknown): string | null => {
  if (!photos) return null;
  const arr = Array.isArray(photos) ? photos : null;
  if (!arr) return null;
  for (const item of arr) {
    if (typeof item === 'string' && item.trim()) return item;
    if (item && typeof item === 'object') {
      const anyItem = item as any;
      const url = anyItem.url || anyItem.photo_url || anyItem.src;
      if (typeof url === 'string' && url.trim()) return url;
    }
  }
  return null;
};

// Determine which thumbnail to show: 1) business photo  2) Google photo  3) null (fallback to icon)
const getLocationThumbnail = (placeData: PlaceMessageCardProps['placeData']): string | null => {
  if (placeData.image_url) return placeData.image_url;
  if (placeData.image) return placeData.image;
  const googlePhoto = extractFirstPhotoUrl(placeData.photos);
  if (googlePhoto) return googlePhoto;
  return null;
};

const PlaceMessageCard = ({ placeData, onViewPlace, overlayMode = false }: PlaceMessageCardProps) => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const categoryImage = getCategoryImage(placeData.category);
  const thumbnail = getLocationThumbnail(placeData);
  
  // Normalize category for translation lookup (handles variants like "Park", "parks", "bar & pub")
  // Use useMemo with i18n.language to ensure re-computation when language changes
  const translatedCategory = useMemo(() => {
    const categoryKey =
      normalizeCategoryToBase(placeData.category) ??
      String(placeData.category ?? '').trim().toLowerCase();

    if (!categoryKey) return placeData.category || 'Place';
    
    // Try to get translation - if key doesn't exist, i18next returns the key itself
    const translated = t(`categories.${categoryKey}`);
    
    // If translation equals the key path, it means translation wasn't found - use original
    if (translated === `categories.${categoryKey}`) {
      return placeData.category || 'Place';
    }
    
    return translated;
  }, [placeData.category, t, i18n.language]);

  const handleViewLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Prefer parent-provided handler so it can include routing context (e.g., returnToUserId)
    if (onViewPlace) {
      onViewPlace(placeData);
      return;
    }
    // Fallback navigation if no handler is provided
    navigate('/', { 
      state: { 
        showLocationCard: true,
        locationData: placeData,
        fromMessages: true
      } 
    });
  };

  return (
    <div 
      onClick={handleViewLocation}
      className="bg-accent/50 backdrop-blur-sm rounded-2xl overflow-hidden cursor-pointer hover:bg-accent/70 transition-all duration-200 active:scale-[0.98] max-w-[260px] shadow-sm"
    >
      {/* Photo section - increased height */}
      <div className="relative w-full h-32 bg-muted overflow-hidden">
        {thumbnail ? (
          <>
            <img 
              src={thumbnail} 
              alt={placeData.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <img 
              src={categoryImage} 
              alt={placeData.category}
              className="w-14 h-14 object-contain opacity-70"
            />
          </div>
        )}
      </div>
      
      {/* Compact info section */}
      <div className="p-2.5">
        <h4 className="font-semibold text-sm text-foreground leading-tight line-clamp-1">
          {placeData.name}
        </h4>
        
        <div className={`flex items-center gap-1.5 text-xs ${overlayMode ? 'text-white/80' : 'text-muted-foreground'} mt-0.5`}>
          {(placeData.city || placeData.address || placeData.coordinates) && (
            <span className="truncate">
              <CityLabel 
                id={placeData.google_place_id || placeData.id}
                city={placeData.city}
                address={placeData.address}
                coordinates={placeData.coordinates}
              />
            </span>
          )}
          <span className={overlayMode ? 'text-white/50' : 'text-muted-foreground/50'}>•</span>
          <span className="capitalize shrink-0">{translatedCategory}</span>
        </div>
      </div>
    </div>
  );
};

export default PlaceMessageCard;
