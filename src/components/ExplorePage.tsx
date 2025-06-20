import React, { useState, useEffect } from 'react';
import { Search, MapPin, Users, Filter, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchHeader from './explore/SearchHeader';
import SearchResults from './explore/SearchResults';
import RecommendationsSection from './explore/RecommendationsSection';
import CategoryFilter, { CategoryType } from './explore/CategoryFilter';
import { Place } from '@/types/place';
import { searchService } from '@/services/searchService';
import { backendService } from '@/services/backendService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type SortBy = 'proximity' | 'likes' | 'saves' | 'following' | 'recent';

const ExplorePage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'locations' | 'users'>('locations');
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('proximity');
  const [filters, setFilters] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>(['all']);
  const [locationRecommendations, setLocationRecommendations] = useState<any[]>([]);
  const [userRecommendations, setUserRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);

  // Load real backend data
  useEffect(() => {
    const loadRecommendations = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Get real location recommendations
        const locations = await searchService.getLocationRecommendations(user.id);
        setLocationRecommendations(locations);

        // Get real user recommendations
        const users = await searchService.getUserRecommendations(user.id);
        setUserRecommendations(users);
      } catch (error) {
        console.error('Error loading recommendations:', error);
        // Fallback to empty arrays
        setLocationRecommendations([]);
        setUserRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [user]);

  // Filter recommendations by category
  useEffect(() => {
    if (selectedCategories.includes('all')) {
      // Show all recommendations
      return;
    }

    const filteredRecs = locationRecommendations.filter(place => 
      selectedCategories.some(cat => 
        place.category?.toLowerCase().includes(cat.toLowerCase())
      )
    );
    
    // Update filtered recommendations without changing state to avoid infinite loop
    // This filtering will be handled in the RecommendationsSection component
  }, [selectedCategories, locationRecommendations]);

  // Search for real data
  const performSearch = async (query: string) => {
    if (!user || !query.trim()) return { locations: [], users: [] };

    try {
      if (searchMode === 'locations') {
        const locations = await backendService.searchLocations(query);
        return { locations, users: [] };
      } else {
        // Search users
        const { data: users, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .or(`username.ilike.%${query}%, full_name.ilike.%${query}%`)
          .limit(20);

        if (error) throw error;
        return { 
          locations: [], 
          users: users?.map(user => ({
            id: user.id,
            name: user.full_name || user.username || 'User',
            username: user.username || `@${user.id.substring(0, 8)}`,
            avatar: user.avatar_url || 'photo-1472099645785-5658abf4ff4e',
            is_following: false
          })) || []
        };
      }
    } catch (error) {
      console.error('Search error:', error);
      return { locations: [], users: [] };
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      const results = await performSearch(query);
      setFilteredLocations(results.locations);
      setFilteredUsers(results.users);
      
      // Save search history
      if (user) {
        await searchService.saveSearchHistory(user.id, query, searchMode);
      }
      
      setTimeout(() => setIsSearching(false), 500);
    } else {
      setFilteredLocations([]);
      setFilteredUsers([]);
    }
  };

  const handleCardClick = (place: any) => {
    console.log('Card clicked:', place.name);
  };

  const handleShare = (place: any) => {
    console.log('Share place:', place.name);
  };

  const handleComment = (place: any) => {
    console.log('Comment on place:', place.name);
  };

  const handleUserClick = (user: any) => {
    console.log('User clicked:', user.name);
  };

  const handleFollowUser = async (userId: string) => {
    if (!user) return;
    
    try {
      // Check if already following
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();

      if (existingFollow) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: userId
          });
      }

      // Refresh user recommendations
      const users = await searchService.getUserRecommendations(user.id);
      setUserRecommendations(users);
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleMessageUser = (userId: string) => {
    console.log('Message user:', userId);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredLocations([]);
    setFilteredUsers([]);
  };

  // Handle category changes properly for multiple selection mode
  const handleCategoriesChange = (categories: CategoryType[]) => {
    setSelectedCategories(categories);
  };

  const isSearchActive = searchQuery.trim().length > 0;
  
  // Fix getResultsCount to handle array properly
  const getResultsCount = () => {
    const safeSelectedCategories = Array.isArray(selectedCategories) ? selectedCategories : ['all'];
    
    if (!safeSelectedCategories.includes('all')) {
      const filtered = locationRecommendations.filter(place => 
        safeSelectedCategories.some(cat => 
          place.category?.toLowerCase().includes(cat.toLowerCase())
        )
      );
      return filtered.length;
    }
    return searchMode === 'locations' ? locationRecommendations.length : userRecommendations.length;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pt-16">
      {/* Search Header */}
      <SearchHeader
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearch}
        searchMode={searchMode}
        onSearchModeChange={setSearchMode}
        onClearSearch={clearSearch}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Category Filter - Only show for locations */}
      {searchMode === 'locations' && !isSearchActive && (
        <CategoryFilter
          selectedCategories={selectedCategories}
          onCategoriesChange={handleCategoriesChange}
        />
      )}

      {/* Results Count */}
      {searchMode === 'locations' && !isSearchActive && (
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {getResultsCount()} place{getResultsCount() !== 1 ? 's' : ''} found
            </span>
            <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SlidersHorizontal className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proximity">Nearby</SelectItem>
                <SelectItem value="likes">Most Liked</SelectItem>
                <SelectItem value="saves">Most Saved</SelectItem>
                <SelectItem value="recent">Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {isSearchActive ? (
        /* Search Results View */
        <SearchResults
          searchMode={searchMode}
          sortBy={sortBy}
          filteredLocations={filteredLocations}
          filteredUsers={filteredUsers}
          isSearching={isSearching}
          onCardClick={handleCardClick}
          onUserClick={handleUserClick}
          onFollowUser={handleFollowUser}
          onMessageUser={handleMessageUser}
        />
      ) : (
        /* Discover View - Only show recommendations */
        <div className="flex-1 overflow-y-auto">
          <RecommendationsSection
            searchMode={searchMode}
            loading={loading}
            locationRecommendations={locationRecommendations}
            userRecommendations={userRecommendations}
            selectedCategories={selectedCategories}
            onLocationClick={handleCardClick}
            onUserClick={handleUserClick}
            onFollowUser={handleFollowUser}
            onLocationShare={handleShare}
            onLocationComment={handleComment}
            onLocationLike={(placeId: string) => console.log('Like place:', placeId)}
            likedPlaces={new Set()}
            onMessageUser={handleMessageUser}
          />
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
