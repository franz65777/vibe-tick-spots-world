import React, { useEffect, useState } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import NewBottomNavigation from './NewBottomNavigation';
import BusinessBottomNavigation from './BusinessBottomNavigation';
import { UIStateProvider, useUIState } from '@/contexts/UIStateContext';

const AuthenticatedLayoutContent: React.FC = () => {
  const location = useLocation();
  const { isShareProfileOpen } = useUIState();
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

  const shouldHideNav = isDiscoverRoute || isSettingsRoute || isPrivacySettingsRoute || isEditProfileRoute || 
    isCreateTripRoute || isCreateListRoute || isSaveLocationRoute || isShareLocationRoute ||
    isUserPlacesRoute || isRewardsRoute || isMapExpanded || isPhotoSelection || isFolderModalOpen || isOnboardingOpen || isShareProfileOpen;

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
    </div>
  );
};

const AuthenticatedLayout: React.FC = () => {
  return (
    <UIStateProvider>
      <AuthenticatedLayoutContent />
    </UIStateProvider>
  );
};

export default AuthenticatedLayout;
