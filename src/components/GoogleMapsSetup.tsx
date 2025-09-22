
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMapsAPI } from '@/lib/googleMaps';
import { Place } from '@/types/place';
import LocationDetailSheet from './LocationDetailSheet';
import { useGeolocation } from '@/hooks/useGeolocation';

interface GoogleMapsSetupProps {
  places: Place[];
  onPinClick?: (place: Place) => void;
  mapCenter: { lat: number; lng: number };
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
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const pulseCircleRef = useRef<google.maps.Circle | null>(null);
  const pulseAnimationRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountingRef = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [selectedLocationAddress, setSelectedLocationAddress] = useState<string>('');
  const { location, getCurrentLocation } = useGeolocation();

  // Safe marker cleanup function
  const clearMarkers = useCallback(() => {
    if (isUnmountingRef.current) return;
    
    try {
      markersRef.current.forEach(marker => {
        try {
          if (marker && typeof marker.setMap === 'function') {
            marker.setMap(null);
          }
        } catch (error) {
          console.warn('Error removing marker:', error);
        }
      });
    } catch (error) {
      console.warn('Error clearing markers:', error);
    }
    markersRef.current = [];
  }, []);

  // Safe cleanup for current location marker
  const clearCurrentLocationMarker = useCallback(() => {
    if (isUnmountingRef.current) return;
    
    try {
      if (currentLocationMarkerRef.current && typeof currentLocationMarkerRef.current.setMap === 'function') {
        currentLocationMarkerRef.current.setMap(null);
        currentLocationMarkerRef.current = null;
      }
      if (pulseCircleRef.current && typeof pulseCircleRef.current.setMap === 'function') {
        pulseCircleRef.current.setMap(null);
        pulseCircleRef.current = null;
      }
      if (pulseAnimationRef.current) {
        clearInterval(pulseAnimationRef.current);
        pulseAnimationRef.current = null;
      }
    } catch (error) {
      console.warn('Error clearing current location marker:', error);
    }
  }, []);

  // Initialize map with better timing
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    const initMap = async () => {
      try {
        console.log('🗺️ Starting Google Maps initialization, attempt:', retryCount + 1);
        setIsLoaded(false);
        
        // Wait for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!mounted || isUnmountingRef.current) {
          console.log('❌ Component unmounting, abort init');
          return;
        }

        if (!mapRef.current) {
          console.log('❌ Map container not available, retrying...');
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(initMap, 500);
          }
          return;
        }
        
        await loadGoogleMapsAPI();
        
        // Wait for DOM and Google Maps to be fully ready
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Final check before creating map
        if (!mounted || !mapRef.current || isUnmountingRef.current) {
          console.log('❌ Final check failed - container not ready');
          return;
        }

        // Ensure the container has dimensions
        const rect = mapRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          console.log('❌ Container has no dimensions, retrying...', { width: rect.width, height: rect.height });
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(initMap, 1000);
          }
          return;
        }

        console.log('✅ Creating Google Maps instance with container size:', rect.width, 'x', rect.height);
        const map = new google.maps.Map(mapRef.current, {
          center: mapCenter,
          zoom: 13,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'transit',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          backgroundColor: '#f0f0f0'
        });

        if (isUnmountingRef.current) return;

        mapInstanceRef.current = map;
        console.log('✅ Google Maps instance created successfully');

        // Force immediate rendering and resize
        requestAnimationFrame(() => {
          if (mapInstanceRef.current && !isUnmountingRef.current) {
            console.log('🔄 Forcing immediate resize...');
            google.maps.event.trigger(mapInstanceRef.current, 'resize');
            mapInstanceRef.current.setCenter(mapCenter);
          }
        });

        // Add right-click listener for adding new locations
        if (onMapRightClick) {
          map.addListener('rightclick', (event: google.maps.MapMouseEvent) => {
            if (event.latLng && !isUnmountingRef.current) {
              onMapRightClick({
                lat: event.latLng.lat(),
                lng: event.latLng.lng()
              });
            }
          });
        }

        if (mounted && !isUnmountingRef.current) {
          setIsLoaded(true);
          console.log('Map initialization complete');
          
          // Get current location when map is loaded
          getCurrentLocation();
        }
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
        if (mounted && !isUnmountingRef.current) {
          setIsLoaded(false);
          // Show error message after a delay to allow for retries
          setTimeout(() => {
            if (mounted && !isUnmountingRef.current) {
              console.log('Retrying Google Maps initialization...');
              initMap(); // Retry once
            }
          }, 2000);
        }
      }
    };

    // Add delay to ensure DOM is ready
    const timer = setTimeout(initMap, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
      isUnmountingRef.current = true;
      
      // Cleanup with delay to prevent DOM conflicts
      setTimeout(() => {
        clearMarkers();
        clearCurrentLocationMarker();
        if (mapInstanceRef.current) {
          try {
            // Don't try to destroy the map instance as it may conflict with React
            mapInstanceRef.current = null;
          } catch (error) {
            console.warn('Error cleaning up map instance:', error);
          }
        }
      }, 0);
    };
  }, [getCurrentLocation, onMapRightClick, clearMarkers, clearCurrentLocationMarker, mapCenter]);

  // Update map center when it changes
  useEffect(() => {
    if (mapInstanceRef.current && isLoaded && !isUnmountingRef.current) {
      console.log('Updating map center to:', mapCenter);
      try {
        mapInstanceRef.current.setCenter(mapCenter);
        mapInstanceRef.current.setZoom(13);
      } catch (error) {
        console.warn('Error updating map center:', error);
      }
    }
  }, [mapCenter, isLoaded]);

  // Add current location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded || !location?.latitude || !location?.longitude || isUnmountingRef.current) return;

    // Clear existing current location marker first
    clearCurrentLocationMarker();

    if (isUnmountingRef.current) return;

    try {
      // Add current location marker with pulsing effect
      const currentLocationMarker = new google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: mapInstanceRef.current,
        title: 'Your Current Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        },
        zIndex: 2000,
      });

      if (isUnmountingRef.current) {
        currentLocationMarker.setMap(null);
        return;
      }

      currentLocationMarkerRef.current = currentLocationMarker;

      // Add pulsing circle around current location
      const pulseCircle = new google.maps.Circle({
        strokeColor: '#4285F4',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#4285F4',
        fillOpacity: 0.1,
        map: mapInstanceRef.current,
        center: { lat: location.latitude, lng: location.longitude },
        radius: 100,
      });

      if (isUnmountingRef.current) {
        pulseCircle.setMap(null);
        return;
      }

      pulseCircleRef.current = pulseCircle;

      // Animate the pulse
      let radius = 100;
      let growing = true;
      const pulseAnimation = setInterval(() => {
        if (isUnmountingRef.current) {
          clearInterval(pulseAnimation);
          return;
        }
        
        try {
          if (growing) {
            radius += 5;
            if (radius >= 200) growing = false;
          } else {
            radius -= 5;
            if (radius <= 100) growing = true;
          }
          if (pulseCircleRef.current && !isUnmountingRef.current) {
            pulseCircleRef.current.setRadius(radius);
          }
        } catch (error) {
          console.warn('Error in pulse animation:', error);
          clearInterval(pulseAnimation);
        }
      }, 100);

      pulseAnimationRef.current = pulseAnimation;
    } catch (error) {
      console.error('Error adding current location marker:', error);
    }

    // Cleanup animation on unmount
    return () => {
      clearCurrentLocationMarker();
    };
  }, [location, isLoaded, clearCurrentLocationMarker]);

  // Add markers for places
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded || isUnmountingRef.current) return;

    // Clear existing markers first
    clearMarkers();

    if (isUnmountingRef.current) return;

    try {
      const newMarkers: google.maps.Marker[] = [];

      places.forEach(place => {
        if (isUnmountingRef.current) return;
        
        try {
          // Create a more visually appealing custom pin
          const pinColor = place.isFollowing ? '#3B82F6' : '#10B981';
          const pinSize = place.isNew ? 12 : 10;
          
          const marker = new google.maps.Marker({
            position: place.coordinates,
            map: mapInstanceRef.current,
            title: place.name,
            icon: {
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: pinSize,
              fillColor: pinColor,
              fillOpacity: 0.9,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
              rotation: 180,
              anchor: new google.maps.Point(0, 0),
            },
            zIndex: place.isNew ? 1000 : 100,
          });

          if (isUnmountingRef.current) {
            marker.setMap(null);
            return;
          }

          // Add click listener to marker
          marker.addListener('click', () => {
            if (isUnmountingRef.current) return;
            
            console.log('Pin clicked:', place.name);
            setSelectedLocationId(place.id);
            setSelectedLocationName(place.name);
            setSelectedLocationAddress(place.address || '');
            if (onPinClick) {
              onPinClick(place);
            }
          });

          // Add hover effects
          marker.addListener('mouseover', () => {
            if (isUnmountingRef.current) return;
            
            try {
              marker.setIcon({
                path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: pinSize + 2,
                fillColor: pinColor,
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 3,
                rotation: 180,
                anchor: new google.maps.Point(0, 0),
              });
            } catch (error) {
              console.warn('Error on marker mouseover:', error);
            }
          });

          marker.addListener('mouseout', () => {
            if (isUnmountingRef.current) return;
            
            try {
              marker.setIcon({
                path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: pinSize,
                fillColor: pinColor,
                fillOpacity: 0.9,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                rotation: 180,
                anchor: new google.maps.Point(0, 0),
              });
            } catch (error) {
              console.warn('Error on marker mouseout:', error);
            }
          });

          newMarkers.push(marker);
        } catch (error) {
          console.warn('Error creating marker for place:', place.name, error);
        }
      });

      if (!isUnmountingRef.current) {
        markersRef.current = newMarkers;
      }
    } catch (error) {
      console.error('Error adding markers:', error);
    }
  }, [places, isLoaded, onPinClick, clearMarkers]);

  // Handle selected place highlight
  useEffect(() => {
    if (!selectedPlace || !mapInstanceRef.current || isUnmountingRef.current) return;

    try {
      // Find the marker for the selected place and highlight it
      const selectedMarker = markersRef.current.find((marker, index) => 
        places[index]?.id === selectedPlace.id
      );

      if (selectedMarker && !isUnmountingRef.current) {
        selectedMarker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#EF4444',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        });

        // Center map on selected place
        mapInstanceRef.current.setCenter(selectedPlace.coordinates);
      }
    } catch (error) {
      console.warn('Error highlighting selected place:', error);
    }
  }, [selectedPlace, places]);

  return (
    <>
      <div 
        ref={mapRef} 
        className="w-full h-full min-h-[500px] rounded-lg overflow-hidden relative bg-gray-100"
        style={{ minHeight: '500px' }}
      >
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading map...</p>
              <p className="text-xs text-gray-500 mt-1">Connecting to Google Maps</p>
            </div>
          </div>
        )}
        {isLoaded && (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-gray-600 shadow-sm">
            Map loaded ✓
          </div>
        )}
      </div>
      
      {selectedLocationId && (
        <LocationDetailSheet
          locationId={selectedLocationId}
          locationName={selectedLocationName}
          locationAddress={selectedLocationAddress}
          isOpen={!!selectedLocationId}
          onClose={() => {
            setSelectedLocationId(null);
            setSelectedLocationName('');
            setSelectedLocationAddress('');
            if (onCloseSelectedPlace) {
              onCloseSelectedPlace();
            }
          }}
        />
      )}
    </>
  );
};

export default GoogleMapsSetup;
