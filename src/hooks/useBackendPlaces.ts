
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface BackendPlace {
  id: string;
  name: string;
  category: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  image_url?: string;
  description?: string;
  created_by: string;
  pioneer_user_id: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
  is_saved?: boolean;
  likes_count?: number;
  media_count?: number;
}

export const useBackendPlaces = () => {
  const { user } = useAuth();
  const [places, setPlaces] = useState<BackendPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        console.log('Backend ready: Fetching places');
        
        // Demo places data while backend is in demo mode
        const demoPlaces: BackendPlace[] = [
          {
            id: '1',
            name: 'The Cozy Corner Café',
            category: 'cafe',
            address: '123 Main St, Downtown',
            latitude: 37.7849,
            longitude: -122.4094,
            city: 'San Francisco',
            country: 'USA',
            image_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
            description: 'A cozy neighborhood café with great coffee',
            created_by: user?.id || 'demo-user',
            pioneer_user_id: user?.id || 'demo-user',
            created_at: '2024-05-25T00:00:00Z',
            updated_at: '2024-05-25T00:00:00Z',
            is_saved: true,
            likes_count: 24,
            media_count: 8
          },
          {
            id: '2',
            name: 'Sunset View Restaurant',
            category: 'restaurant',
            address: '456 Ocean Ave, Sunset',
            latitude: 37.7849,
            longitude: -122.4194,
            city: 'San Francisco',
            country: 'USA',
            image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
            description: 'Amazing sunset views with fresh seafood',
            created_by: user?.id || 'demo-user',
            pioneer_user_id: user?.id || 'demo-user',
            created_at: '2024-06-01T00:00:00Z',
            updated_at: '2024-06-01T00:00:00Z',
            is_saved: false,
            likes_count: 18,
            media_count: 12
          }
        ];
        
        setPlaces(demoPlaces);
        setError(null);

        // TODO: Uncomment for production
        /*
        const { data, error } = await supabase
          .from('locations')
          .select(`
            *,
            user_saved_locations!inner(user_id),
            location_likes(count),
            media(count)
          `)
          .eq('user_saved_locations.user_id', user?.id);

        if (error) {
          throw error;
        }

        const processedPlaces = data?.map(place => ({
          ...place,
          is_saved: true,
          likes_count: place.location_likes?.[0]?.count || 0,
          media_count: place.media?.[0]?.count || 0
        })) || [];

        setPlaces(processedPlaces);
        */
      } catch (err: any) {
        console.error('Places fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchPlaces();
    } else {
      setLoading(false);
    }
  }, [user]);

  const savePlace = async (placeData: Omit<BackendPlace, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'pioneer_user_id'>) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      // TODO: Uncomment for production
      /*
      const { data, error } = await supabase
        .from('locations')
        .insert({
          ...placeData,
          created_by: user.id,
          pioneer_user_id: user.id
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Also save to user's saved locations
      await supabase
        .from('user_saved_locations')
        .insert({
          user_id: user.id,
          location_id: data.id
        });

      setPlaces(prev => [...prev, { ...data, is_saved: true }]);
      return { data };
      */
      
      // Demo mode: add to local state
      const newPlace: BackendPlace = {
        id: Date.now().toString(),
        ...placeData,
        created_by: user.id,
        pioneer_user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_saved: true,
        likes_count: 0,
        media_count: 0
      };
      
      setPlaces(prev => [...prev, newPlace]);
      return { data: newPlace };
    } catch (err: any) {
      console.error('Save place error:', err);
      return { error: err.message };
    }
  };

  return {
    places,
    loading,
    error,
    savePlace
  };
};
