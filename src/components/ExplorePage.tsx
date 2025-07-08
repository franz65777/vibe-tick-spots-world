import React, { useState, useEffect } from 'react';
import { Search, MapPin, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchService } from '@/services/searchService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import EnhancedLocationCard from './explore/EnhancedLocationCard';
import NoResults from './explore/NoResults';
import UserCard from './explore/UserCard';
import LocationDetailModal from './explore/LocationDetailModal';

const ExplorePage = () => {
  const {
    user
  } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'locations' | 'users'>('locations');
  const [isSearching, setIsSearching] = useState(false);
  const [locationRecommendations, setLocationRecommendations] = useState<any[]>([]);
  const [userRecommendations, setUserRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const handleAddLocation = () => {
    console.log('Navigate to add location');
  };

  // Load ALL locations with posts - IMPROVED DEDUPLICATION
  useEffect(() => {
    const loadRecommendations = async () => {
      if (!user) return;
      setLoading(true);
      try {
        console.log('🔍 Loading UNIQUE locations with posts...');
        const locations = await searchService.getLocationRecommendations(user.id);
        console.log('✅ Loaded DEDUPLICATED location recommendations:', locations.length);
        setLocationRecommendations(locations);
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

  // Search for real data
  const performSearch = async (query: string) => {
    if (!user || !query.trim()) return {
      locations: [],
      users: []
    };
    try {
      if (searchMode === 'locations') {
        console.log('🔍 Searching locations with posts...');
        const {
          data: locations,
          error
        } = await supabase.from('locations').select(`
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
          `).or(`name.ilike.%${query}%, address.ilike.%${query}%, city.ilike.%${query}%`).not('posts', 'is', null).limit(20);
        if (error) throw error;
        
        // Group by google_place_id to ensure only 1 library per location
        const uniqueResults = new Map();
        locations?.forEach(location => {
          const key = location.google_place_id || `${location.latitude}-${location.longitude}`;
          if (!uniqueResults.has(key)) {
            const postCount = Array.isArray(location.posts) ? location.posts.length : 0;
            if (postCount > 0) {
              uniqueResults.set(key, {
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
        return {
          locations: Array.from(uniqueResults.values()),
          users: []
        };
      } else {
        const {
          data: users,
          error
        } = await supabase.from('profiles').select('id, username, full_name, avatar_url').or(`username.ilike.%${query}%, full_name.ilike.%${query}%`).limit(20);
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
      return {
        locations: [],
        users: []
      };
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
    setSelectedLocation(place);
    setIsLocationModalOpen(true);
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
    setFilteredLocations([]);
    setFilteredUsers([]);
  };
  const isSearchActive = searchQuery.trim().length > 0;
  const displayData = searchMode === 'locations' 
    ? (isSearchActive ? filteredLocations : locationRecommendations)
    : (isSearchActive ? filteredUsers : userRecommendations);
  return <div className="flex flex-col h-full bg-gray-50 pt-16">
      {/* Simplified Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="p-4">
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
            <Input type="text" placeholder={searchMode === 'locations' ? 'Search for cafes, restaurants, attractions...' : 'Search for people...'} value={searchQuery} onChange={e => handleSearch(e.target.value)} className="pl-12 pr-4 h-12 bg-gray-50 border-gray-200 focus:bg-white rounded-xl text-gray-900 placeholder-gray-500" />
            {searchQuery && <Button onClick={clearSearch} variant="ghost" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 rounded-full text-gray-500">
                ×
              </Button>}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading || isSearching ? <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600 font-medium">
                {isSearching ? 'Searching...' : 'Loading amazing places...'}
              </span>
            </div>
          </div> : <>
            {displayData.length > 0 && <div className="px-4 py-3 bg-white border-b border-gray-100">
                <span className="text-sm text-gray-600 font-medium">
                  {displayData.length} {searchMode === 'locations' ? 'place' : 'person'}{displayData.length !== 1 ? 's' : ''} found
                </span>
              </div>}

            {searchMode === 'locations' ? displayData.length > 0 ? <div className="pb-6">
                  {displayData.map(place => <EnhancedLocationCard key={place.id} place={place} onCardClick={handleCardClick} />)}
                </div> : <NoResults searchMode="locations" searchQuery={searchQuery} onAddLocation={handleAddLocation} /> : displayData.length > 0 ? <div className="space-y-3 px-4 pb-4">
                  {displayData.map(user => <UserCard key={user.id} user={user} onUserClick={handleUserClick} onFollowUser={handleFollowUser} onMessageUser={handleMessageUser} />)}
                </div> : <NoResults searchMode="users" searchQuery={searchQuery} />}
          </>}
      </div>

      {/* Floating Add Button */}
      {/* Location Detail Modal */}
      <LocationDetailModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        location={selectedLocation}
      />
    </div>;
};

export default ExplorePage;
