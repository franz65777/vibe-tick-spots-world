import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

interface SpottLogoProps {
  showOnMount?: boolean;
  duration?: number;
  className?: string;
}

const SpottLogo: React.FC<SpottLogoProps> = ({
  showOnMount = false,
  duration = 4000,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(showOnMount);
  const [shouldRender, setShouldRender] = useState(showOnMount);

  useEffect(() => {
    if (showOnMount) {
      setShouldRender(true);
      setIsVisible(true);

      const fadeTimer = setTimeout(() => {
        setIsVisible(false);
      }, duration - 500);

      const removeTimer = setTimeout(() => {
        setShouldRender(false);
      }, duration);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [showOnMount, duration]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-white pointer-events-none transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    >
      <div className="flex items-center justify-center">
        <div className="relative">
          <h1 className="text-6xl font-semibold bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent relative flex items-baseline">
            SPOTT
            <MapPin className="w-4 h-4 text-blue-600 fill-blue-600 ml-1" />
          </h1>
        </div>
      </div>
    </div>
  );
};

export default SpottLogo;
