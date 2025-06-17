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
  friendsWhoSaved?: { name: string; avatar: string }[];
  visitors?: string[];
  isNew?: boolean;
  image?: string;
  isFollowing?: boolean;
  addedBy?: string;
  addedDate?: string;
  popularity?: number;
  city?: string;
  distance?: string;
  totalSaves?: number;
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

  // Demo data for different cities when backend is in demo mode
  const getDemoPins = (filter: string, city?: string): MapPin[] => {
    const allDemoPins: Record<string, MapPin[]> = {
      'san francisco': [
        {
          id: '1',
          name: 'The Cozy Corner Café',
          category: 'cafe',
          coordinates: { lat: 37.7849, lng: -122.4094 },
          likes: 24,
          friendsWhoSaved: [
            { name: 'Sarah', avatar: 'photo-1494790108755-2616b5a5c75b' },
            { name: 'Mike', avatar: 'photo-1507003211169-0a1dd7228f2d' }
          ],
          visitors: ['user1', 'user2', 'user3'],
          isNew: false,
          image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
          isFollowing: true,
          addedBy: 'user1',
          addedDate: '2024-05-25',
          popularity: 85,
          city: 'San Francisco',
          distance: '0.3km',
          totalSaves: 24
        },
        {
          id: '2',
          name: 'Sunset View Restaurant',
          category: 'restaurant',
          coordinates: { lat: 37.7849, lng: -122.4194 },
          likes: 18,
          friendsWhoSaved: [
            { name: 'Emma', avatar: 'photo-1438761681033-6461ffad8d80' }
          ],
          visitors: ['user4', 'user5'],
          isNew: true,
          image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=600&fit=crop',
          isFollowing: true,
          addedBy: 'user2',
          addedDate: '2024-06-01',
          popularity: 92,
          city: 'San Francisco',
          distance: '0.8km',
          totalSaves: 18
        },
        {
          id: '3',
          name: 'Grand Plaza Hotel',
          category: 'hotel',
          coordinates: { lat: 37.7749, lng: -122.4094 },
          likes: 45,
          friendsWhoSaved: [
            { name: 'Alex', avatar: 'photo-1472099645785-5658abf4ff4e' },
            { name: 'Sofia', avatar: 'photo-1534528741775-53994a69daeb' }
          ],
          visitors: ['user6', 'user7', 'user8'],
          isNew: false,
          image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
          isFollowing: false,
          addedBy: 'user5',
          addedDate: '2024-05-15',
          popularity: 96,
          city: 'San Francisco',
          distance: '1.2km',
          totalSaves: 45
        }
      ],
      'milan': [
        {
          id: 'milan1',
          name: 'Café Milano',
          category: 'cafe',
          coordinates: { lat: 45.4642, lng: 9.1900 },
          likes: 32,
          friendsWhoSaved: [
            { name: 'Sarah', avatar: 'photo-1494790108755-2616b5a5c75b' }
          ],
          visitors: ['user1', 'user2'],
          isNew: false,
          image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
          isFollowing: true,
          addedBy: 'user1',
          addedDate: '2024-05-28',
          popularity: 88,
          city: 'Milan',
          distance: '0.5km',
          totalSaves: 32
        },
        {
          id: 'milan2',
          name: 'Duomo Restaurant',
          category: 'restaurant',
          coordinates: { lat: 45.4640, lng: 9.1896 },
          likes: 45,
          friendsWhoSaved: [
            { name: 'Mike', avatar: 'photo-1507003211169-0a1dd7228f2d' },
            { name: 'Emma', avatar: 'photo-1438761681033-6461ffad8d80' }
          ],
          visitors: ['user2', 'user3', 'user4'],
          isNew: false,
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
          isFollowing: true,
          addedBy: 'user2',
          addedDate: '2024-05-20',
          popularity: 94,
          city: 'Milan',
          distance: '0.7km',
          totalSaves: 45
        },
        {
          id: 'milan3',
          name: 'Navigli Bar',
          category: 'bar',
          coordinates: { lat: 45.4583, lng: 9.1756 },
          likes: 28,
          friendsWhoSaved: [
            { name: 'Alex', avatar: 'photo-1472099645785-5658abf4ff4e' }
          ],
          visitors: ['user3', 'user5'],
          isNew: true,
          image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop',
          isFollowing: true,
          addedBy: 'user3',
          addedDate: '2024-06-01',
          popularity: 82,
          city: 'Milan',
          distance: '1.1km',
          totalSaves: 28
        }
      ],
      'paris': [
        {
          id: 'paris1',
          name: 'Café de Flore',
          category: 'cafe',
          coordinates: { lat: 48.8542, lng: 2.3320 },
          likes: 56,
          friendsWhoSaved: [
            { name: 'Sarah', avatar: 'photo-1494790108755-2616b5a5c75b' },
            { name: 'Sofia', avatar: 'photo-1534528741775-53994a69daeb' }
          ],
          visitors: ['user1', 'user4', 'user6'],
          isNew: false,
          image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
          isFollowing: true,
          addedBy: 'user1',
          addedDate: '2024-05-15',
          popularity: 91,
          city: 'Paris',
          distance: '0.4km',
          totalSaves: 56
        },
        {
          id: 'paris2',
          name: 'Le Jules Verne',
          category: 'restaurant',
          coordinates: { lat: 48.8584, lng: 2.2945 },
          likes: 89,
          friendsWhoSaved: [
            { name: 'Mike', avatar: 'photo-1507003211169-0a1dd7228f2d' },
            { name: 'Emma', avatar: 'photo-1438761681033-6461ffad8d80' },
            { name: 'Alex', avatar: 'photo-1472099645785-5658abf4ff4e' }
          ],
          visitors: ['user2', 'user5', 'user7', 'user8'],
          isNew: false,
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
          isFollowing: true,
          addedBy: 'user2',
          addedDate: '2024-05-30',
          popularity: 98,
          city: 'Paris',
          distance: '0.9km',
          totalSaves: 89
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
    
    if (config.isDemoMode) {
      return true;
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
    
    if (config.isDemoMode) {
      return getDemoPins('following', city);
    }

    try {
      const data = await backendService.getFollowedUsersLocations(user.id, city);
      return data.map(location => ({
        id: location.id,
        name: location.name,
        category: location.category,
        coordinates: { 
          lat: Number(location.latitude), 
          lng: Number(location.longitude) 
        },
        likes: 0,
        friendsWhoSaved: [],
        visitors: [],
        isNew: false,
        isFollowing: true,
        addedBy: location.created_by,
        city: location.city,
        popularity: 50,
        totalSaves: 0
      }));
    } catch (error) {
      console.error('Error fetching following pins:', error);
      return [];
    }
  }, [user, checkFollowedUsers]);

  const getPopularPins = useCallback(async (city?: string): Promise<MapPin[]> => {
    const config = backendService.getConfig();
    
    if (config.isDemoMode) {
      return getDemoPins('popular', city);
    }

    try {
      const data = await backendService.getPopularLocations(city, 20);
      return data.map(location => ({
        id: location.id,
        name: location.name,
        category: location.category,
        coordinates: { 
          lat: Number(location.latitude), 
          lng: Number(location.longitude) 
        },
        likes: 0,
        friendsWhoSaved: [],
        visitors: [],
        isNew: false,
        isFollowing: false,
        addedBy: location.created_by,
        city: location.city,
        popularity: 75,
        totalSaves: 0
      }));
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
            newPins = getDemoPins('new', city);
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
      if (activeFilter === 'popular') {
        setPins(getDemoPins(activeFilter, city));
      } else {
        setPins([]);
      }
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
