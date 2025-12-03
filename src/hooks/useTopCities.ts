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
    fetchTopCities();
  }, []);

  const fetchTopCities = async () => {
    setLoading(true);
    try {
      // Try edge function first for efficiency
      const { data, error } = await supabase.functions.invoke('trending-cities');
      
      if (!error && data?.cities) {
        setTopCities(data.cities.slice(0, 5).map((c: any) => ({
          city: c.city,
          count: c.total
        })));
        return;
      }

      // Fallback: query locations table directly
      const { data: locations } = await supabase
        .from('locations')
        .select('city')
        .not('city', 'is', null);

      if (locations) {
        const cityCounts = new Map<string, number>();
        for (const loc of locations) {
          if (loc.city) {
            cityCounts.set(loc.city, (cityCounts.get(loc.city) || 0) + 1);
          }
        }

        const sorted = Array.from(cityCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([city, count]) => ({ city, count }));

        setTopCities(sorted);
      }
    } catch (error) {
      console.error('Failed to fetch top cities:', error);
    } finally {
      setLoading(false);
    }
  };

  return { topCities, loading, refetch: fetchTopCities };
}
