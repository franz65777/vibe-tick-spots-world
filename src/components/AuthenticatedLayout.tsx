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
      <div className={isDiscoverRoute ? "" : "pb-16"}>
        <Outlet />
      </div>
      {/* Temporarily disable bottom navigation to isolate crash */}
    </div>
  );
};

export default AuthenticatedLayout;
