
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SavedPlace {
  id: string;
  name: string;
  category: string;
  city: string;
  coordinates: { lat: number; lng: number };
  savedAt: string;
}

interface SavedPlacesData {
  [city: string]: SavedPlace[];
}

export const useSavedPlaces = () => {
  const { user } = useAuth();
  const [savedPlaces, setSavedPlaces] = useState<SavedPlacesData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSavedPlaces = async () => {
      console.log('useSavedPlaces: Loading saved places for user:', user?.id);
      
      if (!user) {
        setSavedPlaces({});
        setLoading(false);
        return;
      }

      try {
        // Fetch saved places from saved_places table
        const { data: savedPlacesData, error } = await supabase
          .from('saved_places')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Group by city
        const groupedByCity: SavedPlacesData = {};
        (savedPlacesData || []).forEach(place => {
          const city = place.city || 'Unknown';
          if (!groupedByCity[city]) {
            groupedByCity[city] = [];
          }
          
          groupedByCity[city].push({
            id: place.place_id,
            name: place.place_name,
            category: place.place_category || 'place',
            city: city,
            coordinates: (place.coordinates as any) || { lat: 0, lng: 0 },
            savedAt: place.created_at || new Date().toISOString()
          });
        });

        setSavedPlaces(groupedByCity);
      } catch (error) {
        console.error('Error loading saved places:', error);
        setSavedPlaces({});
      } finally {
        setLoading(false);
      }
    };

    loadSavedPlaces();
  }, [user]);

  const savePlace = async (place: Omit<SavedPlace, 'savedAt'>) => {
    if (!user) {
      console.warn('Cannot save place: user not authenticated');
      return;
    }

    try {
      // Check if already saved
      const { data: existing } = await supabase
        .from('saved_places')
        .select('id')
        .eq('user_id', user.id)
        .eq('place_id', place.id)
        .maybeSingle();

      if (existing) {
        console.log('Place already saved:', place.name);
        return;
      }

      // Save to database
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
      
      if (error) throw error;

      // Update local state
      const newPlace: SavedPlace = {
        ...place,
        savedAt: new Date().toISOString()
      };

      setSavedPlaces(prev => {
        const updated = { ...prev };
        if (!updated[place.city]) {
          updated[place.city] = [];
        }
        
        // Check if place is already in local state
        const isAlreadySaved = updated[place.city].some(p => p.id === place.id);
        if (!isAlreadySaved) {
          updated[place.city].push(newPlace);
        }
        
        return updated;
      });

      console.log('Place saved:', place.name, 'in', place.city);
    } catch (error) {
      console.error('Error saving place:', error);
      throw error;
    }
  };

  const unsavePlace = async (placeId: string, city: string) => {
    if (!user) {
      console.warn('Cannot unsave place: user not authenticated');
      return;
    }

    try {
      // Remove from database
      const { error } = await supabase
        .from('saved_places')
        .delete()
        .eq('user_id', user.id)
        .eq('place_id', placeId);
      
      if (error) throw error;

      // Update local state
      setSavedPlaces(prev => {
        const updated = { ...prev };
        if (updated[city]) {
          updated[city] = updated[city].filter(p => p.id !== placeId);
          // Remove city if no places left
          if (updated[city].length === 0) {
            delete updated[city];
          }
        }
        return updated;
      });

      console.log('Place unsaved:', placeId, 'from', city);
    } catch (error) {
      console.error('Error unsaving place:', error);
      throw error;
    }
  };

  const isPlaceSaved = (placeId: string) => {
    for (const cityPlaces of Object.values(savedPlaces)) {
      if (cityPlaces.some(place => place.id === placeId)) {
        return true;
      }
    }
    return false;
  };

  const getStats = () => {
    const cities = Object.keys(savedPlaces).length;
    const places = Object.values(savedPlaces).reduce((total, cityPlaces) => total + cityPlaces.length, 0);
    return { cities, places };
  };

  return {
    savedPlaces,
    loading,
    savePlace,
    unsavePlace,
    isPlaceSaved,
    getStats
  };
};
