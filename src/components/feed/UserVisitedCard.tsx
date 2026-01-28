import { memo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { getCategoryImage } from '@/utils/categoryIcons';
import { formatPostDate } from '@/utils/dateFormatter';
import { SaveLocationDropdown } from '@/components/common/SaveLocationDropdown';
import { type SaveTag, normalizeSaveTag } from '@/utils/saveTags';
import { locationInteractionService } from '@/services/locationInteractionService';
import { normalizeCity } from '@/utils/cityNormalization';
import { storeFeedScrollAnchor } from '@/utils/feedScroll';
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';

// Map save tags to their icons
const SAVE_TAG_ICONS: Record<SaveTag, string> = {
  been: saveTagBeen,
  to_try: saveTagToTry,
  favourite: saveTagFavourite,
};

// Scrolling text component for long location names
const ScrollingLocationName = memo(({ name }: { name: string }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [needsScroll, setNeedsScroll] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Check if text overflows
    setNeedsScroll(el.scrollWidth > el.clientWidth);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated && needsScroll) {
          setIsVisible(true);
          setHasAnimated(true);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated, needsScroll, name]);

  return (
    <div ref={scrollRef} className="overflow-hidden">
      <h4
        className={`font-bold text-foreground text-sm whitespace-nowrap ${isVisible && needsScroll ? 'animate-marquee-bounce' : ''}`}
      >
        {name}
      </h4>
    </div>
  );
});

ScrollingLocationName.displayName = 'ScrollingLocationName';

// Scrolling text for the “ha visitato · data” line (same marquee effect used elsewhere)
const ScrollingVisitedMeta = memo(({ text }: { text: string }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true);
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated, text]);

  return (
    <div ref={scrollRef} className="overflow-hidden">
      <span
        className={`text-xs text-muted-foreground whitespace-nowrap ${isVisible ? 'animate-marquee-bounce' : ''}`}
      >
        {text}
      </span>
    </div>
  );
});

ScrollingVisitedMeta.displayName = 'ScrollingVisitedMeta';

// Check if category should have bigger icon (restaurant/hotel only)
const shouldHaveBiggerIcon = (category: string): boolean => {
  const lowerCategory = category.toLowerCase();
  return lowerCategory.includes('restaurant') || 
         lowerCategory.includes('ristorante') ||
         lowerCategory.includes('hotel') ||
         lowerCategory.includes('albergo');
};
export interface VisitedSaveActivity {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  location_name: string;
  location_category: string;
  location_city: string | null;
  location_id: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  is_following: boolean;
}

interface UserVisitedCardProps {
  activity: VisitedSaveActivity;
  // Pre-loaded states from batch fetch (optional - falls back to individual queries)
  initialIsSaved?: boolean;
  initialSaveTag?: SaveTag | null;
  initialIsLiked?: boolean;
  initialLikeCount?: number;
}

const UserVisitedCard = memo(({ 
  activity,
  initialIsSaved,
  initialSaveTag,
  initialIsLiked,
  initialLikeCount 
}: UserVisitedCardProps) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Use pre-loaded states if available
  const [isSaved, setIsSaved] = useState(initialIsSaved ?? false);
  const [savedTag, setSavedTag] = useState<SaveTag | null>(normalizeSaveTag(initialSaveTag as any) ?? null);
  const [isLiked, setIsLiked] = useState(initialIsLiked ?? false);
  const [likeCount, setLikeCount] = useState(initialLikeCount ?? 0);
  const [isLiking, setIsLiking] = useState(false);

  // Skip individual queries if we have pre-loaded states from batch fetch
  useEffect(() => {
    // If we have pre-loaded states, use them and skip individual queries
    if (initialIsSaved !== undefined || initialIsLiked !== undefined) {
      return; // Data already provided via props
    }

    const checkSaveAndLikeStatus = async () => {
      if (!user?.id || !activity.location_id) return;

      try {
        // Check saved status
        const { data: savedData } = await supabase
          .from('user_saved_locations')
          .select('save_tag')
          .eq('user_id', user.id)
          .eq('location_id', activity.location_id)
          .maybeSingle();

        if (savedData) {
          setIsSaved(true);
          setSavedTag(normalizeSaveTag(savedData.save_tag) as SaveTag);
        }

        // Check like status
        const { data: likeData } = await supabase
          .from('location_likes')
          .select('id')
          .eq('user_id', user.id)
          .eq('location_id', activity.location_id)
          .maybeSingle();

        setIsLiked(!!likeData);

        // Get like count
        const { count } = await supabase
          .from('location_likes')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', activity.location_id);

        setLikeCount(count || 0);
      } catch (err) {
        console.error('Error checking save/like status:', err);
      }
    };

    checkSaveAndLikeStatus();
  }, [user?.id, activity.location_id, initialIsSaved, initialIsLiked]);

  // Store scroll position before navigation using the same anchor logic as the rest of the feed
  const storeScrollPosition = () => {
    storeFeedScrollAnchor();
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    storeScrollPosition();
    navigate(`/profile/${activity.user_id}`);
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: activity.user_id,
        });

      if (error) throw error;

      toast.success(t('followingUser', { defaultValue: 'Now following!' }));
      queryClient.invalidateQueries({ queryKey: ['visited-saves'] });
    } catch (err) {
      console.error('Error following user:', err);
    }
  };

  const handleCardClick = () => {
    if (activity.latitude && activity.longitude && activity.location_id) {
      storeScrollPosition();
      navigate('/', {
        state: {
          centerMap: {
            lat: activity.latitude,
            lng: activity.longitude,
            locationId: activity.location_id,
            shouldFocus: true,
          },
          openPinDetail: {
            id: activity.location_id,
            name: activity.location_name,
            lat: activity.latitude,
            lng: activity.longitude,
            category: activity.location_category,
          },
          returnTo: '/feed',
        },
      });
    }
  };

  const handleSaveLocation = async (tag: SaveTag) => {
    if (!user?.id || !activity.location_id) return;

    try {
      const { error } = await supabase
        .from('user_saved_locations')
        .upsert({
          user_id: user.id,
          location_id: activity.location_id,
          save_tag: tag,
        }, { onConflict: 'user_id,location_id' });

      if (error) throw error;

      setIsSaved(true);
      setSavedTag(normalizeSaveTag(tag) as SaveTag);
      toast.success(t('locationSaved', { defaultValue: 'Location saved!' }));
    } catch (err) {
      console.error('Error saving location:', err);
    }
  };

  const handleUnsaveLocation = async () => {
    if (!user?.id || !activity.location_id) return;

    try {
      const { error } = await supabase
        .from('user_saved_locations')
        .delete()
        .eq('user_id', user.id)
        .eq('location_id', activity.location_id);

      if (error) throw error;

      setIsSaved(false);
      setSavedTag(null);
      toast.success(t('locationUnsaved', { defaultValue: 'Location removed!' }));
    } catch (err) {
      console.error('Error unsaving location:', err);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id || !activity.location_id || isLiking) return;

    setIsLiking(true);
    try {
      const result = await locationInteractionService.toggleLocationLike(activity.location_id);
      setIsLiked(result.liked);
      setLikeCount(result.count);

      // Send notification to the user who saved this location (activity owner)
      if (result.liked && activity.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: activity.user_id,
          type: 'location_like',
          title: t('newLike', { ns: 'notifications', defaultValue: 'New Like' }),
          message: t('likedYourVisit', { 
            ns: 'notifications', 
            defaultValue: '{{username}} liked your visit to {{location}}',
            username: user.user_metadata?.username || 'Someone',
            location: activity.location_name
          }),
          data: {
            location_id: activity.location_id,
            location_name: activity.location_name,
            liker_id: user.id,
          },
        });
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    } finally {
      setIsLiking(false);
    }
  };

  const categoryIcon = getCategoryImage(activity.location_category);
  const formattedDate = formatPostDate(activity.created_at, t, i18n.language);
  const normalizedCity = normalizeCity(activity.location_city);

  return (
    <div className="mx-5">
      {/* Card */}
      <div
        onClick={handleCardClick}
        className="bg-white/60 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/20 rounded-xl shadow-lg shadow-black/5 dark:shadow-black/20 overflow-hidden cursor-pointer"
      >
        <div className="p-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <button onClick={handleUserClick} className="shrink-0 mt-0.5">
              <Avatar className="h-10 w-10">
                <AvatarImage src={activity.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                  {activity.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Top row: username, visited, date, follow button */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleUserClick}
                  className="font-semibold text-sm hover:opacity-70 text-foreground shrink-0 max-w-[110px] truncate"
                >
                  {activity.username}
                </button>

                <div className="flex-1 min-w-0 overflow-hidden">
                  <ScrollingVisitedMeta
                    text={`${t('hasVisited', { ns: 'common', defaultValue: 'has visited' })} · ${formattedDate}`}
                  />
                </div>

                {/* Follow button - always visible */}
                {!activity.is_following && user?.id !== activity.user_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs bg-background/50 rounded-full px-3 py-0 shrink-0"
                    onClick={handleFollow}
                  >
                    {t('follow', { defaultValue: 'Follow' })}
                  </Button>
                )}
              </div>

              <div className="overflow-hidden">
                <ScrollingLocationName name={activity.location_name} />
              </div>

              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <img 
                  src={categoryIcon} 
                  alt="" 
                  className={shouldHaveBiggerIcon(activity.location_category) ? 'w-4 h-5' : 'w-3.5 h-3.5'} 
                />
                {normalizedCity && normalizedCity !== 'Unknown' && (
                  <span>{normalizedCity}</span>
                )}
              </p>
            </div>

            {/* Right side: Save & Like buttons stacked, aligned to top */}
            <div className="flex flex-col items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Save button */}
              {isSaved && savedTag ? (
                <button 
                  onClick={() => handleUnsaveLocation()}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
                >
                  {SAVE_TAG_ICONS[savedTag] ? (
                    <img 
                      src={SAVE_TAG_ICONS[savedTag]} 
                      alt="" 
                      className="w-5 h-5"
                    />
                  ) : (
                    // Fallback for any unexpected tag values
                    <div className="w-5 h-5 rounded bg-muted" aria-hidden="true" />
                  )}
                </button>
              ) : (
                <SaveLocationDropdown
                  isSaved={false}
                  onSave={handleSaveLocation}
                  onUnsave={handleUnsaveLocation}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 p-0"
                />
              )}

              {/* Like button with count beside it */}
              <button
                onClick={handleLike}
                disabled={isLiking}
                className="w-7 h-7 flex items-center justify-center gap-0.5 rounded-full hover:bg-muted/50 transition-colors"
              >
                <Heart 
                  className={`w-4 h-4 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} 
                />
                {likeCount > 0 && (
                  <span className="text-[10px] text-muted-foreground">{likeCount}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

UserVisitedCard.displayName = 'UserVisitedCard';

export default UserVisitedCard;
