import { useState, useEffect, memo, lazy, useCallback, useMemo } from 'react';
import { useProfileAggregated } from '@/hooks/useProfileAggregated';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTabPrefetch } from '@/hooks/useTabPrefetch';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollHide } from '@/hooks/useScrollHide';
import ProfileHeader from './profile/ProfileHeader';
import ProfileTabs from './profile/ProfileTabs';
import FollowersModal from './profile/FollowersModal';
import SavedLocationsList from './profile/SavedLocationsList';
import { useUserBadges } from '@/hooks/useUserBadges';
import ProfileSkeleton from './ProfileSkeleton';
import SwipeableTabContent from './common/SwipeableTabContent';
import FrostedGlassBackground from './common/FrostedGlassBackground';

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
 * - Data passed as props to children (no duplicate queries)
 * - React Query caching for instant transitions
 * - Prefetch on navigation hover
 */
const ProfilePage = memo(() => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // SINGLE source of truth for profile data
  const { profile, stats, categoryCounts, loading, error, refetch, adjustFollowingCount, adjustFollowersCount } = useProfileAggregated();
  
  // SINGLE source of truth for badges
  const { badges } = useUserBadges();
  
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
  const [lastBadgeCount, setLastBadgeCount] = useState(0);
  const [hasNewBadges, setHasNewBadges] = useState(false);

  // iOS-style hide-on-scroll for ProfileTabs
  const { hidden: tabsHidden, setScrollContainer, resetHidden } = useScrollHide({ 
    threshold: 50, 
    enabled: isMobile 
  });

  // Reset hidden state when tab changes
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    resetHidden();
  }, [resetHidden]);

  // Callback for scroll containers in each tab
  const scrollContainerRef = useCallback((element: HTMLDivElement | null) => {
    setScrollContainer(element);
  }, [setScrollContainer]);

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
      handleTabChange(state.activeTab);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Reset state when user or URL tab changes - prevents showing stale data
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlTab = params.get('tab');

    if (urlTab === 'posts' || urlTab === 'trips' || urlTab === 'badges' || urlTab === 'tagged') {
      handleTabChange(urlTab);
    } else {
      handleTabChange('posts');
    }

    setModalState({ isOpen: false, type: null });
    setIsLocationsListOpen(false);
  }, [user?.id, location.search, handleTabChange]);

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
    handleTabChange('posts');
  };

  const handleLocationsClick = () => {
    setIsLocationsListOpen(true);
  };

  // Memoize tabsConfig BEFORE any early returns (React hooks rule)
  const tabsConfig = useMemo(() => [
    { key: 'posts', content: <div ref={activeTab === 'posts' ? scrollContainerRef : undefined} className="h-full overflow-y-auto pb-20"><PostsGrid userId={user?.id} /></div> },
    { key: 'trips', content: <div ref={activeTab === 'trips' ? scrollContainerRef : undefined} className="h-full overflow-y-auto pb-20"><TripsGrid /></div> },
    { key: 'badges', content: <div ref={activeTab === 'badges' ? scrollContainerRef : undefined} className="h-full overflow-y-auto pb-20"><Achievements userId={user?.id} /></div> },
    { key: 'tagged', content: <div ref={activeTab === 'tagged' ? scrollContainerRef : undefined} className="h-full overflow-y-auto pb-20"><TaggedPostsGrid /></div> },
  ], [activeTab, user?.id, scrollContainerRef]);

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

  return (
    <div className="relative flex flex-col h-full pt-[env(safe-area-inset-top)]">
      {/* Unified frosted glass background */}
      <FrostedGlassBackground />
      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col h-full">
      <ProfileHeader
        profile={profile}
        stats={stats}
        categoryCounts={categoryCounts}
        badges={badges}
        loading={loading}
        onFollowersClick={() => openModal('followers')}
        onFollowingClick={() => openModal('following')}
        onPostsClick={handlePostsClick}
        onLocationsClick={handleLocationsClick}
        onBadgesClick={() => setActiveTab('badges')}
      />
      
      {/* ProfileTabs - iOS-style hide on scroll with GPU acceleration */}
      <div 
        className="will-change-transform overflow-hidden"
        style={{
          transform: tabsHidden ? 'translateY(-100%)' : 'translateY(0)',
          maxHeight: tabsHidden ? 0 : 60,
          opacity: tabsHidden ? 0 : 1,
          marginBottom: tabsHidden ? -8 : 0,
          transition: 'transform 200ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms cubic-bezier(0.32, 0.72, 0, 1), max-height 200ms cubic-bezier(0.32, 0.72, 0, 1), margin-bottom 200ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <ProfileTabs
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          hasNewBadges={hasNewBadges}
        />
      </div>
      
      {/* Tab Content - Swipeable on mobile */}
      <SwipeableTabContent
        tabs={tabsConfig}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        enabled={isMobile}
      />

      <FollowersModal 
        isOpen={modalState.isOpen}
        onClose={closeModal}
        initialTab={modalState.type || 'followers'}
        // Evita refetch che causa "flash" di loading: i contatori vengono aggiornati via cache + realtime
        onFollowChange={() => {}}
        onAdjustFollowingCount={adjustFollowingCount}
        onAdjustFollowersCount={adjustFollowersCount}
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
