
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchHistoryItem {
  id: string;
  search_query: string;
  search_type: 'location' | 'user';
  searched_at: string;
}

export const useSearchHistory = () => {
  const { user } = useAuth();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSearchHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user.id)
        .order('searched_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSearchHistory(data || []);
    } catch (error) {
      console.error('Error fetching search history:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSearchHistory = async (query: string, type: 'location' | 'user') => {
    if (!user || !query.trim()) return;

    try {
      const { error } = await supabase
        .from('search_history')
        .insert({
          user_id: user.id,
          search_query: query.trim(),
          search_type: type
        });

      if (error) throw error;
      
      // Refresh the history
      await fetchSearchHistory();
    } catch (error) {
      console.error('Error adding search history:', error);
    }
  };

  const clearSearchHistory = async (type?: 'location' | 'user') => {
    if (!user) return;

    try {
      let query = supabase
        .from('search_history')
        .delete()
        .eq('user_id', user.id);

      if (type) {
        query = query.eq('search_type', type);
      }

      const { error } = await query;
      if (error) throw error;
      
      await fetchSearchHistory();
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSearchHistory();
    }
  }, [user]);

  return {
    searchHistory,
    loading,
    addSearchHistory,
    clearSearchHistory,
    refetch: fetchSearchHistory
  };
};
