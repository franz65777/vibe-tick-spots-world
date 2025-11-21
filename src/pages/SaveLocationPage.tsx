import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UnifiedSearchAutocomplete from '@/components/UnifiedSearchAutocomplete';
import PinDetailCard from '@/components/explore/PinDetailCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const SaveLocationPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [isFocused, setIsFocused] = useState(true); // Auto-focus on mount
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePlaceSelect = async (place: any) => {
    console.log('Place selected:', place);
    
    // Check if location exists in database
    const { data: existingLocation } = await supabase
      .from('locations')
      .select('*')
      .or(`name.eq.${place.name},google_place_id.eq.${place.place_id || ''}`)
      .limit(1)
      .maybeSingle();

    let locationToShow = existingLocation;

    // If location doesn't exist, create it temporarily
    if (!existingLocation) {
      const { data: newLocation, error } = await supabase
        .from('locations')
        .insert({
          name: place.name,
          address: place.address,
          latitude: place.coordinates.lat,
          longitude: place.coordinates.lng,
          category: place.category || 'restaurant',
          city: place.city,
          created_by: user?.id,
          pioneer_user_id: user?.id,
        })
        .select()
        .single();

      if (!error && newLocation) {
        locationToShow = newLocation;
      }
    }

    // Show PinDetailCard with the location
    setSelectedPlace({
      id: locationToShow?.id,
      google_place_id: locationToShow?.google_place_id,
      name: locationToShow?.name || place.name,
      address: locationToShow?.address || place.address,
      category: locationToShow?.category || place.category || 'restaurant',
      city: locationToShow?.city || place.city,
      coordinates: {
        lat: locationToShow?.latitude || place.coordinates.lat,
        lng: locationToShow?.longitude || place.coordinates.lng,
      },
    });
  };

  const handleOutsideClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      setIsFocused(false);
    }
  };

  const handleScroll = () => {
    setIsScrolling(true);
    setIsFocused(false);
  };

  return (
    <>
      {/* Main Page with Search */}
      <div 
        ref={containerRef}
        onClick={handleOutsideClick}
        className="fixed inset-0 bg-background z-[10001] flex flex-col pt-[25px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-accent rounded-full transition-colors flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold truncate">
              {t('navigation:addLocation', { defaultValue: 'Aggiungi luogo' })}
            </h2>
          </div>
        </div>

        {/* Search Input - Positioned based on focus state */}
        <div 
          className={cn(
            "px-4 transition-all duration-300",
            isFocused && !isScrolling ? "mt-[30vh]" : "fixed bottom-24 left-0 right-0",
            isScrolling && "opacity-0 pointer-events-none"
          )}
        >
          <UnifiedSearchAutocomplete
            onPlaceSelect={handlePlaceSelect}
            placeholder={t('common:searchLocationPlaceholder', { defaultValue: 'Cerca ristoranti, bar, hotel...' })}
            autoFocus={true}
            onFocus={() => {
              setIsFocused(true);
              setIsScrolling(false);
            }}
            onScroll={handleScroll}
            showCategoryIcons={true}
          />
        </div>
      </div>

      {/* PinDetailCard */}
      {selectedPlace && (
        <PinDetailCard
          place={selectedPlace}
          onClose={() => {
            setSelectedPlace(null);
            navigate(-1);
          }}
        />
      )}
    </>
  );
};

export default SaveLocationPage;
