import React, { useState, useEffect } from 'react';
import { X, Heart, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import xIcon from '@/assets/icon-x-red.png';
import hourglassIcon from '@/assets/swipe-pin.png';

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
  saved_by?: {
    id: string;
    username: string;
    avatar_url: string;
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

      // Map swiped location ids -> google_place_id to avoid repeats by place
      let swipedPlaceIds: Set<string> = new Set();
      if (swipedLocationIds.length > 0) {
        const { data: swipedLocations } = await supabase
          .from('locations')
          .select('google_place_id')
          .in('id', swipedLocationIds);
        swipedPlaceIds = new Set((swipedLocations || []).map(l => l.google_place_id).filter(Boolean) as string[]);
      }

      // Get my saved place_ids to exclude
      const { data: mySavedPlaces } = await supabase
        .from('saved_places')
        .select('place_id')
        .eq('user_id', user.id);
      const mySavedPlaceIds = new Set((mySavedPlaces || []).map((s) => s.place_id) as string[]);
      console.log(`🔖 I have ${mySavedPlaceIds.size} saved places`);

      // Get users I follow
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = followingData?.map((f) => f.following_id) || [];
      console.log(`👥 Following ${followingIds.length} users`);

      let candidates: {
        place_id: string;
        place_name: string;
        place_category: string | null;
        city: string | null;
        coordinates: { lat: number; lng: number } | null;
        user_id?: string;
      }[] = [];

      if (followingIds.length > 0) {
        // Saved places from followed users
        const { data: friendsSaves, error: savesError } = await supabase
          .from('saved_places')
          .select('place_id, place_name, place_category, city, coordinates, created_at, user_id')
          .in('user_id', followingIds);
        if (savesError) console.error('❌ Error fetching friends saves:', savesError);
        candidates = (friendsSaves || []).map((s) => ({
          place_id: s.place_id,
          place_name: s.place_name,
          place_category: s.place_category || 'Unknown',
          city: s.city || 'Unknown',
          coordinates: (s.coordinates as any) || null,
          user_id: s.user_id,
        }));
      }

      // Fallback: if no follows or no candidates, show recent public locations (with google_place_id)
      if (candidates.length === 0) {
        const { data: recentLocations } = await supabase
          .from('locations')
          .select('google_place_id, name, category, city, address, image_url, latitude, longitude, created_at')
          .not('google_place_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(60);
        candidates = (recentLocations || []).map((l: any) => ({
          place_id: l.google_place_id,
          place_name: l.name,
          place_category: l.category || 'Unknown',
          city: l.city || 'Unknown',
          coordinates: { lat: Number(l.latitude) || 0, lng: Number(l.longitude) || 0 },
        }));
      }

      // Filter out already saved/swiped and invalid
      const filtered = candidates.filter((c) =>
        c.place_id &&
        !mySavedPlaceIds.has(c.place_id) &&
        !swipedPlaceIds.has(c.place_id)
      );

      if (filtered.length === 0) {
        console.log('⚠️ No new locations to show');
        setLocations([]);
        setCurrentIndex(0);
        setLoading(false);
        return;
      }

      // Shuffle and take a chunk
      const shuffled = filtered.sort(() => Math.random() - 0.5).slice(0, 20);

      // Fetch user profiles for avatars
      const userIds = shuffled.map(s => s.user_id).filter(Boolean) as string[];
      let profilesMap = new Map<string, { username: string; avatar_url: string }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
        profiles?.forEach(p => profilesMap.set(p.id, { username: p.username || 'User', avatar_url: p.avatar_url || '' }));
      }

      const locationsToShow: SwipeLocation[] = shuffled.map((save) => ({
        id: save.place_id,
        place_id: save.place_id,
        name: save.place_name,
        category: save.place_category || 'Unknown',
        city: save.city || 'Unknown',
        address: undefined,
        image_url: undefined,
        coordinates: {
          lat: save.coordinates?.lat || 0,
          lng: save.coordinates?.lng || 0,
        },
        saved_by: save.user_id ? {
          id: save.user_id,
          username: profilesMap.get(save.user_id)?.username || 'User',
          avatar_url: profilesMap.get(save.user_id)?.avatar_url || '',
        } : undefined,
      }));

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
        {/* Header - only X button */}
        <div className="flex-shrink-0 p-4 flex justify-end items-center bg-white/90 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white shadow-lg ring-1 ring-black/5 hover:bg-gray-50 flex items-center justify-center transition-all"
          >
            <X className="w-6 h-6 text-gray-900" />
          </button>
        </div>

        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          ) : !hasMore ? (
            <div className="h-full flex items-center justify-center p-8 text-center">
              <div className="space-y-3">
                <div className="text-gray-700 font-medium">No locations right now</div>
                <Button onClick={fetchDailyLocations} variant="outline" className="mx-auto">Refresh</Button>
              </div>
            </div>
        ) : currentLocation ? (
          <div className="flex-1 flex items-center justify-center p-4 pt-20">
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

                {/* Bottom Info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white drop-shadow mb-1">{currentLocation.name}</h3>
                    {currentLocation.city && (
                      <div className="flex items-center gap-2 text-white/90 text-sm">
                        <MapPin className="w-4 h-4" />
                        <span>{currentLocation.city}</span>
                      </div>
                    )}
                  </div>
                  {currentLocation.saved_by && (
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-2">
                      {currentLocation.saved_by.avatar_url ? (
                        <img 
                          src={currentLocation.saved_by.avatar_url} 
                          alt={currentLocation.saved_by.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {currentLocation.saved_by.username[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-white text-sm font-medium">{currentLocation.saved_by.username}</span>
                    </div>
                  )}
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
