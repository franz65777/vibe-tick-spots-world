import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TopCity {
  city: string;
  count: number;
}

export function useTopCities() {
  const [topCities, setTopCities] = useState<TopCity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('🏙️ useTopCities: mounting, fetching cities...');
    fetchTopCities();
  }, []);

  const fetchTopCities = async () => {
    setLoading(true);
    try {
      // Try edge function first for efficiency
      console.log('🏙️ Calling trending-cities edge function...');
      const { data, error } = await supabase.functions.invoke('trending-cities');
      console.log('🏙️ Edge function response:', { data, error });
      
      if (!error && data?.cities) {
        const cities = data.cities.slice(0, 5).map((c: any) => ({
          city: c.city,
          count: c.total
        }));
        console.log('🏙️ Setting topCities from edge function:', cities);
        setTopCities(cities);
        return;
      }

      // Fallback: query saved_places table directly  
      console.log('🏙️ Fallback: querying saved_places directly...');
      const { data: saves } = await supabase
        .from('saved_places')
        .select('city')
        .not('city', 'is', null);

      if (saves) {
        const cityCounts = new Map<string, number>();
        for (const save of saves) {
          if (save.city) {
            cityCounts.set(save.city, (cityCounts.get(save.city) || 0) + 1);
          }
        }

        const sorted = Array.from(cityCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([city, count]) => ({ city, count }));

        console.log('🏙️ Setting topCities from fallback:', sorted);
        setTopCities(sorted);
      }
    } catch (error) {
      console.error('🏙️ Failed to fetch top cities:', error);
    } finally {
      setLoading(false);
    }
  };

  return { topCities, loading, refetch: fetchTopCities };
}
