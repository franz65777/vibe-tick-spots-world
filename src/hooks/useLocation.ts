
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useLocation = () => {
  const { user } = useAuth();
  const [currentCity, setCurrentCity] = useState<string>('San Francisco');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserLocation = async () => {
      // For demo mode, use fallback location
      console.log('useLocation: Using demo location');
      setCurrentCity('San Francisco');
      setLoading(false);
      
      // Uncomment below for production with real backend
      /*
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: userLocation } = await supabase
          .from('user_locations')
          .select('city')
          .eq('user_id', user.id)
          .single();

        if (userLocation?.city) {
          setCurrentCity(userLocation.city);
        } else {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const { latitude, longitude } = position.coords;
                
                try {
                  const response = await fetch(
                    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                  );
                  const data = await response.json();
                  const city = data.city || data.locality || 'San Francisco';
                  
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
      */
    };

    getUserLocation();
  }, [user]);

  const updateUserLocation = async (city: string) => {
    setCurrentCity(city);
    
    // Uncomment for production
    /*
    if (!user) return;
    
    try {
      await supabase
        .from('user_locations')
        .upsert({
          user_id: user.id,
          city,
          latitude: 0,
          longitude: 0
        });
    } catch (error) {
      console.error('Error updating user location:', error);
    }
    */
  };

  return { currentCity, loading, updateUserLocation };
};
