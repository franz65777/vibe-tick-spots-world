import React, { useState, useEffect } from 'react';
import { X, Heart, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import likeIcon from '@/assets/icon-like-pin.png';
import xIcon from '@/assets/icon-x-red.png';
import hourglassIcon from '@/assets/icon-hourglass.png';

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
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchOffset, setTouchOffset] = useState({ x: 0, y: 0 });

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

      // Get users I follow
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = followingData?.map(f => f.following_id) || [];

      console.log('🔍 Following users:', followingIds.length);

      // Get locations saved by users I follow (excluding ones I swiped/saved)
      let locationsToShow: SwipeLocation[] = [];
      if (followingIds.length > 0) {
        const { data: friendsSaves, error: savesError } = await supabase
          .from('user_saved_locations')
          .select('location_id, created_at')
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
          .limit(50); // Get more to filter from

        console.log('📍 Friends saves:', friendsSaves?.length);
        if (savesError) {
          console.error('Error fetching friends saves:', savesError);
        }

        const friendsSavedLocationIds = Array.from(new Set(friendsSaves?.map(s => s.location_id) || []));

        // Filter out already swiped/saved
        const filteredIds = friendsSavedLocationIds.filter(
          id => !swipedIds.includes(id) && !savedIds.includes(id)
        );

        console.log('✅ Filtered location IDs:', filteredIds.length);

        if (filteredIds.length > 0) {
          const { data: locationsData, error } = await supabase
            .from('locations')
            .select('id, name, category, city, address, image_url, latitude, longitude')
            .in('id', filteredIds)
            .limit(10);

          if (error) {
            console.error('Error fetching locations:', error);
          } else {
            console.log('🎉 Fetched locations:', locationsData?.length);
          }

          if (!error && locationsData) {
            locationsToShow = locationsData.map(loc => ({
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
            }));
          }
        }
      }

      // Shuffle and take 10
      const shuffled = locationsToShow.sort(() => Math.random() - 0.5).slice(0, 10);
      console.log('🎲 Final shuffled locations to show:', shuffled.length);
      setLocations(shuffled);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error fetching swipe locations:', error);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
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
        setTouchOffset({ x: 0, y: 0 });
        setCurrentIndex(prev => prev + 1);
      }, 300);
    } catch (error) {
      console.error('Error swiping:', error);
      toast.error('Something went wrong');
      setSwipeDirection(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    setTouchOffset({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = () => {
    if (!touchStart) return;
    
    const swipeThreshold = 100;
    if (Math.abs(touchOffset.x) > swipeThreshold) {
      if (touchOffset.x > 0) {
        handleSwipe('right');
      } else {
        handleSwipe('left');
      }
    } else {
      setTouchOffset({ x: 0, y: 0 });
    }
    setTouchStart(null);
  };

  if (!isOpen) return null;

  const currentLocation = locations[currentIndex];
  const hasMore = currentIndex < locations.length;

  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="relative w-full h-full flex flex-col bg-gray-50">
        {/* Header - only X button and counter */}
        <div className="flex-shrink-0 p-4 flex justify-end items-center bg-white/90 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white shadow-lg ring-1 ring-black/5 hover:bg-gray-50 flex items-center justify-center transition-all"
          >
            <X className="w-6 h-6 text-gray-900" />
          </button>
        </div>
        
        {/* Counter - Top Right */}
        <div className="absolute top-20 right-4 px-3 py-1.5 rounded-full bg-white shadow-lg z-10">
          <span className="text-sm font-semibold text-gray-900">
            {currentIndex + 1} / {locations.length}
          </span>
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
          <div className="flex-1 flex items-center justify-center p-4 pt-14">
            {/* Swipeable Card */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-full max-w-md h-[400px] transition-transform duration-300"
              style={{
                transform: swipeDirection 
                  ? swipeDirection === 'left' 
                    ? 'translateX(-120%) rotate(-15deg)' 
                    : 'translateX(120%) rotate(15deg)'
                  : `translateX(${touchOffset.x}px) rotate(${touchOffset.x * 0.05}deg)`,
                opacity: swipeDirection ? 0 : 1 - Math.abs(touchOffset.x) / 500
              }}
            >
              <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-white">
                {/* Image */}
                <div className="absolute inset-0">
                  {currentLocation.image_url ? (
                    <img
                      src={currentLocation.image_url}
                      alt={currentLocation.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <div className="w-24 h-24 rounded-full bg-white/60" />
                    </div>
                  )}
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                </div>

                {/* Bottom Info - name only */}
                <div className="absolute bottom-0 left-0 right-0 p-6 flex items-start justify-between pointer-events-none">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white drop-shadow mb-1">{currentLocation.name}</h3>
                    {currentLocation.city && (
                      <div className="flex items-center gap-2 text-white/90 text-sm">
                        <MapPin className="w-4 h-4" />
                        <span>{currentLocation.city}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons - Positioned higher, no backgrounds */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center justify-center gap-10">
              <button
                onClick={() => handleSwipe('left')}
                className="transition-all hover:scale-110 active:scale-95"
                aria-label="Skip"
              >
                <img src={xIcon} alt="Skip" className="w-14 h-14" />
              </button>
              <button
                onClick={() => handleSwipe('right')}
                className="transition-all hover:scale-110 active:scale-95"
                aria-label="Save for later"
              >
                <img src={hourglassIcon} alt="Save for later" className="w-14 h-14" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SwipeDiscovery;
