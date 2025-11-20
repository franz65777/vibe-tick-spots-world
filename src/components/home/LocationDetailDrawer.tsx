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
    id?: string;
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
  const [resolvedCoordinates, setResolvedCoordinates] = useState<{ lat: number; lng: number } | null>(null);
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

  // Fetch location details including coordinates if missing - MATCH PinDetailCard pattern
  useEffect(() => {
    if (!isOpen || !location) return;
    
    const fetchLocationDetails = async () => {
      try {
        // First, ensure we have a valid internal location_id
        let locationId = location.id;
        let locationData: any = null;

        // If no ID, try to find by google_place_id (fallback for older data)
        if (!locationId && (location as any).google_place_id) {
          const { data } = await supabase
            .from('locations')
            .select('id, latitude, longitude, address, city, category, name')
            .eq('google_place_id', (location as any).google_place_id)
            .maybeSingle();
          
          if (data) {
            locationId = data.id;
            locationData = data;
          }
        }

        // If still no ID, try by name + city
        if (!locationId) {
          const { data } = await supabase
            .from('locations')
            .select('id, latitude, longitude, address, city, category, name')
            .ilike('name', location.name)
            .eq('city', location.city || '')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (data) {
            locationId = data.id;
            locationData = data;
          }
        }

        // If we have an ID but no full data yet, fetch it
        if (locationId && !locationData) {
          const { data } = await supabase
            .from('locations')
            .select('id, latitude, longitude, address, city, category, name')
            .eq('id', locationId)
            .maybeSingle();
          
          locationData = data;
        }

        // Update location with fetched data
        if (locationData) {
          location.id = locationData.id; // Critical: ensure ID is set
          
          if (locationData.latitude && locationData.longitude) {
            const latNum = Number(locationData.latitude);
            const lngNum = Number(locationData.longitude);
            location.coordinates = { lat: latNum, lng: lngNum };
            setResolvedCoordinates({ lat: latNum, lng: lngNum });
          }

          if (!location.address && locationData.address) {
            location.address = locationData.address;
          }
          if (!location.city && locationData.city) {
            location.city = locationData.city;
          }
          if (locationData.category) {
            location.category = locationData.category;
          }
        } else {
          // Fallback: use existing coordinates if available
          const coords: any = location.coordinates || {};
          const lat = Number(coords.lat ?? coords.latitude ?? 0);
          const lng = Number(coords.lng ?? coords.longitude ?? 0);
          if (lat && lng) {
            setResolvedCoordinates({ lat, lng });
          }
        }
      } catch (error) {
        console.error('Error fetching location details (drawer):', error);
      }
    };

    fetchLocationDetails();
  }, [isOpen, location]);

  // Init / update Leaflet map when opening
  useEffect(() => {
    if (!isOpen || !location) return;

    const coordsSource: any = resolvedCoordinates || location.coordinates || {};
    const lat = Number(coordsSource.lat ?? coordsSource.latitude ?? 0);
    const lng = Number(coordsSource.lng ?? coordsSource.longitude ?? 0);
    if (!lat || !lng || !mapDivRef.current) return;

    try {
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 15);
        // Force map refresh
        setTimeout(() => mapRef.current?.invalidateSize(), 100);
        return;
      }

      const map = L.map(mapDivRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: true,
        doubleClickZoom: false,
      });

      // Prefer Mapbox when token present; fallback to CartoDB (same config as main map)
      const mapboxToken = (import.meta as any).env?.VITE_MAPBOX_TOKEN as string | undefined;
      const tileUrl = mapboxToken
        ? (isDarkMode
            ? `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`
            : `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`)
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

      const tileLayer = mapboxToken
        ? L.tileLayer(tileUrl, {
            maxZoom: 19,
            tileSize: 512,
            zoomOffset: -1,
            attribution: '&copy; OpenStreetMap, &copy; Mapbox',
          })
        : L.tileLayer(tileUrl, {
            maxZoom: 19,
            subdomains: 'abcd',
            attribution: '&copy; OpenStreetMap, &copy; CartoDB',
          });

      tileLayer.addTo(map);

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
    } catch (e) {
      console.error('Leaflet map init error', e);
    }
  }, [isOpen, location, resolvedCoordinates, isDarkMode]);

  // Cleanup handled by component unmount to avoid Leaflet re-init errors

  // Fetch location data to get full address with reverse geocoding fallback
  useEffect(() => {
    if (!isOpen || !location) return;
    fetchLocationData();
    fetchLocationPosts();
    fetchReviews();
  }, [isOpen, location?.id, location?.name]);

  const fetchLocationData = async () => {
    if (!location) return;
    try {
      const coordsSource: any = resolvedCoordinates || location.coordinates || {};
      const lat = Number(coordsSource.lat ?? coordsSource.latitude ?? 0);
      const lng = Number(coordsSource.lng ?? coordsSource.longitude ?? 0);

      // Use formatDetailedAddress which includes reverse geocoding
      const addr = await formatDetailedAddress({
        city: location.city,
        address: location.address,
        coordinates: lat && lng ? { lat, lng } : null,
      });

      setFullAddress(addr);
    } catch (error) {
      console.error('Error fetching location data:', error);
      setFullAddress(t('addressNotAvailable'));
    }
  };

  const fetchLocationPosts = async () => {
    if (!location) return;
    setLoading(true);
    try {
      // Match PinDetailCard pattern: ensure we have internal location_id
      let locationId = location.id;

      // Try by google_place_id if no ID (fallback for older data)
      if (!locationId && (location as any).google_place_id) {
        const { data } = await supabase
          .from('locations')
          .select('id')
          .eq('google_place_id', (location as any).google_place_id)
          .maybeSingle();
        
        if (data) {
          locationId = data.id;
        }
      }

      // Try by name + city if still no ID
      if (!locationId) {
        const { data } = await supabase
          .from('locations')
          .select('id')
          .ilike('name', location.name)
          .eq('city', location.city || '')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        locationId = data?.id || null;
      }

      if (!locationId) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Fetch posts - exactly like PinDetailCard
      const { data: postRows, error } = await supabase
        .from('posts')
        .select('id, user_id, caption, media_urls, created_at, location_id, rating')
        .eq('location_id', locationId)
        .not('media_urls', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get user profiles separately for better performance
      const userIds = Array.from(new Set(postRows?.map((p: any) => p.user_id).filter(Boolean) || []));
      let profilesMap = new Map<string, { username: string | null; avatar_url: string | null }>();
      
      if (userIds.length) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
        profilesMap = new Map((profilesData || []).map((p: any) => [p.id, { username: p.username, avatar_url: p.avatar_url }]));
      }

      // Map posts with profiles and filter valid media
      let mapped = (postRows || []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        caption: p.caption || '',
        media_url: p.media_urls?.[0] || '',
        created_at: p.created_at,
        username: profilesMap.get(p.user_id)?.username || 'User',
        avatar_url: profilesMap.get(p.user_id)?.avatar_url || '',
      }));

      // Filter to ensure only posts with valid media_urls
      mapped = mapped.filter((p: any) => 
        p.media_url && p.media_url.length > 0
      );

      setPosts(mapped);
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
      // Match PinDetailCard pattern: ensure we have internal location_id
      let locationId = location.id;

      // Try by google_place_id if no ID
      if (!locationId && (location as any).google_place_id) {
        const { data } = await supabase
          .from('locations')
          .select('id')
          .eq('google_place_id', (location as any).google_place_id)
          .maybeSingle();
        
        if (data) {
          locationId = data.id;
        }
      }

      // Try by name + city if still no ID
      if (!locationId) {
        const { data } = await supabase
          .from('locations')
          .select('id')
          .ilike('name', location.name)
          .eq('city', location.city || '')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        locationId = data?.id || null;
      }

      if (!locationId) {
        setReviews([]);
        setReviewsLoading(false);
        return;
      }

      // Fetch reviews (posts with ratings)
      const { data: postsData } = await supabase
        .from('posts')
        .select('user_id, rating, caption, created_at')
        .eq('location_id', locationId)
        .not('rating', 'is', null)
        .gt('rating', 0)
        .order('created_at', { ascending: false });

      if (!postsData || postsData.length === 0) {
        setReviews([]);
        setReviewsLoading(false);
        return;
      }

      // Get user profiles separately
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const formattedReviews: Review[] = postsData.map(p => {
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
      });

      setReviews(formattedReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };
  const coordSource: any = resolvedCoordinates || location?.coordinates || {};
  const lat = Number(coordSource.lat ?? coordSource.latitude ?? 0);
  const lng = Number(coordSource.lng ?? coordSource.longitude ?? 0);
  const hasValidCoordinates = !!lat && !!lng;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h-[85vh] flex flex-col z-[10000]">
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
                <p>{t('coordinatesNotAvailable')}</p>
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
                    <p>{t('noPostsYet', { ns: 'common', defaultValue: 'No posts yet' })}</p>
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
