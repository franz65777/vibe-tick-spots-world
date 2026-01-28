import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import WelcomePage from '@/components/WelcomePage';
import HomePage from '@/components/HomePage';
import SplashScreen from '@/components/SplashScreen';

// Track if splash was shown in THIS runtime session
let splashShownThisSession = false;

const Index = () => {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(false);
  const previousUserRef = useRef<string | null>(null);
  const initialCheckDoneRef = useRef(false);

  // Handle splash screen logic
  useEffect(() => {
    if (loading) return;

    // Check for sign-in flag first (highest priority)
    const justSignedIn = sessionStorage.getItem('playSplashAfterAuth') === 'true';
    
    if (justSignedIn && !splashShownThisSession) {
      sessionStorage.removeItem('playSplashAfterAuth');
      setShowSplash(true);
      return;
    }

    // Fresh app open - show splash only if authenticated and hasn't been shown
    if (!initialCheckDoneRef.current) {
      initialCheckDoneRef.current = true;
      if (user && !splashShownThisSession) {
        setShowSplash(true);
      }
    }
  }, [loading, user]);

  // Detect sign-in transition (user was null, now has value)
  useEffect(() => {
    if (!loading && user && previousUserRef.current === null && initialCheckDoneRef.current) {
      // User just signed in after being on welcome page
      const justSignedIn = sessionStorage.getItem('playSplashAfterAuth') === 'true';
      if (justSignedIn && !splashShownThisSession) {
        sessionStorage.removeItem('playSplashAfterAuth');
        setShowSplash(true);
      }
    }
    
    // Track previous user state
    previousUserRef.current = user?.id ?? null;
  }, [user, loading]);

  const handleSplashComplete = () => {
    splashShownThisSession = true;
    
    // Set flags for fresh session centering and drop-in animation
    sessionStorage.setItem('freshSession', 'true');
    sessionStorage.setItem('shouldAnimateUserMarker', 'true');
    
    // Clear saved map center so HomePage centers on fresh GPS
    localStorage.removeItem('lastMapCenter');
    
    setShowSplash(false);
  };

  // Show splash screen
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Show loading state while auth is being determined
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
