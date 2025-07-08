
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
      // Here you would typically call a service to save the location
      console.log('Saving new location:', locationData);
      
      // For now, just close the modal
      setIsAddLocationModalOpen(false);
      setNewLocationCoords(null);
      
      // You could add a toast notification here
      alert('Location saved successfully!');
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Failed to save location. Please try again.');
    }
  };

  return (
    <>
      <div className="flex-1 relative min-h-[500px]">
        <GoogleMapsSetup 
          places={places}
          onPinClick={onPinClick}
          mapCenter={mapCenter}
          selectedPlace={selectedPlace}
          onCloseSelectedPlace={onCloseSelectedPlace}
          onMapRightClick={handleMapRightClick}
        />
        
        {/* Instruction overlay */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200 z-50">
          <p className="text-xs text-gray-600">
            💡 Right-click on the map to add a new location
          </p>
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
