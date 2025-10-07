import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LocationPostLibrary from './LocationPostLibrary';
import { AllowedCategory, categoryDisplayNames } from '@/utils/allowedCategories';
import { CategoryIcon } from '@/components/common/CategoryIcon';

interface LocationGridProps {
  searchQuery?: string;
  selectedCategory?: AllowedCategory | null;
}

interface LocationCard {
  id: string;
  name: string;
  category: string;
  city: string;
  address?: string;
  google_place_id?: string;
  coverImage?: string;
  postsCount: number;
  savesCount: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

const LocationGrid = ({ searchQuery, selectedCategory }: LocationGridProps) => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<LocationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<LocationCard | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [userSavedIds, setUserSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLocations();
  }, [searchQuery, selectedCategory]);

  const fetchLocations = async () => {
    try {
      setLoading(true);

      // Fetch from locations table
      let query = supabase
        .from('locations')
        .select(`
          id,
          name,
          category,
          city,
          address,
          google_place_id,
          latitude,
          longitude
        `);

      // Apply search filter
      if (searchQuery && searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`);
      }

      // Apply category filter
      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      const { data: locationsData, error } = await query.limit(100);

      if (error) throw error;

      // Also fetch from saved_places to include Google Places that might not be in locations yet
      let savedPlacesQuery = supabase
        .from('saved_places')
        .select('place_id, place_name, place_category, city, coordinates');

      if (searchQuery && searchQuery.trim()) {
        savedPlacesQuery = savedPlacesQuery.or(`place_name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
      }

      if (selectedCategory) {
        savedPlacesQuery = savedPlacesQuery.eq('place_category', selectedCategory);
      }

      const { data: savedPlacesData } = await savedPlacesQuery.limit(100);

      // Convert saved_places to location format
      const savedPlacesAsLocations = (savedPlacesData || []).map(sp => ({
        id: sp.place_id,
        name: sp.place_name,
        category: sp.place_category || 'place',
        city: sp.city || 'Unknown',
        address: undefined,
        google_place_id: sp.place_id,
        latitude: (sp.coordinates as any)?.lat,
        longitude: (sp.coordinates as any)?.lng,
      }));

      // Merge both datasets
      const allLocations = [...(locationsData || []), ...savedPlacesAsLocations];

      // Get ALL saves for these locations (from all users)
      const locationIds = allLocations.map(l => l.id);
      const { data: savesData } = await supabase
        .from('user_saved_locations')
        .select('location_id, user_id')
        .in('location_id', locationIds);

      // Also count saves from saved_places table
      const placeIds = allLocations.map(l => l.google_place_id).filter(Boolean);
      const { data: savedPlacesCountData } = await supabase
        .from('saved_places')
        .select('place_id, user_id')
        .in('place_id', placeIds);

      const savesMap = new Map<string, number>();
      savesData?.forEach(save => {
        savesMap.set(save.location_id, (savesMap.get(save.location_id) || 0) + 1);
      });

      // Count saves from saved_places by place_id
      const savedPlacesSavesMap = new Map<string, number>();
      savedPlacesCountData?.forEach(save => {
        savedPlacesSavesMap.set(save.place_id, (savedPlacesSavesMap.get(save.place_id) || 0) + 1);
      });

      // Group by canonical place using google_place_id when available,
      // otherwise fall back to normalized name + city. Also link records that
      // share the same name+city with a record that has a google_place_id.
      type Grouped = LocationCard & { allLocationIds: string[]; nameCityKey: string; gpKey?: string };
      const groups = new Map<string, Grouped>(); // canonical key -> group
      const nameCityIndex = new Map<string, string>(); // nameCityKey -> canonical key

      const norm = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
      const toNameCityKey = (loc: any) => {
        const cityFromAddr = loc.address?.split(',')[1]?.trim();
        const nameKey = norm(loc.name);
        const cityKey = norm(loc.city || cityFromAddr);
        return `${nameKey}_${cityKey}`;
      };

      allLocations.forEach((loc) => {
        const nameCityKey = toNameCityKey(loc);
        const gpKey = loc.google_place_id ? `gp:${loc.google_place_id}` : undefined;

        // Resolve existing canonical key if any
        let canonicalKey: string | undefined = gpKey && groups.has(gpKey)
          ? gpKey
          : nameCityIndex.get(nameCityKey);

        // If none exists, create a new group using the most stable key
        if (!canonicalKey) {
          canonicalKey = gpKey || `nc:${nameCityKey}`;
          groups.set(canonicalKey, {
            id: loc.id,
            name: loc.name,
            category: loc.category,
            city: loc.city || loc.address?.split(',')[1]?.trim() || 'Unknown',
            address: loc.address,
            google_place_id: loc.google_place_id,
            coverImage: null,
            postsCount: 0,
            savesCount: 0,
            coordinates: {
              lat: parseFloat(loc.latitude?.toString() || '0'),
              lng: parseFloat(loc.longitude?.toString() || '0'),
            },
            allLocationIds: [loc.id],
            nameCityKey,
            gpKey,
          });
          // Index by name+city for future matches (even if later we see a gpKey)
          nameCityIndex.set(nameCityKey, canonicalKey);
        } else {
          // Merge into existing group
          const g = groups.get(canonicalKey)!;
          g.allLocationIds.push(loc.id);
          // Prefer filling missing metadata
          if (!g.google_place_id && loc.google_place_id) g.google_place_id = loc.google_place_id;
          if (!g.address && loc.address) g.address = loc.address;
          // Keep coordinates from the first seen; do not override
        }

        // Accumulate saves per location id (computed below once we have savesMap)
      });

      // Aggregate saves across grouped location ids + place_id saves
      groups.forEach((g) => {
        const locationSaves = g.allLocationIds.reduce((sum, id) => sum + (savesMap.get(id) || 0), 0);
        const placeSaves = g.google_place_id ? (savedPlacesSavesMap.get(g.google_place_id) || 0) : 0;
        g.savesCount = locationSaves + placeSaves;
      });

      // Check if user saved ANY of the location IDs or place_id for each unique place
      const finalUserSavedIds = new Set<string>();
      groups.forEach((g) => {
        const userSavedLocation = g.allLocationIds.some((id) =>
          savesData?.some((s) => s.location_id === id && s.user_id === user?.id)
        );
        const userSavedPlace = g.google_place_id && savedPlacesCountData?.some(
          (s) => s.place_id === g.google_place_id && s.user_id === user?.id
        );
        if (userSavedLocation || userSavedPlace) finalUserSavedIds.add(g.id);
      });
      setUserSavedIds(finalUserSavedIds);

      // Sort by saves count (most popular first) and strip internal fields
      const uniqueLocations = Array.from(groups.values())
        .map(({ allLocationIds, nameCityKey, gpKey, ...rest }) => rest)
        .sort((a, b) => b.savesCount - a.savesCount);

      setLocations(uniqueLocations);

    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationClick = (location: LocationCard) => {
    setSelectedLocation(location);
    setIsLibraryOpen(true);
  };

  const handleSaveToggle = async (e: React.MouseEvent, locationId: string) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const isSaved = userSavedIds.has(locationId);
      const location = locations.find(l => l.id === locationId);
      if (!location) return;
      
      if (isSaved) {
        // Unsave from both tables
        if (location.google_place_id) {
          // Delete from saved_places
          await supabase
            .from('saved_places')
            .delete()
            .eq('user_id', user.id)
            .eq('place_id', location.google_place_id);
        }
        
        // Also check if this is an internal location and delete from user_saved_locations
        const { data: internalLocations } = await supabase
          .from('locations')
          .select('id')
          .or(
            location.google_place_id 
              ? `google_place_id.eq.${location.google_place_id}` 
              : `and(latitude.eq.${location.coordinates.lat},longitude.eq.${location.coordinates.lng})`
          );
        
        if (internalLocations && internalLocations.length > 0) {
          const allIds = internalLocations.map(l => l.id);
          await supabase
            .from('user_saved_locations')
            .delete()
            .eq('user_id', user.id)
            .in('location_id', allIds);
        }
        
        const newSet = new Set(userSavedIds);
        newSet.delete(locationId);
        setUserSavedIds(newSet);
      } else {
        // Save - prioritize saved_places if it has google_place_id
        if (location.google_place_id) {
          await supabase
            .from('saved_places')
            .insert({
              user_id: user.id,
              place_id: location.google_place_id,
              place_name: location.name,
              place_category: location.category,
              city: location.city,
              coordinates: {
                lat: location.coordinates.lat,
                lng: location.coordinates.lng
              }
            });
        } else {
          // Save to user_saved_locations if no google_place_id
          await supabase
            .from('user_saved_locations')
            .insert({
              user_id: user.id,
              location_id: locationId
            });
        }
        
        const newSet = new Set(userSavedIds);
        newSet.add(locationId);
        setUserSavedIds(newSet);
      }

      // Refresh locations to update save counts
      fetchLocations();
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-center">
          <p className="text-gray-500">No locations found</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 pb-20">
        {locations.map((location) => {
          const isSaved = userSavedIds.has(location.id);
          
          return (
            <div
              key={location.id}
              onClick={() => handleLocationClick(location)}
              className="relative bg-white rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all border border-gray-200 p-4"
            >
              {/* Category Icon - Bigger at top left */}
              <div className="absolute top-2 left-2">
                <CategoryIcon category={location.category} className="w-8 h-8" />
              </div>

              {/* Saved Icon - Top right - Clickable */}
              <button
                onClick={(e) => handleSaveToggle(e, location.id)}
                className={`absolute top-2 right-2 rounded-full p-1.5 transition-colors ${
                  isSaved 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                aria-label={isSaved ? 'Unsave location' : 'Save location'}
              >
                <svg className={`w-3.5 h-3.5 ${isSaved ? 'text-white' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </button>

              {/* Content */}
              <div className="pt-8">
                <h4 className="font-semibold text-base text-gray-900 line-clamp-2 mb-1">
                  {location.name}
                </h4>
                <p className="text-xs text-gray-500 line-clamp-1">{location.city}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Location Post Library Modal */}
      {selectedLocation && (
        <LocationPostLibrary
          place={{
            id: selectedLocation.id,
            name: selectedLocation.name,
            city: selectedLocation.city,
            google_place_id: selectedLocation.google_place_id
          }}
          isOpen={isLibraryOpen}
          onClose={() => {
            setIsLibraryOpen(false);
            setSelectedLocation(null);
          }}
        />
      )}
    </>
  );
};

export default LocationGrid;
