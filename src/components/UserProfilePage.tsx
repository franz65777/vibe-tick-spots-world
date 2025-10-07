import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserProfile } from '@/hooks/useUserProfile';
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

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { profile, loading, error, followUser, unfollowUser } = useUserProfile(userId);
  const [activeTab, setActiveTab] = useState('posts');
  const [modalState, setModalState] = useState<{ isOpen: boolean; type: 'followers' | 'following' | null }>({
    isOpen: false,
    type: null
  });
  const [isLocationsListOpen, setIsLocationsListOpen] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

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
            <Button onClick={() => navigate(-1)}>Go Back</Button>
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold">{displayUsername}</h1>
        <div className="w-10" />
      </div>

      {/* Profile Header */}
      <div className="px-4 py-4">
        <div className="flex gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 p-0.5">
              <div className="w-full h-full rounded-full bg-background p-0.5">
                <Avatar className="w-full h-full">
                  <AvatarImage src={profile.avatar_url || undefined} alt={displayUsername} />
                  <AvatarFallback className="text-sm font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-base font-bold text-foreground truncate">{displayUsername}</h1>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              <BadgeDisplay userId={userId} />
            </div>

            {/* Stats Row */}
            <div className="flex gap-4 mb-2">
              <button 
                className="text-center"
                onClick={() => openModal('followers')}
              >
                <div className="text-sm font-bold text-foreground">{profile.followers_count || 0}</div>
                <div className="text-xs text-muted-foreground">Followers</div>
              </button>
              
              <button 
                className="text-center"
                onClick={() => openModal('following')}
              >
                <div className="text-sm font-bold text-foreground">{profile.following_count || 0}</div>
                <div className="text-xs text-muted-foreground">Following</div>
              </button>
              
              <button 
                className="text-center"
                onClick={() => setIsLocationsListOpen(true)}
              >
                <div className="text-sm font-bold text-foreground">{profile.places_visited || 0}</div>
                <div className="text-xs text-muted-foreground">Saved</div>
              </button>
            </div>

            {profile.bio && (
              <p className="text-sm text-foreground line-clamp-2">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Follow Button */}
        {!isOwnProfile && (
          <Button 
            onClick={handleFollowToggle}
            variant={profile.is_following ? "outline" : "default"}
            className="w-full mt-4"
          >
            {profile.is_following ? 'Following' : 'Follow'}
          </Button>
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
    </div>
  );
};

export default UserProfilePage;
