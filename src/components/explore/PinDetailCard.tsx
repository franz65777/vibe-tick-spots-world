import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Heart, Bookmark, BookmarkCheck, MessageSquare, ChevronLeft, Share2, Star, Bell, BellOff, Camera } from 'lucide-react';
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
import { useMarketingCampaign } from '@/hooks/useMarketingCampaign';
import MarketingCampaignBanner from './MarketingCampaignBanner';
import { formatDistanceToNow, Locale } from 'date-fns';
import { it, es, pt, fr, de, ja, ko, ar, hi, ru, zhCN } from 'date-fns/locale';
import { PostDetailModalMobile } from './PostDetailModalMobile';
import { cn } from '@/lib/utils';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { getRatingColor, getRatingFillColor } from '@/utils/ratingColors';
import { SaveLocationDropdown } from '@/components/common/SaveLocationDropdown';
import { SAVE_TAG_OPTIONS, type SaveTag } from '@/utils/saveTags';
import { toast } from 'sonner';

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
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
  const [isCampaignExpanded, setIsCampaignExpanded] = useState(false);

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

      // If this is a temporary location (from SaveLocationPage), create it first
      if (place.isTemporary) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          toast.error(t('auth_required'));
          setLoading(false);
          return;
        }

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
          setLoading(false);
          return;
        }

        locationId = newLocation.id;
        locationData = {
          ...locationData,
          google_place_id: newLocation.google_place_id,
        };
        
        // Update the place object with real ID
        place.id = newLocation.id;
        place.isTemporary = false;
      }

      await locationInteractionService.saveLocation(locationId, locationData, tag);
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

  return (
    <>
      <Drawer 
        open={!savedByOpen && !isListOpen}
        modal={false}
        dismissible={true}
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
        <DrawerContent data-pin-detail-card="true" className={`transition-all duration-300 h-auto max-h-[30vh] data-[state=open]:max-h-[90vh] ${onBack ? 'z-[10020]' : 'z-[2000]'}`}>
          {/* Draggable Header - Compact and Draggable */}
          <div className="bg-background px-4 pt-3 pb-2 cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-3" />
            <div className="flex items-center gap-3 pb-2">
              {(sourcePostId || onBack) && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onBack) {
                      onBack();
                    } else {
                      navigate(-1); // Torna alla pagina di provenienza (feed, profilo, ecc.)
                    }
                  }}
                  size="icon"
                  variant="ghost"
                  className="shrink-0 h-10 w-10 rounded-full animate-fade-in"
                  aria-label="Torna indietro"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="shrink-0">
                <CategoryIcon category={place.category || 'place'} className="w-10 h-10" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base text-foreground truncate">{locationDetails?.name || place.name}</h3>
                  {/* Pin Count & Rating */}
                  {!statsLoading && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {stats.totalSaves > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSavedByOpen(true);
                          }}
                          className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors"
                        >
                          <Bookmark className="w-3 h-3 fill-primary text-primary" />
                          <span className="text-xs font-semibold text-primary">{stats.totalSaves}</span>
                        </button>
                      )}
                      {stats.averageRating && (
                        <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
                          {(() => {
                            const CategoryIcon = place.category ? getCategoryIcon(place.category) : Star;
                            return <CategoryIcon className={cn("w-3 h-3", getRatingFillColor(stats.averageRating), getRatingColor(stats.averageRating))} />;
                          })()}
                          <span className={cn("text-xs font-semibold", getRatingColor(stats.averageRating))}>{stats.averageRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{detailedAddress}</span>
                </div>
              </div>
              {/* Followed Users */}
              {!engagementLoading && engagement && engagement.followedUsers.length > 0 && (
                <div className="flex items-center -space-x-2 flex-shrink-0">
                  {engagement.followedUsers.slice(0, 2).map((user) => (
                    <Avatar key={user.id} className="w-8 h-8 border-2 border-background">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {user.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {engagement.followedUsers.length > 2 && (
                    <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                      <span className="text-xs font-medium">+{engagement.followedUsers.length - 2}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - Hidden when scrolling down or when dropdown is open */}
          <div 
            className={`relative z-10 bg-background px-4 pb-4 transition-all duration-300 ${
              showActionButtons || dropdownOpen ? 'opacity-100 max-h-32' : 'opacity-0 max-h-0 overflow-hidden pb-0'
            }`}
          >
            {!dropdownOpen ? (
              <div className="flex items-center gap-1.5">
                <div className="grid grid-cols-4 gap-1.5 flex-1">
                  {/* Save Button - with sparkle effect during onboarding */}
                  <div className="relative">
                    {isOnboardingMapStep && !isSaved && !dropdownOpen && (
                      <>
                        {/* Sparkle effects - only when dropdown is closed */}
                        <span className="absolute -top-2 -left-1 text-lg animate-bounce z-20" style={{ animationDelay: '0ms' }}>✨</span>
                        <span className="absolute -top-1 -right-1 text-lg animate-bounce z-20" style={{ animationDelay: '200ms' }}>⭐</span>
                        <span className="absolute -bottom-1 -left-2 text-sm animate-bounce z-20" style={{ animationDelay: '400ms' }}>✨</span>
                        <span className="absolute -bottom-2 right-0 text-sm animate-bounce z-20" style={{ animationDelay: '300ms' }}>🌟</span>
                      </>
                    )}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDropdownOpen(true);
                      }}
                      disabled={loading}
                      variant="secondary"
                      size="sm"
                      className="relative flex-col h-auto py-3 gap-1 rounded-2xl overflow-hidden w-full"
                    >
                      <div className="absolute inset-0 rounded-2xl border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none"></div>
                       {isSaved ? (
                         <span className="text-lg leading-none h-5 w-5 flex items-center justify-center">{SAVE_TAG_OPTIONS.find(opt => opt.value === currentSaveTag)?.emoji || '📍'}</span>
                       ) : (
                         <Bookmark className="h-5 w-5" />
                       )}
                      <span className="text-xs">
                        {isSaved 
                          ? t('saved', { ns: 'profile', defaultValue: 'Saved' })
                          : t('save', { ns: 'common', defaultValue: 'Save' })
                        }
                      </span>
                    </Button>
                  </div>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setReviewOpen(true);
                    }}
                    size="sm"
                    variant="secondary"
                    className="relative flex-col h-auto py-3 gap-1 rounded-2xl overflow-hidden"
                  >
                    <div className="absolute inset-0 rounded-2xl border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none"></div>
                    <Star className="w-5 h-5" />
                    <span className="text-xs">{t('review', { ns: 'common', defaultValue: 'Review' })}</span>
                  </Button>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDirections();
                    }}
                    size="sm"
                    variant="secondary"
                    className="relative flex-col h-auto py-3 gap-1 rounded-2xl overflow-hidden"
                  >
                    <div className="absolute inset-0 rounded-2xl border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none"></div>
                    <Navigation className="w-5 h-5" />
                    <span className="text-xs">{t('directions', { ns: 'common', defaultValue: 'Directions' })}</span>
                  </Button>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareOpen(true);
                    }}
                    size="sm"
                    variant="secondary"
                    className="relative flex-col h-auto py-3 gap-1 rounded-2xl overflow-hidden"
                  >
                    <div className="absolute inset-0 rounded-2xl border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none"></div>
                    <Share2 className="w-5 h-5" />
                    <span className="text-xs">{t('share', { ns: 'common', defaultValue: 'Share' })}</span>
                  </Button>
                </div>

                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    const isMuted = mutedLocations?.some((m: any) => m.location_id === place.id);
                    if (isMuted) {
                      unmuteLocation(place.id);
                    } else {
                      muteLocation(place.id);
                    }
                  }}
                  disabled={isMuting}
                  size="icon"
                  variant="secondary"
                  className={`h-10 w-10 rounded-full flex-shrink-0 ${
                    mutedLocations?.some((m: any) => m.location_id === place.id) ? 'bg-muted text-muted-foreground hover:bg-muted/80' : ''
                  }`}
                >
                  {mutedLocations?.some((m: any) => m.location_id === place.id) ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </Button>
              </div>
            ) : (
              <>
                {/* Invisible click-away layer to close dropdown (no visual overlay) */}
                <div 
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(false);
                  }}
                />
                
                {/* Dropdown positioned absolutely */}
                <div className="absolute left-4 top-0 w-auto z-50">
                  <div className="w-56 bg-muted/10 backdrop-blur-md border border-border/10 rounded-2xl shadow-lg">
                    {isSaved && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnsave();
                        }}
                        className="w-full cursor-pointer flex items-center gap-3 py-2 px-4 hover:bg-accent text-destructive transition-colors min-h-[44px]"
                      >
                        <BookmarkCheck className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm font-medium">{t('unsave', { ns: 'common', defaultValue: 'Unsave' })}</span>
                      </button>
                    )}
                    {SAVE_TAG_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveWithTag(option.value);
                          setDropdownOpen(false);
                        }}
                        className={`w-full cursor-pointer flex items-center gap-3 py-2 px-4 hover:bg-accent transition-colors min-h-[44px] ${
                          option.value === currentSaveTag && isSaved ? 'bg-accent/50' : ''
                        }`}
                      >
                        <span className="text-sm leading-none flex-shrink-0 w-4 flex items-center justify-center">{option.emoji}</span>
                        <span className="text-sm font-medium text-left flex-1">
                          {t(option.value, { ns: 'save_tags', defaultValue: option.value })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Marketing Campaign - Expandable Section */}
          {campaign && (
            <div className="px-4 pb-2">
              <button
                onClick={(e) => { e.stopPropagation(); setIsCampaignExpanded(!isCampaignExpanded); }}
                className="w-full px-3 py-2 flex items-center justify-between bg-background border-2 border-primary/20 hover:border-primary/40 rounded-xl transition-all"
              >
                <span className="text-sm font-medium truncate text-foreground">{campaign.title}</span>
                <svg className={`w-4 h-4 text-primary transition-transform ${isCampaignExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {isCampaignExpanded && (
                <div className="pt-2">
                  <MarketingCampaignBanner campaign={campaign} />
                </div>
              )}
            </div>
          )}

          {/* Featured in Lists Section */}
          {!listsLoading && featuredLists.length > 0 && (
            <div className="px-4 pb-1">
              <div className="inline-flex rounded-xl bg-gradient-to-r from-transparent via-background/20 to-transparent backdrop-blur-md border border-border/5 px-3 py-1.5 w-full">
                <div className="w-full">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    📌 {t('featuredInLists', { ns: 'common', defaultValue: 'Featured in Lists' })}
                  </h4>
                  <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex gap-2">
                      {featuredLists.map((list) => (
                        <button
                          key={list.list_id}
                          onClick={(e) => {
                            e.stopPropagation();
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
                          className="inline-flex items-center gap-2 px-3 py-2 bg-background/40 hover:bg-accent rounded-xl border border-border text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={list.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{list.username.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-foreground">
                            {list.is_own ? list.list_name : `${list.username}'s ${list.list_name}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs and Content */}
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
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto max-h-[calc(90vh-280px)]"
              onScroll={(e) => {
                const currentScrollY = e.currentTarget.scrollTop;
                
                // Show buttons when scrolling up, hide when scrolling down
                if (currentScrollY > lastScrollY && currentScrollY > 50) {
                  // Scrolling down
                  setShowActionButtons(false);
                } else if (currentScrollY < lastScrollY) {
                  // Scrolling up
                  setShowActionButtons(true);
                }
                
                // Show buttons if at the top
                if (currentScrollY < 10) {
                  setShowActionButtons(true);
                }
                
                setLastScrollY(currentScrollY);
              }}
            >
              {activeTab === 'posts' ? (
                <div className="px-4 py-4">
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
                              if (onPostSelected) {
                                onPostSelected(post.id);
                              } else {
                                setSelectedPostId(post.id);
                              }
                            }}
                            className="relative block aspect-square rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="absolute inset-0">
                              <img 
                                src={post.media_urls[0]} 
                                alt="Post image" 
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                              {/* User Avatar Overlay */}
                              <div className="absolute top-2 left-2">
                                <Avatar className="w-8 h-8 border-2 border-white shadow-lg">
                                  <AvatarImage src={post.profiles?.avatar_url} />
                                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                    {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              {/* Multiple images indicator */}
                              {post.media_urls.length > 1 && (
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium">
                                  +{post.media_urls.length - 1}
                                </div>
                              )}
                              {/* Post Caption */}
                              {post.caption && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2.5">
                                  <p className="text-xs text-white line-clamp-2 leading-relaxed">
                                    {post.caption}
                                  </p>
                                </div>
                              )}
                            </div>
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
          onClose={() => setSelectedPostId(null)}
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
          }}
        />
      )}
    </>
  );
};

export default PinDetailCard;
