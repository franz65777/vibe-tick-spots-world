
import { Building2, Globe, Eye, Bookmark, Heart } from 'lucide-react';
import settingsIcon from '@/assets/settings-icon.png';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useOptimizedProfile } from '@/hooks/useOptimizedProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import BadgeDisplay from './BadgeDisplay';
import EditProfileModal from './EditProfileModal';
import { useOptimizedFollowStats } from '@/hooks/useOptimizedFollowStats';
import { useOptimizedSavedPlaces } from '@/hooks/useOptimizedSavedPlaces';
import { useUserSavedCities } from '@/hooks/useUserSavedCities';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStories } from '@/hooks/useStories';
import CreateStoryModal from '../CreateStoryModal';
import StoriesViewer from '../StoriesViewer';
import { cn } from '@/lib/utils';

interface ProfileHeaderProps {
  onFollowersClick: () => void;
  onFollowingClick: () => void;
  onPostsClick: () => void;
  onLocationsClick: () => void;
  onBadgesClick?: () => void;
  selectedCity?: string | null;
  onCitySelect?: (city: string | null) => void;
}

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
  const { profile, refetch } = useOptimizedProfile();
  const { user } = useAuth();
  const { cities, categoryCounts } = useUserSavedCities(user?.id);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const { stats } = useOptimizedFollowStats();
  const { getStats } = useOptimizedSavedPlaces();
  const navigate = useNavigate();
  const { stories, refetch: refetchStories } = useStories();

  // Optimized realtime updates - only on specific changes, no polling
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile-changes-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        () => {
          // Debounce refetch to avoid too many calls
          setTimeout(() => refetch(), 300);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  const hasBusinessAccount = (profile as any)?.is_business_user || false;

  const getInitials = () => {
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const displayUsername = profile?.username || user?.user_metadata?.username || 'user';
  const savedPlacesStats = getStats();

  const displayStats = {
    posts: profile?.posts_count || stats.postsCount || 0,
    followers: profile?.follower_count || stats.followersCount || 0,
    following: profile?.following_count || stats.followingCount || 0,
    locations: savedPlacesStats.places || 0
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
            onClick={() => navigate('/settings')}
          >
            <img src={settingsIcon} alt="Settings" className="w-9 h-9 object-contain" />
          </Button>
        </div>
      </div>

      {/* Bio below avatar - aligned left */}
      {/* Cities Filter Section */}
      {cities.length > 0 && (
        <div className="px-3 pt-3 pb-1">
          {/* City Pills - Horizontally Scrollable */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {cities.map((cityData) => (
              <button
                key={cityData.city}
                onClick={() => onCitySelect?.(selectedCity === cityData.city ? null : cityData.city)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  selectedCity === cityData.city
                    ? 'bg-foreground text-background'
                    : 'bg-gray-200/60 dark:bg-slate-700/60 text-foreground'
                }`}
              >
                {cityData.city.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Stats Row with Category Cards */}
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
            {/* All Locations Card */}
            <button 
              onClick={() => navigate('/', { state: { showMapExpanded: true, filterUserId: user?.id, filterCategory: 'all' } })}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0"
            >
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  <span className="font-bold">{categoryCounts.all}</span>
                </div>
                <span className="text-xs text-muted-foreground">{t('userProfile.allLocations', { ns: 'common' })}</span>
              </div>
            </button>

            {/* Visited Locations Card */}
            <button 
              onClick={() => navigate('/', { state: { showMapExpanded: true, filterUserId: user?.id, filterCategory: 'been' } })}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0"
            >
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span className="font-bold">{categoryCounts.been}</span>
                </div>
                <span className="text-xs text-muted-foreground">{t('userProfile.visitedLocations', { ns: 'common' })}</span>
              </div>
            </button>

            {/* To Try Locations Card */}
            <button 
              onClick={() => navigate('/', { state: { showMapExpanded: true, filterUserId: user?.id, filterCategory: 'to-try' } })}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0"
            >
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <Bookmark className="w-4 h-4" />
                  <span className="font-bold">{categoryCounts.toTry}</span>
                </div>
                <span className="text-xs text-muted-foreground">{t('userProfile.toTryLocations', { ns: 'common' })}</span>
              </div>
            </button>

            {/* Favourite Locations Card */}
            <button 
              onClick={() => navigate('/', { state: { showMapExpanded: true, filterUserId: user?.id, filterCategory: 'favourite' } })}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0"
            >
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  <span className="font-bold">{categoryCounts.favourite}</span>
                </div>
                <span className="text-xs text-muted-foreground">{t('userProfile.favouriteLocations', { ns: 'common' })}</span>
              </div>
            </button>
          </div>
        </div>
      )}

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
