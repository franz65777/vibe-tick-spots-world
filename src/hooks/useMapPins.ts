
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { locationInteractionService } from '@/services/locationInteractionService';
import { backendService } from '@/services/backendService';
import { supabase } from '@/integrations/supabase/client';

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

  const fetchPins = async (cityFilter?: string) => {
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

        // Get saved locations from followed users
        const { data: savedLocations, error: savedError } = await supabase
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
          .in('user_id', followedUserIds);

        if (savedError) {
          console.error('❌ Following saved locations error:', savedError);
          setPins([]);
          setLoading(false);
          return;
        }

        console.log('✅ Saved locations from followed users:', savedLocations?.length || 0);

        if (!savedLocations || savedLocations.length === 0) {
          setHasFollowedUsers(true);
          setPins([]);
          setLoading(false);
          return;
        }

        // Get user profiles for attribution
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', followedUserIds);

        const profileMap = new Map();
        profiles?.forEach(profile => {
          profileMap.set(profile.id, profile);
        });

        // Transform saved locations into MapPin format, deduplicate by google_place_id or id
        const locationMap = new Map();
        
        savedLocations.forEach(saved => {
          const location = saved.locations as any;
          const locationKey = location.google_place_id || location.id;
          const userProfile = profileMap.get(saved.user_id);
          
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
              city: location.address?.split(',')[1]?.trim() || 'Unknown',
              isNew: false,
              image: undefined,
              friendsWhoSaved: [],
              visitors: [],
              distance: Math.random() * 10,
              totalSaves: 0,
              address: location.address || '',
              google_place_id: location.google_place_id
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
        // Internal saved locations
        const { data: savedLocations, error: uslError } = await supabase
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
          .eq('user_id', user.id);

        if (uslError) {
          console.error('Error fetching saved locations:', uslError);
          throw uslError;
        }

        // Google saved places
        const { data: savedPlaces, error: spError } = await supabase
          .from('saved_places')
          .select('place_id, place_name, place_category, city, coordinates, created_at')
          .eq('user_id', user.id);

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
              city: location.address?.split(',')[1]?.trim() || 'Unknown',
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
  };

  useEffect(() => {
    fetchPins();
    
    // Set up realtime subscription for new saves to refresh pins
    if (!user) return;
    
    const channel = supabase
      .channel('map-pins-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_places' }, () => {
        console.log('🔄 Saved places changed, refreshing pins...');
        fetchPins();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_saved_locations' }, () => {
        console.log('🔄 User saved locations changed, refreshing pins...');
        fetchPins();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, filter]);

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
