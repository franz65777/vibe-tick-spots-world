
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Place } from '@/types/place';

export const usePlaceEngagement = () => {
  const { user } = useAuth();
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadUserEngagement();
    }
  }, [user]);

  // Listen for global save changes from other components
  useEffect(() => {
    const handleSaveChanged = (event: CustomEvent) => {
      const { locationId, isSaved } = event.detail;
      setSavedPlaces(prev => {
        const newSet = new Set(prev);
        if (isSaved) {
          newSet.add(locationId);
        } else {
          newSet.delete(locationId);
        }
        return newSet;
      });
    };
    
    window.addEventListener('location-save-changed', handleSaveChanged as EventListener);
    return () => {
      window.removeEventListener('location-save-changed', handleSaveChanged as EventListener);
    };
  }, []);

  const loadUserEngagement = async () => {
    if (!user) return;

    try {
      // Load liked places
      const { data: likes } = await supabase
        .from('place_likes')
        .select('place_id')
        .eq('user_id', user.id);

      // Load saved places  
      const { data: saves } = await supabase
        .from('saved_places')
        .select('place_id')
        .eq('user_id', user.id);

      setLikedPlaces(new Set(likes?.map(l => l.place_id) || []));
      setSavedPlaces(new Set(saves?.map(s => s.place_id) || []));
    } catch (error) {
      console.error('Error loading user engagement:', error);
    }
  };

  const toggleLike = async (placeId: string) => {
    if (!user) return false;

    try {
      const isLiked = likedPlaces.has(placeId);

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('place_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', placeId);

        if (!error) {
          setLikedPlaces(prev => {
            const newSet = new Set(prev);
            newSet.delete(placeId);
            return newSet;
          });
        }
      } else {
        // Like
        const { error } = await supabase
          .from('place_likes')
          .insert({ user_id: user.id, place_id: placeId });

        if (!error) {
          setLikedPlaces(prev => new Set([...prev, placeId]));
        }
      }

      return true;
    } catch (error) {
      console.error('Error toggling like:', error);
      return false;
    }
  };

  const toggleSave = async (place: Place) => {
    if (!user) return false;

    try {
      const isSaved = savedPlaces.has(place.id);

      if (isSaved) {
        // Unsave
        const { error } = await supabase
          .from('saved_places')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', place.id);

        if (!error) {
          setSavedPlaces(prev => {
            const newSet = new Set(prev);
            newSet.delete(place.id);
            return newSet;
          });
          // Emit global event
          window.dispatchEvent(new CustomEvent('location-save-changed', { 
            detail: { locationId: place.id, isSaved: false } 
          }));
        }
      } else {
        // Save
        const { error } = await supabase
          .from('saved_places')
          .insert({
            user_id: user.id,
            place_id: place.id,
            place_name: place.name,
            place_category: place.category,
            city: place.city,
            coordinates: place.coordinates
          });

        if (!error) {
          setSavedPlaces(prev => new Set([...prev, place.id]));
          // Emit global event
          window.dispatchEvent(new CustomEvent('location-save-changed', { 
            detail: { locationId: place.id, isSaved: true } 
          }));
        }
      }

      return true;
    } catch (error) {
      console.error('Error toggling save:', error);
      return false;
    }
  };

  return {
    likedPlaces,
    savedPlaces,
    toggleLike,
    toggleSave,
    isLiked: (placeId: string) => likedPlaces.has(placeId),
    isSaved: (placeId: string) => savedPlaces.has(placeId),
    refetch: loadUserEngagement
  };
};
