import React, { useEffect, useState } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import NewBottomNavigation from './NewBottomNavigation';
import BusinessBottomNavigation from './BusinessBottomNavigation';
import { UIStateProvider, useUIState } from '@/contexts/UIStateContext';
import { AddOverlayProvider, useAddOverlay } from '@/contexts/AddOverlayContext';
import { NotificationsOverlayProvider, useNotificationsOverlay } from '@/contexts/NotificationsOverlayContext';
import { MessagesOverlayProvider, useMessagesOverlay } from '@/contexts/MessagesOverlayContext';
import { ExploreOverlayProvider, useExploreOverlay } from '@/contexts/ExploreOverlayContext';
import { FeedOverlayProvider, useFeedOverlay } from '@/contexts/FeedOverlayContext';
import { ProfileOverlayProvider, useProfileOverlay } from '@/contexts/ProfileOverlayContext';
import { LeaderboardOverlayProvider, useLeaderboardOverlay } from '@/contexts/LeaderboardOverlayContext';
import AddPageOverlay from './add/AddPageOverlay';
import LocationContributionModal from './explore/LocationContributionModal';
import NotificationsOverlay from './notifications/NotificationsOverlay';
import MessagesOverlay from './messages/MessagesOverlay';
import ExploreOverlay from './explore/ExploreOverlay';
import FeedOverlay from './feed/FeedOverlay';
import ProfileOverlay from './profile/ProfileOverlay';
import LeaderboardOverlay from './leaderboard/LeaderboardOverlay';

const AuthenticatedLayoutContent: React.FC = () => {
  const location = useLocation();
  const { isShareProfileOpen } = useUIState();
  const {
    isAddOverlayOpen,
    closeAddOverlay,
    addContributionLocation,
    setAddContributionLocation,
    isAddContributionModalOpen,
    setIsAddContributionModalOpen,
  } = useAddOverlay();
  const {
    isNotificationsOverlayOpen,
    closeNotificationsOverlay,
  } = useNotificationsOverlay();
  const {
    isMessagesOverlayOpen,
    closeMessagesOverlay,
  } = useMessagesOverlay();
  
  const isBusinessRoute = location.pathname.startsWith('/business') && !location.pathname.startsWith('/business/view');
  const isDiscoverRoute = location.pathname === '/discover';
  const isSettingsRoute = location.pathname === '/settings';
  const isPrivacySettingsRoute = location.pathname === '/privacy-settings';
  const isEditProfileRoute = location.pathname === '/edit-profile';
  const isCreateTripRoute = location.pathname === '/create-trip';
  const isCreateListRoute = location.pathname === '/create-list';
  const isSaveLocationRoute = location.pathname === '/save-location';
  const isShareLocationRoute = location.pathname === '/share-location';
  const isRewardsRoute = location.pathname === '/rewards';
  const isUserPlacesRoute = location.pathname.startsWith('/user-places');
  const isHomePage = location.pathname === '/';
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isPhotoSelection, setIsPhotoSelection] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isSplashOpen, setIsSplashOpen] = useState(() => document.body.getAttribute('data-splash-open') === 'true');

  // Monitor DOM for map expansion state on home page
  useEffect(() => {
    if (!isHomePage) {
      setIsMapExpanded(false);
      return;
    }

    const observer = new MutationObserver(() => {
      const homeDiv = document.querySelector('[data-map-expanded]');
      if (homeDiv) {
        const expanded = homeDiv.getAttribute('data-map-expanded') === 'true';
        setIsMapExpanded(expanded);
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-map-expanded'],
      subtree: true
    });

    return () => observer.disconnect();
  }, [isHomePage]);

  // Monitor photo selection state
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const addDiv = document.querySelector('[data-photo-selection]');
      if (addDiv) {
        const selecting = addDiv.getAttribute('data-photo-selection') === 'true';
        setIsPhotoSelection(selecting);
      } else {
        setIsPhotoSelection(false);
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-photo-selection'],
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  // Monitor folder modal state
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const folderModalOpen = document.body.getAttribute('data-folder-modal-open') === 'true';
      setIsFolderModalOpen(folderModalOpen);
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-folder-modal-open'],
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  // Monitor onboarding state
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const homeDiv = document.querySelector('[data-onboarding-open]');
      if (homeDiv) {
        const onboardingOpen = homeDiv.getAttribute('data-onboarding-open') === 'true';
        setIsOnboardingOpen(onboardingOpen);
      } else {
        setIsOnboardingOpen(false);
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-onboarding-open'],
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  // Monitor splash screen state
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const splashOpen = document.body.getAttribute('data-splash-open') === 'true';
      setIsSplashOpen(splashOpen);
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-splash-open']
    });

    return () => observer.disconnect();
  }, []);

  const shouldHideNav = isDiscoverRoute || isSettingsRoute || isPrivacySettingsRoute || isEditProfileRoute || 
    isCreateTripRoute || isCreateListRoute || isSaveLocationRoute || isShareLocationRoute ||
    isUserPlacesRoute || isRewardsRoute || isMapExpanded || isPhotoSelection || isFolderModalOpen || isOnboardingOpen || isShareProfileOpen || isSplashOpen;

  return (
    <div className="min-h-screen bg-background">
      <div className="h-screen overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0">
          <Outlet />
        </div>
        {!shouldHideNav && (
          <div className="fixed bottom-0 left-0 right-0 z-[1500]">
            {isBusinessRoute ? <BusinessBottomNavigation /> : <NewBottomNavigation />}
          </div>
        )}
      </div>
      
      {/* Add Page Overlay - rendered at layout level for all pages */}
      <AddPageOverlay
        isOpen={isAddOverlayOpen}
        onClose={closeAddOverlay}
        onLocationSelected={(loc) => {
          closeAddOverlay();
          setAddContributionLocation(loc);
          setIsAddContributionModalOpen(true);
        }}
      />
      
      {/* Add Contribution Modal - rendered at layout level for all pages */}
      {addContributionLocation && (
        <LocationContributionModal
          isOpen={isAddContributionModalOpen}
          onClose={() => setIsAddContributionModalOpen(false)}
          location={addContributionLocation}
          onSuccess={() => setIsAddContributionModalOpen(false)}
        />
      )}
      
      {/* Notifications Overlay - rendered at layout level for all pages */}
      <NotificationsOverlay
        isOpen={isNotificationsOverlayOpen}
        onClose={closeNotificationsOverlay}
      />
      
      {/* Messages Overlay - rendered at layout level for all pages */}
      <MessagesOverlay
        isOpen={isMessagesOverlayOpen}
        onClose={closeMessagesOverlay}
      />
      
      {/* Explore Overlay - rendered at layout level for all pages */}
      <ExploreOverlay />
      
      {/* Feed Overlay - rendered at layout level for all pages */}
      <FeedOverlay />
      
      {/* Profile Overlay - rendered at layout level for all pages */}
      <ProfileOverlay />
      
      {/* Leaderboard Overlay - rendered at layout level for all pages */}
      <LeaderboardOverlay />
    </div>
  );
};

const AuthenticatedLayout: React.FC = () => {
  return (
    <UIStateProvider>
      <AddOverlayProvider>
        <NotificationsOverlayProvider>
          <MessagesOverlayProvider>
            <ExploreOverlayProvider>
              <FeedOverlayProvider>
                <ProfileOverlayProvider>
                  <LeaderboardOverlayProvider>
                    <AuthenticatedLayoutContent />
                  </LeaderboardOverlayProvider>
                </ProfileOverlayProvider>
              </FeedOverlayProvider>
            </ExploreOverlayProvider>
          </MessagesOverlayProvider>
        </NotificationsOverlayProvider>
      </AddOverlayProvider>
    </UIStateProvider>
  );
};

export default AuthenticatedLayout;
