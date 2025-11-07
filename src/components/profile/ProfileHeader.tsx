
import { MoreHorizontal, Building2, Edit, LogOut, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
      .channel(`profile-changes-${user.id}`)
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const displayUsername = profile?.username || user?.user_metadata?.username || 'user';
  const savedPlacesStats = getStats();

  const displayStats = {
    posts: profile?.posts_count || stats.postsCount || 0,
    followers: profile?.follower_count || stats.followersCount || 0,
    following: profile?.following_count || stats.followingCount || 0,
    locations: savedPlacesStats.places || 0
  };

  // Get user's own stories
  const myStories = stories.filter(s => s.user_id === user?.id);
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
    <div className="py-4 bg-background">
      <div className="flex gap-4 px-3">
        {/* Profile Picture with Story */}
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
            </button>
          ) : (
            <button
              onClick={handleStoryClick}
              className="relative flex-shrink-0"
              aria-label="Create new story"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center bg-muted overflow-hidden">
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
                <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                  <Plus className="w-3 h-3 text-primary-foreground" />
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Stats and Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
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
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-background z-50">
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    {t('title', { ns: 'settings' })}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('logout', { ns: 'common' })}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Stats Row (without Posts) */}
          <div className="flex gap-4 mb-2">
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

          {/* Bio - only show if exists */}
          {profile?.bio && (
            <p className="text-sm text-foreground line-clamp-2">
              {profile.bio}
            </p>
          )}
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
