import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Search, MapPin, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import MinimalLocationCard from '@/components/explore/MinimalLocationCard';
import LocationPostLibrary from '@/components/explore/LocationPostLibrary';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { normalizeCity } from '@/utils/cityNormalization';

interface SavedLocationsListProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

const SavedLocationsList = ({ isOpen, onClose, userId }: SavedLocationsListProps) => {
  const { user: currentUser } = useAuth();
  const targetUserId = userId || currentUser?.id;
  const [savedPlaces, setSavedPlaces] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedPlace, setSelectedPlace] = useState<any>(null);

  // Heuristics aligned with search/map city logic
  const isStreetLike = (value?: string | null) => {
    if (!value) return false;
    const v = value.toLowerCase();
    if (/\d/.test(v)) return true;
    return /(street|st\.?|avenue|ave\.?|road|rd\.?|square|sq\.?|piazza|platz|plaza|place|lane|ln\.?|drive|dr\.?|court|ct\.?|alley|way|quay|boulevard|blvd\.?|rue|via|calle|estrada|rua)/i.test(v);
  };
  const extractCityFromAddress = (addr?: string | null) => {
    if (!addr) return '';
    const parts = addr.split(',').map(p => p.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.length > 2 && !/^\d+$/.test(p) && !isStreetLike(p)) return p;
    }
    return '';
  };
  const deriveDisplayCity = (
    rawCity?: string | null,
    address?: string | null,
    coords?: { lat?: number; lng?: number } | null
  ): string => {
    const base = (rawCity && rawCity.trim()) || extractCityFromAddress(address) || '';
    const normalized = normalizeCity(base || null);
    if (normalized !== 'Unknown' && normalized.length > 2) return normalized;

    // If we have an address, try to extract something useful from it
    if (address) {
      const parts = address.split(',').map(p => p.trim()).filter(Boolean);
      // Take the second-to-last part if available (often the city in formatted addresses)
      if (parts.length >= 2) {
        const potentialCity = parts[parts.length - 2];
        if (potentialCity && potentialCity.length > 2 && !isStreetLike(potentialCity)) {
          const cityNorm = normalizeCity(potentialCity);
          if (cityNorm !== 'Unknown' && cityNorm.length > 2) return cityNorm;
        }
      }
    }

    return 'Unknown City';
  };

  useEffect(() => {
    const loadSavedPlaces = async () => {
      if (!targetUserId) {
        setSavedPlaces({});
        setLoading(false);
        return;
      }

      try {
        // Fetch from saved_places table
        const { data: savedPlacesData, error: savedPlacesError } = await supabase
          .from('saved_places')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false });

        if (savedPlacesError) console.error('Error fetching saved_places:', savedPlacesError);

        // Fetch from user_saved_locations table (fetch IDs first, then load locations separately)
        const { data: userSavedRows, error: userSavedError } = await supabase
          .from('user_saved_locations')
          .select('location_id, created_at')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false });

        if (userSavedError) console.error('Error fetching user_saved_locations:', userSavedError);

        // Load related locations in a separate query (no FK required)
        let locationsMap: Record<string, any> = {};
        if (userSavedRows && userSavedRows.length > 0) {
          const locationIds = userSavedRows
            .map((r: any) => r.location_id)
            .filter((id: string | null) => Boolean(id));

          if (locationIds.length > 0) {
            const { data: locationsData, error: locationsError } = await supabase
              .from('locations')
              .select('id, name, category, city, latitude, longitude, google_place_id, address')
              .in('id', locationIds);

            if (locationsError) {
              console.error('Error fetching locations:', locationsError);
            }

            if (locationsData && locationsData.length > 0) {
              locationsMap = Object.fromEntries(
                locationsData.map((loc: any) => [loc.id, loc])
              );
            }
          }
        }

        // Group by city using same logic as search/map
        const groupedByCity: any = {};
        
        savedPlacesData?.forEach((place: any) => {
          const coords = (place.coordinates as any) || {};
          const displayCity = deriveDisplayCity(place.city, undefined, coords);
          const cityKey = displayCity;
          if (!groupedByCity[cityKey]) groupedByCity[cityKey] = [];
          groupedByCity[cityKey].push({
            id: place.place_id,
            name: place.place_name,
            category: place.place_category || 'place',
            city: displayCity,
            coordinates: coords && (coords.lat || coords.lng) ? coords : { lat: 0, lng: 0 },
            savedAt: place.created_at
          });
        });

        (userSavedRows || []).forEach((item: any) => {
          const location = item?.location_id ? locationsMap[item.location_id] : null;
          if (!location) {
            console.warn('Location not found for saved location:', item.location_id);
            return;
          }

          const coords = {
            lat: location.latitude !== null && location.latitude !== undefined ? Number(location.latitude) : undefined,
            lng: location.longitude !== null && location.longitude !== undefined ? Number(location.longitude) : undefined
          };

          const displayCity = deriveDisplayCity(location.city, location.address, coords);
          const cityKey = displayCity;
          if (!groupedByCity[cityKey]) groupedByCity[cityKey] = [];
          groupedByCity[cityKey].push({
            id: location.google_place_id || location.id,
            name: location.name || 'Unknown Location',
            category: location.category || 'place',
            city: displayCity,
            coordinates: coords,
            address: location.address,
            google_place_id: location.google_place_id,
            savedAt: item.created_at
          });
        });

        setSavedPlaces(groupedByCity);
      } catch (error) {
        console.error('Error loading saved places:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadSavedPlaces();
    }
  }, [targetUserId, isOpen]);

  const unsavePlace = async (placeId: string, city: string) => {
    if (!currentUser || currentUser.id !== targetUserId) return;

    try {
      await supabase.from('saved_places').delete().eq('user_id', currentUser.id).eq('place_id', placeId);
      
      const { data: locationData } = await supabase
        .from('locations')
        .select('id')
        .or(`google_place_id.eq.${placeId},id.eq.${placeId}`)
        .maybeSingle();

      if (locationData?.id) {
        await supabase.from('user_saved_locations').delete().eq('user_id', currentUser.id).eq('location_id', locationData.id);
      }

      setSavedPlaces((prev: any) => {
        const updated = { ...prev };
        if (updated[city]) {
          updated[city] = updated[city].filter((p: any) => p.id !== placeId);
          if (updated[city].length === 0) delete updated[city];
        }
        return updated;
      });
    } catch (error) {
      console.error('Error unsaving place:', error);
    }
  };

  const isOwnProfile = currentUser?.id === targetUserId;

  // Get all unique cities
  const cities = useMemo(() => {
    return Object.keys(savedPlaces).sort();
  }, [savedPlaces]);

  // Flatten all places
  const allPlaces = useMemo(() => {
    const places = [];
    for (const [city, cityPlaces] of Object.entries(savedPlaces)) {
      places.push(...(cityPlaces as any[]).map(place => ({ ...place, city })));
    }
    return places;
  }, [savedPlaces]);

  // Filter and sort places
  const filteredAndSortedPlaces = useMemo(() => {
    let filtered = allPlaces;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(place => 
        place.name.toLowerCase().includes(query) ||
        place.category.toLowerCase().includes(query) ||
        place.city.toLowerCase().includes(query)
      );
    }

    if (selectedCity !== 'all') {
      filtered = filtered.filter(place => place.city === selectedCity);
    }

    switch (sortBy) {
      case 'recent':
        return filtered.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      case 'name':
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      case 'city':
        return filtered.sort((a, b) => a.city.localeCompare(b.city));
      case 'category':
        return filtered.sort((a, b) => a.category.localeCompare(b.category));
      default:
        return filtered;
    }
  }, [allPlaces, searchQuery, selectedCity, sortBy]);

  const handlePlaceClick = (place: any) => {
    setSelectedPlace({
      ...place,
      id: place.id,
      google_place_id: place.google_place_id || place.id,
      name: place.name,
      address: place.address,
      category: place.category,
      city: place.city,
      types: place.types || [place.category],
      coordinates: (place.latitude != null && place.longitude != null)
        ? { lat: place.latitude, lng: place.longitude }
        : undefined
    });
  };

  const handleUnsave = async (e: React.MouseEvent, place: any) => {
    e.stopPropagation();
    try {
      await unsavePlace(place.id, place.city);
    } catch (error) {
      console.error('Failed to remove location:', error);
    }
  };

  if (!isOpen) return null;

  if (selectedPlace) {
    return (
      <LocationPostLibrary
        place={selectedPlace}
        isOpen={true}
        onClose={() => setSelectedPlace(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">Saved Locations</h1>
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedPlaces.length} of {allPlaces.length} locations
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-background border-b border-border px-4 py-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search locations, cities, or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="flex-1 bg-background">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map(city => (
                <SelectItem key={city} value={city}>
                  {city} ({savedPlaces[city]?.length || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="flex-1 bg-background">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="recent">Recently Saved</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="city">City A-Z</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-muted-foreground">Loading saved locations...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && allPlaces.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs mx-auto px-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Saved Locations</h3>
            <p className="text-muted-foreground text-sm">
              Start exploring and save places you love to see them here.
            </p>
          </div>
        </div>
      )}

      {/* No Search Results */}
      {!loading && allPlaces.length > 0 && filteredAndSortedPlaces.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs mx-auto px-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground text-sm">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
        </div>
      )}

      {/* Locations List - Minimal Cards - Grid */}
      {!loading && filteredAndSortedPlaces.length > 0 && (
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="grid grid-cols-2 gap-3 px-4 py-4">
            {filteredAndSortedPlaces.map((p, idx) => (
              <div key={`${p.city}-${p.id}-${idx}`} className="relative group">
                <MinimalLocationCard
                  place={{
                    id: p.id,
                    name: p.name,
                    category: p.category,
                    city: p.city,
                    address: p.address,
                    google_place_id: p.google_place_id,
                    coordinates: p.coordinates,
                    savedCount: p.savedCount || 0,
                    postsCount: p.postsCount || 0
                  }}
                  onCardClick={() => handlePlaceClick(p)}
                />
                {isOwnProfile && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 bg-background/80 hover:bg-background"
                      onClick={(e) => handleUnsave(e, p)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedLocationsList;
