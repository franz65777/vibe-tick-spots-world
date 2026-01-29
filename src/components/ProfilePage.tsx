import { useState, useEffect, memo, lazy, Suspense } from 'react';
import { useProfileAggregated } from '@/hooks/useProfileAggregated';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTabPrefetch } from '@/hooks/useTabPrefetch';
import ProfileHeader from './profile/ProfileHeader';
import ProfileTabs from './profile/ProfileTabs';
import FollowersModal from './profile/FollowersModal';
import SavedLocationsList from './profile/SavedLocationsList';
import { useUserBadges } from '@/hooks/useUserBadges';
import ProfileSkeleton from './ProfileSkeleton';
import TabContentSkeleton from './profile/TabContentSkeleton';

// Lazy load tab content for bundle splitting
const PostsGrid = lazy(() => import('./profile/PostsGrid'));
const TripsGrid = lazy(() => import('./profile/TripsGrid'));
const Achievements = lazy(() => import('./profile/Achievements'));
const TaggedPostsGrid = lazy(() => import('./profile/TaggedPostsGrid'));

/**
 * ProfilePage - Optimized for 20k+ concurrent users
 * 
 * PERFORMANCE IMPROVEMENTS:
 * - Lazy loaded tab components (PostsGrid, TripsGrid, Achievements, TaggedPostsGrid)
 * - Single consolidated query via useProfileAggregated
 * - React Query caching for instant transitions
 * - Prefetch on navigation hover
 */
const ProfilePage = memo(() => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile, loading, error, refetch } = useProfileAggregated();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Prefetch altre tab per transizioni istantanee
  useTabPrefetch('profile');

  // Prefetch settings route chunk for faster opening
  useEffect(() => {
    import('@/pages/SettingsPage');
  }, []);

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

  // Handle opening folder from message share or returning from rewards
  useEffect(() => {
    const state = location.state as any;
    if (state?.openFolderId) {
      setInitialFolderId(state.openFolderId);
      setIsLocationsListOpen(true);
      // Clear the state to prevent reopening on subsequent renders
      window.history.replaceState({}, document.title);
    }
    if (state?.activeTab) {
      setActiveTab(state.activeTab);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Reset state when user or URL tab changes - prevents showing stale data
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlTab = params.get('tab');

    if (urlTab === 'posts' || urlTab === 'trips' || urlTab === 'badges' || urlTab === 'tagged') {
      setActiveTab(urlTab);
    } else {
      setActiveTab('posts');
    }

    setModalState({ isOpen: false, type: null });
    setIsLocationsListOpen(false);
  }, [user?.id, location.search]);

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
    return (
      <Suspense fallback={<TabContentSkeleton />}>
        {activeTab === 'posts' && (
          <div className="h-full overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
            <PostsGrid />
          </div>
        )}
        {activeTab === 'trips' && <TripsGrid />}
        {activeTab === 'badges' && <Achievements userId={user?.id} />}
        {activeTab === 'tagged' && (
          <div className="h-full overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
            <TaggedPostsGrid />
          </div>
        )}
      </Suspense>
    );
  };

  return (
    <div className="relative flex flex-col h-full pt-[env(safe-area-inset-top)]">
      {/* Subtle gradient base */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-blue-950/20 dark:via-purple-950/15 dark:to-pink-950/20" />
      </div>
      {/* Frosted glass overlay */}
      <div className="absolute inset-0 z-[1] bg-[#FAF9F7]/80 dark:bg-background/80 backdrop-blur-xl" />
      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col h-full">
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
      <div className="flex-1 min-h-0 overflow-hidden">
        {renderTabContent()}
      </div>

      <FollowersModal 
        isOpen={modalState.isOpen}
        onClose={closeModal}
        initialTab={modalState.type || 'followers'}
        onFollowChange={() => refetch()}
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
    </div>
  );
});

ProfilePage.displayName = 'ProfilePage';

export default ProfilePage;
