
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { normalizeCity } from '@/utils/cityNormalization';

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
  savedCount?: number;
}

interface SavedPlacesData {
  [city: string]: SavedPlace[];
}

export const useSavedPlaces = () => {
  const { user } = useAuth();
  const [savedPlaces, setSavedPlaces] = useState<SavedPlacesData>({});
  const [loading, setLoading] = useState(true);

  // Helper function to reverse geocode coordinates to get city/address
  const reverseGeocode = async (lat: number, lng: number): Promise<{ city: string; address: string } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('reverse-geocode', {
        body: { latitude: lat, longitude: lng }
      });
      
      if (error) {
        console.error('Reverse geocode error:', error);
        return null;
      }
      
      return {
        city: data.city || 'Unknown',
        address: data.formatted_address || ''
      };
    } catch (error) {
      console.error('Failed to reverse geocode:', error);
      return null;
    }
  };

  useEffect(() => {
    const loadSavedPlaces = async () => {
      console.log('useSavedPlaces: Loading saved places for user:', user?.id);
      
      if (!user) {
        setSavedPlaces({});
        setLoading(false);
        return;
      }

      try {
        // Helper to run both queries
        const runQueries = async () => {
          const savedRes = await supabase
            .from('saved_places')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          const userSavedRes = await supabase
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
                google_place_id,
                address
              )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          return { savedRes, userSavedRes };
        };

        let { savedRes, userSavedRes } = await runQueries();

        const isBadJwt = (err?: any) => !!err && (err.code === 'PGRST303' || /JWT expired|bad_jwt/i.test(err.message || ''));
        if (isBadJwt(savedRes.error) || isBadJwt(userSavedRes.error)) {
          console.warn('🔁 Saved places query received bad_jwt, attempting refresh...');
          const { error: refreshErr } = await supabase.auth.refreshSession();
          if (refreshErr) {
            console.error('❌ Refresh failed, signing out:', refreshErr);
            await supabase.auth.signOut();
            setSavedPlaces({});
            setLoading(false);
            return;
          }
          ({ savedRes, userSavedRes } = await runQueries());
        }

        const savedPlacesData = savedRes.data || [];
        const userSavedLocations = (userSavedRes.data || []) as any[];

        if (savedRes.error) console.error('Error fetching saved_places:', savedRes.error);
        console.log('useSavedPlaces: Found', savedPlacesData?.length || 0, 'saved_places entries');

        if (userSavedRes.error) console.error('Error fetching user_saved_locations:', userSavedRes.error);
        console.log('useSavedPlaces: Found', userSavedLocations?.length || 0, 'user_saved_locations entries');

        // Combine and group by city
        const groupedByCity: SavedPlacesData = {};
        const placesNeedingGeocode: Array<{ place: any; index: number; source: 'saved_places' | 'user_saved_locations' }> = [];
        
        // Add saved_places data
        for (let i = 0; i < (savedPlacesData || []).length; i++) {
          const place = savedPlacesData[i];
          
          // Only skip if place_name is missing
          if (!place.place_name) {
            continue;
          }
          
          let city = normalizeCity(place.city);
          const coords = place.coordinates as any;
          
          // Check if we need to reverse geocode
          if (city === 'Unknown' && coords?.lat && coords?.lng) {
            placesNeedingGeocode.push({ place, index: i, source: 'saved_places' });
          }
          
          if (!groupedByCity[city]) {
            groupedByCity[city] = [];
          }
          
          groupedByCity[city].push({
            id: place.place_id,
            name: place.place_name,
            category: place.place_category || 'place',
            city: city,
            coordinates: coords || { lat: 0, lng: 0 },
            savedAt: place.created_at || new Date().toISOString(),
            google_place_id: place.place_id,
            latitude: coords?.lat,
            longitude: coords?.lng
          });
        }

        // Add user_saved_locations data
        for (let i = 0; i < (userSavedLocations || []).length; i++) {
          const item = userSavedLocations[i] as any;
          const location = item.locations;
          if (!location) continue;
          
          // Only skip if name is missing
          if (!location.name) {
            continue;
          }
          
          let city = normalizeCity(location.city);
          
          // Check if we need to reverse geocode
          if (city === 'Unknown' && location.latitude && location.longitude) {
            placesNeedingGeocode.push({ place: { ...location, saved_id: item.id }, index: i, source: 'user_saved_locations' });
          }
          
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
              longitude: location.longitude,
              address: location.address || undefined
            });
          }
        }

        // Reverse geocode places with missing city data
        console.log(`useSavedPlaces: ${placesNeedingGeocode.length} places need reverse geocoding`);
        
        for (const { place, source } of placesNeedingGeocode) {
          try {
            let lat, lng, placeId, locationId;
            
            if (source === 'saved_places') {
              const coords = place.coordinates as any;
              lat = coords?.lat;
              lng = coords?.lng;
              placeId = place.place_id;
            } else {
              lat = place.latitude;
              lng = place.longitude;
              locationId = place.id;
            }
            
            if (!lat || !lng) continue;
            
            const geocodeResult = await reverseGeocode(lat, lng);
            
            if (geocodeResult && geocodeResult.city && geocodeResult.city !== 'Unknown') {
              const newCity = geocodeResult.city;
              
              // Update database
              if (source === 'saved_places') {
                await supabase
                  .from('saved_places')
                  .update({ city: newCity })
                  .eq('place_id', placeId)
                  .eq('user_id', user.id);
              } else if (locationId) {
                await supabase
                  .from('locations')
                  .update({ city: newCity })
                  .eq('id', locationId);
              }
              
              // Update local state
              const oldCity = 'Unknown';
              if (groupedByCity[oldCity]) {
                const placeIndex = groupedByCity[oldCity].findIndex(p => 
                  p.id === (placeId || locationId)
                );
                
                if (placeIndex !== -1) {
                  const updatedPlace = { ...groupedByCity[oldCity][placeIndex], city: newCity };
                  groupedByCity[oldCity].splice(placeIndex, 1);
                  
                  if (!groupedByCity[newCity]) {
                    groupedByCity[newCity] = [];
                  }
                  groupedByCity[newCity].push(updatedPlace);
                  
                  // Remove empty "Unknown" city
                  if (groupedByCity[oldCity].length === 0) {
                    delete groupedByCity[oldCity];
                  }
                }
              }
              
              console.log(`✅ Updated ${place.place_name || place.name} with city: ${newCity}`);
            }
            
            // Rate limiting - wait 200ms between requests
            await new Promise(resolve => setTimeout(resolve, 200));
            
          } catch (error) {
            console.error('Error reverse geocoding place:', error);
          }
        }

        // Fetch posts count for all locations
        // We need to query by internal location UUIDs, not Google Place IDs
        const internalLocationIds: string[] = [];
        const googlePlaceIdMap = new Map<string, string>(); // Map google_place_id to display id
        
        for (const places of Object.values(groupedByCity)) {
          for (const place of places) {
            // Try to find the internal location ID
            if (place.google_place_id) {
              // Query to get internal location ID from google_place_id
              const { data: locationData } = await supabase
                .from('locations')
                .select('id')
                .eq('google_place_id', place.google_place_id)
                .maybeSingle();
              
              if (locationData?.id) {
                internalLocationIds.push(locationData.id);
                googlePlaceIdMap.set(locationData.id, place.id);
              }
            } else if (place.id && place.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              // It's already a UUID
              internalLocationIds.push(place.id);
              googlePlaceIdMap.set(place.id, place.id);
            }
          }
        }

        if (internalLocationIds.length > 0) {
          const { data: postsData } = await supabase
            .from('posts')
            .select('location_id, id')
            .in('location_id', internalLocationIds);

          // Count posts per location
          const postsMap = new Map<string, number>();
          postsData?.forEach(post => {
            const displayId = googlePlaceIdMap.get(post.location_id) || post.location_id;
            postsMap.set(displayId, (postsMap.get(displayId) || 0) + 1);
          });

          // Add posts count to each place
          Object.values(groupedByCity).forEach(places => {
            places.forEach(place => {
              place.postsCount = postsMap.get(place.id) || 0;
            });
          });
        }

        setSavedPlaces(groupedByCity);
        console.log('useSavedPlaces: Grouped into', Object.keys(groupedByCity).length, 'cities with total', 
          Object.values(groupedByCity).reduce((sum, places) => sum + places.length, 0), 'places');
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
      // Delete from saved_places table (Google places)
      const { error: savedPlacesError } = await supabase
        .from('saved_places')
        .delete()
        .eq('user_id', user.id)
        .eq('place_id', placeId);
      
      if (savedPlacesError) console.error('Error deleting from saved_places:', savedPlacesError);

      // Also try to delete from user_saved_locations (internal locations)
      // First find the internal location by google_place_id or by id
      const { data: locationData } = await supabase
        .from('locations')
        .select('id')
        .or(`google_place_id.eq.${placeId},id.eq.${placeId}`)
        .maybeSingle();

      if (locationData?.id) {
        const { error: userSavedError } = await supabase
          .from('user_saved_locations')
          .delete()
          .eq('user_id', user.id)
          .eq('location_id', locationData.id);
        
        if (userSavedError) console.error('Error deleting from user_saved_locations:', userSavedError);
      }

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
