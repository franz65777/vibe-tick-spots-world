import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  getFollowingPins: (city?: string) => Promise<MapPin[]>;
  getPopularPins: (city?: string) => Promise<MapPin[]>;
  hasFollowedUsers: boolean;
}

export const useMapPins = (activeFilter: 'following' | 'popular' | 'new' = 'following'): UseMapPinsReturn => {
  const { user } = useAuth();
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFollowedUsers, setHasFollowedUsers] = useState(false);

  // Demo data for fallback when backend has no data
  const getDemoPins = (filter: string, city?: string): MapPin[] => {
    const allDemoPins: Record<string, MapPin[]> = {
      'san francisco': [
        {
          id: '1',
          name: 'The Cozy Corner Café',
          category: 'cafe',
          coordinates: { lat: 37.7849, lng: -122.4094 },
          likes: 24,
          isFollowing: true,
          addedBy: 'user1',
          addedDate: '2024-05-25',
          popularity: 85,
          city: 'San Francisco',
          isNew: false,
          image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
          friendsWhoSaved: [
            { name: 'Alice', avatar: 'https://i.pravatar.cc/40?img=1' },
            { name: 'Bob', avatar: 'https://i.pravatar.cc/40?img=2' }
          ],
          visitors: ['user1', 'user2', 'user3'],
          distance: '0.5km',
          totalSaves: 24,
          hasPost: true,
          postCount: 3,
          address: '123 Main St, San Francisco, CA'
        },
        {
          id: '2',
          name: 'Sunset View Restaurant',
          category: 'restaurant',
          coordinates: { lat: 37.7849, lng: -122.4194 },
          likes: 18,
          isFollowing: true,
          addedBy: 'user2',
          addedDate: '2024-06-01',
          popularity: 92,
          city: 'San Francisco',
          isNew: true,
          image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
          friendsWhoSaved: 3,
          visitors: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10', 'user11', 'user12'],
          distance: '1.2km',
          totalSaves: 18,
          hasPost: true,
          postCount: 1,
          address: '456 Sunset Blvd, San Francisco, CA'
        },
        {
          id: '3',
          name: 'Grand Plaza Hotel',
          category: 'hotel',
          coordinates: { lat: 37.7749, lng: -122.4094 },
          likes: 45,
          isFollowing: false,
          addedBy: 'user5',
          addedDate: '2024-05-15',
          popularity: 96,
          city: 'San Francisco',
          isNew: false,
          image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
          friendsWhoSaved: 8,
          visitors: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10', 'user11', 'user12', 'user13', 'user14', 'user15', 'user16', 'user17', 'user18', 'user19', 'user20', 'user21', 'user22', 'user23', 'user24', 'user25'],
          distance: '2.1km',
          totalSaves: 45,
          hasPost: false,
          postCount: 0,
          address: '789 Market St, San Francisco, CA'
        }
      ],
      'milan': [
        {
          id: 'milan1',
          name: 'Café Milano',
          category: 'cafe',
          coordinates: { lat: 45.4642, lng: 9.1900 },
          likes: 32,
          isFollowing: true,
          addedBy: 'user1',
          addedDate: '2024-05-28',
          popularity: 88,
          city: 'Milan',
          isNew: false,
          image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
          friendsWhoSaved: 5,
          visitors: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10', 'user11', 'user12', 'user13', 'user14', 'user15', 'user16', 'user17', 'user18'],
          distance: '0.8km',
          totalSaves: 32,
          hasPost: true,
          postCount: 2,
          address: 'Via Brera 12, Milan, Italy'
        },
        {
          id: 'milan2',
          name: 'Duomo Restaurant',
          category: 'restaurant',
          coordinates: { lat: 45.4640, lng: 9.1896 },
          likes: 45,
          isFollowing: true,
          addedBy: 'user2',
          addedDate: '2024-05-20',
          popularity: 94,
          city: 'Milan',
          isNew: false,
          image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
          friendsWhoSaved: 7,
          visitors: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10', 'user11', 'user12', 'user13', 'user14', 'user15', 'user16', 'user17', 'user18', 'user19', 'user20', 'user21', 'user22'],
          distance: '1.5km',
          totalSaves: 45,
          hasPost: true,
          postCount: 1,
          address: 'Piazza del Duomo 21, Milan, Italy'
        },
        {
          id: 'milan3',
          name: 'Navigli Bar',
          category: 'bar',
          coordinates: { lat: 45.4583, lng: 9.1756 },
          likes: 28,
          isFollowing: true,
          addedBy: 'user3',
          addedDate: '2024-06-01',
          popularity: 82,
          city: 'Milan',
          isNew: true,
          image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop',
          friendsWhoSaved: 4,
          visitors: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10', 'user11', 'user12', 'user13', 'user14', 'user15'],
          distance: '2.3km',
          totalSaves: 28,
          hasPost: false,
          postCount: 0,
          address: 'Navigli District, Milan, Italy'
        }
      ],
      'paris': [
        {
          id: 'paris1',
          name: 'Café de Flore',
          category: 'cafe',
          coordinates: { lat: 48.8542, lng: 2.3320 },
          likes: 56,
          isFollowing: true,
          addedBy: 'user1',
          addedDate: '2024-05-15',
          popularity: 91,
          city: 'Paris',
          isNew: false,
          image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
          friendsWhoSaved: 9,
          visitors: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10', 'user11', 'user12', 'user13', 'user14', 'user15', 'user16', 'user17', 'user18', 'user19', 'user20', 'user21', 'user22', 'user23', 'user24', 'user25', 'user26', 'user27', 'user28', 'user29', 'user30', 'user31', 'user32', 'user33', 'user34'],
          distance: '0.3km',
          totalSaves: 56,
          hasPost: true,
          postCount: 4,
          address: '172 Boulevard Saint-Germain, Paris, France'
        },
        {
          id: 'paris2',
          name: 'Le Jules Verne',
          category: 'restaurant',
          coordinates: { lat: 48.8584, lng: 2.2945 },
          likes: 89,
          isFollowing: true,
          addedBy: 'user2',
          addedDate: '2024-05-30',
          popularity: 98,
          city: 'Paris',
          isNew: true,
          image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
          friendsWhoSaved: 15,
          visitors: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10', 'user11', 'user12', 'user13', 'user14', 'user15', 'user16', 'user17', 'user18', 'user19', 'user20', 'user21', 'user22', 'user23', 'user24', 'user25', 'user26', 'user27', 'user28', 'user29', 'user30', 'user31', 'user32', 'user33', 'user34', 'user35', 'user36', 'user37', 'user38', 'user39', 'user40', 'user41', 'user42', 'user43', 'user44', 'user45'],
          distance: '1.8km',
          totalSaves: 89,
          hasPost: true,
          postCount: 2,
          address: 'Avenue Gustave Eiffel, Paris, France'
        }
      ]
    };

    const cityKey = city?.toLowerCase() || 'san francisco';
    const cityPins = allDemoPins[cityKey] || allDemoPins['san francisco'];

    switch (filter) {
      case 'following':
        return cityPins.filter(pin => pin.isFollowing);
      case 'popular':
        return cityPins.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      case 'new':
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return cityPins.filter(pin => {
          const addedDate = new Date(pin.addedDate || '');
          return pin.isFollowing && addedDate >= oneWeekAgo;
        });
      default:
        return cityPins;
    }
  };

  const checkFollowedUsers = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    const config = backendService.getConfig();
    
    if (!config.enableRealDatabase) {
      return true; // Demo mode always has followed users
    }

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .limit(1);

      if (error) throw error;
      return (data && data.length > 0);
    } catch (error) {
      console.error('Error checking followed users:', error);
      return false;
    }
  }, [user?.id]);

  const getFollowingPins = useCallback(async (city?: string): Promise<MapPin[]> => {
    if (!user) return [];

    // Check if user has followed users first
    const hasFollowed = await checkFollowedUsers();
    setHasFollowedUsers(hasFollowed);
    
    if (!hasFollowed) {
      console.log('User has no followed users, returning empty array');
      return [];
    }

    const config = backendService.getConfig();
    
    if (!config.enableRealDatabase) {
      return getDemoPins('following', city);
    }

    try {
      // First get the list of followed user IDs
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followsError) throw followsError;
      if (!followsData || followsData.length === 0) return [];

      const followedUserIds = followsData.map(f => f.following_id);

      // Get locations with posts from followed users
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          location_id,
          locations!inner (
            id,
            name,
            category,
            latitude,
            longitude,
            address,
            created_by,
            created_at
          ),
          profiles!inner (
            id
          )
        `)
        .not('location_id', 'is', null)
        .in('profiles.id', followedUserIds);

      if (postsError) throw postsError;

      // Convert to MapPin format
      const locationMap = new Map<string, MapPin>();
      
      postsData?.forEach((post: any) => {
        const location = post.locations;
        if (!location || !location.latitude || !location.longitude) return;

        const locationId = location.id;
        if (locationMap.has(locationId)) {
          // Increment post count
          const existing = locationMap.get(locationId)!;
          existing.postCount = (existing.postCount || 0) + 1;
        } else {
          locationMap.set(locationId, {
            id: locationId,
            name: location.name,
            category: location.category,
            coordinates: { 
              lat: Number(location.latitude), 
              lng: Number(location.longitude) 
            },
            likes: 0,
            isFollowing: true,
            addedBy: location.created_by,
            addedDate: location.created_at,
            city: city,
            popularity: 50,
            isNew: false,
            visitors: [],
            friendsWhoSaved: [],
            distance: '0km',
            totalSaves: 0,
            hasPost: true,
            postCount: 1,
            address: location.address || ''
          });
        }
      });

      return Array.from(locationMap.values());
    } catch (error) {
      console.error('Error fetching following pins:', error);
      return getDemoPins('following', city);
    }
  }, [user, checkFollowedUsers]);

  const getPopularPins = useCallback(async (city?: string): Promise<MapPin[]> => {
    const config = backendService.getConfig();
    
    if (!config.enableRealDatabase) {
      return getDemoPins('popular', city);
    }

    try {
      // Get popular locations based on post count
      const { data, error } = await supabase
        .from('locations')
        .select(`
          id,
          name,
          category,
          latitude,
          longitude,
          address,
          created_by,
          created_at,
          posts (count)
        `)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('posts.count', { ascending: false })
        .limit(20);

      if (error) throw error;

      return data?.map((location: any) => ({
        id: location.id,
        name: location.name,
        category: location.category,
        coordinates: { 
          lat: Number(location.latitude), 
          lng: Number(location.longitude) 
        },
        likes: 0,
        isFollowing: false,
        addedBy: location.created_by,
        addedDate: location.created_at,
        city: city,
        popularity: 75,
        isNew: false,
        visitors: [],
        friendsWhoSaved: [],
        distance: '0km',
        totalSaves: 0,
        hasPost: location.posts.length > 0,
        postCount: location.posts.length,
        address: location.address || ''
      })) || [];
    } catch (error) {
      console.error('Error fetching popular pins:', error);
      return getDemoPins('popular', city);
    }
  }, []);

  const refreshPins = useCallback(async (city?: string) => {
    console.log('refreshPins called with filter:', activeFilter, 'city:', city);
    setLoading(true);
    setError(null);

    try {
      let newPins: MapPin[] = [];

      switch (activeFilter) {
        case 'following':
        case 'new':
          const hasFollowed = await checkFollowedUsers();
          setHasFollowedUsers(hasFollowed);
          
          if (!hasFollowed) {
            console.log(`User has no followed users, skipping ${activeFilter} pins fetch`);
            newPins = [];
          } else if (activeFilter === 'following') {
            newPins = await getFollowingPins(city);
          } else {
            // For new filter, get following pins and filter by date
            const followingPins = await getFollowingPins(city);
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            newPins = followingPins.filter(pin => {
              const addedDate = new Date(pin.addedDate || '');
              return addedDate >= oneWeekAgo;
            });
          }
          break;
        case 'popular':
          newPins = await getPopularPins(city);
          break;
        default:
          newPins = await getFollowingPins(city);
      }

      setPins(newPins);
      console.log(`Loaded ${newPins.length} ${activeFilter} pins for ${city}`);
    } catch (error) {
      console.error('Error refreshing pins:', error);
      setError('Failed to load pins');
      // Fallback to demo data on error
      setPins(getDemoPins(activeFilter, city));
    } finally {
      setLoading(false);
    }
  }, [activeFilter, checkFollowedUsers, getFollowingPins, getPopularPins]);

  // Only run when activeFilter or user changes
  useEffect(() => {
    if (user?.id) {
      refreshPins();
    }
  }, [activeFilter, user?.id]);

  return {
    pins,
    loading,
    error,
    refreshPins,
    getFollowingPins,
    getPopularPins,
    hasFollowedUsers
  };
};
