
import React, { useState } from 'react';
import GoogleMapsSetup from '@/components/GoogleMapsSetup';
import AddLocationModal from './AddLocationModal';
import { Place } from '@/types/place';

interface MapSectionProps {
  places: Place[];
  onPinClick: (place: Place) => void;
  mapCenter: { lat: number; lng: number };
  selectedPlace: Place | null;
  onCloseSelectedPlace: () => void;
}

const MapSection = ({ places, onPinClick, mapCenter, selectedPlace, onCloseSelectedPlace }: MapSectionProps) => {
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [newLocationCoords, setNewLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapRightClick = (coords: { lat: number; lng: number }) => {
    setNewLocationCoords(coords);
    setIsAddLocationModalOpen(true);
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

  return (
    <>
      <div className="flex-1 relative px-4">
        <div className="h-full min-h-[300px] relative">
          <GoogleMapsSetup 
            places={places}
            onPinClick={onPinClick}
            mapCenter={mapCenter}
            selectedPlace={selectedPlace}
            onCloseSelectedPlace={onCloseSelectedPlace}
            onMapRightClick={handleMapRightClick}
          />
          
          {/* Mobile-friendly instruction overlay */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200 max-w-[200px]">
            <p className="text-xs text-gray-600">
              💡 Long press to add location
            </p>
          </div>
        </div>
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
    </>
  );
};

export default MapSection;
