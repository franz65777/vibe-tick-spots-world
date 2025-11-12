import React, { useState, useEffect, useRef, memo } from 'react';
import { Search, MapPin, Users, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchService } from '@/services/searchService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTabPrefetch } from '@/hooks/useTabPrefetch';
import NoResults from './explore/NoResults';
import UserCard from './explore/UserCard';
import LocationPostLibrary from './explore/LocationPostLibrary';
import LocationGrid from './explore/LocationGrid';
import CommunityChampions from './home/CommunityChampions';
import { useCommunityChampions } from '@/hooks/useCommunityChampions';
import SimpleCategoryFilter from './explore/SimpleCategoryFilter';
import { AllowedCategory } from '@/utils/allowedCategories';
import { useUserSearchHistory } from '@/hooks/useUserSearchHistory';
import { useFollowSuggestions } from '@/hooks/useFollowSuggestions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import StoriesViewer from './StoriesViewer';
import { useTranslation } from 'react-i18next';
import { useMutualFollowers } from '@/hooks/useMutualFollowers';

// Small component to render mutual followers line for recent items
const RecentMutualFollowers = ({ userId }: { userId: string }) => {
  const { mutualFollowers, totalCount } = useMutualFollowers(userId);
  if (mutualFollowers.length === 0) return null;
  return (
    <p className="text-xs text-muted-foreground truncate mt-0.5">
      Seguito da {mutualFollowers.slice(0, 2).map(f => f.username).join(', ')}
      {totalCount > 2 && ` + ${totalCount - 2} altri`}
    </p>
  );
};

const ExplorePage = memo(() => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState(() => {
    const state = location.state as { searchQuery?: string } | null;
    return state?.searchQuery || '';
  });
  const [searchMode, setSearchMode] = useState<'locations' | 'users'>(() => {
    const state = location.state as { searchMode?: 'locations' | 'users' } | null;
    return state?.searchMode || 'locations';
  });
  const [isSearching, setIsSearching] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [userRecommendations, setUserRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [currentCity, setCurrentCity] = useState<string>('Unknown City');
  const [selectedCategory, setSelectedCategory] = useState<AllowedCategory | null>(null);
  const { champions } = useCommunityChampions(currentCity);
  const { searchHistory, deleteSearchHistoryItem, fetchSearchHistory } = useUserSearchHistory();
  const { suggestions, fetchSuggestions } = useFollowSuggestions();
  const [viewingStories, setViewingStories] = useState<any[]>([]);
  const [viewingStoriesIndex, setViewingStoriesIndex] = useState(0);
  const [fromMessages, setFromMessages] = useState(false);
  const [returnToUserId, setReturnToUserId] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [localSearchHistory, setLocalSearchHistory] = useState<typeof searchHistory>([]);
  const [hiddenUserIds, setHiddenUserIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem('hiddenSearchHistoryUsers');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Prefetch altre tab per transizioni istantanee
  useTabPrefetch('explore');

  // Persist hiddenUserIds to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('hiddenSearchHistoryUsers', JSON.stringify(Array.from(hiddenUserIds)));
  }, [hiddenUserIds]);

  // Sync local history with hook history, excluding hidden users
  useEffect(() => {
    setLocalSearchHistory(searchHistory.filter((i) => !i.target_user_id || !hiddenUserIds.has(i.target_user_id)));
  }, [searchHistory, hiddenUserIds]);

  // Check for shared place from DM and open LocationPostLibrary
  useEffect(() => {
    const state = location.state as { sharedPlace?: any; fromMessages?: boolean; returnToUserId?: string } | null;
    if (state?.sharedPlace) {
      const place = state.sharedPlace;
      const isFromMessages = state.fromMessages || false;
      const userId = state.returnToUserId || null;
      setFromMessages(isFromMessages);
      setReturnToUserId(userId);
      console.log('📍 Opening shared place from DM:', place);
      
      // Normalize the place data structure for LocationPostLibrary
      const normalizedPlace = {
        id: place.id || place.place_id || place.google_place_id || '',
        google_place_id: place.google_place_id || place.place_id || '',
        name: place.name || '',
        category: place.category || 'place',
        address: place.address || '',
        city: place.city || '',
        coordinates: place.coordinates || { lat: 0, lng: 0 },
        image: place.image || '',
        likes: 0,
        totalSaves: 0,
        postCount: 0,
        visitors: []
      };
      
      setSelectedLocation(normalizedPlace);
      setIsLocationModalOpen(true);
      // Do not clear state here; keep it so back/close can route properly when coming from messages
    }
  }, [location.state, navigate]);
  const handleCloseLocationModal = () => {
    setIsLocationModalOpen(false);
    setSelectedLocation(null);
    
    // If user came from messages, navigate back to the specific chat (clear state to prevent loops)
    if (fromMessages && returnToUserId) {
      // Reset flags and navigate back to the chat
      setFromMessages(false);
      setReturnToUserId(null);
      navigate('/messages', { state: { initialUserId: returnToUserId }, replace: true });
    } else if (fromMessages) {
      setFromMessages(false);
      navigate(-1);
    }
  };
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

  // Execute search if there's a query from navigation state and sync mode on state changes
  useEffect(() => {
    const state = location.state as { searchMode?: 'locations' | 'users'; searchQuery?: string } | null;
    if (state?.searchMode) setSearchMode(state.searchMode);
    if (searchQuery.trim() && (state?.searchMode || searchMode) === 'users' && user) {
      handleSearch(searchQuery);
    }
  }, [location.state]);

  // Search for users only
  const performSearch = async (query: string) => {
    if (!user || !query.trim() || searchMode !== 'users') return {
      users: []
    };
    try {
      const { data: results, error } = await supabase
        .rpc('search_users_securely', { search_query: query, requesting_user_id: user.id });
      if (error) throw error;
      return {
        users: (results || []).map((u: any) => ({
          id: u.id,
          name: u.username || 'User',
          username: u.username || `@${u.id.substring(0, 8)}`,
          avatar: u.avatar_url || 'photo-1472099645785-5658abf4ff4e',
          is_following: !!u.is_following,
          follower_count: u.follower_count,
          bio: u.bio
        }))
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
      // Don't save search history on every keystroke - only when user clicks a profile
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
  const handleUserClick = async (userId: string) => {
    // Save to search history when user clicks a profile
    if (user) {
      try {
        // Find the clicked user's username from any source
        const clickedUser = filteredUsers.find(u => u.id === userId) || 
                           suggestions.find(u => u.id === userId) ||
                           champions.find(c => c.id === userId);
        
        // Delete existing record to avoid duplicates
        await supabase
          .from('search_history')
          .delete()
          .eq('user_id', user.id)
          .eq('target_user_id', userId);
        
        // Insert new record (will appear at top due to newest timestamp)
        await supabase.from('search_history').insert({
          user_id: user.id,
          search_query: clickedUser?.username || userId,
          search_type: 'users',
          target_user_id: userId
        });

        // Refresh search history to show the new entry
        await fetchSearchHistory();
        // Ensure it is not filtered out locally
        setHiddenUserIds(prev => {
          const n = new Set(prev);
          n.delete(userId);
          return n;
        });
      } catch (error) {
        console.error('Error saving search history:', error);
      }
    }
    
    navigate(`/profile/${userId}`, { 
      state: { 
        from: 'explore',
        searchQuery: searchQuery,
        searchMode: 'users'
      } 
    });
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
      // Refresh current search results to reflect new follow state
      if (searchQuery.trim()) {
        const results = await performSearch(searchQuery);
        setFilteredUsers(results.users);
      } else {
        const users = await searchService.getUserRecommendations(user.id);
        setUserRecommendations(users);
        // Also refresh suggestions
        fetchSuggestions();
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };
  const handleMessageUser = (userId: string) => {
    console.log('Message user:', userId);
  };

  const openStoriesForUser = async (userId: string, username?: string, avatar_url?: string) => {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: stories } = await supabase
      .from('stories')
      .select('id, user_id, media_url, media_type, caption, location_id, location_name, location_address, created_at')
      .eq('user_id', userId)
      .gt('created_at', dayAgo)
      .order('created_at', { ascending: true });

    if (stories && stories.length > 0) {
      const formatted = stories.map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        userName: username || 'User',
        userAvatar: avatar_url || '',
        mediaUrl: s.media_url,
        mediaType: s.media_type,
        locationId: s.location_id,
        locationName: s.location_name || '',
        locationAddress: s.location_address || '',
        timestamp: s.created_at,
        isViewed: false
      }));
      setViewingStories(formatted);
      setViewingStoriesIndex(0);
    }
  };

  const handleHistoryAvatarClick = async (item: any) => {
    if (!item.target_user_id) return;

    // Re-save to bump this user on top and avoid duplicates (also remove legacy username-only entries)
    if (user) {
      try {
        // Delete any existing rows for this target (by id) and legacy rows saved by username only
        await supabase
          .from('search_history')
          .delete()
          .eq('user_id', user.id)
          .eq('target_user_id', item.target_user_id);

        if (item.username) {
          // Case-insensitive match on username for legacy rows
          await supabase
            .from('search_history')
            .delete()
            .eq('user_id', user.id)
            .ilike('search_query', item.username);
        }

        // Legacy: rows saved with UUID string in search_query
        await supabase
          .from('search_history')
          .delete()
          .eq('user_id', user.id)
          .eq('search_query', item.target_user_id);

        // Insert new record (most recent) so it appears at the top
        await supabase.from('search_history').insert({
          user_id: user.id,
          search_query: item.username || item.search_query,
          search_type: 'users',
          target_user_id: item.target_user_id
        });
        await fetchSearchHistory();
        // If had been hidden via X, unhide it now
        setHiddenUserIds(prev => {
          const n = new Set(prev);
          n.delete(item.target_user_id as string);
          return n;
        });
      } catch (e) {
        console.error('Failed to update history order:', e);
      }
    }

    if (item.has_active_story) {
      openStoriesForUser(item.target_user_id, item.username || item.search_query, item.avatar_url);
    } else {
      navigate(`/profile/${item.target_user_id}`, { 
        state: { 
          from: 'explore',
          searchQuery: searchQuery,
          searchMode: 'users'
        } 
      });
    }
  };
  const clearSearch = () => {
    setSearchQuery('');
    setFilteredUsers([]);
    searchInputRef.current?.blur(); // Hide mobile keyboard
  };
  
  const clearAllHistory = async () => {
    if (!user) return;
    try {
      await supabase
        .from('search_history')
        .delete()
        .eq('user_id', user.id)
        .eq('search_type', 'users');
      setHiddenUserIds(new Set());
      await fetchSearchHistory();
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };
  
  const isSearchActive = searchQuery.trim().length > 0;
  const displayUsers = filteredUsers;
  const displayedHistory = showAllHistory ? localSearchHistory : localSearchHistory.slice(0, 10);
  return <div className="flex flex-col h-full">
      {/* Simplified Header */}
      <div className="bg-background pt-safe">
        <div className="px-1 py-4 pt-2">
          {/* Search Mode Toggle */}
          <div className="flex bg-muted rounded-xl p-1 mb-4">
            <button onClick={() => setSearchMode('locations')} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${searchMode === 'locations' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <MapPin className="w-4 h-4" />
              {t('places', { ns: 'explore' })}
            </button>
            <button onClick={() => setSearchMode('users')} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${searchMode === 'users' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Users className="w-4 h-4" />
              {t('people', { ns: 'explore' })}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder={searchMode === 'locations' ? t('searchPlaces', { ns: 'explore' }) : t('searchPeople', { ns: 'explore' })}
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setTimeout(() => setInputFocused(false), 100)}
                className="pl-12 pr-4 h-12 bg-muted/50 border-border focus:bg-background rounded-xl"
              />
              {searchQuery && <Button onClick={clearSearch} variant="ghost" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted rounded-full">
                  ×
                </Button>}
            </div>
            {(inputFocused || searchQuery) && (
              <Button
                onClick={() => searchInputRef.current?.blur()}
                variant="ghost"
                className="text-sm font-medium text-primary hover:text-primary/80 px-3 shrink-0"
              >
                {t('cancel', { ns: 'common' })}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-16">
        {loading || isSearching ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600 font-medium">
                {isSearching ? t('searching', { ns: 'common' }) : t('loading', { ns: 'common' })}
              </span>
            </div>
          </div>
        ) : (
          <>
            {searchMode === 'locations' ? (
              <>
                {/* Category Filter - No container padding, let grid handle it */}
                <SimpleCategoryFilter
                  selectedCategory={selectedCategory}
                  onCategorySelect={setSelectedCategory}
                />

                {/* Location Grid */}
                <LocationGrid
                  searchQuery={searchQuery}
                  selectedCategory={selectedCategory}
                />
              </>
            ) : (
              <>
                {/* Search History & Follow Suggestions - Only in People mode */}
                {!isSearchActive && (
                  <div className="px-1 py-2 space-y-4">
                    {/* Search History - moved up */}
                    {localSearchHistory.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Search className="w-4 h-4" />
                            {t('recent', { ns: 'explore' })}
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              // Optimistic clear
                              setLocalSearchHistory([]);
                              await clearAllHistory();
                            }}
                            className="text-xs text-muted-foreground hover:text-destructive h-7"
                          >
                            {t('clearHistory', { ns: 'common' })}
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {displayedHistory.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors animate-fade-in"
                            >
                              <div
                                className="relative flex-shrink-0 cursor-pointer"
                                onClick={() => handleHistoryAvatarClick(item)}
                              >
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={item.avatar_url || undefined} />
                                  <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white">
                                    {item.username?.[0]?.toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                {item.has_active_story && (
                                  <div className="absolute inset-0 rounded-full ring-2 ring-primary" />
                                )}
                              </div>
                              <div
                                className="flex-1 min-w-0 cursor-pointer text-left"
                                onClick={() => handleHistoryAvatarClick(item)}
                              >
                                <p className="text-sm font-medium text-foreground truncate text-left">
                                  {item.username || 'User'}
                                </p>
                                {item.target_user_id && (
                                  <RecentMutualFollowers userId={item.target_user_id} />
                                )}
                              </div>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  // Optimistic update
                                  setLocalSearchHistory(prev => prev.filter(h => h.target_user_id !== item.target_user_id));
                                  if (item.target_user_id) {
                                    setHiddenUserIds(prev => {
                                      const n = new Set(prev);
                                      n.add(item.target_user_id as string);
                                      return n;
                                    });
                                  }
                                  if (user) {
                                    try {
                                      // Remove entries by target id (any search_type)
                                      await supabase
                                        .from('search_history')
                                        .delete()
                                        .eq('user_id', user.id)
                                        .eq('target_user_id', item.target_user_id);

                                      // Legacy: rows saved with username only (case-insensitive)
                                      if (item.username) {
                                        await supabase
                                          .from('search_history')
                                          .delete()
                                          .eq('user_id', user.id)
                                          .ilike('search_query', item.username);
                                      }

                                      // Legacy: rows saved with UUID string in search_query
                                      await supabase
                                        .from('search_history')
                                        .delete()
                                        .eq('user_id', user.id)
                                        .eq('search_query', item.target_user_id);

                                      await fetchSearchHistory();
                                    } catch (err) {
                                      console.error('Error deleting history item:', err);
                                      // Re-sync
                                      await fetchSearchHistory();
                                    }
                                  }
                                }}
                                className="p-1 hover:bg-muted rounded-full"
                              >
                                <X className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </div>
                          ))}
                        </div>
                        {localSearchHistory.length > 10 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllHistory(!showAllHistory)}
                            className="w-full mt-2 text-xs text-primary hover:text-primary/80"
                          >
                            {showAllHistory ? t('less', { ns: 'common' }) : t('showAll', { ns: 'common' })}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* User Results - show only when an actual search is active */}
                {isSearchActive && (
                  displayUsers.length > 0 ? (
                    <div className="space-y-1 px-1 pb-6">
                      {displayUsers.map(user => (
                        <UserCard
                          key={user.id}
                          user={user}
                          onUserClick={() => handleUserClick(user.id)}
                          onFollowUser={handleFollowUser}
                          onMessageUser={handleMessageUser}
                          searchQuery={searchQuery}
                          searchMode={searchMode}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="px-1 py-8">
                      <NoResults searchMode="users" searchQuery={searchQuery} />
                    </div>
                  )
                )}
              </>
            )}
          </>
        )}
      </div>

      {viewingStories.length > 0 && (
        <StoriesViewer
          stories={viewingStories}
          initialStoryIndex={viewingStoriesIndex}
          onClose={() => setViewingStories([])}
          onStoryViewed={() => {}}
        />
      )}

      {/* Stories Viewer */}
      {viewingStories.length > 0 && (
        <StoriesViewer
          stories={viewingStories}
          initialIndex={viewingStoriesIndex}
          isOpen={viewingStories.length > 0}
          onClose={() => {
            setViewingStories([]);
            setViewingStoriesIndex(0);
          }}
        />
      )}
    </div>
  );
});

ExplorePage.displayName = 'ExplorePage';

export default ExplorePage;
