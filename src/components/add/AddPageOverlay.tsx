import React, { memo, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import OptimizedPlacesAutocomplete from '@/components/OptimizedPlacesAutocomplete';
import { useTranslation } from 'react-i18next';
import addPageHero from '@/assets/add-hero-cards.png';
import { Geolocation } from '@capacitor/geolocation';

interface SelectedLocation {
  id?: string;
  name: string;
  google_place_id?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
}

interface AddPageOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelected: (location: SelectedLocation) => void;
}

const AddPageOverlay = memo(({ isOpen, onClose, onLocationSelected }: AddPageOverlayProps) => {
  const { t } = useTranslation();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user location for better search results
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: false });
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      } catch (err) {
        console.log('Could not get user location for search bias');
      }
    };
    
    if (isOpen) {
      getUserLocation();
    }
  }, [isOpen]);

  // Handle location selection from search
  const handleLocationSelect = useCallback((place: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    city: string;
    nominatimType?: string;
    nominatimClass?: string;
    category?: string;
    isCity?: boolean;
  }) => {
    // Don't allow cities to be selected - only specific locations
    if (place.isCity) {
      return;
    }

    onLocationSelected({
      name: place.name,
      latitude: place.coordinates.lat,
      longitude: place.coordinates.lng,
      category: place.category || 'place',
    });
  }, [onLocationSelected]);

  // Handle escape key to close and close other overlays when opening
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Hide bottom navigation
      window.dispatchEvent(new CustomEvent('ui:overlay-open'));
      // Close other overlays to prevent stacking
      window.dispatchEvent(new CustomEvent('close-search-drawer'));
      window.dispatchEvent(new CustomEvent('close-filter-dropdown'));
      window.dispatchEvent(new CustomEvent('close-city-selector'));
      window.dispatchEvent(new CustomEvent('close-list-view'));
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const overlay = (
    <div className="fixed inset-0 z-[2147483640] flex flex-col bg-background/40 backdrop-blur-xl">
      {/* Header - matching pin header style */}
      <header 
        className="sticky top-0 z-10"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Search pill button - like pin header */}
          <div
            className="flex-1 flex items-center gap-3 h-12 px-4 rounded-full bg-black dark:bg-white/90 backdrop-blur-md border border-border/10"
          >
            <span className="text-lg leading-none">🔍</span>
            <div className="flex-1">
              <OptimizedPlacesAutocomplete
                onPlaceSelect={(place) => {
                  // Don't allow cities to be selected
                  if (place.isCity) return;
                  
                  onLocationSelected({
                    name: place.name,
                    latitude: place.coordinates.lat,
                    longitude: place.coordinates.lng,
                    category: place.category || 'place',
                    google_place_id: place.google_place_id,
                  });
                }}
                userLocation={userLocation}
                placeholder={t('searchForPlace', { ns: 'add' })}
                className="w-full [&_input]:h-8 [&_input]:bg-transparent [&_input]:border-0 
                           [&_input]:text-white [&_input]:dark:text-gray-900 
                           [&_input]:placeholder:text-white/60 [&_input]:dark:placeholder:text-gray-500
                           [&_input]:p-0 [&_input]:focus-visible:ring-0"
              />
            </div>
          </div>
          
          {/* Close button - circular X like pin header */}
          <button 
            onClick={onClose}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-black/80 dark:bg-white/80 backdrop-blur-md border border-border/30 rounded-full text-white dark:text-gray-900 hover:bg-black/90 dark:hover:bg-white/90 transition-all duration-200 active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Hero Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center px-6 pt-12 pb-24">
          {/* Hero Image with floating animation */}
          <div className="relative w-full flex items-center justify-center animate-fade-in-up">
            <div className="w-80 h-52 flex items-center justify-center animate-hero-float">
              <img 
                src={addPageHero} 
                alt="Share experience" 
                className="w-full h-full object-contain drop-shadow-xl" 
              />
            </div>
          </div>
          
          {/* Typography */}
          <div className="text-center space-y-2 mt-6 animate-fade-in-up-delay-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {t('shareExperience', { ns: 'add' })}
            </h2>
            <p className="text-muted-foreground/80 text-sm max-w-xs">
              {t('addPhotosVideos', { ns: 'add' })}
            </p>
          </div>

          {/* Hint text */}
          <p className="text-center text-xs text-muted-foreground/60 mt-8 max-w-[280px] animate-fade-in-up-delay-2">
            {t('searchToContribute', { ns: 'add', defaultValue: 'Cerca un posto per aggiungere foto, descrizioni o salvarlo nelle tue liste' })}
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
});

AddPageOverlay.displayName = 'AddPageOverlay';

export default AddPageOverlay;
