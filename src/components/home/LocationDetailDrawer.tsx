import React, { useState, useEffect } from 'react';
import { X, MapPin, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';


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
        .eq('location_id', location.place_id)
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

  const hasValidCoordinates = location.coordinates.lat !== 0 && location.coordinates.lng !== 0;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50" onClick={onClose}>
      <div
        className="fixed inset-x-0 bottom-0 bg-background rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{location.name}</h2>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="w-4 h-4" />
              <span>{location.address || location.city || 'Location'}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Map Section */}
          {hasValidCoordinates ? (
            <div className="w-full h-48 relative rounded-lg overflow-hidden">
              <iframe
                title="Mappa location"
                src={`https://maps.google.com/maps?q=${location.coordinates.lat},${location.coordinates.lng}&z=15&output=embed`}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <div className="w-full h-48 bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Coordinate non disponibili</p>
              </div>
            </div>
          )}

          {/* Posts Section */}
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-3 text-foreground">
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
              <div className="grid grid-cols-3 gap-2">
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
