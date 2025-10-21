
import React from 'react';
import { useLocation } from 'react-router-dom';
import NewBottomNavigation from './NewBottomNavigation';
import BusinessBottomNavigation from './BusinessBottomNavigation';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ children }) => {
  const location = useLocation();
  const isBusinessRoute = location.pathname.startsWith('/business');
  const isDiscoverRoute = location.pathname === '/discover';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={isDiscoverRoute ? "" : "pb-16"}>
        {children}
      </div>
      {/* Temporarily disable bottom navigation to isolate crash */}
    </div>
  );
};

export default AuthenticatedLayout;
