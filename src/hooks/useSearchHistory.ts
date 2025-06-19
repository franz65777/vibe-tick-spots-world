
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { backendService } from '@/services/backendService';

interface SearchHistoryItem {
  id: string;
  search_query: string;
  search_type: 'locations' | 'users';
  searched_at: string;
}

export const useSearchHistory = () => {
  const { user } = useAuth();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const config = backendService.getConfig();

  const loadSearchHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (!config.enableRealDatabase) {
        // Demo mode
        const demoHistory: SearchHistoryItem[] = [
          { id: '1', search_query: 'coffee shops', search_type: 'locations', searched_at: new Date(Date.now() - 86400000).toISOString() },
          { id: '2', search_query: 'restaurants', search_type: 'locations', searched_at: new Date(Date.now() - 172800000).toISOString() },
          { id: '3', search_query: 'john doe', search_type: 'users', searched_at: new Date(Date.now() - 259200000).toISOString() },
        ];
        setSearchHistory(demoHistory);
        return;
      }

      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user.id)
        .order('searched_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Type cast the data to ensure search_type is properly typed
      const typedData: SearchHistoryItem[] = (data || []).map(item => ({
        id: item.id,
        search_query: item.search_query,
        search_type: item.search_type as 'locations' | 'users',
        searched_at: item.searched_at
      }));

      setSearchHistory(typedData);
    } catch (error) {
      console.error('Error loading search history:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToSearchHistory = async (query: string, type: 'locations' | 'users') => {
    if (!user || !query.trim()) return;

    try {
      if (!config.enableRealDatabase) {
        // Demo mode - just add to local state
        const newItem: SearchHistoryItem = {
          id: Date.now().toString(),
          search_query: query.trim(),
          search_type: type,
          searched_at: new Date().toISOString()
        };
        setSearchHistory(prev => [newItem, ...prev.slice(0, 9)]);
        return;
      }

      const { error } = await supabase
        .from('search_history')
        .insert({
          user_id: user.id,
          search_query: query.trim(),
          search_type: type
        });

      if (error) throw error;

      // Refresh history
      await loadSearchHistory();
    } catch (error) {
      console.error('Error adding to search history:', error);
    }
  };

  const clearSearchHistory = async () => {
    if (!user) return;

    try {
      if (!config.enableRealDatabase) {
        // Demo mode
        setSearchHistory([]);
        return;
      }

      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setSearchHistory([]);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadSearchHistory();
    }
  }, [user]);

  return {
    searchHistory,
    loading,
    addToSearchHistory,
    clearSearchHistory,
    refreshHistory: loadSearchHistory
  };
};
