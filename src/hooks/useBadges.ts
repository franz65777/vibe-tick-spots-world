
import { useState, useEffect } from 'react';
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
    // Demo data for now
    const demoBadges: Badge[] = [
      {
        id: '1',
        name: 'Explorer',
        description: 'Visited 5 different cities',
        icon: '🌍',
        earned_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Foodie',
        description: 'Saved 10 restaurants',
        icon: '🍽️',
        earned_at: new Date().toISOString()
      }
    ];

    const allDemoBadges: Badge[] = [
      ...demoBadges,
      {
        id: '3',
        name: 'Social Butterfly',
        description: 'Has 50 followers',
        icon: '🦋'
      },
      {
        id: '4',
        name: 'Pioneer',
        description: 'First to discover 3 new places',
        icon: '🏴‍☠️'
      }
    ];

    setUserBadges(demoBadges);
    setAllBadges(allDemoBadges);

    // Uncomment for production
    /*
    const fetchBadges = async () => {
      if (!user) return;

      try {
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
    */
  }, [user]);

  return { userBadges, allBadges };
};
