
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMapsAPI } from '@/lib/googleMaps';
import { Place } from '@/types/place';
import { PinDetailCard } from './explore/PinDetailCard';
import { useGeolocation } from '@/hooks/useGeolocation';
import { lightMapStyle, darkMapStyle } from '@/utils/mapStyles';
import { createCustomMarker } from '@/utils/mapPinCreator';
import { useAnalytics } from '@/hooks/useAnalytics';

interface GoogleMapsSetupProps {
  places: Place[];
  onPinClick?: (place: Place) => void;
  onPinShare?: (place: Place) => void;
  mapCenter: { lat: number; lng: number };
  selectedPlace?: Place | null;
  onCloseSelectedPlace?: () => void;
  onMapRightClick?: (coords: { lat: number; lng: number }) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  activeFilter?: string;
  fullScreen?: boolean;
}

const GoogleMapsSetup = ({
  places, 
  onPinClick,
  onPinShare,
  mapCenter, 
  selectedPlace,
  onCloseSelectedPlace,
  onMapRightClick,
  onMapClick,
  activeFilter,
  fullScreen
}: GoogleMapsSetupProps) => {
  const onMapRightClickRef = useRef(onMapRightClick);
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => { onMapRightClickRef.current = onMapRightClick; }, [onMapRightClick]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const pulseCircleRef = useRef<google.maps.Circle | null>(null);
  const pulseAnimationRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountingRef = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [selectedLocationAddress, setSelectedLocationAddress] = useState<string>('');
  const { location, getCurrentLocation } = useGeolocation();
  const { trackEvent } = useAnalytics();

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

  // Initialize map with better timing
  useEffect(() => {
    let mounted = true;
    // Reset unmount flag on mount (React StrictMode mounts twice)
    isUnmountingRef.current = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    const initMap = async () => {
      try {
        console.log('🗺️ Starting Google Maps initialization, attempt:', retryCount + 1);
        // If map already exists (e.g., StrictMode re-run), don't reset loading state
        if (mapInstanceRef.current) {
          console.log('ℹ️ Map instance already exists, skipping init');
          setIsLoaded(true);
          return;
        }
        setIsLoaded(false);
        
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
        // Avoid double-initializing the map (StrictMode)
        if (mapInstanceRef.current) {
          console.log('ℹ️ Map instance already exists, skipping init');
          setIsLoaded(true);
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
          styles: isDarkMode ? darkMapStyle : lightMapStyle,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          backgroundColor: '#f0f0f0',
          disableDefaultUI: true,
          zoomControl: false,
          clickableIcons: false,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM
          }
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

        // Add right-click listener (reads latest handler via ref)
        map.addListener('rightclick', (event: google.maps.MapMouseEvent) => {
          if (event.latLng && !isUnmountingRef.current) {
            onMapRightClickRef.current?.({
              lat: event.latLng.lat(),
              lng: event.latLng.lng()
            });
          }
        });

        // Add click listener (mobile-friendly) - uses latest handler via ref
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng && !isUnmountingRef.current) {
            onMapClickRef.current?.({
              lat: event.latLng.lat(),
              lng: event.latLng.lng()
            });
          }
        });

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
  }, []);

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
          if (!place.coordinates?.lat || !place.coordinates?.lng) return;

          const position = {
            lat: place.coordinates.lat,
            lng: place.coordinates.lng,
          };

          const marker = createCustomMarker(mapInstanceRef.current!, position, {
            category: place.category || 'attraction',
            isSaved: place.isSaved,
            isRecommended: place.isRecommended,
            recommendationScore: place.recommendationScore,
            friendAvatars: [], // TODO: fetch friend data from backend
            isDarkMode,
          });

          if (isUnmountingRef.current) {
            marker.setMap(null);
            return;
          }

          // Add click listener to marker
          marker.addListener('click', () => {
            if (isUnmountingRef.current) return;
            
            // Animate pin
            marker.setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(() => marker.setAnimation(null), 700);
            
            // Track analytics
            trackEvent('map_pin_clicked', {
              place_id: place.id,
              category: place.category,
              source_tab: 'map',
            });
            
            console.log('Pin clicked:', place.name);
            setSelectedLocationId(place.id);
            setSelectedLocationName(place.name);
            setSelectedLocationAddress(place.address || '');
            if (onPinClick) {
              onPinClick(place);
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
      <div className={fullScreen ? 'relative w-full h-full rounded-2xl overflow-hidden bg-background' : 'relative w-full min-h-[60vh] rounded-lg overflow-hidden bg-gray-100'} style={fullScreen ? undefined : { minHeight: '60vh' }}>
        {/* Google Maps container must be empty and dedicated to the map */}
        <div ref={mapRef} className="absolute inset-0" />

        {/* Overlays rendered as siblings (not children of the map container) to avoid DOM conflicts */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading map...</p>
              <p className="text-xs text-gray-500 mt-1">Connecting to Google Maps</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Pin Detail Card */}
        {selectedPlace && (
          <PinDetailCard
            pin={{
              id: selectedPlace.id,
              name: selectedPlace.name,
              city: selectedPlace.city,
              google_place_id: selectedPlace.google_place_id,
              coordinates: selectedPlace.coordinates
            }}
            onClose={() => onCloseSelectedPlace?.()}
          />
        )}
    </>
  );
};

export default GoogleMapsSetup;
