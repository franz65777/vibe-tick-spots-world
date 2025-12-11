import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import WelcomePage from '@/components/WelcomePage';
import HomePage from '@/components/HomePage';
import SplashScreen from '@/components/SplashScreen';

const Index = () => {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(() => {
    // Check if splash should be shown (not seen yet in this session)
    return !sessionStorage.getItem('hasSeenSplash');
  });
  
  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
  };
  
  // Show splash screen when:
  // 1. User hasn't seen splash this session AND (loading OR user just signed in)
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }
  
  // After splash, show loading state if still loading auth
  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show welcome page if user is not authenticated
  if (!user) {
    return <WelcomePage />;
  }

  // Show main app if user is authenticated
  return <HomePage />;
};

export default Index;
