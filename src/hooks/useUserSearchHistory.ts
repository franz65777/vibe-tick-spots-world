import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchHistoryItem {
  id: string;
  search_query: string;
  search_type: string;
  searched_at: string;
  avatar_url?: string;
}

export const useUserSearchHistory = () => {
  const { user } = useAuth();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSearchHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get unique user search history
      const { data: historyData, error } = await supabase
        .from('search_history')
        .select('id, search_query, search_type, searched_at')
        .eq('user_id', user.id)
        .eq('search_type', 'users')
        .order('searched_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get unique usernames only
      const uniqueUsernames = Array.from(
        new Set((historyData || []).map(h => h.search_query))
      );

      // Fetch profile data for each unique username
      const enrichedHistory = await Promise.all(
        uniqueUsernames.slice(0, 5).map(async (username) => {
          const historyItem = historyData?.find(h => h.search_query === username);
          if (!historyItem) return null;

          // Get profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('username', username)
            .single();

          return {
            ...historyItem,
            avatar_url: profileData?.avatar_url || undefined
          };
        })
      );

      setSearchHistory(enrichedHistory.filter(Boolean) as SearchHistoryItem[]);
    } catch (error) {
      console.error('Error fetching search history:', error);
      setSearchHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteSearchHistoryItem = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Refresh the list
      await fetchSearchHistory();
    } catch (error) {
      console.error('Error deleting search history:', error);
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
    fetchSearchHistory,
    deleteSearchHistoryItem
  };
};
