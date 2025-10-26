import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createLeafletCustomMarker, createCurrentLocationMarker } from '@/utils/leafletMarkerCreator';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Loader2 } from 'lucide-react';

export interface MapPin {
  id: string;
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  likes?: number;
  image?: string;
  isFollowing?: boolean;
}

interface LeafletExploreMapProps {
  pins: MapPin[];
  onPinClick: (pin: MapPin) => void;
  activeFilter?: string;
  selectedCategory?: string;
  mapCenter?: { lat: number; lng: number };
}

// Component to handle map events and fit bounds
const MapController = ({ 
  pins,
  onPinClick,
  activeFilter 
}: { 
  pins: MapPin[];
  onPinClick: (pin: MapPin) => void;
  activeFilter?: string;
}) => {
  const map = useMap();
  const { trackEvent } = useAnalytics();
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());

  useMapEvents({
    click: () => {
      // Handle general map clicks if needed
    },
  });

  // Fit bounds when pins change
  useEffect(() => {
    if (pins.length > 0) {
      const bounds = L.latLngBounds(
        pins.map(pin => [pin.coordinates.lat, pin.coordinates.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [pins, map]);

  return null;
};

// Dark mode tile layer component
const DarkModeTileLayer = ({ isDarkMode }: { isDarkMode: boolean }) => {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url={isDarkMode 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      }
      maxZoom={19}
    />
  );
};

const LeafletExploreMap = ({
  pins,
  onPinClick,
  activeFilter,
  selectedCategory,
  mapCenter
}: LeafletExploreMapProps) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { location } = useGeolocation();
  const { trackEvent } = useAnalytics();
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());

  // Filter pins by category
  const filteredPins = selectedCategory && selectedCategory !== 'all'
    ? pins.filter(pin => pin.category === selectedCategory)
    : pins;

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  // Set loaded state
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Handle marker bounce animation
  const bounceMarker = (pinId: string) => {
    const marker = markerRefs.current.get(pinId);
    if (marker) {
      const element = marker.getElement();
      if (element) {
        element.style.animation = 'bounce 0.7s ease-in-out';
        setTimeout(() => {
          element.style.animation = '';
        }, 700);
      }
    }
  };

  const handleMarkerClick = (pin: MapPin) => {
    bounceMarker(pin.id);
    
    trackEvent('explore_map_pin_clicked', {
      place_id: pin.id,
      category: pin.category,
      filter: activeFilter,
    });
    
    onPinClick(pin);
  };

  // Determine initial center
  const initialCenter: [number, number] = mapCenter 
    ? [mapCenter.lat, mapCenter.lng]
    : location?.latitude && location?.longitude
    ? [location.latitude, location.longitude]
    : [53.3498, -6.2603]; // Dublin default

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30">
        <div className="text-center p-6">
          <p className="text-destructive mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Reload Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={initialCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={true}
      >
        <DarkModeTileLayer isDarkMode={isDarkMode} />
        <MapController 
          pins={filteredPins}
          onPinClick={onPinClick}
          activeFilter={activeFilter}
        />

        {/* Current location marker */}
        {location?.latitude && location?.longitude && (
          <Marker
            position={[location.latitude, location.longitude]}
            icon={createCurrentLocationMarker()}
            zIndexOffset={2000}
          />
        )}

        {/* Pin markers */}
        {filteredPins.map((pin) => {
          if (!pin.coordinates?.lat || !pin.coordinates?.lng) return null;

          const icon = createLeafletCustomMarker({
            category: pin.category,
            isSaved: false,
            isRecommended: false,
            isDarkMode,
          });

          return (
            <Marker
              key={pin.id}
              position={[pin.coordinates.lat, pin.coordinates.lng]}
              icon={icon}
              eventHandlers={{
                click: () => handleMarkerClick(pin),
              }}
              ref={(ref) => {
                if (ref) {
                  markerRefs.current.set(pin.id, ref);
                }
              }}
            />
          );
        })}
      </MapContainer>

      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-[1000]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {/* Location counter */}
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md z-[1000] border border-border">
        <p className="text-sm font-medium">
          {filteredPins.length} {filteredPins.length === 1 ? 'location' : 'locations'} found
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-10px); }
          50% { transform: translateY(-5px); }
          75% { transform: translateY(-8px); }
        }
        
        .leaflet-container {
          background: ${isDarkMode ? '#1a1a1a' : '#f0f0f0'};
        }
        
        .custom-leaflet-icon {
          background: transparent;
          border: none;
        }
        
        .leaflet-control-attribution {
          background: rgba(255, 255, 255, 0.8);
          padding: 2px 5px;
          font-size: 10px;
        }
        
        .dark .leaflet-control-attribution {
          background: rgba(0, 0, 0, 0.8);
          color: white;
        }
      `}</style>
    </div>
  );
};

export default LeafletExploreMap;
