
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
    const loadGoogleMaps = () => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        initializeAutocomplete();
        return;
      }

      // Create and load the Google Maps script with a proper API key
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;

      // Set up global callback
      window.initGoogleMaps = () => {
        initializeAutocomplete();
      };

      script.onerror = () => {
        setError('Failed to load Google Maps. Please check your API key configuration.');
      };

      document.head.appendChild(script);
    };

    const initializeAutocomplete = () => {
      if (!inputRef.current) return;

      try {
        const autocompleteInstance = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['establishment', 'geocode'],
          fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types']
        });

        autocompleteInstance.addListener('place_changed', () => {
          const place = autocompleteInstance.getPlace();
          
          if (place.geometry && place.geometry.location && place.place_id) {
            const selectedPlace = {
              place_id: place.place_id,
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
        setError('Failed to initialize location search. Please contact support.');
      }
    };

    loadGoogleMaps();

    return () => {
      // Cleanup
      if (window.initGoogleMaps) {
        delete window.initGoogleMaps;
      }
    };
  }, []);

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <div className="relative">
          <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Location search requires Google Maps API"
            className="w-full pl-10 pr-4 py-3 border border-red-300 rounded-xl bg-red-50 text-red-600 cursor-not-allowed"
            disabled
          />
        </div>
        <div className="text-xs text-red-600 mt-1">
          Google Maps API key needed. Contact admin to enable location search.
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
          placeholder={isLoaded ? placeholder : "Loading location search..."}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          disabled={!isLoaded}
        />
        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      </div>
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-gray-50 rounded-xl flex items-center justify-center">
          <div className="text-sm text-gray-500">Setting up location search...</div>
        </div>
      )}
    </div>
  );
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

export default GooglePlacesAutocomplete;
