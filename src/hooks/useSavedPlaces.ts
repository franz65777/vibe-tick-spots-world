
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
  postsCount?: number;
  google_place_id?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
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
        // Fetch from saved_places table (Google places)
        const { data: savedPlacesData, error: savedPlacesError } = await supabase
          .from('saved_places')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (savedPlacesError) console.error('Error fetching saved_places:', savedPlacesError);

        // Fetch from user_saved_locations table (internal locations)
        const { data: userSavedLocations, error: userSavedError } = await supabase
          .from('user_saved_locations')
          .select(`
            id,
            created_at,
            locations (
              id,
              name,
              category,
              city,
              latitude,
              longitude,
              google_place_id
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (userSavedError) console.error('Error fetching user_saved_locations:', userSavedError);

        // Combine and group by city
        const groupedByCity: SavedPlacesData = {};
        
        // Add saved_places data (filter out low-quality entries)
        (savedPlacesData || []).forEach(place => {
          // Skip entries with Unknown or missing data
          if (!place.place_name || place.place_name === 'Unknown' || 
              !place.city || place.city === 'Unknown') {
            return;
          }
          
          const city = place.city;
          if (!groupedByCity[city]) {
            groupedByCity[city] = [];
          }
          
          groupedByCity[city].push({
            id: place.place_id,
            name: place.place_name,
            category: place.place_category || 'place',
            city: city,
            coordinates: (place.coordinates as any) || { lat: 0, lng: 0 },
            savedAt: place.created_at || new Date().toISOString(),
            google_place_id: place.place_id
          });
        });

        // Add user_saved_locations data
        (userSavedLocations || []).forEach((item: any) => {
          const location = item.locations;
          if (!location) return;
          
          // Skip entries with Unknown or missing data
          if (!location.name || location.name === 'Unknown' || 
              !location.city || location.city === 'Unknown') {
            return;
          }
          
          const city = location.city;
          if (!groupedByCity[city]) {
            groupedByCity[city] = [];
          }
          
          // Use google_place_id if available, otherwise use internal id
          const placeId = location.google_place_id || location.id;
          
          // Check if not already added (avoid duplicates)
          const alreadyExists = groupedByCity[city].some(p => p.id === placeId);
          if (!alreadyExists) {
            groupedByCity[city].push({
              id: placeId,
              name: location.name,
              category: location.category || 'place',
              city: city,
              coordinates: { 
                lat: location.latitude || 0, 
                lng: location.longitude || 0 
              },
              savedAt: item.created_at || new Date().toISOString(),
              google_place_id: location.google_place_id,
              latitude: location.latitude,
              longitude: location.longitude
            });
          }
        });

        // Fetch posts count for all locations
        const allLocationIds: string[] = [];
        Object.values(groupedByCity).forEach(places => {
          places.forEach(place => {
            allLocationIds.push(place.id);
          });
        });

        if (allLocationIds.length > 0) {
          const { data: postsData } = await supabase
            .from('posts')
            .select('location_id, id')
            .in('location_id', allLocationIds);

          // Count posts per location
          const postsMap = new Map<string, number>();
          postsData?.forEach(post => {
            postsMap.set(post.location_id, (postsMap.get(post.location_id) || 0) + 1);
          });

          // Add posts count to each place
          Object.values(groupedByCity).forEach(places => {
            places.forEach(place => {
              place.postsCount = postsMap.get(place.id) || 0;
            });
          });
        }

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
