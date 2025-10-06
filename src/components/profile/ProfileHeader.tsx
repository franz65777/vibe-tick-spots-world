
import { MoreHorizontal, Building2, Edit, LogOut, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import BadgeDisplay from './BadgeDisplay';
import EditProfileModal from './EditProfileModal';
import ProfilePictureEditor from '../ProfilePictureEditor';
import { useFollowStats } from '@/hooks/useFollowStats';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';

interface ProfileHeaderProps {
  onFollowersClick: () => void;
  onFollowingClick: () => void;
  onPostsClick: () => void;
  onLocationsClick: () => void;
}

const ProfileHeader = ({ 
  onFollowersClick, 
  onFollowingClick, 
  onPostsClick, 
  onLocationsClick 
}: ProfileHeaderProps) => {
  const { profile, refetch } = useProfile();
  const { user } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProfilePictureEditorOpen, setIsProfilePictureEditorOpen] = useState(false);
  const { stats } = useFollowStats();
  const { getStats } = useSavedPlaces();

  // Real-time updates - refetch on interval
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, [refetch]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        () => {
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows'
        },
        () => {
          refetch();
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

  return (
    <div className="px-4 py-4 bg-background">
      <div className="flex gap-4">
        {/* Profile Picture */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 p-0.5">
            <div className="w-full h-full rounded-full bg-background p-0.5">
              <div className="w-full h-full rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={displayUsername}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">{getInitials()}</span>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setIsProfilePictureEditorOpen(true)}
            className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors shadow-md"
          >
            <Camera className="w-2.5 h-2.5 text-primary-foreground" />
          </button>
        </div>

        {/* Stats and Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-base font-bold text-foreground truncate">{displayUsername}</h1>
              {hasBusinessAccount && (
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0">
                  <Building2 className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <BadgeDisplay userId={user?.id} />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stats Row */}
          <div className="flex gap-4 mb-2">
            <button 
              className="text-center"
              onClick={onPostsClick}
            >
              <div className="text-sm font-bold text-foreground">{displayStats.posts}</div>
              <div className="text-xs text-muted-foreground">Posts</div>
            </button>
            
            <button 
              className="text-center"
              onClick={onFollowersClick}
            >
              <div className="text-sm font-bold text-foreground">{displayStats.followers}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </button>
            
            <button 
              className="text-center"
              onClick={onFollowingClick}
            >
              <div className="text-sm font-bold text-foreground">{displayStats.following}</div>
              <div className="text-xs text-muted-foreground">Following</div>
            </button>
            
            <button 
              className="text-center"
              onClick={onLocationsClick}
            >
              <div className="text-sm font-bold text-foreground">{displayStats.locations}</div>
              <div className="text-xs text-muted-foreground">Saved</div>
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

      <EditProfileModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentProfile={profile}
      />

      <ProfilePictureEditor
        isOpen={isProfilePictureEditorOpen}
        onClose={() => setIsProfilePictureEditorOpen(false)}
        currentAvatarUrl={profile?.avatar_url || undefined}
      />
    </div>
  );
};

export default ProfileHeader;
