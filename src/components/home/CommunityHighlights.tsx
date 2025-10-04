import React from 'react';
import PopularSpots from './PopularSpots';

interface CommunityHighlightsProps {
  currentCity?: string;
  userLocation: { lat: number; lng: number } | null;
  onLocationClick: (locationId: string, coordinates?: { lat: number; lng: number }) => void;
  onUserClick: (userId: string) => void;
  onMapLocationClick: (coords: { lat: number; lng: number }) => void;
  onSwipeDiscoveryOpen?: () => void;
}

const CommunityHighlights: React.FC<CommunityHighlightsProps> = ({
  currentCity,
  userLocation,
  onLocationClick,
  onUserClick,
  onMapLocationClick,
  onSwipeDiscoveryOpen,
}) => {
  return (
    <div className="h-full bg-white/50 backdrop-blur-sm border-y border-gray-100">
      <PopularSpots
        userLocation={userLocation}
        onLocationClick={onMapLocationClick}
        onSwipeDiscoveryOpen={onSwipeDiscoveryOpen}
      />
    </div>
  );
};

export default CommunityHighlights;
