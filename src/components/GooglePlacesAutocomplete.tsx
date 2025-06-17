
import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';

interface GooglePlacesAutocompleteProps {
  onPlaceSelect: (place: {
    place_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    types: string[];
  }) => void;
  placeholder?: string;
  className?: string;
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  onPlaceSelect,
  placeholder = "Search for a location...",
  className = ""
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if Google Maps is loaded
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      initializeAutocomplete();
    } else {
      // Wait for Google Maps to load
      const checkGoogleMaps = setInterval(() => {
        if (typeof google !== 'undefined' && google.maps && google.maps.places) {
          clearInterval(checkGoogleMaps);
          initializeAutocomplete();
        }
      }, 100);

      return () => clearInterval(checkGoogleMaps);
    }
  }, []);

  const initializeAutocomplete = () => {
    if (!inputRef.current) return;

    const autocompleteInstance = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types']
    });

    autocompleteInstance.addListener('place_changed', () => {
      const place = autocompleteInstance.getPlace();
      
      if (place.geometry && place.geometry.location) {
        const selectedPlace = {
          place_id: place.place_id || '',
          name: place.name || '',
          address: place.formatted_address || '',
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          types: place.types || []
        };
        
        onPlaceSelect(selectedPlace);
      }
    });

    setAutocomplete(autocompleteInstance);
    setIsLoaded(true);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={!isLoaded}
        />
        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      </div>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-50 rounded-xl flex items-center justify-center">
          <div className="text-sm text-gray-500">Loading Google Places...</div>
        </div>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;
