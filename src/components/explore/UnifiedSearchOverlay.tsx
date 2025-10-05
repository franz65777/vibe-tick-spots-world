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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold">Search Cities</h2>
        </div>

        {/* Search Bar */}
        <div className="bg-background/95 backdrop-blur-sm px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for any city in the world..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-12 h-14 text-base rounded-full bg-background border-2 border-border shadow-sm"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(100vh-140px)] pb-20">
        {searching ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-muted-foreground">Searching cities...</span>
            </div>
          </div>
        ) : cityResults.length > 0 ? (
          <div className="px-4 py-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Cities</h3>
            <div className="space-y-2">
              {cityResults.map((city) => (
                <button
                  key={city.place_id}
                  onClick={() => handleCitySelect(city)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card hover:bg-accent border border-border transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-lg text-foreground">{city.name}</div>
                    <div className="text-sm text-muted-foreground truncate">{city.formatted_address}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : searchQuery ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <MapPin className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-foreground text-center">No cities found</p>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Try searching for a different city name
            </p>
          </div>
        ) : (
          <div className="px-4 py-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Popular Cities</h3>
            <div className="space-y-2">
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
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card hover:bg-accent border border-border transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{city.name}</div>
                    <div className="text-sm text-muted-foreground">{city.country}</div>
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
