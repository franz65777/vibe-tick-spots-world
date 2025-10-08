import React, { useState, useEffect } from 'react';
import SwipeDiscovery from '@/components/home/SwipeDiscovery';

const DiscoverPage = () => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  return <SwipeDiscovery userLocation={userLocation} />;
};

export default DiscoverPage;
