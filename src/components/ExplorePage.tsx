import React, { useState, useEffect } from 'react';
import { Search, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchService } from '@/services/searchService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import NoResults from './explore/NoResults';
import UserCard from './explore/UserCard';
import LocationDetailModal from './explore/LocationDetailModal';
import LocationGrid from './explore/LocationGrid';
import CommunityChampions from './home/CommunityChampions';
import { useCommunityChampions } from '@/hooks/useCommunityChampions';
import SimpleCategoryFilter from './explore/SimpleCategoryFilter';
import { AllowedCategory } from '@/utils/allowedCategories';
import RecentUserSearches from './explore/RecentUserSearches';

const ExplorePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'locations' | 'users'>('locations');
  const [isSearching, setIsSearching] = useState(false);
  const [userRecommendations, setUserRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [currentCity, setCurrentCity] = useState<string>('Unknown City');
  const [selectedCategory, setSelectedCategory] = useState<AllowedCategory | null>(null);
  const { champions } = useCommunityChampions(currentCity);

  // Load user recommendations only
  useEffect(() => {
    const loadUserRecommendations = async () => {
      if (!user || searchMode !== 'users') return;
      setLoading(true);
      try {
        const users = await searchService.getUserRecommendations(user.id);
        setUserRecommendations(users);
      } catch (error) {
        console.error('❌ Error loading user recommendations:', error);
        setUserRecommendations([]);
      } finally {
        setLoading(false);
      }
    };
    loadUserRecommendations();
  }, [user, searchMode]);

  // Search for users only
  const performSearch = async (query: string) => {
    if (!user || !query.trim() || searchMode !== 'users') return {
      users: []
    };
    try {
      const {
        data: users,
        error
      } = await supabase.from('profiles').select('id, username, avatar_url').or(`username.ilike.%${query}%`).limit(20);
      if (error) throw error;
      return {
        users: users?.map(user => ({
          id: user.id,
          name: user.username || 'User',
          username: user.username || `@${user.id.substring(0, 8)}`,
          avatar: user.avatar_url || 'photo-1472099645785-5658abf4ff4e',
          is_following: false
        })) || []
      };
    } catch (error) {
      console.error('❌ Search error:', error);
      return {
        users: []
      };
    }
  };
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim() && searchMode === 'users') {
      setIsSearching(true);
      const results = await performSearch(query);
      setFilteredUsers(results.users);
      if (user) {
        await searchService.saveSearchHistory(user.id, query, searchMode);
      }
      setTimeout(() => setIsSearching(false), 500);
    } else {
      setFilteredUsers([]);
    }
  };
  const handleCardClick = (place: any) => {
    console.log('Card clicked:', place.name);
    setSelectedLocation(place);
    setIsLocationModalOpen(true);
  };
  const handleShare = (place: any) => {
    console.log('Share place:', place.name);
  };
  const handleComment = (place: any) => {
    console.log('Comment on place:', place.name);
  };
  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };
  const handleFollowUser = async (userId: string) => {
    if (!user) return;
    try {
      const {
        data: existingFollow
      } = await supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', userId).maybeSingle();
      if (existingFollow) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId);
      } else {
        await supabase.from('follows').insert({
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
    setFilteredUsers([]);
  };
  const isSearchActive = searchQuery.trim().length > 0;
  const displayUsers = isSearchActive ? filteredUsers : userRecommendations;
  return <div className="flex flex-col h-full bg-gray-50">
      {/* Simplified Header */}
      <div className="bg-white border-b border-gray-200 pt-12">
        <div className="p-4 pt-2">
          {/* Search Mode Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
            <button onClick={() => setSearchMode('locations')} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${searchMode === 'locations' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              <MapPin className="w-4 h-4" />
              Places
            </button>
            <button onClick={() => setSearchMode('users')} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${searchMode === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              <Users className="w-4 h-4" />
              People
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input 
              type="text" 
              placeholder={searchMode === 'locations' ? 'Search for cafes, restaurants, attractions...' : 'Search for people...'} 
              value={searchQuery} 
              onChange={e => handleSearch(e.target.value)} 
              className="pl-12 pr-4 h-12 bg-gray-50 border-gray-200 focus:bg-white rounded-xl text-gray-900 placeholder-gray-500" 
            />
            {searchQuery && <Button onClick={clearSearch} variant="ghost" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 rounded-full text-gray-500">
                ×
              </Button>}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading || isSearching ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600 font-medium">
                {isSearching ? 'Searching...' : 'Loading...'}
              </span>
            </div>
          </div>
        ) : (
          <>
            {searchMode === 'locations' ? (
              <>
                {/* Category Filter */}
                <div className="px-4 py-3 bg-white border-b border-gray-100">
                  <SimpleCategoryFilter
                    selectedCategory={selectedCategory}
                    onCategorySelect={setSelectedCategory}
                  />
                </div>

                {/* Location Grid */}
                <LocationGrid
                  searchQuery={searchQuery}
                  selectedCategory={selectedCategory}
                />
              </>
            ) : (
              <>
                {/* Recent Searches & Community Champions - Only in People mode */}
                {!isSearchActive && (
                  <div className="px-4 py-4 space-y-4">
                    <RecentUserSearches />
                    
                    {champions.length > 0 && (
                      <CommunityChampions 
                        champions={champions} 
                        onUserClick={handleUserClick}
                      />
                    )}
                  </div>
                )}

                {/* User Results */}
                {displayUsers.length > 0 ? (
                  <div className="space-y-3 px-4 pb-4">
                    {displayUsers.map(user => (
                      <UserCard 
                        key={user.id} 
                        user={user} 
                        onUserClick={() => handleUserClick(user.id)} 
                        onFollowUser={handleFollowUser} 
                        onMessageUser={handleMessageUser} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8">
                    {isSearchActive ? (
                      <NoResults searchMode="users" searchQuery={searchQuery} />
                    ) : (
                      <div className="mt-8">
                        <Button 
                          onClick={() => {/* TODO: Implement invite */}} 
                          variant="outline" 
                          size="sm"
                          className="w-full"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Invite Friends
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Location Detail Modal */}
      <LocationDetailModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        location={selectedLocation}
      />
    </div>;
};

export default ExplorePage;
