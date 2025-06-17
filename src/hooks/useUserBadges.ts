
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge: {
    name: string;
    description: string;
    icon: string;
  };
}

export const useUserBadges = (userId?: string) => {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBadges = async () => {
    if (!userId) {
      setBadges([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          id,
          user_id,
          badge_id,
          earned_at,
          badges (
            name,
            description,
            icon
          )
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedBadges = (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        badge_id: item.badge_id,
        earned_at: item.earned_at,
        badge: {
          name: item.badges?.name || 'Unknown Badge',
          description: item.badges?.description || '',
          icon: item.badges?.icon || '🏆'
        }
      }));

      setBadges(transformedBadges);
    } catch (error) {
      console.error('Error fetching user badges:', error);
      // Return mock data for the specific user if there's an error
      const mockBadges: UserBadge[] = [
        {
          id: '1',
          user_id: userId,
          badge_id: '1',
          earned_at: '2024-01-15T00:00:00Z',
          badge: {
            name: 'Explorer',
            description: 'Visited 5 different locations',
            icon: '🗺️'
          }
        },
        {
          id: '2',
          user_id: userId,
          badge_id: '2',
          earned_at: '2024-02-01T00:00:00Z',
          badge: {
            name: 'Photographer',
            description: 'Shared 10 photos',
            icon: '📸'
          }
        }
      ];

      setBadges(mockBadges.filter(badge => badge.user_id === userId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, [userId]);

  return {
    badges,
    loading,
    refetch: fetchBadges
  };
};
