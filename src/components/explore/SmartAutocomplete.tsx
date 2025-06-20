
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, User, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
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

const SmartAutocomplete = ({
  query,
  searchMode,
  onResultSelect,
  onRecentSelect,
  visible
}: SmartAutocompleteProps) => {
  const { user } = useAuth();
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load recent and trending searches
  useEffect(() => {
    if (user && visible) {
      loadRecentSearches();
      loadTrendingSearches();
    }
  }, [user, visible]);

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
        const { data } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
          .limit(5);

        if (data) {
          const userResults: AutocompleteResult[] = data.map(profile => ({
            type: 'user' as const,
            id: profile.id,
            title: profile.full_name || profile.username || 'User',
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

  if (!visible) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-80 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
      {/* Search Results */}
      {query.trim() && (
        <div className="p-2">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-sm text-gray-600">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2 px-2">Search Results</div>
              {results.map((result) => (
                <Button
                  key={result.id}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto p-3 hover:bg-gray-50 rounded-lg"
                  onClick={() => onResultSelect(result)}
                >
                  <div className="flex items-center gap-3 w-full">
                    {result.type === 'user' ? (
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={result.image} />
                        <AvatarFallback className={`${getAvatarColor(result.title)} text-white text-xs font-semibold`}>
                          {getInitials(result.title)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {highlightMatch(result.title, query)}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {highlightMatch(result.subtitle, query)}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <div className="text-sm font-medium mb-1">No results found</div>
              <div className="text-xs">
                {searchMode === 'locations' 
                  ? "Try searching for cafes, restaurants, or specific place names"
                  : "Try searching for usernames or full names"
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Searches */}
      {!query.trim() && recentSearches.length > 0 && (
        <div className="p-2 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2 px-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Recent
          </div>
          <div className="flex flex-wrap gap-1">
            {recentSearches.map((search, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer hover:bg-gray-200 text-xs transition-colors"
                onClick={() => onRecentSelect(search)}
              >
                {search}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Trending Searches */}
      {!query.trim() && trendingSearches.length > 0 && (
        <div className="p-2">
          <div className="text-xs font-medium text-gray-500 mb-2 px-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Trending
          </div>
          <div className="flex flex-wrap gap-1">
            {trendingSearches.map((search, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-gray-50 text-xs transition-colors"
                onClick={() => onRecentSelect(search)}
              >
                {search}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartAutocomplete;
