
import { Building2, Plus } from 'lucide-react';
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
}

const ProfileHeader = ({ 
  onFollowersClick, 
  onFollowingClick, 
  onPostsClick, 
  onLocationsClick,
  onBadgesClick
}: ProfileHeaderProps) => {
  const { t } = useTranslation();
  const { profile, refetch } = useOptimizedProfile();
  const { user } = useAuth();
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
    <div className="py-2 bg-background">
      <div className="flex gap-4 px-3">
        {/* Profile Picture - Story feature hidden for now */}
        <div className="relative shrink-0">
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
              {/* Add story button hidden - keeping logic for later
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreateStoryOpen(true);
                }}
                className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-primary border-2 border-background flex items-center justify-center hover:bg-primary/90 transition-colors"
                aria-label="Add another story"
              >
                <Plus className="w-3 h-3 text-primary-foreground" />
              </button>
              */}
            </button>
          ) : (
            <div className="relative flex-shrink-0">
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
              {/* Create story button hidden - keeping logic for later
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                <Plus className="w-3 h-3 text-primary-foreground" />
              </div>
              */}
            </div>
          )}
        </div>

        {/* Stats and Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h1 className="text-base font-bold text-foreground">{displayUsername}</h1>
              {hasBusinessAccount && (
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0">
                  <Building2 className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </div>
            
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

          {/* Bio - only show if exists */}
          {profile?.bio && (
            <p className="text-sm text-foreground text-left line-clamp-2 mb-2">
              {profile.bio}
            </p>
          )}

          {/* Stats Row (without Posts) */}
          <div className="flex gap-4">
            <button 
              className="text-center"
              onClick={onFollowersClick}
            >
              <div className="text-sm font-bold text-foreground">{displayStats.followers}</div>
              <div className="text-xs text-muted-foreground">{t('followers', { ns: 'common' })}</div>
            </button>
            
            <button 
              className="text-center"
              onClick={onFollowingClick}
            >
              <div className="text-sm font-bold text-foreground">{displayStats.following}</div>
              <div className="text-xs text-muted-foreground">{t('following', { ns: 'common' })}</div>
            </button>
            
            <button 
              className="text-center"
              onClick={onLocationsClick}
            >
              <div className="text-sm font-bold text-foreground">{displayStats.locations}</div>
              <div className="text-xs text-muted-foreground">{t('saved', { ns: 'mapFilters' })}</div>
            </button>
          </div>
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
