import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LocationPostLibrary from './LocationPostLibrary';
import { AllowedCategory, categoryDisplayNames } from '@/utils/allowedCategories';

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
          longitude,
          posts!inner(
            id,
            media_urls
          )
        `)
        .not('posts', 'is', null);

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

      // Get saves count for each location
      const locationIds = locationsData?.map(l => l.id) || [];
      const { data: savesData } = await supabase
        .from('user_saved_locations')
        .select('location_id')
        .in('location_id', locationIds);

      const savesMap = new Map<string, number>();
      savesData?.forEach(save => {
        savesMap.set(save.location_id, (savesMap.get(save.location_id) || 0) + 1);
      });

      // Group by google_place_id
      const locationMap = new Map<string, LocationCard>();

      locationsData?.forEach((location) => {
        const key = location.google_place_id || `${location.latitude}-${location.longitude}`;
        
        if (!locationMap.has(key)) {
          const firstPost = Array.isArray(location.posts) ? location.posts[0] : null;
          const coverImage = firstPost?.media_urls?.[0] || null;
          
          locationMap.set(key, {
            id: location.id,
            name: location.name,
            category: location.category,
            city: location.city || location.address?.split(',')[1]?.trim() || 'Unknown',
            address: location.address,
            google_place_id: location.google_place_id,
            coverImage,
            postsCount: Array.isArray(location.posts) ? location.posts.length : 0,
            savesCount: savesMap.get(location.id) || 0,
            coordinates: {
              lat: parseFloat(location.latitude?.toString() || '0'),
              lng: parseFloat(location.longitude?.toString() || '0')
            }
          });
        }
      });

      // Sort by saves count (most popular first)
      const uniqueLocations = Array.from(locationMap.values())
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
      <div className="grid grid-cols-4 gap-2 px-2 pb-20">
        {locations.map((location) => (
          <div
            key={location.id}
            onClick={() => handleLocationClick(location)}
            className="bg-white rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border border-gray-100"
          >
            {/* Cover Image */}
            <div className="relative h-24 bg-gray-100">
              {location.coverImage ? (
                <img
                  src={location.coverImage}
                  alt={location.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100" />
              )}
              
              {/* Saves Badge */}
              {location.savesCount > 0 && (
                <div className="absolute top-1 right-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                  <span className="text-xs font-medium text-white">{location.savesCount}</span>
                </div>
              )}
            </div>

            {/* Card Content */}
            <div className="p-2">
              <h4 className="font-medium text-xs text-gray-900 line-clamp-1 mb-0.5">
                {location.name}
              </h4>
              <p className="text-xs text-gray-500 line-clamp-1">
                {location.city}
              </p>
            </div>
          </div>
        ))}
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
