import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchHistoryItem {
  id: string;
  search_query: string;
  search_type: string;
  searched_at: string;
  avatar_url?: string;
  username?: string;
  target_user_id?: string;
  has_active_story?: boolean;
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
        .order('searched_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Build lookup sets from history
      const uniqueUserIds = Array.from(
        new Set((historyData || []).map(h => h.target_user_id).filter(Boolean) as string[])
      );
      const fallbackUsernames = Array.from(
        new Set((historyData || []).filter(h => !h.target_user_id && h.search_query).map(h => h.search_query))
      );

      // Fetch profiles by ID
      const { data: profilesById } = uniqueUserIds.length > 0 ? await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', uniqueUserIds) : { data: [] as any[] } as any;

      // Fetch profiles by username (fallback)
      const { data: profilesByName } = fallbackUsernames.length > 0 ? await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('username', fallbackUsernames) : { data: [] as any[] } as any;

      const byId = new Map((profilesById || []).map((p: any) => [p.id, p]));
      const byName = new Map((profilesByName || []).map((p: any) => [p.username, p]));

      // Determine which users have active stories in last 24h
      const storyIds = Array.from(new Set([...(profilesById || []).map((p: any) => p.id), ...(profilesByName || []).map((p: any) => p.id)]));
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentStories } = storyIds.length > 0 ? await supabase
        .from('stories')
        .select('user_id')
        .in('user_id', storyIds)
        .gt('created_at', dayAgo) : { data: [] as any[] } as any;
      const usersWithStories = new Set((recentStories || []).map((s: any) => s.user_id));

      // Map history in order, enriched with profile data and story flag
      const enrichedHistory = (historyData || []).map((h) => {
        const profile = h.target_user_id ? byId.get(h.target_user_id) : byName.get(h.search_query);
        if (!profile) {
          return {
            id: h.id,
            search_query: h.search_query,
            search_type: h.search_type,
            searched_at: h.searched_at,
          } as SearchHistoryItem;
        }
        return {
          id: h.id,
          search_query: profile.username || h.search_query,
          search_type: h.search_type,
          searched_at: h.searched_at,
          avatar_url: profile.avatar_url || undefined,
          username: profile.username || undefined,
          target_user_id: profile.id,
          has_active_story: usersWithStories.has(profile.id)
        } as SearchHistoryItem;
      });

      setSearchHistory(enrichedHistory);
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
