import { useEffect, useState, useRef } from 'react';
import introVideo from '@/assets/intro_finale.mp4';
import { preloadWithTimeout } from '@/services/homePagePreloader';
import { useAuth } from '@/contexts/AuthContext';

interface SplashScreenProps {
  onComplete: () => void;
  minDisplayTime?: number;
}

// Preload critical pages during splash to improve loading performance
const preloadCriticalPages = () => {
  const pagesToPreload = [
    () => import('@/components/ExplorePage'),
    () => import('@/components/ProfilePage'),
    () => import('@/pages/NotificationsPage'),
    () => import('@/pages/MessagesPage'),
    () => import('@/pages/FeedPage'),
    () => import('@/pages/DiscoverPage'),
    () => import('@/components/AddLocationPage'),
  ];

  // Start preloading all pages in parallel
  pagesToPreload.forEach(loader => {
    loader().catch(() => {
      // Silently ignore preload errors
    });
  });
};

const SplashScreen = ({ onComplete, minDisplayTime = 2000 }: SplashScreenProps) => {
  const [videoEnded, setVideoEnded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [dataPreloaded, setDataPreloaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const preloadStartedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Start preloading pages immediately when splash mounts
  useEffect(() => {
    preloadCriticalPages();
  }, []);

  // Start data preloading as soon as auth is resolved
  useEffect(() => {
    if (authLoading || preloadStartedRef.current) return;
    
    preloadStartedRef.current = true;
    console.log('🚀 SplashScreen: Starting data preload...');
    
    preloadWithTimeout(user?.id || null, 3000)
      .then((result) => {
        console.log(`📦 SplashScreen: Data preload complete (${result.duration.toFixed(0)}ms)`);
        setDataPreloaded(true);
      })
      .catch(() => {
        // Even on failure, proceed
        setDataPreloaded(true);
      });
  }, [user?.id, authLoading]);

  // Min display time timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDisplayTime);

    return () => clearTimeout(timer);
  }, [minDisplayTime]);

  // Complete when all conditions are met
  useEffect(() => {
    if (videoEnded && minTimeElapsed && dataPreloaded) {
      console.log('✅ SplashScreen: All conditions met, transitioning to app');
      onComplete();
    }
  }, [videoEnded, minTimeElapsed, dataPreloaded, onComplete]);

  const handleVideoEnd = () => {
    setVideoEnded(true);
  };

  // Fallback if video fails to load
  const handleVideoError = () => {
    console.warn('⚠️ SplashScreen: Video failed to load, proceeding anyway');
    setVideoEnded(true);
    setVideoReady(true);
  };

  // Video is ready to play - now show it
  const handleCanPlay = () => {
    setVideoReady(true);
    // Ensure video starts playing
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked - still show video, user can interact
        console.warn('⚠️ SplashScreen: Autoplay blocked');
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
      {/* Show solid background until video is ready */}
      {!videoReady && (
        <div className="absolute inset-0 bg-background" />
      )}
      
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleVideoEnd}
        onError={handleVideoError}
        onCanPlay={handleCanPlay}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          videoReady ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <source src={introVideo} type="video/mp4" />
      </video>
    </div>
  );
};

export default SplashScreen;
