
import React, { useState } from 'react';
import GoogleMapsSetup from '@/components/GoogleMapsSetup';
import AddLocationModal from './AddLocationModal';
import QuickAddPinModal from './QuickAddPinModal';
import MapCategoryFilters from './MapCategoryFilters';
import { cn } from '@/lib/utils';
import PinShareModal from '../explore/PinShareModal';
import { useMapLocations } from '@/hooks/useMapLocations';
import { useMapFilter } from '@/contexts/MapFilterContext';
import { Place } from '@/types/place';
import { PinShareData } from '@/services/pinSharingService';
import { toast } from 'sonner';
import { List } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface MapSectionProps {
  mapCenter: { lat: number; lng: number };
  currentCity: string;
}

const MapSection = ({ mapCenter, currentCity }: MapSectionProps) => {
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [isPinShareModalOpen, setIsPinShareModalOpen] = useState(false);
  const [isListViewOpen, setIsListViewOpen] = useState(false);
  const [newLocationCoords, setNewLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [pinToShare, setPinToShare] = useState<PinShareData | null>(null);
  
  // Use global filter context - single source of truth
  const { activeFilter, selectedCategories, setActiveFilter, toggleCategory } = useMapFilter();
  
  // Fetch locations based on current filters
  const { locations, loading, error, refetch } = useMapLocations({
    mapFilter: activeFilter,
    selectedCategories,
    currentCity
  });

  // Convert locations to Place format for GoogleMapsSetup with creator info
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
    setNewLocationCoords(coords);
    // Only allow adding pins in Saved filter
    if (activeFilter === 'saved') {
      setIsQuickAddModalOpen(true);
    } else {
      toast.error('Switch to "Saved" to add your favorite places', {
        description: 'You can only add pins when viewing your saved locations'
      });
    }
  };

  // Mobile-friendly tap to add a pin (only in Saved)
  const handleMapClick = (coords: { lat: number; lng: number }) => {
    setNewLocationCoords(coords);
    if (activeFilter === 'saved') {
      setIsQuickAddModalOpen(true);
    } else {
      toast.error('Switch to "Saved" to add your favorite places', {
        description: 'You can only add pins when viewing your saved locations'
      });
    }
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
      <div className="flex-1 relative min-h-[500px] w-full rounded-none overflow-hidden">
        <GoogleMapsSetup
          places={places}
          onPinClick={handlePinClick}
          onPinShare={handlePinShare}
          mapCenter={mapCenter}
          selectedPlace={selectedPlace}
          onCloseSelectedPlace={() => setSelectedPlace(null)}
          onMapRightClick={handleMapRightClick}
          onMapClick={handleMapClick}
          activeFilter={activeFilter}
        />

        {/* Map Category Filters - Hidden when pin detail is open */}
        {!selectedPlace && <MapCategoryFilters />}

        {/* List View Toggle - Modern Icon */}
        <div className="absolute bottom-8 right-4 z-40">
          <Sheet open={isListViewOpen} onOpenChange={setIsListViewOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                className="rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-gray-200 hover:bg-white w-12 h-12"
              >
                <List className="w-6 h-6 text-gray-700" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {activeFilter === 'following' && 'Amici'}
                  {activeFilter === 'popular' && 'Popolari'}
                  {activeFilter === 'saved' && 'Salvati'} Locations
                  <Badge variant="secondary" className="ml-auto">
                    {places.length}
                  </Badge>
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(70vh-80px)] mt-4">
                <div className="space-y-3 pr-4">
                  {places.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => {
                        handlePinClick(place);
                        setIsListViewOpen(false);
                      }}
                      className="w-full flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all text-left"
                    >
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {place.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {place.name}
                        </h4>
                        <p className="text-sm text-gray-500 truncate">
                          {place.address || place.category}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {place.isFollowing && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              Following
                            </Badge>
                          )}
                          {place.isSaved && (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              Saved
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                  
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

      <PinShareModal
        isOpen={isPinShareModalOpen}
        onClose={() => {
          setIsPinShareModalOpen(false);
          setPinToShare(null);
        }}
        pinData={pinToShare}
      />
    </>
  );
};

export default MapSection;
