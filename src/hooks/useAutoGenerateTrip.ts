import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface GeneratedTrip {
  name: string;
  description: string;
  city: string;
  location_ids: string[];
  suggested_duration: number;
}

export const useAutoGenerateTrip = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();

  const generateTripFromCity = async (city: string): Promise<GeneratedTrip | null> => {
    if (!user) return null;

    setIsGenerating(true);
    try {
      // Fetch user's saved locations in this city
      const { data: savedLocations } = await supabase
        .from('user_saved_locations')
        .select(`
          location_id,
          locations (
            id,
            name,
            category,
            city
          )
        `)
        .eq('user_id', user.id);

      // Also fetch saved places (Google Places)
      const { data: savedPlaces } = await supabase
        .from('saved_places')
        .select('place_name, place_category, city, place_id')
        .eq('user_id', user.id)
        .eq('city', city);

      // Filter locations from the specified city
      const cityLocations = savedLocations?.filter(
        (sl: any) => sl.locations?.city?.toLowerCase() === city.toLowerCase()
      ) || [];

      if (cityLocations.length === 0 && (!savedPlaces || savedPlaces.length === 0)) {
        toast.error(`No saved places found in ${city}`);
        return null;
      }

      // Categorize locations
      const restaurants = cityLocations.filter((l: any) => 
        l.locations?.category?.toLowerCase().includes('restaurant') ||
        l.locations?.category?.toLowerCase().includes('food')
      );
      const bars = cityLocations.filter((l: any) => 
        l.locations?.category?.toLowerCase().includes('bar') ||
        l.locations?.category?.toLowerCase().includes('club')
      );
      const hotels = cityLocations.filter((l: any) => 
        l.locations?.category?.toLowerCase().includes('hotel') ||
        l.locations?.category?.toLowerCase().includes('lodging')
      );
      const attractions = cityLocations.filter((l: any) => 
        !l.locations?.category?.toLowerCase().includes('restaurant') &&
        !l.locations?.category?.toLowerCase().includes('bar') &&
        !l.locations?.category?.toLowerCase().includes('hotel')
      );

      // Suggest duration based on number of places
      const totalPlaces = cityLocations.length;
      const suggested_duration = Math.max(1, Math.ceil(totalPlaces / 4)); // ~4 places per day

      // Generate trip name
      const categoryCount = [restaurants.length, bars.length, hotels.length, attractions.length]
        .filter(c => c > 0).length;
      
      let tripType = '';
      if (restaurants.length > cityLocations.length / 2) {
        tripType = 'Foodie';
      } else if (attractions.length > cityLocations.length / 2) {
        tripType = 'Culture & Sightseeing';
      } else if (bars.length > 0 && restaurants.length > 0) {
        tripType = 'Dining & Nightlife';
      } else {
        tripType = 'Exploration';
      }

      const name = `${city} ${tripType} Trip`;
      const description = `A ${suggested_duration}-day ${tripType.toLowerCase()} adventure in ${city} featuring ${cityLocations.length} hand-picked locations`;

      return {
        name,
        description,
        city,
        location_ids: cityLocations.map((l: any) => l.location_id),
        suggested_duration,
      };
    } catch (error: any) {
      console.error('Error generating trip:', error);
      toast.error('Failed to generate trip');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateTripFromCity,
    isGenerating,
  };
};