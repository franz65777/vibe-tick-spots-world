import React, { useState, useEffect } from 'react';
import { Heart, Bookmark, MessageCircle, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LocationPostLibrary from './LocationPostLibrary';

interface LocationWithPosts {
  id: string;
  name: string;
  city: string;
  address?: string;
  google_place_id?: string;
  postsCount: number;
  coverImage?: string;
  category?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface LocationPostCardsProps {
  searchQuery?: string;
  onLocationClick?: (location: LocationWithPosts) => void;
}

const LocationPostCards = ({ searchQuery, onLocationClick }: LocationPostCardsProps) => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<LocationWithPosts[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<LocationWithPosts | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  useEffect(() => {
    fetchLocationsWithPosts();
  }, [searchQuery]);

  const fetchLocationsWithPosts = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('locations')
        .select(`
          id,
          name,
          city,
          address,
          google_place_id,
          category,
          latitude,
          longitude,
          posts!inner(
            id,
            media_urls,
            created_at
          )
        `)
        .not('posts', 'is', null);

      // Apply search filter if provided
      if (searchQuery && searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`);
      }

      const { data: locationsData, error } = await query.limit(200);

      if (error) throw error;

      // IMPROVED DEDUPLICATION: Use multiple strategies to identify duplicates
      const locationMap = new Map<string, LocationWithPosts>();

      locationsData?.forEach((location) => {
        // Strategy 1: Use Google Place ID if available (most reliable)
        if (location.google_place_id) {
          const key = `gp_${location.google_place_id}`;
          
          if (locationMap.has(key)) {
            // Update existing entry with more posts
            const existing = locationMap.get(key)!;
            existing.postsCount += 1;
          } else {
            // Create new entry
            const firstPost = Array.isArray(location.posts) ? location.posts[0] : null;
            const coverImage = firstPost?.media_urls?.[0] || null;
            
            locationMap.set(key, {
              id: location.id,
              name: location.name,
              city: location.city || location.address?.split(',')[1]?.trim() || 'Unknown',
              address: location.address,
              google_place_id: location.google_place_id,
              category: location.category,
              postsCount: 1,
              coverImage,
              coordinates: {
                lat: parseFloat(location.latitude?.toString() || '0'),
                lng: parseFloat(location.longitude?.toString() || '0')
              }
            });
          }
        } else {
          // Strategy 2: Use normalized name + city combination
          const normalizedName = location.name.toLowerCase().trim().replace(/\s+/g, ' ');
          const normalizedCity = (location.city || location.address?.split(',')[1]?.trim() || '').toLowerCase().trim();
          const key = `name_${normalizedName}_${normalizedCity}`;
          
          if (locationMap.has(key)) {
            // Update existing entry
            const existing = locationMap.get(key)!;
            existing.postsCount += 1;
          } else {
            // Strategy 3: Check if coordinates match any existing location (within 50 meters)
            let foundDuplicate = false;
            const lat = parseFloat(location.latitude?.toString() || '0');
            const lng = parseFloat(location.longitude?.toString() || '0');
            
            for (const [existingKey, existingLocation] of locationMap.entries()) {
              if (existingLocation.coordinates) {
                const distance = calculateDistance(
                  lat,
                  lng,
                  existingLocation.coordinates.lat,
                  existingLocation.coordinates.lng
                );
                
                // If within 50 meters and name is similar, consider it a duplicate
                if (distance < 0.05 && normalizedName === existingLocation.name.toLowerCase().trim().replace(/\s+/g, ' ')) {
                  existingLocation.postsCount += 1;
                  foundDuplicate = true;
                  break;
                }
              }
            }
            
            if (!foundDuplicate) {
              // Create new entry
              const firstPost = Array.isArray(location.posts) ? location.posts[0] : null;
              const coverImage = firstPost?.media_urls?.[0] || null;
              
              locationMap.set(key, {
                id: location.id,
                name: location.name,
                city: location.city || location.address?.split(',')[1]?.trim() || 'Unknown',
                address: location.address,
                google_place_id: location.google_place_id,
                category: location.category,
                postsCount: 1,
                coverImage,
                coordinates: {
                  lat,
                  lng
                }
              });
            }
          }
        }
      });

      // Sort by post count (most popular first)
      const uniqueLocations = Array.from(locationMap.values())
        .filter(location => location.postsCount > 0)
        .sort((a, b) => b.postsCount - a.postsCount);

      console.log(`✅ Deduplicated locations: ${locationsData?.length || 0} rows → ${uniqueLocations.length} unique locations`);
      setLocations(uniqueLocations);
    } catch (error) {
      console.error('Error fetching locations with posts:', error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate distance between two coordinates (in km)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleLocationClick = (location: LocationWithPosts) => {
    setSelectedLocation(location);
    setIsLibraryOpen(true);
    onLocationClick?.(location);
  };

  const getCityGroups = () => {
    const cityGroups = new Map<string, LocationWithPosts[]>();
    
    locations.forEach(location => {
      const city = location.city;
      if (!cityGroups.has(city)) {
        cityGroups.set(city, []);
      }
      cityGroups.get(city)!.push(location);
    });

    return Array.from(cityGroups.entries()).map(([city, locations]) => ({
      city,
      locations: locations.slice(0, 10) // Limit to 10 per city for performance
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading location libraries...</span>
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">No posts found</h3>
        <p className="text-gray-500 text-center text-sm">
          {searchQuery 
            ? "No locations match your search with posts"
            : "Be the first to share photos at amazing places!"
          }
        </p>
      </div>
    );
  }

  const cityGroups = getCityGroups();

  return (
    <div className="space-y-6 pb-6">
      {cityGroups.map(({ city, locations: cityLocations }) => (
        <div key={city} className="px-4">
          {/* City Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {city}: experiences
            </h3>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              View all
            </Button>
          </div>

          {/* Horizontal Scrolling Cards */}
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
            {cityLocations.map((location) => (
              <div
                key={location.id}
                onClick={() => handleLocationClick(location)}
                className="flex-shrink-0 w-64 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                {/* Cover Image */}
                <div className="relative h-40 bg-gray-100">
                  {location.coverImage ? (
                    <img
                      src={location.coverImage}
                      alt={location.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                      <Heart className="w-8 h-8 text-blue-400" />
                    </div>
                  )}
                  
                  {/* Popular Badge */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                    <span className="text-xs font-medium text-gray-700">Popular</span>
                  </div>

                  {/* Save Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-3 right-3 w-8 h-8 p-0 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full"
                  >
                    <Bookmark className="w-4 h-4 text-gray-600" />
                  </Button>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                    {location.name}
                  </h4>
                  <p className="text-sm text-gray-500 mb-2 line-clamp-1">
                    {location.category || 'Experience'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-gray-900">
                        {location.postsCount} photo{location.postsCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">4.8</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

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
    </div>
  );
};

export default LocationPostCards;