import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import WelcomePage from '@/components/WelcomePage';
import HomePage from '@/components/HomePage';
import SplashScreen from '@/components/SplashScreen';

const Index = () => {
  const { user, loading } = useAuth();
  const [splashMode, setSplashMode] = useState<'initial' | 'auth' | null>(() => {
    // If we've never seen splash this session, start in initial mode
    if (!sessionStorage.getItem('hasSeenSplash')) return 'initial';
    // If auth just completed, auth page will set this before navigating here
    if (sessionStorage.getItem('playSplashAfterAuth') === 'true') return 'auth';
    return null;
  });

  useEffect(() => {
    if (splashMode === 'auth') {
      // Clear the flag as soon as we mount in auth splash mode
      sessionStorage.removeItem('playSplashAfterAuth');
    }
  }, [splashMode]);
  
  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setSplashMode(null);
  };
  
  // Show splash screen when in either initial or auth mode
  if (splashMode) {
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
