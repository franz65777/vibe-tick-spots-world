
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { searchService, SearchHistoryItem, LocationRecommendation, UserRecommendation } from '@/services/searchService';

export const useSearch = () => {
  const { user } = useAuth();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [locationRecommendations, setLocationRecommendations] = useState<LocationRecommendation[]>([]);
  const [userRecommendations, setUserRecommendations] = useState<UserRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [history, locationRecs, userRecs] = await Promise.all([
          searchService.getSearchHistory(user.id),
          searchService.getLocationRecommendations(user.id),
          searchService.getUserRecommendations(user.id)
        ]);

        setSearchHistory(history);
        setLocationRecommendations(locationRecs);
        setUserRecommendations(userRecs);
      } catch (err: any) {
        console.error('Error loading search data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Save search to history
  const saveSearch = async (query: string, type: 'locations' | 'users') => {
    if (!user || !query.trim()) return;

    try {
      await searchService.saveSearchHistory(user.id, query, type);
      
      // Add to local state
      const newSearch: SearchHistoryItem = {
        id: Date.now().toString(),
        search_query: query,
        search_type: type,
        searched_at: new Date().toISOString()
      };
      
      setSearchHistory(prev => [newSearch, ...prev.slice(0, 9)]);

      // Update user preferences if searching locations
      if (type === 'locations') {
        await searchService.updateUserPreferences(user.id, query);
      }
    } catch (err) {
      console.error('Error saving search:', err);
    }
  };

  // Get search suggestions from history
  const getSearchSuggestions = (query: string, type: 'locations' | 'users'): string[] => {
    if (!query.trim()) return [];
    
    return searchHistory
      .filter(item => 
        item.search_type === type && 
        item.search_query.toLowerCase().includes(query.toLowerCase()) &&
        item.search_query !== query
      )
      .map(item => item.search_query)
      .slice(0, 5);
  };

  // Refresh recommendations
  const refreshRecommendations = async () => {
    if (!user) return;

    try {
      const [locationRecs, userRecs] = await Promise.all([
        searchService.getLocationRecommendations(user.id),
        searchService.getUserRecommendations(user.id)
      ]);

      setLocationRecommendations(locationRecs);
      setUserRecommendations(userRecs);
    } catch (err) {
      console.error('Error refreshing recommendations:', err);
    }
  };

  return {
    searchHistory,
    locationRecommendations,
    userRecommendations,
    loading,
    error,
    saveSearch,
    getSearchSuggestions,
    refreshRecommendations
  };
};
