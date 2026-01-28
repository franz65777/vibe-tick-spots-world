
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  console.log('ProtectedRoute: loading =', loading, 'user =', user?.email);

  if (loading) {
    console.log('ProtectedRoute: Still loading, showing blank screen');
    return <div className="fixed inset-0 bg-background" />;
  }

  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  console.log('ProtectedRoute: User authenticated, rendering protected content');
  return <>{children}</>;
};

export default ProtectedRoute;
