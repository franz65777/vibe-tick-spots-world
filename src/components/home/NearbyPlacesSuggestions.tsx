import React, { useEffect, useState } from 'react';
import { MapPin, Loader2, Search, CheckCircle2, Plus } from 'lucide-react';
import { loadGoogleMapsAPI } from '@/lib/googleMaps';
import { allowedCategories, categoryDisplayNames, type AllowedCategory } from '@/utils/allowedCategories';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { toast } from 'sonner';

interface NearbyPlace {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string[];
  distance?: number;
  category?: AllowedCategory;
}

interface NearbyPlacesSuggestionsProps {
  coordinates: { lat: number; lng: number };
  onClose: () => void;
  isOpen: boolean;
}

const NearbyPlacesSuggestions: React.FC<NearbyPlacesSuggestionsProps> = ({
  coordinates,
  onClose,
  isOpen
}) => {
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [saving, setSaving] = useState(false);
  const { isPlaceSaved, savePlace } = useSavedPlaces();

  // Map Google Places types to our categories
  const mapPlaceTypeToCategory = (types: string[]): AllowedCategory | null => {
    if (types.includes('restaurant') || types.includes('meal_takeaway') || types.includes('food')) return 'restaurant';
    if (types.includes('bar') || types.includes('night_club')) return 'bar';
    if (types.includes('cafe')) return 'cafe';
    if (types.includes('bakery')) return 'bakery';
    if (types.includes('lodging')) return 'hotel';
    if (types.includes('museum') || types.includes('art_gallery')) return 'museum';
    if (types.includes('amusement_park') || types.includes('tourist_attraction')) return 'entertainment';
    return null;
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Return in meters
  };

  // Debounce the query so we only search when user pauses typing
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery), 600);
    return () => clearTimeout(id);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) return;
    
    let cancelled = false;
    const fetchPlaces = async () => {
      try {
        setIsLoading(true);
        await loadGoogleMapsAPI();
        const g = (window as any).google;
        if (!g?.maps?.places) { setIsLoading(false); return; }

        const service = new g.maps.places.PlacesService(document.createElement('div'));
        const location = new g.maps.LatLng(coordinates.lat, coordinates.lng);

        const toNearbyPlace = (place: any): NearbyPlace | null => {
          const category = mapPlaceTypeToCategory(place.types || []);
          if (!category || !place.geometry?.location) return null; // Only our categories
          const distance = calculateDistance(
            coordinates.lat,
            coordinates.lng,
            place.geometry.location.lat(),
            place.geometry.location.lng()
          );
          return {
            place_id: place.place_id,
            name: place.name,
            address: place.vicinity || place.formatted_address || '',
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            types: place.types || [],
            distance,
            category
          };
        };

        const finalize = (raw: any[]) => {
          const mapped = raw.map(toNearbyPlace).filter(Boolean) as NearbyPlace[];
          const dedup = Array.from(new Map(mapped.map(p => [p.place_id, p])).values());
          const sorted = dedup.sort((a, b) => (a.distance || 0) - (b.distance || 0)).slice(0, 15);
          if (!cancelled) setNearbyPlaces(sorted);
        };

        // If user typed something, run a text search near the pin (debounced)
        if (debouncedQuery.trim().length >= 2) {
          const req: google.maps.places.TextSearchRequest = { location, radius: 2000, query: debouncedQuery } as any;
          service.textSearch(req, (results: any, status: any) => {
            if (status === g.maps.places.PlacesServiceStatus.OK && results) finalize(results);
            setIsLoading(false);
          });
          return;
        }

        // Otherwise fetch by types in parallel and merge
        const types = ['restaurant','bar','cafe','bakery','lodging','museum','tourist_attraction','night_club','art_gallery','amusement_park'];
        const all: any[] = [];
        await Promise.all(
          types.map(type => new Promise<void>(resolve => {
            const req: google.maps.places.PlaceSearchRequest = { location, radius: 800, type: type as any } as any;
            service.nearbySearch(req, (results: any, status: any) => {
              if (status === g.maps.places.PlacesServiceStatus.OK && results) {
                all.push(...results);
              }
              resolve();
            });
          }))
        );
        finalize(all);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching nearby places:', error);
        setIsLoading(false);
      }
    };

    fetchPlaces();
    return () => { cancelled = true; };
  }, [coordinates, debouncedQuery, isOpen]);

  const handleSaveClick = async () => {
    if (!selectedPlace) return;
    
    setSaving(true);
    try {
      await savePlace({
        id: selectedPlace.place_id,
        name: selectedPlace.name,
        category: selectedPlace.category || 'entertainment',
        city: selectedPlace.address.split(',')[1]?.trim() || 'Unknown',
        coordinates: { lat: selectedPlace.lat, lng: selectedPlace.lng }
      });
      
      toast.success(`${selectedPlace.name} saved to favorites!`);
      onClose();
    } catch (error) {
      console.error('Error saving place:', error);
      toast.error('Failed to save place');
    } finally {
      setSaving(false);
    }
  };

  const filteredPlaces = searchQuery
    ? nearbyPlaces.filter(place =>
        place.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : nearbyPlaces;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            Save Location to Favorites
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Filter results or type to search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition text-base"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-gray-600">Finding nearby places...</span>
            </div>
          ) : (
            <>
              {filteredPlaces.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600">
                    Tap a suggestion below or keep typing to search:
                  </p>
                  <div className="space-y-2">
                    {filteredPlaces.map((place) => {
                      const isSaved = isPlaceSaved(place.place_id);
                      const isSelected = selectedPlace?.place_id === place.place_id;
                      
                      return (
                        <div key={place.place_id} className="relative">
                          <button
                            onClick={() => setSelectedPlace(place)}
                            className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                              isSelected
                                ? 'bg-blue-50 border-blue-500 shadow-md'
                                : isSaved
                                ? 'bg-green-50 border-green-300 hover:border-green-400'
                                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <CategoryIcon category={categoryDisplayNames[place.category!]} className="w-12 h-12 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 text-base leading-tight line-clamp-2 mb-1">
                                {place.name}
                              </h4>
                              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                {place.address}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {categoryDisplayNames[place.category!]}
                                </Badge>
                                {place.distance !== undefined && (
                                  <span className="text-xs text-gray-500">
                                    {place.distance < 100
                                      ? `${Math.round(place.distance)}m away`
                                      : `${(place.distance / 1000).toFixed(1)}km away`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                          {isSaved && (
                            <div className="absolute top-3 right-3 z-10">
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 rounded-full shadow-md">
                                <CheckCircle2 className="w-4 h-4 text-white" />
                                <span className="text-xs font-semibold text-white">Saved</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <MapPin className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p className="text-base font-medium">No matching places nearby</p>
                  <p className="text-sm mt-1">Try typing a different name</p>
                </div>
              )}
            </>
          )}

          {/* Selected place preview */}
          {selectedPlace && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-500 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-700">Selected Location:</span>
              </div>
              <p className="font-semibold text-gray-900 mb-1">{selectedPlace.name}</p>
              <p className="text-sm text-gray-600 mb-2">{selectedPlace.address}</p>
              <Badge variant="secondary" className="text-xs">
                Category: {categoryDisplayNames[selectedPlace.category!]}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 px-6 pb-6">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
          {selectedPlace && isPlaceSaved(selectedPlace.place_id) ? (
            <Button 
              disabled
              className="flex-1 bg-green-500 hover:bg-green-500"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Already Saved
            </Button>
          ) : (
            <Button 
              onClick={handleSaveClick} 
              disabled={!selectedPlace || saving}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Save to Favorites
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NearbyPlacesSuggestions;
