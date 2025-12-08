import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Bookmark, BookmarkCheck, Share2, Star, Bell, BellOff, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { locationInteractionService } from '@/services/locationInteractionService';
import { LocationShareModal } from './LocationShareModal';
import { PostDetailModalMobile } from './PostDetailModalMobile';
import LocationReviewModal from './LocationReviewModal';
import { toast } from 'sonner';
import SavedByModal from './SavedByModal';
import { useDetailedAddress } from '@/hooks/useDetailedAddress';
import { useLocationStats } from '@/hooks/useLocationStats';
import { useMutedLocations } from '@/hooks/useMutedLocations';
import { useMarketingCampaign } from '@/hooks/useMarketingCampaign';
import MarketingCampaignBanner from './MarketingCampaignBanner';
import { usePinEngagement } from '@/hooks/usePinEngagement';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, Locale } from 'date-fns';
import { it, es, pt, fr, de, ja, ko, ar, hi, ru, zhCN } from 'date-fns/locale';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { getRatingColor, getRatingFillColor } from '@/utils/ratingColors';
import { cn } from '@/lib/utils';
import { SAVE_TAG_OPTIONS, type SaveTag } from '@/utils/saveTags';

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

interface LocationPost {
  id: string;
  user_id: string;
  caption: string | null;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  saves_count: number;
  created_at: string;
  metadata: any;
  rating?: number;
  profiles?: {
    username: string;
    avatar_url: string;
  } | null;
}

interface LocationPostLibraryProps {
  place: {
    id: string;
    name: string;
    category?: string;
    address?: string;
    city?: string;
    google_place_id?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    postCount?: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

const LocationPostLibrary = ({ place, isOpen, onClose }: LocationPostLibraryProps) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { mutedLocations, muteLocation, unmuteLocation, isMuting } = useMutedLocations(user?.id);
  const [posts, setPosts] = useState<LocationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [currentSaveTag, setCurrentSaveTag] = useState<SaveTag>('general');
  const [showSavedBy, setShowSavedBy] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reviews'>('posts');
  const [showActionButtons, setShowActionButtons] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { detailedAddress } = useDetailedAddress({
    id: place?.google_place_id || place?.id,
    city: place?.city,
    coordinates: place?.coordinates,
    address: place?.address
  });
  
  const { stats, loading: statsLoading } = useLocationStats(
    place?.id || null,
    place?.google_place_id || null
  );
  
  const { engagement, loading: engagementLoading } = usePinEngagement(
    place?.id || null,
    place?.google_place_id || null
  );
  
  const { campaign } = useMarketingCampaign(place?.id, place?.google_place_id);
  const [isCampaignExpanded, setIsCampaignExpanded] = useState(false);
  
  // Get the current locale for date formatting
  const currentLocale = localeMap[i18n.language] || localeMap['en'];

  // All hooks MUST be called before any early returns
  useEffect(() => {
    if (!place?.id) return;
    setPostsPage(1);
    fetchLocationPosts(1);
    if (user) {
      checkIfLocationSaved();
    }
  }, [place?.id, user, activeTab]);

  // Listen for global save changes
  useEffect(() => {
    const handleSaveChanged = (event: CustomEvent) => {
      const { locationId, saveTag } = event.detail;
      if (locationId === place?.id || locationId === place?.google_place_id) {
        // Re-check to sync both isSaved and currentSaveTag
        checkIfLocationSaved();
      }
    };
    
    window.addEventListener('location-save-changed', handleSaveChanged as EventListener);
    return () => {
      window.removeEventListener('location-save-changed', handleSaveChanged as EventListener);
    };
  }, [place?.id, place?.google_place_id]);

  const checkIfLocationSaved = async () => {
    if (!place?.id) return;
    
    try {
      const saved = await locationInteractionService.isLocationSaved(
        place.google_place_id || place.id
      );
      setIsSaved(saved);

      if (saved) {
        const tag = await locationInteractionService.getCurrentSaveTag(
          place.google_place_id || place.id
        );
        setCurrentSaveTag(tag as SaveTag);
      } else {
        setCurrentSaveTag('general');
      }
    } catch (error) {
      console.error('Error checking if location is saved:', error);
    }
  };

  // Early return after ALL hooks
  if (!place) {
    return null;
  }

  const fetchLocationPosts = async (page: number = 1) => {
    try {
      setLoading(true);
      
      let locationIds: string[] = [];
      
      if (place.google_place_id) {
        const { data: relatedLocations, error: locationError } = await supabase
          .from('locations')
          .select('id, name, google_place_id')
          .eq('google_place_id', place.google_place_id);
        
        if (!locationError && relatedLocations && relatedLocations.length > 0) {
          locationIds = relatedLocations.map(loc => loc.id);
        }
      }
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(place.id) && !locationIds.includes(place.id)) {
        locationIds.push(place.id);
      }
      
      if (locationIds.length === 0) {
        const { data: nameMatchLocations, error: nameError } = await supabase
          .from('locations')
          .select('id, name')
          .ilike('name', place.name);
        
        if (!nameError && nameMatchLocations && nameMatchLocations.length > 0) {
          locationIds = nameMatchLocations.map(loc => loc.id);
        }
      }
      
      if (locationIds.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const limit = 1000;
      const offset = (page - 1) * limit;
      
      let query = supabase.from('posts').select(`
        id,
        user_id,
        caption,
        media_urls,
        likes_count,
        comments_count,
        saves_count,
        created_at,
        metadata,
        location_id,
        rating
      `).in('location_id', locationIds);
      
      if (activeTab === 'posts') {
        query = query.not('media_urls', 'is', null);
      } else {
        query = query.not('rating', 'is', null).gt('rating', 0);
      }
      
      const { data: postsData, error: postsError } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (postsError) throw postsError;

      if (postsData && postsData.length > 0) {
        const userIds = [...new Set(postsData.map(post => post.user_id))];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        let postsWithProfiles = postsData.map(post => ({
          ...post,
          profiles: profilesData?.find(profile => profile.id === post.user_id) || null
        }));

        // Filter out posts without valid media_urls for Posts tab
        if (activeTab === 'posts') {
          postsWithProfiles = postsWithProfiles.filter(post => 
            post.media_urls && 
            Array.isArray(post.media_urls) && 
            post.media_urls.length > 0
          );
        }

        if (page === 1) {
          setPosts(postsWithProfiles);
        } else {
          setPosts(prev => [...prev, ...postsWithProfiles]);
        }
        setHasMorePosts(postsData.length === limit);
      } else {
        if (page === 1) {
          setPosts([]);
        }
        setHasMorePosts(false);
      }
    } catch (error) {
      console.error('Error fetching location posts:', error);
      if (page === 1) {
        setPosts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWithTag = async (tag: SaveTag) => {
    setLoading(true);
    try {
      await locationInteractionService.saveLocation(place.id, {
        google_place_id: place.google_place_id,
        name: place.name,
        address: place.address,
        latitude: place.coordinates?.lat || 0,
        longitude: place.coordinates?.lng || 0,
        category: place.category || 'place',
        types: []
      }, tag);
      setIsSaved(true);
      setCurrentSaveTag(tag);
      toast.success(t('locationSaved'));
      
      // Dispatch global event for sync
      window.dispatchEvent(new CustomEvent('location-save-changed', { 
        detail: { locationId: place.id, isSaved: true, saveTag: tag } 
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
      setCurrentSaveTag('general');
      toast.success(t('locationRemoved'));
      
      // Dispatch global event for sync
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
  
  if (!isOpen) return null;

  return (
    <>
      {!selectedPostId && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Header */}
        <div className="bg-background px-4 pt-8 pb-2">
            <div className="flex items-center gap-3 pb-2">
              <Button
                onClick={onClose}
                size="icon"
                variant="ghost"
                className="shrink-0 h-10 w-10 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
              <div className="shrink-0">
                <CategoryIcon category={place.category || 'place'} className="w-10 h-10" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base text-foreground truncate">{place.name}</h3>
                  {!statsLoading && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {stats.totalSaves > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSavedBy(true);
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

          {/* Action Buttons */}
          <div 
            className={`relative bg-background px-4 pb-4 transition-all duration-300 ${
              showActionButtons ? 'opacity-100 max-h-32' : 'opacity-0 max-h-0 overflow-hidden pb-0'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <div className="grid grid-cols-4 gap-1.5 flex-1">
                <Button
                  onClick={() => setDropdownOpen(true)}
                  disabled={loading}
                  variant="secondary"
                  size="sm"
                  className="relative flex-col h-auto py-3 gap-1 rounded-2xl overflow-hidden"
                >
                  <div className="absolute inset-0 rounded-2xl border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none" />
                  {isSaved ? (
                    currentSaveTag === 'general' ? (
                      <Bookmark className="h-5 w-5 fill-current" />
                    ) : (
                      <span className="text-lg leading-none h-5 w-5 flex items-center justify-center">{(SAVE_TAG_OPTIONS.find(opt => opt.value === currentSaveTag)?.emoji) || '📍'}</span>
                    )
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

                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsReviewModalOpen(true);
                  }}
                  size="sm"
                  variant="secondary"
                  className="relative flex-col h-auto py-3 gap-1 rounded-2xl overflow-hidden"
                >
                  <div className="absolute inset-0 rounded-2xl border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none" />
                  <Star className="w-5 h-5" />
                  <span className="text-xs">{t('review', { ns: 'common', defaultValue: 'Review' })}</span>
                </Button>

                <Button
                  onClick={() => {
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                    const coords = place.coordinates ? `${place.coordinates.lat},${place.coordinates.lng}` : '';
                    const url = isIOS 
                      ? `maps://maps.apple.com/?daddr=${coords}`
                      : `https://www.google.com/maps/dir/?api=1&destination=${coords}`;
                    window.open(url, '_blank');
                  }}
                  size="sm"
                  variant="secondary"
                  className="relative flex-col h-auto py-3 gap-1 rounded-2xl overflow-hidden"
                >
                  <div className="absolute inset-0 rounded-2xl border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none" />
                  <Navigation className="w-5 h-5" />
                  <span className="text-xs">{t('directions', { ns: 'common', defaultValue: 'Directions' })}</span>
                </Button>

                <Button
                  onClick={() => setIsShareModalOpen(true)}
                  size="sm"
                  variant="secondary"
                  className="relative flex-col h-auto py-3 gap-1 rounded-2xl overflow-hidden"
                >
                  <div className="absolute inset-0 rounded-2xl border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none" />
                  <Share2 className="w-5 h-5" />
                  <span className="text-xs">{t('share', { ns: 'common', defaultValue: 'Share' })}</span>
                </Button>
              </div>

              {dropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDropdownOpen(false);
                    }}
                  />
                  <div className="absolute left-4 top-0 w-auto z-50">
                    <div className="w-56 bg-background backdrop-blur-sm border border-border rounded-2xl shadow-lg">
                      {isSaved && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnsave();
                            setDropdownOpen(false);
                          }}
                          className="w-full cursor-pointer flex items-center gap-3 py-2 px-4 hover:bg-accent text-destructive transition-colors min-h-[44px]"
                        >
                          <BookmarkCheck className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium">{t('unsave', { ns: 'common', defaultValue: 'Unsave' })}</span>
                        </button>
                      )}
                      {SAVE_TAG_OPTIONS.filter(option => {
                        if (isSaved && option.value === 'general') return false;
                        return true;
                      }).map((option) => (
                        <button
                          key={option.value}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveWithTag(option.value);
                            setDropdownOpen(false);
                          }}
                          className="w-full cursor-pointer flex items-center gap-3 py-2 px-4 hover:bg-accent transition-colors min-h-[44px]"
                        >
                          {option.value === 'general' ? (
                            <Bookmark className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <span className="text-sm leading-none flex-shrink-0 w-4 flex items-center justify-center">{option.emoji}</span>
                          )}
                          <span className="text-sm font-medium text-left flex-1">
                            {option.value === 'general' 
                              ? t('save', { ns: 'common', defaultValue: 'Save' })
                              : t(option.value, { ns: 'save_tags', defaultValue: option.value })
                            }
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

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
          </div>

          {/* Marketing Campaign */}
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

          {/* Tabs and Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Tab Navigation */}
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
                
                if (currentScrollY > lastScrollY && currentScrollY > 50) {
                  setShowActionButtons(false);
                } else if (currentScrollY < lastScrollY) {
                  setShowActionButtons(true);
                }
                
                if (currentScrollY < 10) {
                  setShowActionButtons(true);
                }
                
                setLastScrollY(currentScrollY);
              }}
            >
              {activeTab === 'posts' ? (
                <div className="px-4 py-4">
                  {loading && posts.length === 0 ? (
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
                    <div className="grid grid-cols-2 gap-3 w-full auto-rows-[1fr]">
                      {posts.map((post) => (
                        <button
                          key={post.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPostId(post.id);
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
                            <div className="absolute top-2 left-2">
                              <Avatar className="w-8 h-8 border-2 border-white shadow-lg">
                                <AvatarImage src={post.profiles?.avatar_url} />
                                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                  {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            {post.media_urls.length > 1 && (
                              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium">
                                +{post.media_urls.length - 1}
                              </div>
                            )}
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
                  )}
                </div>
              ) : (
                <div className="px-4 py-4">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : posts.length === 0 ? (
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
                      {posts.map((post) => (
                        <div key={post.id} className="flex gap-3 pb-4 border-b border-border last:border-0">
                          <Avatar className="w-10 h-10 shrink-0">
                            <AvatarImage src={post.profiles?.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm">{post.profiles?.username || 'User'}</p>
                              <div className="flex items-center gap-1">
                                {(() => {
                                  const CategoryIcon = place.category ? getCategoryIcon(place.category) : Star;
                                  return <CategoryIcon className={cn("w-4 h-4", getRatingFillColor(post.rating), getRatingColor(post.rating))} />;
                                })()}
                                <span className={cn("text-sm font-medium", getRatingColor(post.rating))}>{post.rating}</span>
                              </div>
                            </div>
                            {post.caption && (
                              <p className="text-sm text-muted-foreground mb-1 text-left">{post.caption}</p>
                            )}
                            <p className="text-xs text-muted-foreground text-left">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: currentLocale })}
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
        </div>
      )}

      <LocationShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} place={place} />
      
      {selectedPostId && (
        <PostDetailModalMobile
          postId={selectedPostId}
          locationId={place.id}
          isOpen={true}
          onClose={() => {
            setSelectedPostId(null);
          }}
        />
      )}
      
      <LocationReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        location={{
          id: place.id,
          name: place.name,
          google_place_id: place.google_place_id
        }}
      />

      <SavedByModal
        isOpen={showSavedBy}
        onClose={() => setShowSavedBy(false)}
        placeId={place.id}
        googlePlaceId={place.google_place_id || null}
      />
    </>
  );
};

export default LocationPostLibrary;
