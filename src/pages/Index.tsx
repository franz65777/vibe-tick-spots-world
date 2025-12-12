import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import WelcomePage from '@/components/WelcomePage';
import HomePage from '@/components/HomePage';
import SplashScreen from '@/components/SplashScreen';

let hasPlayedSplashThisRuntime = false;

const Index = () => {
  const { user, loading } = useAuth();
  const [splashMode, setSplashMode] = useState<'initial' | 'auth' | null>(() => {
    // Highest priority: explicit auth splash right after sign-in
    if (sessionStorage.getItem('playSplashAfterAuth') === 'true') return 'auth';

    // Prevent re-playing the intro within the same app runtime
    if (hasPlayedSplashThisRuntime) return null;

    // Show intro once when the app is first opened in this browser session
    if (!sessionStorage.getItem('hasSeenSplash')) return 'initial';

    return null;
  });

  useEffect(() => {
    if (splashMode === 'auth') {
      // Clear the flag as soon as we mount in auth splash mode
      sessionStorage.removeItem('playSplashAfterAuth');
    }
  }, [splashMode]);
  
  const handleSplashComplete = () => {
    hasPlayedSplashThisRuntime = true;
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
