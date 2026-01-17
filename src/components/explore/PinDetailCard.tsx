import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Bookmark, BookmarkCheck, ChevronLeft, ChevronDown, Share2, Star, Check, Camera, BellOff, Bell, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useMutedLocations } from '@/hooks/useMutedLocations';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { locationInteractionService } from '@/services/locationInteractionService';
import { supabase } from '@/integrations/supabase/client';
import VisitedModal from './VisitedModal';
import { useNormalizedCity } from '@/hooks/useNormalizedCity';
import { LocationShareModal } from './LocationShareModal';
import LocationReviewModal from './LocationReviewModal';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import PostDetailModal from './PostDetailModal';
import { usePinEngagement } from '@/hooks/usePinEngagement';
import { useDetailedAddress } from '@/hooks/useDetailedAddress';
import { useLocationStats } from '@/hooks/useLocationStats';
import SavedByModal from './SavedByModal';
import { useTranslation } from 'react-i18next';
import { useFeaturedInLists } from '@/hooks/useFeaturedInLists';
import TripDetailModal from '../profile/TripDetailModal';
import FolderDetailModal from '../profile/FolderDetailModal';
import { useMarketingCampaign, MarketingCampaign } from '@/hooks/useMarketingCampaign';
import MarketingCampaignBanner from './MarketingCampaignBanner';
import { formatDistanceToNow, Locale } from 'date-fns';
import { it, es, pt, fr, de, ja, ko, ar, hi, ru, zhCN } from 'date-fns/locale';
import { PostDetailModalMobile } from './PostDetailModalMobile';
import { cn } from '@/lib/utils';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { getRatingColor, getRatingFillColor } from '@/utils/ratingColors';
import { SAVE_TAG_OPTIONS, type SaveTag } from '@/utils/saveTags';
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';
import { toast } from 'sonner';
import { useOpeningHours } from '@/hooks/useOpeningHours';
import { useSavedByUsers } from '@/hooks/useSavedByUsers';
import { useLocationPhotos } from '@/hooks/useLocationPhotos';

// Campaign type icons
import trendingIcon from '@/assets/foam-finger.png';
import discountIcon from '@/assets/discount-icon.png';
import eventIcon from '@/assets/event-icon.png';
import promotionIcon from '@/assets/filter-promotion.png';
import newIcon from '@/assets/new-icon.png';

// Get campaign icon based on campaign type
const getCampaignTypeIcon = (campaignType?: string): string => {
  switch (campaignType?.toLowerCase()) {
    case 'discount':
      return discountIcon;
    case 'event':
      return eventIcon;
    case 'promotion':
      return promotionIcon;
    case 'new':
    case 'news':
      return newIcon;
    case 'trending':
    default:
      return trendingIcon;
  }
};

// Helper to check if a string is a valid UUID
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Map tag values to imported icons
const TAG_ICONS: Record<string, string> = {
  been: saveTagBeen,
  to_try: saveTagToTry,
  favourite: saveTagFavourite,
};

const localeMap: Record<string, Locale> = {
  en: undefined as any, // English is the default
  it,
  es,
  pt,
  fr,
  de,
  ja,
  ko,
  ar,
  hi,
  ru,
  'zh-CN': zhCN,
};

// Marquee Text Component for long titles
const MarqueeText = ({ text, className }: { text: string; className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.scrollWidth;
        setShouldAnimate(textWidth > containerWidth);
      }
    };
    
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  if (!shouldAnimate) {
    return (
      <div ref={containerRef} className={cn("overflow-hidden", className)}>
        <span ref={textRef} className="whitespace-nowrap">{text}</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("overflow-hidden", className)}>
      <div className="inline-flex animate-marquee-slow">
        <span ref={textRef} className="whitespace-nowrap pr-8">{text}</span>
        <span className="whitespace-nowrap pr-8">{text}</span>
      </div>
    </div>
  );
};

// Campaign Expanded Details Component with translate button
const CampaignExpandedDetails = ({ campaign }: { campaign: MarketingCampaign }) => {
  const { t, i18n } = useTranslation();
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = async () => {
    if (translatedDescription) {
      setTranslatedDescription(null);
      return;
    }
    setIsTranslating(true);
    
    try {
      const response = await supabase.functions.invoke('translate-text', {
        body: {
          text: campaign.description,
          targetLanguage: i18n.language
        }
      });
      
      if (response.error) {
        console.error('Translation error:', response.error);
        return;
      }
      
      setTranslatedDescription(response.data?.translatedText || campaign.description);
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  // Time remaining calculation
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const end = new Date(campaign.end_date);
      const diffMs = end.getTime() - now.getTime();

      if (diffMs <= 0) {
        return t('marketingCampaign.expired', { ns: 'common', defaultValue: 'Expired' });
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      const daysLabel = t('time.days', { ns: 'common', defaultValue: 'd' });
      const hoursLabel = t('time.hours', { ns: 'common', defaultValue: 'h' });
      const minutesLabel = t('time.minutes', { ns: 'common', defaultValue: 'm' });

      if (days > 0) {
        return `${days}${daysLabel} ${hours}${hoursLabel}`;
      }
      if (hours > 0) {
        return `${hours}${hoursLabel} ${minutes}${minutesLabel}`;
      }
      return `${minutes}${minutesLabel}`;
    };

    const updateTime = () => {
      setTimeLeft(calculateTimeLeft());
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [campaign.end_date, i18n.language, t]);

  return (
    <div className="px-4 pb-4 border-t border-border/30">
      <div className="pt-4">
        {/* Description */}
        <p className="text-foreground text-sm leading-relaxed text-left mb-2">
          {translatedDescription || campaign.description}
        </p>
        
        {/* Translate button */}
        <button
          onClick={handleTranslate}
          disabled={isTranslating}
          className="text-xs text-primary hover:underline mb-3 flex items-center gap-1"
        >
          {isTranslating ? (
            t('translating', { defaultValue: 'Translating...' })
          ) : translatedDescription ? (
            t('showOriginal', { defaultValue: 'Show original' })
          ) : (
            t('translate', { defaultValue: 'Translate' })
          )}
        </button>
        
        {/* Time remaining - fully localized */}
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Calendar className="w-4 h-4" />
          <span>
            {t('marketingCampaign.endsIn', { ns: 'common', defaultValue: 'Ends in' })} {timeLeft}
          </span>
        </div>
      </div>
    </div>
  );
};

interface PinDetailCardProps {
  place: any;
  onClose: () => void;
  onPostSelected?: (postId: string) => void;
  onBack?: () => void;
}

const PinDetailCard = ({ place, onClose, onPostSelected, onBack }: PinDetailCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { mutedLocations, muteLocation, unmuteLocation, isMuting } = useMutedLocations(user?.id);
  const { t, i18n } = useTranslation();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [currentSaveTag, setCurrentSaveTag] = useState<SaveTag>('been');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [showVisitedModal, setShowVisitedModal] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [locationDetails, setLocationDetails] = useState<any>(null);
  const [viewStartTime] = useState<number>(Date.now());
  const [savedByOpen, setSavedByOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reviews'>('posts');
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showActionButtons, setShowActionButtons] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [tripDetailOpen, setTripDetailOpen] = useState(false);
  const [folderDetailOpen, setFolderDetailOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [photoScrollProgress, setPhotoScrollProgress] = useState(0); // 0=fully visible, 1=fully hidden
  const [photoCollapsePx, setPhotoCollapsePx] = useState(120); // how many px of scroll are consumed to fully hide photos (96px photo + padding)
  const [isUserDragging, setIsUserDragging] = useState(false);
  const [isInitialRender, setIsInitialRender] = useState(true); // Track initial render to skip animation
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const photoSectionRef = useRef<HTMLDivElement>(null);
  const drawerContentRef = useRef<HTMLDivElement>(null);
  
  // Touch/drag gesture tracking for swipe to expand/collapse
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const startTranslateY = useRef(0);
  const currentTranslateY = useRef(0);
  const rafRef = useRef<number | null>(null);
  const isDragging = useRef(false);
  
  // Heights for snap points (in vh units converted to px)
  const collapsedHeight = 42; // vh
  const expandedHeight = 85; // vh - leaves space at top for search bar
  
  // Calculate translateY based on expanded state
  const getTargetTranslateY = (expanded: boolean) => {
    const viewportHeight = window.innerHeight;
    const collapsedPx = viewportHeight * (collapsedHeight / 100);
    const expandedPx = viewportHeight * (expandedHeight / 100);
    // translateY = how much to push down from expanded state
    return expanded ? 0 : expandedPx - collapsedPx;
  };
  
  // After first render, enable animations
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setIsInitialRender(false);
    });
    return () => cancelAnimationFrame(timer);
  }, []);


  // Check if onboarding is active on map-guide step
  const [isOnboardingMapStep, setIsOnboardingMapStep] = useState(false);
  
  useEffect(() => {
    const checkOnboardingStep = () => {
      const step = document.body.getAttribute('data-onboarding-step');
      setIsOnboardingMapStep(step === 'map-guide');
    };
    
    checkOnboardingStep();
    
    // Listen for changes
    const observer = new MutationObserver(checkOnboardingStep);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-onboarding-step'] });
    
    return () => observer.disconnect();
  }, []);
  
  // Dispatch custom event when dropdown opens/closes for onboarding to detect
  useEffect(() => {
    if (dropdownOpen) {
      document.body.setAttribute('data-save-dropdown-open', 'true');
      window.dispatchEvent(new CustomEvent('save-dropdown-change', { detail: { open: true } }));
    } else {
      document.body.removeAttribute('data-save-dropdown-open');
      window.dispatchEvent(new CustomEvent('save-dropdown-change', { detail: { open: false } }));
    }
    return () => {
      document.body.removeAttribute('data-save-dropdown-open');
    };
  }, [dropdownOpen]);
  
  // Source post ID - if the pin was opened from a post
  const sourcePostId = place.sourcePostId;
  const { cityLabel } = useNormalizedCity({
    id: place.google_place_id || place.id,
    city: locationDetails?.city || place.city,
    coordinates: place.coordinates,
    address: locationDetails?.address || place.address
  });
  const { detailedAddress } = useDetailedAddress({
    id: place.google_place_id || place.id,
    city: locationDetails?.city || place.city,
    coordinates: place.coordinates,
    address: locationDetails?.address || place.address
  });
  
  // Get the current locale for date formatting
  const currentLocale = localeMap[i18n.language] || localeMap['en'];

  const locationIdForEngagement = locationDetails?.id || place.id || null;
  const googlePlaceIdForEngagement = locationDetails?.google_place_id || place.google_place_id || null;
  const { engagement, loading: engagementLoading } = usePinEngagement(
    locationIdForEngagement,
    googlePlaceIdForEngagement
  );
  const { stats, loading: statsLoading } = useLocationStats(
    locationIdForEngagement,
    googlePlaceIdForEngagement
  );
  const { lists: featuredLists, isLoading: listsLoading } = useFeaturedInLists(
    locationIdForEngagement,
    googlePlaceIdForEngagement
  );
  const { campaign } = useMarketingCampaign(place.id, place.google_place_id);
  const { users: savedByUsers, totalCount: savedByTotalCount, loading: savedByLoading } = useSavedByUsers(
    locationIdForEngagement,
    googlePlaceIdForEngagement,
    4
  );
  const [isCampaignExpanded, setIsCampaignExpanded] = useState(false);

  // Fetch location photos - use pre-loaded photos if available
  const { photos: locationPhotos, loading: photosLoading } = useLocationPhotos({
    locationId: locationIdForEngagement,
    googlePlaceId: googlePlaceIdForEngagement,
    autoFetch: true,
    maxPhotos: 6,
    initialPhotos: place.photos as string[] | undefined
  });


  // Measure the photo row height so the scroll-to-hide always collapses fully
  useEffect(() => {
    if (!isExpanded) return;

    const measure = () => {
      const el = photoSectionRef.current;
      if (!el) return;
      const h = el.scrollHeight;
      if (h && Number.isFinite(h)) {
        setPhotoCollapsePx(Math.max(80, Math.round(h)));
      }
    };

    const raf = requestAnimationFrame(measure);
    const t = window.setTimeout(measure, 250);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [isExpanded, photosLoading, locationPhotos.length, posts.length]);

  // Opening hours
  const { isOpen: rawIsPlaceOpen, todayHours: rawTodayHours, loading: hoursLoading } = useOpeningHours({
    coordinates: place.coordinates,
    placeName: place.name,
    locationId: place.id,
    googlePlaceId: place.google_place_id || undefined,
    cachedOpeningHours: place.opening_hours_data
  });
  
  // For hotels and parks without opening hours data, assume 24/7
  const isHotel = place.category?.toLowerCase() === 'hotel' || 
                  place.types?.some((t: string) => t.toLowerCase().includes('lodging') || t.toLowerCase().includes('hotel'));
  const isPark = place.category?.toLowerCase() === 'park' || 
                 place.types?.some((t: string) => t.toLowerCase().includes('park'));
  const assumeOpen24h = isHotel || isPark;
  const isPlaceOpen = (rawIsPlaceOpen === null && assumeOpen24h) ? true : rawIsPlaceOpen;
  const rawTodayHoursValue = (rawTodayHours === null && assumeOpen24h && rawIsPlaceOpen === null) ? '24h' : rawTodayHours;
  
  // Format hours for locale (convert 12h to 24h for non-English)
  const formatHoursForLocale = (hours: string | null): string | null => {
    if (!hours) return null;
    
    // Handle 24h indicator
    const lower = hours.toLowerCase().trim();
    if (lower.includes('24 hours') || lower.includes('24h') || lower === '00:00 – 24:00') {
      return '24h';
    }
    
    const lang = (i18n.language || 'en').toLowerCase();
    const uses12HourClock = lang.startsWith('en');
    
    if (uses12HourClock) return hours;
    
    // Convert 12h to 24h for non-English locales
    let result = hours.replace(
      /(\d{1,2}(?::\d{2})?)\s*[–-]\s*(\d{1,2}(?::\d{2})?)\s*(AM|PM)\b/gi,
      (_m, start, end, period) => {
        const hasPeriodInStart = /(am|pm)/i.test(String(start));
        const startWithPeriod = hasPeriodInStart ? String(start) : `${String(start)} ${String(period)}`;
        return `${startWithPeriod} – ${String(end)} ${String(period)}`;
      }
    );
    
    result = result.replace(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/gi, (_match, h, m, period) => {
      let hour = parseInt(h, 10);
      const minutes = m || '00';
      const upper = (period as string).toUpperCase();
      if (upper === 'PM' && hour < 12) hour += 12;
      if (upper === 'AM' && hour === 12) hour = 0;
      return `${hour.toString().padStart(2, '0')}:${minutes}`;
    });
    
    return result;
  };
  
  const todayHours = formatHoursForLocale(rawTodayHoursValue);

  const fetchPosts = async (page: number = 1) => {
    setPostsLoading(true);
    try {
      // First, try to find location by google_place_id
      let locationId = place.id;
      
      if (!locationId && place.google_place_id) {
        const { data: locationData } = await supabase
          .from('locations')
          .select('id, city, address, name')
          .eq('google_place_id', place.google_place_id)
          .maybeSingle();
        
        if (locationData) {
          locationId = locationData.id;
          setLocationDetails(locationData);
        }
      }
      
      if (locationId) {
        const limit = 1000; // Load all posts at once
        const offset = (page - 1) * limit;
        
        // Filter for posts with media only (not reviews)
        const { data: postRows, error } = await supabase
          .from('posts')
          .select('id, user_id, caption, media_urls, created_at, location_id, rating')
          .eq('location_id', locationId)
          .not('media_urls', 'is', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        
        if (postRows) {
          const userIds = Array.from(new Set(postRows.map(p => p.user_id).filter(Boolean)));
          let profilesMap = new Map<string, { username: string | null; avatar_url: string | null }>();
          if (userIds.length) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', userIds);
            profilesMap = new Map((profilesData || []).map((p: any) => [p.id, { username: p.username, avatar_url: p.avatar_url }]));
          }
          let mapped = postRows.map((p: any) => ({
            ...p,
            profiles: profilesMap.get(p.user_id) || null,
          }));
          
          // Filter to ensure only posts with valid media_urls are shown
          mapped = mapped.filter((p: any) => 
            p.media_urls && 
            Array.isArray(p.media_urls) && 
            p.media_urls.length > 0 &&
            p.media_urls[0] // Ensure first element exists and is not empty
          );
          if (page === 1) {
            setPosts(mapped);
          } else {
            setPosts(prev => [...prev, ...mapped]);
          }
          setHasMorePosts(postRows.length === limit);
        }
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const loadMorePosts = () => {
    const nextPage = postsPage + 1;
    setPostsPage(nextPage);
    fetchPosts(nextPage);
  };

  useEffect(() => {
    const checkInteractions = async () => {
      if (place.id) {
        const [liked, saved] = await Promise.all([
          locationInteractionService.isLocationLiked(place.id),
          locationInteractionService.isLocationSaved(place.id)
        ]);
        
        setIsLiked(liked);
        setIsSaved(saved);

      if (saved) {
        const tag = await locationInteractionService.getCurrentSaveTag(
          place.google_place_id || place.id
        );
        setCurrentSaveTag(tag as SaveTag);
      } else {
        setCurrentSaveTag('been');
      }
      }
    };

    // Reset state when place changes
    setLocationDetails(null);
    setPosts([]);
    setReviews([]);
    setPostsPage(1);
    setHasMorePosts(true);
    setIsExpanded(false); // Reset to collapsed state
    setPhotoScrollProgress(0); // Reset photo scroll progress
    
    checkInteractions();
    fetchPosts();
    fetchReviews();
  }, [place.id, place.google_place_id, place.name, user]);

  useEffect(() => {
    const fetchLocationById = async () => {
      try {
        if (place.id && !locationDetails?.google_place_id) {
          const { data } = await supabase
            .from('locations')
            .select('id, city, address, name, google_place_id')
            .eq('id', place.id)
            .maybeSingle();
          if (data) setLocationDetails((prev: any) => ({ ...(prev || {}), ...data }));
        }
      } catch (e) {
        console.warn('Failed to fetch location details by id', e);
      }
    };
    fetchLocationById();
  }, [place.id]);

  // Track view duration when component unmounts or closes
  useEffect(() => {
    return () => {
      const trackViewDuration = async () => {
        try {
          const durationSeconds = Math.round((Date.now() - viewStartTime) / 1000);
          
          // Only track if viewed for at least 1 second
          if (durationSeconds < 1) return;

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          await supabase.from('location_view_duration').insert({
            user_id: user.id,
            location_id: place.id || locationDetails?.id || null,
            google_place_id: place.google_place_id || locationDetails?.google_place_id || null,
            duration_seconds: durationSeconds,
            viewed_at: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error tracking view duration:', error);
        }
      };

      trackViewDuration();
    };
  }, [viewStartTime, place.id, place.google_place_id, locationDetails]);

  const handleSaveWithTag = async (tag: SaveTag) => {
    setLoading(true);
    try {
      let locationId = place.id;
      let locationData = {
        google_place_id: place.google_place_id,
        name: place.name,
        address: place.address,
        latitude: place.coordinates?.lat || 0,
        longitude: place.coordinates?.lng || 0,
        category: place.category,
        types: place.types || []
      };

      // Check if this is a temporary/external location that needs to be created first
      // This includes isTemporary flag OR external IDs (photon-, nominatim-, overpass-, ChIJ, etc.)
      const needsCreation = place.isTemporary || 
        (typeof place.id === 'string' && (
          place.id.startsWith('photon-') ||
          place.id.startsWith('nominatim-') ||
          place.id.startsWith('overpass-') ||
          place.id.startsWith('ChIJ') ||
          !isValidUUID(place.id)
        ));

      if (needsCreation) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          toast.error(t('auth_required'));
          return;
        }

        // First check if location already exists by coordinates
        const { data: existingLocation } = await supabase
          .from('locations')
          .select('id')
          .eq('name', place.name)
          .gte('latitude', (place.coordinates?.lat || 0) - 0.0001)
          .lte('latitude', (place.coordinates?.lat || 0) + 0.0001)
          .gte('longitude', (place.coordinates?.lng || 0) - 0.0001)
          .lte('longitude', (place.coordinates?.lng || 0) + 0.0001)
          .maybeSingle();

        if (existingLocation) {
          locationId = existingLocation.id;
        } else {
          const { data: newLocation, error: createError } = await supabase
            .from('locations')
            .insert({
              name: place.name,
              address: place.address,
              latitude: place.coordinates?.lat,
              longitude: place.coordinates?.lng,
              category: place.category || 'restaurant',
              city: place.city,
              created_by: currentUser.id,
              pioneer_user_id: currentUser.id,
            })
            .select()
            .single();

          if (createError || !newLocation) {
            console.error('Error creating location:', createError);
            toast.error(t('save_failed'));
            return;
          }

          locationId = newLocation.id;
          locationData = {
            ...locationData,
            google_place_id: newLocation.google_place_id,
          };
          
          // Update the place object with real ID
          place.id = newLocation.id;
        }
        place.isTemporary = false;
      }

      const ok = await locationInteractionService.saveLocation(locationId, locationData, tag);
      if (!ok) {
        toast.error(t('save_failed'));
        return;
      }

      setIsSaved(true);
      setCurrentSaveTag(tag);
      toast.success(t('locationSaved'));
      
      // Dispatch global event to sync other components (map, lists, etc.)
      window.dispatchEvent(new CustomEvent('location-save-changed', {
        detail: { locationId: locationId, isSaved: true, saveTag: tag }
      }));
      if (place.google_place_id) {
        window.dispatchEvent(new CustomEvent('location-save-changed', {
          detail: { locationId: place.google_place_id, isSaved: true, saveTag: tag }
        }));
      }
    } catch (error) {
      toast.error(t('save_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async () => {
    setLoading(true);
    try {
      await locationInteractionService.unsaveLocation(place.id);
      setIsSaved(false);
      setCurrentSaveTag('been');
      toast.success(t('locationRemoved'));
      
      // Dispatch global event to sync
      window.dispatchEvent(new CustomEvent('location-save-changed', {
        detail: { locationId: place.id, isSaved: false }
      }));
      if (place.google_place_id) {
        window.dispatchEvent(new CustomEvent('location-save-changed', {
          detail: { locationId: place.google_place_id, isSaved: false }
        }));
      }
    } catch (error) {
      toast.error(t('unsave_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDirections = () => {
    // Detect device and use appropriate maps app
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const coords = `${place.coordinates.lat},${place.coordinates.lng}`;
    
    const url = isIOS 
      ? `maps://maps.apple.com/?daddr=${coords}`
      : `https://www.google.com/maps/dir/?api=1&destination=${coords}`;
    
    window.open(url, '_blank');
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const locationId = locationDetails?.id || place.id;
      
      // Fetch reviews from posts table
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

      const formattedReviews = postsData
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

  // Format category for display
  const formatCategory = (category: string) => {
    if (!category) return '';
    return category
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <>
      <Drawer 
        open={!savedByOpen && !isListOpen}
        modal={false}
        dismissible={false}
        noBodyStyles
        onOpenChange={(open) => { 
          if (!open && !shareOpen && !reviewOpen) {
            if (onBack) {
              onBack();
            } else {
              onClose(); 
            }
          }
        }}
      >
        
        <DrawerContent 
          ref={drawerContentRef}
          data-pin-detail-card="true" 
          showHandle={false}
          hideOverlay={true}
          disableDefaultTransition={true}
          className={cn(
            "rounded-t-3xl bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md border-t border-border/10",
            onBack ? "z-[10020]" : "z-[2000]",
            dropdownOpen ? "overflow-visible" : "overflow-hidden",
            "!transition-none [&[data-state]]:!transition-none"
          )}
          style={{
            height: `${expandedHeight}vh`,
            transform: isUserDragging 
              ? `translateY(${currentTranslateY.current}px)` 
              : `translateY(${getTargetTranslateY(isExpanded)}px)`,
            transition: (isUserDragging || isInitialRender) ? 'none' : 'transform 0.55s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          {/* Compact Draggable Header - No grey bar, still draggable */}
          <div 
            className="px-4 pt-4 pb-2 cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              // Allow clicks on interactive elements inside the header (save button, avatars, back button, etc.)
              const targetEl = e.target as HTMLElement | null;
              const isInteractive = !!targetEl?.closest(
                'button, a, input, textarea, select, [role="button"], [data-no-drag="true"]'
              );
              if (isInteractive) return;

              e.stopPropagation();
              const target = e.currentTarget as HTMLElement;
              target.setPointerCapture(e.pointerId);

              touchStartY.current = e.clientY;
              touchStartTime.current = Date.now();
              startTranslateY.current = getTargetTranslateY(isExpanded);
              currentTranslateY.current = startTranslateY.current;
              isDragging.current = true;
              setIsUserDragging(true);
            }}
            onPointerMove={(e) => {
              if (!isDragging.current || touchStartY.current === null) return;
              e.stopPropagation();
              e.preventDefault();

              const deltaY = e.clientY - touchStartY.current; // + = swipe down, - = swipe up
              const maxTranslate = getTargetTranslateY(false); // collapsed position
              const minTranslate = 0; // expanded position
              
              // Add rubberband effect at edges
              let nextTranslate = startTranslateY.current + deltaY;
              if (nextTranslate < minTranslate) {
                // Rubberband when pulling past expanded
                nextTranslate = minTranslate + (nextTranslate - minTranslate) * 0.3;
              } else if (nextTranslate > maxTranslate + 100) {
                // Rubberband when pulling past collapsed (dismiss zone)
                nextTranslate = maxTranslate + 100 + (nextTranslate - maxTranslate - 100) * 0.2;
              }
              
              currentTranslateY.current = nextTranslate;

              if (rafRef.current) cancelAnimationFrame(rafRef.current);
              rafRef.current = requestAnimationFrame(() => {
                if (drawerContentRef.current) {
                  drawerContentRef.current.style.transform = `translateY(${nextTranslate}px)`;
                }
              });
            }}
            onPointerUp={(e) => {
              if (touchStartY.current === null || !isDragging.current) return;
              e.stopPropagation();

              const target = e.currentTarget as HTMLElement;
              target.releasePointerCapture(e.pointerId);

              const deltaY = e.clientY - touchStartY.current;
              const deltaTime = Math.max(Date.now() - touchStartTime.current, 1);
              const velocity = deltaY / deltaTime; // signed (px/ms), + = down, - = up

              const maxTranslate = getTargetTranslateY(false);
              const midPoint = maxTranslate / 2;
              
              // Velocity thresholds for quick flicks
              const flickUp = velocity < -0.3;
              const flickDown = velocity > 0.3;

              // Decide final snap based on position and velocity
              let nextExpanded: boolean;
              if (flickUp) {
                nextExpanded = true;
              } else if (flickDown) {
                nextExpanded = false;
              } else {
                // Use position threshold
                nextExpanded = currentTranslateY.current < midPoint;
              }

              // Check for dismiss: if collapsed and swiped down strongly
              const shouldClose = !isExpanded && !nextExpanded && 
                (currentTranslateY.current > maxTranslate + 50 || velocity > 0.5);
              
              if (shouldClose) {
                // Animate out before closing
                if (drawerContentRef.current) {
                  drawerContentRef.current.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
                  drawerContentRef.current.style.transform = `translateY(100vh)`;
                }
                setTimeout(() => {
                  if (onBack) onBack();
                  else onClose();
                }, 250);
              } else {
                setIsExpanded(nextExpanded);
              }

              touchStartY.current = null;
              isDragging.current = false;
              setIsUserDragging(false);
              if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
              }
            }}
            onPointerCancel={(e) => {
              const target = e.currentTarget as HTMLElement;
              target.releasePointerCapture(e.pointerId);
              touchStartY.current = null;
              isDragging.current = false;
              setIsUserDragging(false);
              if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
              }
            }}
          >
            {/* Header Row */}
            <div className="flex items-start justify-between gap-3">
              {/* Left side: Back button + Name/Address */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {(sourcePostId || onBack) && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onBack) {
                        onBack();
                      } else {
                        navigate(-1);
                      }
                    }}
                    size="icon"
                    variant="ghost"
                    className="shrink-0 h-10 w-10 rounded-full animate-fade-in mt-0.5"
                    aria-label="Back"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                )}
                <div className="flex-1 min-w-0">
                  {/* Place Name + Rating */}
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xl text-foreground truncate leading-tight">
                      {locationDetails?.name || place.name}
                    </h3>
                    {/* Rating */}
                    {!statsLoading && stats.averageRating && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium">{stats.averageRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  {/* Address */}
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {detailedAddress}
                  </p>
                </div>
              </div>

              {/* Right side: Save button with tag icon */}
              <div className="flex items-start flex-shrink-0 relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Always open dropdown to select save type
                    setDropdownOpen(!dropdownOpen);
                  }}
                  disabled={loading}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    isSaved
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-accent"
                  )}
                >
                  {isSaved ? (
                    <img 
                      src={TAG_ICONS[currentSaveTag] || TAG_ICONS.been} 
                      alt={currentSaveTag}
                      className="w-6 h-6 object-contain"
                    />
                  ) : (
                    <Bookmark className="w-5 h-5" />
                  )}
                </button>
                {/* Dropdown for selecting/changing save tag */}
                {dropdownOpen && (
                  <>
                    {/* Backdrop to close dropdown when clicking outside */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropdownOpen(false);
                      }}
                    />
                    <div className="absolute right-0 top-12 bg-background border border-border rounded-xl shadow-lg p-2 z-50 min-w-[180px]">
                      {SAVE_TAG_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSaved && currentSaveTag === option.value) {
                              handleUnsave();
                            } else {
                              handleSaveWithTag(option.value as SaveTag);
                            }
                            setDropdownOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-accent transition-colors",
                            isSaved && currentSaveTag === option.value && "bg-accent"
                          )}
                        >
                          <img 
                            src={TAG_ICONS[option.value]} 
                            alt={option.value}
                            className="w-6 h-6 object-contain"
                          />
                          <span className="text-sm font-medium">{t(option.value, { ns: 'save_tags' })}</span>
                          {isSaved && currentSaveTag === option.value && (
                            <span className="ml-auto text-xs text-muted-foreground">{t('tap_to_remove', { ns: 'common', defaultValue: 'tap to remove' })}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Open/Closed Status + Saved By - aligned left, below header */}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {!hoursLoading && isPlaceOpen !== null && (
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-semibold",
                    isPlaceOpen ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
                  )}>
                    {isPlaceOpen ? t('openingHours.open') : t('openingHours.closed')}
                  </span>
                  {todayHours && (
                    <span className="text-sm text-muted-foreground">{todayHours}</span>
                  )}
                </div>
              )}
              {/* Saved By Users Avatars - Same row as opening hours */}
              {!savedByLoading && savedByUsers.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSavedByOpen(true);
                  }}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="flex -space-x-2">
                    {savedByUsers.slice(0, 2).map((savedUser) => (
                      <Avatar key={savedUser.id} className="w-6 h-6 border-2 border-background">
                        <AvatarImage src={savedUser.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                          {savedUser.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {savedByTotalCount} {t('saves', { ns: 'common', defaultValue: 'saves' })}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons - Above photos, horizontal scroll */}
          <div className="px-4 pt-2 pb-1">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
              {/* Share */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShareOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-sm hover:bg-accent transition-colors flex-shrink-0"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {t('share', { ns: 'common', defaultValue: 'Share' })}
                </span>
              </button>

              {/* Directions */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDirections();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-sm hover:bg-accent transition-colors flex-shrink-0"
              >
                <Navigation className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {t('directions', { ns: 'explore', defaultValue: 'Directions' })}
                </span>
              </button>

              {/* Review/Rate */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setReviewOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-sm hover:bg-accent transition-colors flex-shrink-0"
              >
                <Star className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {t('review', { ns: 'explore', defaultValue: 'Rate' })}
                </span>
              </button>

              {/* Mute */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const locationId = locationIdForEngagement;
                  if (!locationId) return;
                  const isMuted = mutedLocations?.some((m: any) => m.location_id === locationId);
                  if (isMuted) {
                    unmuteLocation(locationId);
                  } else {
                    muteLocation(locationId);
                  }
                }}
                disabled={isMuting}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-sm hover:bg-accent transition-colors flex-shrink-0",
                  mutedLocations?.some((m: any) => m.location_id === locationIdForEngagement) && "text-primary border-primary/50"
                )}
              >
                {mutedLocations?.some((m: any) => m.location_id === locationIdForEngagement) ? (
                  <>
                    <BellOff className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {t('unmute', { ns: 'common', defaultValue: 'Unmute' })}
                    </span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {t('mute', { ns: 'common', defaultValue: 'Mute' })}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Photo Gallery - Scroll-based collapse when expanded */}
          {(locationPhotos.length > 0 || posts.length > 0 || photosLoading) && (
          <div 
            ref={photoSectionRef}
            className={cn(
              "px-4 transition-[max-height,opacity,padding] duration-200 ease-out",
              !isExpanded && "pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))]",
              isExpanded && photoScrollProgress < 1 && "pt-1 pb-1",
              isExpanded && photoScrollProgress >= 1 && "pt-0 pb-0"
            )}
            style={isExpanded ? {
              maxHeight: photoScrollProgress >= 1 ? '0px' : 'none',
              opacity: Math.max(0, 1 - photoScrollProgress),
              overflow: photoScrollProgress >= 1 ? 'hidden' : 'visible',
              pointerEvents: photoScrollProgress > 0.95 ? 'none' : 'auto',
            } : undefined}
          >
            {photosLoading ? (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-[140px] h-[105px] bg-muted rounded-xl animate-pulse flex-shrink-0" />
                ))}
              </div>
            ) : locationPhotos.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
                {locationPhotos.map((photo, index) => (
                  <div
                    key={index}
                    className={cn(
                      "rounded-xl flex-shrink-0 bg-muted transition-all duration-300",
                      isExpanded ? "w-[140px] h-[105px]" : "w-32 h-36"
                    )}
                  >
                    <img
                      src={photo}
                      alt={`${place.name} photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            ) : posts.length > 0 ? (
              // Fallback to user posts if no Google photos
              <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
                {posts.slice(0, 6).map((post, index) => (
                  <button
                    key={post.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onPostSelected) {
                        onPostSelected(post.id);
                      } else {
                        setSelectedPostId(post.id);
                      }
                    }}
                    className={cn(
                      "rounded-xl overflow-hidden flex-shrink-0 bg-muted transition-all duration-300",
                      isExpanded ? "w-[104px] h-24" : "w-32 h-36"
                    )}
                  >
                    <img
                      src={post.media_urls[0]}
                      alt={`Post ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          )}


          {/* Expanded Content - Only visible when drawer is expanded */}
          {isExpanded && (
            <>
              {/* Marketing Campaign - Expandable Section */}
              {campaign && (
                <div 
                  className="px-4 pb-1 transition-[max-height,opacity] duration-200 ease-out"
                  style={{
                    maxHeight: photoScrollProgress >= 1 ? '0px' : 'none',
                    opacity: Math.max(0, 1 - photoScrollProgress),
                    overflow: photoScrollProgress >= 1 ? 'hidden' : 'visible',
                    pointerEvents: photoScrollProgress > 0.95 ? 'none' : 'auto',
                  }}
                >
                  <div className="rounded-2xl bg-muted/40 border border-border/30 overflow-hidden">
                    {/* Campaign Toggle Header */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsCampaignExpanded(!isCampaignExpanded); }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                        <img 
                          src={getCampaignTypeIcon(campaign.campaign_type)} 
                          alt="" 
                          className="w-6 h-6 object-contain flex-shrink-0" 
                        />
                        <MarqueeText 
                          text={campaign.title}
                          className="flex-1 text-sm font-semibold text-foreground"
                        />
                      </div>
                      <ChevronDown className={`w-5 h-5 text-primary flex-shrink-0 transition-transform duration-200 ${isCampaignExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Expanded Campaign Details - Full details shown directly */}
                    {isCampaignExpanded && (
                      <CampaignExpandedDetails campaign={campaign} />
                    )}
                  </div>
                </div>
              )}

              {/* Featured Lists Section */}
                {!listsLoading && featuredLists.length > 0 && (
                <div 
                  className={cn(
                    "px-4 py-2 transition-[max-height,opacity] duration-200 ease-out",
                    (locationPhotos.length > 0 || campaign) && "border-t border-border/30"
                  )}
                  style={{
                    maxHeight: photoScrollProgress >= 1 ? '0px' : 'none',
                    opacity: Math.max(0, 1 - photoScrollProgress),
                    overflow: photoScrollProgress >= 1 ? 'hidden' : 'visible',
                    pointerEvents: photoScrollProgress > 0.95 ? 'none' : 'auto',
                  }}
                >
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {t('featuredInLists', { ns: 'common', defaultValue: 'Saved in' })}
                  </p>
                  <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                    <div className="flex gap-2 items-center">
                      {featuredLists.map((list) => (
                        <button
                          key={list.list_id}
                          onClick={(e) => {
                            e.stopPropagation();
                            document.body.setAttribute('data-modal-open', 'true');
                            if (list.type === 'folder') {
                              setSelectedFolderId(list.list_id);
                              setFolderDetailOpen(true);
                              setIsListOpen(true);
                            } else {
                              setSelectedTripId(list.list_id);
                              setTripDetailOpen(true);
                              setIsListOpen(true);
                            }
                          }}
                          className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-muted/40 hover:bg-muted border border-border/50 transition-all whitespace-nowrap flex-shrink-0"
                        >
                          <Avatar className="h-6 w-6 ring-2 ring-background">
                            <AvatarImage src={list.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{list.username.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground">
                            {list.list_name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs and Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Tab Navigation - Minimal underline design */}
                <div className="flex-shrink-0 border-b border-border/50">
                  <div className="flex">
                    <button
                      onClick={() => setActiveTab('posts')}
                      className={cn(
                        "flex-1 py-3 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 relative",
                        activeTab === 'posts'
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Camera className="w-4 h-4" />
                      {t('postsTab', { ns: 'explore', defaultValue: 'Post' })}
                      {posts.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {posts.length}
                        </span>
                      )}
                      {activeTab === 'posts' && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-foreground rounded-full" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('reviews')}
                      className={cn(
                        "flex-1 py-3 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 relative",
                        activeTab === 'reviews'
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Star className="w-4 h-4" />
                      {t('reviewsTab', { ns: 'explore', defaultValue: 'Reviews' })}
                      {reviews.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {reviews.length}
                        </span>
                      )}
                      {activeTab === 'reviews' && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-foreground rounded-full" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div 
                  ref={scrollContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto"
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    const y = el.scrollTop;

                    // First consume scroll to hide photos; only then allow the list to scroll.
                    if (y > 0 && photoScrollProgress < 1) {
                      const consumedPx = y + photoScrollProgress * photoCollapsePx;
                      const next = Math.min(1, consumedPx / photoCollapsePx);
                      setPhotoScrollProgress(next);
                      el.scrollTop = 0;
                      setLastScrollY(0);
                      setShowActionButtons(true);
                      return;
                    }

                    // Normal scrolling once photos are fully hidden
                    if (y > lastScrollY && y > 50) {
                      setShowActionButtons(false);
                    } else if (y < lastScrollY) {
                      setShowActionButtons(true);
                    }

                    if (y < 10) {
                      setShowActionButtons(true);
                    }

                    setLastScrollY(y);
                  }}
                  onWheel={(e) => {
                    // Desktop: when at top and scrolling up, restore photos
                    const el = scrollContainerRef.current;
                    if (el && el.scrollTop === 0 && photoScrollProgress > 0 && e.deltaY < 0) {
                      const restorePx = Math.abs(e.deltaY);
                      const next = Math.max(0, photoScrollProgress - restorePx / photoCollapsePx);
                      setPhotoScrollProgress(next);
                      e.preventDefault();
                    }
                  }}
                  onTouchStart={(e) => {
                    // Track touch start for restoring photos when pulling down at top
                    const el = scrollContainerRef.current;
                    if (el && el.scrollTop === 0) {
                      touchStartY.current = e.touches[0].clientY;
                    }
                  }}
                  onTouchMove={(e) => {
                    // If user is pulling down while at top of list and photos are hidden, restore them
                    const el = scrollContainerRef.current;
                    if (el && el.scrollTop === 0 && photoScrollProgress > 0 && touchStartY.current !== null) {
                      const deltaY = e.touches[0].clientY - touchStartY.current;
                      if (deltaY > 0) {
                        // Pulling down - restore photos proportionally
                        const restorePx = deltaY;
                        const next = Math.max(0, photoScrollProgress - restorePx / photoCollapsePx);
                        setPhotoScrollProgress(next);
                        e.preventDefault(); // Prevent overscroll bounce
                      }
                    }
                  }}
                  onTouchEnd={() => {
                    touchStartY.current = null;
                  }}
                >
                  {activeTab === 'posts' ? (
                    <div className="px-4 pt-1.5 pb-4">
                      {postsLoading && posts.length === 0 ? (
                        <div className="flex justify-center py-8">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : posts.length === 0 ? (
                        <div className="py-8 text-center">
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                            <Camera className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t('noPosts', { ns: 'explore', defaultValue: 'No posts yet' })}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-3 w-full auto-rows-[1fr]">
                            {posts.map((post) => (
                              <button
                                key={post.id} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  document.body.setAttribute('data-modal-open', 'true');
                                  if (onPostSelected) {
                                    onPostSelected(post.id);
                                  } else {
                                    setSelectedPostId(post.id);
                                  }
                                }}
                                className="relative block aspect-square rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow will-change-transform"
                              >
                                <img 
                                  src={post.media_urls[0]} 
                                  alt="Post image" 
                                  className="absolute inset-0 w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                                {/* User Avatar Overlay */}
                                <div className="absolute top-2 left-2 pointer-events-none">
                                  <Avatar className="w-8 h-8 border-2 border-white shadow-lg">
                                    <AvatarImage src={post.profiles?.avatar_url} />
                                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                      {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                                {/* Multiple images indicator */}
                                {post.media_urls.length > 1 && (
                                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium pointer-events-none">
                                    +{post.media_urls.length - 1}
                                  </div>
                                )}
                                {/* Post Caption */}
                                {post.caption && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 pointer-events-none">
                                    <p className="text-xs text-white line-clamp-2 leading-relaxed">
                                      {post.caption}
                                    </p>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="px-4 py-4">
                      {reviewsLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : reviews.length === 0 ? (
                        <div className="py-8 text-center">
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                            <Star className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t('noReviewsYet', { ns: 'common', defaultValue: 'No reviews yet' })}
                          </p>
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
                                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: currentLocale })}
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
            </>
          )}
        </DrawerContent>
      </Drawer>

      {showVisitedModal && (
        <VisitedModal
          place={place}
          onClose={() => setShowVisitedModal(false)}
        />
      )}

      <LocationShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        place={place}
      />

      <LocationReviewModal
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        location={{
          id: place.id,
          name: place.name,
          google_place_id: place.google_place_id
        }}
      />

      {!onPostSelected && selectedPostId && (
        <PostDetailModalMobile
          postId={selectedPostId}
          locationId={place.id}
          isOpen={true}
          onClose={() => {
            setSelectedPostId(null);
            document.body.removeAttribute('data-modal-open');
          }}
        />
      )}

      <SavedByModal
        isOpen={savedByOpen}
        onClose={() => setSavedByOpen(false)}
        placeId={place.id || locationDetails?.id}
        googlePlaceId={place.google_place_id || locationDetails?.google_place_id}
      />

      {selectedTripId && tripDetailOpen && (
        <TripDetailModal
          tripId={selectedTripId}
          isOpen={tripDetailOpen}
          onClose={() => {
            setSelectedTripId(null);
            setTripDetailOpen(false);
            setIsListOpen(false);
            document.body.removeAttribute('data-modal-open');
          }}
        />
      )}

      {selectedFolderId && folderDetailOpen && (
        <FolderDetailModal
          folderId={selectedFolderId}
          isOpen={folderDetailOpen}
          onClose={() => {
            setSelectedFolderId(null);
            setFolderDetailOpen(false);
            setIsListOpen(false);
            document.body.removeAttribute('data-modal-open');
          }}
          onLocationClick={(locationData) => {
            // Close the folder modal and navigate to home with the selected location
            setSelectedFolderId(null);
            setFolderDetailOpen(false);
            setIsListOpen(false);
            // Close PinDetailCard too
            onClose();
            // Navigate to home with the location data so the map updates
            navigate('/', {
              state: {
                selectedLocation: locationData,
                returnTo: window.location.pathname
              }
            });
          }}
        />
      )}
    </>
  );
};

export default PinDetailCard;
