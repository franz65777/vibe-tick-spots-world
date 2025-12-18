import { useEffect, useState } from 'react';
import introVideo from '@/assets/intro_finale.mp4';

interface SplashScreenProps {
  onComplete: () => void;
  minDisplayTime?: number;
}

const SplashScreen = ({ onComplete, minDisplayTime = 2500 }: SplashScreenProps) => {
  const [videoEnded, setVideoEnded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

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
        className="w-full h-full object-contain"
      >
        <source src={introVideo} type="video/mp4" />
      </video>
    </div>
  );
};

export default SplashScreen;
