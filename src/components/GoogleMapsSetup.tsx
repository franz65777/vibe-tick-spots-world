
import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from '@/lib/googleMaps';
import { Place } from '@/types/place';
import { MapPin, AlertTriangle } from 'lucide-react';

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
  const [loadingStatus, setLoadingStatus] = useState<string>('Initializing...');

  useEffect(() => {
    let mounted = true;
    
    const initializeMap = async () => {
      console.log('Starting Google Maps initialization...');
      setLoadingStatus('Loading Google Maps API...');
      
      try {
        setError(null);
        await loadGoogleMapsAPI();
        
        if (!mounted) return;
        setLoadingStatus('Creating map instance...');

        // Wait for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100));

        if (mapRef.current && !mapInstanceRef.current && isGoogleMapsLoaded()) {
          console.log('Creating Google Maps instance...');
          
          const defaultCenter = mapCenter || { lat: 40.7589, lng: -73.9851 };

          const mapOptions: google.maps.MapOptions = {
            center: defaultCenter,
            zoom: 13,
            styles: [
              {
                featureType: 'poi.business',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              },
              {
                featureType: 'transit.station',
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
            disableDefaultUI: false,
            clickableIcons: false
          };

          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);

          // Add map event listeners
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

            // Mobile long press simulation
            let longPressTimer: NodeJS.Timeout | null = null;
            let pressStartTime = 0;

            mapInstanceRef.current.addListener('mousedown', (event: google.maps.MapMouseEvent) => {
              pressStartTime = Date.now();
              longPressTimer = setTimeout(() => {
                if (event.latLng) {
                  const coords = {
                    lat: event.latLng.lat(),
                    lng: event.latLng.lng()
                  };
                  onMapRightClick(coords);
                }
              }, 800);
            });

            const clearLongPress = () => {
              if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
              }
            };

            mapInstanceRef.current.addListener('mouseup', clearLongPress);
            mapInstanceRef.current.addListener('mousemove', clearLongPress);
            mapInstanceRef.current.addListener('drag', clearLongPress);
          }

          setLoadingStatus('Map ready!');
          console.log('Google Maps initialized successfully');
          setIsLoaded(true);
          
          // Add places immediately if available
          if (places && places.length > 0) {
            console.log('Adding initial places to map:', places.length);
            addMarkersToMap(places);
          }
        }
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
        if (mounted) {
          setError('Failed to load Google Maps. Please check your internet connection and refresh the page.');
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

  const addMarkersToMap = (placesToAdd: Place[]) => {
    if (!mapInstanceRef.current || !isLoaded || !window.google) {
      console.log('Map not ready for markers');
      return;
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    console.log('Adding markers for places:', placesToAdd.length);

    placesToAdd.forEach((place, index) => {
      if (place.coordinates && place.coordinates.lat && place.coordinates.lng) {
        try {
          const marker = new window.google.maps.Marker({
            position: place.coordinates,
            map: mapInstanceRef.current,
            title: place.name,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#3B82F6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              scale: 8
            },
            zIndex: 1000 + index
          });

          marker.addListener('click', () => {
            console.log('Marker clicked:', place.name);
            onPinClick(place);
          });

          markersRef.current.push(marker);
          console.log(`Added marker for ${place.name} at`, place.coordinates);
        } catch (error) {
          console.error(`Error adding marker for ${place.name}:`, error);
        }
      } else {
        console.warn(`Invalid coordinates for place: ${place.name}`, place.coordinates);
      }
    });

    console.log(`Successfully added ${markersRef.current.length} markers to map`);
  };

  // Update markers when places change
  useEffect(() => {
    if (isLoaded && places && places.length > 0) {
      console.log('Places updated, refreshing markers:', places.length);
      addMarkersToMap(places);
    }
  }, [places, isLoaded, onPinClick]);

  // Handle selected place highlighting
  useEffect(() => {
    if (mapInstanceRef.current && selectedPlace && isLoaded && window.google) {
      const selectedMarkerIndex = places.findIndex(place => place.id === selectedPlace.id);
      const selectedMarker = markersRef.current[selectedMarkerIndex];

      if (selectedMarker) {
        // Highlight selected marker
        selectedMarker.setIcon({
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#EF4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 12
        });

        if (selectedPlace.coordinates) {
          mapInstanceRef.current.panTo(selectedPlace.coordinates);
          mapInstanceRef.current.setZoom(15);
        }
      }

      // Reset other markers
      markersRef.current.forEach((marker, index) => {
        if (index !== selectedMarkerIndex) {
          marker.setIcon({
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: '#3B82F6',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 8
          });
        }
      });
    }
  }, [selectedPlace, isLoaded, places]);

  if (error) {
    return (
      <div className="w-full h-full min-h-[280px] rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
        <div className="text-center p-4">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-3" />
          <div className="text-red-600 text-sm font-medium mb-2">Map Error</div>
          <div className="text-red-500 text-xs mb-3 leading-relaxed">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[280px]">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-700 text-sm font-medium mb-1">{loadingStatus}</div>
            <div className="text-gray-500 text-xs">This may take a few seconds</div>
            {/* Debug info */}
            <div className="mt-3 text-xs text-gray-400">
              Places to show: {places?.length || 0}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMapsSetup;
