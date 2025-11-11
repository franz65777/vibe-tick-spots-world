import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Image, Star } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createLeafletCustomMarker } from '@/utils/leafletMarkerCreator';
import { formatDetailedAddress } from '@/utils/addressFormatter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/utils/dateFnsLocales';
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

interface Review {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  rating: number;
  comment?: string;
  created_at: string;
}

const LocationDetailDrawer = ({ location, isOpen, onClose }: LocationDetailDrawerProps) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [fullAddress, setFullAddress] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reviews'>('posts');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

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

    // Defer to ensure drawer is fully mounted and sized
    const t = setTimeout(() => {
      try {
        if (!mapDivRef.current) return;

        // Use same CartoDB tile style as home page
        const tileUrl = isDarkMode
          ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 15);
          // Force map refresh
          setTimeout(() => mapRef.current?.invalidateSize(), 100);
        } else {
          const map = L.map(mapDivRef.current, {
            center: [lat, lng],
            zoom: 15,
            zoomControl: false,
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
          
          // Multiple invalidate attempts to fix white tiles
          setTimeout(() => map.invalidateSize(), 100);
          setTimeout(() => map.invalidateSize(), 300);
          setTimeout(() => map.invalidateSize(), 500);
        }
      } catch (e) {
        console.error('Leaflet map init error', e);
      }
    }, 100);

    return () => {
      clearTimeout(t);
    };
  }, [isOpen, location?.coordinates, isDarkMode]);

  // Cleanup map on close
  useEffect(() => {
    if (!isOpen && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, [isOpen]);

  // Fetch location data to get full address with reverse geocoding fallback
  useEffect(() => {
    if (!isOpen || !location) return;
    fetchLocationData();
    fetchLocationPosts();
    fetchReviews();
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
          media_urls,
          created_at,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .eq('location_id', locationData.id)
        .not('media_urls', 'is', null)
        .order('created_at', { ascending: false })
        .limit(2);

      if (error) throw error;

      const formattedPosts = (data || [])
        .filter((p: any) => (p.media_urls && p.media_urls.length > 0) || p.media_url)
        .map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          caption: p.caption || '',
          media_url: p.media_url || (p.media_urls?.[0] || ''),
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

  const fetchReviews = async () => {
    if (!location) return;
    setReviewsLoading(true);
    try {
      // Resolve UUID from google_place_id
      const { data: locationData } = await supabase
        .from('locations')
        .select('id')
        .eq('google_place_id', location.place_id)
        .maybeSingle();

      if (!locationData) {
        setReviews([]);
        setReviewsLoading(false);
        return;
      }

      const locationId = locationData.id;

      // Fetch reviews from posts table only
      const { data: postsData } = await supabase
        .from('posts')
        .select('user_id, rating, caption, created_at')
        .eq('location_id', locationId)
        .not('rating', 'is', null)
        .gt('rating', 0);

      if (!postsData || postsData.length === 0) {
        setReviews([]);
        setReviewsLoading(false);
        return;
      }

      // Get unique user profiles
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const formattedReviews: Review[] = postsData
        .map(p => {
          const profile = profilesMap.get(p.user_id);
          return {
            id: `${p.user_id}-${p.created_at}`,
            user_id: p.user_id,
            username: profile?.username || 'User',
            avatar_url: profile?.avatar_url || null,
            rating: p.rating || 0,
            comment: p.caption,
            created_at: p.created_at,
          };
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setReviews(formattedReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
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

        {/* Tabs and Content - Scrollable */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Tab Navigation with Horizontal Scroll */}
          <div 
            className="flex-shrink-0 px-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
            onScroll={(e) => {
              const scrollLeft = e.currentTarget.scrollLeft;
              const width = e.currentTarget.offsetWidth;
              if (scrollLeft < width / 2) {
                setActiveTab('posts');
              } else {
                setActiveTab('reviews');
              }
            }}
          >
            <div className="flex gap-0 min-w-full">
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-3 px-4 text-sm font-medium transition-colors relative whitespace-nowrap snap-center flex-1 ${
                  activeTab === 'posts'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('postsTab', { ns: 'explore', defaultValue: 'Posts' })}
                {activeTab === 'posts' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-3 px-4 text-sm font-medium transition-colors relative whitespace-nowrap snap-center flex-1 ${
                  activeTab === 'reviews'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('reviewsTab', { ns: 'explore', defaultValue: 'Reviews' })}
                {activeTab === 'reviews' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
            {activeTab === 'posts' ? (
              <div className="p-4">
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
                  <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className="relative rounded-lg overflow-hidden bg-muted snap-center flex-shrink-0 w-[75vw] max-w-[350px] h-80"
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
            ) : (
              <div className="p-4">
                {reviewsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{t('noReviewsYet', { ns: 'common', defaultValue: 'No reviews yet' })}</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="flex gap-3 pb-4 border-b border-border last:border-0">
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarImage src={review.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {review.username?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm">{review.username}</p>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                              <span className="text-sm font-medium">{review.rating}</span>
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-muted-foreground mb-1">{review.comment}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: getDateFnsLocale(i18n.language) })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default LocationDetailDrawer;
