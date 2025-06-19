
import React, { useState } from 'react';
import GoogleMapsSetup from '@/components/GoogleMapsSetup';
import AddLocationModal from './AddLocationModal';
import { Place } from '@/types/place';
import { MapPin, Navigation, Zap } from 'lucide-react';

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

  // Enhanced map with better visual feedback
  return (
    <>
      <div className="flex-1 relative bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="h-full min-h-[280px] w-full relative">
          {/* Enhanced Google Maps */}
          <GoogleMapsSetup 
            places={places}
            onPinClick={onPinClick}
            mapCenter={mapCenter}
            selectedPlace={selectedPlace}
            onCloseSelectedPlace={onCloseSelectedPlace}
            onMapRightClick={handleMapRightClick}
          />
          
          {/* Enhanced instruction overlay */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-gray-200 max-w-[200px] z-20">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Quick Tip</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Long press anywhere to add a new location to the map
            </p>
          </div>

          {/* Map stats overlay */}
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-gray-200 z-20">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{places.length}</div>
                <div className="text-xs text-gray-500">Places</div>
              </div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {places.filter(p => p.isNew).length}
                </div>
                <div className="text-xs text-gray-500">New</div>
              </div>
            </div>
          </div>

          {/* Enhanced location indicator */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-gray-200 z-20">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Current View</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Lat: {mapCenter.lat.toFixed(4)}, Lng: {mapCenter.lng.toFixed(4)}
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
