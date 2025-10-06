import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import swipeNo from '@/assets/swipe-no.png';
import swipeSave from '@/assets/swipe-save.png';

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
  const navigate = useNavigate();
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
        .select('location_id')
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

      // Use new RPC to get followed users' saves with profile info
      const { data: friendsSaves, error: savesError } = await supabase
        .rpc('get_following_saved_places', { limit_count: 100 });

      if (savesError) {
        console.error('❌ Error fetching friends saves:', savesError);
      }

      console.log('📍 Friends saves data:', friendsSaves);
      
      let candidates: SwipeLocation[] = (friendsSaves || []).map((s: any) => {
        let coords = { lat: 0, lng: 0 };
        try {
          coords = typeof s.coordinates === 'string' 
            ? JSON.parse(s.coordinates) 
            : (s.coordinates || { lat: 0, lng: 0 });
        } catch (e) {
          console.error('Error parsing coordinates for', s.place_name, e);
        }
        
        console.log(`📌 Processing place: ${s.place_name} from ${s.username}`, { coords, city: s.city });
        
        return {
          id: s.place_id || `temp-${Math.random()}`,
          place_id: s.place_id || '',
          name: s.place_name || 'Unknown Place',
          category: s.place_category || 'place',
          city: s.city || 'Unknown City',
          address: undefined,
          image_url: undefined,
          coordinates: coords,
          saved_by: {
            id: s.user_id || '',
            username: s.username || 'User',
            avatar_url: s.avatar_url || '',
          },
        };
      });

      // Fallback: if no follows or no candidates, show recent public locations (with google_place_id)
      if (candidates.length === 0) {
        console.log('⚠️ No friends saves, loading fallback locations');
        const { data: recentLocations } = await supabase
          .from('locations')
          .select('google_place_id, name, category, city, latitude, longitude, image_url')
          .not('google_place_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(60);
        candidates = (recentLocations || []).map((l: any) => ({
          id: l.google_place_id,
          place_id: l.google_place_id,
          name: l.name || 'Unknown Place',
          category: l.category || 'place',
          city: l.city || 'Unknown',
          address: undefined,
          image_url: l.image_url || undefined,
          coordinates: { lat: Number(l.latitude) || 0, lng: Number(l.longitude) || 0 },
          saved_by: undefined,
        }));
        console.log('📍 Loaded', candidates.length, 'fallback locations');
      }

      // Filter out already saved/swiped and invalid
      const filtered = candidates.filter((c) =>
        c.place_id &&
        !mySavedPlaceIds.has(c.place_id) &&
        !swipedPlaceIds.has(c.place_id) &&
        c.name !== 'Unknown Place'
      );

      console.log('✅ Filtered to', filtered.length, 'valid locations');

      if (filtered.length === 0) {
        console.log('⚠️ No new locations to show after filtering');
        setLocations([]);
        setCurrentIndex(0);
        setLoading(false);
        return;
      }

      // Shuffle and take a chunk
      const shuffled = filtered.sort(() => Math.random() - 0.5).slice(0, 20);
      console.log('🎲 Showing', shuffled.length, 'shuffled locations');

      setLocations(shuffled);
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
    <div className="w-full h-full bg-gray-50 flex flex-col">
      <div className="relative w-full h-full flex flex-col">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
) : !hasMore ? (
          <div className="h-full flex items-center justify-center p-8 text-center relative">
            {/* Exit button visible even when empty */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white flex items-center justify-center transition-all z-10"
              aria-label="Close"
            >
              <X className="w-6 h-6 text-gray-900" />
            </button>
            <div className="space-y-5 max-w-sm">
              <div className="flex items-center justify-center">
                <img src={swipeSave} alt="Explore" className="w-20 h-20 opacity-80" />
              </div>
              <div className="text-lg font-semibold text-foreground">No new saves from people you follow</div>
              <p className="text-muted-foreground text-sm">Follow more users to see their saved locations.</p>
              <div className="flex items-center justify-center gap-3 pt-1">
                <Button onClick={() => { onClose(); navigate('/explore'); }} className="rounded-full px-5">Search people</Button>
                <Button onClick={fetchDailyLocations} variant="outline" className="rounded-full px-5">Refresh</Button>
              </div>
            </div>
          </div>
        ) : currentLocation ? (
          <div className="flex-1 flex items-start justify-center p-4 pt-2">
            {/* Swipeable Card */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-full max-w-md h-[360px] transition-transform duration-300"
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
                {/* Image or Gradient Background */}
                <div className="absolute inset-0">
                  {currentLocation.image_url ? (
                    <img
                      src={currentLocation.image_url}
                      alt={currentLocation.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 flex items-center justify-center">
                      <CategoryIcon category={currentLocation.category} className="w-28 h-28 opacity-70" />
                    </div>
                  )}
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>

                {/* Top Left - Saved by avatar */}
                {currentLocation.saved_by && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-2">
                    {currentLocation.saved_by.avatar_url ? (
                      <img 
                        src={currentLocation.saved_by.avatar_url} 
                        alt={currentLocation.saved_by.username}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">
                          {currentLocation.saved_by.username[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="text-white text-sm font-medium">{currentLocation.saved_by.username}</span>
                  </div>
                )}

                {/* Top Right - X button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white flex items-center justify-center transition-all z-10"
                >
                  <X className="w-6 h-6 text-gray-900" />
                </button>

                {/* Bottom Info - Shifted up */}
                <div className="absolute bottom-16 left-0 right-0 p-6">
                  <div className="flex-1 mb-3">
                    <h3 className="text-2xl font-bold text-white drop-shadow-lg mb-1.5">
                      {currentLocation.name}
                    </h3>
                    {currentLocation.city && (
                      <div className="flex items-center gap-1.5 text-white text-sm mb-1.5">
                        <MapPin className="w-4 h-4" />
                        <span className="drop-shadow">{currentLocation.city}</span>
                      </div>
                    )}
                    {currentLocation.category && (
                      <div className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                        <span className="text-white text-xs font-medium capitalize">
                          {currentLocation.category}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons - Shifted up */}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center justify-center gap-8">
              <button
                onClick={() => handleSwipe('left')}
                className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                aria-label="Pass"
              >
                <img src={swipeNo} alt="Pass" className="w-10 h-10" />
              </button>
              <button
                onClick={() => handleSwipe('right')}
                className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                aria-label="Save for later"
              >
                <img src={swipeSave} alt="Save" className="w-10 h-10" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SwipeDiscovery;
