
import React, { useState, useEffect, useRef } from 'react';
import LeafletMapSetup from '@/components/LeafletMapSetup';
import MapCategoryFilters from './MapCategoryFilters';
import SearchDrawer from './SearchDrawer';
import { cn } from '@/lib/utils';
import { LocationShareModal } from '../explore/LocationShareModal';
import { useMapLocations } from '@/hooks/useMapLocations';
import { useMapFilter } from '@/contexts/MapFilterContext';
import { Place } from '@/types/place';
import { PinShareData } from '@/services/pinSharingService';
import { List } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { categoryDisplayNames, type AllowedCategory } from '@/utils/allowedCategories';
import ActiveSharesListSheet from './ActiveSharesListSheet';

import { useTranslation } from 'react-i18next';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { formatDetailedAddress, formatSearchResultAddress } from '@/utils/addressFormatter';

interface MapSectionProps {
  mapCenter: { lat: number; lng: number };
  currentCity: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  initialSelectedPlace?: Place | null;
  onClearInitialPlace?: () => void;
  recenterToken?: number;
  onCitySelect?: (city: string, coords: { lat: number; lng: number }) => void;
  fromMessages?: boolean;
  onBackToMessages?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isCenteredOnUser?: boolean;
  onCenterStatusChange?: (isCentered: boolean) => void;
  onOpenSearchOverlay?: () => void;
  onSearchDrawerStateChange?: (isOpen: boolean) => void;
  onSelectedPlaceChange?: (place: Place | null) => void;
  registerCloseSelectedPlace?: (closeFn: () => void) => void;
  onMapCenterChange?: (center: { lat: number; lng: number }) => void;
  registerReopenSearchDrawer?: (reopenFn: () => void) => void;
}

const MapSection = ({ 
  mapCenter, 
  currentCity, 
  isExpanded = false, 
  onToggleExpand,
  initialSelectedPlace,
  onClearInitialPlace,
  recenterToken,
  onCitySelect,
  fromMessages,
  onBackToMessages,
  searchQuery = '',
  onSearchChange,
  isCenteredOnUser = false,
  onCenterStatusChange,
  onOpenSearchOverlay,
  onSearchDrawerStateChange,
  onSelectedPlaceChange,
  registerCloseSelectedPlace,
  onMapCenterChange,
  registerReopenSearchDrawer,
}: MapSectionProps) => {
  const [isPinShareModalOpen, setIsPinShareModalOpen] = useState(false);
  const [isListViewOpen, setIsListViewOpen] = useState(false);
  const [isActiveSharesOpen, setIsActiveSharesOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [pinToShare, setPinToShare] = useState<PinShareData | null>(null);
  const [activeSharesCount, setActiveSharesCount] = useState(0);
  const [enrichedAddresses, setEnrichedAddresses] = useState<Record<string, string>>({});
  const [shouldRestoreListView, setShouldRestoreListView] = useState(false);
  const [shouldRestoreTrendingDrawer, setShouldRestoreTrendingDrawer] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const reopenTrendingRef = useRef<(() => void) | null>(null);
  
  const { t } = useTranslation();
  
  // Use global filter context - single source of truth
  const { activeFilter, selectedCategories, selectedFollowedUserIds, selectedSaveTags, setActiveFilter, toggleCategory, filtersVisible, setFiltersVisible, isFriendsDropdownOpen, isFilterExpanded, setCurrentCity } = useMapFilter();

  // Sync currentCity prop to context so MapFilterDropdown can access it
  useEffect(() => {
    setCurrentCity(currentCity);
  }, [currentCity, setCurrentCity]);

  // Register the reopen search drawer function for parent to use
  useEffect(() => {
    if (!registerReopenSearchDrawer) return;

    // Always register a stable wrapper; the underlying ref may be set later by SearchDrawer.
    registerReopenSearchDrawer(() => {
      reopenTrendingRef.current?.();
    });
  }, [registerReopenSearchDrawer]);

  // Map bounds state for dynamic loading
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);

  // Dispatch events to hide/show bottom navigation when list view opens/closes
  useEffect(() => {
    if (isListViewOpen) {
      window.dispatchEvent(new CustomEvent('ui:overlay-open'));
    } else {
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    }
  }, [isListViewOpen]);

  // Ensure bottom navigation stays hidden when changing filters while list is open
  useEffect(() => {
    if (isListViewOpen) {
      window.dispatchEvent(new CustomEvent('ui:overlay-open'));
    }
  }, [activeFilter, isListViewOpen]);

  // Maintain global overlay state for both list view and active shares
  useEffect(() => {
    if (isListViewOpen || isActiveSharesOpen) {
      window.dispatchEvent(new CustomEvent('ui:overlay-open'));
    } else {
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    }
  }, [isListViewOpen, isActiveSharesOpen]);
  
  // Fetch locations based on current filters and map bounds
  // When list view is open, show ALL locations in the city (no mapBounds filter)
  const { locations, loading, error, refetch } = useMapLocations({
    mapFilter: activeFilter,
    selectedCategories,
    currentCity,
    selectedFollowedUserIds,
    selectedSaveTags,
    mapBounds: isListViewOpen ? undefined : (mapBounds || undefined),
  });

  // Track sourcePostId separately to preserve it
  const [sourcePostId, setSourcePostId] = useState<string | undefined>(undefined);

  // Handle initial selected place from navigation
  useEffect(() => {
    if (initialSelectedPlace) {
      // Preserve sourcePostId if it exists
      if (initialSelectedPlace.sourcePostId) {
        setSourcePostId(initialSelectedPlace.sourcePostId);
      }
      setSelectedPlace(initialSelectedPlace);
      // Don't call onClearInitialPlace here - only clear the prop reference
      // Navigation back should happen when user explicitly closes the card
    }
  }, [initialSelectedPlace]);

  // Notify parent when selectedPlace changes
  useEffect(() => {
    onSelectedPlaceChange?.(selectedPlace);
  }, [selectedPlace, onSelectedPlaceChange]);

  // Register close function for external use (e.g., Header X button)
  useEffect(() => {
    registerCloseSelectedPlace?.(() => {
      setSelectedPlace(null);
      setSourcePostId(undefined);
    });
  }, [registerCloseSelectedPlace]);

  // Convert locations to Place format for LeafletMapSetup with creator info
  const places: Place[] = locations.map(location => ({
    id: location.id,
    name: location.name,
    category: location.category as any,
    address: location.address || '',
    city: location.city,
    coordinates: location.coordinates,
    google_place_id: location.google_place_id,
    opening_hours_data: location.opening_hours_data,
    photos: location.photos as string[] | undefined,
    isFollowing: location.isFollowing || false,
    isNew: location.isNew || false,
    isSaved: location.isSaved || false,
    isRecommended: location.isRecommended || false,
    recommendationScore: location.recommendationScore,
    likes: 0,
    visitors: [],
    createdBy: location.user_id,
    createdAt: location.created_at,
    sharedByUser: location.sharedByUser
  }));

  // Enrich missing addresses using reverse geocoding
  useEffect(() => {
    const enrichMissingAddresses = async () => {
      const placesNeedingAddress = places.filter(
        place => !place.address && place.coordinates?.lat && place.coordinates?.lng && !enrichedAddresses[place.id]
      );

      for (const place of placesNeedingAddress) {
        try {
          const formattedAddress = await formatDetailedAddress({
            city: place.city,
            address: place.address,
            coordinates: place.coordinates
          });
          
          if (formattedAddress && formattedAddress !== 'Indirizzo non disponibile') {
            setEnrichedAddresses(prev => ({
              ...prev,
              [place.id]: formattedAddress
            }));
          }
        } catch (error) {
          console.error('Failed to enrich address for', place.id, error);
        }
      }
    };

    if (isListViewOpen && places.length > 0) {
      enrichMissingAddresses();
    }
  }, [isListViewOpen, places, enrichedAddresses]);

  const handleMapRightClick = (coords: { lat: number; lng: number }) => {
    // If a place is open, close it
    if (selectedPlace) setSelectedPlace(null);
  };

  // Ref to close drawer from map tap
  const closeDrawerRef = useRef<(() => void) | null>(null);

  // Mobile-friendly tap - closes trending drawer when open
  const handleMapClick = (coords: { lat: number; lng: number }) => {
    // Close trending drawer if open
    if (isDrawerOpen) {
      closeDrawerRef.current?.();
    }
  };

  const handlePinClick = (place: Place) => {
    console.log('Pin clicked:', place);
    // Clear sourcePostId when clicking a pin from the map
    setSourcePostId(undefined);
    setSelectedPlace(place);
  };

  const handlePinShare = (place: Place) => {
    const shareData: PinShareData = {
      place_id: place.id,
      name: place.name,
      category: place.category,
      coordinates: place.coordinates,
      address: place.address,
      description: place.description
    };
    setPinToShare(shareData);
    setIsPinShareModalOpen(true);
  };

  const handleMapMove = (center: { lat: number; lng: number }, bounds: any) => {
    // Keep parent in sync with the real Leaflet view so a remount won't "snap back".
    // Note: this does NOT trigger a recenter because LeafletMapSetup only recenters on recenterToken.
    onMapCenterChange?.(center);

    // Update map bounds for dynamic loading - filters stay visible always
    setMapBounds({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
    console.log('🗺️ Map moved - loading pins within bounds');
  };

  return (
    <>
      <div className={`${isExpanded ? 'fixed inset-0 w-screen h-screen relative' : 'w-full h-full relative'} overflow-hidden`}>
        {/* Hide map when list view is open */}
        {!isListViewOpen && (
        <LeafletMapSetup
          key={isExpanded ? 'map-full' : 'map-embedded'}
          places={places}
          onPinClick={handlePinClick}
          onPinShare={handlePinShare}
          mapCenter={mapCenter}
          selectedPlace={selectedPlace ? { ...selectedPlace, sourcePostId } : null}
          onCloseSelectedPlace={() => { 
            // If it was opened from a list (feed/profile), navigate back to that list
            if ((selectedPlace as any)?.returnTo) {
              onClearInitialPlace?.();
            }
            // If it was a temporary location from SaveLocationPage, navigate back
            if (selectedPlace?.isTemporary) {
              onClearInitialPlace?.();
            }
            setSelectedPlace(null); 
            setSourcePostId(undefined);
            // Restore list view if it was open before selecting a place
            if (shouldRestoreListView) {
              setIsListViewOpen(true);
              setShouldRestoreListView(false);
            }
            // Restore trending drawer if it was open before selecting a trending spot
            if (shouldRestoreTrendingDrawer) {
              setShouldRestoreTrendingDrawer(false);
              reopenTrendingRef.current?.();
            }
          }}
          onMapRightClick={handleMapRightClick}
          onMapClick={handleMapClick}
          activeFilter={activeFilter}
          fullScreen={isExpanded}
          preventCenterUpdate={false}
          recenterToken={recenterToken}
          onMapMove={handleMapMove}
          onCitySelect={onCitySelect}
          filtersVisible={filtersVisible}
          onSharingStateChange={(hasSharing) => {
            // Update button layout when sharing state changes
            const container = document.querySelector('[data-has-sharing]');
            if (container) {
              container.setAttribute('data-has-sharing', String(hasSharing && !isExpanded));
            }
          }}
          fromMessages={fromMessages}
          onBackToMessages={onBackToMessages}
          hideOtherPins={!!sourcePostId || !!(selectedPlace as any)?.fromList || !!(initialSelectedPlace as any)?.fromList}
          isDrawerOpen={isDrawerOpen}
        />
        )}

        {/* Subtle fade effect at bottom of map */}
        {!isListViewOpen && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background/60 to-transparent pointer-events-none z-[999]" />
        )}

        {/* Map Category Filters - Below header - Hide when drawer is open or place is selected */}
        {!isListViewOpen && !isDrawerOpen && !selectedPlace && (
          <div className={cn(
            "z-[1100] w-full transition-opacity duration-300",
            isExpanded
              ? "fixed top-[calc(env(safe-area-inset-top)+4rem)] left-0 right-0 px-4"
              : "fixed top-[calc(env(safe-area-inset-top)+60px)] left-0 right-0 px-1",
            filtersVisible ? "opacity-100" : "opacity-0"
          )}>
            <div className="flex justify-center w-full">
              <MapCategoryFilters currentCity={currentCity} />
            </div>
          </div>
        )}

        {/* Search Drawer - Bottom - Hide when place is selected */}
        {!isListViewOpen && !selectedPlace && (
          <div className={cn(
            "transition-opacity duration-300",
            filtersVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            <SearchDrawer 
              currentCity={currentCity}
              onCitySelect={onCitySelect || (() => {})}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange || (() => {})}
              onFocusOpen={onOpenSearchOverlay}
              isCenteredOnUser={isCenteredOnUser}
              onCenterStatusChange={onCenterStatusChange}
              isExpanded={isExpanded}
              onDrawerStateChange={(isOpen) => {
                setIsDrawerOpen(isOpen);
                onSearchDrawerStateChange?.(isOpen);
              }}
              onSpotSelect={(spot) => {
                // Mark that we should restore trending drawer when pin card closes
                setShouldRestoreTrendingDrawer(true);
                // Center map on the spot
                onCitySelect?.(spot.city, spot.coordinates);
                // Create a Place from the spot and show it
                const placeFromSpot: Place = {
                  id: spot.id,
                  name: spot.name,
                  category: spot.category as any,
                  coordinates: spot.coordinates,
                  address: spot.address || '',
                  city: spot.city,
                  google_place_id: spot.google_place_id,
                  isFollowing: false,
                  isNew: false,
                  likes: 0,
                  visitors: [],
                };
                setSelectedPlace(placeFromSpot);
              }}
              registerReopenTrending={(reopenFn) => {
                reopenTrendingRef.current = reopenFn;
              }}
              registerCloseDrawer={(closeFn) => {
                closeDrawerRef.current = closeFn;
              }}
            />
          </div>
        )}

        {/* Map Controls - List View Toggle - Hide when drawer is open */}
        {!isListViewOpen && !isDrawerOpen && (
        <div 
          className={cn(
            "right-3 z-[1001] flex flex-row gap-2 transition-all duration-300",
            isExpanded ? 'fixed' : 'absolute',
            filtersVisible && !isFriendsDropdownOpen && !isFilterExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
          )} 
          style={{
            bottom: isExpanded 
              ? 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' 
              : 'calc(5.75rem + env(safe-area-inset-bottom, 0px))'
          }}>
          {/* List View Toggle */}
          <Sheet open={isListViewOpen} onOpenChange={setIsListViewOpen}>
            <SheetTrigger asChild>
              <button
                className="rounded-full bg-background/80 backdrop-blur-md border border-border/20 shadow-lg hover:bg-background/90 hover:scale-105 w-11 h-11 transition-all flex items-center justify-center"
              >
                <List className="w-5 h-5 text-foreground" />
              </button>
            </SheetTrigger>
          </Sheet>
        </div>
        )}

        {/* Location List Sheet - Always rendered */}
        <Sheet open={isListViewOpen} onOpenChange={setIsListViewOpen}>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl flex flex-col z-[150]">
            <SheetHeader className="pb-4 flex-shrink-0">
              <SheetTitle className="text-xl font-semibold">
                {t('locationsTitle', { ns: 'mapFilters' })}
                <Badge variant="secondary" className="ml-3 text-sm">
                  {places.length}
                </Badge>
              </SheetTitle>
              
              {/* Filter buttons with horizontal scroll */}
              <div className="flex gap-2 mt-0 translate-y-3 overflow-x-auto overflow-y-visible scrollbar-hide pb-2 -mx-6 px-6 relative z-10">
                <Button
                  size="sm"
                  variant={activeFilter === 'following' ? 'default' : 'outline'}
                  onClick={() => setActiveFilter('following')}
                  className="rounded-full whitespace-nowrap flex-shrink-0"
                >
                  {t('friends', { ns: 'mapFilters' })}
                </Button>
                <Button
                  size="sm"
                  variant={activeFilter === 'popular' ? 'default' : 'outline'}
                  onClick={() => setActiveFilter('popular')}
                  className="rounded-full whitespace-nowrap flex-shrink-0"
                >
                  {t('everyone', { ns: 'mapFilters' })}
                </Button>
                <Button
                  size="sm"
                  variant={activeFilter === 'saved' ? 'default' : 'outline'}
                  onClick={() => setActiveFilter('saved')}
                  className="rounded-full whitespace-nowrap flex-shrink-0"
                >
                  {t('saved', { ns: 'mapFilters' })}
                </Button>
                {/* New: Active Shares list */}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsActiveSharesOpen(true)}
                  className="rounded-full whitespace-nowrap flex-shrink-0 relative overflow-visible"
                >
                  {t('activeShares', { ns: 'mapFilters' })}
                  {activeSharesCount > 0 && (
                    <Badge variant="destructive" className="absolute top-0 -right-2 w-5 h-5 flex items-center justify-center p-0 text-xs z-[999]">{activeSharesCount}</Badge>
                  )}
                </Button>
              </div>
            </SheetHeader>
            <ScrollArea className="flex-1 -mx-6 px-6 [&>div]:!overflow-y-auto [&>div]:!scrollbar-none [&>div::-webkit-scrollbar]:hidden">
              <div className="space-y-3 pr-4 py-2">
                {places.map((place) => {
                  return (
                    <div
                      key={place.id}
                      className="p-4 rounded-lg border border-border bg-card cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        handlePinClick(place);
                        setShouldRestoreListView(true);
                        setIsListViewOpen(false);
                      }}
                    >
                      <div className="flex gap-3">
                        {/* Category Icon */}
                        <div className="flex-shrink-0">
                          <CategoryIcon 
                            category={place.category} 
                            className="w-12 h-12"
                            sizeMultiplier={place.category.toLowerCase() === 'restaurant' ? 0.75 : 1}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{place.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {(() => {
                              const rawAddress = place.address || enrichedAddresses[place.id] || '';
                              if (!rawAddress) return t('addressNotAvailable', { ns: 'common' });
                              // Format as: City, Street Name, Number
                              return formatSearchResultAddress({
                                name: place.name,
                                address: rawAddress,
                                city: place.city,
                              });
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
        
        {/* Loading/Error States */}
        {loading && (
          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-border z-50">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-muted-foreground">{t('loadingLocations', { ns: 'common' })}</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute bottom-4 left-4 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 shadow-sm z-50">
            <span className="text-sm text-destructive">{t('error', { ns: 'common' })}: {error}</span>
          </div>
        )}
        
      </div>

      <LocationShareModal
        isOpen={isPinShareModalOpen}
        onClose={() => {
          setIsPinShareModalOpen(false);
          setPinToShare(null);
        }}
        place={pinToShare || selectedPlace}
      />

      {/* Active Shares list */}
      <ActiveSharesListSheet
        open={isActiveSharesOpen}
        onOpenChange={setIsActiveSharesOpen}
        places={places}
        onSelectLocation={(placeId, shareData) => {
          // Always close both sheets first
          setIsActiveSharesOpen(false);
          setIsListViewOpen(false);
          
          // Try to find in places by id, google_place_id, or location_id
          let p = places.find(pl => 
            pl.id === placeId || 
            pl.google_place_id === placeId ||
            (shareData?.location_id && pl.id === shareData.location_id)
          ) || null;
          
          // If not found but we have share data, create a temporary place object
          if (!p && shareData) {
            p = {
              id: shareData.location_id || placeId,
              name: shareData.location_name,
              address: shareData.location_address || '',
              category: 'place',
              coordinates: { lat: shareData.latitude, lng: shareData.longitude },
              likes: 0,
              visitors: [],
              isNew: false,
              google_place_id: shareData.location_id ? undefined : placeId,
            } as Place;
          }
          
          if (p) {
            // Small delay to ensure sheets are closed before showing location card
            setTimeout(() => {
              handlePinClick(p);
            }, 100);
          }
        }}
        onCountChange={setActiveSharesCount}
        parentOverlayOpen={isListViewOpen}
      />
    </>
  );
};

export default MapSection;
