
import React, { useState, useEffect } from 'react';
import LeafletMapSetup from '@/components/LeafletMapSetup';
import AddLocationModal from './AddLocationModal';
import QuickAddPinModal from './QuickAddPinModal';
import MapCategoryFilters from './MapCategoryFilters';
import MapFilterDropdown from './MapFilterDropdown';
import { cn } from '@/lib/utils';
import { LocationShareModal } from '../explore/LocationShareModal';
import { useMapLocations } from '@/hooks/useMapLocations';
import { useMapFilter } from '@/contexts/MapFilterContext';
import { Place } from '@/types/place';
import { PinShareData } from '@/services/pinSharingService';
import { toast } from 'sonner';
import { List, Maximize2, Minimize2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { categoryDisplayNames, type AllowedCategory } from '@/utils/allowedCategories';
import ActiveSharesListSheet from './ActiveSharesListSheet';

import { useTranslation } from 'react-i18next';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { formatDetailedAddress } from '@/utils/addressFormatter';

interface MapSectionProps {
  mapCenter: { lat: number; lng: number };
  currentCity: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  initialSelectedPlace?: Place | null;
  onClearInitialPlace?: () => void;
  recenterToken?: number;
  onCitySelect?: (city: string, coords: { lat: number; lng: number }) => void;
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
}: MapSectionProps) => {
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [isPinShareModalOpen, setIsPinShareModalOpen] = useState(false);
  const [isListViewOpen, setIsListViewOpen] = useState(false);
  const [isActiveSharesOpen, setIsActiveSharesOpen] = useState(false);
  const [newLocationCoords, setNewLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [pinToShare, setPinToShare] = useState<PinShareData | null>(null);
  const [activeSharesCount, setActiveSharesCount] = useState(0);
  const [enrichedAddresses, setEnrichedAddresses] = useState<Record<string, string>>({});
  
  const { t } = useTranslation();
  
  // Use global filter context - single source of truth
  const { activeFilter, selectedCategories, selectedFollowedUserIds, selectedSaveTags, setActiveFilter, toggleCategory, filtersVisible, setFiltersVisible, isFriendsDropdownOpen, isFilterExpanded } = useMapFilter();

  // Hide filters when map is moving
  const moveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };
  }, []);

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
  
  // State for map bounds to enable dynamic loading
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  
  // Fetch locations based on current filters and map bounds
  const { locations, loading, error, refetch } = useMapLocations({
    mapFilter: activeFilter,
    selectedCategories,
    currentCity,
    selectedFollowedUserIds,
    selectedSaveTags,
    mapBounds: mapBounds || undefined,
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
      onClearInitialPlace?.();
    }
  }, [initialSelectedPlace, onClearInitialPlace]);

  // Convert locations to Place format for LeafletMapSetup with creator info
  const places: Place[] = locations.map(location => ({
    id: location.id,
    name: location.name,
    category: location.category as any,
    address: location.address || '',
    coordinates: location.coordinates,
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
    // If a place is open, close it and continue
    if (selectedPlace) setSelectedPlace(null);
    
    // Only allow quick add when in saved filter
    if (activeFilter !== 'saved') {
      toast.info(t('mapFilters:switchToSavedToAdd'), { duration: 2000 });
      return;
    }
    
    setNewLocationCoords(coords);
    setIsQuickAddModalOpen(true);
  };

  // Mobile-friendly tap to add a pin
  const handleMapClick = (coords: { lat: number; lng: number }) => {
    // If a place is open, close it and continue
    if (selectedPlace) setSelectedPlace(null);
    
    // Only allow quick add when in saved filter
    if (activeFilter !== 'saved') {
      toast.info(t('mapFilters:switchToSavedToAdd'), { duration: 2000 });
      return;
    }
    
    setNewLocationCoords(coords);
    setIsQuickAddModalOpen(true);
  };
  const handleSaveLocation = async (locationData: any) => {
    try {
      console.log('Saving new location:', locationData);
      setIsAddLocationModalOpen(false);
      setNewLocationCoords(null);
      alert('Location saved successfully!');
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Failed to save location. Please try again.');
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

  const handlePinAdded = () => {
    // Switch to saved filter and close modal - this will trigger useMapLocations to refetch
    setActiveFilter('saved');
    setIsQuickAddModalOpen(false);
    setNewLocationCoords(null);
    // Force refetch to show newly saved location
    try { refetch?.(); } catch {}
  };

  const handleMapMove = (center: { lat: number; lng: number }, bounds: any) => {
    // Hide filters immediately when movement starts
    setFiltersVisible(false);
    
    // Clear existing timeout
    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current);
    }
    
    // Show filters after 500ms of no movement
    moveTimeoutRef.current = setTimeout(() => {
      setFiltersVisible(true);
    }, 500);
    
    // Update map bounds for dynamic loading
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
          onCloseSelectedPlace={() => { setSelectedPlace(null); setSourcePostId(undefined); }}
          onMapRightClick={handleMapRightClick}
          onMapClick={handleMapClick}
          activeFilter={activeFilter}
          fullScreen={isExpanded}
          preventCenterUpdate={false}
          recenterToken={recenterToken}
          onMapMove={handleMapMove}
          onCitySelect={onCitySelect}
          onSharingStateChange={(hasSharing) => {
            // Update button layout when sharing state changes
            const container = document.querySelector('[data-has-sharing]');
            if (container) {
              container.setAttribute('data-has-sharing', String(hasSharing && !isExpanded));
            }
          }}
        />
        )}

        {/* Subtle fade effect at bottom of map */}
        {!isListViewOpen && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background/60 to-transparent pointer-events-none z-[999]" />
        )}

        {/* Map Category Filters - Hide when list view is open */}
        {!isListViewOpen && (
          <div className={cn(
            "z-[1100] w-full transition-opacity duration-300",
            isExpanded
              ? "fixed top-[calc(env(safe-area-inset-top)+2rem)] left-0 right-0 px-4"
              : "absolute top-4 left-0 right-0 px-1",
            filtersVisible ? "opacity-100" : "opacity-0"
          )}>
            <div className="flex justify-center w-full">
              <MapCategoryFilters currentCity={currentCity} />
            </div>
          </div>
        )}

        {/* Map Filter Dropdown - Bottom Left */}
        {!isListViewOpen && (
          <div className={cn(
            "left-3 z-[1000] transition-opacity duration-300",
            isExpanded ? 'fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)]' : 'absolute bottom-[5.25rem]',
            filtersVisible ? "opacity-100" : "opacity-0"
          )}>
            <MapFilterDropdown />
          </div>
        )}

        {/* Map Controls - List View and Expand Toggle - Inside map - Always render but hide when dropdowns open */}
        {!isListViewOpen && (
        <div className={cn(
          "right-3 z-[1000] flex flex-row gap-2 data-[has-sharing=true]:flex-col data-[has-sharing=true]:items-end transition-all duration-150",
          isExpanded ? 'fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)]' : 'absolute bottom-[5.25rem]',
          filtersVisible && !isFriendsDropdownOpen && !isFilterExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
        )} data-has-sharing={false}>
          {/* Expand/Collapse Button */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="rounded-full bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md border border-primary/30 shadow-lg hover:bg-gray-300/50 dark:hover:bg-slate-700/70 hover:scale-105 w-9 h-9 transition-all flex items-center justify-center"
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4 text-foreground" />
              ) : (
                <Maximize2 className="w-4 h-4 text-foreground" />
              )}
            </button>
          )}

          {/* List View Toggle */}
          <Sheet open={isListViewOpen} onOpenChange={setIsListViewOpen}>
            <SheetTrigger asChild>
              <button
                className="rounded-full bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md border border-primary/30 shadow-lg hover:bg-gray-300/50 dark:hover:bg-slate-700/70 hover:scale-105 w-9 h-9 transition-all flex items-center justify-center"
              >
                <List className="w-4 h-4 text-foreground" />
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
                  {t('following', { ns: 'mapFilters' })}
                </Button>
                <Button
                  size="sm"
                  variant={activeFilter === 'popular' ? 'default' : 'outline'}
                  onClick={() => setActiveFilter('popular')}
                  className="rounded-full whitespace-nowrap flex-shrink-0"
                >
                  {t('popular', { ns: 'mapFilters' })}
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
                            {place.address || enrichedAddresses[place.id] || t('addressNotAvailable', { ns: 'common' })}
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

      <AddLocationModal
        isOpen={isAddLocationModalOpen}
        onClose={() => {
          setIsAddLocationModalOpen(false);
          setNewLocationCoords(null);
        }}
        coordinates={newLocationCoords}
        onSaveLocation={handleSaveLocation}
      />

      <QuickAddPinModal
        isOpen={isQuickAddModalOpen}
        onClose={() => {
          setIsQuickAddModalOpen(false);
          setNewLocationCoords(null);
        }}
        coordinates={newLocationCoords}
        onPinAdded={handlePinAdded}
        allowedCategoriesFilter={selectedCategories}
      />

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
        onSelectLocation={(placeId) => {
          const p = places.find(pl => pl.id === placeId) || null;
          if (p) {
            setIsListViewOpen(false);
            handlePinClick(p);
          }
        }}
        onCountChange={setActiveSharesCount}
        parentOverlayOpen={isListViewOpen}
      />
    </>
  );
};

export default MapSection;
