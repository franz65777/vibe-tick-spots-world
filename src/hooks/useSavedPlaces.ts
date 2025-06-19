
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { backendService } from '@/services/backendService';
import { supabase } from '@/integrations/supabase/client';
import { Place } from '@/types/place';

interface SavedPlace {
  id: string;
  user_id: string;
  location_id: string;
  privacy_level: 'private' | 'followers' | 'public';
  created_at: string;
  place?: Place;
  locations?: {
    id: string;
    name: string;
    category: string;
    latitude: number;
    longitude: number;
    address: string;
    image_url: string;
    city?: string;
  };
}

export const useSavedPlaces = () => {
  const { user } = useAuth();
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());
  const [savedPlacesWithDetails, setSavedPlacesWithDetails] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(false);

  const config = backendService.getConfig();

  const loadSavedPlaces = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (!config.enableRealDatabase) {
        // Demo mode
        const demoSaved = new Set(['1', '3']);
        setSavedPlaces(demoSaved);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_saved_locations')
        .select(`
          *,
          locations (
            id,
            name,
            category,
            latitude,
            longitude,
            address,
            image_url,
            city
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const savedIds = new Set(data?.map(item => item.location_id) || []);
      setSavedPlaces(savedIds);
      
      // Transform data to include privacy_level with default value since it doesn't exist in DB
      const transformedData = data?.map(item => ({
        ...item,
        privacy_level: 'followers' as 'private' | 'followers' | 'public' // Default since column doesn't exist
      })) || [];
      
      setSavedPlacesWithDetails(transformedData);
    } catch (error) {
      console.error('Error loading saved places:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePlace = async (placeId: string, privacyLevel: 'private' | 'followers' | 'public' = 'followers') => {
    if (!user) return false;

    try {
      if (!config.enableRealDatabase) {
        // Demo mode
        setSavedPlaces(prev => new Set([...prev, placeId]));
        return true;
      }

      const { error } = await supabase
        .from('user_saved_locations')
        .insert({
          user_id: user.id,
          location_id: placeId
        });

      if (error) throw error;

      setSavedPlaces(prev => new Set([...prev, placeId]));
      await loadSavedPlaces(); // Reload to get updated details
      return true;
    } catch (error) {
      console.error('Error saving place:', error);
      return false;
    }
  };

  const unsavePlace = async (placeId: string) => {
    if (!user) return false;

    try {
      if (!config.enableRealDatabase) {
        // Demo mode
        setSavedPlaces(prev => {
          const newSet = new Set(prev);
          newSet.delete(placeId);
          return newSet;
        });
        return true;
      }

      const { error } = await supabase
        .from('user_saved_locations')
        .delete()
        .eq('user_id', user.id)
        .eq('location_id', placeId);

      if (error) throw error;

      setSavedPlaces(prev => {
        const newSet = new Set(prev);
        newSet.delete(placeId);
        return newSet;
      });
      await loadSavedPlaces(); // Reload to get updated details
      return true;
    } catch (error) {
      console.error('Error unsaving place:', error);
      return false;
    }
  };

  const updatePlacePrivacy = async (placeId: string, privacyLevel: 'private' | 'followers' | 'public') => {
    if (!user) return false;

    try {
      if (!config.enableRealDatabase) {
        // Demo mode - would update local state
        return true;
      }

      // Note: privacy_level column doesn't exist in current schema
      // This would need a database migration to work properly
      console.log('Privacy update requested but not implemented in database schema');
      return true;
    } catch (error) {
      console.error('Error updating place privacy:', error);
      return false;
    }
  };

  const isPlaceSaved = (placeId: string): boolean => {
    return savedPlaces.has(placeId);
  };

  const getStats = () => {
    const places = savedPlacesWithDetails.length;
    const cities = new Set(
      savedPlacesWithDetails
        .map(item => item.locations?.city)
        .filter(Boolean)
    ).size;
    
    return {
      places,
      cities
    };
  };

  useEffect(() => {
    if (user) {
      loadSavedPlaces();
    }
  }, [user]);

  return {
    savedPlaces,
    savedPlacesWithDetails,
    loading,
    savePlace,
    unsavePlace,
    updatePlacePrivacy,
    isPlaceSaved,
    getStats,
    refreshSavedPlaces: loadSavedPlaces
  };
};
