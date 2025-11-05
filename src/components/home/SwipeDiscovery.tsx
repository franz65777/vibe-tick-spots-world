import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Search, Users, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import CityLabel from '@/components/common/CityLabel';
import swipeNo from '@/assets/swipe-no-3d-new.png';
import swipePin from '@/assets/swipe-pin-3d-new.png';
import { useTranslation } from 'react-i18next';
import SwipeCategoryFilter from './SwipeCategoryFilter';
import { allowedCategories, type AllowedCategory } from '@/utils/allowedCategories';

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
  saved_by_users?: {
    id: string;
    username: string;
    avatar_url: string;
  }[];
}

interface SwipeDiscoveryProps {
  userLocation: { lat: number; lng: number } | null;
}

interface FollowedUser {
  id: string;
  username: string;
  avatar_url: string;
  new_saves_count: number;
}

const SwipeDiscovery = ({ userLocation }: SwipeDiscoveryProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [locations, setLocations] = useState<SwipeLocation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchOffset, setTouchOffset] = useState({ x: 0, y: 0 });
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AllowedCategory | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<AllowedCategory, number>>({
    restaurant: 0,
    bar: 0,
    cafe: 0,
    bakery: 0,
    hotel: 0,
    museum: 0,
    entertainment: 0
  });

  useEffect(() => {
    fetchFollowedUsers();
  }, [user]);

  useEffect(() => {
    fetchDailyLocations();
  }, [userLocation, user, selectedUserId]);

  // Calculate category counts when locations change
  useEffect(() => {
    const counts: Record<AllowedCategory, number> = {
      restaurant: 0,
      bar: 0,
      cafe: 0,
      bakery: 0,
      hotel: 0,
      museum: 0,
      entertainment: 0
    };
    locations.forEach(loc => {
      const cat = loc.category as AllowedCategory;
      if (allowedCategories.includes(cat)) {
        counts[cat]++;
      }
    });
    setCategoryCounts(counts);
  }, [locations]);

  // Reset index when category changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedCategory]);

  // Auto-load more when reaching near the end
  useEffect(() => {
    if (loading) return;
    if (locations.length > 0 && currentIndex >= locations.length - 2) {
      console.log('🔄 Auto-loading more locations...');
      fetchDailyLocations();
    }
  }, [currentIndex, locations.length]);

  const fetchFollowedUsers = async () => {
    if (!user) return;

    try {
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      console.log('📊 Follows data:', followsData);

      if (!followsData || followsData.length === 0) {
        setFollowedUsers([]);
        return;
      }

      const followingIds = followsData.map(f => f.following_id);

      // Get profiles and count of recent saves (last 7 days)
      const { data: usersWithSaves } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', followingIds);

      console.log('👥 Users with saves:', usersWithSaves);

      if (!usersWithSaves) return;

      // Count recent saves for each user
      const usersWithCounts = await Promise.all(
        usersWithSaves.map(async (profile) => {
          const { count } = await supabase
            .from('saved_places')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

          return {
            id: profile.id,
            username: profile.username || 'User',
            avatar_url: profile.avatar_url || '',
            new_saves_count: count || 0
          };
        })
      );

      console.log('✨ Users with counts:', usersWithCounts);

      // Sort users by new saves count and filter to only show users with new saves
      const sortedUsers = usersWithCounts
        .filter(u => u.new_saves_count > 0)
        .sort((a, b) => b.new_saves_count - a.new_saves_count);

      setFollowedUsers(sortedUsers);
    } catch (error) {
      console.error('❌ Error fetching followed users:', error);
    }
  };

  const fetchDailyLocations = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Parallel queries for better performance
      const [swipedData, mySavedPlaces, friendsSaves] = await Promise.all([
        supabase.from('location_swipes').select('location_id').eq('user_id', user.id),
        supabase.from('saved_places').select('place_id').eq('user_id', user.id),
        supabase.rpc('get_following_saved_places', { limit_count: 50 })
      ]);

      const swipedLocationIds = (swipedData.data || []).map((s) => s.location_id);
      const mySavedPlaceIds = new Set((mySavedPlaces.data || []).map((s) => s.place_id) as string[]);

      // Get swipedPlaceIds efficiently
      let swipedPlaceIds: Set<string> = new Set();
      if (swipedLocationIds.length > 0) {
        const { data } = await supabase
          .from('locations')
          .select('google_place_id')
          .in('id', swipedLocationIds);
        swipedPlaceIds = new Set((data || []).map(l => l.google_place_id).filter(Boolean) as string[]);
      }

      // Filter by selected user if one is selected later during aggregation
      const raw = (friendsSaves.data || []) as any[];

      // Build followed users list directly from current saves feed
      try {
        const usersMap = new Map<string, { id: string; username: string; avatar_url: string; new_saves_count: number }>();
        for (const r of raw) {
          const uid = r.user_id;
          if (!uid) continue;
          const prev = usersMap.get(uid);
          if (prev) {
            prev.new_saves_count += 1;
          } else {
            usersMap.set(uid, {
              id: uid,
              username: r.username || 'User',
              avatar_url: r.avatar_url || '',
              new_saves_count: 1,
            });
          }
        }
        const list = Array.from(usersMap.values()).sort((a, b) => b.new_saves_count - a.new_saves_count);
        setFollowedUsers(list);
      } catch (e) {
        console.warn('Could not build followed users from saves feed', e);
      }

      // Map raw rows into grouped locations by place_id, aggregating all savers
      const byPlace = new Map<string, SwipeLocation & { saved_by_users: NonNullable<SwipeLocation['saved_by_users']> }>();
      for (const s of raw) {
        let coords: any = { lat: 0, lng: 0 };
        try {
          coords = typeof s.coordinates === 'string' ? JSON.parse(s.coordinates) : (s.coordinates || { lat: 0, lng: 0 });
        } catch (e) {
          console.error('Error parsing coordinates for', s.place_name, e);
        }
        const latNum = Number(coords?.lat ?? coords?.latitude ?? 0);
        const lngNum = Number(coords?.lng ?? coords?.longitude ?? 0);
        const placeId = s.place_id || '';
        if (!placeId) continue;
        const saver = { id: s.user_id || '', username: s.username || 'User', avatar_url: s.avatar_url || '' };
        const existing = byPlace.get(placeId);
        if (existing) {
          if (!existing.saved_by_users.find(u => u.id === saver.id)) existing.saved_by_users.push(saver);
        } else {
          byPlace.set(placeId, {
            id: placeId,
            place_id: placeId,
            name: s.place_name || 'Unknown Place',
            category: s.place_category || 'place',
            city: s.city || null,
            address: s.address || null,
            image_url: undefined,
            coordinates: { lat: latNum, lng: lngNum },
            saved_by: saver,
            saved_by_users: [saver],
          });
        }
      }

      // Convert to array and apply optional selected user filter
      let candidates: SwipeLocation[] = Array.from(byPlace.values());
      if (selectedUserId) {
        candidates = candidates.filter(c => c.saved_by_users?.some(u => u.id === selectedUserId));
      }

      // Enrich candidates with internal location data (city/address/coords/image)
      if (candidates.length > 0) {
        const placeIds = Array.from(new Set(candidates.map(c => c.place_id).filter(Boolean)));
        if (placeIds.length) {
          const { data: locRows } = await supabase
            .from('locations')
            .select('google_place_id, city, address, latitude, longitude, image_url')
            .in('google_place_id', placeIds);
          const byId = new Map((locRows || []).map((r: any) => [r.google_place_id, r]));
          candidates = candidates.map(c => {
            const m: any = byId.get(c.place_id);
            if (!m) return c;
            const lat = Number(c.coordinates?.lat) || Number(m.latitude) || 0;
            const lng = Number(c.coordinates?.lng) || Number(m.longitude) || 0;
            return {
              ...c,
              city: c.city || m.city || null,
              address: c.address || m.address || null,
              image_url: c.image_url || m.image_url || undefined,
              coordinates: { lat, lng },
            };
          });
        }
      }

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
          address: l.address || null,
          image_url: l.image_url || undefined,
          coordinates: { lat: Number(l.latitude) || 0, lng: Number(l.longitude) || 0 },
          saved_by: undefined,
          saved_by_users: [],
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

  // Filter locations by selected category
  const filteredLocations = selectedCategory
    ? locations.filter(loc => loc.category === selectedCategory)
    : locations;
  
  const currentLocation = filteredLocations[currentIndex];

  return (
    <div className="fixed inset-0 w-full bg-background z-50 flex flex-col overflow-hidden pt-8">
      {/* Header with back button - moved down for mobile safe area */}
      <div className="bg-transparent px-4 py-2 flex items-center gap-3 relative z-10">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-muted rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-semibold text-foreground">{t('discoverPlaces')}</h1>
      </div>

      {/* Followed Users Row - positioned with padding to avoid clipping */}
      <div className="bg-background px-4 pt-6 pb-2 overflow-visible relative z-30">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 pl-2 pr-3" style={{ scrollSnapType: 'x mandatory' }}>
          {/* All button */}
          <button
            onClick={() => {
              setSelectedUserId(null);
              setCurrentIndex(0);
              fetchDailyLocations();
            }}
            className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-opacity ${
              selectedUserId === null ? 'opacity-100' : 'opacity-60'
            }`}
            style={{ scrollSnapAlign: 'start' }}
          >
            <div className={`relative z-[90] w-14 h-14 rounded-full flex items-center justify-center transition-all bg-muted ${
              selectedUserId === null ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}>
              <Users className="w-6 h-6 text-foreground" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{t('all', { ns: 'common' })}</span>
          </button>

          {followedUsers.map((followedUser) => (
            <button
              key={followedUser.id}
              onClick={() => {
                console.log('🎯 Selected user:', followedUser.username, followedUser.id);
                setSelectedUserId(followedUser.id);
                setCurrentIndex(0);
                fetchDailyLocations();
              }}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-opacity ${
                selectedUserId === followedUser.id ? 'opacity-100' : 'opacity-60'
              }`}
              style={{ scrollSnapAlign: 'start' }}
            >
              <div className="relative z-[90]">
                {followedUser.avatar_url ? (
                  <img
                    src={followedUser.avatar_url}
                    alt={followedUser.username}
                    className={`w-14 h-14 rounded-full object-cover transition-all ${
                      selectedUserId === followedUser.id ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}
                  />
                ) : (
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center transition-all ${
                    selectedUserId === followedUser.id ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}>
                    <span className="text-white text-lg font-bold">
                      {followedUser.username[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                {followedUser.new_saves_count > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow-md z-[100]">
                    {followedUser.new_saves_count > 9 ? '9+' : followedUser.new_saves_count}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium text-gray-700 max-w-[60px] truncate">
                {followedUser.username}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      {!loading && filteredLocations.length > 0 && (
        <SwipeCategoryFilter
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          counts={categoryCounts}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600 font-medium">{t('findingAmazingPlaces')}</p>
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
                <h3 className="text-2xl font-bold text-gray-900">{t('noPlacesToDiscover')}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {t('followMorePeople')}
                </p>
              </div>
              
              <div className="flex flex-col items-stretch gap-3 pt-4">
                <Button 
                  onClick={() => navigate('/explore', { state: { searchMode: 'users' } })} 
                  className="rounded-full h-12 text-base font-semibold"
                  size="lg"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  {t('findPeopleToFollow')}
                </Button>
                <Button 
                  onClick={fetchDailyLocations} 
                  variant="outline" 
                  className="rounded-full h-12 text-base"
                >
                  {t('tryAgain')}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-start justify-center px-3 pt-6 pb-3">
            {/* Swipeable Card */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-full max-w-[480px] mx-auto transition-transform duration-300"
              style={{
                transform: swipeDirection 
                  ? swipeDirection === 'left' 
                    ? 'translateX(-120%) rotate(-10deg)' 
                    : 'translateX(120%) rotate(10deg)'
                  : `translateX(${touchOffset.x}px) rotate(${touchOffset.x * 0.03}deg)`,
                opacity: swipeDirection ? 0 : 1 - Math.abs(touchOffset.x) / 600
              }}
            >
              <div className="relative w-full aspect-[2/2.5] rounded-2xl overflow-hidden shadow-xl bg-white border border-gray-100">
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

                {/* Top - Saved by avatars (stacked) */}
                {(currentLocation.saved_by_users && currentLocation.saved_by_users.length > 0) ? (
                  <div className="absolute top-6 left-4 flex items-center gap-2 bg-black/55 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg">
                    <div className="flex -space-x-2">
                      {currentLocation.saved_by_users.slice(0, 4).map(u => (
                        <img
                          key={u.id}
                          src={u.avatar_url || undefined}
                          alt={u.username}
                          className="w-7 h-7 rounded-full object-cover ring-2 ring-white/30 bg-muted"
                        />
                      ))}
                    </div>
                    {currentLocation.saved_by_users.length > 4 && (
                      <span className="text-white/90 text-xs font-medium">+{currentLocation.saved_by_users.length - 4}</span>
                    )}
                  </div>
                ) : currentLocation.saved_by ? (
                  <div className="absolute top-6 left-4 flex items-center gap-2 bg-black/55 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg">
                    {currentLocation.saved_by.avatar_url ? (
                      <img 
                        src={currentLocation.saved_by.avatar_url} 
                        alt={currentLocation.saved_by.username}
                        className="w-7 h-7 rounded-full object-cover ring-2 ring-white/30"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center ring-2 ring-white/30">
                        <span className="text-white text-xs font-bold">
                          {currentLocation.saved_by.username[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="text-white text-sm font-semibold">
                      {currentLocation.saved_by.username}
                    </span>
                  </div>
                ) : null}

                {/* Bottom Info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-8">
                  <div className="mb-6">
                    <h3 className="text-3xl font-bold text-white drop-shadow-lg mb-2">
                      {currentLocation.name}
                    </h3>
                    <div className="flex items-center gap-2 text-white/90 text-base">
                      <MapPin className="w-5 h-5" />
                      <CityLabel 
                        id={currentLocation.place_id}
                        city={currentLocation.city}
                        address={currentLocation.address}
                        coordinates={currentLocation.coordinates}
                        className="font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryIcon category={currentLocation.category} className="w-5 h-5 text-white" />
                      <span className="text-white/80 text-sm">{t(`categories:${currentLocation.category.toLowerCase()}`)}</span>
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
                      <img src={swipeNo} alt="Pass" className="w-full h-full object-contain drop-shadow-lg" />
                    </button>
                    <button
                      onClick={() => handleSwipe('right')}
                      disabled={swipeDirection !== null}
                      className="w-20 h-20 rounded-full hover:scale-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                      aria-label="Save"
                    >
                      <img src={swipePin} alt="Save" className="w-full h-full object-contain drop-shadow-lg" />
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
