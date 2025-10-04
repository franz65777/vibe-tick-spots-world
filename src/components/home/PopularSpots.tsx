import React, { useState, useEffect } from 'react';
import { TrendingUp, MapPin, Users, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import SwipeDiscovery from './SwipeDiscovery';
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
  userLocation: { lat: number; lng: number } | null;
  onLocationClick?: (coords: { lat: number; lng: number }) => void;
}

const PopularSpots = ({ userLocation, onLocationClick }: PopularSpotsProps) => {
  const { user } = useAuth();
  const [popularSpots, setPopularSpots] = useState<PopularSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);

  useEffect(() => {
    fetchPopularSpots();
  }, [userLocation]);

  // Haversine distance in km
  const distanceKm = (a: {lat:number;lng:number}, b: {lat:number;lng:number}) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const s = Math.sin(dLat/2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  };

  const fetchPopularSpots = async () => {
    try {
      setLoading(true);

      // Fetch locations (no posts filter) to base popularity on saves
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
        .limit(100);

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
              coordinates: {
                lat: parseFloat(location.latitude?.toString() || '0'),
                lng: parseFloat(location.longitude?.toString() || '0')
              }
            });
          }
        }
      });

      // Filter by proximity (<= 2km) and sort by saves, then distance
      const allSpots = Array.from(locationMap.values());
      const withDistance = userLocation
        ? allSpots.map((s) => ({ ...s, __dist: distanceKm(s.coordinates, userLocation) }))
        : allSpots.map((s) => ({ ...s, __dist: Infinity }));
      const filtered = userLocation ? withDistance.filter((s: any) => s.__dist <= 2) : withDistance;
      const topSpots = filtered
        .sort((a: any, b: any) => (b.savesCount - a.savesCount) || (a.__dist - b.__dist))
        .slice(0, 10)
        .map(({ __dist, ...rest }: any) => rest);

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
          <button
            onClick={() => setIsSwipeOpen(true)}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 flex items-center justify-center shadow-lg transition-all hover:scale-110"
            aria-label="Discover places"
          >
            <img src={fireIcon} alt="Discover" className="w-6 h-6" />
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
              <span className="ml-1 text-[10px] text-gray-500">{spot.savesCount}</span>
            </button>
          ))}
        </div>
      </div>

      <SwipeDiscovery
        isOpen={isSwipeOpen}
        onClose={() => setIsSwipeOpen(false)}
        userLocation={userLocation}
      />
    </>
  );
};

export default PopularSpots;
