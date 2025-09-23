
import React, { useState, useEffect } from 'react';
import GoogleMapsSetup from '@/components/GoogleMapsSetup';
import AddLocationModal from './AddLocationModal';
import QuickAddPinModal from './QuickAddPinModal';
import MapCategoryFilters, { type MapFilter } from './MapCategoryFilters';
import PinShareModal from '../explore/PinShareModal';
import { useMapLocations } from '@/hooks/useMapLocations';
import { Place } from '@/types/place';
import { PinShareData } from '@/services/pinSharingService';
import { toast } from 'sonner';

interface MapSectionProps {
  mapCenter: { lat: number; lng: number };
  currentCity: string;
  activeFilter?: MapFilter;
}

const MapSection = ({ mapCenter, currentCity, activeFilter }: MapSectionProps) => {
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [isPinShareModalOpen, setIsPinShareModalOpen] = useState(false);
  const [newLocationCoords, setNewLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [pinToShare, setPinToShare] = useState<PinShareData | null>(null);
  
  // Filter states
  const [activeMapFilter, setActiveMapFilter] = useState<MapFilter>(activeFilter || 'popular');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Keep internal filter in sync with parent prop
  useEffect(() => {
    if (activeFilter && activeFilter !== activeMapFilter) {
      setActiveMapFilter(activeFilter);
    }
  }, [activeFilter]);

  // Reset category filters when switching between main filters
  useEffect(() => {
    setSelectedCategories([]);
  }, [activeMapFilter]);
  
  // Fetch locations based on current filters
  const { locations, loading, error, refetch } = useMapLocations({
    mapFilter: activeMapFilter,
    selectedCategories,
    currentCity
  });

  // Convert locations to Place format for GoogleMapsSetup
  const places: Place[] = locations.map(location => ({
    id: location.id,
    name: location.name,
    category: location.category as any,
    address: location.address || '',
    coordinates: location.coordinates,
    isFollowing: location.isFollowing || false,
    isNew: location.isNew || false,
    isSaved: location.isSaved || false,
    likes: 0, // Default value
    visitors: [] // Default value as string array
  }));

  const handleMapRightClick = (coords: { lat: number; lng: number }) => {
    setNewLocationCoords(coords);
    // Only allow adding pins in Saved filter
    if (activeMapFilter === 'saved') {
      setIsQuickAddModalOpen(true);
    } else {
      toast.info('Switch to "Saved" to add your favorite places');
    }
  };

  // Mobile-friendly tap to add a pin (only in Saved)
  const handleMapClick = (coords: { lat: number; lng: number }) => {
    setNewLocationCoords(coords);
    if (activeMapFilter === 'saved') {
      setIsQuickAddModalOpen(true);
    } else {
      toast.info('Switch to "Saved" to add your favorite places');
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
    setActiveMapFilter('saved');
    setIsQuickAddModalOpen(false);
    setNewLocationCoords(null);
    // Force refetch to show newly saved location
    try { refetch?.(); } catch {}
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <>
      <div className="flex-1 relative min-h-[500px]">
        <GoogleMapsSetup 
          places={places}
          onPinClick={handlePinClick}
          onPinShare={handlePinShare}
          mapCenter={mapCenter}
          selectedPlace={selectedPlace}
          onCloseSelectedPlace={() => setSelectedPlace(null)}
          onMapRightClick={handleMapRightClick}
          onMapClick={handleMapClick}
        />
        
        {/* Map Category Filters */}
        <MapCategoryFilters
          activeMapFilter={activeMapFilter}
          onMapFilterChange={setActiveMapFilter}
          selectedCategories={selectedCategories}
          onCategoryToggle={handleCategoryToggle}
        />
        
        {/* Loading/Error States */}
        {loading && (
          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200 z-50">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-600">Loading locations...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 shadow-sm z-50">
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
