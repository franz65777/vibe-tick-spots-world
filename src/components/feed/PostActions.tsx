import React, { useState, useEffect, useRef } from 'react';
import { Heart, Share2, Pin } from 'lucide-react';
import { ChatIcon } from '@/components/icons/ChatIcon';
import { useSocialEngagement } from '@/hooks/useSocialEngagement';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LikersDrawer } from '@/components/social/LikersDrawer';
import { SAVE_TAG_OPTIONS, type SaveTag } from '@/utils/saveTags';
import { useRealtimeEvent } from '@/hooks/useCentralizedRealtime';
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';
import { haptics } from '@/utils/haptics';

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
  // Pre-loaded states from batch fetch (optional - falls back to individual queries)
  initialIsLiked?: boolean;
  initialSaveTag?: SaveTag | null;
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
  initialIsLiked,
  initialSaveTag,
  onCommentClick,
  onShareClick,
  onCountsUpdate,
}: PostActionsProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { 
    isLiked, 
    likeCount, 
    commentCount, 
    shareCount, 
    toggleLike 
  } = useSocialEngagement(postId, { 
    likes: likesCount, 
    comments: commentsCount, 
    shares: sharesCount 
  });
  
  // Use hook values when loaded (not null), otherwise fallback to props
  const displayLikesCount = likeCount !== null ? likeCount : likesCount;
  const displayCommentsCount = commentCount !== null ? commentCount : commentsCount;
  const displaySharesCount = shareCount !== null ? shareCount : sharesCount;
  
  const [isLocationSaved, setIsLocationSaved] = useState(false);
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('top');
  const [currentSaveTag, setCurrentSaveTag] = useState<SaveTag>('been');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load location save status and Google Place ID
  // Skip individual queries if we have pre-loaded states from batch fetch
  useEffect(() => {
    // If we have pre-loaded save state, use it and skip individual queries
    if (initialSaveTag !== undefined) {
      setIsLocationSaved(initialSaveTag !== null);
      if (initialSaveTag) setCurrentSaveTag(initialSaveTag);
      return;
    }

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
  }, [locationId, user, initialSaveTag]);

  // Use centralized realtime for internal saves - NO individual channel!
  useRealtimeEvent(['saved_location_insert', 'saved_location_delete'], (payload) => {
    if (!locationId || !user) return;
    
    // Filter: only handle events for THIS location
    if (payload.location_id === locationId && payload.user_id === user.id) {
      if (payload.id && !payload._deleted) {
        // INSERT
        setIsLocationSaved(true);
        if (payload.save_tag) setCurrentSaveTag(payload.save_tag as SaveTag);
      } else {
        // DELETE (old payload)
        setIsLocationSaved(false);
      }
    }
  });

  // Use centralized realtime for Google Place saves
  useRealtimeEvent(['saved_place_insert', 'saved_place_delete'], (payload) => {
    if (!googlePlaceId || !user) return;
    
    // Filter: only handle events for THIS Google Place
    if (payload.place_id === googlePlaceId && payload.user_id === user.id) {
      if (payload.id && !payload._deleted) {
        // INSERT
        setIsLocationSaved(true);
        if (payload.save_tag) setCurrentSaveTag(payload.save_tag as SaveTag);
      } else {
        // DELETE
        setIsLocationSaved(false);
      }
    }
  });

  // Listen for global save changes (from other components)
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
        setShowRemoveConfirm(false);
      }
    };

    if (showCategoryDropdown || showRemoveConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryDropdown, showRemoveConfirm]);

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.impact('light');
    try {
      await toggleLike();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleLikeCountClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (displayLikesCount > 0) {
      setShowLikersModal(true);
    }
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.impact('light');
    if (!locationId || !user) {
      toast.error(t('noLocationAssociated', { ns: 'common', defaultValue: 'No location associated with this post' }));
      return;
    }
    
    if (isLocationSaved) {
      // Show remove confirmation instead of unsaving directly
      haptics.warning();
      setShowRemoveConfirm(true);
    } else {
      // Calculate dropdown position based on button position
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceAbove = rect.top;
        const dropdownHeight = 160; // Approximate height of dropdown
        const headerHeight = 60; // Approximate header height
        
        // If not enough space above (accounting for header), show dropdown below
        if (spaceAbove < dropdownHeight + headerHeight) {
          setDropdownPosition('bottom');
        } else {
          setDropdownPosition('top');
        }
      }
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
      
      haptics.success();
      setIsLocationSaved(true);
      setCurrentSaveTag(tag);
      // Emit global event
      window.dispatchEvent(new CustomEvent('location-save-changed', { 
        detail: { locationId, isSaved: true, saveTag: tag } 
      }));
      toast.success(t('locationSaved', { ns: 'common' }));
    } catch (error) {
      haptics.error();
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
        disabled={displayLikesCount === 0}
      >
        {displayLikesCount}
      </button>

      {/* Comment button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCommentClick();
        }}
        className="flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all font-medium"
      >
        <ChatIcon size={22} />
        <span className="text-sm font-semibold">{displayCommentsCount}</span>
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
        <span className="text-sm font-semibold">{displaySharesCount}</span>
      </button>

      {/* Pin/Save button with dropdown */}
      <div className="relative ml-auto" ref={dropdownRef}>
        <button
          ref={buttonRef}
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

        {/* Remove confirmation button */}
        {showRemoveConfirm && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUnsaveLocation();
              setShowRemoveConfirm(false);
            }}
            className="absolute right-full top-1/2 -translate-y-1/2 mr-2 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap hover:bg-destructive/90 transition-colors z-50"
          >
            {t('remove', { ns: 'common', defaultValue: 'Remove' })}
          </button>
        )}

        {/* Category dropdown - position dynamically based on available space */}
        {showCategoryDropdown && (
          <div 
            className={`absolute right-0 bg-background border border-border rounded-xl shadow-lg p-2 min-w-[140px] z-50 ${
              dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
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