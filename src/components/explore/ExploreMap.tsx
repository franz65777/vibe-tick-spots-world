
import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from '@/lib/googleMaps';
import { getCategoryIcon, getCategoryColor } from '@/utils/categoryIcons';
import { CategoryType } from './CategoryFilter';
import { lightMapStyle, darkMapStyle } from '@/utils/mapStyles';
import { createCustomMarker } from '@/utils/mapPinCreator';
import { useAnalytics } from '@/hooks/useAnalytics';

interface MapPin {
  id: string;
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  likes: number;
  image?: string;
  isFollowing?: boolean;
}

interface ExploreMapProps {
  pins: MapPin[];
  activeFilter: 'following' | 'popular' | 'new';
  selectedCategory: CategoryType;
  onPinClick: (pin: MapPin) => void;
  mapCenter?: { lat: number; lng: number };
}

const ExploreMap = ({ pins, activeFilter, selectedCategory, onPinClick, mapCenter }: ExploreMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { trackEvent } = useAnalytics();

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

  // Get user's current location
  useEffect(() => {
    const getCurrentLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const location = { lat: latitude, lng: longitude };
            setUserLocation(location);
            console.log('User location obtained:', location);
          },
          (error) => {
            console.error('Error getting location:', error);
            // Fallback to San Francisco
            const fallback = { lat: 37.7749, lng: -122.4194 };
            setUserLocation(fallback);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      } else {
        // Fallback if geolocation is not supported
        const fallback = { lat: 37.7749, lng: -122.4194 };
        setUserLocation(fallback);
      }
    };

    getCurrentLocation();
  }, []);

  // Filter pins based on selected category
  const filteredPins = selectedCategory === 'all' 
    ? pins 
    : pins.filter(pin => pin.category.toLowerCase() === selectedCategory);

  useEffect(() => {
    let mounted = true;
    
    const initializeMap = async () => {
      try {
        setError(null);
        console.log('Initializing Google Maps...');
        
        await loadGoogleMapsAPI();
        
        if (!mounted || !mapRef.current) return;

        // Wait for user location or use provided center
        const center = mapCenter || userLocation || { lat: 37.7749, lng: -122.4194 };
        
        if (isGoogleMapsLoaded() && !mapInstanceRef.current) {
          const mapOptions: google.maps.MapOptions = {
            center: center,
            zoom: 13,
            styles: isDarkMode ? darkMapStyle : lightMapStyle,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            zoomControlOptions: {
              position: window.google.maps.ControlPosition.RIGHT_BOTTOM
            }
          };

          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
          console.log('Google Maps initialized successfully');
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
        if (mounted) {
          setError('Failed to load map. Please check your internet connection.');
        }
      }
    };

    // Only initialize when we have user location or mapCenter
    if (userLocation || mapCenter) {
      initializeMap();
    }

    return () => {
      mounted = false;
    };
  }, [mapCenter, userLocation]);

  // Update markers when filtered pins change
  useEffect(() => {
    if (mapInstanceRef.current && isLoaded && window.google && filteredPins) {
      console.log('Updating markers for', filteredPins.length, 'filtered pins');
      
      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Add new markers with custom category pins
      filteredPins.forEach((pin, index) => {
        if (pin.coordinates) {
          // Calculate popular score for display
          const popularScore = activeFilter === 'popular' && pin.likes 
            ? Math.min(9.9, (pin.likes / 10)).toFixed(1) 
            : undefined;

          const marker = createCustomMarker(mapInstanceRef.current!, pin.coordinates, {
            category: pin.category || 'attraction',
            isSaved: pin.isFollowing,
            friendAvatars: [], // TODO: fetch friend data from backend
            popularScore: popularScore ? parseFloat(popularScore) : undefined,
            isDarkMode,
          });

          // Add click listener
          marker.addListener('click', () => {
            // Animate pin on click
            marker.setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(() => marker.setAnimation(null), 700);
            
            // Track analytics
            trackEvent('map_pin_clicked', {
              place_id: pin.id,
              category: pin.category,
              source_tab: activeFilter,
            });
            
            if (popularScore) {
              trackEvent('map_pin_score_shown', {
                place_id: pin.id,
                score: popularScore,
              });
            }
            
            onPinClick(pin);
          });

          markersRef.current.push(marker);
          
          // Stagger the drop animation
          setTimeout(() => {
            if (marker.getAnimation() !== null) {
              marker.setAnimation(null);
            }
          }, 1000 + (index * 100));
        }
      });

      // Adjust map bounds to fit all markers if there are any
      if (filteredPins.length > 0 && mapInstanceRef.current) {
        const bounds = new window.google.maps.LatLngBounds();
        filteredPins.forEach(pin => {
          if (pin.coordinates) {
            bounds.extend(new window.google.maps.LatLng(pin.coordinates.lat, pin.coordinates.lng));
          }
        });
        
        if (filteredPins.length > 1) {
          mapInstanceRef.current.fitBounds(bounds, 50);
        }
      }

      console.log('Updated markers, total:', markersRef.current.length);
    }
  }, [filteredPins, activeFilter, isLoaded, onPinClick]);

  if (error) {
    return (
      <div className="w-full h-[60vh] bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-red-600 text-lg font-medium mb-2">Map Loading Error</div>
          <div className="text-red-500 text-sm mb-4">{error}</div>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[60vh]">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-600">Loading map...</div>
          </div>
        </div>
      )}
      
      {/* Pins counter */}
      {isLoaded && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-700">
            {filteredPins.length} {selectedCategory === 'all' ? 'locations' : selectedCategory + 's'} found
          </p>
        </div>
      )}
    </div>
  );
};

export default ExploreMap;
