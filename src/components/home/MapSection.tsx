
import React, { useState, useEffect } from 'react';
import LeafletMapSetup from '@/components/LeafletMapSetup';
import AddLocationModal from './AddLocationModal';
import QuickAddPinModal from './QuickAddPinModal';
import MapCategoryFilters from './MapCategoryFilters';
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

import { useTranslation } from 'react-i18next';

// Import category icons
import restaurantIcon from '@/assets/category-restaurant-upload.png';
import barIcon from '@/assets/category-bar-upload.png';
import cafeIcon from '@/assets/category-cafe-upload.png';
import bakeryIcon from '@/assets/category-bakery-upload.png';
import hotelIcon from '@/assets/category-hotel-upload.png';
import museumIcon from '@/assets/category-museum-upload.png';
import entertainmentIcon from '@/assets/category-entertainment-upload.png';

const getCategoryIconImage = (category: string): string => {
  switch (category) {
    case 'restaurant': return restaurantIcon;
    case 'bar': return barIcon;
    case 'cafe': return cafeIcon;
    case 'bakery': return bakeryIcon;
    case 'hotel': return hotelIcon;
    case 'museum': return museumIcon;
    case 'entertainment': return entertainmentIcon;
    default: return restaurantIcon;
  }
};

interface MapSectionProps {
  mapCenter: { lat: number; lng: number };
  currentCity: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  initialSelectedPlace?: Place | null;
  onClearInitialPlace?: () => void;
}

const MapSection = ({ 
  mapCenter, 
  currentCity, 
  isExpanded = false, 
  onToggleExpand,
  initialSelectedPlace,
  onClearInitialPlace
}: MapSectionProps) => {
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [isPinShareModalOpen, setIsPinShareModalOpen] = useState(false);
  const [isListViewOpen, setIsListViewOpen] = useState(false);
  const [newLocationCoords, setNewLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [pinToShare, setPinToShare] = useState<PinShareData | null>(null);
  
  const { t } = useTranslation();
  
  // Use global filter context - single source of truth
  const { activeFilter, selectedCategories, selectedFollowedUserIds, setActiveFilter, toggleCategory } = useMapFilter();
  
  // Fetch locations based on current filters
  const { locations, loading, error, refetch } = useMapLocations({
    mapFilter: activeFilter,
    selectedCategories,
    currentCity,
    selectedFollowedUserIds
  });

  // Handle initial selected place from navigation
  useEffect(() => {
    if (initialSelectedPlace) {
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
    createdAt: location.created_at
  }));

  const handleMapRightClick = (coords: { lat: number; lng: number }) => {
    // If a place is open, close it and continue
    if (selectedPlace) setSelectedPlace(null);
    
    // Only allow quick add when in saved filter
    if (activeFilter !== 'saved') {
      toast.info('Switch to "Saved" filter to add pins', { duration: 2000 });
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
      toast.info('Switch to "Saved" filter to add pins', { duration: 2000 });
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

  return (
    <>
      <div className={`${isExpanded ? 'fixed inset-0 w-screen h-screen relative' : 'flex-1 relative min-h-[500px] -mx-4 md:-mx-6 lg:-mx-8'} w-full overflow-hidden`}>
        {/* Hide map when list view is open */}
        {!isListViewOpen && (
          <LeafletMapSetup
            places={places}
            onPinClick={handlePinClick}
            onPinShare={handlePinShare}
            mapCenter={mapCenter}
            selectedPlace={selectedPlace}
            onCloseSelectedPlace={() => setSelectedPlace(null)}
            onMapRightClick={handleMapRightClick}
            onMapClick={handleMapClick}
            activeFilter={activeFilter}
            fullScreen={isExpanded}
            preventCenterUpdate={true}
          />
        )}

        {/* Map Category Filters - Hide when list view is open */}
        {!isListViewOpen && (
          <div className={cn(
            "z-[1100] w-full px-0",
            isExpanded
              ? "fixed top-[calc(env(safe-area-inset-top)+2rem)] left-0 right-0"
              : "absolute top-4 left-0 right-0"
          )}>
            <div className="flex justify-center w-full">
              <MapCategoryFilters currentCity={currentCity} />
            </div>
          </div>
        )}

        {/* Map Controls - List View and Expand Toggle - Inside map */}
        <div className={`${isExpanded ? 'fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)]' : 'absolute bottom-[calc(4rem+env(safe-area-inset-bottom)-1.75rem)]'} right-3 z-[1000] flex flex-row gap-2`}>
          {/* Expand/Collapse Button */}
          {onToggleExpand && (
            <Button
              onClick={onToggleExpand}
              size="icon"
              className="rounded-full bg-background/95 backdrop-blur-md shadow-lg border border-border hover:bg-accent hover:scale-105 w-9 h-9 transition-all"
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4 text-foreground" />
              ) : (
                <Maximize2 className="w-4 h-4 text-foreground" />
              )}
            </Button>
          )}

          {/* List View Toggle */}
          <Sheet open={isListViewOpen} onOpenChange={setIsListViewOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                className="rounded-full bg-background/95 backdrop-blur-md shadow-lg border border-border hover:bg-accent hover:scale-105 w-9 h-9 transition-all"
              >
                <List className="w-4 h-4 text-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl flex flex-col">
              <SheetHeader className="pb-4 flex-shrink-0">
                <SheetTitle className="text-xl font-semibold">
                  {t('locationsTitle', { ns: 'mapFilters' })}
                  <Badge variant="secondary" className="ml-3 text-sm">
                    {places.length}
                  </Badge>
                </SheetTitle>
                
                {/* Filter buttons */}
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant={activeFilter === 'following' ? 'default' : 'outline'}
                    onClick={() => setActiveFilter('following')}
                    className="rounded-full"
                  >
                    {t('following', { ns: 'mapFilters' })}
                  </Button>
                  <Button
                    size="sm"
                    variant={activeFilter === 'popular' ? 'default' : 'outline'}
                    onClick={() => setActiveFilter('popular')}
                    className="rounded-full"
                  >
                    {t('popular', { ns: 'mapFilters' })}
                  </Button>
                  <Button
                    size="sm"
                    variant={activeFilter === 'saved' ? 'default' : 'outline'}
                    onClick={() => setActiveFilter('saved')}
                    className="rounded-full"
                  >
                    {t('saved', { ns: 'mapFilters' })}
                  </Button>
                </div>
              </SheetHeader>
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-3 pr-4 py-2">
                  {places.map((place) => {
                    const categoryIcon = getCategoryIconImage(place.category);
                    return (
                      <button
                        key={place.id}
                        onClick={() => {
                          handlePinClick(place);
                          setIsListViewOpen(false);
                        }}
                        className="w-full flex items-start gap-4 p-4 bg-card border-2 border-border rounded-2xl hover:border-primary/50 hover:shadow-md transition-all text-left"
                      >
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0">
                          <img 
                            src={categoryIcon} 
                            alt={place.category}
                            className="w-9 h-9 object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base text-foreground mb-1">
                            {place.name}
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                            {place.address || 'Address not available'}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {categoryDisplayNames[place.category as AllowedCategory]}
                            </Badge>
                            {place.isFollowing && (
                              <Badge className="bg-blue-100 text-blue-700 text-xs border-blue-200">
                                Following
                              </Badge>
                            )}
                            {place.isSaved && (
                              <Badge className="bg-green-100 text-green-700 text-xs border-green-200">
                                Saved
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  
                  {places.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <List className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No locations found</p>
                      {activeFilter === 'saved' && (
                        <p className="text-xs mt-1">Tap on the map to add your first location</p>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Loading/Error States */}
        {loading && (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200 z-50">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-600">Loading locations...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute bottom-4 left-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 shadow-sm z-50">
            <span className="text-sm text-red-600">Error: {error}</span>
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
    </>
  );
};

export default MapSection;
