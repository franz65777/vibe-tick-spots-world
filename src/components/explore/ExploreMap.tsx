
import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from '@/lib/googleMaps';
import { getCategoryIcon, getCategoryColor } from '@/utils/categoryIcons';
import { CategoryType } from './CategoryFilter';

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

  // Filter pins based on selected category
  const filteredPins = selectedCategory === 'all' 
    ? pins 
    : pins.filter(pin => pin.category.toLowerCase() === selectedCategory);

  useEffect(() => {
    let mounted = true;
    
    const initializeMap = async () => {
      try {
        setError(null);
        console.log('Initializing Google Maps for Explore page...');
        
        await loadGoogleMapsAPI();
        
        if (!mounted || !mapRef.current) return;

        // Wait a bit more to ensure everything is ready
        await new Promise(resolve => setTimeout(resolve, 500));

        if (isGoogleMapsLoaded() && !mapInstanceRef.current) {
          const defaultCenter = mapCenter || { lat: 37.7749, lng: -122.4194 };
          
          const mapOptions: google.maps.MapOptions = {
            center: defaultCenter,
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
            zoomControl: true,
            zoomControlOptions: {
              position: window.google.maps.ControlPosition.RIGHT_BOTTOM
            }
          };

          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
          console.log('Google Maps initialized successfully for Explore');
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
        if (mounted) {
          setError('Failed to load map. Please check your internet connection.');
        }
      }
    };

    initializeMap();

    return () => {
      mounted = false;
    };
  }, [mapCenter]);

  // Update markers when filtered pins change
  useEffect(() => {
    if (mapInstanceRef.current && isLoaded && window.google && filteredPins) {
      console.log('Updating markers for', filteredPins.length, 'filtered pins');
      
      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Add new markers with category-specific styling
      filteredPins.forEach((pin, index) => {
        if (pin.coordinates) {
          // Get category color for pin styling
          const categoryColor = getCategoryColor(pin.category);
          const isPopular = activeFilter === 'popular';
          const isFollowing = activeFilter === 'following';
          
          // Create custom marker icon based on category and filter
          const markerIcon = {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="18" cy="18" r="12" fill="${isPopular ? '#EF4444' : isFollowing ? '#3B82F6' : '#6B7280'}" stroke="white" stroke-width="3"/>
                <circle cx="18" cy="18" r="6" fill="white"/>
                ${isPopular ? '<circle cx="18" cy="18" r="3" fill="#EF4444"/>' : ''}
              </svg>
            `),
            scaledSize: new window.google.maps.Size(36, 36),
            anchor: new window.google.maps.Point(18, 18)
          };

          const marker = new window.google.maps.Marker({
            position: pin.coordinates,
            map: mapInstanceRef.current,
            title: pin.name,
            icon: markerIcon,
            animation: window.google.maps.Animation.DROP
          });

          marker.addListener('click', () => {
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
