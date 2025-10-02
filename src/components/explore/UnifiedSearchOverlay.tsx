import React, { useState, useEffect } from 'react';
import { Search, MapPin, Users, X, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { searchService } from '@/services/searchService';
import { supabase } from '@/integrations/supabase/client';
import EnhancedLocationCardV2 from './EnhancedLocationCardV2';
import UserSearchResults from './UserSearchResults';
import { useNavigate } from 'react-router-dom';

interface SearchHistoryItem {
  id: string;
  search_query: string;
  searched_at: string;
}

interface UnifiedSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onCitySelect?: (city: string, coordinates: { lat: number; lng: number }) => void;
}

const UnifiedSearchOverlay = ({ isOpen, onClose, onCitySelect }: UnifiedSearchOverlayProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'places' | 'users'>('places');
  const [searching, setSearching] = useState(false);
  const [placeResults, setPlaceResults] = useState<any[]>([]);
  const [userResults, setUserResults] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [cityAutocomplete, setCityAutocomplete] = useState<any[]>([]);

  // Load recent searches and suggestions on mount
  useEffect(() => {
    if (user && isOpen) {
      loadRecentSearches();
      loadSuggestedUsers();
    }
  }, [user, isOpen]);

  // Perform search when query changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setPlaceResults([]);
        setUserResults([]);
        setCityAutocomplete([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, activeTab]);

  const loadRecentSearches = async () => {
    if (!user) return;
    try {
      const history = await searchService.getSearchHistory(user.id);
      setRecentSearches(history.slice(0, 5));
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const loadSuggestedUsers = async () => {
    if (!user) return;
    try {
      const users = await searchService.getUserRecommendations(user.id);
      setSuggestedUsers(users.slice(0, 5));
    } catch (error) {
      console.error('Error loading suggested users:', error);
    }
  };

  const performSearch = async () => {
    if (!user || !searchQuery.trim()) return;

    setSearching(true);
    try {
      if (activeTab === 'places') {
        // Search for places
        const { data: locations } = await supabase
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
            posts!inner(id, created_at)
          `)
          .or(`name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`)
          .not('posts', 'is', null)
          .limit(20);

        // Deduplicate by google_place_id
        const uniqueLocations = new Map();
        locations?.forEach(location => {
          const key = location.google_place_id || `${location.latitude}-${location.longitude}`;
          if (!uniqueLocations.has(key) || 
              uniqueLocations.get(key).posts.length < location.posts.length) {
            uniqueLocations.set(key, {
              id: location.id,
              name: location.name,
              category: location.category,
              address: location.address,
              city: location.city,
              coordinates: {
                lat: parseFloat(location.latitude?.toString() || '0'),
                lng: parseFloat(location.longitude?.toString() || '0')
              },
              google_place_id: location.google_place_id,
              postCount: location.posts?.length || 0,
              created_at: location.created_at
            });
          }
        });

        setPlaceResults(Array.from(uniqueLocations.values()));

        // Also search for cities for autocomplete
        const cityResults = await searchCities(searchQuery);
        setCityAutocomplete(cityResults);
      } else {
        // Search for users
        const { data: users } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, follower_count, following_count')
          .ilike('username', `%${searchQuery}%`)
          .not('username', 'is', null)
          .limit(20);

        setUserResults(users || []);
      }

      // Save search history
      const searchType = activeTab === 'places' ? 'locations' : 'users';
      await searchService.saveSearchHistory(user.id, searchQuery, searchType);
      await loadRecentSearches();
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const searchCities = async (query: string): Promise<any[]> => {
    // Mock city search - in production, use Google Places Autocomplete API
    const mockCities = [
      { name: 'Dublin', country: 'Ireland', lat: 53.3498, lng: -6.2603 },
      { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
      { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
      { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.0060 },
      { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
    ];

    return mockCities.filter(city => 
      city.name.toLowerCase().includes(query.toLowerCase())
    );
  };

  const handleCitySelect = (city: any) => {
    if (onCitySelect) {
      onCitySelect(city.name, { lat: city.lat, lng: city.lng });
    }
    onClose();
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
    onClose();
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
          .insert({ follower_id: user.id, following_id: userId });
      }

      // Refresh results
      await performSearch();
      await loadSuggestedUsers();
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold">Search</h2>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'places' | 'users')} className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-12 rounded-none bg-muted/30">
            <TabsTrigger value="places" className="gap-2">
              <MapPin className="h-4 w-4" />
              Places
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search Bar */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={activeTab === 'places' ? 'Search places or cities...' : 'Search people...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 h-12 text-base rounded-xl bg-muted/50"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(100vh-180px)] pb-20">
        {searching ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-muted-foreground">Searching...</span>
            </div>
          </div>
        ) : activeTab === 'places' ? (
          <>
            {/* City Autocomplete */}
            {cityAutocomplete.length > 0 && (
              <div className="px-4 py-3 border-b bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground mb-2">Cities</h3>
                <div className="space-y-1">
                  {cityAutocomplete.map((city) => (
                    <button
                      key={`${city.name}-${city.country}`}
                      onClick={() => handleCitySelect(city)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                      <div>
                        <div className="font-medium">{city.name}</div>
                        <div className="text-sm text-muted-foreground">{city.country}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Place Results */}
            {placeResults.length > 0 ? (
              <div className="px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  {placeResults.length} place{placeResults.length !== 1 ? 's' : ''} found
                </h3>
                <div className="space-y-3">
                  {placeResults.map((place) => (
                    <EnhancedLocationCardV2
                      key={place.id}
                      place={place}
                      onCardClick={() => {}}
                    />
                  ))}
                </div>
              </div>
            ) : searchQuery ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <MapPin className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-center">No places found</p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Try searching for a different location
                </p>
              </div>
            ) : (
              <div className="px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground mb-3">Popular Cities</h3>
                <div className="space-y-1">
                  {['Dublin', 'London', 'Paris', 'New York', 'Tokyo'].map((city) => (
                    <button
                      key={city}
                      onClick={() => setSearchQuery(city)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="font-medium">{city}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <UserSearchResults
            searchQuery={searchQuery}
            userResults={userResults}
            recentSearches={recentSearches}
            suggestedUsers={suggestedUsers}
            onUserClick={handleUserClick}
            onFollowUser={handleFollowUser}
            onRecentSearchClick={handleRecentSearchClick}
          />
        )}
      </div>
    </div>
  );
};

export default UnifiedSearchOverlay;
