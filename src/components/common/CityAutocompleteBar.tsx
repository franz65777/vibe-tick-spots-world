import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from '@/lib/googleMaps';

interface CityAutocompleteBarProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (value: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent) => void;
  onCitySelect: (city: string, coords?: { lat: number; lng: number }) => void;
  onFocusOpen?: () => void;
}

const CityAutocompleteBar: React.FC<CityAutocompleteBarProps> = ({
  searchQuery,
  currentCity,
  onSearchChange,
  onSearchKeyPress,
  onCitySelect,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        await loadGoogleMapsAPI();
        if (!isGoogleMapsLoaded() || !inputRef.current) return;

        // Restrict to cities only; Google handles multilingual search & typos
        const options: google.maps.places.AutocompleteOptions = {
          types: ['(cities)'],
          fields: ['place_id', 'name', 'geometry', 'formatted_address']
        };

        const ac = new window.google.maps.places.Autocomplete(inputRef.current, options);
        autocompleteRef.current = ac;

        // Use callback ref to ensure latest handlers
        const placeChangedListener = ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place || !place.geometry || !place.geometry.location) return;
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const label = place.name || place.formatted_address || '';
          
          // Immediately call handlers and fill the input
          onCitySelect(label, { lat, lng });
          onSearchChange(label);
          inputRef.current?.blur();
        });

        // Position dropdown correctly
        const positionDropdown = () => {
          const pac = document.querySelector('.pac-container') as HTMLElement;
          if (pac && inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            pac.style.position = 'fixed';
            pac.style.top = `${rect.bottom + 8}px`;
            pac.style.left = `${rect.left}px`;
            pac.style.width = `${rect.width}px`;
          }
        };

        // Apply positioning on input focus and typing
        inputRef.current?.addEventListener('focus', () => {
          setTimeout(positionDropdown, 50);
        });
        
        inputRef.current?.addEventListener('input', () => {
          setTimeout(positionDropdown, 50);
        });

      } finally {
        setIsLoading(false);
      }
    };

    init();

    return () => {
      if (autocompleteRef.current && (window as any).google?.maps?.event) {
        (window as any).google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onCitySelect, onSearchChange]);

  return (
    <div className="group relative">
      <div className="relative">
        {isLoading ? (
          <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        ) : (
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder={isLoading ? 'Loading…' : currentCity || 'Search any city worldwide'}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={onSearchKeyPress}
          onFocus={() => onFocusOpen?.()}
          className="w-full h-11 pl-11 pr-4 rounded-full bg-background border border-input shadow-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-input transition-all placeholder:text-muted-foreground text-sm font-medium text-foreground"
        />
      </div>
    </div>
  );
};

export default CityAutocompleteBar;
