import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import WelcomePage from '@/components/WelcomePage';
import HomePage from '@/components/HomePage';
import SplashScreen from '@/components/SplashScreen';

const Index = () => {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  
  // Check if this is a fresh app load (not a page navigation)
  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      setShowSplash(false);
    }
  }, []);
  
  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
  };
  
  console.log('Index page: loading =', loading, 'user =', user?.email);
  
  // Show splash screen on app load
  if (showSplash && loading) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }
  
  if (loading) {
    console.log('Index page: Still loading, showing spinner');
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Show welcome page if user is not authenticated
  if (!user) {
    console.log('Index page: No user, showing welcome page');
    return <WelcomePage />;
  }

  console.log('Index page: User authenticated, showing home page');
  // Show main app if user is authenticated
  return <HomePage />;
};

export default Index;
