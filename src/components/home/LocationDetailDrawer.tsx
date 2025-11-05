import React, { useState, useEffect } from 'react';
import { X, MapPin, Image } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import pinIcon from '@/assets/pin-icon.png';


interface LocationDetailDrawerProps {
  location: {
    place_id: string;
    name: string;
    category: string;
    city: string | null;
    address?: string;
    coordinates: {
      lat: number;
      lng: number;
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

const customIcon = new Icon({
  iconUrl: pinIcon,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});


const LocationDetailDrawer = ({ location, isOpen, onClose }: LocationDetailDrawerProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && location) {
      fetchLocationPosts();
    }
  }, [isOpen, location]);

  const fetchLocationPosts = async () => {
    if (!location) return;
    
    setLoading(true);
    try {
      // First, get the location UUID from the locations table using google_place_id
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

      // If no location found, no posts to show
      if (!locationData) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Now fetch posts using the location UUID
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

  if (!isOpen || !location) return null;

  // Safely extract coordinates - handle multiple formats
  const coords: any = location.coordinates || {};
  const lat = Number(coords.lat ?? coords.latitude ?? 0);
  const lng = Number(coords.lng ?? coords.longitude ?? 0);
  const hasValidCoordinates = lat !== 0 && lng !== 0;
  
  // Format full address
  const fullAddress = [location.address, location.city].filter(Boolean).join(', ');

  return (
    <div className="fixed inset-0 z-[100] bg-black/50" onClick={onClose}>
      <div
        className="fixed inset-x-0 bottom-0 bg-background rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-8">
              <h2 className="text-xl font-bold text-foreground mb-1">{location.name}</h2>
              <div className="flex items-start gap-1 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{fullAddress || 'Indirizzo non disponibile'}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Map Section - Fixed */}
        <div className="flex-shrink-0">
          {hasValidCoordinates ? (
            <div className="w-full h-48 relative">
              <MapContainer
                center={[lat, lng]}
                zoom={15}
                className="w-full h-full"
                zoomControl={true}
                scrollWheelZoom={true}
                doubleClickZoom={true}
                touchZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker
                  position={[lat, lng]}
                  icon={customIcon}
                />
              </MapContainer>
            </div>
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
      </div>
    </div>
  );
};

export default LocationDetailDrawer;
