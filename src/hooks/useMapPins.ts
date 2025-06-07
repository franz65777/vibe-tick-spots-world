
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { backendService } from '@/services/backendService';

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
}

interface UseMapPinsReturn {
  pins: MapPin[];
  loading: boolean;
  error: string | null;
  refreshPins: () => void;
  getFollowingPins: (city?: string) => Promise<MapPin[]>;
  getPopularPins: (city?: string) => Promise<MapPin[]>;
}

export const useMapPins = (activeFilter: 'following' | 'popular' | 'new' = 'following'): UseMapPinsReturn => {
  const { user } = useAuth();
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          isFollowing: true,
          addedBy: 'user1',
          addedDate: '2024-05-25',
          popularity: 85,
          city: 'San Francisco'
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
          city: 'San Francisco'
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
          city: 'San Francisco'
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
          city: 'Milan'
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
          city: 'Milan'
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
          city: 'Milan'
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
          city: 'Paris'
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
          city: 'Paris'
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

  const getFollowingPins = async (city?: string): Promise<MapPin[]> => {
    if (!user) return [];

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
        likes: 0, // Would come from location_likes count
        isFollowing: true,
        addedBy: location.created_by,
        city: location.city,
        popularity: 50 // Default value
      }));
    } catch (error) {
      console.error('Error fetching following pins:', error);
      return getDemoPins('following', city);
    }
  };

  const getPopularPins = async (city?: string): Promise<MapPin[]> => {
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
        likes: 0, // Would come from location_likes count
        isFollowing: false,
        addedBy: location.created_by,
        city: location.city,
        popularity: 75 // Would be calculated based on engagement
      }));
    } catch (error) {
      console.error('Error fetching popular pins:', error);
      return getDemoPins('popular', city);
    }
  };

  const refreshPins = async (city?: string) => {
    setLoading(true);
    setError(null);

    try {
      let newPins: MapPin[] = [];

      switch (activeFilter) {
        case 'following':
          newPins = await getFollowingPins(city);
          break;
        case 'popular':
          newPins = await getPopularPins(city);
          break;
        case 'new':
          newPins = getDemoPins('new', city);
          break;
        default:
          newPins = await getFollowingPins(city);
      }

      setPins(newPins);
      console.log(`Loaded ${newPins.length} ${activeFilter} pins for ${city || 'current location'}`);
    } catch (error) {
      console.error('Error refreshing pins:', error);
      setError('Failed to load pins');
      // Fallback to demo data
      setPins(getDemoPins(activeFilter, city));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPins();
  }, [activeFilter, user]);

  return {
    pins,
    loading,
    error,
    refreshPins,
    getFollowingPins,
    getPopularPins
  };
};
