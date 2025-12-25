import { useState, useEffect, useRef } from 'react';
import { ChevronRight, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapFilter, MapFilter } from '@/contexts/MapFilterContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { normalizeCategoryToBase } from '@/utils/normalizeCategoryToBase';

// Custom icons imports
import filterFriendsIcon from '@/assets/icons/filter-friends.png';
import filterEveryoneIcon from '@/assets/icons/filter-everyone.png';
import filterSavedIcon from '@/assets/icons/filter-saved.png';

interface FollowedUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface UserSavedStats {
  userId: string;
  categoryCounts: Record<string, number>; // Dynamic categories with counts
}

const MapFilterDropdown = () => {
  const { t } = useTranslation('mapFilters');
  const { user } = useAuth();
  const { activeFilter, setActiveFilter, selectedFollowedUserIds, setSelectedFollowedUserIds, isFriendsDropdownOpen, setIsFriendsDropdownOpen, isFilterExpanded, setIsFilterExpanded, setFilterDropdownWidth, setFilterDropdownRightEdge, currentCity } = useMapFilter();
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([]);
  const [userStats, setUserStats] = useState<Map<string, UserSavedStats>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure and report dropdown width and right edge position
  useEffect(() => {
    if (containerRef.current) {
      const updatePosition = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setFilterDropdownWidth(rect.width);
          setFilterDropdownRightEdge(rect.right);
        }
      };
      updatePosition();
      const observer = new ResizeObserver(updatePosition);
      observer.observe(containerRef.current);
      // Also update on scroll/resize
      window.addEventListener('resize', updatePosition);
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [setFilterDropdownWidth, setFilterDropdownRightEdge, activeFilter, isFilterExpanded]);

  // Fetch followed users and their saved location stats - FILTERED BY CITY
  useEffect(() => {
    const fetchFollowedUsersWithStats = async () => {
      if (!user?.id) return;
      
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('following_id, profiles!follows_following_id_fkey(id, username, avatar_url)')
        .eq('follower_id', user.id);
      
      if (followError) {
        console.error('Error fetching followed users:', followError);
        return;
      }

      if (followData) {
        const users = followData
          .map((f: any) => f.profiles)
          .filter(Boolean) as FollowedUser[];
        setFollowedUsers(users);

        // Fetch saved location stats for each user - FILTERED BY CURRENT CITY
        const statsMap = new Map<string, UserSavedStats>();
        const normalizedCity = currentCity?.trim().toLowerCase() || '';

        // City name variations mapping (handle Turin/Torino, Milan/Milano, etc.)
        const getCityVariations = (city: string): string[] => {
          const cityMap: Record<string, string[]> = {
            'torino': ['torino', 'turin'],
            'turin': ['torino', 'turin'],
            'milano': ['milano', 'milan'],
            'milan': ['milano', 'milan'],
            'roma': ['roma', 'rome'],
            'rome': ['roma', 'rome'],
            'firenze': ['firenze', 'florence'],
            'florence': ['firenze', 'florence'],
            'venezia': ['venezia', 'venice'],
            'venice': ['venezia', 'venice'],
            'napoli': ['napoli', 'naples'],
            'naples': ['napoli', 'naples'],
          };
          return cityMap[city.toLowerCase()] || [city.toLowerCase()];
        };

        const cityVariations = normalizedCity ? getCityVariations(normalizedCity) : [];

        const normalizeCategory = (cat: any) => {
          return normalizeCategoryToBase(cat) || '';
        };

        const matchesCity = (placeCity: string | null): boolean => {
          if (!normalizedCity || !placeCity) return !normalizedCity;
          const placeCityLower = placeCity.trim().toLowerCase();
          return cityVariations.some(v => placeCityLower.includes(v) || v.includes(placeCityLower));
        };

        // Batch fetch all saved places for all followed users (no city filter - we filter in JS for variations)
        const userIds = users.map(u => u.id);
        const { data: allSavedPlaces } = await supabase
          .from('saved_places')
          .select('user_id, place_id, place_category, city')
          .in('user_id', userIds);

        // Also fetch from user_saved_locations with locations table
        const { data: allUserSavedLocations } = await supabase
          .from('user_saved_locations')
          .select('user_id, location_id, locations(id, google_place_id, category, city)')
          .in('user_id', userIds);

        // Also include locations CREATED by the user (these show up as pins and should count in the badges)
        const { data: allCreatedLocations } = await supabase
          .from('locations')
          .select('created_by, id, google_place_id, category, city')
          .in('created_by', userIds);

        // Combine all places per user with city filtering and deduplication
        const userPlacesMap = new Map<string, Map<string, string>>(); // userId -> (placeId -> category)

        // Process saved_places first
        (allSavedPlaces || []).forEach((p: any) => {
          if (matchesCity(p.city) && p.place_id) {
            const userPlaces = userPlacesMap.get(p.user_id) || new Map();
            // Only add if not already present (deduplication)
            if (!userPlaces.has(p.place_id)) {
              userPlaces.set(p.place_id, normalizeCategory(p.place_category));
              userPlacesMap.set(p.user_id, userPlaces);
            }
          }
        });

        // Process user_saved_locations - may override with better category from locations table
        (allUserSavedLocations || []).forEach((usl: any) => {
          const loc = usl.locations;
          if (loc && matchesCity(loc.city)) {
            const placeId = loc.google_place_id || loc.id;
            if (placeId) {
              const userPlaces = userPlacesMap.get(usl.user_id) || new Map();
              // Override or add - locations table has more reliable category
              userPlaces.set(placeId, normalizeCategory(loc.category));
              userPlacesMap.set(usl.user_id, userPlaces);
            }
          }
        });

        // Process created locations - also reliable category
        (allCreatedLocations || []).forEach((loc: any) => {
          if (loc?.created_by && matchesCity(loc.city)) {
            const placeId = loc.google_place_id || loc.id;
            if (!placeId) return;
            const userPlaces = userPlacesMap.get(loc.created_by) || new Map();
            userPlaces.set(placeId, normalizeCategory(loc.category));
            userPlacesMap.set(loc.created_by, userPlaces);
          }
        });

        // Calculate stats per user with dynamic categories
        for (const followedUser of users) {
          const placesMap = userPlacesMap.get(followedUser.id);
          if (placesMap && placesMap.size > 0) {
            const categoryCounts: Record<string, number> = {};
            placesMap.forEach((category) => {
              if (category) {
                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
              }
            });
            
            if (Object.keys(categoryCounts).length > 0) {
              const stats: UserSavedStats = {
                userId: followedUser.id,
                categoryCounts,
              };
              statsMap.set(followedUser.id, stats);
            }
          }
        }

        setUserStats(statsMap);
      }
    };
    
    fetchFollowedUsersWithStats();
  }, [user?.id, currentCity]); // Re-fetch when city changes

  const mapFilters = [
    { id: 'following' as const, name: t('friends'), icon: filterFriendsIcon, iconSize: 'w-7 h-7' },
    { id: 'popular' as const, name: t('everyone'), icon: filterEveryoneIcon, iconSize: 'w-6 h-6' },
    { id: 'saved' as const, name: t('saved'), icon: filterSavedIcon, iconSize: 'w-5 h-5' }
  ];

  // Only show friends that have at least one saved location
  const friendsWithSavedLocations = followedUsers.filter(u => {
    const stats = userStats.get(u.id);
    return stats && Object.keys(stats.categoryCounts).length > 0;
  });

  const allSelected = selectedFollowedUserIds.length === friendsWithSavedLocations.length && friendsWithSavedLocations.length > 0;

  const activeFilterData = mapFilters.find(f => f.id === activeFilter) || mapFilters[1];
  
  const selectedUser = selectedFollowedUserIds.length > 0 
    ? followedUsers.find(u => u.id === selectedFollowedUserIds[0])
    : null;
  
  const hasMultipleSelected = selectedFollowedUserIds.length > 1;

  const filteredUsers = friendsWithSavedLocations.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFilterSelect = (filterId: MapFilter) => {
    setActiveFilter(filterId);
    setIsFilterExpanded(false);
    
    if (filterId === 'following') {
      setIsFriendsDropdownOpen(true);
    } else {
      setIsFriendsDropdownOpen(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    if (selectedFollowedUserIds.includes(userId)) {
      setSelectedFollowedUserIds(selectedFollowedUserIds.filter(id => id !== userId));
    } else {
      setSelectedFollowedUserIds([...selectedFollowedUserIds, userId]);
    }
    setIsFriendsDropdownOpen(false);
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedFollowedUserIds([]);
    } else {
      setSelectedFollowedUserIds(friendsWithSavedLocations.map(u => u.id));
      setIsFriendsDropdownOpen(false);
    }
  };

  const handleCloseFriendsDropdown = () => {
    setIsFriendsDropdownOpen(false);
  };

  const handleMainButtonClick = () => {
    if (activeFilter === 'following') {
      // Toggle friends dropdown when friends filter is active
      setIsFriendsDropdownOpen(!isFriendsDropdownOpen);
      setIsFilterExpanded(false);
    } else {
      setIsFilterExpanded(!isFilterExpanded);
      setIsFriendsDropdownOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Friends selection dropdown - opens upward */}
      {isFriendsDropdownOpen && activeFilter === 'following' && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md rounded-2xl border border-border/30 shadow-lg min-w-[320px] max-h-[300px] z-50">
          {/* Header with search, All button, and close */}
          <div className="flex items-center gap-2 p-3 border-b border-border/30">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              type="text"
              placeholder={t('searchPlaceholder') || "Search people you follow..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-8 bg-transparent border-none shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70 text-sm"
            />
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 text-xs font-medium bg-primary/20 hover:bg-primary/30 text-primary rounded-full transition-colors"
            >
              {allSelected ? t('none') : t('all')}
            </button>
            <button
              onClick={handleCloseFriendsDropdown}
              className="p-1 hover:bg-background/50 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          {/* User list */}
          <div className="overflow-y-auto max-h-[220px] p-2">
            {filteredUsers.map((followedUser) => {
              const stats = userStats.get(followedUser.id);
              const isSelected = selectedFollowedUserIds.includes(followedUser.id);
              
              return (
                <button
                  key={followedUser.id}
                  onClick={() => handleUserSelect(followedUser.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors",
                    isSelected ? "bg-primary/15" : "hover:bg-background/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-background">
                      <AvatarImage src={followedUser.avatar_url || ''} />
                      <AvatarFallback className="text-sm font-medium">
                        {followedUser.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{followedUser.username}</span>
                  </div>
                  
                  {/* Stats badges - scrollable */}
                  {stats && Object.keys(stats.categoryCounts).length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-[140px] scrollbar-hide">
                      {Object.entries(stats.categoryCounts)
                        .sort((a, b) => b[1] - a[1]) // Sort by count descending
                        .map(([category, count]) => (
                          <span 
                            key={category}
                            className="flex items-center gap-0.5 px-1.5 py-0.5 bg-primary/20 rounded-full text-xs whitespace-nowrap flex-shrink-0"
                          >
                            <CategoryIcon category={category} className="w-4 h-4" sizeMultiplier={0.9} />
                            <span>{count}</span>
                          </span>
                        ))
                      }
                    </div>
                  )}
                </button>
              );
            })}
            
            {filteredUsers.length === 0 && (
              <p className="text-sm text-muted-foreground px-3 py-4 text-center">
                {searchQuery ? t('noResults', { ns: 'common' }) : t('noFriends')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Active filter circle button */}
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full backdrop-blur-md transition-all duration-300 relative",
          "bg-gray-200/40 dark:bg-slate-800/65 border border-border/30 shadow-lg",
          isFilterExpanded ? "pr-1.5" : "pr-2.5"
        )}
      >
        <button
          onClick={handleMainButtonClick}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center overflow-hidden transition-all",
            "bg-primary/10 border border-primary/20"
          )}
        >
        {activeFilter === 'following' && selectedUser ? (
            <div className="relative">
              <Avatar className="w-6 h-6 border border-background">
                <AvatarImage src={selectedUser.avatar_url || ''} />
                <AvatarFallback className="text-[8px]">
                  {selectedUser.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {hasMultipleSelected && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center border border-background">
                  <span className="text-[8px] font-bold text-primary-foreground">+</span>
                </div>
              )}
            </div>
          ) : (
            <img 
              src={activeFilterData.icon} 
              alt={activeFilterData.name}
              className={cn("object-contain", activeFilterData.iconSize)}
            />
          )}
        </button>
        {!isFilterExpanded && (
          <span className="text-xs font-medium text-foreground whitespace-nowrap">
            {activeFilterData.name}
          </span>
        )}
        <button
          onClick={() => {
            setIsFilterExpanded(!isFilterExpanded);
            setIsFriendsDropdownOpen(false);
          }}
          className="p-0.5"
        >
          <ChevronRight className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-300",
            isFilterExpanded && "rotate-180"
          )} />
        </button>
      </div>

      {/* Expanded filter options - horizontal */}
      <div className={cn(
        "flex items-center gap-1.5 ml-1.5 overflow-hidden transition-all duration-300",
        isFilterExpanded ? "max-w-[250px] opacity-100" : "max-w-0 opacity-0"
      )}>
        {mapFilters.filter(f => f.id !== activeFilter).map((filter) => (
          <button
            key={filter.id}
            onClick={() => handleFilterSelect(filter.id)}
            className={cn(
              "flex items-center gap-1.5 px-2 h-9 rounded-full backdrop-blur-md transition-all duration-200",
              "bg-gray-200/40 dark:bg-slate-800/65 border border-border/30 hover:bg-gray-300/50 dark:hover:bg-slate-700/70 shadow-lg"
            )}
          >
            <img 
              src={filter.icon} 
              alt={filter.name}
              className={cn("object-contain", filter.iconSize)}
            />
            <span className="text-xs font-medium text-foreground whitespace-nowrap">
              {filter.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MapFilterDropdown;
