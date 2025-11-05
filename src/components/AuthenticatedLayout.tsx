import React, { useEffect, useState } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import NewBottomNavigation from './NewBottomNavigation';
import BusinessBottomNavigation from './BusinessBottomNavigation';

const AuthenticatedLayout: React.FC = () => {
  const location = useLocation();
  const isBusinessRoute = location.pathname.startsWith('/business');
  const isDiscoverRoute = location.pathname === '/discover';
  const isSettingsRoute = location.pathname === '/settings';
  const isAddRoute = location.pathname === '/add' || location.pathname === '/business/add';
  const isHomePage = location.pathname === '/';
  const [isMapExpanded, setIsMapExpanded] = useState(false);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="h-screen overflow-hidden">
        <Outlet />
      </div>
      {!isDiscoverRoute && !isSettingsRoute && !isAddRoute && !isMapExpanded && (
        <div className="fixed bottom-0 left-0 right-0 z-[1500]">
          {isBusinessRoute ? <BusinessBottomNavigation /> : <NewBottomNavigation />}
        </div>
      )}
    </div>
  );
};

export default AuthenticatedLayout;
