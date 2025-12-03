import { useState, useEffect, useMemo } from 'react';
import { 
  Search,
  X,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapFilter } from '@/contexts/MapFilterContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import SaveTagsFilter from './SaveTagsFilter';
import { CategoryIcon } from '@/components/common/CategoryIcon';

// Custom icons imports
import filterFriendsIcon from '@/assets/icons/filter-friends.png';
import filterEveryoneIcon from '@/assets/icons/filter-everyone.png';
import filterSavedIcon from '@/assets/icons/filter-saved.png';

// Category config - IDs only, labels come from translations
const categoryConfig = [
  { id: 'restaurant' },
  { id: 'bar' },
  { id: 'cafe' },
  { id: 'bakery' },
  { id: 'hotel' },
  { id: 'museum' },
  { id: 'entertainment' }
];

interface MapCategoryFiltersProps {
  currentCity?: string;
}

const MapCategoryFilters = ({ currentCity }: MapCategoryFiltersProps) => {
  const { user: currentUser } = useAuth();
  const { t } = useTranslation('mapFilters');
  const { t: tCat } = useTranslation('categories');
  const { 
    activeFilter, 
    setActiveFilter, 
    selectedCategories, 
    toggleCategory, 
    clearCategories,
    selectedFollowedUserIds,
    addFollowedUser,
    removeFollowedUser,
    clearFollowedUsers,
    isFriendsDropdownOpen,
    isFilterExpanded,
    setIsFilterExpanded
  } = useMapFilter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  type CategoryCounts = Record<string, number>;

  const mapFilters = [
    { id: 'following' as const, name: t('friends'), icon: filterFriendsIcon, description: t('friendsDesc') },
    { id: 'popular' as const, name: t('everyone'), icon: filterEveryoneIcon, description: t('everyoneDesc') },
    { id: 'saved' as const, name: t('saved'), icon: filterSavedIcon, description: t('savedDesc') }
  ];

  const activeFilterData = mapFilters.find(f => f.id === activeFilter) || mapFilters[1];

  const handleFilterSelect = (filterId: 'following' | 'popular' | 'saved') => {
    if (filterId === 'following') {
      setActiveFilter('following');
      setShowUserSearch(true);
    } else {
      setActiveFilter(filterId);
      setShowUserSearch(false);
    }
    setIsFilterExpanded(false);
  };

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
      
      const { data: savedPlacesData } = await supabase
        .from('saved_places')
        .select('user_id, city, place:places_cache(category)')
        .in('user_id', followingIds)
        .ilike('city', `%${normalizedCity}%`);
      
      const { data: savedLocData } = await supabase
        .from('user_saved_locations')
        .select(`
          user_id,
          locations!inner(city, category)
        `)
        .in('user_id', followingIds);
      
      const userDataMap = new Map<string, CategoryCounts>();
      
      savedPlacesData?.forEach((sp: any) => {
        const spCity = sp.city?.trim().toLowerCase();
        if (spCity && (spCity.includes(normalizedCity) || normalizedCity.includes(spCity))) {
          const category = sp.place?.category?.toLowerCase() || 'unknown';
          if (!userDataMap.has(sp.user_id)) {
            userDataMap.set(sp.user_id, {});
          }
          const counts = userDataMap.get(sp.user_id)!;
          counts[category] = (counts[category] || 0) + 1;
        }
      });
      
      savedLocData?.forEach((sl: any) => {
        const locCity = sl.locations?.city?.trim().toLowerCase();
        if (locCity && (locCity.includes(normalizedCity) || normalizedCity.includes(locCity))) {
          const category = sl.locations?.category?.toLowerCase() || 'unknown';
          if (!userDataMap.has(sl.user_id)) {
            userDataMap.set(sl.user_id, {});
          }
          const counts = userDataMap.get(sl.user_id)!;
          counts[category] = (counts[category] || 0) + 1;
        }
      });
      
      if (userDataMap.size === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }
      
      let profileQuery = supabase
        .from('profiles')
        .select('id, username, avatar_url, bio')
        .in('id', Array.from(userDataMap.keys()));
      
      if (query.trim()) {
        profileQuery = profileQuery.ilike('username', `%${query}%`);
      }
      
      const { data: profiles } = await profileQuery;
      
      const profilesWithCounts = (profiles || []).map(profile => ({
        ...profile,
        categoryCounts: userDataMap.get(profile.id) || {}
      }));
      
      setUsers(profilesWithCounts);
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

  const handleShowAllFollowing = () => {
    clearFollowedUsers();
    setShowUserSearch(false);
  };

  const selectedUsers = users.filter(u => selectedFollowedUserIds.includes(u.id));

  // Calculate available categories based on selected users
  const availableCategories = useMemo(() => {
    if (activeFilter !== 'following' || selectedFollowedUserIds.length === 0) {
      return categoryConfig.map(c => c.id);
    }

    const categoriesSet = new Set<string>();
    selectedUsers.forEach(user => {
      if (user.categoryCounts) {
        Object.keys(user.categoryCounts).forEach(cat => {
          categoriesSet.add(cat);
        });
      }
    });

    return Array.from(categoriesSet);
  }, [activeFilter, selectedFollowedUserIds, selectedUsers]);

  return (
    <div className="w-full max-w-full z-[1100] pointer-events-none">
      {/* Category Filters Row - Show when dropdowns are closed */}
      <div className="mb-2 pointer-events-auto px-2">
        {!isFriendsDropdownOpen && !isFilterExpanded && !(showUserSearch && activeFilter === 'following') && (
          <div className="overflow-hidden rounded-full bg-background/20 backdrop-blur-md border border-border/5">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-2 py-0.5">
              {activeFilter === 'saved' && <SaveTagsFilter />}
              
              {categoryConfig
                .filter(category => availableCategories.includes(category.id))
                .map((category) => {
                  const isSelected = selectedCategories.includes(category.id);
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={cn(
                        "flex-shrink-0 flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded-lg transition-all duration-200",
                        isSelected && "bg-primary/10"
                      )}
                    >
                      <CategoryIcon 
                        category={category.id} 
                        className={cn(
                          "w-6 h-6 transition-all",
                          isSelected && "scale-110"
                        )}
                      />
                      <span className={cn(
                        "text-[8px] font-medium whitespace-nowrap transition-colors",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )}>
                        {tCat(category.id)}
                      </span>
                    </button>
                  );
                })}
              
              {selectedCategories.length > 0 && (
                <button
                  onClick={clearCategories}
                  className="flex-shrink-0 flex items-center justify-center p-1 rounded-lg hover:bg-secondary/50 transition-all duration-200"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Search Bar */}
      {showUserSearch && activeFilter === 'following' && (
        <div className="mb-3 rounded-2xl bg-gradient-to-r from-transparent via-background/20 to-transparent backdrop-blur-md border border-border/5 p-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="flex-1 border-0 focus-visible:ring-0 h-8 text-sm bg-transparent"
            />
            {loading && (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
            )}
            <button
              onClick={handleShowAllFollowing}
              className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex-shrink-0 font-medium text-xs"
              title={t('showAllFollowing')}
            >
              {t('common:all')}
            </button>
            <button
              onClick={handleExitSearch}
              className="p-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex-shrink-0"
              title={t('clearFilter')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {users.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto space-y-1.5 rounded-lg">
              {users
                .filter(u => !selectedFollowedUserIds.includes(u.id))
                .map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary transition-colors text-left"
                  >
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="text-sm">
                        {user.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.username || 'Unknown User'}
                      </p>
                      {user.bio && (
                        <p className="text-xs text-muted-foreground truncate">{user.bio}</p>
                      )}
                    </div>
                    {user.categoryCounts && Object.keys(user.categoryCounts).length > 0 && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {Object.entries(user.categoryCounts).slice(0, 3).map(([category, count]: [string, any]) => {
                          return (
                            <div key={category} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-secondary">
                              <CategoryIcon category={category} className="w-3 h-3" />
                              <span className="text-xs font-medium text-foreground">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </button>
                ))}
            </div>
          )}
          
          {users.length === 0 && !loading && (
            <p className="mt-3 text-xs text-muted-foreground text-center">
              {t('noUsersInCity', { city: currentCity || t('common:thisCity') })}
            </p>
          )}

          {selectedUsers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground mb-2 font-medium">{t('showingPinsFrom')}</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 rounded-full text-xs border border-primary/20"
                  >
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="text-[8px]">
                        {user.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-primary font-medium">{user.username}</span>
                    <button
                      onClick={() => removeFollowedUser(user.id)}
                      className="ml-0.5 text-primary hover:text-primary/80 transition-colors"
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
    </div>
  );
};

export default MapCategoryFilters;
