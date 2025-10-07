
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-16">
        {children}
      </div>
      {isBusinessRoute ? <BusinessBottomNavigation /> : <NewBottomNavigation />}
    </div>
  );
};

export default AuthenticatedLayout;
