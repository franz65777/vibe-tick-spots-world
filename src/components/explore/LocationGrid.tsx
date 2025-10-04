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

      // Get ALL saves for these locations (from all users)
      const locationIds = locationsData?.map(l => l.id) || [];
      const { data: savesData } = await supabase
        .from('user_saved_locations')
        .select('location_id, user_id')
        .in('location_id', locationIds);

      const savesMap = new Map<string, number>();
      savesData?.forEach(save => {
        savesMap.set(save.location_id, (savesMap.get(save.location_id) || 0) + 1);
      });

      // Group by google_place_id OR by normalized name+city+coords to ensure truly unique places
      const locationMap = new Map<string, LocationCard & { allLocationIds: string[] }>();

      locationsData?.forEach((location) => {
        // Helper to round coordinates to 4 decimals for grouping
        const round = (n: any) => {
          const v = parseFloat(n?.toString() || '0');
          return Number.isFinite(v) ? Math.round(v * 10000) / 10000 : 0;
        };
        
        // Normalize text for comparison
        const norm = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
        
        // Create a unique key: use google_place_id if available, otherwise use name+city+coords
        const coordKey = `${round(location.latitude)}-${round(location.longitude)}`;
        const nameKey = norm(location.name);
        const cityKey = norm(location.city || location.address?.split(',')[1]);
        
        // Primary key: google_place_id
        // Fallback key: normalized name + city + coordinates
        const key = location.google_place_id || `${nameKey}_${cityKey}_${coordKey}`;
        
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            id: location.id,
            name: location.name,
            category: location.category,
            city: location.city || location.address?.split(',')[1]?.trim() || 'Unknown',
            address: location.address,
            google_place_id: location.google_place_id,
            coverImage: null,
            postsCount: 0,
            savesCount: savesMap.get(location.id) || 0,
            coordinates: {
              lat: parseFloat(location.latitude?.toString() || '0'),
              lng: parseFloat(location.longitude?.toString() || '0')
            },
            allLocationIds: [location.id]
          });
        } else {
          // Merge: collect all IDs and take max saves
          const existing = locationMap.get(key)!;
          existing.allLocationIds.push(location.id);
          const thisSaves = savesMap.get(location.id) || 0;
          if (thisSaves > existing.savesCount) {
            existing.savesCount = thisSaves;
          }
        }
      });

      // Check if user saved ANY of the location IDs for each unique place
      const userSavedKeys = new Set<string>();
      const finalUserSavedIds = new Set<string>();
      
      locationMap.forEach((loc, key) => {
        // Check if user saved any of the related location IDs
        const userSavedAny = loc.allLocationIds.some(id => 
          savesData?.some(s => s.location_id === id && s.user_id === user?.id)
        );
        
        if (userSavedAny) {
          userSavedKeys.add(key);
          // Mark the primary ID as saved for UI display
          finalUserSavedIds.add(loc.id);
        }
      });
      
      setUserSavedIds(finalUserSavedIds);

      // Sort by saves count (most popular first)
      const uniqueLocations = Array.from(locationMap.values())
        .map(({ allLocationIds, ...rest }) => rest) // Remove allLocationIds from final output
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
      
      if (isSaved) {
        // Unsave - need to delete ALL saves for this location (in case there are duplicates)
        const location = locations.find(l => l.id === locationId);
        if (location) {
          // Find all location IDs with same google_place_id or coordinates
          const { data: allLocationData } = await supabase
            .from('locations')
            .select('id')
            .or(
              location.google_place_id 
                ? `google_place_id.eq.${location.google_place_id}` 
                : `and(latitude.eq.${location.coordinates.lat},longitude.eq.${location.coordinates.lng})`
            );
          
          const allIds = allLocationData?.map(l => l.id) || [locationId];
          
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
        // Save
        await supabase
          .from('user_saved_locations')
          .insert({
            user_id: user.id,
            location_id: locationId
          });
        
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
