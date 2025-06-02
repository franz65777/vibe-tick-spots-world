import { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Minimize, Maximize, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import GoogleMapsSetup from '@/components/GoogleMapsSetup';

interface Place {
  id: string;
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  visitors: string[];
  rating?: number;
  price?: string;
}

interface MapSectionProps {
  places: Place[];
  onPinClick: (place: Place) => void;
  mapCenter?: { lat: number; lng: number };
}

const MapSection = ({ places, onPinClick, mapCenter }: MapSectionProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check for API key on mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem('google-maps-api-key');
    if (storedApiKey && storedApiKey !== 'demo') {
      setApiKey(storedApiKey);
    } else if (storedApiKey === 'demo') {
      setApiKey('demo');
    } else {
      setShowApiKeySetup(true);
    }
  }, []);

  // Get user's current location or use mapCenter
  useEffect(() => {
    if (mapCenter) {
      console.log('Using provided map center:', mapCenter);
      setUserLocation(mapCenter);
      return;
    }

    if (navigator.geolocation && !userLocation) {
      console.log('Requesting user location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('User location obtained:', latitude, longitude);
          setUserLocation({ lat: latitude, lng: longitude });
          setLocationPermissionDenied(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationPermissionDenied(true);
          // Fallback to San Francisco
          setUserLocation({ lat: 37.7749, lng: -122.4194 });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    }
  }, [mapCenter, userLocation]);

  // Initialize Google Maps
  useEffect(() => {
    if (!apiKey || apiKey === 'demo' || !userLocation || isMapLoaded) {
      return;
    }

    const initMap = async () => {
      try {
        console.log('Initializing Google Maps...');
        setMapError(null);
        
        if (!mapRef.current) {
          console.error('Map container not found');
          return;
        }

        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        
        if (!mapRef.current) {
          console.error('Map container disappeared during loading');
          return;
        }
        
        console.log('Creating map instance...');
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: userLocation,
          zoom: 14,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false
        });

        mapInstanceRef.current = mapInstance;
        setIsMapLoaded(true);
        console.log('Map instance created and ready');

      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setMapError('Failed to load Google Maps. Please check your API key and internet connection.');
      }
    };

    initMap();
  }, [apiKey, userLocation, isMapLoaded]);

  // Update map center when mapCenter prop changes
  useEffect(() => {
    if (mapInstanceRef.current && mapCenter && isMapLoaded) {
      console.log('Updating map center to:', mapCenter);
      mapInstanceRef.current.setCenter(mapCenter);
      mapInstanceRef.current.setZoom(14);
    }
  }, [mapCenter, isMapLoaded]);

  // Update markers when places change
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapLoaded) return;

    console.log('Updating markers for', places.length, 'places');
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const newMarkers: google.maps.Marker[] = [];

    // Add user location marker only if not using a specific map center
    if (!mapCenter && userLocation) {
      const userMarker = new google.maps.Marker({
        map: mapInstanceRef.current,
        position: userLocation,
        title: 'Your Location',
        icon: {
          url: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8" fill="#4285F4" stroke="white" stroke-width="2"/>
              <circle cx="12" cy="12" r="3" fill="white"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(24, 24),
          anchor: new google.maps.Point(12, 12)
        }
      });
      newMarkers.push(userMarker);
    }

    // Add markers for places
    places.forEach((place) => {
      const marker = new google.maps.Marker({
        map: mapInstanceRef.current,
        position: place.coordinates,
        title: place.name,
        icon: {
          url: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#EF4444" stroke="white" stroke-width="2"/>
              <circle cx="16" cy="16" r="4" fill="white"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16)
        }
      });

      marker.addListener('click', () => {
        onPinClick(place);
      });

      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;
    console.log('Markers updated, total:', newMarkers.length);
  }, [places, onPinClick, userLocation, mapCenter, isMapLoaded]);

  // Handle search functionality
  const handleSearch = async () => {
    if (!mapInstanceRef.current || !searchQuery.trim() || apiKey === 'demo') return;

    try {
      const service = new google.maps.places.PlacesService(mapInstanceRef.current);
      const request = {
        query: searchQuery,
        fields: ['name', 'geometry', 'place_id', 'rating'],
      };

      service.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const place = results[0];
          if (place.geometry?.location) {
            mapInstanceRef.current?.setCenter(place.geometry.location);
            mapInstanceRef.current?.setZoom(16);
          }
        }
      });
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (mapInstanceRef.current) {
        google.maps.event.trigger(mapInstanceRef.current, 'resize');
      }
    }, 100);
  };

  const toggleSearch = () => {
    setIsSearching(!isSearching);
    if (!isSearching) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
    }
  };

  const handleApiKeySet = (key: string) => {
    setApiKey(key);
    setShowApiKeySetup(false);
    setIsMapLoaded(false);
    setMapError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        console.log('Cleaning up map instance');
        markersRef.current.forEach(marker => marker.setMap(null));
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Show API key setup if needed
  if (showApiKeySetup) {
    return <GoogleMapsSetup onApiKeySet={handleApiKeySet} />;
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        {/* Fullscreen Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="shrink-0"
            >
              <Minimize className="w-5 h-5" />
            </Button>
            
            <div className="flex-1 relative">
              {isSearching ? (
                <div className="flex items-center gap-2">
                  <Input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Search for places..."
                    className="flex-1"
                  />
                  <Button onClick={handleSearch} size="sm" disabled={apiKey === 'demo'}>
                    <Search className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSearch}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Explore Map</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSearch}
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          {apiKey === 'demo' && (
            <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
              Demo mode - Search functionality disabled. Add your Google Maps API key for full features.
            </div>
          )}
          {locationPermissionDenied && (
            <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
              Location access denied - Showing default location. Enable location permissions for better experience.
            </div>
          )}
          {mapError && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              {mapError}
            </div>
          )}
        </div>

        {/* Fullscreen Map */}
        <div ref={mapRef} className="w-full h-full pt-20" />
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 bg-white">
      <div className="h-64 bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl relative overflow-hidden shadow-lg">
        {/* Google Map or Demo Map */}
        {apiKey === 'demo' ? (
          // Demo map fallback
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-green-50 to-blue-200">
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <pattern id="streets" patternUnits="userSpaceOnUse" width="40" height="40">
                  <path d="M0,20 L40,20" stroke="#ddd" strokeWidth="1"/>
                  <path d="M20,0 L20,40" stroke="#ddd" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#streets)" opacity="0.3"/>
            </svg>
            {/* Demo pins */}
            {places.map((place, index) => (
              <div 
                key={place.id}
                className="absolute group cursor-pointer"
                style={{
                  top: `${30 + index * 15}%`,
                  left: `${25 + index * 20}%`
                }}
                onClick={() => onPinClick(place)}
              >
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:scale-110 transition-transform">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>
            ))}
            <div className="absolute bottom-6 left-4 text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">
              Demo Map - Add Google Maps API key for interactive features
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <div ref={mapRef} className="absolute inset-0 rounded-2xl" />
            {!isMapLoaded && (
              <div className="absolute inset-0 bg-gray-50 rounded-2xl flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="text-gray-600 text-sm font-medium mb-2">Loading Map...</div>
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              </div>
            )}
            {mapError && (
              <div className="absolute inset-0 bg-gray-50 rounded-2xl flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="text-red-600 text-sm font-medium mb-2">Map Error</div>
                  <div className="text-red-500 text-xs mb-3">{mapError}</div>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setIsMapLoaded(false);
                      setMapError(null);
                    }}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            )}
            {locationPermissionDenied && !mapCenter && (
              <div className="absolute bottom-6 left-4 text-xs text-yellow-600 bg-yellow-50/90 px-2 py-1 rounded">
                Enable location for better experience
              </div>
            )}
          </div>
        )}

        {/* Location Labels - only show if using demo mode */}
        {apiKey === 'demo' && (
          <>
            <div className="absolute top-4 left-4 text-xs font-medium text-gray-600 bg-white/80 px-2 py-1 rounded">
              PACIFIC HEIGHTS
            </div>
            <div className="absolute top-6 right-4 text-xs font-medium text-gray-600 bg-white/80 px-2 py-1 rounded">
              CHINATOWN
            </div>
            <div className="absolute bottom-16 left-4 text-xs font-medium text-gray-600 bg-white/80 px-2 py-1 rounded">
              MISSION<br />DISTRICT
            </div>
            <div className="absolute bottom-20 right-8 text-xs font-medium text-gray-600 bg-white/80 px-2 py-1 rounded">
              UNION SQUARE
            </div>
          </>
        )}

        {/* Expand Map Button */}
        <button 
          onClick={toggleFullscreen}
          className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <Maximize className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

export default MapSection;
