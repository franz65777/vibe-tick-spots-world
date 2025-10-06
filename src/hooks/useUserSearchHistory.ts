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
      // Get user search history with target_user_id
      const { data: historyData, error } = await supabase
        .from('search_history')
        .select('id, search_query, search_type, searched_at, target_user_id')
        .eq('user_id', user.id)
        .eq('search_type', 'users')
        .not('target_user_id', 'is', null)
        .order('searched_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get unique target_user_ids
      const uniqueUserIds = Array.from(
        new Set((historyData || []).map(h => h.target_user_id).filter(Boolean))
      );

      if (uniqueUserIds.length === 0) {
        setSearchHistory([]);
        return;
      }

      // Fetch profiles by ID
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', uniqueUserIds);

      if (!profiles) {
        setSearchHistory([]);
        return;
      }

      // Map history with profile data
      const enrichedHistory = profiles.slice(0, 5).map(profile => {
        const historyItem = historyData?.find(h => h.target_user_id === profile.id);
        if (!historyItem) return null;
        return {
          id: historyItem.id,
          search_query: profile.username || historyItem.search_query,
          search_type: historyItem.search_type,
          searched_at: historyItem.searched_at,
          avatar_url: profile.avatar_url || undefined
        };
      });

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
