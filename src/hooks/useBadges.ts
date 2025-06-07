
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at?: string;
}

export const useBadges = () => {
  const { user } = useAuth();
  const [userBadges, setUserBadges] = useState<Badge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);

  useEffect(() => {
    const fetchBadges = async () => {
      if (!user) return;

      try {
        // Fetch user's earned badges
        const { data: earnedBadges } = await supabase
          .from('user_badges')
          .select(`
            earned_at,
            badges (
              id,
              name,
              description,
              icon
            )
          `)
          .eq('user_id', user.id);

        // Fetch all available badges
        const { data: badges } = await supabase
          .from('badges')
          .select('*');

        if (earnedBadges) {
          const formattedBadges = earnedBadges.map((item: any) => ({
            ...item.badges,
            earned_at: item.earned_at
          }));
          setUserBadges(formattedBadges);
        }

        if (badges) {
          setAllBadges(badges);
        }
      } catch (error) {
        console.error('Error fetching badges:', error);
      }
    };

    fetchBadges();
  }, [user]);

  return { userBadges, allBadges };
};
