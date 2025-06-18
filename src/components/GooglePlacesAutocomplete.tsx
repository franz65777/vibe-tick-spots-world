
import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, AlertCircle } from 'lucide-react';
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from '@/lib/googleMaps';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        console.log('Loading Google Maps API...');
        setIsLoading(true);
        
        // Load Google Maps API
        await loadGoogleMapsAPI();
        
        console.log('Google Maps API loaded, initializing autocomplete...');
        initializeAutocomplete();
        
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load Google Maps. Please check your internet connection.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeGoogleMaps();
  }, []);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !isGoogleMapsLoaded()) {
      console.error('Google Maps not loaded or input ref not available');
      return;
    }

    try {
      console.log('Creating autocomplete instance...');
      
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment', 'geocode'],
        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types']
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log('Place selected:', place);
        
        if (place.geometry && place.geometry.location) {
          const selectedPlace = {
            place_id: place.place_id || '',
            name: place.name || place.formatted_address || '',
            address: place.formatted_address || '',
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            types: place.types || []
          };
          
          console.log('Calling onPlaceSelect with:', selectedPlace);
          onPlaceSelect(selectedPlace);
          setError(null);
        } else {
          console.warn('No geometry found for place');
          setError('Please select a location from the dropdown');
        }
      });

      setIsLoaded(true);
      setError(null);
      console.log('Autocomplete initialized successfully');
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
            placeholder="Location search failed"
            className="w-full pl-10 pr-4 py-3 border border-orange-300 rounded-xl bg-orange-50 text-orange-700 cursor-not-allowed"
            disabled
          />
        </div>
        <div className="text-xs text-orange-600 mt-1">
          {error}
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
          placeholder={isLoading ? "Loading..." : placeholder}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          disabled={!isLoaded || isLoading}
        />
        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      </div>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-50 rounded-xl flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm text-gray-500">Loading location search...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;
