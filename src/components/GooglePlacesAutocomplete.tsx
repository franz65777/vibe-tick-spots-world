
import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, AlertCircle, Loader2 } from 'lucide-react';
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
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        console.log('Starting Google Maps initialization...');
        setIsLoading(true);
        setError(null);
        
        // Load Google Maps API
        await loadGoogleMapsAPI();
        
        console.log('Google Maps API loaded, initializing autocomplete...');
        
        // Small delay to ensure everything is ready
        setTimeout(() => {
          initializeAutocomplete();
        }, 100);
        
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load location search. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeGoogleMaps();

    // Cleanup on unmount
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !isGoogleMapsLoaded()) {
      console.error('Google Maps not loaded or input ref not available');
      setError('Location search is not available');
      return;
    }

    try {
      console.log('Creating autocomplete instance...');
      
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment', 'geocode'],
        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types'],
        componentRestrictions: { country: [] } // Allow all countries
      });

      autocompleteRef.current = autocomplete;

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log('Place selected:', place);
        
        if (!place || !place.geometry || !place.geometry.location) {
          console.warn('Invalid place selected');
          setError('Please select a valid location from the dropdown');
          return;
        }

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
      });

      setIsLoaded(true);
      setError(null);
      console.log('Autocomplete initialized successfully');
    } catch (err) {
      console.error('Error creating autocomplete:', err);
      setError('Failed to initialize location search');
      setIsLoaded(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (error && e.target.value.length > 0) {
      setError(null);
    }
  };

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <div className="relative">
          <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Location search unavailable"
            className="w-full pl-10 pr-4 py-3 border border-red-300 rounded-xl bg-red-50 text-red-700 cursor-not-allowed"
            disabled
          />
        </div>
        <div className="text-xs text-red-600 mt-1">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {isLoading ? (
          <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5 animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder={isLoading ? "Loading location search..." : placeholder}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          disabled={!isLoaded || isLoading}
          value={inputValue}
          onChange={handleInputChange}
        />
        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      </div>
      {isLoading && (
        <div className="text-xs text-gray-500 mt-1">
          Initializing location search...
        </div>
      )}
      {isLoaded && !isLoading && (
        <div className="text-xs text-green-600 mt-1">
          Start typing to search for locations
        </div>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;
