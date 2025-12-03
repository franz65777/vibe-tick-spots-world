import { useState, useEffect } from 'react';
import { ChevronRight, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapFilter, MapFilter } from '@/contexts/MapFilterContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Custom icons imports
import filterFriendsIcon from '@/assets/icons/filter-friends.png';
import filterEveryoneIcon from '@/assets/icons/filter-everyone.png';
import filterSavedIcon from '@/assets/icons/filter-saved.png';

interface FollowedUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

const MapFilterDropdown = () => {
  const { t } = useTranslation('mapFilters');
  const { user } = useAuth();
  const { activeFilter, setActiveFilter, selectedFollowedUserIds, setSelectedFollowedUserIds } = useMapFilter();
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([]);

  // Fetch followed users
  useEffect(() => {
    const fetchFollowedUsers = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('follows')
        .select('following_id, profiles!follows_following_id_fkey(id, username, avatar_url)')
        .eq('follower_id', user.id);
      
      if (!error && data) {
        const users = data
          .map((f: any) => f.profiles)
          .filter(Boolean) as FollowedUser[];
        setFollowedUsers(users);
      }
    };
    
    fetchFollowedUsers();
  }, [user?.id]);

  const mapFilters = [
    { id: 'following' as const, name: t('friends'), icon: filterFriendsIcon, iconSize: 'w-7 h-7' },
    { id: 'popular' as const, name: t('everyone'), icon: filterEveryoneIcon, iconSize: 'w-6 h-6' },
    { id: 'saved' as const, name: t('saved'), icon: filterSavedIcon, iconSize: 'w-5 h-5' }
  ];

  const activeFilterData = mapFilters.find(f => f.id === activeFilter) || mapFilters[1];
  
  // Get selected user for avatar display
  const selectedUser = selectedFollowedUserIds.length > 0 
    ? followedUsers.find(u => u.id === selectedFollowedUserIds[0])
    : null;

  const handleFilterSelect = (filterId: MapFilter) => {
    setActiveFilter(filterId);
    setIsUserDropdownOpen(false);
    setIsFilterExpanded(false);
  };

  const handleUserSelect = (userId: string) => {
    if (selectedFollowedUserIds.includes(userId)) {
      setSelectedFollowedUserIds(selectedFollowedUserIds.filter(id => id !== userId));
    } else {
      setSelectedFollowedUserIds([...selectedFollowedUserIds, userId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedFollowedUserIds.length === followedUsers.length) {
      setSelectedFollowedUserIds([]);
    } else {
      setSelectedFollowedUserIds(followedUsers.map(u => u.id));
    }
  };

  const handleMainButtonClick = () => {
    if (activeFilter === 'following' && isUserDropdownOpen) {
      // If user dropdown is open, close it and open filter selection
      setIsUserDropdownOpen(false);
      setIsFilterExpanded(!isFilterExpanded);
    } else if (activeFilter === 'following') {
      // If on friends filter but dropdown closed, open user dropdown
      setIsUserDropdownOpen(true);
      setIsFilterExpanded(false);
    } else {
      // For other filters, toggle the horizontal expansion
      setIsFilterExpanded(!isFilterExpanded);
    }
  };

  return (
    <div className="relative flex items-center">
      {/* User selection dropdown - opens upward, only when friends filter is active */}
      {isUserDropdownOpen && activeFilter === 'following' && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md rounded-2xl border border-border/30 shadow-lg p-2 min-w-[200px] max-h-[250px] overflow-y-auto z-50">
          {/* Select All option */}
          <button
            onClick={handleSelectAll}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary/10 rounded-xl transition-colors"
          >
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center",
              selectedFollowedUserIds.length === followedUsers.length 
                ? "bg-primary border-primary" 
                : "border-muted-foreground"
            )}>
              {selectedFollowedUserIds.length === followedUsers.length && (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </div>
            <span className="text-sm font-medium text-foreground">{t('allFriends')}</span>
          </button>
          
          <div className="h-px bg-border/30 my-1" />
          
          {/* Individual users */}
          {followedUsers.map((followedUser) => (
            <button
              key={followedUser.id}
              onClick={() => handleUserSelect(followedUser.id)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary/10 rounded-xl transition-colors"
            >
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                selectedFollowedUserIds.includes(followedUser.id) 
                  ? "bg-primary border-primary" 
                  : "border-muted-foreground"
              )}>
                {selectedFollowedUserIds.includes(followedUser.id) && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              <Avatar className="w-6 h-6">
                <AvatarImage src={followedUser.avatar_url || ''} />
                <AvatarFallback className="text-[10px]">
                  {followedUser.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground truncate">{followedUser.username}</span>
            </button>
          ))}
          
          {followedUsers.length === 0 && (
            <p className="text-sm text-muted-foreground px-3 py-2">{t('noFriends')}</p>
          )}
        </div>
      )}

      {/* Active filter circle button */}
      <button
        onClick={handleMainButtonClick}
        className={cn(
          "flex items-center gap-1.5 rounded-full backdrop-blur-md transition-all duration-300 relative",
          "bg-gray-200/40 dark:bg-slate-800/65 border border-border/30 shadow-lg",
          isFilterExpanded ? "pr-1.5" : "pr-2.5"
        )}
      >
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center overflow-hidden transition-all",
          "bg-primary/10 border border-primary/20"
        )}>
          {activeFilter === 'following' && selectedUser ? (
            <Avatar className="w-6 h-6 border border-background">
              <AvatarImage src={selectedUser.avatar_url || ''} />
              <AvatarFallback className="text-[8px]">
                {selectedUser.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <img 
              src={activeFilterData.icon} 
              alt={activeFilterData.name}
              className={cn("object-contain", activeFilterData.iconSize)}
            />
          )}
        </div>
        {!isFilterExpanded && (
          <span className="text-xs font-medium text-foreground whitespace-nowrap">
            {activeFilterData.name}
          </span>
        )}
        {activeFilter === 'following' && !isFilterExpanded ? (
          <ChevronUp className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-300",
            isUserDropdownOpen && "rotate-180"
          )} />
        ) : (
          <ChevronRight className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-300",
            isFilterExpanded && "rotate-180"
          )} />
        )}
      </button>

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
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-md transition-all duration-200",
              "bg-gray-200/40 dark:bg-slate-800/65 border border-border/30 hover:bg-gray-300/50 dark:hover:bg-slate-700/70 shadow-lg"
            )}
          >
            <img 
              src={filter.icon} 
              alt={filter.name}
              className={cn("object-contain", filter.id === 'saved' ? 'w-4 h-4' : filter.id === 'following' ? 'w-6 h-6' : 'w-5 h-5')}
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
