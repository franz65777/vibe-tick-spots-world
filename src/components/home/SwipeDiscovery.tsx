import React, { useState, useEffect } from 'react';
import { X, Heart, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CategoryIcon } from '@/components/common/CategoryIcon';

interface SwipeLocation {
  id: string;
  name: string;
  category: string;
  city: string;
  address?: string;
  image_url?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface SwipeDiscoveryProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
}

const SwipeDiscovery = ({ isOpen, onClose, userLocation }: SwipeDiscoveryProps) => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<SwipeLocation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDailyLocations();
    }
  }, [isOpen, userLocation]);

  const fetchDailyLocations = async () => {
    if (!user || !userLocation) return;

    try {
      setLoading(true);

      // Get locations user has already swiped today
      const today = new Date().toISOString().split('T')[0];
      const { data: swipedData } = await supabase
        .from('location_swipes' as any)
        .select('location_id')
        .eq('user_id', user.id)
        .gte('created_at', today);

      const swipedIds = (swipedData as any[])?.map((s: any) => s.location_id) || [];

      // Get locations user has already saved
      const { data: savedData } = await supabase
        .from('user_saved_locations')
        .select('location_id')
        .eq('user_id', user.id);

      const savedIds = savedData?.map(s => s.location_id) || [];

      // Fetch random locations (excluding already swiped/saved)
      let query = supabase
        .from('locations')
        .select('id, name, category, city, address, image_url, latitude, longitude')
        .limit(50);

      if (swipedIds.length > 0) {
        query = query.not('id', 'in', `(${swipedIds.join(',')})`);
      }
      if (savedIds.length > 0) {
        query = query.not('id', 'in', `(${savedIds.join(',')})`);
      }

      const { data: locationsData, error } = await query;

      if (error) throw error;

      // Filter by proximity and select 10 random
      const nearbyLocations = locationsData
        ?.filter(loc => {
          const lat = parseFloat(loc.latitude?.toString() || '0');
          const lng = parseFloat(loc.longitude?.toString() || '0');
          if (!lat || !lng) return false;
          const distance = calculateDistance(userLocation, { lat, lng });
          return distance <= 50; // Within 50km for discovery
        })
        .map(loc => ({
          id: loc.id,
          name: loc.name,
          category: loc.category,
          city: loc.city || 'Unknown',
          address: loc.address,
          image_url: loc.image_url,
          coordinates: {
            lat: parseFloat(loc.latitude?.toString() || '0'),
            lng: parseFloat(loc.longitude?.toString() || '0')
          }
        })) || [];

      // Shuffle and take 10
      const shuffled = nearbyLocations.sort(() => Math.random() - 0.5).slice(0, 10);
      setLocations(shuffled);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error fetching swipe locations:', error);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (
    a: { lat: number; lng: number },
    b: { lat: number; lng: number }
  ) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!user || currentIndex >= locations.length) return;

    const location = locations[currentIndex];
    setSwipeDirection(direction);

    try {
      // Record swipe
      await supabase.from('location_swipes' as any).insert({
        user_id: user.id,
        location_id: location.id,
        swiped_right: direction === 'right'
      });

      if (direction === 'right') {
        // Save location
        await supabase.from('user_saved_locations').insert({
          user_id: user.id,
          location_id: location.id
        });
        toast.success(`${location.name} saved!`);
      }

      // Move to next after animation
      setTimeout(() => {
        setSwipeDirection(null);
        setCurrentIndex(prev => prev + 1);
      }, 300);
    } catch (error) {
      console.error('Error swiping:', error);
      toast.error('Something went wrong');
      setSwipeDirection(null);
    }
  };

  if (!isOpen) return null;

  const currentLocation = locations[currentIndex];
  const hasMore = currentIndex < locations.length;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 flex justify-between items-center bg-white border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Discover Places</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-900" />
          </button>
        </div>

        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasMore ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">That's all for today!</h3>
            <p className="text-gray-600 mb-6">Come back tomorrow for more discoveries</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        ) : currentLocation ? (
          <>
            {/* Card */}
            <div
              className={`flex-1 flex flex-col transition-transform duration-300 ${
                swipeDirection === 'left'
                  ? '-translate-x-full opacity-0'
                  : swipeDirection === 'right'
                  ? 'translate-x-full opacity-0'
                  : ''
              }`}
            >
              {/* Image */}
              <div className="flex-1 relative bg-gradient-to-br from-gray-200 to-gray-300">
                {currentLocation.image_url ? (
                  <img
                    src={currentLocation.image_url}
                    alt={currentLocation.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <CategoryIcon category={currentLocation.category} className="w-24 h-24 opacity-30" />
                  </div>
                )}
                
                {/* Overlay info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-start gap-3">
                    <CategoryIcon category={currentLocation.category} className="w-8 h-8" />
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {currentLocation.name}
                      </h3>
                      <div className="flex items-center gap-2 text-white/80 text-sm">
                        <MapPin className="w-4 h-4" />
                        <span>{currentLocation.city}</span>
                      </div>
                      {currentLocation.address && (
                        <p className="text-white/60 text-xs mt-1 line-clamp-2">
                          {currentLocation.address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-6 flex items-center justify-center gap-6 bg-white">
                <button
                  onClick={() => handleSwipe('left')}
                  className="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shadow-lg transition-all hover:scale-110"
                  aria-label="Skip"
                >
                  <X className="w-8 h-8 text-gray-600" />
                </button>
                <button
                  onClick={() => handleSwipe('right')}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 flex items-center justify-center shadow-xl transition-all hover:scale-110"
                  aria-label="Save"
                >
                  <Heart className="w-10 h-10 text-white fill-white" />
                </button>
              </div>

              {/* Counter */}
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm">
                <span className="text-sm font-medium text-gray-900">
                  {currentIndex + 1} / {locations.length}
                </span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default SwipeDiscovery;
