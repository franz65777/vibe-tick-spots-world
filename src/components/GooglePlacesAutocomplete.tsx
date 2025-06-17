
import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, AlertCircle } from 'lucide-react';

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        // Check if Google Maps is available
        if (typeof window.google !== 'undefined' && window.google.maps && window.google.maps.places) {
          initializeAutocomplete();
          return;
        }

        // If Google Maps is not available, show error
        setError('Google Maps API not configured. Location search is unavailable.');
      } catch (err) {
        console.error('Error initializing Google Maps:', err);
        setError('Failed to initialize Google Maps');
      }
    };

    initializeGoogleMaps();
  }, []);

  const initializeAutocomplete = () => {
    if (!inputRef.current || typeof window.google === 'undefined') return;

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment', 'geocode'],
        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types']
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
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
          setError(null);
        } else {
          setError('Please select a location from the dropdown');
        }
      });

      setIsLoaded(true);
      setError(null);
    } catch (err) {
      console.error('Error creating autocomplete:', err);
      setError('Failed to initialize location search');
    }
  };

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <div className="relative">
          <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Location search requires Google Maps API"
            className="w-full pl-10 pr-4 py-3 border border-orange-300 rounded-xl bg-orange-50 text-orange-700 cursor-not-allowed"
            disabled
          />
        </div>
        <div className="text-xs text-orange-600 mt-1">
          Google Maps API key required for location search
        </div>
      </div>
    );
  }

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
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-gray-50 rounded-xl flex items-center justify-center">
          <div className="text-sm text-gray-500">Loading location search...</div>
        </div>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;
