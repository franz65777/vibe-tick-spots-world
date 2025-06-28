import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { locationInteractionService } from '@/services/locationInteractionService';
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

export const useMapPins = (filter: 'following' | 'popular' | 'saved' = 'following') => {
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
        const followingLocations = await locationInteractionService.getFollowingLocations(user.id);
        console.log('✅ Following locations:', followingLocations.length);
        
        fetchedPins = followingLocations.map(location => ({
          id: location.id,
          name: location.name,
          category: location.category,
          coordinates: location.coordinates,
          likes: location.likes || 0,
          isFollowing: true,
          addedBy: location.addedBy,
          addedDate: location.addedDate,
          popularity: location.popularity || 75,
          city: location.city,
          isNew: false,
          image: location.image,
          friendsWhoSaved: location.friendsWhoSaved || [],
          visitors: location.visitors || [],
          distance: location.distance,
          totalSaves: location.totalSaves || 0,
          address: location.address,
          google_place_id: location.google_place_id
        }));

        setHasFollowedUsers(followingLocations.length > 0);
      } else if (filter === 'popular') {
        const popularLocations = await backendService.getPopularLocations(cityFilter);
        fetchedPins = popularLocations.map(location => ({
          id: location.id,
          name: location.name,
          category: location.category,
          coordinates: { 
            lat: parseFloat(location.latitude?.toString() || '0'), 
            lng: parseFloat(location.longitude?.toString() || '0') 
          },
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
        }));
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
