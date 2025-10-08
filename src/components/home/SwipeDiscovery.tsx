import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import xIcon from '@/assets/swipe-no.png';
import pinIcon from '@/assets/swipe-pin.png';

interface SwipeLocation {
  id: string;
  place_id: string;
  name: string;
  category: string;
  city: string | null;
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
  userLocation: { lat: number; lng: number } | null;
}

const SwipeDiscovery = ({ userLocation }: SwipeDiscoveryProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [locations, setLocations] = useState<SwipeLocation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchOffset, setTouchOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchDailyLocations();
  }, [userLocation, user]);

  // Auto-load more when reaching near the end
  useEffect(() => {
    if (loading) return;
    if (locations.length > 0 && currentIndex >= locations.length - 2) {
      console.log('🔄 Auto-loading more locations...');
      fetchDailyLocations();
    }
  }, [currentIndex, locations.length]);

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
        let coords: any = { lat: 0, lng: 0 };
        try {
          coords = typeof s.coordinates === 'string' 
            ? JSON.parse(s.coordinates) 
            : (s.coordinates || { lat: 0, lng: 0 });
        } catch (e) {
          console.error('Error parsing coordinates for', s.place_name, e);
        }
        
        const latNum = Number(coords?.lat ?? coords?.latitude ?? 0);
        const lngNum = Number(coords?.lng ?? coords?.longitude ?? 0);
        
        console.log(`📌 Processing place: ${s.place_name} from ${s.username}`, { coords: { lat: latNum, lng: lngNum }, city: s.city });
        
        return {
          id: s.place_id || `temp-${Math.random()}`,
          place_id: s.place_id || '',
          name: s.place_name || 'Unknown Place',
          category: s.place_category || 'place',
          city: s.city || null,
          address: s.address || null,
          image_url: undefined,
          coordinates: { lat: latNum, lng: lngNum },
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
        console.log('📊 Status: mySavedPlaceIds:', mySavedPlaceIds.size, 'swipedPlaceIds:', swipedPlaceIds.size);
        // Only reset if this is the initial load
        if (locations.length === 0) {
          setLocations([]);
          setCurrentIndex(0);
        }
        setLoading(false);
        return;
      }

      // Shuffle and take a chunk
      const shuffled = filtered.sort(() => Math.random() - 0.5).slice(0, 20);
      console.log('🎲 Showing', shuffled.length, 'shuffled locations');

      // Only append new locations if we have existing ones
      if (locations.length > 0 && currentIndex > 0) {
        setLocations(prev => [...prev, ...shuffled]);
      } else {
        setLocations(shuffled);
        setCurrentIndex(0);
      }
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
        // Save to saved_places and backfill city if missing
        const { data: inserted, error: spInsertError } = await supabase
          .from('saved_places')
          .insert({
            user_id: user.id,
            place_id: location.place_id,
            place_name: location.name,
            place_category: location.category,
            city: location.city || null,
            coordinates: location.coordinates
          })
          .select('id, city')
          .single();
        if (spInsertError) {
          console.error('Error saving to saved_places:', spInsertError);
          toast.error('Failed to save location');
          setSwipeDirection(null);
          return;
        }
        // If city is missing/Unknown but we have coords, reverse geocode and update
        const needCity = !inserted?.city || inserted.city === 'Unknown' || inserted.city.trim() === '';
        if (needCity && location.coordinates?.lat && location.coordinates?.lng) {
          try {
            const { data: geo } = await supabase.functions.invoke('reverse-geocode', {
              body: { latitude: location.coordinates.lat, longitude: location.coordinates.lng }
            });
            const city = geo?.city || null;
            if (city) {
              await supabase.from('saved_places').update({ city }).eq('id', inserted.id);
              console.log(`✅ Backfilled city for saved_place ${inserted.id}: ${city}`);
            }
          } catch (e) {
            console.warn('Reverse geocode failed for saved_place:', e);
          }
        }
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

  const currentLocation = locations[currentIndex];

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-50 to-gray-100 z-50 flex flex-col">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900">Discover Places</h1>
          <p className="text-xs text-gray-500">
            {locations.length > 0 ? `${currentIndex + 1} of ${locations.length}` : 'Loading...'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Finding amazing places...</p>
          </div>
        ) : !currentLocation ? (
          <div className="h-full flex items-center justify-center p-8 text-center">
            {/* Empty state content */}
            <div className="space-y-6 max-w-sm mx-auto">
              <div className="flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg">
                  <Users className="w-12 h-12 text-white" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-gray-900">No Places to Discover</h3>
                <p className="text-gray-600 leading-relaxed">
                  Follow more people to see their saved locations and discover amazing new places to explore
                </p>
              </div>
              
              <div className="flex flex-col items-stretch gap-3 pt-4">
                <Button 
                  onClick={() => navigate('/explore')} 
                  className="rounded-full h-12 text-base font-semibold"
                  size="lg"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Find People to Follow
                </Button>
                <Button 
                  onClick={fetchDailyLocations} 
                  variant="outline" 
                  className="rounded-full h-12 text-base"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-4">
            {/* Swipeable Card */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-full max-w-lg transition-transform duration-300"
              style={{
                transform: swipeDirection 
                  ? swipeDirection === 'left' 
                    ? 'translateX(-120%) rotate(-10deg)' 
                    : 'translateX(120%) rotate(10deg)'
                  : `translateX(${touchOffset.x}px) rotate(${touchOffset.x * 0.03}deg)`,
                opacity: swipeDirection ? 0 : 1 - Math.abs(touchOffset.x) / 600
              }}
            >
              <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl bg-white">
                {/* Image or Gradient Background */}
                <div className="absolute inset-0">
                  {currentLocation.image_url ? (
                    <img
                      src={currentLocation.image_url}
                      alt={currentLocation.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
                      <CategoryIcon category={currentLocation.category} className="w-32 h-32 opacity-40" />
                    </div>
                  )}
                  
                  {/* Gradient overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20" />
                </div>

                {/* Top - Saved by avatar */}
                {currentLocation.saved_by && (
                  <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-full px-4 py-2.5 shadow-lg">
                    {currentLocation.saved_by.avatar_url ? (
                      <img 
                        src={currentLocation.saved_by.avatar_url} 
                        alt={currentLocation.saved_by.username}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-white/30"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center ring-2 ring-white/30">
                        <span className="text-white text-sm font-bold">
                          {currentLocation.saved_by.username[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="text-white text-sm font-semibold">
                      {currentLocation.saved_by.username}
                    </span>
                  </div>
                )}

                {/* Bottom Info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-8">
                  <div className="mb-6">
                    <h3 className="text-3xl font-bold text-white drop-shadow-lg mb-2">
                      {currentLocation.name}
                    </h3>
                    <div className="flex items-center gap-2 text-white/90 text-base">
                      <MapPin className="w-5 h-5" />
                      <span className="font-medium">
                        {currentLocation.city || currentLocation.address?.split(',')[1]?.trim() || 'Nearby'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryIcon category={currentLocation.category} className="w-5 h-5 text-white" />
                      <span className="text-white/80 text-sm capitalize">{currentLocation.category}</span>
                    </div>
                  </div>

                  {/* Action Buttons Inside Card */}
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={() => handleSwipe('left')}
                      disabled={swipeDirection !== null}
                      className="w-20 h-20 rounded-full hover:scale-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                      aria-label="Pass"
                    >
                      <img src={xIcon} alt="Pass" className="w-14 h-14 object-contain" />
                    </button>
                    <button
                      onClick={() => handleSwipe('right')}
                      disabled={swipeDirection !== null}
                      className="w-20 h-20 rounded-full hover:scale-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                      aria-label="Save"
                    >
                      <img src={pinIcon} alt="Save" className="w-14 h-14 object-contain" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwipeDiscovery;
