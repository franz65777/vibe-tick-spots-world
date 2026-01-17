import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Image, Star, Navigation, Bookmark, BookmarkCheck, Camera, ChevronUp, ChevronDown } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createLeafletCustomMarker } from '@/utils/leafletMarkerCreator';
import { formatDetailedAddress } from '@/utils/addressFormatter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/utils/dateFnsLocales';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { SaveLocationDropdown } from '@/components/common/SaveLocationDropdown';
import { toast } from 'sonner';
import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { locationInteractionService } from '@/services/locationInteractionService';
import { SAVE_TAG_OPTIONS, type SaveTag } from '@/utils/saveTags';

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
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [fullAddress, setFullAddress] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reviews'>('posts');
  const [resolvedCoordinates, setResolvedCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [currentSaveTag, setCurrentSaveTag] = useState<SaveTag>('been');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [directionsModalOpen, setDirectionsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
    
    // Reset states when location changes
    setPosts([]);
    setReviews([]);
    setLoading(false);
    setReviewsLoading(false);
    
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
  }, [isOpen, location?.id, location?.name]);

  // Init / update Leaflet map when opening - FIXED for black screen
  useEffect(() => {
    if (!isOpen || !location) return;

    const coordsSource: any = resolvedCoordinates || location.coordinates || {};
    const lat = Number(coordsSource.lat ?? coordsSource.latitude ?? 0);
    const lng = Number(coordsSource.lng ?? coordsSource.longitude ?? 0);
    if (!lat || !lng || !mapDivRef.current) return;

    try {
      // Always recreate map to avoid black screen issues
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(mapDivRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false, // Completely hide Leaflet attribution
        doubleClickZoom: false,
        preferCanvas: true, // Better performance
      });

      // Use CartoDB tiles (same as main map)
      const tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      const tileLayer = L.tileLayer(tileUrl, {
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

      // Force multiple invalidations with increasing delays
      const timeouts = [50, 150, 300, 600, 1000];
      timeouts.forEach(delay => {
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        }, delay);
      });
    } catch (e) {
      console.error('Leaflet map init error', e);
    }

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
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
    setPosts([]); // Clear previous posts to avoid showing wrong data
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
    setReviews([]); // Clear previous reviews to avoid showing wrong data
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

  // Check if location is saved - using direct query to user_saved_locations
  useEffect(() => {
    if (!user?.id || !location?.id || !isOpen) return;
    const checkSaved = async () => {
      try {
        const { data } = await supabase
          .from('user_saved_locations')
          .select('save_tag')
          .eq('user_id', user.id)
          .eq('location_id', location.id)
          .maybeSingle();
        
        setIsSaved(!!data);
        if (data?.save_tag) {
          setCurrentSaveTag(data.save_tag as SaveTag);
        } else {
          setCurrentSaveTag('been');
        }
      } catch (error) {
        console.error('Error checking saved status:', error);
      }
    };
    checkSaved();
  }, [user?.id, location?.id, isOpen]);

  const handleSave = async (tag: SaveTag) => {
    if (!user?.id || !location) return;
    setLoading(true);
    try {
      let locationIdToSave = location.id;
      
      // If location doesn't exist in database, create it first
      if (!locationIdToSave) {
        const coordsSource: any = resolvedCoordinates || location.coordinates || {};
        const lat = Number(coordsSource.lat ?? coordsSource.latitude ?? 0);
        const lng = Number(coordsSource.lng ?? coordsSource.longitude ?? 0);
        
        const { data: newLocation, error: createError } = await supabase
          .from('locations')
          .insert({
            name: location.name,
            address: location.address || fullAddress,
            city: location.city,
            latitude: lat || null,
            longitude: lng || null,
            category: location.category || 'restaurant',
            google_place_id: (location as any).google_place_id || null,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        locationIdToSave = newLocation.id;
        location.id = newLocation.id; // Update location object with new ID
      }

      const saved = await locationInteractionService.saveLocation(locationIdToSave, {
        google_place_id: (location as any).google_place_id,
        name: location.name,
        address: location.address,
        latitude: lat || 0,
        longitude: lng || 0,
        category: location.category,
        types: []
      }, tag);
      
      if (saved) {
        setIsSaved(true);
        setCurrentSaveTag(tag);
        toast.success(t('locationSaved', { ns: 'common' }));
      } else {
        toast.error(t('failedToSave', { ns: 'common' }));
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error(t('failedToSave', { ns: 'common' }));
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async () => {
    if (!location?.id) return;
    setLoading(true);
    try {
      const unsaved = await locationInteractionService.unsaveLocation(location.id);
      if (unsaved) {
        setIsSaved(false);
        setCurrentSaveTag('been');
        toast.success(t('locationRemoved', { ns: 'common' }));
      }
    } catch (error) {
      console.error('Error unsaving location:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDirections = (app: 'google' | 'apple' | 'waze') => {
    const coordsSource: any = resolvedCoordinates || location?.coordinates || {};
    const lat = Number(coordsSource.lat ?? coordsSource.latitude ?? 0);
    const lng = Number(coordsSource.lng ?? coordsSource.longitude ?? 0);
    const encodedName = encodeURIComponent(location?.name || '');

    let url = '';
    switch (app) {
      case 'google':
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        break;
      case 'apple':
        url = `http://maps.apple.com/?daddr=${lat},${lng}&q=${encodedName}`;
        break;
      case 'waze':
        url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes&q=${encodedName}`;
        break;
    }

    window.open(url, '_blank');
    setDirectionsModalOpen(false);
  };

  const coordSource: any = resolvedCoordinates || location?.coordinates || {};
  const lat = Number(coordSource.lat ?? coordSource.latitude ?? 0);
  const lng = Number(coordSource.lng ?? coordSource.longitude ?? 0);
  const hasValidCoordinates = !!lat && !!lng;

  // Get saves count and first saver avatar
  const [savesCount, setSavesCount] = useState(0);
  const [firstSaverAvatar, setFirstSaverAvatar] = useState<string | null>(null);
  const [isMapMinimized, setIsMapMinimized] = useState(false);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  
  useEffect(() => {
    if (!location?.id || !isOpen) return;
    const fetchSavesData = async () => {
      // Get saves count and first saver
      const { data: savesData, count } = await supabase
        .from('user_saved_locations')
        .select('user_id', { count: 'exact' })
        .eq('location_id', location.id)
        .limit(1);
      
      setSavesCount(count || 0);
      
      // Get avatar of first saver
      if (savesData && savesData.length > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', savesData[0].user_id)
          .maybeSingle();
        setFirstSaverAvatar(profile?.avatar_url || null);
      }
    };
    
    // Fetch average rating
    const fetchAverageRating = async () => {
      const { data: ratingsData } = await supabase
        .from('posts')
        .select('rating')
        .eq('location_id', location.id)
        .not('rating', 'is', null)
        .gt('rating', 0);
      
      if (ratingsData && ratingsData.length > 0) {
        const avg = ratingsData.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingsData.length;
        setAverageRating(Math.round(avg * 10) / 10);
      } else {
        setAverageRating(null);
      }
    };
    
    fetchSavesData();
    fetchAverageRating();
  }, [location?.id, isOpen]);

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent 
        className="h-[85vh] flex flex-col z-[10000] bg-background rounded-t-[20px] overflow-hidden" 
        showHandle={false} 
        hideOverlay={false}
      >
        {/* Drag handle area - invisible but functional */}
        <div className="flex-shrink-0 h-6 w-full cursor-grab active:cursor-grabbing" />
        
        {/* Header Section */}
        <div className="flex-shrink-0 px-4 pb-4 bg-background">
          <div className="flex items-start justify-between gap-3">
            {/* Location Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">
                  {location?.name}
                </h2>
                {/* Average rating next to name */}
                {averageRating !== null && (
                  <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                    <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">{averageRating}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                {location?.city}{fullAddress ? `, ${fullAddress.split(',').slice(0, 2).join(', ')}` : ''}
              </p>
              
              {/* Status row: Open hours + saves count with avatar */}
              <div className="flex items-center gap-3 text-sm">
                <span className="text-green-600 font-medium">{t('open', { ns: 'common', defaultValue: 'Aperto' })}</span>
                <span className="text-muted-foreground">09:15 – 17:30</span>
                {savesCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Avatar className="w-5 h-5">
                      {firstSaverAvatar ? (
                        <AvatarImage src={firstSaverAvatar} />
                      ) : null}
                      <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                        {savesCount > 0 ? 'U' : ''}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground">{savesCount} {t('saves', { ns: 'common', defaultValue: 'salvataggi' })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Map Section - No rounded corners, hide Leaflet completely */}
        <div className={`flex-shrink-0 relative overflow-hidden transition-all duration-300 ${isMapMinimized ? 'h-0' : ''}`}>
          {hasValidCoordinates && !isMapMinimized ? (
            <div className="relative">
              {/* Map container - extends beyond edges to hide any borders */}
              <div 
                ref={mapDivRef} 
                className="h-56" 
                style={{ 
                  marginLeft: '-24px', 
                  marginRight: '-24px', 
                  width: 'calc(100% + 48px)',
                }} 
              />
              {/* Full overlay at bottom to completely hide Leaflet attribution */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-background pointer-events-none" />
              {/* Gradient above the solid overlay for smooth transition */}
              <div className="absolute bottom-10 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            </div>
          ) : !isMapMinimized ? (
            <div className="w-full h-56 bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t('coordinatesNotAvailable')}</p>
              </div>
            </div>
          ) : null}
          
          {/* Directions button floating on map */}
          {!isMapMinimized && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDirectionsModalOpen(true)}
              disabled={!hasValidCoordinates}
              className="absolute bottom-12 right-4 gap-1.5 shadow-lg bg-background/95 backdrop-blur-sm z-10"
            >
              <Navigation className="w-4 h-4" />
              {t('directions', { ns: 'common', defaultValue: 'Directions' })}
            </Button>
          )}
          
          {/* Minimize/Expand map button - top right of map */}
          {hasValidCoordinates && !isMapMinimized && (
            <button
              onClick={() => setIsMapMinimized(true)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm shadow-md flex items-center justify-center z-10 hover:bg-background transition-colors"
            >
              <ChevronUp className="w-4 h-4 text-foreground" />
            </button>
          )}
        </div>
        
        {/* Show map button when minimized */}
        {isMapMinimized && hasValidCoordinates && (
          <button
            onClick={() => setIsMapMinimized(false)}
            className="flex-shrink-0 flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border-b border-border"
          >
            <ChevronDown className="w-4 h-4" />
            <span>{t('showMap', { ns: 'common', defaultValue: 'Mostra mappa' })}</span>
          </button>
        )}

        {/* Tabs - Like photo 3 with icons */}
        <div className="flex-shrink-0 border-b border-border">
          <div className="flex">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors relative ${
                activeTab === 'posts'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Post</span>
              {posts.length > 0 && (
                <span className="text-muted-foreground">{posts.length}</span>
              )}
              {activeTab === 'posts' && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors relative ${
                activeTab === 'reviews'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Star className="w-4 h-4" />
              <span>{t('reviewsTab', { ns: 'explore', defaultValue: 'Recensioni' })}</span>
              {activeTab === 'reviews' && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Content - Like photo 3 with avatar overlay and +count badge */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-muted/30">
          {activeTab === 'posts' ? (
            <div className="p-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 px-6 text-muted-foreground">
                  <Camera className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold mb-1">{t('noPostsYet', { ns: 'common', defaultValue: 'No posts yet' })}</p>
                  <p className="text-sm">{t('beFirstToShare', { ns: 'common', defaultValue: 'Be the first to share your experience at this place!' })}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {posts.map((post, idx) => (
                    <div
                      key={post.id}
                      className="relative rounded-xl overflow-hidden bg-muted aspect-square"
                    >
                      <img
                        src={post.media_url}
                        alt={post.caption}
                        className="w-full h-full object-cover"
                      />
                      {/* Avatar overlay - top left */}
                      <div className="absolute top-2 left-2">
                        <Avatar className="w-8 h-8 ring-2 ring-white shadow-md">
                          <AvatarImage src={post.avatar_url} />
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {post.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      {/* +count badge - top right (only on first post if multiple) */}
                      {idx === 0 && posts.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full">
                          +{posts.length - 1}
                        </div>
                      )}
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
                <div className="text-center py-12 px-6 text-muted-foreground">
                  <Star className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold mb-1">{t('noReviewsYet', { ns: 'common', defaultValue: 'No reviews yet' })}</p>
                  <p className="text-sm">{t('beFirstToReview', { ns: 'common', defaultValue: 'Be the first to try this place and leave a review!' })}</p>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="flex gap-3 p-3 bg-background rounded-xl shadow-sm">
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarImage src={review.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {review.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">{review.username}</p>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3 h-3 ${i < review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground/30'}`} 
                              />
                            ))}
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
      </DrawerContent>

      {/* Directions Modal */}
      <Dialog open={directionsModalOpen} onOpenChange={setDirectionsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('getDirections', { ns: 'common', defaultValue: 'Get Directions' })}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              onClick={() => handleDirections('google')}
              className="w-full justify-start h-auto py-3"
            >
              <div className="flex items-center gap-3">
                <Navigation className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Google Maps</div>
                  <div className="text-xs text-muted-foreground">Open in Google Maps</div>
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDirections('apple')}
              className="w-full justify-start h-auto py-3"
            >
              <div className="flex items-center gap-3">
                <Navigation className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Apple Maps</div>
                  <div className="text-xs text-muted-foreground">Open in Apple Maps</div>
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDirections('waze')}
              className="w-full justify-start h-auto py-3"
            >
              <div className="flex items-center gap-3">
                <Navigation className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Waze</div>
                  <div className="text-xs text-muted-foreground">Open in Waze</div>
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Drawer>
  );
};

export default LocationDetailDrawer;
