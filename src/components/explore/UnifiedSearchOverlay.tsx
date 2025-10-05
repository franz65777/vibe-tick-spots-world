import React, { useState, useEffect } from 'react';
import { Search, MapPin, X, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loadGoogleMapsAPI } from '@/lib/googleMaps';

interface UnifiedSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onCitySelect?: (city: string, coordinates: { lat: number; lng: number }) => void;
}

const UnifiedSearchOverlay = ({ isOpen, onClose, onCitySelect }: UnifiedSearchOverlayProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [cityResults, setCityResults] = useState<any[]>([]);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (isOpen) {
      loadGoogleMapsAPI().then(() => {
        const g = (window as any).google;
        if (g?.maps?.places) {
          setAutocompleteService(new g.maps.places.AutocompleteService());
        }
      });
    }
  }, [isOpen]);

  // Perform city search when query changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim() && autocompleteService) {
        performCitySearch();
      } else {
        setCityResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, autocompleteService]);

  const performCitySearch = async () => {
    if (!autocompleteService || !searchQuery.trim()) return;

    setSearching(true);
    try {
      autocompleteService.getPlacePredictions(
        {
          input: searchQuery,
          types: ['(cities)'],
        },
        (predictions: any, status: any) => {
          const g = (window as any).google;
          if (status === g.maps.places.PlacesServiceStatus.OK && predictions) {
            // Get details for each city
            const service = new g.maps.places.PlacesService(document.createElement('div'));
            const results: any[] = [];
            
            predictions.slice(0, 10).forEach((prediction: any, index: number) => {
              service.getDetails(
                { placeId: prediction.place_id },
                (place: any, detailsStatus: any) => {
                  if (detailsStatus === g.maps.places.PlacesServiceStatus.OK && place.geometry) {
                    results.push({
                      place_id: prediction.place_id,
                      name: place.name,
                      formatted_address: place.formatted_address,
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng(),
                    });
                  }
                  
                  // Update results when all are loaded
                  if (index === predictions.slice(0, 10).length - 1) {
                    setCityResults(results);
                    setSearching(false);
                  }
                }
              );
            });
          } else {
            setCityResults([]);
            setSearching(false);
          }
        }
      );
    } catch (error) {
      console.error('City search error:', error);
      setSearching(false);
    }
  };

  const handleCitySelect = (city: any) => {
    if (onCitySelect) {
      onCitySelect(city.name, { lat: city.lat, lng: city.lng });
    }
    setSearchQuery('');
    setCityResults([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/98 backdrop-blur-md border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-bold">Search Cities</h2>
        </div>

        {/* Search Bar */}
        <div className="bg-background/98 backdrop-blur-md px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for any city in the world..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-11 text-sm rounded-full bg-background border-2 border-border shadow-sm"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(100vh-120px)] pb-20">
        {searching ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Searching cities...</span>
            </div>
          </div>
        ) : cityResults.length > 0 ? (
          <div className="px-4 py-3">
            <div className="space-y-1.5">
              {cityResults.map((city) => (
                <button
                  key={city.place_id}
                  onClick={() => handleCitySelect(city)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-accent border border-border transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-foreground">{city.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{city.formatted_address}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : searchQuery ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <MapPin className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-base font-medium text-foreground text-center">No cities found</p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Try searching for a different city name
            </p>
          </div>
        ) : (
          <div className="px-4 py-3">
            <div className="space-y-1.5">
              {[
                { name: 'Dublin', country: 'Ireland' },
                { name: 'London', country: 'United Kingdom' },
                { name: 'Paris', country: 'France' },
                { name: 'New York', country: 'United States' },
                { name: 'Tokyo', country: 'Japan' },
                { name: 'Barcelona', country: 'Spain' },
                { name: 'Amsterdam', country: 'Netherlands' },
                { name: 'Rome', country: 'Italy' }
              ].map((city) => (
                <button
                  key={city.name}
                  onClick={() => setSearchQuery(city.name)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-accent border border-border transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{city.name}</div>
                    <div className="text-xs text-muted-foreground">{city.country}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedSearchOverlay;
