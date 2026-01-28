import { Building2 } from 'lucide-react';
import saveTagAll from '@/assets/save-tag-all.png';
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';
import settingsIcon from '@/assets/settings-icon.png';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useProfileAggregated } from '@/hooks/useProfileAggregated';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import BadgeDisplay from './BadgeDisplay';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStories } from '@/hooks/useStories';
import CreateStoryModal from '../CreateStoryModal';
import StoriesViewer from '../StoriesViewer';
import { cn } from '@/lib/utils';
import ProfileHeaderSkeleton from './ProfileHeaderSkeleton';

interface ProfileHeaderProps {
  onFollowersClick: () => void;
  onFollowingClick: () => void;
  onPostsClick: () => void;
  onLocationsClick: () => void;
  onBadgesClick?: () => void;
  selectedCity?: string | null;
  onCitySelect?: (city: string | null) => void;
}

/**
 * ProfileHeader - Optimized with useProfileAggregated
 * 
 * PERFORMANCE: Consolidated from 5 hooks to 2 (aggregated + stories)
 * - useProfileAggregated: profile + stats + categoryCounts in one query
 * - useStories: only for avatar ring (lazy loaded)
 */
const ProfileHeader = ({ 
  onFollowersClick, 
  onFollowingClick, 
  onPostsClick, 
  onLocationsClick,
  onBadgesClick,
  selectedCity,
  onCitySelect
}: ProfileHeaderProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // CONSOLIDATED: Single hook for profile + stats + category counts
  const { profile, stats, categoryCounts, loading, refetch } = useProfileAggregated();
  
  // Stories only needed for avatar ring
  const { stories, refetch: refetchStories } = useStories();
  
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  const hasBusinessAccount = (profile as any)?.is_business_user || false;

  const getInitials = () => {
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const displayUsername = profile?.username || user?.user_metadata?.username || 'user';

  const displayStats = {
    posts: stats.postsCount,
    followers: stats.followersCount,
    following: stats.followingCount,
    locations: stats.locationsCount
  };

  // Get user's own active stories (not expired)
  const now = new Date();
  const myStories = stories.filter(s => s.user_id === user?.id && new Date(s.expires_at) > now);
  const hasMyStories = myStories.length > 0;
  const myStoriesAllViewed = myStories.every(s => s.created_at && new Date(s.created_at) < new Date(Date.now() - 24 * 60 * 60 * 1000));

  const handleStoryClick = () => {
    if (hasMyStories) {
      const storyIndex = stories.findIndex(s => s.user_id === user?.id);
      setSelectedStoryIndex(storyIndex >= 0 ? storyIndex : 0);
      setIsStoriesViewerOpen(true);
    } else {
      setIsCreateStoryOpen(true);
    }
  };

  // Show skeleton only on initial load without cached data
  if (loading && !profile) {
    return <ProfileHeaderSkeleton />;
  }

  return (
    <div className="pt-1 pb-2 bg-background">
      {/* Main row: Avatar + Name/Stats + Badges + Settings */}
      <div className="flex items-start gap-3 px-3">
        {/* Avatar */}
        <div className="shrink-0">
          {hasMyStories ? (
            <button
              onClick={handleStoryClick}
              className="relative flex-shrink-0"
              aria-label="View your story"
            >
              <div className={cn(
                "relative rounded-full p-[2px] border-2",
                myStoriesAllViewed ? "border-gray-300 dark:border-gray-600" : "border-primary"
              )}>
                <Avatar className="w-16 h-16">
                  <AvatarImage src={profile?.avatar_url} alt={displayUsername} />
                  <AvatarFallback className="bg-muted text-foreground text-sm font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </button>
          ) : (
            <div className="w-16 h-16 rounded-full border-2 border-muted flex items-center justify-center bg-muted overflow-hidden">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={displayUsername}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">{getInitials()}</span>
              )}
            </div>
          )}
        </div>

        {/* Middle: Name and Stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-foreground mt-2">{displayUsername}</h1>
            {hasBusinessAccount && (
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0">
                <Building2 className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
          </div>

          {/* Stats Row - inline like "6 Follower" */}
          <div className="flex gap-3 mt-2">
            <button className="flex items-center gap-1" onClick={onFollowersClick}>
              <span className="text-sm font-bold text-foreground">{displayStats.followers}</span>
              <span className="text-sm text-muted-foreground">{t('followers', { ns: 'common' })}</span>
            </button>
            
            <button className="flex items-center gap-1" onClick={onFollowingClick}>
              <span className="text-sm font-bold text-foreground">{displayStats.following}</span>
              <span className="text-sm text-muted-foreground">{t('followingTab', { ns: 'common' })}</span>
            </button>
            
            <button className="flex items-center gap-1" onClick={onLocationsClick}>
              <span className="text-sm font-bold text-foreground">{displayStats.locations}</span>
              <span className="text-sm text-muted-foreground">{t('saved', { ns: 'mapFilters' })}</span>
            </button>
          </div>
        </div>

        {/* Right: Badges + Settings */}
        <div className="flex items-center gap-2 shrink-0">
          <BadgeDisplay userId={user?.id} onBadgesClick={onBadgesClick} />
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-10 w-10 p-0"
            onMouseEnter={() => {
              // Prefetch settings chunk to avoid perceived lag
              import('@/pages/SettingsPage');
            }}
            onClick={() => navigate('/settings')}
          >
            <img src={settingsIcon} alt="Settings" className="w-9 h-9 object-contain" />
          </Button>
        </div>
      </div>

      {/* Category Cards Section */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {/* All Locations Card */}
          <button 
            onClick={() => categoryCounts.all > 0 && navigate(`/user-places/${user?.id}`, { state: { filterCategory: 'all' } })}
            disabled={categoryCounts.all === 0}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0 ${categoryCounts.all === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <img src={saveTagAll} alt="" className="w-8 h-8 object-contain -my-1" />
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm">{categoryCounts.all}</span>
              <span className="text-[10px] text-muted-foreground">{t('userProfile.allLocations', { ns: 'common' })}</span>
            </div>
          </button>

          {/* Visited Locations Card */}
          <button 
            onClick={() => categoryCounts.been > 0 && navigate(`/user-places/${user?.id}`, { state: { filterCategory: 'been' } })}
            disabled={categoryCounts.been === 0}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0 ${categoryCounts.been === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <img src={saveTagBeen} alt="" className="w-8 h-8 object-contain -my-1" />
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm">{categoryCounts.been}</span>
              <span className="text-[10px] text-muted-foreground">{t('userProfile.visitedLocations', { ns: 'common' })}</span>
            </div>
          </button>

          {/* To Try Locations Card */}
          <button 
            onClick={() => categoryCounts.toTry > 0 && navigate(`/user-places/${user?.id}`, { state: { filterCategory: 'to-try' } })}
            disabled={categoryCounts.toTry === 0}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0 ${categoryCounts.toTry === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <img src={saveTagToTry} alt="" className="w-8 h-8 object-contain -my-1" />
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm">{categoryCounts.toTry}</span>
              <span className="text-[10px] text-muted-foreground">{t('userProfile.toTryLocations', { ns: 'common' })}</span>
            </div>
          </button>

          {/* Favourite Locations Card */}
          <button 
            onClick={() => categoryCounts.favourite > 0 && navigate(`/user-places/${user?.id}`, { state: { filterCategory: 'favourite' } })}
            disabled={categoryCounts.favourite === 0}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0 ${categoryCounts.favourite === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <img src={saveTagFavourite} alt="" className="w-8 h-8 object-contain -my-1" />
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm">{categoryCounts.favourite}</span>
              <span className="text-[10px] text-muted-foreground">{t('userProfile.favouriteLocations', { ns: 'common' })}</span>
            </div>
          </button>
        </div>
      </div>

      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => {
          setIsCreateStoryOpen(false);
        }}
        onStoryCreated={() => {
          refetchStories();
          setIsCreateStoryOpen(false);
        }}
      />

      {isStoriesViewerOpen && (
        <StoriesViewer
          onClose={() => setIsStoriesViewerOpen(false)}
          stories={stories.map(s => ({
            id: s.id,
            userId: s.user_id,
            userName: displayUsername,
            userAvatar: profile?.avatar_url || '',
            mediaUrl: s.media_url,
            mediaType: s.media_type as 'image' | 'video',
            locationId: s.location_id || '',
            locationName: s.location_name || '',
            locationAddress: s.location_address || '',
            locationCategory: '',
            timestamp: s.created_at,
            isViewed: false
          }))}
          initialStoryIndex={selectedStoryIndex}
          onStoryViewed={() => {}}
        />
      )}
    </div>
  );
};

export default ProfileHeader;
