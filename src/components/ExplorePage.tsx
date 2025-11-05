import React, { useState, useEffect } from 'react';
import { Search, MapPin, Users, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchService } from '@/services/searchService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
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

const ExplorePage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'locations' | 'users'>(() => {
    const state = location.state as { searchMode?: 'locations' | 'users' } | null;
    return state?.searchMode || 'locations';
  });
  const [isSearching, setIsSearching] = useState(false);
  const [userRecommendations, setUserRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [currentCity, setCurrentCity] = useState<string>('Unknown City');
  const [selectedCategory, setSelectedCategory] = useState<AllowedCategory | null>(null);
  const { champions } = useCommunityChampions(currentCity);
  const { searchHistory, deleteSearchHistoryItem } = useUserSearchHistory();
  const { suggestions, fetchSuggestions } = useFollowSuggestions();
  const [viewingStories, setViewingStories] = useState<any[]>([]);
  const [viewingStoriesIndex, setViewingStoriesIndex] = useState(0);
  const [fromMessages, setFromMessages] = useState(false);
  const [returnToUserId, setReturnToUserId] = useState<string | null>(null);

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
    // Find the clicked user's username and save to search history
    const clickedUser = filteredUsers.find(u => u.id === userId) || 
                       suggestions.find(u => u.id === userId);
    
    if (clickedUser?.username && user) {
      // Save to search history when user actually clicks a profile
      await supabase.from('search_history').insert({
        user_id: user.id,
        search_query: clickedUser.username,
        search_type: 'users',
        target_user_id: userId
      });
    }
    
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

  const handleHistoryAvatarClick = (item: any) => {
    if (item.has_active_story && item.target_user_id) {
      openStoriesForUser(item.target_user_id, item.username || item.search_query, item.avatar_url);
    } else if (item.target_user_id) {
      navigate(`/profile/${item.target_user_id}`);
    }
  };
  const clearSearch = () => {
    setSearchQuery('');
    setFilteredUsers([]);
  };
  const isSearchActive = searchQuery.trim().length > 0;
  const displayUsers = isSearchActive ? filteredUsers : userRecommendations;
  return <div className="flex flex-col h-full">
      {/* Simplified Header */}
      <div className="bg-white border-b border-gray-200 pt-safe">
        <div className="px-1 py-4 pt-2">
          {/* Search Mode Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
            <button onClick={() => setSearchMode('locations')} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${searchMode === 'locations' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              <MapPin className="w-4 h-4" />
              {t('places', { ns: 'explore' })}
            </button>
            <button onClick={() => setSearchMode('users')} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${searchMode === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              <Users className="w-4 h-4" />
              {t('people', { ns: 'explore' })}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder={searchMode === 'locations' ? t('searchPlaces', { ns: 'explore' }) : t('searchPeople', { ns: 'explore' })}
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
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
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
                  <div className="px-1 py-4 space-y-6">
                    {/* Search History */}
                    {searchHistory.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Search className="w-4 h-4" />
                          {t('recent', { ns: 'explore' })}
                        </h3>
                        <div className="space-y-2">
                          {searchHistory.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
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
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => item.target_user_id && navigate(`/profile/${item.target_user_id}`)}
                              >
                                <p className="text-sm font-medium text-foreground truncate">
                                  {item.username || 'User'}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSearchHistoryItem(item.id);
                                }}
                                className="p-1 hover:bg-muted rounded-full"
                              >
                                <X className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow Suggestions */}
                    {suggestions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {t('suggestedForYou', { ns: 'explore' })}
                        </h3>
                        <div className="space-y-2">
                          {suggestions.slice(0, 5).map((suggestedUser) => (
                            <div
                              key={suggestedUser.id}
                              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div 
                                className="flex items-center gap-3 flex-1 cursor-pointer"
                                onClick={() => handleUserClick(suggestedUser.id)}
                              >
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={suggestedUser.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {suggestedUser.username?.[0]?.toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-foreground truncate">
                                    {suggestedUser.username}
                                  </div>
                                   <div className="text-sm text-muted-foreground">
                                     {suggestedUser.follower_count || 0} {t('followers', { ns: 'common' })}
                                     {suggestedUser.mutual_followers ? ` • ${suggestedUser.mutual_followers} ${t('mutual', { ns: 'common' })}` : ''}
                                   </div>
                                </div>
                              </div>
                               <Button
                                 variant={suggestedUser.is_following ? 'outline' : 'default'}
                                 size="sm"
                                 onClick={() => handleFollowUser(suggestedUser.id)}
                               >
                                 {suggestedUser.is_following ? t('following', { ns: 'common' }) : t('follow', { ns: 'common' })}
                               </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {champions.length > 0 && (
                      <CommunityChampions 
                        champions={champions} 
                        onUserClick={handleUserClick}
                      />
                    )}
                    
                    {/* Invite Friends Button */}
                    <div className="pt-0">
                      <Button
                        onClick={() => {
                          const shareText = 'Join me on this amazing app!';
                          const shareUrl = window.location.origin;
                          if (navigator.share) {
                            navigator.share({ title: 'Join me!', text: shareText, url: shareUrl })
                              .catch(() => {});
                          } else {
                            navigator.clipboard.writeText(shareUrl);
                            toast.success('Link copied to clipboard!');
                          }
                        }}
                        variant="outline"
                        className="w-full py-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border-blue-200 hover:border-blue-300 transition-all"
                      >
                        <UserPlus className="w-5 h-5 mr-2" />
                        <span className="font-semibold">{t('inviteFriends', { ns: 'explore' })}</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* User Results */}
                {displayUsers.length > 0 ? (
                  <div className="space-y-3 px-1 pb-20">
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
                  <div className="px-1 py-8">
                    {isSearchActive && (
                      <NoResults searchMode="users" searchQuery={searchQuery} />
                    )}
                  </div>
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

      {/* Location Post Library */}
      <LocationPostLibrary
        isOpen={isLocationModalOpen}
        onClose={handleCloseLocationModal}
        place={selectedLocation}
      />
    </div>;
};

export default ExplorePage;
