import { memo } from 'react';
import CommunityHighlights from './CommunityHighlights';

interface HomeDiscoverSectionProps {
  currentCity: string;
  userLocation: { lat: number; lng: number } | null;
  onLocationClick: (locationId: string, coordinates?: { lat: number; lng: number }) => void;
  onUserClick: (userId: string) => void;
  onMapLocationClick: (coords: { lat: number; lng: number }) => void;
  onSwipeDiscoveryOpen: () => void;
  onSpotSelect: (spot: any) => void;
  onCitySelect?: (city: string) => void;
}

const HomeDiscoverSection = memo((props: HomeDiscoverSectionProps) => {
  return (
    <div className="h-[110px] flex-shrink-0 relative z-30">
      {/* Top fade gradient overlay */}
      <div 
        className="pointer-events-none absolute inset-x-0 -top-16 h-20 z-0"
        style={{ 
          background: 'linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--background) / 0.8) 40%, transparent 100%)' 
        }}
      />
      <CommunityHighlights {...props} />
    </div>
  );
});

HomeDiscoverSection.displayName = 'HomeDiscoverSection';

export default HomeDiscoverSection;
