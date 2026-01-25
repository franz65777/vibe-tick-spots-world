import React from 'react';
import { cn } from '@/lib/utils';
import { MapFilter, SaveTagFilter } from '@/contexts/MapFilterContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import { SAVE_TAG_OPTIONS } from '@/utils/saveTags';

// Import tag icons
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';
import trendingIcon from '@/assets/trending-icon.png';
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

  // Saved filter: Show save tag icons
  if (activeFilter === 'saved') {
    return <div className="flex items-center justify-center gap-2 py-2 px-4">
        {SAVE_TAG_OPTIONS.map(option => {
        const isSelected = selectedSaveTags.includes(option.value);
        const iconSrc = TAG_ICONS[option.value];
        return <button key={option.value} onClick={() => onToggleSaveTag(option.value)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200", "bg-white/60 dark:bg-slate-700/60 border", isSelected ? "border-primary/50 bg-primary/10 dark:bg-primary/20" : "border-white/50 dark:border-slate-600/50 hover:bg-white/80 dark:hover:bg-slate-700/80")}>
              {iconSrc ? <img src={iconSrc} alt="" className="w-5 h-5 object-contain" /> : <span className="text-lg">{option.emoji}</span>}
              <span className={cn("text-xs font-medium", isSelected ? "text-primary" : "text-muted-foreground")}>
                {tSaveTags(option.labelKey)}
              </span>
            </button>;
      })}
      </div>;
  }

  // Friends filter: Show scrollable avatar list
  if (activeFilter === 'following') {
    const allSelected = selectedFollowedUserIds.length === followedUsers.length && followedUsers.length > 0;
    return <div className="py-2 px-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {/* All button */}
          <button onClick={onSelectAllUsers} className={cn("flex-shrink-0 flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[52px]", allSelected || selectedFollowedUserIds.length === 0 ? "bg-primary/15" : "bg-white/60 dark:bg-slate-700/60")}>
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold", allSelected || selectedFollowedUserIds.length === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {t('all', {
              ns: 'mapFilters'
            })}
            </div>
          </button>

          {/* User avatars */}
          {followedUsers.map(user => {
          const isSelected = selectedFollowedUserIds.includes(user.id);
          return <button key={user.id} onClick={() => onToggleUser(user.id)} className={cn("flex-shrink-0 flex flex-col items-center gap-1 transition-all duration-200 min-w-[52px]")}>
                <Avatar className={cn("w-10 h-10 transition-all duration-200", isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "")}>
                  <AvatarImage src={user.avatar_url || ''} />
                  <AvatarFallback className="text-sm font-medium bg-muted">
                    {user.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className={cn("text-[10px] font-medium max-w-[48px] truncate", isSelected ? "text-primary" : "text-muted-foreground")}>
                  {user.username}
                </span>
              </button>;
        })}

          {followedUsers.length === 0 && <p className="text-xs text-muted-foreground py-2">
              {t('noFriends', {
            ns: 'mapFilters'
          })}
            </p>}
        </div>
      </div>;
  }

  // Popular/Everyone filter: Show trending info
  if (activeFilter === 'popular') {
    return <div className="flex items-center justify-center py-2 px-4">
        
      </div>;
  }
  return null;
};
export default ListDrawerSubFilters;