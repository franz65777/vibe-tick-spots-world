import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Pin } from 'lucide-react';
import { useSocialEngagement } from '@/hooks/useSocialEngagement';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LikersDrawer } from '@/components/social/LikersDrawer';
import { SAVE_TAG_OPTIONS, type SaveTag } from '@/utils/saveTags';
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';

const TAG_ICONS: Record<SaveTag, string> = {
  been: saveTagBeen,
  to_try: saveTagToTry,
  favourite: saveTagFavourite,
};

interface PostActionsProps {
  postId: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  locationId?: string;
  locationName?: string;
  onCommentClick: () => void;
  onShareClick: () => void;
  onCountsUpdate?: (updates: any) => void;
}

export const PostActions = ({
  postId,
  likesCount,
  commentsCount,
  sharesCount,
  locationId,
  locationName,
  onCommentClick,
  onShareClick,
  onCountsUpdate,
}: PostActionsProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isLiked, likeCount, toggleLike, comments } = useSocialEngagement(postId);
  
  // Use hook values as primary, fallback to props for initial render
  const localLikesCount = likeCount ?? likesCount;
  const localCommentsCount = comments?.length ?? commentsCount;
  const [localSharesCount, setLocalSharesCount] = useState(sharesCount);
  
  const [isLocationSaved, setIsLocationSaved] = useState(false);
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [currentSaveTag, setCurrentSaveTag] = useState<SaveTag>('been');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync shares count from props
  useEffect(() => {
    setLocalSharesCount(sharesCount);
  }, [sharesCount]);

  // Subscribe to real-time share count updates only (likes/comments handled by useSocialEngagement)
  useEffect(() => {
    const sharesChannel = supabase
      .channel(`post-shares-live-${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_shares', filter: `post_id=eq.${postId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLocalSharesCount(prev => prev + 1);
          } else if (payload.eventType === 'DELETE') {
            setLocalSharesCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sharesChannel);
    };
  }, [postId]);

  // Load location save status
  useEffect(() => {
    const loadStatus = async () => {
      if (!locationId || !user) return;

      // Fetch Google Place ID for this internal location (if any)
      const { data: loc } = await supabase
        .from('locations')
        .select('google_place_id')
        .eq('id', locationId)
        .maybeSingle();
      const gpId = loc?.google_place_id || null;
      setGooglePlaceId(gpId);

      // Check internal saves
      const { data: internalSave } = await supabase
        .from('user_saved_locations')
        .select('id, save_tag')
        .eq('user_id', user.id)
        .eq('location_id', locationId)
        .maybeSingle();

      // Check saved_places if we have a Google Place ID
      let googleSaved = false;
      let googleSaveTag: SaveTag | null = null;
      if (gpId) {
        const { data: sp } = await supabase
          .from('saved_places')
          .select('id, save_tag')
          .eq('user_id', user.id)
          .eq('place_id', gpId)
          .maybeSingle();
        googleSaved = !!sp;
        if (sp?.save_tag) googleSaveTag = sp.save_tag as SaveTag;
      }

      setIsLocationSaved(!!internalSave || googleSaved);
      if (internalSave?.save_tag) {
        setCurrentSaveTag(internalSave.save_tag as SaveTag);
      } else if (googleSaveTag) {
        setCurrentSaveTag(googleSaveTag);
      }
    };

    loadStatus();

    if (!locationId || !user) return;

    // Realtime for internal saves
    const chInternal = supabase
      .channel(`location-saves-${locationId}-${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_saved_locations', filter: `location_id=eq.${locationId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.user_id === user.id) {
            setIsLocationSaved(true);
            if (payload.new.save_tag) setCurrentSaveTag(payload.new.save_tag as SaveTag);
          } else if (payload.eventType === 'DELETE' && payload.old.user_id === user.id) {
            setIsLocationSaved(false);
          }
        }
      )
      .subscribe();

    // Realtime for saved_places by Google Place ID
    let chGoogle: ReturnType<typeof supabase.channel> | undefined;
    if (googlePlaceId) {
      chGoogle = supabase
        .channel(`saved-places-${googlePlaceId}-${postId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'saved_places', filter: `place_id=eq.${googlePlaceId}` },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new.user_id === user.id) {
              setIsLocationSaved(true);
              if (payload.new.save_tag) setCurrentSaveTag(payload.new.save_tag as SaveTag);
            } else if (payload.eventType === 'DELETE' && payload.old.user_id === user.id) {
              setIsLocationSaved(false);
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(chInternal);
      if (chGoogle) supabase.removeChannel(chGoogle);
    };
  }, [locationId, user, postId, googlePlaceId]);

  // Listen for global save changes
  useEffect(() => {
    const handleSaveChanged = (event: CustomEvent) => {
      const { locationId: changedLocationId, isSaved, saveTag } = event.detail;
      if (changedLocationId === locationId) {
        setIsLocationSaved(isSaved);
        if (saveTag) setCurrentSaveTag(saveTag);
      }
    };
    
    window.addEventListener('location-save-changed', handleSaveChanged as EventListener);
    return () => {
      window.removeEventListener('location-save-changed', handleSaveChanged as EventListener);
    };
  }, [locationId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryDropdown]);

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleLike();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleLikeCountClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localLikesCount > 0) {
      setShowLikersModal(true);
    }
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!locationId || !user) {
      toast.error(t('noLocationAssociated', { ns: 'common', defaultValue: 'No location associated with this post' }));
      return;
    }
    
    if (isLocationSaved) {
      // Unsave location directly
      handleUnsaveLocation();
    } else {
      // Show category dropdown to choose save tag
      setShowCategoryDropdown(true);
    }
  };

  const handleUnsaveLocation = async () => {
    if (!locationId || !user) return;
    
    try {
      await supabase
        .from('user_saved_locations')
        .delete()
        .eq('user_id', user.id)
        .eq('location_id', locationId);

      // Also remove from saved_places if it was saved via Google Places
      if (googlePlaceId) {
        await supabase
          .from('saved_places')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', googlePlaceId);
      }
      
      setIsLocationSaved(false);
      // Emit global event
      window.dispatchEvent(new CustomEvent('location-save-changed', { 
        detail: { locationId, isSaved: false } 
      }));
      toast.success(t('locationRemoved', { ns: 'common' }));
    } catch (error) {
      console.error('Error removing location:', error);
      toast.error(t('failedToRemove', { ns: 'common', defaultValue: 'Failed to remove location' }));
    }
  };

  const handleSaveWithCategory = async (tag: SaveTag) => {
    if (!locationId || !user) return;
    
    setShowCategoryDropdown(false);
    
    try {
      await supabase
        .from('user_saved_locations')
        .insert({
          user_id: user.id,
          location_id: locationId,
          save_tag: tag
        });
      
      setIsLocationSaved(true);
      setCurrentSaveTag(tag);
      // Emit global event
      window.dispatchEvent(new CustomEvent('location-save-changed', { 
        detail: { locationId, isSaved: true, saveTag: tag } 
      }));
      toast.success(t('locationSaved', { ns: 'common' }));
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error(t('failedToSave', { ns: 'common' }));
    }
  };

  return (
    <div className="flex items-center gap-1.5 mt-1 pt-0 relative">
      {/* Like button */}
      <button
        onClick={handleLikeClick}
        className={`flex items-center gap-1.5 px-2 py-2 rounded-lg transition-all font-medium ${
          isLiked
            ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30'
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
      </button>
      
      {/* Clickable like count */}
      <button
        onClick={handleLikeCountClick}
        className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        disabled={localLikesCount === 0}
      >
        {localLikesCount || 0}
      </button>

      {/* Comment button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCommentClick();
        }}
        className="flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all font-medium"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="text-sm font-semibold">{localCommentsCount || 0}</span>
      </button>

      {/* Share button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onShareClick();
        }}
        className="flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all font-medium"
      >
        <Share2 className="w-5 h-5" />
        <span className="text-sm font-semibold">{localSharesCount || 0}</span>
      </button>

      {/* Pin/Save button with dropdown */}
      <div className="relative ml-auto" ref={dropdownRef}>
        <button
          onClick={handlePinClick}
          className={`flex items-center gap-1.5 px-2 py-2 rounded-lg transition-all font-medium ${
            isLocationSaved
              ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          disabled={!locationId}
        >
          <Pin className={`w-5 h-5 ${isLocationSaved ? 'fill-current' : ''}`} />
        </button>

        {/* Category dropdown */}
        {showCategoryDropdown && (
          <div className="absolute bottom-full right-0 mb-2 bg-background border border-border rounded-xl shadow-lg p-2 min-w-[140px] z-50">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">
              {t('saveAs', { ns: 'common', defaultValue: 'Save as' })}
            </div>
            {SAVE_TAG_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveWithCategory(option.value);
                }}
                className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <img src={TAG_ICONS[option.value]} alt="" className="h-5 w-5 object-contain" />
                <span className="text-sm font-medium">
                  {t(option.value, { ns: 'save_tags', defaultValue: option.value })}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Likers Drawer */}
      <LikersDrawer
        isOpen={showLikersModal}
        onClose={() => setShowLikersModal(false)}
        postId={postId}
      />
    </div>
  );
};
