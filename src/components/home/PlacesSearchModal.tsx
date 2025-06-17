
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Star, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useGooglePlacesSearch } from '@/hooks/useGooglePlacesSearch';
import { useGeolocation } from '@/hooks/useGeolocation';

interface PlacesSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceSelect: (place: { coordinates: { lat: number; lng: number }; name: string }) => void;
}

const PlacesSearchModal = ({ isOpen, onClose, onPlaceSelect }: PlacesSearchModalProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const { searchPlaces, isLoading } = useGooglePlacesSearch();
  const { location } = useGeolocation();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      // Convert GeolocationData to expected format
      const searchLocation = location ? {
        lat: location.latitude,
        lng: location.longitude
      } : undefined;
      
      const places = await searchPlaces(query, searchLocation);
      setResults(places);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, searchPlaces, location]);

  const handlePlaceSelect = (place: any) => {
    onPlaceSelect({
      coordinates: place.coordinates,
      name: place.name
    });
    onClose();
    setQuery('');
    setResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Search Places</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for restaurants, bars, attractions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Searching...</p>
              </div>
            )}

            {!isLoading && results.length === 0 && query.trim() && (
              <div className="text-center py-4">
                <p className="text-gray-500">No places found</p>
              </div>
            )}

            {results.map((place) => (
              <button
                key={place.id}
                onClick={() => handlePlaceSelect(place)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {place.photoUrl ? (
                    <img
                      src={place.photoUrl}
                      alt={place.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{place.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{place.address}</p>
                    {place.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-600">{place.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlacesSearchModal;
