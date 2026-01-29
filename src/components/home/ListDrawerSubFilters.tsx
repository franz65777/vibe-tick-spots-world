import React from 'react';
import { cn } from '@/lib/utils';
import { MapFilter, SaveTagFilter } from '@/contexts/MapFilterContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import { SAVE_TAG_OPTIONS } from '@/utils/saveTags';

// Import icons
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';
import filterAllFriendsIcon from '@/assets/icons/filter-all-friends.png';

interface FollowedUser {
  id: string;
  username: string;
  avatar_url: string | null;
}
interface ListDrawerSubFiltersProps {
  activeFilter: MapFilter;
  followedUsers: FollowedUser[];
  selectedFollowedUserIds: string[];
  selectedSaveTags: SaveTagFilter[];
  onToggleUser: (userId: string) => void;
  onToggleSaveTag: (tag: SaveTagFilter) => void;
  onSelectAllUsers: () => void;
  locationCount: number;
  currentCity: string;
}
const TAG_ICONS: Record<string, string> = {
  been: saveTagBeen,
  to_try: saveTagToTry,
  favourite: saveTagFavourite
};
const ListDrawerSubFilters: React.FC<ListDrawerSubFiltersProps> = ({
  activeFilter,
  followedUsers,
  selectedFollowedUserIds,
  selectedSaveTags,
  onToggleUser,
  onToggleSaveTag,
  onSelectAllUsers,
  locationCount,
  currentCity
}) => {
  const {
    t
  } = useTranslation();
  const {
    t: tSaveTags
  } = useTranslation('save_tags');

  // Saved filter: No sub-filter needed (save tags moved to header)
  if (activeFilter === 'saved') {
    return null;
  }

  // Friends filter: Show scrollable avatar list
  if (activeFilter === 'following') {
    const allSelected = selectedFollowedUserIds.length === followedUsers.length && followedUsers.length > 0;
    return (
      <div className="px-4">
        <div className="flex items-center gap-2.5 overflow-x-auto overflow-y-visible scrollbar-hide py-3">
          {/* All button - using friends icon like avatars */}
          <button 
            onClick={onSelectAllUsers} 
            className="flex-shrink-0 flex flex-col items-center gap-0.5 min-w-[44px]"
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 overflow-hidden",
              allSelected || selectedFollowedUserIds.length === 0 
                ? "ring-2 ring-primary ring-offset-1 ring-offset-background" 
                : "opacity-60"
            )}>
              <img 
                src={filterAllFriendsIcon} 
                alt={t('all', { ns: 'mapFilters' })} 
                className="w-full h-full object-cover"
              />
            </div>
            <span className={cn(
              "text-[10px] font-medium",
              allSelected || selectedFollowedUserIds.length === 0 ? "text-primary" : "text-muted-foreground"
            )}>
              {t('all', { ns: 'mapFilters' })}
            </span>
          </button>

          {/* User avatars */}
          {followedUsers.map(user => {
            const isSelected = selectedFollowedUserIds.includes(user.id);
            return (
              <button 
                key={user.id} 
                onClick={() => onToggleUser(user.id)} 
                className="flex-shrink-0 flex flex-col items-center gap-0.5 min-w-[44px]"
              >
                <Avatar className={cn(
                  "w-10 h-10 transition-all duration-200",
                  isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "opacity-60"
                )}>
                  <AvatarImage src={user.avatar_url || ''} loading="lazy" />
                  <AvatarFallback className="text-sm font-medium bg-muted">
                    {user.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className={cn(
                  "text-[10px] font-medium max-w-[44px] truncate",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}>
                  {user.username}
                </span>
              </button>
            );
          })}

          {followedUsers.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              {t('noFriends', { ns: 'mapFilters' })}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Popular/Everyone filter: No sub-filter needed
  if (activeFilter === 'popular') {
    return null;
  }
  return null;
};
export default ListDrawerSubFilters;