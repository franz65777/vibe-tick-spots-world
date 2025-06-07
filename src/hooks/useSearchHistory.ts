
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchHistoryItem {
  id: string;
  search_query: string;
  search_type: 'location' | 'user' | 'category';
  searched_at: string;
}

export const useSearchHistory = () => {
  const { user } = useAuth();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    const fetchSearchHistory = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from('search_history')
          .select('*')
          .eq('user_id', user.id)
          .order('searched_at', { ascending: false })
          .limit(10);

        if (data) {
          setSearchHistory(data);
        }
      } catch (error) {
        console.error('Error fetching search history:', error);
      }
    };

    fetchSearchHistory();
  }, [user]);

  const addToSearchHistory = async (query: string, type: 'location' | 'user' | 'category') => {
    if (!user || !query.trim()) return;

    try {
      const { data } = await supabase
        .from('search_history')
        .insert({
          user_id: user.id,
          search_query: query,
          search_type: type
        })
        .select()
        .single();

      if (data) {
        setSearchHistory(prev => [data, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      console.error('Error adding to search history:', error);
    }
  };

  return { searchHistory, addToSearchHistory };
};
