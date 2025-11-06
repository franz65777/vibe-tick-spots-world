import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Bell, BellOff, MoreHorizontal, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useMutualFollowers } from '@/hooks/useMutualFollowers';
import { useNotificationMuting } from '@/hooks/useNotificationMuting';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import ProfileTabs from './profile/ProfileTabs';
import PostsGrid from './profile/PostsGrid';
import TripsGrid from './profile/TripsGrid';
import TaggedPostsGrid from './profile/TaggedPostsGrid';
import BadgeDisplay from './profile/BadgeDisplay';
import Achievements from './profile/Achievements';
import FollowersModal from './profile/FollowersModal';
import SavedLocationsList from './profile/SavedLocationsList';
import ShareProfileModal from './profile/ShareProfileModal';
import MessagesModal from './MessagesModal';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const { profile, loading, error, followUser, unfollowUser } = useUserProfile(userId);
  const { mutualFollowers, totalCount } = useMutualFollowers(userId);
  const { isMuted, toggleMute } = useNotificationMuting(userId);
  const [activeTab, setActiveTab] = useState('posts');
  const [modalState, setModalState] = useState<{ isOpen: boolean; type: 'followers' | 'following' | null }>({
    isOpen: false,
    type: null
  });
  const [isLocationsListOpen, setIsLocationsListOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);

  // Recording visits for search history is handled in ExplorePage only to avoid duplicates
  useEffect(() => {
    // Intentionally left blank
  }, []);

  const isOwnProfile = currentUser?.id === userId;

  const handleBack = () => {
    const state = location.state as { from?: string; searchQuery?: string; searchMode?: 'locations' | 'users' } | null;
    if (state?.from === 'explore') {
      // Return to explore with preserved search state
      navigate('/explore', { 
        state: { 
          searchQuery: state.searchQuery || '',
          searchMode: state.searchMode || 'users'
        },
        replace: true
      });
    } else {
      navigate(-1);
    }
  };

  const openModal = (type: 'followers' | 'following') => {
    setModalState({ isOpen: true, type });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null });
  };

  const getInitials = () => {
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const handleFollowToggle = () => {
    if (profile?.is_following) {
      unfollowUser();
    } else {
      followUser();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-4">User not found</p>
            <Button onClick={handleBack}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  const displayUsername = profile.username || 'Unknown User';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return <PostsGrid userId={userId} />;
      case 'trips':
        return <TripsGrid />;
      case 'badges':
        return <Achievements userId={userId} />;
      case 'tagged':
        return <TaggedPostsGrid userId={userId} />;
      default:
        return <PostsGrid userId={userId} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header - Instagram Style */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3 flex-1">
          <button 
            onClick={handleBack}
            className="p-0 hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">{displayUsername}</h1>
        </div>
{!isOwnProfile && (
          <div className="flex items-center gap-3">
            <Button
              onClick={toggleMute}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              title={isMuted ? 'Unmute notifications' : 'Mute notifications'}
            >
              {isMuted ? (
                <BellOff className="w-5 h-5" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
            </Button>
            <Button
              onClick={() => setIsShareModalOpen(true)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              title="Share profile"
            >
              <MoreHorizontal className="w-5 h-5" />
            </Button>
            {/* Badge positioned in header */}
            <div className="scale-90">
              <BadgeDisplay userId={userId} />
            </div>
          </div>
        )}
      </div>

      {/* Profile Header - Instagram Style */}
      <div className="px-4 py-6">
        {/* Avatar and Username/Stats Row */}
        <div className="flex items-start gap-4 mb-4">
          {/* Smaller Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 p-0.5">
              <div className="w-full h-full rounded-full bg-background p-0.5">
                <Avatar className="w-full h-full">
                  <AvatarImage src={profile.avatar_url || undefined} alt={displayUsername} />
                  <AvatarFallback className="text-lg font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>

          {/* Username and Stats Column */}
          <div className="flex-1 flex flex-col gap-3">
            {/* Username */}
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{displayUsername}</h2>
            </div>

            {/* Stats Row - Followers, Following, Saved */}
            <div className="flex gap-4 text-sm">
              <button 
                onClick={() => openModal('followers')}
                className="hover:opacity-70 transition-opacity"
              >
                <span className="font-bold">{profile.followers_count || 0}</span>{' '}
                <span className="text-muted-foreground">Followers</span>
              </button>
              
              <button 
                onClick={() => openModal('following')}
                className="hover:opacity-70 transition-opacity"
              >
                <span className="font-bold">{profile.following_count || 0}</span>{' '}
                <span className="text-muted-foreground">Following</span>
              </button>
              
              <button 
                onClick={() => setIsLocationsListOpen(true)}
                className="hover:opacity-70 transition-opacity"
              >
                <span className="font-bold">{profile.places_visited || 0}</span>{' '}
                <span className="text-muted-foreground">Saved</span>
              </button>
            </div>
          </div>
        </div>

        {/* Full Name (only if different from username) */}
        {profile.full_name && profile.full_name !== displayUsername && (
          <div className="mb-1">
            <h2 className="text-sm font-semibold text-foreground">
              {profile.full_name}
            </h2>
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-foreground mb-3">
            {profile.bio}
          </p>
        )}

        {/* Mutual Followers */}
        {!isOwnProfile && mutualFollowers.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex -space-x-2">
              {mutualFollowers.map((follower) => (
                <Avatar key={follower.id} className="w-6 h-6 border-2 border-background">
                  <AvatarImage src={follower.avatar_url || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {follower.username?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Followed by{' '}
              <span className="font-semibold text-foreground">
                {mutualFollowers[0]?.username}
              </span>
              {totalCount > 1 && (
                <span> and {totalCount - 1} other{totalCount > 2 ? 's' : ''}</span>
              )}
            </p>
          </div>
        )}

        {/* Action Buttons - Instagram Style */}
        {!isOwnProfile && (
          <div className="flex gap-2">
            <Button 
              onClick={handleFollowToggle}
              variant={profile.is_following ? "secondary" : "default"}
              className="flex-1 rounded-lg font-semibold h-9"
            >
              {profile.is_following ? (
                <>
                  Following
                  <ChevronDown className="w-4 h-4 ml-1" />
                </>
              ) : (
                'Follow'
              )}
            </Button>
            <Button 
              variant="secondary"
              size="icon"
              className="rounded-lg h-9 w-9"
              onClick={() => setIsMessagesOpen(true)}
              title="Send message"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Tab Content */}
      <div className="flex-1 pb-4 overflow-y-auto">
        {renderTabContent()}
      </div>

      <FollowersModal 
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type || 'followers'}
        userId={userId}
      />

      <SavedLocationsList
        isOpen={isLocationsListOpen}
        onClose={() => setIsLocationsListOpen(false)}
        userId={userId}
      />

      <ShareProfileModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        profileId={userId || ''}
        profileUsername={displayUsername}
      />

      <MessagesModal
        isOpen={isMessagesOpen}
        onClose={() => setIsMessagesOpen(false)}
        initialUserId={userId}
      />
    </div>
  );
};

export default UserProfilePage;
