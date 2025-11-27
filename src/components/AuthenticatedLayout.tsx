import React, { useEffect, useState } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import NewBottomNavigation from './NewBottomNavigation';
import BusinessBottomNavigation from './BusinessBottomNavigation';

const AuthenticatedLayout: React.FC = () => {
  const location = useLocation();
  const isBusinessRoute = location.pathname.startsWith('/business');
  const isDiscoverRoute = location.pathname === '/discover';
  const isSettingsRoute = location.pathname === '/settings';
  const isEditProfileRoute = location.pathname === '/edit-profile';
  const isCreateTripRoute = location.pathname === '/create-trip';
  const isCreateListRoute = location.pathname === '/create-list';
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

  return (
    <div className="min-h-screen bg-background">
      <div className="h-screen overflow-hidden">
        <Outlet />
      </div>
      {!isDiscoverRoute && !isSettingsRoute && !isEditProfileRoute && !isCreateTripRoute && !isCreateListRoute && !isMapExpanded && !isPhotoSelection && !isFolderModalOpen && !isOnboardingOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-[1500]">
          {isBusinessRoute ? <BusinessBottomNavigation /> : <NewBottomNavigation />}
        </div>
      )}
    </div>
  );
};

export default AuthenticatedLayout;
