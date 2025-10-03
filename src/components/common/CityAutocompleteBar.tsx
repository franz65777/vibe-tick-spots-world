import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from '@/lib/googleMaps';

interface CityAutocompleteBarProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (value: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent) => void;
  onCitySelect: (city: string, coords?: { lat: number; lng: number }) => void;
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
    let listener: google.maps.MapsEventListener | null = null;

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

        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place || !place.geometry || !place.geometry.location) return;
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const label = place.name || place.formatted_address || '';
          onCitySelect(label, { lat, lng });
          // Clear input after selection so bar shows current city summary again
          onSearchChange('');
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
      if (listener) listener.remove();
    };
  }, [onCitySelect, onSearchChange]);

  return (
    <div className="group relative">
      <div className="relative">
        {isLoading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder={isLoading ? 'Loading city search…' : 'Search any city worldwide…'}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={onSearchKeyPress}
          className="w-full h-12 pl-10 pr-4 rounded-2xl bg-background/80 backdrop-blur-xl border border-border shadow-[0_6px_20px_hsl(var(--foreground)/0.06)] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition placeholder:text-muted-foreground text-foreground"
        />
      </div>

      {/* Compact current city pill below when not typing */}
      {!searchQuery && currentCity && (
        <div className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          <span>Current: <span className="text-foreground font-medium">{currentCity}</span></span>
        </div>
      )}
    </div>
  );
};

export default CityAutocompleteBar;
