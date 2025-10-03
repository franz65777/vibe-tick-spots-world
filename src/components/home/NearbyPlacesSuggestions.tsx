import React, { useEffect, useState } from 'react';
import { MapPin, Loader2, Search } from 'lucide-react';
import { loadGoogleMapsAPI } from '@/lib/googleMaps';
import { allowedCategories, categoryDisplayNames, type AllowedCategory } from '@/utils/allowedCategories';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

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
  onPlaceSelect: (place: NearbyPlace) => void;
  selectedPlaceId?: string;
}

const NearbyPlacesSuggestions: React.FC<NearbyPlacesSuggestionsProps> = ({
  coordinates,
  onPlaceSelect,
  selectedPlaceId
}) => {
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
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
          const sorted = dedup.sort((a, b) => (a.distance || 0) - (b.distance || 0)).slice(0, 5);
          if (!cancelled) setNearbyPlaces(sorted);
        };

        // If user typed something, run a text search near the pin
        if (searchQuery.trim().length >= 2) {
          const req: google.maps.places.TextSearchRequest = { location, radius: 2000, query: searchQuery } as any;
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
  }, [coordinates, searchQuery]);

  const filteredPlaces = searchQuery
    ? nearbyPlaces.filter(place =>
        place.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : nearbyPlaces;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Finding nearby places...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter results or type to search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm"
        />
      </div>

      {/* Nearby places list */}
      <ScrollArea className="h-[280px]">
        <div className="space-y-2 pr-2">
          {filteredPlaces.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                Tap a suggestion below or keep typing to search:
              </p>
              {filteredPlaces.map((place) => (
                <button
                  key={place.place_id}
                  onClick={() => onPlaceSelect(place)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                    selectedPlaceId === place.place_id
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'bg-background border-border hover:bg-accent hover:border-accent-foreground/20'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate text-sm">
                      {place.name}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {place.address}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5">
                        {categoryDisplayNames[place.category!]}
                      </Badge>
                      {place.distance !== undefined && (
                        <span className="text-[10px] text-muted-foreground">
                          {place.distance < 100
                            ? `${Math.round(place.distance)}m away`
                            : `${(place.distance / 1000).toFixed(1)}km away`}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No matching places nearby</p>
              <p className="text-xs mt-1">Try typing a different name</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default NearbyPlacesSuggestions;
