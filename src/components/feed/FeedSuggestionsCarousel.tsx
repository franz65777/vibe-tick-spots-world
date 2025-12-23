import { memo, useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCategoryImage } from '@/utils/categoryIcons';
import { SaveLocationDropdown } from '@/components/common/SaveLocationDropdown';
import { type SaveTag } from '@/utils/saveTags';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import locationPinIcon from '@/assets/location-pin-icon.png';

interface SuggestedLocation {
  id: string;
  name: string;
  category: string;
  city: string | null;
  image_url: string | null;
  latitude: number;
  longitude: number;
  save_count: number;
  saved_by: Array<{ avatar_url: string | null; username: string }>;
  google_place_id?: string | null;
}

// Marquee component for overflowing text - animates when visible on mobile
const MarqueeText = memo(({ text, className, isVisible }: { text: string; className?: string; isVisible: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
      }
    };
    const timer = setTimeout(checkOverflow, 100);
    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text]);

  const shouldAnimate = isOverflowing && isVisible;

  return (
    <div 
      ref={containerRef} 
      className={`overflow-hidden whitespace-nowrap ${className}`}
    >
      {shouldAnimate ? (
        <span
          className="inline-block"
          style={{
            animation: `marquee ${Math.max(text.length * 0.15, 3)}s linear infinite`,
          }}
        >
          {text}
          <span className="mx-4">•</span>
          {text}
        </span>
      ) : (
        <span ref={textRef} className="truncate block">{text}</span>
      )}
    </div>
  );
});

MarqueeText.displayName = 'MarqueeText';

// Calculate distance between two coordinates in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
};

const FeedSuggestionsCarousel = memo(() => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Track visible cards for marquee animation - must be before any return
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Silently fail - distance won't be shown
        }
      );
    }
  }, []);

  // Use React Query for caching - data persists when returning from location card
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['feed-suggestions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get user's current city
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_city')
        .eq('id', user.id)
        .single();

      // Get popular locations in user's city that user hasn't saved
      const { data: userSaved } = await supabase
        .from('user_saved_locations')
        .select('location_id')
        .eq('user_id', user.id);

      const savedIds = new Set(userSaved?.map(s => s.location_id) || []);

      let query = supabase
        .from('locations')
        .select('id, name, category, city, image_url, latitude, longitude')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (profile?.current_city) {
        query = query.ilike('city', `%${profile.current_city}%`);
      }

      const { data: locations, error } = await query;

      if (error) throw error;

      // Filter out already saved and get save counts
      const unsaved = (locations || []).filter(loc => !savedIds.has(loc.id));

      // Get save counts for each location
      const withCounts = await Promise.all(
        unsaved.slice(0, 10).map(async (loc) => {
          const { count } = await supabase
            .from('user_saved_locations')
            .select('*', { count: 'exact', head: true })
            .eq('location_id', loc.id);

          // Get a few users who saved this
          const { data: savers } = await supabase
            .from('user_saved_locations')
            .select('user_id')
            .eq('location_id', loc.id)
            .limit(3);

          let savedBy: Array<{ avatar_url: string | null; username: string }> = [];
          if (savers && savers.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('avatar_url, username')
              .in('id', savers.map(s => s.user_id));
            savedBy = profiles || [];
          }

          return {
            ...loc,
            save_count: count || 0,
            saved_by: savedBy
          };
        })
      );

      // Sort by save count
      withCounts.sort((a, b) => b.save_count - a.save_count);
      return withCounts as SuggestedLocation[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  // IntersectionObserver for mobile marquee - must be before any return
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-location-id');
          if (id) {
            setVisibleCards(prev => {
              const next = new Set(prev);
              if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
                next.add(id);
              } else {
                next.delete(id);
              }
              return next;
            });
          }
        });
      },
      { threshold: [0.7], rootMargin: '0px' }
    );

    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [suggestions]);

  // Save location handler - must be before any return
  const handleSaveLocation = useCallback(async (loc: SuggestedLocation, tag: SaveTag) => {
    if (!user?.id) {
      toast.error(t('loginRequired', { ns: 'common' }));
      return;
    }

    try {
      const { error } = await supabase
        .from('user_saved_locations')
        .upsert({
          user_id: user.id,
          location_id: loc.id,
          save_tag: tag,
        }, { onConflict: 'user_id,location_id' });

      if (error) throw error;

      toast.success(t('locationSaved', { ns: 'common' }));
      
      // Remove from cached suggestions
      queryClient.setQueryData<SuggestedLocation[]>(['feed-suggestions', user.id], (prev) => 
        prev?.filter(s => s.id !== loc.id) || []
      );
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error(t('errorSavingLocation', { ns: 'common' }));
    }
  }, [user?.id, t, queryClient]);

  // Check if category should have bigger icon
  const shouldHaveBiggerIcon = (category: string): boolean => {
    const lowerCategory = category.toLowerCase();
    return lowerCategory.includes('restaurant') || 
           lowerCategory.includes('ristorante') ||
           lowerCategory.includes('hotel') ||
           lowerCategory.includes('food') ||
           lowerCategory.includes('dining');
  };

  // Handle location click - same behavior as post location clicks
  const handleLocationClick = useCallback((loc: SuggestedLocation) => {
    // Save an anchor (top visible feed post + its visual offset) so we restore the *exact* same point
    const container = document.querySelector('[data-feed-scroll-container]') as HTMLDivElement | null;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const postEls = Array.from(container.querySelectorAll<HTMLElement>('[data-feed-post-id]'));

      const firstVisible = postEls.find((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > containerRect.top + 1; // at least partially visible
      });

      const postId = firstVisible?.getAttribute('data-feed-post-id') || undefined;
      const offset = firstVisible
        ? firstVisible.getBoundingClientRect().top - containerRect.top
        : undefined;

      sessionStorage.setItem(
        'feed_scroll_anchor',
        JSON.stringify({
          postId,
          offset,
          scrollTop: container.scrollTop,
        })
      );
    }

    navigate('/', {
      state: {
        centerMap: {
          lat: loc.latitude,
          lng: loc.longitude,
          locationId: loc.id,
          shouldFocus: true,
        },
        openPinDetail: {
          id: loc.id,
          name: loc.name,
          lat: loc.latitude,
          lng: loc.longitude,
          category: loc.category,
          sourceSection: 'nearYou',
        },
        returnTo: '/feed',
      },
    });
  }, [navigate]);

  // Early return AFTER all hooks
  if (isLoading || suggestions.length === 0) return null;

  return (
    <div className="py-4">
      {/* Header */}
      <div className="px-4 mb-3 flex items-center gap-2">
        <img src={locationPinIcon} alt="" className="w-5 h-5 object-contain" />
        <h3 className="font-bold text-foreground">{t('nearYou', { ns: 'feed' })}</h3>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {suggestions.map((loc) => {
          const categoryImage = getCategoryImage(loc.category);
          const isBiggerIcon = shouldHaveBiggerIcon(loc.category);

          // Calculate distance if user location is available
          const distance = userLocation 
            ? calculateDistance(userLocation.lat, userLocation.lng, loc.latitude, loc.longitude)
            : null;

          const isCardVisible = visibleCards.has(loc.id);
          
          return (
            <button
              key={loc.id}
              ref={(el) => {
                if (el) cardRefs.current.set(loc.id, el);
                else cardRefs.current.delete(loc.id);
              }}
              data-location-id={loc.id}
              onClick={() => handleLocationClick(loc)}
              className="shrink-0 w-72 bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <div className="flex gap-3 p-3">
                {/* Image */}
                <div className="relative w-28 h-28 rounded-lg overflow-hidden shrink-0">
                  {loc.image_url ? (
                    <img 
                      src={loc.image_url} 
                      alt={loc.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                      <img 
                        src={categoryImage} 
                        alt={loc.category}
                        className={`object-contain ${isBiggerIcon ? 'w-20 h-20' : 'w-16 h-16'}`}
                      />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <MarqueeText 
                      text={loc.name} 
                      className="font-bold text-foreground"
                      isVisible={isCardVisible}
                    />
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {distance !== null ? (
                        <span>{formatDistance(distance)} {t('away', { ns: 'feed' })}</span>
                      ) : (
                        <span>{loc.city || loc.category}</span>
                      )}
                    </p>
                  </div>

                  {/* Saved by */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      {loc.saved_by.length > 0 && (
                        <div className="flex -space-x-1.5">
                          {loc.saved_by.slice(0, 3).map((saver, idx) => (
                            <Avatar key={idx} className="h-5 w-5 border border-background">
                              <AvatarImage src={saver.avatar_url || undefined} />
                              <AvatarFallback className="text-[8px] bg-primary/10">
                                {saver.username?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      )}
                      {loc.save_count > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          {loc.save_count === 1 
                            ? t('savedByUser', { ns: 'feed', count: 1, defaultValue: 'saved by 1 user' })
                            : t('savedByUsers', { ns: 'feed', count: loc.save_count, defaultValue: `saved by ${loc.save_count} users` })
                          }
                        </span>
                      )}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <SaveLocationDropdown
                        isSaved={false}
                        onSave={(tag) => handleSaveLocation(loc, tag)}
                        onUnsave={() => {}}
                        variant="ghost"
                        size="icon"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

FeedSuggestionsCarousel.displayName = 'FeedSuggestionsCarousel';

export default FeedSuggestionsCarousel;
