
import { useState, useEffect, memo } from 'react';
import { useOptimizedProfile } from '@/hooks/useOptimizedProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTabPrefetch } from '@/hooks/useTabPrefetch';
import ProfileHeader from './profile/ProfileHeader';
import ProfileStats from './profile/ProfileStats';
import ProfileTabs from './profile/ProfileTabs';
import Achievements from './profile/Achievements';
import PostsGrid from './profile/PostsGrid';
import TripsGrid from './profile/TripsGrid';
import TaggedPostsGrid from './profile/TaggedPostsGrid';
import FollowersModal from './profile/FollowersModal';
import SavedLocationsList from './profile/SavedLocationsList';
import { useUserBadges } from '@/hooks/useUserBadges';
import { ThemeToggle } from './ThemeToggle';
import ProfileSkeleton from './ProfileSkeleton';

const ProfilePage = memo(() => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile, loading, error } = useOptimizedProfile();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Prefetch altre tab per transizioni istantanee
  useTabPrefetch('profile');
  const [activeTab, setActiveTab] = useState('posts');
  const [modalState, setModalState] = useState<{ isOpen: boolean; type: 'followers' | 'following' | null }>({
    isOpen: false,
    type: null
  });
  const [isLocationsListOpen, setIsLocationsListOpen] = useState(false);
  const [initialFolderId, setInitialFolderId] = useState<string | null>(null);
  const { badges } = useUserBadges();
  const [lastBadgeCount, setLastBadgeCount] = useState(0);
  const [hasNewBadges, setHasNewBadges] = useState(false);

  // Handle opening folder from message share
  useEffect(() => {
    const state = location.state as any;
    if (state?.openFolderId) {
      setInitialFolderId(state.openFolderId);
      setIsLocationsListOpen(true);
      // Clear the state to prevent reopening on subsequent renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Reset state when user changes - prevents showing stale data
  useEffect(() => {
    setActiveTab('posts');
    setModalState({ isOpen: false, type: null });
    setIsLocationsListOpen(false);
  }, [user?.id]);

  // Track new badges
  useEffect(() => {
    const earnedCount = badges.filter(b => b.earned).length;
    if (lastBadgeCount > 0 && earnedCount > lastBadgeCount) {
      setHasNewBadges(true);
    }
    setLastBadgeCount(earnedCount);
  }, [badges]);

  // Clear new badge indicator when viewing badges tab
  useEffect(() => {
    if (activeTab === 'badges') {
      setHasNewBadges(false);
    }
  }, [activeTab]);

  const openModal = (type: 'followers' | 'following') => {
    setModalState({ isOpen: true, type });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null });
  };

  const handlePostsClick = () => {
    setActiveTab('posts');
  };

  const handleLocationsClick = () => {
    setIsLocationsListOpen(true);
  };

  // Mostra skeleton solo al primo caricamento - React Query gestisce il resto
  if (loading && !profile) {
    return <ProfileSkeleton />;
  }

  // Don't render if user mismatch
  if (profile && user && profile.id !== user.id) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-background pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error loading profile: {error}</p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return <PostsGrid />;
      case 'trips':
        return <TripsGrid />;
      case 'badges':
        return <Achievements userId={user?.id} />;
      case 'tagged':
        return <TaggedPostsGrid />;
      default:
        return <PostsGrid />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background pt-[env(safe-area-inset-top)]">
      <ProfileHeader 
        onFollowersClick={() => openModal('followers')}
        onFollowingClick={() => openModal('following')}
        onPostsClick={handlePostsClick}
        onLocationsClick={handleLocationsClick}
        onBadgesClick={() => setActiveTab('badges')}
      />
      
      <ProfileTabs
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        hasNewBadges={hasNewBadges}
      />
      
      {/* Tab Content */}
      <div className="flex-1 pb-4">
        {renderTabContent()}
      </div>

      <FollowersModal 
        isOpen={modalState.isOpen}
        onClose={closeModal}
        initialTab={modalState.type || 'followers'}
      />

      <SavedLocationsList
        isOpen={isLocationsListOpen}
        onClose={() => {
          setIsLocationsListOpen(false);
          setInitialFolderId(null);
        }}
        initialFolderId={initialFolderId}
      />
    </div>
  );
});

ProfilePage.displayName = 'ProfilePage';

export default ProfilePage;
