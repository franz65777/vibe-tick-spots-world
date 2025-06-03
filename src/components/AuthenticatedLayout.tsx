
import React from 'react';
import BottomNavigation from './BottomNavigation';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-16">
        {children}
      </div>
      <BottomNavigation />
    </div>
  );
};

export default AuthenticatedLayout;
