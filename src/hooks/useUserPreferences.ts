
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UserPreference {
  category: string;
  search_count: number;
}

export const useUserPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreference[]>([]);

  useEffect(() => {
    // Demo data for now
    const demoPreferences: UserPreference[] = [
      { category: 'pizza', search_count: 5 },
      { category: 'coffee', search_count: 3 },
      { category: 'museums', search_count: 2 }
    ];
    setPreferences(demoPreferences);

    // Uncomment for production
    /*
    const fetchPreferences = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from('user_preferences')
          .select('category, search_count')
          .eq('user_id', user.id)
          .order('search_count', { ascending: false })
          .limit(5);

        if (data) {
          setPreferences(data);
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error);
      }
    };

    fetchPreferences();
    */
  }, [user]);

  const updatePreference = async (category: string) => {
    // Update local state for demo
    setPreferences(prev => {
      const existing = prev.find(p => p.category === category);
      if (existing) {
        return prev.map(p => 
          p.category === category 
            ? { ...p, search_count: p.search_count + 1 }
            : p
        ).sort((a, b) => b.search_count - a.search_count);
      } else {
        return [{ category, search_count: 1 }, ...prev].slice(0, 5);
      }
    });

    // Uncomment for production
    /*
    if (!user) return;

    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          category,
          search_count: 1,
          last_searched: new Date().toISOString()
        }, {
          onConflict: 'user_id,category'
        });

      const { data } = await supabase
        .from('user_preferences')
        .select('category, search_count')
        .eq('user_id', user.id)
        .order('search_count', { ascending: false })
        .limit(5);

      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error updating preference:', error);
    }
    */
  };

  return { preferences, updatePreference };
};
