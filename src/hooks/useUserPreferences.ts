
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserPreference {
  category: string;
  search_count: number;
}

export const useUserPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreference[]>([]);

  useEffect(() => {
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
  }, [user]);

  const updatePreference = async (category: string) => {
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

      // Refresh preferences
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
  };

  return { preferences, updatePreference };
};
