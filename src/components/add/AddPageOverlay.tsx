import React, { memo, useCallback, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin } from 'lucide-react';
import OptimizedPlacesAutocomplete, { SearchResult } from '@/components/OptimizedPlacesAutocomplete';
import { useTranslation } from 'react-i18next';
import addPageHero from '@/assets/add-hero-cards.png';
import { Geolocation } from '@capacitor/geolocation';
import { getCategoryImage } from '@/utils/categoryIcons';
import { haptics } from '@/utils/haptics';
import SearchResultsSkeleton from '@/components/common/skeletons/SearchResultsSkeleton';
import { useNavigate } from 'react-router-dom';
import { SocialImportTutorial } from './SocialImportTutorial';
import { GoogleMapsImportModal } from '@/components/list/GoogleMapsImportModal';
import { toast } from 'sonner';

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
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasSearchResults, setHasSearchResults] = useState(false);
  const [showSocialTutorial, setShowSocialTutorial] = useState(false);
  const [showGoogleMapsModal, setShowGoogleMapsModal] = useState(false);
  
  // State for externally rendered results
  const [searchData, setSearchData] = useState<{
    query: string;
    isLoading: boolean;
    results: SearchResult[];
    isSearching: boolean;
  }>({ query: '', isLoading: false, results: [], isSearching: false });
  
  const handleGoogleMapsImport = useCallback((places: any[]) => {
    toast.success(t('placesImported', { ns: 'createList', count: places.length, defaultValue: '{{count}} places imported' }));
    onClose();
    navigate('/create-list');
  }, [t, onClose, navigate]);

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
    haptics.selection();
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
      haptics.impact('light');
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

  // Listen for close-add-overlay event from LocationContributionModal
  useEffect(() => {
    const handleCloseAddOverlay = () => {
      onClose();
    };
    
    window.addEventListener('close-add-overlay', handleCloseAddOverlay);
    return () => window.removeEventListener('close-add-overlay', handleCloseAddOverlay);
  }, [onClose]);

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
            onClick={() => {
              haptics.impact('medium');
              onClose();
            }}
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
            <SearchResultsSkeleton mode="locations" />
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

            {/* Import/Create Section - Horizontal Cards */}
            <div className="w-full max-w-sm mt-8 animate-fade-in-up-delay-2">
              <div className="grid grid-cols-3 gap-3">
                {/* Import from Instagram/TikTok */}
                <button
                  onClick={() => {
                    haptics.impact('light');
                    setShowSocialTutorial(true);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all active:scale-[0.97]"
                >
                  <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center relative overflow-hidden">
                    {/* Instagram gradient icon */}
                    <svg viewBox="0 0 24 24" className="w-8 h-8 absolute -left-0.5">
                      <defs>
                        <linearGradient id="ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#FFDC80" />
                          <stop offset="50%" stopColor="#F56040" />
                          <stop offset="100%" stopColor="#833AB4" />
                        </linearGradient>
                      </defs>
                      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-gradient)" />
                      <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5" fill="none" />
                      <circle cx="17.5" cy="6.5" r="1.5" fill="white" />
                    </svg>
                    {/* TikTok icon */}
                    <svg viewBox="0 0 24 24" className="w-7 h-7 absolute -right-1 top-1">
                      <rect x="2" y="2" width="20" height="20" rx="5" fill="#000" />
                      <path d="M16.5 8.5c-1.5 0-2.5-1-2.5-2.5V5h-2v9c0 1.4-1.1 2.5-2.5 2.5S7 15.4 7 14s1.1-2.5 2.5-2.5c.3 0 .5 0 .8.1v-2c-.3 0-.5-.1-.8-.1C7 9.5 5 11.5 5 14s2 4.5 4.5 4.5S14 16.5 14 14V9.5c.8.5 1.8.8 2.8.8h.2V8.5h-.5z" fill="#25F4EE"/>
                      <path d="M15.5 8.5c-1.5 0-2.5-1-2.5-2.5V5h-2v9c0 1.4-1.1 2.5-2.5 2.5S6 15.4 6 14s1.1-2.5 2.5-2.5c.3 0 .5 0 .8.1v-2c-.3 0-.5-.1-.8-.1C6 9.5 4 11.5 4 14s2 4.5 4.5 4.5S13 16.5 13 14V9.5c.8.5 1.8.8 2.8.8h.2V8.5h-.5z" fill="#FE2C55"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-center leading-tight text-muted-foreground">
                    {t('importIgTiktok', { ns: 'add', defaultValue: 'import ig & tiktok' })}
                  </span>
                </button>

                {/* Import from Google Maps */}
                <button
                  onClick={() => {
                    haptics.impact('light');
                    setShowGoogleMapsModal(true);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all active:scale-[0.97]"
                >
                  <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <svg viewBox="0 0 48 48" className="w-10 h-10">
                      <path fill="#48b564" d="M35.76,26.36h0.01c0,0-3.77,5.53-6.94,9.64c-2.74,3.55-3.54,6.59-3.77,8.06C24.97,44.6,24.53,45,24,45s-0.97-0.4-1.06-0.94c-0.23-1.47-1.03-4.51-3.77-8.06c-0.42-0.55-0.85-1.12-1.28-1.7L28.24,22l8.33-9.88C37.49,14.05,38,16,38,18C38,21.09,37.2,23.97,35.76,26.36z"/>
                      <path fill="#fcc60e" d="M28.24,22L17.89,34.3c-2.82-3.78-5.66-7.94-5.66-7.94h0.01c-0.3-0.48-0.57-0.97-0.8-1.48L19.76,15c-0.79,0.95-1.26,2.17-1.26,3.5c0,3.04,2.46,5.5,5.5,5.5C25.71,24,27.24,23.22,28.24,22z"/>
                      <path fill="#2c85eb" d="M28.4,4.74l-8.57,10.18L13.27,9.2C15.83,6.02,19.69,4,24,4C25.54,4,27.02,4.26,28.4,4.74z"/>
                      <path fill="#ed5748" d="M19.83,14.92L28.4,4.74c3.84,1.29,7.01,4.09,8.76,7.7c0.21,0.44,0.4,0.88,0.56,1.34L24,24c-3.04,0-5.5-2.46-5.5-5.5C18.5,17.09,18.97,15.87,19.76,14.92z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-center leading-tight text-muted-foreground">
                    {t('importGmaps', { ns: 'add', defaultValue: 'import gmaps list' })}
                  </span>
                </button>

                {/* Make a List */}
                <button
                  onClick={() => {
                    haptics.impact('light');
                    onClose();
                    navigate('/create-list');
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all active:scale-[0.97]"
                >
                  <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center relative overflow-hidden">
                    {/* Two overlapping list card images */}
                    <div className="absolute w-8 h-10 rounded-md -left-0.5 top-0.5 rotate-[-8deg] shadow-sm" style={{ background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)' }}>
                      <div className="absolute bottom-1 left-1 right-1 text-[5px] font-bold text-amber-800 truncate">matcha</div>
                    </div>
                    <div className="absolute w-8 h-10 rounded-md right-0 bottom-0.5 rotate-[6deg] shadow-sm" style={{ background: 'linear-gradient(135deg, #93C5FD 0%, #3B82F6 100%)' }}>
                      <div className="absolute bottom-1 left-1 right-1 text-[5px] font-bold text-blue-900 truncate">tokyo</div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-center leading-tight text-muted-foreground">
                    {t('makeAList', { ns: 'add', defaultValue: 'make a list' })}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty space when showing search results - provides clean backdrop */}
      {hasSearchResults && (
        <div className="flex-1" />
      )}

      {/* Social Import Tutorial Modal */}
      <SocialImportTutorial 
        open={showSocialTutorial} 
        onClose={() => setShowSocialTutorial(false)} 
      />

      {/* Google Maps Import Modal */}
      <GoogleMapsImportModal 
        isOpen={showGoogleMapsModal}
        onClose={() => setShowGoogleMapsModal(false)}
        onImport={handleGoogleMapsImport}
      />
    </div>
  );

  return createPortal(overlay, document.body);
});

AddPageOverlay.displayName = 'AddPageOverlay';

export default AddPageOverlay;
