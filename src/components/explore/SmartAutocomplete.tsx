
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, User, Clock, TrendingUp, Coffee, Utensils, ShoppingBag, Building2, Church, Dumbbell, Music, BookOpen, Landmark, Hotel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { supabase } from '@/integrations/supabase/client';

interface AutocompleteResult {
  type: 'place' | 'user';
  id: string;
  title: string;
  subtitle: string;
  image?: string;
  category?: string;
}

interface SmartAutocompleteProps {
  query: string;
  searchMode: 'locations' | 'users';
  onResultSelect: (result: AutocompleteResult) => void;
  onRecentSelect: (search: string) => void;
  visible: boolean;
}

// Category icon mapping
const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('cafe') || cat.includes('coffee')) return Coffee;
  if (cat.includes('restaurant') || cat.includes('food')) return Utensils;
  if (cat.includes('shop') || cat.includes('store')) return ShoppingBag;
  if (cat.includes('museum') || cat.includes('gallery')) return Landmark;
  if (cat.includes('church') || cat.includes('temple')) return Church;
  if (cat.includes('gym') || cat.includes('fitness')) return Dumbbell;
  if (cat.includes('bar') || cat.includes('club') || cat.includes('music')) return Music;
  if (cat.includes('library') || cat.includes('bookstore')) return BookOpen;
  if (cat.includes('hotel') || cat.includes('accommodation')) return Hotel;
  if (cat.includes('building') || cat.includes('office')) return Building2;
  return MapPin;
};

const SmartAutocomplete = ({
  query,
  searchMode,
  onResultSelect,
  onRecentSelect,
  visible
}: SmartAutocompleteProps) => {
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load recent and trending searches
  useEffect(() => {
    if (user && visible) {
      loadRecentSearches();
      loadTrendingSearches();
      trackEvent('search_autocomplete_shown', { search_mode: searchMode });
    }
  }, [user, visible, searchMode, trackEvent]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim()) {
      setLoading(true);
      debounceRef.current = setTimeout(() => {
        performSearch(query);
      }, 150); // Faster response for better UX
    } else {
      setResults([]);
      setLoading(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchMode]);

  const loadRecentSearches = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('search_history')
        .select('search_query')
        .eq('user_id', user.id)
        .eq('search_type', searchMode)
        .order('searched_at', { ascending: false })
        .limit(5);

      if (data) {
        setRecentSearches(data.map(item => item.search_query));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const loadTrendingSearches = async () => {
    try {
      const { data } = await supabase
        .from('search_history')
        .select('search_query')
        .eq('search_type', searchMode)
        .gte('searched_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(100);

      if (data) {
        // Count frequency and get top 5
        const frequency: { [key: string]: number } = {};
        data.forEach(item => {
          frequency[item.search_query] = (frequency[item.search_query] || 0) + 1;
        });

        const trending = Object.entries(frequency)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([query]) => query);

        setTrendingSearches(trending);
      }
    } catch (error) {
      console.error('Error loading trending searches:', error);
    }
  };

  const performSearch = async (searchQuery: string) => {
    try {
      if (searchMode === 'locations') {
        const { data } = await supabase
          .from('locations')
          .select('id, name, category, city, country')
          .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
          .limit(5);

        if (data) {
          const locationResults: AutocompleteResult[] = data.map(location => ({
            type: 'place' as const,
            id: location.id,
            title: location.name,
            subtitle: `${location.category} • ${location.city}, ${location.country}`,
            category: location.category
          }));
          setResults(locationResults);
        }
      } else {
        // SECURITY FIX: Only search by username, select safe fields
        const { data } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .or(`username.ilike.%${searchQuery}%`)
          .limit(5);

        if (data) {
          const userResults: AutocompleteResult[] = data.map(profile => ({
            type: 'user' as const,
            id: profile.id,
            title: profile.username || 'User', // SECURITY: Don't expose full names
            subtitle: `@${profile.username || profile.id.substring(0, 8)}`,
            image: profile.avatar_url
          }));
          setResults(userResults);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-gray-900 rounded px-0.5">
          {part}
        </mark>
      ) : part
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-teal-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleResultClick = (result: AutocompleteResult) => {
    trackEvent('search_result_clicked', { 
      result_type: result.type, 
      result_id: result.id,
      result_title: result.title 
    });
    onResultSelect(result);
  };

  const handleRecentClick = (search: string) => {
    trackEvent('recent_clicked', { search_query: search, search_mode: searchMode });
    onRecentSelect(search);
  };

  const handleTrendingClick = (search: string) => {
    trackEvent('trending_clicked', { search_query: search, search_mode: searchMode });
    onRecentSelect(search);
  };

  if (!visible) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-[60] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl mt-2 max-h-96 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
      {/* Search Results */}
      {query.trim() && (
        <div className="p-3">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-6 h-6 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-sm text-gray-600 dark:text-gray-300">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 px-2 uppercase tracking-wide">Results</div>
              <div className="space-y-1">
                {results.map((result) => {
                  const CategoryIcon = result.category ? getCategoryIcon(result.category) : MapPin;
                  return (
                    <Button
                      key={result.id}
                      variant="ghost"
                      className="w-full justify-start text-left h-auto p-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all group"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {result.type === 'user' ? (
                          <Avatar className="w-10 h-10 ring-2 ring-white dark:ring-gray-800 group-hover:ring-blue-200 dark:group-hover:ring-blue-700 transition-all">
                            <AvatarImage src={result.image} />
                            <AvatarFallback className={`${getAvatarColor(result.title)} text-white text-sm font-semibold`}>
                              {getInitials(result.title)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                            <CategoryIcon className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                            {highlightMatch(result.title, query)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {highlightMatch(result.subtitle, query)}
                          </div>
                        </div>
                        {result.category && (
                          <Badge variant="secondary" className="ml-2 text-xs shrink-0 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-0">
                            {result.category.split(' ')[0]}
                          </Badge>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">No results found</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                {searchMode === 'locations' 
                  ? "Try searching for cafes, restaurants, or specific place names"
                  : "Try searching for usernames"
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Searches */}
      {!query.trim() && recentSearches.length > 0 && (
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 px-2 flex items-center gap-2 uppercase tracking-wide">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Recent
          </div>
          <div className="flex flex-wrap gap-2 px-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => handleRecentClick(search)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white text-xs font-medium rounded-full hover:shadow-lg hover:scale-105 transition-all duration-200 active:scale-95"
              >
                <Clock className="w-3 h-3" />
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trending Searches */}
      {!query.trim() && trendingSearches.length > 0 && (
        <div className="p-3">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 px-2 flex items-center gap-2 uppercase tracking-wide">
            <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            Trending
          </div>
          <div className="flex flex-wrap gap-2 px-2">
            {trendingSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => handleTrendingClick(search)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300 text-xs font-medium rounded-full hover:shadow-md hover:scale-105 hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-200 active:scale-95"
              >
                <TrendingUp className="w-3 h-3" />
                {search}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartAutocomplete;
