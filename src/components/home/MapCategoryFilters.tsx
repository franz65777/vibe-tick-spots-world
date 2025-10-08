import { useState, useEffect } from 'react';
import { 
  Coffee, 
  Utensils, 
  Wine, 
  Building2 as Museum, 
  ShoppingBag, 
  Car,
  Building,
  TreePine,
  Users,
  TrendingUp,
  Bookmark,
  Star,
  Search,
  X,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapFilter } from '@/contexts/MapFilterContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CategoryFilter {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const categoryFilters: CategoryFilter[] = [
  { id: 'restaurant', name: 'Restaurants', icon: Utensils, color: 'bg-orange-500' },
  { id: 'bar', name: 'Bars & Pubs', icon: Wine, color: 'bg-purple-500' },
  { id: 'cafe', name: 'Cafés', icon: Coffee, color: 'bg-amber-500' },
  { id: 'bakery', name: 'Bakeries', icon: Coffee, color: 'bg-yellow-500' },
  { id: 'hotel', name: 'Hotels', icon: Building, color: 'bg-indigo-500' },
  { id: 'museum', name: 'Museums', icon: Museum, color: 'bg-blue-500' },
  { id: 'entertainment', name: 'Entertainment', icon: Star, color: 'bg-pink-500' }
];

interface MapCategoryFiltersProps {
  currentCity?: string;
}

const MapCategoryFilters = ({ currentCity }: MapCategoryFiltersProps) => {
  const { user: currentUser } = useAuth();
  const { 
    activeFilter, 
    setActiveFilter, 
    selectedCategories, 
    toggleCategory, 
    clearCategories,
    selectedFollowedUserIds,
    addFollowedUser,
    removeFollowedUser,
    clearFollowedUsers
  } = useMapFilter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const mapFilters = [
    { id: 'following' as const, name: 'Following', icon: Users, description: 'Places from people you follow' },
    { id: 'popular' as const, name: 'Popular', icon: TrendingUp, description: 'Trending locations nearby' },
    { id: 'recommended' as const, name: 'For You', icon: Star, description: 'Personalized recommendations' },
    { id: 'saved' as const, name: 'Saved', icon: Bookmark, description: 'Your saved places' }
  ];

  const handleFollowingClick = () => {
    if (activeFilter === 'following') {
      setShowUserSearch(!showUserSearch);
    } else {
      setActiveFilter('following');
      setShowUserSearch(true);
    }
  };

  const handleUserSelect = (userId: string) => {
    addFollowedUser(userId);
    setSearchQuery('');
    setShowUserSearch(false);
  };

  useEffect(() => {
    if (showUserSearch && activeFilter === 'following' && currentUser && currentCity) {
      searchUsersWithSavedPlacesInCity('');
    }
  }, [showUserSearch, activeFilter, currentUser, currentCity]);

  const searchUsersWithSavedPlacesInCity = async (query: string) => {
    if (!currentUser || !currentCity) return;
    
    setLoading(true);
    try {
      // Get users the current user follows
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUser.id);
      
      const followingIds = followsData?.map(f => f.following_id) || [];
      
      if (followingIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const normalizedCity = currentCity.trim().toLowerCase();
      
      // Query saved_places (Google Places)
      const { data: savedPlacesUsers } = await supabase
        .from('saved_places')
        .select('user_id, city')
        .in('user_id', followingIds);
      
      // Query user_saved_locations (internal locations)
      const { data: savedLocUsers } = await supabase
        .from('user_saved_locations')
        .select(`
          user_id,
          locations!inner(city)
        `)
        .in('user_id', followingIds);
      
      // Combine and filter by city
      const userIdsWithSavesInCity = new Set<string>();
      
      savedPlacesUsers?.forEach(sp => {
        const spCity = sp.city?.trim().toLowerCase();
        if (spCity && (spCity.includes(normalizedCity) || normalizedCity.includes(spCity))) {
          userIdsWithSavesInCity.add(sp.user_id);
        }
      });
      
      savedLocUsers?.forEach((sl: any) => {
        const locCity = sl.locations?.city?.trim().toLowerCase();
        if (locCity && (locCity.includes(normalizedCity) || normalizedCity.includes(locCity))) {
          userIdsWithSavesInCity.add(sl.user_id);
        }
      });
      
      if (userIdsWithSavesInCity.size === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }
      
      // Fetch profile data for these users
      let profileQuery = supabase
        .from('profiles')
        .select('id, username, avatar_url, bio')
        .in('id', Array.from(userIdsWithSavesInCity));
      
      if (query.trim()) {
        profileQuery = profileQuery.ilike('username', `%${query}%`);
      }
      
      const { data: profiles } = await profileQuery;
      
      setUsers(profiles || []);
    } catch (error) {
      console.error('Error fetching users with saves in city:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      searchUsersWithSavedPlacesInCity(value);
    } else {
      searchUsersWithSavedPlacesInCity('');
    }
  };

  const handleExitSearch = () => {
    setShowUserSearch(false);
    setSearchQuery('');
    clearFollowedUsers();
  };

  // Get selected user details
  const selectedUsers = users.filter(u => selectedFollowedUserIds.includes(u.id));

  return (
    <div className="absolute top-4 left-4 right-4 z-50">
      {/* Main Map Filters - Show all or just Following based on state */}
      <div className={cn(
        "mb-2 transition-all duration-200",
        showUserSearch && activeFilter === 'following' ? "grid grid-cols-1 gap-1.5" : "grid grid-cols-4 gap-1.5"
      )}>
        {/* Following Filter - Always visible */}
        {mapFilters.filter(f => showUserSearch && activeFilter === 'following' ? f.id === 'following' : true).map((filter) => {
          const IconComponent = filter.icon;
          const isActive = activeFilter === filter.id;
          
          // Define colors for each filter
          const filterColors = {
            following: isActive 
              ? "bg-blue-600 text-white border-blue-600" 
              : "bg-white/90 text-blue-600 border-blue-200 hover:bg-blue-50",
            popular: isActive 
              ? "bg-red-600 text-white border-red-600" 
              : "bg-white/90 text-red-600 border-red-200 hover:bg-red-50",
            recommended: isActive 
              ? "bg-purple-600 text-white border-purple-600" 
              : "bg-white/90 text-purple-600 border-purple-200 hover:bg-purple-50",
            saved: isActive 
              ? "bg-green-600 text-white border-green-600" 
              : "bg-white/90 text-green-600 border-green-200 hover:bg-green-50"
          };
          
          return (
            <button
              key={filter.id}
              onClick={() => filter.id === 'following' ? handleFollowingClick() : setActiveFilter(filter.id)}
              className={cn(
                "flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 backdrop-blur-sm border shadow-sm",
                filterColors[filter.id as keyof typeof filterColors]
              )}
              title={filter.description}
            >
              <IconComponent className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">{filter.name}</span>
              {filter.id === 'following' && selectedUsers.length > 0 && (
                <div className="flex items-center -space-x-1 ml-1">
                  {selectedUsers.slice(0, 3).map(user => (
                    <Avatar key={user.id} className="w-4 h-4 border border-white">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="text-[8px]">
                        {user.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {selectedUsers.length > 3 && (
                    <div className="w-4 h-4 rounded-full bg-blue-700 border border-white flex items-center justify-center text-[8px] text-white">
                      +{selectedUsers.length - 3}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* User Search Bar - Shown when Following is active and search is enabled */}
      {showUserSearch && activeFilter === 'following' && (
        <div className="mb-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <Input
              type="text"
              placeholder="Search people you follow..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="flex-1 border-0 focus-visible:ring-0 h-8 text-sm bg-transparent"
            />
            {loading && (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
            )}
            <button
              onClick={() => setShowUserSearch(true)}
              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex-shrink-0"
              title="Add another person"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={handleExitSearch}
              className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
              title="Clear filter"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Results */}
          {users.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto space-y-1.5 rounded-lg">
              {users
                .filter(u => !selectedFollowedUserIds.includes(u.id))
                .map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 transition-colors text-left"
                  >
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="text-sm">
                        {user.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.username || 'Unknown User'}
                      </p>
                      {user.bio && (
                        <p className="text-xs text-gray-500 truncate">{user.bio}</p>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          )}
          
          {users.length === 0 && !loading && (
            <p className="mt-3 text-xs text-gray-500 text-center">
              No followed users have saved places in {currentCity || 'this city'}
            </p>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2 font-medium">Showing pins from:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 rounded-full text-xs border border-blue-100"
                  >
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="text-[8px]">
                        {user.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-blue-900 font-medium">{user.username}</span>
                    <button
                      onClick={() => removeFollowedUser(user.id)}
                      className="ml-0.5 text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Filters */}
      {selectedCategories.length > 0 || categoryFilters.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categoryFilters.map((category) => {
            const IconComponent = category.icon;
            const isSelected = selectedCategories.includes(category.id);
            
            return (
              <button
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 shadow-sm backdrop-blur-sm",
                  isSelected 
                    ? "bg-black/90 text-white" 
                    : "bg-white/80 text-gray-700 hover:bg-white/90"
                )}
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-sm">{category.name}</span>
              </button>
            );
          })}
          {selectedCategories.length > 0 && (
            <button
              onClick={clearCategories}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium bg-white/80 text-gray-500 hover:bg-white/90 transition-all duration-200 shadow-sm backdrop-blur-sm"
            >
              Clear All
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default MapCategoryFilters;