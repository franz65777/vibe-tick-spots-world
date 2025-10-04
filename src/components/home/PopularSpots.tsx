import React, { useState, useEffect } from 'react';
import { TrendingUp, MapPin, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LocationPostLibrary from '../explore/LocationPostLibrary';

interface PopularSpot {
  id: string;
  name: string;
  category: string;
  city: string;
  address?: string;
  google_place_id?: string;
  savesCount: number;
  coverImage?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface PopularSpotsProps {
  userLocation: { lat: number; lng: number } | null;
  onLocationClick?: (coords: { lat: number; lng: number }) => void;
}

const PopularSpots = ({ userLocation, onLocationClick }: PopularSpotsProps) => {
  const { user } = useAuth();
  const [popularSpots, setPopularSpots] = useState<PopularSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<PopularSpot | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  useEffect(() => {
    fetchPopularSpots();
  }, [userLocation]);

  const fetchPopularSpots = async () => {
    try {
      setLoading(true);

      // Fetch locations with their save counts
      const { data: locationsData, error: locationsError } = await supabase
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
        .not('posts', 'is', null)
        .limit(50);

      if (locationsError) throw locationsError;

      // Get saves count for all locations
      const locationIds = locationsData?.map(l => l.id) || [];
      const { data: savesData } = await supabase
        .from('user_saved_locations')
        .select('location_id')
        .in('location_id', locationIds);

      const savesMap = new Map<string, number>();
      savesData?.forEach(save => {
        savesMap.set(save.location_id, (savesMap.get(save.location_id) || 0) + 1);
      });

      // Process locations
      const locationMap = new Map<string, PopularSpot>();

      locationsData?.forEach((location) => {
        const key = location.google_place_id || `${location.latitude}-${location.longitude}`;
        
        if (!locationMap.has(key)) {
          const firstPost = Array.isArray(location.posts) ? location.posts[0] : null;
          const coverImage = firstPost?.media_urls?.[0] || null;
          const savesCount = savesMap.get(location.id) || 0;
          
          // Only include locations with at least 1 save
          if (savesCount > 0) {
            locationMap.set(key, {
              id: location.id,
              name: location.name,
              category: location.category,
              city: location.city || location.address?.split(',')[1]?.trim() || 'Unknown',
              address: location.address,
              google_place_id: location.google_place_id,
              savesCount,
              coverImage,
              coordinates: {
                lat: parseFloat(location.latitude?.toString() || '0'),
                lng: parseFloat(location.longitude?.toString() || '0')
              }
            });
          }
        }
      });

      // Sort by saves count and take top 5
      const topSpots = Array.from(locationMap.values())
        .sort((a, b) => b.savesCount - a.savesCount)
        .slice(0, 5);

      setPopularSpots(topSpots);
    } catch (error) {
      console.error('Error fetching popular spots:', error);
      setPopularSpots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpotClick = (spot: PopularSpot) => {
    setSelectedSpot(spot);
    setIsLibraryOpen(true);
    onLocationClick?.(spot.coordinates);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (popularSpots.length === 0) {
    return null;
  }

  return (
    <>
      <div className="h-full px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Popular Near You</h3>
              <p className="text-xs text-gray-500">Most saved locations</p>
            </div>
          </div>
        </div>

        {/* Horizontal Scrolling Spots */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {popularSpots.map((spot) => (
            <div
              key={spot.id}
              onClick={() => handleSpotClick(spot)}
              className="flex-shrink-0 w-36 cursor-pointer group"
            >
              {/* Spot Image */}
              <div className="relative h-36 rounded-xl overflow-hidden mb-2 bg-gray-100">
                {spot.coverImage ? (
                  <img
                    src={spot.coverImage}
                    alt={spot.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500" />
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Saves Badge */}
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                  <Users className="w-3 h-3 text-gray-700" />
                  <span className="text-xs font-semibold text-gray-900">{spot.savesCount}</span>
                </div>

                {/* Location Name */}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-xs font-semibold text-white line-clamp-2 mb-0.5">
                    {spot.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-white/80" />
                    <p className="text-xs text-white/80 line-clamp-1">
                      {spot.city}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Location Post Library Modal */}
      {selectedSpot && (
        <LocationPostLibrary
          place={{
            id: selectedSpot.id,
            name: selectedSpot.name,
            city: selectedSpot.city,
            google_place_id: selectedSpot.google_place_id
          }}
          isOpen={isLibraryOpen}
          onClose={() => {
            setIsLibraryOpen(false);
            setSelectedSpot(null);
          }}
        />
      )}
    </>
  );
};

export default PopularSpots;
