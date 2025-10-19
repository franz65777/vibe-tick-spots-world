import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

interface SpottLogoProps {
  showOnMount?: boolean;
  duration?: number;
  targetElementId?: string;
}

const SpottLogo: React.FC<SpottLogoProps> = ({
  showOnMount = false,
  duration = 4000,
  targetElementId = 'city-search-bar'
}) => {
  const [isVisible, setIsVisible] = useState(showOnMount);
  const [shouldRender, setShouldRender] = useState(showOnMount);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    if (showOnMount) {
      const targetElement = document.getElementById(targetElementId);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      }

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
  }, [showOnMount, duration, targetElementId]);

  if (!shouldRender) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: position.width,
        height: position.height,
        zIndex: 60
      }}
      className={`flex items-center justify-center bg-white rounded-full shadow-lg transition-opacity duration-500 pointer-events-none ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex items-center justify-center">
        <h1 className="text-2xl font-semibold bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent relative flex items-baseline">
          SPOTT
          <MapPin className="w-3 h-3 text-blue-600 fill-blue-600 ml-1" />
        </h1>
      </div>
    </div>
  );
};

export default SpottLogo;
