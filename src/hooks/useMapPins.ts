import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { backendService } from '@/services/backendService';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeEvent } from '@/hooks/useCentralizedRealtime';

interface MapPin {
  id: string;
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  likes: number;
  isFollowing?: boolean;
  addedBy?: string;
  addedDate?: string;
  popularity?: number;
  city?: string;
  isNew?: boolean;
  image?: string;
  friendsWhoSaved?: { name: string; avatar: string }[] | number;
  visitors?: string[];
  distance?: string | number;
  totalSaves?: number;
  hasPost?: boolean;
  postCount?: number;
  address?: string;
  // For friend pins and activity display
  savedByUser?: {
    id: string;
    username: string;
    avatar_url: string | null;
    action: 'saved' | 'liked' | 'faved' | 'posted';
  };
  latestActivity?: {
    type: 'review' | 'photo';
    snippet?: string;
    created_at: string;
  };
}

interface UseMapPinsReturn {
  pins: MapPin[];
  loading: boolean;
  error: string | null;
  refreshPins: (city?: string) => void;
  hasFollowedUsers: boolean;
}

export const useMapPins = (filter: 'following' | 'popular' | 'saved' = 'popular') => {
  const { user } = useAuth();
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFollowedUsers, setHasFollowedUsers] = useState(false);

  const fetchPins = useCallback(async (cityFilter?: string) => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let fetchedPins: MapPin[] = [];

      if (filter === 'following') {
        console.log('🔍 Fetching following locations...');
        
        // First get users that the current user follows
        const { data: followedUsers, error: followError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followError || !followedUsers || followedUsers.length === 0) {
          console.log('❌ No followed users found');
          setHasFollowedUsers(false);
          setPins([]);
          setLoading(false);
          return;
        }

        const followedUserIds = followedUsers.map(f => f.following_id);
        console.log('✅ Following user IDs:', followedUserIds);

        // PARALLEL fetch: saved locations, Google places, and profiles simultaneously
        const [savedLocationsRes, savedPlacesRes, profilesRes] = await Promise.all([
          supabase
            .from('user_saved_locations')
            .select(`
              location_id,
              user_id,
              created_at,
              locations!inner(
                id,
                name,
                address,
                latitude,
                longitude,
                category,
                google_place_id
              )
            `)
            .in('user_id', followedUserIds),
          supabase
            .from('saved_places')
            .select('place_id, place_name, place_category, city, coordinates, user_id, created_at')
            .in('user_id', followedUserIds),
          supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', followedUserIds)
        ]);

        const savedLocations = savedLocationsRes.data;
        const savedError = savedLocationsRes.error;
        const savedPlaces = savedPlacesRes.data;
        const spError = savedPlacesRes.error;
        const profiles = profilesRes.data;

        if (savedError) {
          console.error('❌ Following saved locations error:', savedError);
        }
        if (spError) {
          console.error('❌ Following saved Google places error:', spError);
        }

        console.log('✅ Saved locations from followed users:', savedLocations?.length || 0, ' • Google places:', savedPlaces?.length || 0);

        if ((!savedLocations || savedLocations.length === 0) && (!savedPlaces || savedPlaces.length === 0)) {
          setHasFollowedUsers(true);
          setPins([]);
          setLoading(false);
          return;
        }

        const profileMap = new Map();
        profiles?.forEach(profile => {
          profileMap.set(profile.id, profile);
        });

        // Collect all location IDs and google place IDs for activity lookup
        const internalLocationIds = (savedLocations || []).map(s => (s.locations as any)?.id).filter(Boolean);

        // Fetch latest activity (posts) from followed users for these locations
        let activityMap = new Map<string, { type: 'review' | 'photo'; snippet?: string; created_at: string; user_id: string }>();
        
        if (internalLocationIds.length > 0) {
          // Query posts for internal locations (posts only have location_id, not google_place_id)
          const { data: friendPosts } = await supabase
            .from('posts')
            .select('location_id, user_id, caption, rating, media_urls, created_at')
            .in('user_id', followedUserIds)
            .in('location_id', internalLocationIds)
            .order('created_at', { ascending: false })
            .limit(200);

          // Group by location, take the most recent
          friendPosts?.forEach(post => {
            const key = post.location_id;
            if (key && !activityMap.has(key)) {
              activityMap.set(key, {
                type: (post.rating && post.rating > 0) ? 'review' : 'photo',
                snippet: post.caption?.slice(0, 40) + (post.caption && post.caption.length > 40 ? '...' : ''),
                created_at: post.created_at,
                user_id: post.user_id
              });
            }
          });
        }

        // Transform saved locations into MapPin format, deduplicate by google_place_id or id
        const locationMap = new Map();
        
        (savedLocations || []).forEach(saved => {
          const location = saved.locations as any;
          const locationKey = location.google_place_id || location.id;
          const userProfile = profileMap.get(saved.user_id);
          const activity = activityMap.get(locationKey);
          
          // Determine user action based on activity
          let userAction: 'saved' | 'liked' | 'faved' | 'posted' = 'saved';
          if (activity && activity.user_id === saved.user_id) {
            userAction = activity.type === 'review' ? 'faved' : 'posted';
          }
          
          if (!locationMap.has(locationKey)) {
            locationMap.set(locationKey, {
              id: location.id,
              name: location.name,
              category: location.category,
              coordinates: { 
                lat: parseFloat(location.latitude?.toString() || '0'), 
                lng: parseFloat(location.longitude?.toString() || '0') 
              },
              likes: 0,
              isFollowing: true,
              addedBy: userProfile?.full_name || userProfile?.username || 'Someone',
              addedDate: new Date(saved.created_at).toLocaleDateString(),
              popularity: 75,
              city: 'Unknown',
              isNew: false,
              image: undefined,
              friendsWhoSaved: [],
              visitors: [],
              distance: Math.random() * 10,
              totalSaves: 0,
              address: location.address || '',
              google_place_id: location.google_place_id,
              // New: friend activity data
              savedByUser: userProfile ? {
                id: userProfile.id,
                username: userProfile.username || 'user',
                avatar_url: userProfile.avatar_url,
                action: userAction
              } : undefined,
              latestActivity: activity ? {
                type: activity.type,
                snippet: activity.snippet,
                created_at: activity.created_at
              } : undefined
            });
          }
        });

        // Add saved Google places from followed users
        (savedPlaces || []).forEach(sp => {
          const coords = (sp.coordinates as any) || {};
          const key = sp.place_id;
          const userProfile = profileMap.get(sp.user_id);
          const activity = activityMap.get(key);
          
          // Determine user action based on activity
          let userAction: 'saved' | 'liked' | 'faved' | 'posted' = 'saved';
          if (activity && activity.user_id === sp.user_id) {
            userAction = activity.type === 'review' ? 'faved' : 'posted';
          }
          
          if (!locationMap.has(key)) {
            locationMap.set(key, {
              id: sp.place_id,
              name: sp.place_name,
              category: sp.place_category || 'Unknown',
              coordinates: { 
                lat: parseFloat((coords.lat ?? 0).toString()), 
                lng: parseFloat((coords.lng ?? 0).toString()) 
              },
              likes: 0,
              isFollowing: true,
              addedBy: userProfile?.full_name || userProfile?.username || 'Someone',
              addedDate: new Date(sp.created_at).toLocaleDateString(),
              popularity: 75,
              city: sp.city || 'Unknown',
              isNew: false,
              image: undefined,
              friendsWhoSaved: [],
              visitors: [],
              distance: Math.random() * 10,
              totalSaves: 0,
              address: '',
              google_place_id: sp.place_id,
              // New: friend activity data
              savedByUser: userProfile ? {
                id: userProfile.id,
                username: userProfile.username || 'user',
                avatar_url: userProfile.avatar_url,
                action: userAction
              } : undefined,
              latestActivity: activity ? {
                type: activity.type,
                snippet: activity.snippet,
                created_at: activity.created_at
              } : undefined
            });
          }
        });

        fetchedPins = Array.from(locationMap.values());
        console.log('✅ Final following pins:', fetchedPins.length);
        setHasFollowedUsers(followedUsers.length > 0);
        } else if (filter === 'popular') {
        console.log('🔍 Fetching popular locations...');
        const popularLocations = await backendService.getPopularLocations(cityFilter);
        console.log('✅ Popular locations fetched:', popularLocations.length);
        
        // Add demo coordinates for locations without lat/lng
        const demoCoordinates = [
          { lat: 37.7749, lng: -122.4194 }, // San Francisco
          { lat: 37.7849, lng: -122.4094 }, 
          { lat: 37.7649, lng: -122.4294 }, 
          { lat: 37.7549, lng: -122.4394 }, 
          { lat: 37.7949, lng: -122.4094 }, 
          { lat: 53.3498, lng: -6.2603 }, // Dublin
          { lat: 53.3598, lng: -6.2503 }, 
          { lat: 53.3398, lng: -6.2703 }, 
          { lat: 40.7128, lng: -74.0060 }, // New York
          { lat: 40.7228, lng: -74.0160 }
        ];
        
        fetchedPins = popularLocations.map((location, index) => {
          // Use actual coordinates if available, otherwise use demo coordinates
          const hasCoordinates = location.latitude && location.longitude;
          const coordinates = hasCoordinates 
            ? { 
                lat: parseFloat(location.latitude.toString()), 
                lng: parseFloat(location.longitude.toString()) 
              }
            : demoCoordinates[index % demoCoordinates.length];
            
          return {
            id: location.id,
            name: location.name,
            category: location.category,
            coordinates,
            likes: Math.floor(Math.random() * 50) + 10,
            isFollowing: false,
            addedBy: 'Explorer',
            addedDate: new Date(location.created_at).toLocaleDateString(),
            popularity: Math.floor(Math.random() * 30) + 70,
            city: location.city || 'Unknown',
            isNew: Math.random() > 0.7,
            image: undefined,
            friendsWhoSaved: [],
            visitors: Array.from({ length: Math.floor(Math.random() * 20) + 5 }, (_, i) => `visitor_${i}`),
            distance: Math.random() * 15,
            totalSaves: Math.floor(Math.random() * 25) + 5,
            address: location.address || '',
            google_place_id: location.google_place_id
          };
        });
      } else if (filter === 'saved') {
        console.log('🔍 Fetching saved locations...');
        
        // PARALLEL fetch: internal saved locations and Google saved places
        const [savedLocationsRes, savedPlacesRes] = await Promise.all([
          supabase
            .from('user_saved_locations')
            .select(`
              location_id,
              created_at,
              locations!inner (
                id,
                name,
                category,
                address,
                latitude,
                longitude,
                google_place_id
              )
            `)
            .eq('user_id', user.id),
          supabase
            .from('saved_places')
            .select('place_id, place_name, place_category, city, coordinates, created_at')
            .eq('user_id', user.id)
        ]);

        const savedLocations = savedLocationsRes.data;
        const uslError = savedLocationsRes.error;
        const savedPlaces = savedPlacesRes.data;
        const spError = savedPlacesRes.error;

        if (uslError) {
          console.error('Error fetching saved locations:', uslError);
          throw uslError;
        }
        if (spError) {
          console.error('Error fetching saved places:', spError);
          throw spError;
        }

        // Deduplicate by google_place_id/place_id first, then fallback to internal id
        const locationMap = new Map<string, any>();

        (savedLocations || []).forEach(item => {
          const location = item.locations as any;
          const key = location.google_place_id || location.id;
          if (!locationMap.has(key)) {
            locationMap.set(key, {
              id: location.id,
              name: location.name,
              category: location.category,
              coordinates: { 
                lat: parseFloat(location.latitude?.toString() || '0'), 
                lng: parseFloat(location.longitude?.toString() || '0') 
              },
              likes: 0,
              isFollowing: false,
              addedBy: 'You',
              addedDate: new Date(item.created_at).toLocaleDateString(),
              popularity: 75,
              city: 'Unknown',
              isNew: false,
              image: undefined,
              friendsWhoSaved: [],
              visitors: [],
              distance: Math.random() * 10,
              totalSaves: 1,
              address: location.address || '',
              google_place_id: location.google_place_id
            });
          }
        });

        (savedPlaces || []).forEach(sp => {
          const coords = (sp.coordinates as any) || {};
          const key = sp.place_id;
          if (!locationMap.has(key)) {
            locationMap.set(key, {
              id: sp.place_id,
              name: sp.place_name,
              category: sp.place_category || 'Unknown',
              coordinates: { 
                lat: parseFloat((coords.lat ?? 0).toString()), 
                lng: parseFloat((coords.lng ?? 0).toString()) 
              },
              likes: 0,
              isFollowing: false,
              addedBy: 'You',
              addedDate: new Date(sp.created_at).toLocaleDateString(),
              popularity: 75,
              city: sp.city || 'Unknown',
              isNew: false,
              image: undefined,
              friendsWhoSaved: [],
              visitors: [],
              distance: Math.random() * 10,
              totalSaves: 1,
              address: '',
              google_place_id: sp.place_id
            });
          }
        });

        fetchedPins = Array.from(locationMap.values());

        console.log('✅ Saved locations (combined):', fetchedPins.length);
      }

      setPins(fetchedPins);
    } catch (err: any) {
      console.error('Error fetching pins:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  // Use centralized realtime for save updates - NO individual channel!
  useRealtimeEvent(['saved_place_insert', 'saved_place_delete', 'saved_location_insert', 'saved_location_delete'], useCallback(() => {
    console.log('🔄 Saved location changed via centralized realtime, refreshing pins...');
    fetchPins();
  }, [fetchPins]));

  const refreshPins = (cityFilter?: string) => {
    fetchPins(cityFilter);
  };

  return {
    pins,
    loading,
    error,
    refreshPins,
    hasFollowedUsers
  };
};