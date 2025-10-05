import React, { useState, useEffect } from 'react';
import { X, Heart, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import xIcon from '@/assets/icon-x-red.png';
import hourglassIcon from '@/assets/icon-like-pin.png';

interface SwipeLocation {
  id: string;
  place_id: string;
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

  // Auto-load more when reaching near the end
  useEffect(() => {
    if (!isOpen) return;
    if (locations.length > 0 && currentIndex >= locations.length - 2 && !loading) {
      fetchDailyLocations();
    }
  }, [currentIndex, locations.length, isOpen, loading]);

  const fetchDailyLocations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('🔄 Fetching swipe locations for user:', user.id);

      // Exclude all previously swiped locations to avoid repeats
      const { data: swipedData } = await supabase
        .from('location_swipes')
        .select('location_id, created_at')
        .eq('user_id', user.id);

      const swipedLocationIds = (swipedData || []).map((s) => s.location_id);
      const remainingQuota = 20;

      // Get my saved place_ids to exclude
      const { data: mySavedPlaces } = await supabase
        .from('saved_places')
        .select('place_id')
        .eq('user_id', user.id);
      const mySavedPlaceIds = new Set((mySavedPlaces || []).map((s) => s.place_id));
      console.log(`🔖 I have ${mySavedPlaceIds.size} saved places`);

      // Get users I follow
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = followingData?.map(f => f.following_id) || [];
      console.log(`👥 Following ${followingIds.length} users:`, followingIds);

      if (followingIds.length === 0) {
        console.log('⚠️ Not following any users');
        setLocations([]);
        setCurrentIndex(0);
        setLoading(false);
        return;
      }

      // Get ALL saved_places from followed users
      const { data: friendsSaves, error: savesError } = await supabase
        .from('saved_places')
        .select('place_id, place_name, place_category, city, coordinates, created_at, user_id')
        .in('user_id', followingIds);

      if (savesError) {
        console.error('❌ Error fetching friends saves:', savesError);
      }

      console.log(`📍 Friends have saved ${friendsSaves?.length || 0} places total`);

      if (!friendsSaves || friendsSaves.length === 0) {
        console.log('⚠️ No saved places from followed users');
        setLocations([]);
        setCurrentIndex(0);
        setLoading(false);
        return;
      }

      // Filter out places I've already saved
      const filteredSaves = friendsSaves.filter(s => !mySavedPlaceIds.has(s.place_id));
      console.log(`✅ After filtering my saves: ${filteredSaves.length} candidates`);

      // Filter out places I've swiped in last 12h (using place_id)
      let swipedPlaceIds: Set<string> = new Set();
      if (swipedLocationIds.length > 0) {
        const { data: swipedLocations } = await supabase
          .from('locations')
          .select('google_place_id')
          .in('id', swipedLocationIds);
        swipedPlaceIds = new Set((swipedLocations || []).map(l => l.google_place_id).filter(Boolean));
      }

      const candidateSaves = filteredSaves.filter(s => !swipedPlaceIds.has(s.place_id));
      console.log(`🎯 After filtering swiped: ${candidateSaves.length} final candidates`);

      if (candidateSaves.length === 0) {
        console.log('⚠️ No new locations to show');
        setLocations([]);
        setCurrentIndex(0);
        setLoading(false);
        return;
      }

      // Shuffle and limit to remaining quota
      const shuffled = candidateSaves.sort(() => Math.random() - 0.5).slice(0, remainingQuota);
      console.log(`🎲 Showing ${shuffled.length} locations`);

      // Map to SwipeLocation format
      const locationsToShow: SwipeLocation[] = shuffled.map(save => {
        const coords = save.coordinates as any;
        return {
          id: save.place_id,
          place_id: save.place_id,
          name: save.place_name,
          category: save.place_category || 'Unknown',
          city: save.city || 'Unknown',
          address: undefined,
          image_url: undefined,
          coordinates: {
            lat: coords?.lat || 0,
            lng: coords?.lng || 0
          }
        };
      });

      setLocations(locationsToShow);
      setCurrentIndex(0);
    } catch (error) {
      console.error('❌ Error fetching swipe locations:', error);
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
      // First, get or create the location in the locations table
      let locationId: string | null = null;

      // Check if location already exists
      const { data: existingLocation } = await supabase
        .from('locations')
        .select('id')
        .eq('google_place_id', location.place_id)
        .single();

      if (existingLocation) {
        locationId = existingLocation.id;
      } else {
        // Create new location
        const { data: newLocation, error: createError } = await supabase
          .from('locations')
          .insert({
            google_place_id: location.place_id,
            name: location.name,
            category: location.category,
            city: location.city,
            address: location.address,
            image_url: location.image_url,
            latitude: location.coordinates.lat,
            longitude: location.coordinates.lng,
            created_by: user.id
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating location:', createError);
          toast.error('Failed to save location');
          setSwipeDirection(null);
          return;
        }
        locationId = newLocation.id;
      }

      // Record swipe
      await supabase.from('location_swipes').insert({
        user_id: user.id,
        location_id: locationId,
        swiped_right: direction === 'right'
      });

      if (direction === 'right') {
        // Save to saved_places
        await supabase.from('saved_places').insert({
          user_id: user.id,
          place_id: location.place_id,
          place_name: location.name,
          place_category: location.category,
          city: location.city,
          coordinates: location.coordinates
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
        
        {/* Counter - Top Right (only when a card is active) */}
        {hasMore && currentLocation && (
          <div className="absolute top-20 right-4 px-3 py-1.5 rounded-full bg-white shadow-lg z-10">
            <span className="text-sm font-semibold text-gray-900">
              {currentIndex + 1} / {locations.length}
            </span>
          </div>
        )}

        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasMore ? (
          <div className="h-full flex items-center justify-center p-8 text-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">Loading more...</span>
            </div>
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
