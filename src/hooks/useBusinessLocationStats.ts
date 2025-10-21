import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BusinessLocationStats {
  viewsCount: number;
  commentsCount: number;
  dailyGrowth: number;
}

export const useBusinessLocationStats = (locationId: string | null) => {
  const [stats, setStats] = useState<BusinessLocationStats>({
    viewsCount: 0,
    commentsCount: 0,
    dailyGrowth: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!locationId) {
      setStats({ viewsCount: 0, commentsCount: 0, dailyGrowth: 0 });
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch total views (from location_view_duration table)
        const { count: viewsCount } = await supabase
          .from('location_view_duration')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', locationId);

        // Fetch total comments on posts related to this location
        const { data: locationPosts } = await supabase
          .from('posts')
          .select('id')
          .eq('location_id', locationId);

        const postIds = locationPosts?.map(p => p.id) || [];
        let commentsCount = 0;
        
        if (postIds.length > 0) {
          const { count } = await supabase
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .in('post_id', postIds);
          commentsCount = count || 0;
        }

        // Calculate daily growth (today vs yesterday views)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const { count: todayViews } = await supabase
          .from('location_view_duration')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', locationId)
          .gte('viewed_at', today.toISOString());

        const { count: yesterdayViews } = await supabase
          .from('location_view_duration')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', locationId)
          .gte('viewed_at', yesterday.toISOString())
          .lt('viewed_at', today.toISOString());

        let dailyGrowth = 0;
        if (yesterdayViews && yesterdayViews > 0) {
          dailyGrowth = Math.round(((todayViews || 0) - yesterdayViews) / yesterdayViews * 100);
        } else if (todayViews && todayViews > 0) {
          dailyGrowth = 100; // 100% growth if we had 0 yesterday and something today
        }

        setStats({
          viewsCount: viewsCount || 0,
          commentsCount,
          dailyGrowth,
        });
      } catch (error) {
        console.error('Error fetching business location stats:', error);
        setStats({ viewsCount: 0, commentsCount: 0, dailyGrowth: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [locationId]);

  return { ...stats, loading };
};
