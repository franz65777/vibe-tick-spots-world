import { useEffect, useState } from 'react';
import introVideo from '@/assets/intro_finale.mp4';

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
  ];

  // Start preloading all pages in parallel
  pagesToPreload.forEach(loader => {
    loader().catch(() => {
      // Silently ignore preload errors
    });
  });
};

const SplashScreen = ({ onComplete, minDisplayTime = 2500 }: SplashScreenProps) => {
  const [videoEnded, setVideoEnded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Start preloading pages immediately when splash mounts
  useEffect(() => {
    preloadCriticalPages();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDisplayTime);

    return () => clearTimeout(timer);
  }, [minDisplayTime]);

  useEffect(() => {
    if (videoEnded && minTimeElapsed) {
      onComplete();
    }
  }, [videoEnded, minTimeElapsed, onComplete]);

  const handleVideoEnd = () => {
    setVideoEnded(true);
  };

  // Fallback if video fails to load
  const handleVideoError = () => {
    setVideoEnded(true);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
      <video
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
        onError={handleVideoError}
        className="w-full h-full object-cover"
      >
        <source src={introVideo} type="video/mp4" />
      </video>
    </div>
  );
};

export default SplashScreen;
