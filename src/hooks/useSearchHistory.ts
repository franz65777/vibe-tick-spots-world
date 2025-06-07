
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
          const formattedData = data.map(item => ({
            id: item.id,
            search_query: item.search_query,
            search_type: item.search_type as 'location' | 'user' | 'category',
            searched_at: item.searched_at
          }));
          setSearchHistory(formattedData);
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
        const formattedData = {
          id: data.id,
          search_query: data.search_query,
          search_type: data.search_type as 'location' | 'user' | 'category',
          searched_at: data.searched_at
        };
        setSearchHistory(prev => [formattedData, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      console.error('Error adding to search history:', error);
    }
  };

  return { searchHistory, addToSearchHistory };
};
