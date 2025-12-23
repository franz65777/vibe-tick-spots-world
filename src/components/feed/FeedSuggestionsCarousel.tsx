import { memo, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCategoryImage, getCategoryIcon, getCategoryColor } from '@/utils/categoryIcons';

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
}

// Marquee component for overflowing text - animates only on hover
const MarqueeText = memo(({ text, className }: { text: string; className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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

  return (
    <div 
      ref={containerRef} 
      className={`overflow-hidden whitespace-nowrap ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isOverflowing && isHovered ? (
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
  const [suggestions, setSuggestions] = useState<SuggestedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  useEffect(() => {
    if (!user?.id) return;

    const fetchSuggestions = async () => {
      try {
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
        setSuggestions(withCounts);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [user?.id]);

  if (loading || suggestions.length === 0) return null;

  const handleLocationClick = (loc: SuggestedLocation) => {
    navigate('/', {
      state: {
        centerMap: {
          lat: loc.latitude,
          lng: loc.longitude,
          locationId: loc.id,
          shouldFocus: true
        },
        openPinDetail: {
          id: loc.id,
          name: loc.name,
          lat: loc.latitude,
          lng: loc.longitude,
          category: loc.category
        }
      }
    });
  };

  // Check if category should have bigger icon
  const shouldHaveBiggerIcon = (category: string): boolean => {
    const lowerCategory = category.toLowerCase();
    return lowerCategory.includes('restaurant') || 
           lowerCategory.includes('ristorante') ||
           lowerCategory.includes('hotel') ||
           lowerCategory.includes('food') ||
           lowerCategory.includes('dining');
  };

  return (
    <div className="py-4">
      {/* Header */}
      <div className="px-4 mb-3">
        <h3 className="font-bold text-foreground">{t('nearYou', { ns: 'feed' })}</h3>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {suggestions.map((loc) => {
          const CategoryIcon = getCategoryIcon(loc.category);
          const categoryImage = getCategoryImage(loc.category);
          const categoryColor = getCategoryColor(loc.category);
          const isBiggerIcon = shouldHaveBiggerIcon(loc.category);

          // Calculate distance if user location is available
          const distance = userLocation 
            ? calculateDistance(userLocation.lat, userLocation.lng, loc.latitude, loc.longitude)
            : null;

          return (
            <button
              key={loc.id}
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
                    <button className="p-1.5 rounded-full hover:bg-muted">
                      <Bookmark className="w-4 h-4 text-muted-foreground" />
                    </button>
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
