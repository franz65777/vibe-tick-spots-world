
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { backendService } from '@/services/backendService';

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
        // Demo data for when no user is available
        const demoSavedPlaces: SavedPlacesData = {
          "Milan": [
            { id: 'milan1', name: 'Café Milano', category: 'cafe', city: 'Milan', coordinates: { lat: 45.4642, lng: 9.1900 }, savedAt: '2024-05-28' },
            { id: 'milan2', name: 'Duomo Restaurant', category: 'restaurant', city: 'Milan', coordinates: { lat: 45.4640, lng: 9.1896 }, savedAt: '2024-05-20' },
            { id: 'milan3', name: 'Navigli Bar', category: 'bar', city: 'Milan', coordinates: { lat: 45.4583, lng: 9.1756 }, savedAt: '2024-06-01' }
          ],
          "Paris": [
            { id: 'paris1', name: 'Café de Flore', category: 'cafe', city: 'Paris', coordinates: { lat: 48.8542, lng: 2.3320 }, savedAt: '2024-05-15' },
            { id: 'paris2', name: 'Le Jules Verne', category: 'restaurant', city: 'Paris', coordinates: { lat: 48.8584, lng: 2.2945 }, savedAt: '2024-05-30' }
          ],
          "San Francisco": [
            { id: 'sf1', name: 'Golden Gate Café', category: 'cafe', city: 'San Francisco', coordinates: { lat: 37.8199, lng: -122.4783 }, savedAt: '2024-06-05' },
            { id: 'sf2', name: 'Fisherman\'s Wharf Restaurant', category: 'restaurant', city: 'San Francisco', coordinates: { lat: 37.8080, lng: -122.4177 }, savedAt: '2024-06-03' },
            { id: 'sf3', name: 'Union Square Hotel', category: 'hotel', city: 'San Francisco', coordinates: { lat: 37.7879, lng: -122.4075 }, savedAt: '2024-06-01' },
            { id: 'sf4', name: 'Lombard Street View', category: 'attraction', city: 'San Francisco', coordinates: { lat: 37.8021, lng: -122.4187 }, savedAt: '2024-05-28' },
            { id: 'sf5', name: 'Castro Theatre', category: 'entertainment', city: 'San Francisco', coordinates: { lat: 37.7609, lng: -122.4350 }, savedAt: '2024-05-25' }
          ]
        };
        setSavedPlaces(demoSavedPlaces);
        setLoading(false);
        return;
      }

      try {
        // Fetch real saved places from database
        const locations = await backendService.getUserSavedLocations(user.id);
        
        // Group by city
        const groupedByCity: SavedPlacesData = {};
        locations.forEach(location => {
          const city = location.city || 'Unknown';
          if (!groupedByCity[city]) {
            groupedByCity[city] = [];
          }
          
          groupedByCity[city].push({
            id: location.id,
            name: location.name,
            category: location.category,
            city: city,
            coordinates: {
              lat: Number(location.latitude) || 0,
              lng: Number(location.longitude) || 0
            },
            savedAt: location.created_at || new Date().toISOString()
          });
        });

        setSavedPlaces(groupedByCity);
      } catch (error) {
        console.error('Error loading saved places:', error);
        // Fall back to demo data on error
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
      // Save to database
      const result = await backendService.saveLocation(user.id, place.id);
      
      if (result.success) {
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
          
          // Check if place is already saved
          const isAlreadySaved = updated[place.city].some(p => p.id === place.id);
          if (!isAlreadySaved) {
            updated[place.city].push(newPlace);
          }
          
          return updated;
        });

        console.log('Place saved:', place.name, 'in', place.city);
      }
    } catch (error) {
      console.error('Error saving place:', error);
    }
  };

  const unsavePlace = async (placeId: string, city: string) => {
    if (!user) {
      console.warn('Cannot unsave place: user not authenticated');
      return;
    }

    try {
      // Remove from database
      const result = await backendService.unsaveLocation(user.id, placeId);
      
      if (result.success) {
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
      }
    } catch (error) {
      console.error('Error unsaving place:', error);
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
