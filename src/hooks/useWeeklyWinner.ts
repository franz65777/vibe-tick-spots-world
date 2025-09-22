import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WeeklyWinnerLocation {
  id: string;
  name: string;
  category: string;
  address?: string;
  image_url?: string;
  total_likes: number;
  total_saves: number;
  total_score: number;
}

export const useWeeklyWinner = (currentCity?: string) => {
  const [location, setLocation] = useState<WeeklyWinnerLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetchWeeklyWinner();
  }, [user, currentCity]);

  const fetchWeeklyWinner = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🏆 Fetching weekly winner location...');
      
      // Get current week start (Monday)
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (now.getDay() + 6) % 7);
      monday.setHours(0, 0, 0, 0);

      let query = supabase
        .from('locations')
        .select(`
          id,
          name,
          category,
          address,
          image_url,
          city,
          latitude,
          longitude,
          weekly_location_metrics!inner(
            likes_count,
            saves_count,
            visits_count
          )
        `)
        .gte('weekly_location_metrics.week_start', monday.toISOString())
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      // Filter by city if provided
      if (currentCity && currentCity !== 'Unknown City') {
        query = query.or(`city.ilike.%${currentCity}%,address.ilike.%${currentCity}%`);
      }

      const { data, error: queryError } = await query
        .order('weekly_location_metrics(likes_count)', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (queryError) {
        console.error('❌ Error fetching weekly winner:', queryError);
        throw queryError;
      }

      if (data?.weekly_location_metrics?.[0]) {
        const metrics = data.weekly_location_metrics[0];
        const winnerLocation: WeeklyWinnerLocation = {
          id: data.id,
          name: data.name,
          category: data.category,
          address: data.address,
          image_url: data.image_url,
          total_likes: metrics.likes_count || 0,
          total_saves: metrics.saves_count || 0,
          total_score: (metrics.likes_count || 0) * 2 + (metrics.saves_count || 0)
        };

        console.log('✅ Weekly winner found:', winnerLocation);
        setLocation(winnerLocation);
      } else {
        console.log('ℹ️ No weekly winner found');
        setLocation(null);
      }

    } catch (err: any) {
      console.error('❌ Error fetching weekly winner:', err);
      setError(err.message);
      setLocation(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    location,
    loading,
    error,
    refetch: fetchWeeklyWinner
  };
};