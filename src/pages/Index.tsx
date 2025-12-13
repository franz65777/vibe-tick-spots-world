import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import WelcomePage from '@/components/WelcomePage';
import HomePage from '@/components/HomePage';
import SplashScreen from '@/components/SplashScreen';

// Track if splash was shown and if initial auth check ran in THIS runtime instance (not persisted)
let splashShownThisSession = false;
let initialAuthCheckDone = false;

const Index = () => {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(false);
  const previousUserRef = useRef<string | null>(null);

  useEffect(() => {
    // Case 1: App just opened (first mount, auth loading complete)
    // Show splash ONLY on very first app open after JS load, not on route remounts
    if (!loading && !initialAuthCheckDone) {
      initialAuthCheckDone = true;
      
      // Check if this is a fresh auth event in this runtime
      if (!splashShownThisSession) {
        // Check if user just signed in (flag set by SigninStart)
        const justSignedIn = sessionStorage.getItem('playSplashAfterAuth') === 'true';
        
        if (justSignedIn) {
          // Case 2: User just signed in
          sessionStorage.removeItem('playSplashAfterAuth');
          setShowSplash(true);
          return;
        }
        
        // Case 1: Fresh app open - show splash only if authenticated
        // (unauthenticated users go straight to welcome page)
        if (user) {
          setShowSplash(true);
        }
      }
    }
  }, [loading, user]);

  // Case 2: Detect sign-in transition (user was null, now has value)
  useEffect(() => {
    if (!loading && user && previousUserRef.current === null && initialAuthCheckDone) {
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
