import React from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import NewBottomNavigation from './NewBottomNavigation';
import BusinessBottomNavigation from './BusinessBottomNavigation';

const AuthenticatedLayout: React.FC = () => {
  const location = useLocation();
  const isBusinessRoute = location.pathname.startsWith('/business');
  const isDiscoverRoute = location.pathname === '/discover';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-screen overflow-hidden">
        <Outlet />
      </div>
      {!isDiscoverRoute && (
        <div className="fixed bottom-0 left-0 right-0 z-[1500]">
          {isBusinessRoute ? <BusinessBottomNavigation /> : <NewBottomNavigation />}
        </div>
      )}
    </div>
  );
};

export default AuthenticatedLayout;
