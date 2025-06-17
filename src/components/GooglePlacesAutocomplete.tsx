
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
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        // Check if Google Maps is already loaded
        if (typeof google !== 'undefined' && google.maps && google.maps.places) {
          initializeAutocomplete();
          return;
        }

        // If not loaded, try to load it
        if (!window.google) {
          // Check if script is already being loaded
          const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
          if (!existingScript) {
            setError('Google Maps is not configured. Please contact support.');
            return;
          }
        }

        // Wait for Google Maps to load
        const checkGoogleMaps = setInterval(() => {
          if (typeof google !== 'undefined' && google.maps && google.maps.places) {
            clearInterval(checkGoogleMaps);
            initializeAutocomplete();
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkGoogleMaps);
          if (!isLoaded) {
            setError('Google Maps failed to load. Please refresh the page.');
          }
        }, 10000);

        return () => clearInterval(checkGoogleMaps);
      } catch (err) {
        console.error('Error initializing Google Maps:', err);
        setError('Failed to initialize Google Maps');
      }
    };

    initializeGoogleMaps();
  }, []);

  const initializeAutocomplete = () => {
    if (!inputRef.current) return;

    try {
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
          setError(null);
        } else {
          setError('Please select a location from the dropdown');
        }
      });

      setAutocomplete(autocompleteInstance);
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
          <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Location search unavailable"
            className="w-full pl-10 pr-4 py-3 border border-red-300 rounded-xl bg-red-50 text-red-600 cursor-not-allowed"
            disabled
          />
        </div>
        <div className="text-xs text-red-600 mt-1">{error}</div>
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
