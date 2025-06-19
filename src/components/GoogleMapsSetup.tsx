
import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from '@/lib/googleMaps';
import { Place } from '@/types/place';

interface GoogleMapsSetupProps {
  places: Place[];
  onPinClick: (place: Place) => void;
  mapCenter?: { lat: number; lng: number };
  selectedPlace?: Place | null;
  onCloseSelectedPlace?: () => void;
  onMapRightClick?: (coords: { lat: number; lng: number }) => void;
}

const GoogleMapsSetup = ({ 
  places, 
  onPinClick, 
  mapCenter, 
  selectedPlace, 
  onCloseSelectedPlace,
  onMapRightClick 
}: GoogleMapsSetupProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const initializeMap = async () => {
      console.log('Starting Google Maps initialization...');
      
      try {
        setError(null);
        await loadGoogleMapsAPI();
        
        if (!mounted) return;

        // Ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 200));

        if (mapRef.current && !mapInstanceRef.current && isGoogleMapsLoaded()) {
          console.log('Creating Google Maps instance...');
          
          const defaultCenter = mapCenter || { lat: 37.7749, lng: -122.4194 };

          const mapOptions: google.maps.MapOptions = {
            center: defaultCenter,
            zoom: 13,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ],
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            zoomControlOptions: {
              position: window.google.maps.ControlPosition.RIGHT_BOTTOM
            },
            gestureHandling: 'greedy',
            disableDefaultUI: true,
            clickableIcons: false
          };

          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);

          // Add interaction listeners
          if (onMapRightClick) {
            // Desktop right-click
            mapInstanceRef.current.addListener('rightclick', (event: google.maps.MapMouseEvent) => {
              if (event.latLng) {
                const coords = {
                  lat: event.latLng.lat(),
                  lng: event.latLng.lng()
                };
                onMapRightClick(coords);
              }
            });

            // Mobile long press
            let longPressTimer: NodeJS.Timeout;
            let isLongPress = false;

            mapInstanceRef.current.addListener('mousedown', (event: google.maps.MapMouseEvent) => {
              isLongPress = false;
              longPressTimer = setTimeout(() => {
                isLongPress = true;
                if (event.latLng) {
                  const coords = {
                    lat: event.latLng.lat(),
                    lng: event.latLng.lng()
                  };
                  onMapRightClick(coords);
                }
              }, 800);
            });

            mapInstanceRef.current.addListener('mouseup', () => {
              clearTimeout(longPressTimer);
            });

            mapInstanceRef.current.addListener('mousemove', () => {
              clearTimeout(longPressTimer);
            });
          }

          console.log('Google Maps initialized successfully');
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
        if (mounted) {
          setError('Failed to load map. Please refresh the page.');
        }
      }
    };

    initializeMap();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        google.maps.event.clearInstanceListeners(mapInstanceRef.current);
      }
    };
  }, [mapCenter, onMapRightClick]);

  // Update markers when places change
  useEffect(() => {
    if (mapInstanceRef.current && isLoaded && window.google && places) {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Add new markers
      places.forEach((place) => {
        if (place.coordinates) {
          const marker = new window.google.maps.Marker({
            position: place.coordinates,
            map: mapInstanceRef.current,
            title: place.name,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
                  <circle cx="12" cy="12" r="3" fill="white"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(24, 24),
              anchor: new window.google.maps.Point(12, 12)
            }
          });

          marker.addListener('click', () => {
            onPinClick(place);
          });

          markersRef.current.push(marker);
        }
      });
    }
  }, [places, onPinClick, isLoaded]);

  // Handle selected place highlighting
  useEffect(() => {
    if (mapInstanceRef.current && selectedPlace && isLoaded && window.google) {
      const selectedMarkerIndex = places.findIndex(place => place.id === selectedPlace.id);
      const selectedMarker = markersRef.current[selectedMarkerIndex];

      if (selectedMarker) {
        selectedMarker.setIcon({
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#EF4444" stroke="white" stroke-width="3"/>
              <circle cx="16" cy="16" r="5" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 16)
        });

        if (selectedPlace.coordinates) {
          mapInstanceRef.current.panTo(selectedPlace.coordinates);
        }
      }

      // Reset other markers
      markersRef.current.forEach((marker, index) => {
        if (index !== selectedMarkerIndex) {
          marker.setIcon({
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" fill="white"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(24, 24),
            anchor: new window.google.maps.Point(12, 12)
          });
        }
      });
    }
  }, [selectedPlace, isLoaded, places]);

  if (error) {
    return (
      <div className="w-full h-full min-h-[280px] rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
        <div className="text-center p-4">
          <div className="text-red-600 text-sm font-medium mb-2">Map Error</div>
          <div className="text-red-500 text-xs mb-3">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[280px]">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            <div className="text-gray-600 text-sm">Loading map...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMapsSetup;
