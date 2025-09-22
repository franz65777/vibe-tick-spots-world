
import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, AlertCircle, Loader2, Building } from 'lucide-react';
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from '@/lib/googleMaps';
import { toast } from 'sonner';

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

// Our specific allowed categories for pin saving
const OUR_ALLOWED_CATEGORIES = [
  'restaurant', 'meal_takeaway', 'food', 'meal_delivery',
  'bar', 'night_club', 'liquor_store',
  'cafe', 'coffee_shop',
  'bakery', 'bread_bakery',
  'lodging', 'hotel', 'motel', 'guest_house',
  'museum', 'art_gallery', 'cultural_center',
  'entertainment', 'amusement_park', 'theme_park', 'movie_theater', 'casino', 'bowling_alley', 'arcade'
];

// General establishment types that are valid
const ESTABLISHMENT_TYPES = [
  'establishment', 'point_of_interest', 'store', 'tourist_attraction'
];

// Disallowed administrative types
const DISALLOWED_PLACE_TYPES = [
  'locality', 'political', 'route', 'country', 'administrative_area_level_1',
  'administrative_area_level_2', 'administrative_area_level_3', 'postal_code',
  'sublocality', 'neighborhood', 'street_address', 'premise'
];

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
        console.log('Starting Google Maps Places initialization...');
        setIsLoading(true);
        setError(null);
        
        // Load Google Maps API with Places
        await loadGoogleMapsAPI();
        
        console.log('Google Maps API loaded, checking Places API...');
        
        // Verify Places API is available
        if (!window.google?.maps?.places?.Autocomplete) {
          throw new Error('Google Places API not available');
        }
        
        // Small delay to ensure everything is ready
        setTimeout(async () => {
          await initializeAutocomplete();
        }, 200);
        
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load location search. Please check your internet connection.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeGoogleMaps();

    // Cleanup on unmount
    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const isAllowedPlaceType = (types: string[]): boolean => {
    // Check if it matches our specific categories
    const hasOurCategory = types.some(type => OUR_ALLOWED_CATEGORIES.includes(type));
    const hasEstablishment = types.some(type => ESTABLISHMENT_TYPES.includes(type));
    const isNotAdministrative = !types.some(type => DISALLOWED_PLACE_TYPES.includes(type));
    
    return hasOurCategory || (hasEstablishment && isNotAdministrative);
  };

  const isDisallowedPlaceType = (types: string[]): boolean => {
    return types.some(type => DISALLOWED_PLACE_TYPES.includes(type));
  };

  const initializeAutocomplete = async () => {
    if (!inputRef.current || !isGoogleMapsLoaded()) {
      console.error('Google Maps not loaded or input ref not available');
      setError('Location search is not available');
      return;
    }

    try {
      console.log('Creating autocomplete instance...');
      
      // Get user's location for proximity-based search
      const getUserLocation = (): Promise<{lat: number, lng: number}> => {
        return new Promise((resolve, reject) => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              }),
              () => reject('Location access denied')
            );
          } else {
            reject('Geolocation not supported');
          }
        });
      };

      // Try to get user location and set up location bias
      const setupAutocomplete = async () => {
        let options: google.maps.places.AutocompleteOptions = {
          types: ['establishment'],
          fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types', 'business_status', 'rating'],
          componentRestrictions: { country: [] } // No country restrictions
        };

        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current!, options);

        try {
          const userLocation = await getUserLocation();
          // Set location bias after creating autocomplete
          const circle = new google.maps.Circle({
            center: userLocation,
            radius: 10000 // 10km
          });
          autocomplete.setBounds(circle.getBounds()!);
          console.log('Location bias set to user location:', userLocation);
        } catch (err) {
          console.log('Could not get user location, using default settings');
        }

        return autocomplete;
      };

      const autocomplete = await setupAutocomplete();

      autocompleteRef.current = autocomplete;

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log('Place selected:', place);
        
        if (!place || !place.geometry || !place.geometry.location) {
          console.warn('Invalid place selected');
          setError('Please select a valid location from the dropdown');
          return;
        }

        // Check if place type is allowed and business is operational
        const placeTypes = place.types || [];
        const businessStatus = place.business_status;
        
        // Skip closed businesses
        if (businessStatus === 'CLOSED_PERMANENTLY' || businessStatus === 'CLOSED_TEMPORARILY') {
          toast.error('This business appears to be closed. Please select an active location.');
          setInputValue('');
          return;
        }
        
        if (isDisallowedPlaceType(placeTypes)) {
          toast.error('Only real venues can be saved (restaurants, bars, cafés, hotels, museums, etc.)');
          setInputValue('');
          return;
        }

        if (!isAllowedPlaceType(placeTypes)) {
          toast.error('Only established venues can be saved. Try searching for restaurants, bars, cafés, hotels, or entertainment venues.');
          setInputValue('');
          return;
        }

        const selectedPlace = {
          place_id: place.place_id || '',
          name: place.name || place.formatted_address || '',
          address: place.formatted_address || '',
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          types: placeTypes
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
          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed shadow-sm"
          disabled={!isLoaded || isLoading}
          value={inputValue}
          onChange={handleInputChange}
        />
        <Building className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      </div>
      {isLoading && (
        <div className="text-xs text-gray-500 mt-1">
          Initializing location search...
        </div>
      )}
      {isLoaded && !isLoading && (
        <div className="text-xs text-blue-600 mt-1">
          🍽️ Search restaurants, bars, cafés, hotels & more nearby
        </div>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;
