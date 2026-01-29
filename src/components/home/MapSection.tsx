import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import ActiveSharesListSheet from './ActiveSharesListSheet';
import { LocationListItem, LocationListItemSkeleton, LocationListEmpty } from './LocationListItem';
import ListDrawerSubFilters from './ListDrawerSubFilters';
import SaveTagInlineFilters from './SaveTagInlineFilters';

import { useTranslation } from 'react-i18next';
import { formatDetailedAddress } from '@/utils/addressFormatter';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FollowedUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

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
  const { user } = useAuth();
  const [isPinShareModalOpen, setIsPinShareModalOpen] = useState(false);
  // Single source of truth for Home map overlays
  const [overlay, setOverlay] = useState<'map' | 'list' | 'pin'>('map');
  const isListViewOpen = overlay === 'list';
  const [isActiveSharesOpen, setIsActiveSharesOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [pinToShare, setPinToShare] = useState<PinShareData | null>(null);
  const [activeSharesCount, setActiveSharesCount] = useState(0);
  const [enrichedAddresses, setEnrichedAddresses] = useState<Record<string, string>>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([]);

  // Track if pin was opened from list - survives across renders
  const openedFromListRef = useRef(false);

  // Deterministic restore target when closing the pin
  const previousOverlayRef = useRef<'map' | 'list'>('map');

  // Use refs for restore flags to avoid timing issues with state
  const restoreTrendingDrawerRef = useRef(false);
  const reopenTrendingRef = useRef<(() => void) | null>(null);
  
  // Timestamp-based guard: ignore Radix Sheet close events within 500ms of programmatic open
  const lastProgrammaticListOpenRef = useRef(0);

  const { t } = useTranslation();
  
  // Use global filter context - single source of truth
  const { activeFilter, selectedCategories, selectedFollowedUserIds, setSelectedFollowedUserIds, selectedSaveTags, setActiveFilter, toggleCategory, toggleSaveTag, filtersVisible, setFiltersVisible, isFriendsDropdownOpen, isFilterExpanded, setCurrentCity } = useMapFilter();

  // Fetch followed users for the drawer sub-filters (only those with saved locations)
  // Optimized: parallel queries and early caching
  useEffect(() => {
    const fetchFollowedUsers = async () => {
      if (!user?.id) return;
      
      // Parallel fetch: follows + check for users with saves
      const [followResult] = await Promise.all([
        supabase
          .from('follows')
          .select('following_id, profiles!follows_following_id_fkey(id, username, avatar_url)')
          .eq('follower_id', user.id)
      ]);
      
      if (followResult.error) {
        console.error('Error fetching followed users:', followResult.error);
        return;
      }

      if (followResult.data) {
        const users = followResult.data
          .map((f: any) => f.profiles)
          .filter(Boolean) as FollowedUser[];
        
        if (users.length === 0) {
          setFollowedUsers([]);
          return;
        }

        // Filter to only show users who have saved locations
        const userIds = users.map(u => u.id);
        const { data: usersWithSaves } = await supabase
          .from('saved_places')
          .select('user_id')
          .in('user_id', userIds);
        
        const usersWithSavesSet = new Set(usersWithSaves?.map(u => u.user_id) || []);
        const filteredUsers = users.filter(u => usersWithSavesSet.has(u.id));
        setFollowedUsers(filteredUsers);
      }
    };
    
    fetchFollowedUsers();
  }, [user?.id]);

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

  // Listen for close-search-drawer event from AddPageOverlay
  useEffect(() => {
    const handleCloseSearchDrawer = () => {
      setIsDrawerOpen(false);
      closeDrawerRef.current?.();
    };
    window.addEventListener('close-search-drawer', handleCloseSearchDrawer);
    return () => window.removeEventListener('close-search-drawer', handleCloseSearchDrawer);
  }, []);

  // Listen for close-list-view event from AddPageOverlay
  useEffect(() => {
    const handleCloseListView = () => {
      setOverlay('map');
    };
    window.addEventListener('close-list-view', handleCloseListView);
    return () => window.removeEventListener('close-list-view', handleCloseListView);
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
      setOverlay('pin');
      // Don't call onClearInitialPlace here - only clear the prop reference
      // Navigation back should happen when user explicitly closes the card
    }
  }, [initialSelectedPlace]);

  // Sync selectedPlace ID when location is saved (ID changes from temporary to UUID)
  useEffect(() => {
    const handleSaveChanged = (event: CustomEvent) => {
      const { isSaved, newLocationId, oldLocationId, coordinates } = event.detail;
      
      // If we have a selected place and this save event is for it
      if (selectedPlace && isSaved && newLocationId) {
        const isMatchingPlace = 
          selectedPlace.id === oldLocationId ||
          selectedPlace.id === newLocationId ||
          selectedPlace.isTemporary ||
          (coordinates && selectedPlace.coordinates &&
           Math.abs(selectedPlace.coordinates.lat - coordinates.lat) < 0.0001 &&
           Math.abs(selectedPlace.coordinates.lng - coordinates.lng) < 0.0001);
        
        if (isMatchingPlace && selectedPlace.id !== newLocationId) {
          console.log('🔄 Syncing selectedPlace ID:', oldLocationId, '->', newLocationId);
          setSelectedPlace(prev => prev ? {
            ...prev,
            id: newLocationId,
            isTemporary: false,
            isSaved: true
          } : null);
        }
      }
    };
    
    window.addEventListener('location-save-changed', handleSaveChanged as EventListener);
    return () => window.removeEventListener('location-save-changed', handleSaveChanged as EventListener);
  }, [selectedPlace]);

  // Notify parent when selectedPlace changes
  useEffect(() => {
    onSelectedPlaceChange?.(selectedPlace);
  }, [selectedPlace, onSelectedPlaceChange]);

  // Helper to open the list with timestamp guard
  const openListWithGuard = useCallback(() => {
    console.log('[List] Opening with timestamp guard');
    lastProgrammaticListOpenRef.current = performance.now();
    setOverlay('list');
  }, []);

  const closeSelectedPlaceAndRestore = useCallback(() => {
    const hasReturnTo = !!(selectedPlace as any)?.returnTo;
    const wasFromHomeList =
      previousOverlayRef.current === 'list' ||
      openedFromListRef.current ||
      (!!(selectedPlace as any)?.fromList && !hasReturnTo);
    const shouldRestoreTrending = restoreTrendingDrawerRef.current;

    console.log('[Close] hasReturnTo:', hasReturnTo, 'wasFromHomeList:', wasFromHomeList, 'openedFromListRef:', openedFromListRef.current, 'previousOverlayRef:', previousOverlayRef.current);
    
    // If it was opened from a profile/folder list, navigate back to that list
    if (hasReturnTo) {
      onClearInitialPlace?.();
      // Clear state
      setSelectedPlace(null);
      setSourcePostId(undefined);
      setIsDrawerOpen(false);
      onSearchDrawerStateChange?.(false);
      document.body.removeAttribute('data-modal-open');
      openedFromListRef.current = false;
      restoreTrendingDrawerRef.current = false;
      return;
    }
    
    // If it was a temporary location from SaveLocationPage, navigate back
    if (selectedPlace?.isTemporary) {
      onClearInitialPlace?.();
      setSelectedPlace(null);
      setSourcePostId(undefined);
      setIsDrawerOpen(false);
      onSearchDrawerStateChange?.(false);
      document.body.removeAttribute('data-modal-open');
      openedFromListRef.current = false;
      restoreTrendingDrawerRef.current = false;
      return;
    }

    // Reset refs
    openedFromListRef.current = false;
    restoreTrendingDrawerRef.current = false;
    previousOverlayRef.current = 'map';
    setSelectedPlace(null);
    setSourcePostId(undefined);
    setIsDrawerOpen(false);
    onSearchDrawerStateChange?.(false);
    document.body.removeAttribute('data-modal-open');

    // Deterministically restore overlay
    if (wasFromHomeList) {
      requestAnimationFrame(() => {
        openListWithGuard();
      });
    } else {
      setOverlay('map');
    }

    // Restore trending drawer
    if (shouldRestoreTrending) {
      requestAnimationFrame(() => {
        reopenTrendingRef.current?.();
      });
    }
  }, [onClearInitialPlace, onSearchDrawerStateChange, selectedPlace, openListWithGuard]);

  // Register close function for external use (e.g., Header X button)
  useEffect(() => {
    registerCloseSelectedPlace?.(() => {
      closeSelectedPlaceAndRestore();
    });
  }, [registerCloseSelectedPlace, closeSelectedPlaceAndRestore]);

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
    sharedByUser: location.sharedByUser,
    // New: friend filter mode data
    savedByUser: location.savedByUser,
    latestActivity: location.latestActivity
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

    // Remember where we came from so close can restore deterministically
    if (overlay !== 'pin') {
      previousOverlayRef.current = overlay === 'list' ? 'list' : 'map';
    }

    // Clear sourcePostId when clicking a pin from the map
    setSourcePostId(undefined);

    // IMPORTANT: pins opened from Home list must never carry stale returnTo state
    // (stale returnTo causes navigation away instead of restoring the list)
    const sanitized: any = { ...(place as any) };
    delete sanitized.returnTo;

    setSelectedPlace(sanitized as Place);
    setOverlay('pin');
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
        {/* Keep map mounted but visually hidden when list view is open - prevents layout glitches */}
        <div className={isListViewOpen ? 'opacity-0 pointer-events-none' : ''}>
          <LeafletMapSetup
            key={isExpanded ? 'map-full' : 'map-embedded'}
            places={places}
            onPinClick={handlePinClick}
            onPinShare={handlePinShare}
            mapCenter={mapCenter}
            selectedPlace={selectedPlace ? { ...selectedPlace, sourcePostId } : null}
            onCloseSelectedPlace={closeSelectedPlaceAndRestore}
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
        </div>

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
                // Mark that we should restore trending drawer when pin card closes (using ref)
                restoreTrendingDrawerRef.current = true;
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
          {/* List View Toggle - Simple button, Sheet is rendered separately */}
          <button
            onClick={() => {
              previousOverlayRef.current = 'list';
              setOverlay('list');
            }}
            className="rounded-full bg-background/80 backdrop-blur-md border border-border/20 shadow-lg hover:bg-background/90 hover:scale-105 w-11 h-11 transition-all flex items-center justify-center"
          >
            <List className="w-5 h-5 text-foreground" />
          </button>
        </div>
        )}

        {/* Location List Drawer - Always rendered */}
        <Drawer 
          open={isListViewOpen} 
          onOpenChange={(open) => {
            // Timestamp-based guard: ignore close events within 500ms of programmatic open
            if (!open) {
              const elapsed = performance.now() - lastProgrammaticListOpenRef.current;
              if (elapsed < 500) {
                console.log('[Drawer] Ignoring spurious close, elapsed:', elapsed);
                return;
              }
            }

            if (open) {
              setOverlay('list');
            } else {
              setOverlay(selectedPlace ? 'pin' : 'map');
            }
          }}
        >
          <DrawerContent 
            showHandle={true}
            hideOverlay={true}
            className="h-[85vh] flex flex-col z-[150] bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md border-t border-border/10 shadow-2xl"
          >
            <DrawerHeader className="pt-1 pb-2 flex-shrink-0 sticky top-0 z-10 bg-gray-200/60 dark:bg-slate-800/60 backdrop-blur-md rounded-t-[20px]">
              {/* Title row with save tag filters inline */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mt-1">
                <DrawerTitle className="text-xl font-bold flex items-center gap-2 flex-shrink-0">
                  {t('locationsTitle', { ns: 'mapFilters' })}
                  <Badge variant="secondary" className="text-sm font-medium bg-white/50 dark:bg-slate-700/50">
                    {places.length}
                  </Badge>
                </DrawerTitle>
                
                {/* Save tag filters - shown for saved AND following */}
                {(activeFilter === 'saved' || activeFilter === 'following') && (
                  <SaveTagInlineFilters 
                    selectedSaveTags={selectedSaveTags}
                    onToggleSaveTag={toggleSaveTag}
                  />
                )}
              </div>
              
              {/* Filter buttons with horizontal scroll */}
              <div className="flex gap-2 mt-2 overflow-x-auto overflow-y-visible scrollbar-hide pb-2 -mx-6 px-6 relative z-10">
                <Button
                  size="sm"
                  variant={activeFilter === 'following' ? 'default' : 'outline'}
                  onClick={() => setActiveFilter('following')}
                  className={cn(
                    "rounded-full whitespace-nowrap flex-shrink-0 h-8",
                    activeFilter !== 'following' && "bg-white/50 dark:bg-slate-700/50 border-border/30"
                  )}
                >
                  {t('friends', { ns: 'mapFilters' })}
                </Button>
                <Button
                  size="sm"
                  variant={activeFilter === 'popular' ? 'default' : 'outline'}
                  onClick={() => setActiveFilter('popular')}
                  className={cn(
                    "rounded-full whitespace-nowrap flex-shrink-0 h-8",
                    activeFilter !== 'popular' && "bg-white/50 dark:bg-slate-700/50 border-border/30"
                  )}
                >
                  {t('everyone', { ns: 'mapFilters' })}
                </Button>
                <Button
                  size="sm"
                  variant={activeFilter === 'saved' ? 'default' : 'outline'}
                  onClick={() => setActiveFilter('saved')}
                  className={cn(
                    "rounded-full whitespace-nowrap flex-shrink-0 h-8",
                    activeFilter !== 'saved' && "bg-white/50 dark:bg-slate-700/50 border-border/30"
                  )}
                >
                  {t('saved', { ns: 'mapFilters' })}
                </Button>
                {/* Active Shares list */}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsActiveSharesOpen(true)}
                  className="rounded-full whitespace-nowrap flex-shrink-0 relative overflow-visible h-8 bg-white/50 dark:bg-slate-700/50"
                >
                  {t('activeShares', { ns: 'mapFilters' })}
                  {activeSharesCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-2 w-5 h-5 flex items-center justify-center p-0 text-xs z-[999]">
                      {activeSharesCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </DrawerHeader>
            
            {/* Sub-filters based on active filter */}
            <ListDrawerSubFilters
              activeFilter={activeFilter}
              followedUsers={followedUsers}
              selectedFollowedUserIds={selectedFollowedUserIds}
              selectedSaveTags={selectedSaveTags}
              onToggleUser={(userId) => {
                if (selectedFollowedUserIds.includes(userId)) {
                  setSelectedFollowedUserIds(selectedFollowedUserIds.filter(id => id !== userId));
                } else {
                  setSelectedFollowedUserIds([...selectedFollowedUserIds, userId]);
                }
              }}
              onToggleSaveTag={toggleSaveTag}
              onSelectAllUsers={() => {
                const allSelected = selectedFollowedUserIds.length === followedUsers.length && followedUsers.length > 0;
                if (allSelected) {
                  setSelectedFollowedUserIds([]);
                } else {
                  setSelectedFollowedUserIds(followedUsers.map(u => u.id));
                }
              }}
              locationCount={places.length}
              currentCity={currentCity}
            />
            
            <ScrollArea className="flex-1 -mx-6 px-6 [&>div]:!overflow-y-auto [&>div]:!scrollbar-none [&>div::-webkit-scrollbar]:hidden">
              <div className="space-y-1.5 py-1 pb-6">
                {loading ? (
                  // Skeleton loaders
                  <>
                    <LocationListItemSkeleton />
                    <LocationListItemSkeleton />
                    <LocationListItemSkeleton />
                    <LocationListItemSkeleton />
                    <LocationListItemSkeleton />
                  </>
                ) : places.length === 0 ? (
                  // Empty state
                  <LocationListEmpty />
                ) : (
                  // Location list
                  places.map((place) => (
                    <LocationListItem
                      key={place.id}
                      place={place}
                      enrichedAddress={enrichedAddresses[place.id]}
                      onClick={() => {
                        // Mark to restore list when closing the pin card
                        openedFromListRef.current = true;
                        previousOverlayRef.current = 'list';
                        console.log('[List Item Click] Set openedFromListRef = true');
                        // Switch overlay to pin (Drawer will close)
                        setOverlay('pin');
                        // Ensure no stale returnTo leaks into this Home-list flow
                        handlePinClick({ ...(place as any), fromList: true, returnTo: undefined } as Place);
                      }}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </DrawerContent>
        </Drawer>
        
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
          setOverlay('map');
          
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
