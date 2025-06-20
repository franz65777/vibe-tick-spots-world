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

import EnhancedSearchHeader from './explore/EnhancedSearchHeader';
import EnhancedCategoryFilter from './explore/EnhancedCategoryFilter';
import EnhancedLocationCard from './explore/EnhancedLocationCard';
import NoResults from './explore/NoResults';
import UserCard from './explore/UserCard';

type SortBy = 'proximity' | 'likes' | 'saves' | 'following' | 'recent';

const ExplorePage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'locations' | 'users'>('locations');
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [filters, setFilters] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>(['all']);
  const [locationRecommendations, setLocationRecommendations] = useState<any[]>([]);
  const [userRecommendations, setUserRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);

  const handleAddLocation = () => {
    console.log('Navigate to add location');
  };

  // Load ALL locations with posts - NO LIMITS, ENSURE UNIQUE BY GOOGLE_PLACE_ID
  useEffect(() => {
    const loadRecommendations = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        console.log('🔍 Loading ALL locations with posts...');
        
        // Use the updated searchService method to get ALL locations with posts
        const locations = await searchService.getLocationRecommendations(user.id);
        
        console.log('✅ Loaded location recommendations:', locations.length);
        setLocationRecommendations(locations);

        // Get user recommendations
        const users = await searchService.getUserRecommendations(user.id);
        setUserRecommendations(users);
      } catch (error) {
        console.error('❌ Error loading recommendations:', error);
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

  // Search for real data - ENSURE UNIQUE RESULTS BY GOOGLE_PLACE_ID
  const performSearch = async (query: string) => {
    if (!user || !query.trim()) return { locations: [], users: [] };

    try {
      if (searchMode === 'locations') {
        console.log('🔍 Searching locations with posts...');
        
        // Search locations that have posts and match the query
        const { data: locations, error } = await supabase
          .from('locations')
          .select(`
            id,
            name,
            category,
            address,
            city,
            latitude,
            longitude,
            google_place_id,
            created_at,
            posts!inner(id)
          `)
          .or(`name.ilike.%${query}%, address.ilike.%${query}%, city.ilike.%${query}%`)
          .not('posts', 'is', null)
          .limit(20);

        if (error) throw error;

        // De-duplicate by google_place_id and ensure they have posts
        const uniqueResults = new Map();
        locations?.forEach(location => {
          if (location.google_place_id && !uniqueResults.has(location.google_place_id)) {
            const postCount = Array.isArray(location.posts) ? location.posts.length : 0;
            
            if (postCount > 0) {
              uniqueResults.set(location.google_place_id, {
                id: location.id,
                name: location.name,
                category: location.category,
                address: location.address,
                city: location.city || location.address?.split(',')[1]?.trim() || 'Unknown',
                coordinates: { 
                  lat: parseFloat(location.latitude?.toString() || '0'), 
                  lng: parseFloat(location.longitude?.toString() || '0') 
                },
                likes: 0,
                totalSaves: 0,
                visitors: [],
                isNew: false,
                distance: Math.random() * 5,
                google_place_id: location.google_place_id,
                postCount: postCount
              });
            }
          }
        });

        return { locations: Array.from(uniqueResults.values()), users: [] };
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
      console.error('❌ Search error:', error);
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
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();

      if (existingFollow) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: userId
          });
      }

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
      {/* Enhanced Search Header */}
      <EnhancedSearchHeader
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

      {/* Enhanced Category Filter - Only show for locations */}
      {searchMode === 'locations' && !isSearchActive && (
        <EnhancedCategoryFilter
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
        /* Enhanced Search Results View */
        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">Searching...</span>
              </div>
            </div>
          ) : (
            <>
              {(filteredLocations.length > 0 || filteredUsers.length > 0) && (
                <div className="px-4 py-3 bg-white border-b border-gray-100">
                  <span className="text-sm text-gray-600">
                    {searchMode === 'locations' ? filteredLocations.length : filteredUsers.length} results found
                  </span>
                </div>
              )}

              {searchMode === 'locations' ? (
                filteredLocations.length > 0 ? (
                  <div className="space-y-0 pb-4">
                    {filteredLocations.map((place) => (
                      <EnhancedLocationCard
                        key={place.id}
                        place={place}
                        onCardClick={handleCardClick}
                      />
                    ))}
                  </div>
                ) : (
                  <NoResults
                    searchMode="locations"
                    searchQuery={searchQuery}
                    onAddLocation={handleAddLocation}
                  />
                )
              ) : (
                filteredUsers.length > 0 ? (
                  <div className="space-y-3 px-4 pb-4">
                    {filteredUsers.map((user) => (
                      <UserCard
                        key={user.id}
                        user={user}
                        onUserClick={handleUserClick}
                        onFollowUser={handleFollowUser}
                        onMessageUser={handleMessageUser}
                      />
                    ))}
                  </div>
                ) : (
                  <NoResults
                    searchMode="users"
                    searchQuery={searchQuery}
                  />
                )
              )}
            </>
          )}
        </div>
      ) : (
        /* Discover View - Enhanced Recommendations */
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
