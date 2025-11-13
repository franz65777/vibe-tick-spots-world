import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Place } from '@/types/place';
import PinDetailCard from './explore/PinDetailCard';
import { PostDetailModalMobile } from './explore/PostDetailModalMobile';
import { useGeolocation } from '@/hooks/useGeolocation';
import { createCurrentLocationMarker, createLeafletCustomMarker } from '@/utils/leafletMarkerCreator';
import { useAnalytics } from '@/hooks/useAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { useLocationShares } from '@/hooks/useLocationShares';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { LocationSharersModal } from './explore/LocationSharersModal';
import { useTranslation } from 'react-i18next';

interface LeafletMapSetupProps {
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
  preventCenterUpdate?: boolean;
  recenterToken?: number;
  onSharingStateChange?: (hasSharing: boolean) => void;
}

// Vanilla Leaflet implementation to avoid react-leaflet context crash
const LeafletMapSetup = ({
  places,
  onPinClick,
  onPinShare,
  mapCenter,
  selectedPlace,
  onCloseSelectedPlace,
  onMapRightClick,
  onMapClick,
  activeFilter,
  fullScreen,
  preventCenterUpdate = true, // Default to true to prevent auto-recentering
  recenterToken,
  onSharingStateChange,
}: LeafletMapSetupProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const currentLocationMarkerRef = useRef<L.Marker | null>(null);

  const { location } = useGeolocation();
  const { trackEvent } = useAnalytics();
  const { shares, refetch: refetchShares } = useLocationShares();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userActiveShare, setUserActiveShare] = useState<any>(null);
  const [selectedSharersLocation, setSelectedSharersLocation] = useState<{ 
    name: string; 
    sharers: Array<{ id: string; username: string; avatar_url: string | null }> 
  } | null>(null);

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

  // Check if user has active share and notify parent
  useEffect(() => {
    if (user && shares.length > 0) {
      const activeShare = shares.find(share => share.user_id === user.id);
      setUserActiveShare(activeShare || null);
      onSharingStateChange?.(!!activeShare);
    } else {
      setUserActiveShare(null);
      onSharingStateChange?.(false);
    }
  }, [user, shares, onSharingStateChange]);

  // Sharing controls always at same height as expand button
  const baseControlPosition = fullScreen 
    ? 'bottom-[calc(env(safe-area-inset-bottom)+1rem)]'
    : 'bottom-[calc(4rem+env(safe-area-inset-bottom)-1.75rem)]';

  // Keep latest handlers in refs to avoid re-initializing map on prop changes
  const onMapRightClickRef = useRef(onMapRightClick);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onMapRightClickRef.current = onMapRightClick;
    onMapClickRef.current = onMapClick;
  }, [onMapRightClick, onMapClick]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [mapCenter.lat, mapCenter.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: true,
      doubleClickZoom: false,
    });

    mapRef.current = map;

    // Use navigation style for dark mode with better colors (gray base, dark blue water, green parks)
    const mapboxToken = (import.meta as any).env?.VITE_MAPBOX_TOKEN as string | undefined;
    const url = mapboxToken
      ? (isDarkMode
          ? `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`
          : `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`)
      : (isDarkMode
          ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png');

    const tile = L.tileLayer(url, mapboxToken ? {
      maxZoom: 19,
      tileSize: 512,
      zoomOffset: -1,
      attribution: '&copy; OpenStreetMap, &copy; Mapbox'
    } : {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap, &copy; CartoDB'
    });
    tile.addTo(map);
    tileLayerRef.current = tile;

    // Map events (handlers read latest refs)
    map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      onMapRightClickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      tileLayerRef.current = null;
      currentLocationMarkerRef.current = null;
    };
  }, []);

  // Update tile layer on theme change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const mapboxToken = (import.meta as any).env?.VITE_MAPBOX_TOKEN as string | undefined;
    const url = mapboxToken
      ? (isDarkMode
          ? `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`
          : `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`)
      : (isDarkMode
          ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png');

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const tile = L.tileLayer(url, mapboxToken ? {
      maxZoom: 19,
      tileSize: 512,
      zoomOffset: -1,
      attribution: '&copy; OpenStreetMap, &copy; Mapbox'
    } : {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap, &copy; CartoDB'
    });
    tile.addTo(map);
    tileLayerRef.current = tile;
  }, [isDarkMode]);

  // Update map center when it changes (for selected place from cards)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || preventCenterUpdate) return;
    
    console.log('🗺️ Centering map to:', mapCenter, 'token:', recenterToken);
    map.setView([mapCenter.lat, mapCenter.lng], 15, { animate: true });
  }, [mapCenter.lat, mapCenter.lng, preventCenterUpdate, recenterToken]);

  // Center map when a place is selected from navigation (e.g., from feed)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPlace) return;
    
    console.log('🗺️ Centering map to selected place:', selectedPlace.name);
    map.setView([selectedPlace.coordinates.lat, selectedPlace.coordinates.lng], 16, { 
      animate: true,
      duration: 0.8 
    });
  }, [selectedPlace]);

  // Ensure tiles recalc when toggling fullscreen to avoid white map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Multiple invalidate attempts with increasing delays to fix white tiles
    const timeouts = [
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 50),
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 150),
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 300),
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 500),
    ];
    
    return () => timeouts.forEach(t => clearTimeout(t));
  }, [fullScreen]);

  // Observe container size changes and invalidate map to prevent white tiles
  useEffect(() => {
    const container = containerRef.current;
    const map = mapRef.current;
    if (!container || !map) return;

    const ro = new ResizeObserver(() => {
      // Use rAF + timeout to ensure layout settled
      requestAnimationFrame(() => {
        try { map.invalidateSize(); } catch {}
        setTimeout(() => { try { map.invalidateSize(); } catch {} }, 100);
      });
    });
    ro.observe(container);

    const onWindowResize = () => {
      try { map.invalidateSize(); } catch {}
    };
    window.addEventListener('orientationchange', onWindowResize);
    window.addEventListener('resize', onWindowResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', onWindowResize);
      window.removeEventListener('resize', onWindowResize);
    };
  }, []);

  // Current location marker - always visible
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (location?.latitude && location?.longitude) {
      console.log('📍 Updating current location marker:', location);
      const icon = createCurrentLocationMarker();
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.setLatLng([location.latitude, location.longitude]);
        currentLocationMarkerRef.current.setIcon(icon);
      } else {
        currentLocationMarkerRef.current = L.marker([location.latitude, location.longitude], {
          icon,
          zIndexOffset: 3000, // Increased to always be on top
          pane: 'markerPane', // Ensure it's in the correct pane
        }).addTo(map);
        
        // Ensure marker stays on top
        currentLocationMarkerRef.current.setZIndexOffset(3000);
      }
    }
  }, [location?.latitude, location?.longitude]);

  // Places markers with campaign detection
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove markers that no longer exist
    markersRef.current.forEach((marker, id) => {
      if (!places.find((p) => p.id === id)) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });

    // Fetch active campaigns for all locations
    const fetchCampaigns = async () => {
      const locationIds = places.map(p => p.id).filter(Boolean);
      if (locationIds.length === 0) {
        // No places, render empty markers
        return;
      }

      try {
        const { data: campaigns } = await supabase
          .from('marketing_campaigns')
          .select('location_id')
          .in('location_id', locationIds)
          .eq('is_active', true)
          .gt('end_date', new Date().toISOString());

        const campaignLocationIds = new Set(campaigns?.map(c => c.location_id) || []);

        // Add / update markers
        places.forEach((place) => {
          if (!place.coordinates?.lat || !place.coordinates?.lng) return;

          const hasCampaign = campaignLocationIds.has(place.id);

          // Find all users sharing location at this place (only active shares, excluding current user)
          const now = new Date();
          const activeShares = shares.filter(s => {
            // Exclude current user's share
            if (user && s.user_id === user.id) return false;
            // Only active non-expired shares
            try { return new Date(s.expires_at) > now; } catch { return false; }
          });
          const usersHere = activeShares.filter(share => {
            // Prefer exact location_id match when present
            if (share.location_id && place.id && share.location_id === place.id) return true;
            // Fallback to proximity check (~350m)
            const latDiff = Math.abs(parseFloat(share.latitude.toString()) - place.coordinates.lat);
            const lngDiff = Math.abs(parseFloat(share.longitude.toString()) - place.coordinates.lng);
            return latDiff < 0.003 && lngDiff < 0.003;
          });

          const sharedByUsers = usersHere.map(share => ({
            id: share.user.id,
            username: share.user.username,
            avatar_url: share.user.avatar_url
          }));

          const icon = createLeafletCustomMarker({
            category: place.category || 'attraction',
            isSaved: place.isSaved,
            isRecommended: place.isRecommended,
            recommendationScore: place.recommendationScore,
            friendAvatars: [],
            isDarkMode,
            hasCampaign,
            sharedByUsers: sharedByUsers.length > 0 ? sharedByUsers : undefined,
          });

        let marker = markersRef.current.get(place.id);
        if (!marker) {
          marker = L.marker([place.coordinates.lat, place.coordinates.lng], {
            icon,
          }).addTo(map);
          marker.on('click', (e) => {
            // Check if clicked on the sharers badge
            const target = (e.originalEvent as any).target;
            if (target && target.closest('.location-sharers-badge') && sharedByUsers.length > 1) {
              e.originalEvent.stopPropagation();
              setSelectedSharersLocation({
                name: place.name,
                sharers: sharedByUsers
              });
              return;
            }

            // Simple bounce animation
            const el = marker!.getElement();
            if (el) {
              el.style.animation = 'bounce 0.7s ease-in-out';
              setTimeout(() => (el.style.animation = ''), 700);
            }
            trackEvent('map_pin_clicked', {
              place_id: place.id,
              category: place.category,
              source_tab: 'map',
              has_campaign: hasCampaign,
            });
            onPinClick?.(place);
          });
          markersRef.current.set(place.id, marker);
        }
        marker.setIcon(icon);
        marker.setLatLng([place.coordinates.lat, place.coordinates.lng]);
      });
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      }
    };

    fetchCampaigns();
  }, [places, isDarkMode, onPinClick, trackEvent, shares]);

  const [selectedPostFromPin, setSelectedPostFromPin] = useState<string | null>(null);

  const handleEndSharing = async () => {
    if (!userActiveShare) return;
    
    try {
      // Delete the location share
      const { error } = await supabase
        .from('user_location_shares')
        .delete()
        .eq('id', userActiveShare.id);

      if (error) throw error;
      
      // Update related notifications to change "si trova" to "si trovava"
      const { error: notifError } = await supabase
        .from('notifications')
        .update({ 
          message: userActiveShare.location?.name 
            ? `si trovava a ${userActiveShare.location.name}` 
            : 'si trovava in una posizione'
        })
        .eq('type', 'location_share')
        .contains('data', { location_id: userActiveShare.location_id });

      if (notifError) {
        console.error('Error updating notifications:', notifError);
      }
      
      toast.success('Condivisione posizione terminata');
      refetchShares();
      setUserActiveShare(null);
    } catch (error) {
      console.error('Error ending share:', error);
      toast.error('Errore terminando la condivisione');
    }
  };

  const handleUpdateLocation = () => {
    navigate('/share-location');
  };

  return (
    <>
      {/* Hide map when viewing a post */}
      <div
        ref={containerRef}
        className={
          fullScreen
            ? 'relative w-full h-full rounded-2xl overflow-hidden bg-background'
            : 'relative w-full min-h-[60vh] rounded-lg overflow-hidden'
        }
        style={{ 
          minHeight: fullScreen ? '100%' : '60vh',
          visibility: selectedPostFromPin ? 'hidden' : 'visible',
          position: selectedPostFromPin ? 'absolute' : 'relative',
          pointerEvents: selectedPostFromPin ? 'none' : 'auto'
        }}
      />

      {/* Location sharing controls */}
      {userActiveShare && (
        <div className={`${fullScreen ? 'fixed' : 'absolute'} ${baseControlPosition} left-4 z-[1000] flex gap-2`}>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleEndSharing}
            className="shadow-lg rounded-full"
          >
            <X className="h-4 w-4 mr-1" />
            {t('endSharing', { ns: 'common', defaultValue: 'End' })}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleUpdateLocation}
            className="shadow-lg rounded-full"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {t('updateLocation', { ns: 'common', defaultValue: 'Update' })}
          </Button>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-10px); }
          50% { transform: translateY(-5px); }
          75% { transform: translateY(-8px); }
        }
        .leaflet-container {
          background: ${isDarkMode ? '#2a2f3a' : '#f8fafc'};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .custom-leaflet-icon { background: transparent; border: none; }
        .leaflet-control-attribution {
          background: rgba(255,255,255,0.9);
          padding: 4px 8px;
          font-size: 9px;
          border-radius: 4px;
          margin: 8px;
        }
        .dark .leaflet-control-attribution {
          background: rgba(42, 47, 58, 0.8);
          color: rgba(148, 163, 184, 0.9);
        }
        .leaflet-tile {
          filter: ${isDarkMode ? 'brightness(0.7) contrast(1.2) saturate(0.9) hue-rotate(180deg) invert(1)' : 'brightness(1.02) contrast(0.98)'};
        }
      `}</style>

      {/* Location detail card - hide when viewing post */}
      {selectedPlace && !selectedPostFromPin && (
        <PinDetailCard
          place={{
            id: selectedPlace.id,
            name: selectedPlace.name,
            category: selectedPlace.category,
            address: selectedPlace.address,
            city: selectedPlace.city,
            google_place_id: selectedPlace.google_place_id,
            coordinates: selectedPlace.coordinates,
            sourcePostId: (selectedPlace as any).sourcePostId,
          }}
          onClose={() => onCloseSelectedPlace?.()}
          onPostSelected={(postId) => setSelectedPostFromPin(postId)}
        />
      )}

      {/* Show post modal when post is selected from pin */}
      {selectedPostFromPin && selectedPlace && (
        <PostDetailModalMobile
          postId={selectedPostFromPin}
          locationId={selectedPlace.id}
          isOpen={true}
          onClose={() => {
            setSelectedPostFromPin(null);
            // Force map to reflow after becoming visible - use multiple attempts
            setTimeout(() => {
              if (mapRef.current) {
                mapRef.current.invalidateSize(true);
              }
            }, 50);
            setTimeout(() => {
              if (mapRef.current) {
                mapRef.current.invalidateSize(true);
              }
            }, 150);
            setTimeout(() => {
              if (mapRef.current) {
                mapRef.current.invalidateSize(true);
              }
            }, 300);
          }}
        />
      )}

      {/* Location sharers modal */}
      {selectedSharersLocation && (
        <LocationSharersModal
          isOpen={true}
          onClose={() => setSelectedSharersLocation(null)}
          sharers={selectedSharersLocation.sharers}
          locationName={selectedSharersLocation.name}
        />
      )}
    </>
  );
};

export default LeafletMapSetup;
