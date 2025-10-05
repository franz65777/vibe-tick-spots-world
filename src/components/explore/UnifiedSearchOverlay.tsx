import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import { loadGoogleMapsAPI } from '@/lib/googleMaps';

interface UnifiedSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onCitySelect?: (city: string, coordinates: { lat: number; lng: number }) => void;
}

const UnifiedSearchOverlay = ({ isOpen, onClose, onCitySelect }: UnifiedSearchOverlayProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [placesService, setPlacesService] = useState<any>(null);
  const [trendingCities, setTrendingCities] = useState<{ name: string; count: number }[]>([]);

  const popularCities = [
    { name: 'Dublin', lat: 53.3498053, lng: -6.2603097 },
    { name: 'London', lat: 51.5074, lng: -0.1278 },
    { name: 'Paris', lat: 48.8566, lng: 2.3522 },
    { name: 'New York', lat: 40.7128, lng: -74.0060 },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
    { name: 'Barcelona', lat: 41.3851, lng: 2.1734 },
    { name: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
    { name: 'Rome', lat: 41.9028, lng: 12.4964 }
  ];

  interface CityResult {
    name: string;
    address: string;
    lat: number;
    lng: number;
  }

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      loadGoogleMapsAPI().then(() => {
        const google = (window as any).google;
        if (google?.maps?.places) {
          setAutocompleteService(new google.maps.places.AutocompleteService());
          setPlacesService(new google.maps.places.PlacesService(document.createElement('div')));
        }
      });
    }
  }, [isOpen]);

  // Close overlay with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Fetch trending cities (global engagement counts)
  useEffect(() => {
    if (!isOpen) return;
    fetch('/functions/v1/trending-cities')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const items = (data?.cities || []).map((c: any) => ({
          name: c.city as string,
          count: Number(c.total) || 0,
        }));
        setTrendingCities(items);
      })
      .catch(() => {
        // ignore errors, we'll fallback to static list
      });
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim() && autocompleteService && placesService) {
        searchCities();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, autocompleteService, placesService]);

  const searchCities = () => {
    if (!query.trim() || !autocompleteService || !placesService) return;

    setLoading(true);
    autocompleteService.getPlacePredictions(
      {
        input: query,
        types: ['(cities)']
      },
      (predictions: any[], status: any) => {
        const google = (window as any).google;
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          const cityPromises = predictions.slice(0, 8).map((prediction: any) => 
            new Promise<CityResult | null>((resolve) => {
              placesService.getDetails(
                { placeId: prediction.place_id },
                (place: any, detailStatus: any) => {
                  if (detailStatus === google.maps.places.PlacesServiceStatus.OK && place.geometry) {
                    resolve({
                      name: place.name,
                      address: place.formatted_address,
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng()
                    });
                  } else {
                    resolve(null);
                  }
                }
              );
            })
          );

          Promise.all(cityPromises).then((cities) => {
            setResults(cities.filter(Boolean) as CityResult[]);
            setLoading(false);
          });
        } else {
          setResults([]);
          setLoading(false);
        }
      }
    );
  };

  const selectCityByName = (name: string) => {
    const google = (window as any).google;
    if (!placesService || !google) return;
    setLoading(true);
    placesService.textSearch({ query: name }, (results: any[], status: any) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results?.[0]?.geometry) {
        const r = results[0];
        handleCitySelect({
          name: r.name || name,
          lat: r.geometry.location.lat(),
          lng: r.geometry.location.lng()
        } as any);
      }
      setLoading(false);
    });
  };
  
  const handleCitySelect = (city: { name: string; lat: number; lng: number }) => {
    if (onCitySelect) {
      onCitySelect(city.name, { lat: city.lat, lng: city.lng });
    }
    setQuery('');
    setResults([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-lg z-50 flex flex-col" onClick={onClose}>
      {/* Header with integrated search */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cities worldwide..."
            className="w-full pl-10 pr-4 py-3 text-base bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        {!query.trim() && (
          <div className="space-y-3 mb-4">
            <div className="flex flex-wrap gap-2">
              {(trendingCities.length ? trendingCities : popularCities.map(c => ({ name: c.name, count: 0 }))).map((item) => (
                <button
                  key={item.name}
                  onClick={() => selectCityByName(item.name)}
                  className="px-3 py-1.5 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-800 transition-all shadow-sm hover:shadow border border-gray-100 flex items-center gap-2"
                >
                  <span>{item.name}</span>
                  {'count' in item && item.count > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="ml-2 text-white">Searching...</span>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((city, index) => (
              <button
                key={index}
                onClick={() => handleCitySelect(city)}
                className="w-full text-left p-4 bg-white hover:bg-gray-50 rounded-xl transition-all border border-gray-100 shadow-md hover:shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base text-gray-900 mb-1">
                      {city.name}
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2">
                      {city.address}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {query.trim() && !loading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-white">
            <MapPin className="w-16 h-16 mb-3 opacity-50" />
            <p className="text-lg font-medium">No cities found</p>
            <p className="text-sm opacity-75 mt-1">Try a different search</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedSearchOverlay;
