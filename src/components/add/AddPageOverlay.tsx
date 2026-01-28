import React, { memo, useCallback, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Loader2 } from 'lucide-react';
import OptimizedPlacesAutocomplete, { SearchResult } from '@/components/OptimizedPlacesAutocomplete';
import { useTranslation } from 'react-i18next';
import addPageHero from '@/assets/add-hero-cards.png';
import { Geolocation } from '@capacitor/geolocation';
import { getCategoryImage } from '@/utils/categoryIcons';

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
  const [hasSearchResults, setHasSearchResults] = useState(false);
  
  // State for externally rendered results
  const [searchData, setSearchData] = useState<{
    query: string;
    isLoading: boolean;
    results: SearchResult[];
    isSearching: boolean;
  }>({ query: '', isLoading: false, results: [], isSearching: false });

  // Handle results data from autocomplete
  const handleResultsDataChange = useCallback((data: {
    query: string;
    isLoading: boolean;
    results: SearchResult[];
    isSearching: boolean;
  }) => {
    setSearchData(data);
  }, []);

  // Handle place selection from external list
  const handlePlaceSelect = useCallback((result: SearchResult) => {
    if (result.lat && result.lng) {
      onLocationSelected({
        name: result.name,
        latitude: result.lat,
        longitude: result.lng,
        category: result.category || 'place',
        google_place_id: result.google_place_id,
      });
    }
  }, [onLocationSelected]);

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

  // Handle results change from autocomplete
  const handleResultsChange = useCallback((hasResults: boolean, isSearching: boolean) => {
    setHasSearchResults(hasResults && isSearching);
  }, []);

  // Ref to track if this overlay set the data-modal-open attribute
  const didSetModalOpenRef = useRef(false);

  // Manage data-modal-open - only reacts to isOpen changes
  useEffect(() => {
    if (isOpen) {
      didSetModalOpenRef.current = true;
      document.body.setAttribute('data-modal-open', 'true');
      window.dispatchEvent(new CustomEvent('ui:overlay-open'));
      // Close other overlays to prevent stacking
      window.dispatchEvent(new CustomEvent('close-search-drawer'));
      window.dispatchEvent(new CustomEvent('close-filter-dropdown'));
      window.dispatchEvent(new CustomEvent('close-city-selector'));
      window.dispatchEvent(new CustomEvent('close-list-view'));
    } else if (didSetModalOpenRef.current) {
      didSetModalOpenRef.current = false;
      document.body.removeAttribute('data-modal-open');
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    }
  }, [isOpen]);

  // Escape key handler - separate to avoid interference with data-modal-open
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (didSetModalOpenRef.current) {
        document.body.removeAttribute('data-modal-open');
        window.dispatchEvent(new CustomEvent('ui:overlay-close'));
      }
    };
  }, []);

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
            className="flex-1 flex items-center gap-3 h-12 px-4 rounded-full bg-black dark:bg-white/90 backdrop-blur-md"
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
                className="w-full [&_input]:h-8 [&_input]:bg-transparent [&_input]:border-none 
                           [&_input]:text-white [&_input]:dark:text-gray-900 
                           [&_input]:placeholder:text-white/60 [&_input]:dark:placeholder:text-gray-500
                           [&_input]:p-0 [&_input]:focus-visible:ring-0 [&_input]:focus-visible:ring-offset-0
                           [&_input]:shadow-none [&_input]:outline-none"
                onResultsChange={handleResultsChange}
                hideDropdown={true}
                onResultsDataChange={handleResultsDataChange}
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

      {/* Full-width search results - rendered at overlay level */}
      {searchData.isSearching && (searchData.results.length > 0 || searchData.isLoading) && (
        <div className="px-3 mt-2 max-h-[70vh] overflow-y-auto scrollbar-hide z-[2147483641]">
          {searchData.isLoading && searchData.results.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {searchData.results.map((result) => {
            const displayImage = result.image_url 
              || (result.photos && result.photos[0]) 
              || getCategoryImage(result.category || 'restaurant');
            const isRealPhoto = !!(result.image_url || (result.photos && result.photos.length > 0));
            
            return (
              <button
                key={result.id}
                onClick={() => handlePlaceSelect(result)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/40 dark:hover:bg-white/10 
                           active:bg-white/60 dark:active:bg-white/20 transition-colors text-left
                           border-b border-black/5 dark:border-white/10"
              >
                <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-muted/20">
                  <img 
                    src={displayImage}
                    alt={result.category || 'place'}
                    className={`w-full h-full ${isRealPhoto ? 'object-cover' : 'object-contain p-1'}`}
                    loading="eager"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-foreground truncate">
                    {result.name}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {result.address || result.city || ''}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* No results message */}
      {searchData.isSearching && !searchData.isLoading && searchData.results.length === 0 && (
        <div className="px-3 mt-8 text-center">
          <MapPin className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            {t('noPlacesFound', { ns: 'add', defaultValue: 'Nessun luogo trovato per' })} "{searchData.query}"
          </p>
        </div>
      )}

      {/* Hero Content - hidden when search has results */}
      {!hasSearchResults && (
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
      )}

      {/* Empty space when showing search results - provides clean backdrop */}
      {hasSearchResults && (
        <div className="flex-1" />
      )}
    </div>
  );

  return createPortal(overlay, document.body);
});

AddPageOverlay.displayName = 'AddPageOverlay';

export default AddPageOverlay;
