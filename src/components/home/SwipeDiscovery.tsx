import React, { useState, useEffect, useMemo } from 'react';
import LocationDetailDrawer from './LocationDetailDrawer';
import { ArrowLeft, UserPlus, ChevronUp, Info } from 'lucide-react';
import discoverMascot from '@/assets/discover-mascot.png';
import noUsersCharacter from '@/assets/no-users-character.png';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { CategoryIcon } from '@/components/common/CategoryIcon';
// CityLabel removed - now using inline city display
import swipeNo from '@/assets/swipe-no-3d-new.png';
import swipePin from '@/assets/swipe-pin-3d-new.png';
import { useTranslation } from 'react-i18next';
import SwipeCategoryFilter from './SwipeCategoryFilter';
import { allowedCategories, type AllowedCategory } from '@/utils/allowedCategories';

interface SwipeLocation {
  id: string;
  name: string;
  category: string;
  city: string | null;
  address?: string;
  image_url?: string;
  photos?: string[]; // Array of photo URLs from Google (max 6)
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

export interface SwipeDiscoveryHandle {
  reload: () => void;
}

interface FollowedUser {
  id: string;
  username: string;
  avatar_url: string;
  new_saves_count: number;
}

const SwipeDiscovery = React.forwardRef<SwipeDiscoveryHandle, SwipeDiscoveryProps>(({ userLocation }, ref) => {
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
    entertainment: 0,
    park: 0,
    historical: 0,
    nightclub: 0
  });
  const [processedPlaceIds, setProcessedPlaceIds] = useState<Set<string>>(new Set());
  const [detailLocation, setDetailLocation] = useState<SwipeLocation | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    fetchFollowedUsers();
    
    // Subscribe to realtime updates for followed users' saves
    if (!user) return;
    
    const channel = supabase
      .channel('discover-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'saved_places'
        },
        () => {
          // Refresh followed users when new saves happen
          fetchFollowedUsers();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    fetchDailyLocations();
  }, [userLocation, user, selectedUserId]);

  // Expose reload function via ref
  React.useImperativeHandle(ref, () => ({
    reload: () => {
      fetchFollowedUsers();
      fetchDailyLocations();
    }
  }));

  // Calculate category counts when locations change
  useEffect(() => {
    const counts: Record<AllowedCategory, number> = {
      restaurant: 0,
      bar: 0,
      cafe: 0,
      bakery: 0,
      hotel: 0,
      museum: 0,
      entertainment: 0,
      park: 0,
      historical: 0,
      nightclub: 0
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
    setCurrentPhotoIndex(0);
  }, [selectedCategory]);

  // Reset photo index when location changes
  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [currentIndex]);

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

      if (!followsData || followsData.length === 0) {
        setFollowedUsers([]);
        return;
      }

      const followingIds = followsData.map(f => f.following_id);

      // Get my saved place_ids in parallel with profiles
      const [mySavedPlacesResult, usersWithSavesResult] = await Promise.all([
        supabase
          .from('saved_places')
          .select('place_id')
          .eq('user_id', user.id),
        supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', followingIds)
      ]);

      const mySavedPlaceIds = new Set((mySavedPlacesResult.data || []).map(s => s.place_id));

      if (!usersWithSavesResult.data) {
        setFollowedUsers([]);
        return;
      }

      // Get all their saves in a single batch query
      const { data: allTheirSaves } = await supabase
        .from('saved_places')
        .select('user_id, place_id')
        .in('user_id', followingIds);

      // Group saves by user_id
      const savesByUser = new Map<string, string[]>();
      (allTheirSaves || []).forEach(save => {
        const saves = savesByUser.get(save.user_id) || [];
        saves.push(save.place_id);
        savesByUser.set(save.user_id, saves);
      });

      // Count NEW saves for each user
      const usersWithCounts = usersWithSavesResult.data.map(profile => {
        const theirPlaces = savesByUser.get(profile.id) || [];
        const newPlacesCount = theirPlaces.filter(
          placeId => !mySavedPlaceIds.has(placeId)
        ).length;

        return {
          id: profile.id,
          username: profile.username || 'User',
          avatar_url: profile.avatar_url || '',
          new_saves_count: newPlacesCount
        };
      });

      // Only show users with NEW places - filter BEFORE setting state
      const usersWithNewPlaces = usersWithCounts.filter(u => u.new_saves_count > 0);
      
      setFollowedUsers(usersWithNewPlaces);
    } catch (error) {
      console.error('❌ Error fetching followed users:', error);
      setFollowedUsers([]);
    }
  };

  const fetchDailyLocations = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Parallel queries for better performance
      const [swipedData, mySavedLocations, friendsSaves] = await Promise.all([
        supabase.from('location_swipes').select('location_id').eq('user_id', user.id),
        supabase.from('user_saved_locations').select('location_id').eq('user_id', user.id),
        supabase.rpc('get_following_saved_places', { limit_count: 50 })
      ]);

      const swipedLocationIds = new Set((swipedData.data || []).map((s) => s.location_id));
      const mySavedLocationIds = new Set((mySavedLocations.data || []).map((s) => s.location_id) as string[]);

      // Get internal locations from user_saved_locations for followed users
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = (followsData || []).map(f => f.following_id);
      
      // If no follows, show empty state but don't return early
      if (followingIds.length === 0) {
        setFollowedUsers([]);
        setLocations([]);
        setCurrentIndex(0);
        setLoading(false);
        return;
      }


      // Get saved locations from followed users (without auto-join since FK not defined)
      const { data: savedLocationsData } = await supabase
        .from('user_saved_locations')
        .select('location_id, user_id, created_at')
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(100);

      const savedLocations = savedLocationsData || [];
      
      if (savedLocations.length === 0) {
        setFollowedUsers([]);
        setLocations([]);
        setCurrentIndex(0);
        setLoading(false);
        return;
      }

      // Get unique location IDs and user IDs
      const locationIds = [...new Set(savedLocations.map(s => s.location_id).filter(Boolean))] as string[];
      const userIds = [...new Set(savedLocations.map(s => s.user_id).filter(Boolean))] as string[];

      // Fetch locations and profiles in parallel
      const [locationsResult, profilesResult] = await Promise.all([
        supabase.from('locations').select('id, name, category, city, address, latitude, longitude, image_url, photos').in('id', locationIds),
        supabase.from('profiles').select('id, username, avatar_url').in('id', userIds)
      ]);

      // Build lookup maps
      const locationsMap = new Map((locationsResult.data || []).map(l => [l.id, l]));
      const profilesMap = new Map((profilesResult.data || []).map(p => [p.id, p]));

      // Combine into raw data format that the rest of the code expects
      const raw = savedLocations.map(s => ({
        location_id: s.location_id,
        user_id: s.user_id,
        created_at: s.created_at,
        locations: locationsMap.get(s.location_id as string) || null,
        profiles: profilesMap.get(s.user_id) || null
      }));

      // Build followed users list, excluding already processed and saved locations
      try {
        const sourceForCounts = raw.filter((r: any) => 
          r.location_id && 
          !processedPlaceIds.has(r.location_id) && 
          !mySavedLocationIds.has(r.location_id)
        );
        const usersMap = new Map<string, { id: string; username: string; avatar_url: string; new_saves_count: number }>();
        for (const r of sourceForCounts) {
          const uid = r.user_id;
          if (!uid) continue;
          const prev = usersMap.get(uid);
          if (prev) {
            prev.new_saves_count += 1;
          } else {
            usersMap.set(uid, {
              id: uid,
              username: r.profiles?.username || 'User',
              avatar_url: r.profiles?.avatar_url || '',
              new_saves_count: 1,
            });
          }
        }
        const list = Array.from(usersMap.values())
          .filter(u => u.new_saves_count > 0)
          .sort((a, b) => b.new_saves_count - a.new_saves_count);
        setFollowedUsers(list);
      } catch (e) {
        console.warn('Could not build followed users from saves feed', e);
      }

      // Map internal locations, aggregating all savers
      const byLocationId = new Map<string, SwipeLocation & { saved_by_users: NonNullable<SwipeLocation['saved_by_users']> }>();
      for (const s of raw) {
        const loc = s.locations;
        if (!loc?.id) continue;

        const locationId = loc.id;
        if (processedPlaceIds.has(locationId) || mySavedLocationIds.has(locationId)) continue;

        const latNum = Number(loc.latitude ?? 0);
        const lngNum = Number(loc.longitude ?? 0);

        const saver = { 
          id: s.profiles?.id || s.user_id || '', 
          username: s.profiles?.username || 'User', 
          avatar_url: s.profiles?.avatar_url || '' 
        };

        const existing = byLocationId.get(locationId);
        if (existing) {
          if (!existing.saved_by_users.find(u => u.id === saver.id)) {
            existing.saved_by_users.push(saver);
          }
        } else {
          // Extract photos from JSON field
          const photosData = loc.photos;
          let photosArray: string[] = [];
          if (Array.isArray(photosData)) {
            photosArray = photosData.slice(0, 6).map((p: any) => 
              typeof p === 'string' ? p : (p?.url || p?.photo_url || '')
            ).filter(Boolean);
          }

          byLocationId.set(locationId, {
            id: locationId,
            name: loc.name || 'Unknown Place',
            category: loc.category || 'place',
            city: loc.city || null,
            address: loc.address || null,
            image_url: loc.image_url || undefined,
            photos: photosArray,
            coordinates: { lat: latNum, lng: lngNum },
            saved_by: saver,
            saved_by_users: [saver],
          });
        }
      }

      // Convert to array and apply optional selected user filter
      let candidates: SwipeLocation[] = Array.from(byLocationId.values());
      if (selectedUserId) {
        candidates = candidates.filter(c => c.saved_by_users?.some(u => u.id === selectedUserId));
      }

      // Filter out already saved/swiped and invalid
      const filtered = candidates.filter((c) =>
        c.id &&
        !mySavedLocationIds.has(c.id) &&
        !swipedLocationIds.has(c.id) &&
        c.name !== 'Unknown Place'
      );

      console.log('✅ Filtered to', filtered.length, 'valid locations');

      if (filtered.length === 0) {
        console.log('⚠️ No new locations to show after filtering');
        console.log('📊 Status: mySavedLocationIds:', mySavedLocationIds.size, 'swipedLocationIds:', swipedLocationIds.size);
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
      const locationId = location.id;

      // Record swipe
      await supabase.from('location_swipes').insert({
        user_id: user.id,
        location_id: locationId,
        swiped_right: direction === 'right'
      });

      if (direction === 'right') {
        // Save to user_saved_locations
        const { error: saveError } = await supabase
          .from('user_saved_locations')
          .insert({
            user_id: user.id,
            location_id: locationId,
          });

        if (saveError) {
          console.error('Error saving location:', saveError);
          toast.error('Failed to save location');
          setSwipeDirection(null);
          return;
        }

        toast.success(`${location.name} saved!`);
      }

      // Remove swiped location from list and update counts
      setTimeout(() => {
        setSwipeDirection(null);
        setTouchOffset({ x: 0, y: 0 });

        // Mark this location as processed
        setProcessedPlaceIds((prev) => {
          const next = new Set(prev);
          if (location.id) next.add(location.id);
          return next;
        });
        
        // Update follower counts
        if (location.saved_by_users && location.saved_by_users.length > 0) {
          setFollowedUsers(prev => prev.map(u => (
            location.saved_by_users!.some(saver => saver.id === u.id)
              ? { ...u, new_saves_count: Math.max(0, (u.new_saves_count || 0) - 1) }
              : u
          )));
        }
        
        // Remove the current location from the list
        setLocations(prev => prev.filter((_, idx) => idx !== currentIndex));
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
    const verticalThreshold = 60; // Reduced for easier swipe up
    
    // Swipe UP - open details (prioritize if vertical movement is dominant)
    if (touchOffset.y < -verticalThreshold && Math.abs(touchOffset.y) > Math.abs(touchOffset.x) * 1.5) {
      if (currentLocation) {
        setDetailLocation(currentLocation);
      }
      setTouchOffset({ x: 0, y: 0 });
      setTouchStart(null);
      return;
    }
    
    // Horizontal swipe - like/dislike
    if (Math.abs(touchOffset.x) > swipeThreshold && Math.abs(touchOffset.x) > Math.abs(touchOffset.y)) {
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

  // Handle tap for photo navigation
  const handleCardTap = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't navigate photos if we're in a swipe gesture
    if (Math.abs(touchOffset.x) > 10 || Math.abs(touchOffset.y) > 10) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const tapX = e.clientX - rect.left;
    const cardWidth = rect.width;
    
    const photos = currentLocation?.photos || [];
    
    if (photos.length <= 1) {
      // No photos to navigate, open details instead
      if (currentLocation) {
        setDetailLocation(currentLocation);
      }
      return;
    }
    
    if (tapX > cardWidth * 0.5) {
      // Tap right - next photo
      if (currentPhotoIndex < photos.length - 1) {
        setCurrentPhotoIndex(prev => prev + 1);
      }
    } else {
      // Tap left - previous photo
      if (currentPhotoIndex > 0) {
        setCurrentPhotoIndex(prev => prev - 1);
      }
    }
  };

  // Filter locations by selected category
  const filteredLocations = selectedCategory
    ? locations.filter(loc => loc.category === selectedCategory)
    : locations;

  // Dynamic remaining counts per user based on filtered, swipeable locations
  const remainingCounts = useMemo(() => {
    const map = new Map<string, number>();
    filteredLocations.forEach((loc) => {
      const savers = (loc.saved_by_users && loc.saved_by_users.length > 0)
        ? loc.saved_by_users
        : (loc.saved_by ? [loc.saved_by] : []);
      savers.forEach((s) => {
        if (!s?.id) return;
        map.set(s.id, (map.get(s.id) || 0) + 1);
      });
    });
    return map;
  }, [filteredLocations]);

  const currentLocation = filteredLocations[currentIndex];

  return (
    <div className="fixed inset-0 w-full bg-background z-50 flex flex-col overflow-hidden safe-area-pt">
      {/* Header with back button - compact for more space */}
      <div className="bg-transparent px-4 py-2.5 flex items-center gap-3 relative z-10 safe-area-pt">
        <button
          onClick={() => navigate('/explore')}
          className="p-2 hover:bg-muted rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-semibold text-foreground">{t('discoverPlaces')}</h1>
      </div>

      {/* Followed Users Row - only show if there are locations to swipe */}
      {followedUsers.length > 0 && filteredLocations.length > 0 && (
        <div className="bg-background px-4 pt-2 pb-3 overflow-visible relative z-30">
          <div className="flex gap-3 overflow-x-auto overflow-y-visible scrollbar-hide pb-1 pt-1 pl-2 pr-3" style={{ scrollSnapType: 'x mandatory' }}>
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
            <div className={`relative z-[90] w-14 h-14 rounded-full flex items-center justify-center transition-all bg-muted overflow-hidden ${
              selectedUserId === null ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}>
              <img src={noUsersCharacter} alt="All" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{t('all', { ns: 'common' })}</span>
          </button>

          {followedUsers.map((followedUser) => {
            const remaining = remainingCounts.get(followedUser.id) ?? 0;
            return (
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
                  {remaining > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow-md z-[100]">
                      {remaining > 9 ? '9+' : remaining}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium text-foreground max-w-[60px] truncate">
                  {followedUser.username}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )}

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
          <div className="h-full flex flex-col pb-safe">
            {/* Keep filters visible even when no cards */}
            <div className="px-4 py-3">
              <SwipeCategoryFilter
                selected={selectedCategory}
                onSelect={(cat) => {
                  setSelectedCategory(cat);
                  setCurrentIndex(0);
                }}
                counts={categoryCounts}
              />
            </div>
            
            {/* Empty state */}
            <div className="flex-1 flex items-center justify-center p-8 text-center pb-24">
              <div className="space-y-6 max-w-sm mx-auto">
                <div className="flex items-center justify-center">
                  <img src={discoverMascot} alt="No places" className="w-32 h-32 object-contain" />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-foreground">{t('noPlacesToDiscover')}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedCategory 
                      ? t('noPlacesInCategory', { category: selectedCategory })
                      : t('followMorePeople')
                    }
                  </p>
                </div>
                
                <div className="flex flex-col items-stretch gap-3 pt-4">
                  {selectedCategory && (
                    <Button 
                      onClick={() => setSelectedCategory(null)} 
                      className="rounded-full h-12 text-base font-semibold"
                      size="lg"
                    >
                      {t('showAllCategories', { ns: 'common' })}
                    </Button>
                  )}
                  <Button 
                    onClick={() => navigate('/explore', { state: { searchMode: 'users' } })} 
                    variant={selectedCategory ? "outline" : "default"}
                    className="rounded-full h-12 text-base font-semibold"
                    size="lg"
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    {t('findPeopleToFollow')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-start justify-center px-3 pt-3 pb-24 safe-area-pb">
            {/* Swipeable Card */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleCardTap}
              className="w-full max-w-[480px] mx-auto transition-transform duration-300 cursor-pointer"
              style={{
                transform: swipeDirection 
                  ? swipeDirection === 'left' 
                    ? 'translateX(-120%) rotate(-10deg)' 
                    : 'translateX(120%) rotate(10deg)'
                  : `translateX(${touchOffset.x}px) rotate(${touchOffset.x * 0.03}deg)`,
                opacity: swipeDirection ? 0 : 1 - Math.abs(touchOffset.x) / 600
              }}
            >
              <div className="relative w-full aspect-[2/2.5] rounded-2xl overflow-hidden shadow-xl bg-card border border-border">
                {/* Photo Background */}
                <div className="absolute inset-0">
                  {(() => {
                    const photos = currentLocation.photos || [];
                    const currentPhoto = photos[currentPhotoIndex];
                    
                    if (currentPhoto) {
                      return (
                        <img
                          src={currentPhoto}
                          alt={`${currentLocation.name} - ${currentPhotoIndex + 1}`}
                          className="w-full h-full object-cover transition-opacity duration-200"
                        />
                      );
                    } else if (currentLocation.image_url) {
                      return (
                        <img
                          src={currentLocation.image_url}
                          alt={currentLocation.name}
                          className="w-full h-full object-cover"
                        />
                      );
                    } else {
                      return (
                        <div className="w-full h-full bg-gradient-to-br from-primary/80 via-primary/60 to-primary/40 flex items-center justify-center">
                          <CategoryIcon category={currentLocation.category} className="w-32 h-32 opacity-40 text-primary-foreground" />
                        </div>
                      );
                    }
                  })()}
                  
                  {/* Gradient overlays for readability */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
                </div>

                {/* Top Header - Avatar + Location Info */}
                <div className="absolute top-0 left-0 right-0 z-20 p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {(currentLocation.saved_by_users && currentLocation.saved_by_users.length > 0) ? (
                      <div className="flex -space-x-2 flex-shrink-0">
                        {currentLocation.saved_by_users.slice(0, 3).map(u => (
                          u.avatar_url ? (
                            <img
                              key={u.id}
                              src={u.avatar_url}
                              alt={u.username}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-white/40 shadow-lg bg-muted"
                            />
                          ) : (
                            <div 
                              key={u.id}
                              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center ring-2 ring-white/40 shadow-lg"
                            >
                              <span className="text-primary-foreground text-sm font-bold">
                                {u.username[0]?.toUpperCase()}
                              </span>
                            </div>
                          )
                        ))}
                        {currentLocation.saved_by_users.length > 3 && (
                          <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center ring-2 ring-white/40 shadow-lg">
                            <span className="text-white text-xs font-bold">+{currentLocation.saved_by_users.length - 3}</span>
                          </div>
                        )}
                      </div>
                    ) : currentLocation.saved_by ? (
                      currentLocation.saved_by.avatar_url ? (
                        <img 
                          src={currentLocation.saved_by.avatar_url} 
                          alt={currentLocation.saved_by.username}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-white/40 shadow-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center ring-2 ring-white/40 shadow-lg flex-shrink-0">
                          <span className="text-primary-foreground text-sm font-bold">
                            {currentLocation.saved_by.username[0]?.toUpperCase()}
                          </span>
                        </div>
                      )
                    ) : null}
                    
                    {/* Location Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-white truncate drop-shadow-lg">
                        {currentLocation.name}
                      </h3>
                      <div className="flex items-center gap-2 text-white/90 text-sm mt-0.5">
                        <span className="truncate">
                          {currentLocation.city || currentLocation.address?.split(',')[0] || 'Unknown'}
                        </span>
                        <span className="text-white/60">•</span>
                        <span className="flex items-center gap-1">
                          <CategoryIcon category={currentLocation.category} className="w-3.5 h-3.5" />
                          {t(`categories:${currentLocation.category.toLowerCase()}`)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Photo Indicators (dots) */}
                  {(currentLocation.photos?.length || 0) > 1 && (
                    <div className="flex justify-center gap-1.5 mt-3">
                      {currentLocation.photos?.map((_, i) => (
                        <div 
                          key={i}
                          className={`h-1 rounded-full transition-all duration-200 ${
                            i === currentPhotoIndex 
                              ? 'bg-white w-6' 
                              : 'bg-white/40 w-1.5'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Swipe Up Hint - shows when swiping up */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-150"
                  style={{ 
                    opacity: touchOffset.y < -20 ? Math.min(1, Math.abs(touchOffset.y + 20) / 40) : 0,
                    transform: `translate(-50%, -50%) scale(${touchOffset.y < -20 ? Math.min(1.1, 1 + Math.abs(touchOffset.y + 20) / 200) : 1})`
                  }}
                >
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-xl flex items-center gap-2">
                    <ChevronUp className="w-5 h-5 text-primary animate-bounce" />
                    <span className="text-sm font-semibold text-foreground">{t('viewDetails', { defaultValue: 'View Details' })}</span>
                  </div>
                </div>

                {/* Bottom - Action Buttons */}
                <div className="absolute bottom-0 left-0 right-0 p-4 pb-6">
                  {/* Info button - bottom left, smaller */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDetailLocation(currentLocation); }}
                    className="absolute left-4 bottom-6 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm shadow-md hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                    aria-label="View details"
                  >
                    <Info className="w-4 h-4 text-foreground" />
                  </button>
                  
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSwipe('left'); }}
                      disabled={swipeDirection !== null}
                      className="w-18 h-18 rounded-full hover:scale-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                      aria-label="Pass"
                    >
                      <img src={swipeNo} alt="Pass" className="w-16 h-16 object-contain drop-shadow-lg" />
                    </button>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSwipe('right'); }}
                      disabled={swipeDirection !== null}
                      className="w-18 h-18 rounded-full hover:scale-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                      aria-label="Save"
                    >
                      <img src={swipePin} alt="Save" className="w-16 h-16 object-contain drop-shadow-lg" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location Detail Drawer */}
      <LocationDetailDrawer
        location={detailLocation}
        isOpen={!!detailLocation}
        onClose={() => setDetailLocation(null)}
      />
    </div>
  );
});

SwipeDiscovery.displayName = 'SwipeDiscovery';

export default SwipeDiscovery;
