import { memo } from 'react';
import MapSection from './MapSection';
import { Place } from '@/types/place';

interface HomeMapContainerProps {
  mapCenter: { lat: number; lng: number };
  currentCity: string;
  isExpanded: boolean;
  isSearchOverlayOpen: boolean;
  onToggleExpand: () => void;
  initialSelectedPlace: Place | null;
  onClearInitialPlace: () => void;
  recenterToken: number;
  onCitySelect?: (city: string, coords: { lat: number; lng: number }) => void;
  fromMessages?: boolean;
  returnToUserId?: string | null;
  onBackToMessages?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isCenteredOnUser?: boolean;
  onCenterStatusChange?: (isCentered: boolean) => void;
  onOpenSearchOverlay?: () => void;
  onSearchDrawerStateChange?: (isOpen: boolean) => void;
}

const HomeMapContainer = memo((props: HomeMapContainerProps) => {
  const { isExpanded, isSearchOverlayOpen, onCitySelect, fromMessages, returnToUserId, onBackToMessages, searchQuery, onSearchChange, isCenteredOnUser, onCenterStatusChange, onOpenSearchOverlay, onSearchDrawerStateChange, ...mapProps } = props;
  
  return (
    <div className={isExpanded ? "fixed inset-0 z-50" : isSearchOverlayOpen ? "hidden" : "w-full h-full"}>
      <MapSection
        mapCenter={mapProps.mapCenter}
        currentCity={mapProps.currentCity}
        isExpanded={isExpanded}
        onToggleExpand={mapProps.onToggleExpand}
        initialSelectedPlace={mapProps.initialSelectedPlace}
        onClearInitialPlace={mapProps.onClearInitialPlace}
        recenterToken={mapProps.recenterToken}
        onCitySelect={onCitySelect}
        fromMessages={fromMessages}
        onBackToMessages={onBackToMessages}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        isCenteredOnUser={isCenteredOnUser}
        onCenterStatusChange={onCenterStatusChange}
        onOpenSearchOverlay={onOpenSearchOverlay}
        onSearchDrawerStateChange={onSearchDrawerStateChange}
      />
    </div>
  );
});

HomeMapContainer.displayName = 'HomeMapContainer';

export default HomeMapContainer;
