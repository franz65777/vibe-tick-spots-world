import React, { useState, useEffect } from 'react';
import { TrendingUp, MapPin, Users, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import fireIcon from '@/assets/fire-icon.png';

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
  currentCity?: string;
  onLocationClick?: (coords: { lat: number; lng: number }) => void;
  onSwipeDiscoveryOpen?: () => void;
}

const PopularSpots = ({ currentCity, onLocationClick, onSwipeDiscoveryOpen }: PopularSpotsProps) => {
  const { user } = useAuth();
  const [popularSpots, setPopularSpots] = useState<PopularSpot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPopularSpots();
  }, [currentCity]);

  const fetchPopularSpots = async () => {
    if (!currentCity) {
      setPopularSpots([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const normalizedCity = currentCity.trim().toLowerCase();

      // Fetch locations from internal database
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
          longitude
        `)
.or(`city.ilike.%${normalizedCity}%,address.ilike.%${normalizedCity}%`)
        .limit(500);

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

      // Get saves from Google Places (saved_places table)
      const { data: googleSavesData } = await supabase
.from('saved_places')
        .select('place_id')
        .ilike('city', `%${normalizedCity}%`);

      const googleSavesMap = new Map<string, number>();
      googleSavesData?.forEach(save => {
        googleSavesMap.set(save.place_id, (googleSavesMap.get(save.place_id) || 0) + 1);
      });

      // Process and filter locations by city
      const locationMap = new Map<string, PopularSpot>();

      locationsData?.forEach((location) => {
        const locationCity = location.city?.trim().toLowerCase();
        
        // Filter by city
        if (!locationCity || (!locationCity.includes(normalizedCity) && !normalizedCity.includes(locationCity))) {
          return;
        }

        const key = location.google_place_id || location.id;
        const savesCount = (savesMap.get(location.id) || 0) + (location.google_place_id ? (googleSavesMap.get(location.google_place_id) || 0) : 0);
        
        // Only include locations with at least 1 save
        if (savesCount > 0) {
          if (!locationMap.has(key) || (locationMap.get(key)?.savesCount || 0) < savesCount) {
            locationMap.set(key, {
              id: location.id,
              name: location.name,
              category: location.category,
              city: location.city || 'Unknown',
              address: location.address,
              google_place_id: location.google_place_id,
              savesCount,
              coordinates: {
                lat: parseFloat(location.latitude?.toString() || '0'),
                lng: parseFloat(location.longitude?.toString() || '0')
              }
            });
          }
        }
      });

      // Sort by saves count and get top 10
      const topSpots = Array.from(locationMap.values())
        .sort((a, b) => b.savesCount - a.savesCount)
        .slice(0, 10);

      setPopularSpots(topSpots);
    } catch (error) {
      console.error('Error fetching popular spots:', error);
      setPopularSpots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpotClick = (spot: PopularSpot) => {
    onLocationClick?.(spot.coordinates);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }


  return (
    <>
      <div className="h-full px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-gray-900">Top Pinned in {currentCity}</h3>
              <p className="text-xs text-gray-500">Most saved locations</p>
            </div>
          </div>
          <button
            onClick={onSwipeDiscoveryOpen}
            className="w-10 h-10 flex items-center justify-center transition-all hover:scale-110"
            aria-label="Discover places"
          >
            <img src={fireIcon} alt="Discover" className="w-8 h-8" />
          </button>
        </div>

        {/* Horizontal chips - minimal, no images */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {popularSpots.map((spot) => (
            <button
              key={spot.id}
              onClick={() => handleSpotClick(spot)}
              className="flex-shrink-0 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center gap-2"
              aria-label={`Zoom to ${spot.name}`}
            >
              <CategoryIcon category={spot.category} className="w-5 h-5" />
              <span className="text-xs font-medium text-gray-900 line-clamp-1 max-w-[160px]">
                {spot.name}
              </span>
            </button>
          ))}
        </div>
      </div>

    </>
  );
};

export default PopularSpots;
