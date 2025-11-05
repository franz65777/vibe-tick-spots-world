import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Image } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createLeafletCustomMarker } from '@/utils/leafletMarkerCreator';
import { formatDetailedAddress } from '@/utils/addressFormatter';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface LocationDetailDrawerProps {
  location: {
    place_id: string;
    name: string;
    category: string;
    city: string | null;
    address?: string;
    coordinates: {
      lat?: number;
      lng?: number;
      latitude?: number;
      longitude?: number;
    };
    image_url?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Post {
  id: string;
  user_id: string;
  caption: string;
  media_url: string;
  created_at: string;
  username: string;
  avatar_url: string;
}

const LocationDetailDrawer = ({ location, isOpen, onClose }: LocationDetailDrawerProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [fullAddress, setFullAddress] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Leaflet (vanilla) map refs
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

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

  // Init / update Leaflet map when opening
  useEffect(() => {
    if (!isOpen || !location) return;

    const coords: any = location.coordinates || {};
    const lat = Number(coords.lat ?? coords.latitude ?? 0);
    const lng = Number(coords.lng ?? coords.longitude ?? 0);
    if (!lat || !lng) return;

    // Defer to next tick to ensure drawer container is mounted
    const t = setTimeout(() => {
      try {
        if (!mapDivRef.current) return;

        // Use same CartoDB tile style as home page
        const tileUrl = isDarkMode
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 15);
        } else {
          const map = L.map(mapDivRef.current, {
            center: [lat, lng],
            zoom: 15,
            zoomControl: false, // Remove zoom buttons
            attributionControl: true,
            doubleClickZoom: false,
          });
          L.tileLayer(tileUrl, {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap, &copy; CartoDB',
          }).addTo(map);

          // Use the same custom marker as home page
          const icon = createLeafletCustomMarker({
            category: location.category || 'restaurant',
            isSaved: false,
            isRecommended: false,
            isDarkMode,
          });

          L.marker([lat, lng], { icon }).addTo(map);
          mapRef.current = map;
          // Fix for initial white tiles
          setTimeout(() => map.invalidateSize(), 100);
        }
      } catch (e) {
        console.error('Leaflet map init error', e);
      }
    }, 0);

    return () => {
      clearTimeout(t);
      if (mapRef.current && !isOpen) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, location?.coordinates, isDarkMode]);

  // Fetch location data to get full address with reverse geocoding fallback
  useEffect(() => {
    if (!isOpen || !location) return;
    fetchLocationData();
    fetchLocationPosts();
  }, [isOpen, location?.place_id]);

  const fetchLocationData = async () => {
    if (!location) return;
    try {
      const coords: any = location.coordinates || {};
      const lat = Number(coords.lat ?? coords.latitude ?? 0);
      const lng = Number(coords.lng ?? coords.longitude ?? 0);

      // Use formatDetailedAddress which includes reverse geocoding
      const addr = await formatDetailedAddress({
        city: location.city,
        address: location.address,
        coordinates: lat && lng ? { lat, lng } : null,
      });

      setFullAddress(addr);
    } catch (error) {
      console.error('Error fetching location data:', error);
      setFullAddress('Indirizzo non disponibile');
    }
  };

  const fetchLocationPosts = async () => {
    if (!location) return;
    setLoading(true);
    try {
      // Resolve UUID from google_place_id (place_id)
      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .select('id')
        .eq('google_place_id', location.place_id)
        .maybeSingle();

      if (locationError) {
        console.error('Error fetching location:', locationError);
        setLoading(false);
        return;
      }

      if (!locationData) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          caption,
          media_url,
          created_at,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .eq('location_id', locationData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedPosts = (data || []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        caption: p.caption || '',
        media_url: p.media_url,
        created_at: p.created_at,
        username: p.profiles?.username || 'User',
        avatar_url: p.profiles?.avatar_url || '',
      }));

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching location posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const c: any = location?.coordinates || {};
  const lat = Number(c.lat ?? c.latitude ?? 0);
  const lng = Number(c.lng ?? c.longitude ?? 0);
  const hasValidCoordinates = !!lat && !!lng;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h-[85vh] flex flex-col">
        {/* Drag handle */}
        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mt-3 mb-2" />

        {/* Header - Fixed */}
        <DrawerHeader className="flex-shrink-0 px-4 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <DrawerTitle className="text-xl font-bold text-foreground mb-1">
                {location?.name}
              </DrawerTitle>
              <div className="flex items-start gap-1 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{fullAddress}</span>
              </div>
            </div>
          </div>
        </DrawerHeader>

        {/* Map Section - Fixed */}
        <div className="flex-shrink-0">
          {hasValidCoordinates ? (
            <div ref={mapDivRef} className="w-full h-48 relative rounded-lg overflow-hidden" />
          ) : (
            <div className="w-full h-48 bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Coordinate non disponibili</p>
              </div>
            </div>
          )}
        </div>

        {/* Posts Section - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-3 text-foreground sticky top-0 bg-background py-2 z-10">
              Post degli utenti
            </h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nessun post ancora per questa location</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 pb-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="aspect-square rounded-lg overflow-hidden bg-muted relative"
                  >
                    <img
                      src={post.media_url}
                      alt={post.caption}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default LocationDetailDrawer;
