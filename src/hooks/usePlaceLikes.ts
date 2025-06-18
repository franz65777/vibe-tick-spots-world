
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePlaceLikes = () => {
  const { user } = useAuth();
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserLikes();
    } else {
      setLikedPlaces(new Set());
      setLoading(false);
    }
  }, [user]);

  const loadUserLikes = async () => {
    if (!user) return;
    
    try {
      // For now, we'll use a local state approach since we don't have a places table yet
      // This will store likes in localStorage temporarily
      const savedLikes = localStorage.getItem(`user_likes_${user.id}`);
      if (savedLikes) {
        setLikedPlaces(new Set(JSON.parse(savedLikes)));
      }
    } catch (error) {
      console.error('Error loading user likes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (placeId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const newLikedPlaces = new Set(likedPlaces);
      const isCurrentlyLiked = newLikedPlaces.has(placeId);

      if (isCurrentlyLiked) {
        newLikedPlaces.delete(placeId);
      } else {
        newLikedPlaces.add(placeId);
      }

      setLikedPlaces(newLikedPlaces);
      
      // Save to localStorage temporarily
      localStorage.setItem(`user_likes_${user.id}`, JSON.stringify(Array.from(newLikedPlaces)));

      return true;
    } catch (error) {
      console.error('Error toggling like:', error);
      return false;
    }
  };

  const isLiked = (placeId: string): boolean => {
    return likedPlaces.has(placeId);
  };

  return {
    likedPlaces,
    loading,
    toggleLike,
    isLiked
  };
};
