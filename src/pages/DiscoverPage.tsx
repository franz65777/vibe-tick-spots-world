import React, { useState, useEffect, useRef } from 'react';
import SwipeDiscovery from '@/components/home/SwipeDiscovery';

const DiscoverPage = () => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const refreshTriggerDistance = 80;
  const swipeDiscoveryRef = useRef<{ reload: () => void }>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting user location:', error);
          // Provide a default location if geolocation fails
          setUserLocation({ lat: 37.7749, lng: -122.4194 });
        }
      );
    } else {
      // Provide a default location if geolocation is not supported
      setUserLocation({ lat: 37.7749, lng: -122.4194 });
    }
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    if (scrollTop === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY === null) return;
    const currentY = e.touches[0].clientY;
    const distance = currentY - pullStartY;
    if (distance > 0) {
      setPullDistance(Math.min(distance, refreshTriggerDistance * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= refreshTriggerDistance) {
      setRefreshing(true);
      swipeDiscoveryRef.current?.reload();
      setTimeout(() => {
        setRefreshing(false);
        setPullDistance(0);
      }, 1000);
    } else {
      setPullDistance(0);
    }
    setPullStartY(null);
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {pullDistance > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-[100] transition-opacity"
          style={{ 
            height: pullDistance,
            opacity: pullDistance / refreshTriggerDistance 
          }}
        >
          <div className={`w-8 h-8 border-4 border-primary border-t-transparent rounded-full ${refreshing ? 'animate-spin' : ''}`} />
        </div>
      )}
      <SwipeDiscovery 
        ref={swipeDiscoveryRef} 
        userLocation={userLocation} 
      />
    </div>
  );
};

export default DiscoverPage;
