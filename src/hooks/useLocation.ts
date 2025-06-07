
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useLocation = () => {
  const { user } = useAuth();
  const [currentCity, setCurrentCity] = useState<string>('San Francisco');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserLocation = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Try to get user's saved location first
        const { data: userLocation } = await supabase
          .from('user_locations')
          .select('city')
          .eq('user_id', user.id)
          .single();

        if (userLocation?.city) {
          setCurrentCity(userLocation.city);
        } else {
          // Get browser location if available
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const { latitude, longitude } = position.coords;
                
                // Reverse geocode to get city name (using a simple service)
                try {
                  const response = await fetch(
                    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                  );
                  const data = await response.json();
                  const city = data.city || data.locality || 'San Francisco';
                  
                  // Save to database
                  await supabase
                    .from('user_locations')
                    .upsert({
                      user_id: user.id,
                      latitude,
                      longitude,
                      city,
                      country: data.countryName
                    });
                    
                  setCurrentCity(city);
                } catch (error) {
                  console.error('Error getting city name:', error);
                }
              },
              () => {
                console.log('Location access denied');
              }
            );
          }
        }
      } catch (error) {
        console.error('Error getting user location:', error);
      } finally {
        setLoading(false);
      }
    };

    getUserLocation();
  }, [user]);

  const updateUserLocation = async (city: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('user_locations')
        .upsert({
          user_id: user.id,
          city,
          latitude: 0, // Will be updated when we have coordinates
          longitude: 0
        });
      
      setCurrentCity(city);
    } catch (error) {
      console.error('Error updating user location:', error);
    }
  };

  return { currentCity, loading, updateUserLocation };
};
