import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Pin } from 'lucide-react';
import { useSocialEngagement } from '@/hooks/useSocialEngagement';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const { isLiked, likeCount, toggleLike } = useSocialEngagement(postId);
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);
  const [isLocationSaved, setIsLocationSaved] = useState(false);
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);

  useEffect(() => {
    if (likeCount !== undefined) {
      setLocalLikesCount(likeCount);
    } else if (likesCount !== undefined) {
      setLocalLikesCount(likesCount);
    }
  }, [likeCount, likesCount]);

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
        .select('id')
        .eq('user_id', user.id)
        .eq('location_id', locationId)
        .maybeSingle();

      // Check saved_places if we have a Google Place ID
      let googleSaved = false;
      if (gpId) {
        const { data: sp } = await supabase
          .from('saved_places')
          .select('id')
          .eq('user_id', user.id)
          .eq('place_id', gpId)
          .maybeSingle();
        googleSaved = !!sp;
      }

      setIsLocationSaved(!!internalSave || googleSaved);
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
      const { locationId: changedLocationId, isSaved } = event.detail;
      if (changedLocationId === locationId) {
        setIsLocationSaved(isSaved);
      }
    };
    
    window.addEventListener('location-save-changed', handleSaveChanged as EventListener);
    return () => {
      window.removeEventListener('location-save-changed', handleSaveChanged as EventListener);
    };
  }, [locationId]);

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleLike();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handlePinClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!locationId || !user) {
      toast({
        title: t('common:error'),
        description: 'No location associated with this post',
        variant: 'destructive',
      });
      return;
    }
    
    if (isLocationSaved) {
      // Unsave location
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
        toast({
          title: 'Removed',
          description: `${locationName || 'Location'} removed from saved`,
        });
      } catch (error) {
        console.error('Error removing location:', error);
        toast({
          title: t('common:error'),
          description: 'Failed to remove location',
          variant: 'destructive',
        });
      }
    } else {
      // Save location
      try {
        await supabase
          .from('user_saved_locations')
          .insert({
            user_id: user.id,
            location_id: locationId
          });
        
        setIsLocationSaved(true);
        // Emit global event
        window.dispatchEvent(new CustomEvent('location-save-changed', { 
          detail: { locationId, isSaved: true } 
        }));
        toast({
          title: t('common:save'),
          description: `${locationName || 'Location'} saved successfully!`,
        });
      } catch (error) {
        console.error('Error saving location:', error);
        toast({
          title: t('common:error'),
          description: 'Failed to save location',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="flex items-center gap-1.5 mt-1 pt-0">
      <button
        onClick={handleLikeClick}
        className={`flex items-center gap-1.5 px-2 py-2 rounded-lg transition-all font-medium ${
          isLiked
            ? 'bg-red-50 text-red-600 hover:bg-red-100'
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
        <span className="text-sm font-semibold">{localLikesCount || 0}</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onCommentClick();
        }}
        className="flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all font-medium"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="text-sm font-semibold">{commentsCount || 0}</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onShareClick();
        }}
        className="flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all font-medium"
      >
        <Share2 className="w-5 h-5" />
        <span className="text-sm font-semibold">{sharesCount || 0}</span>
      </button>

      <button
        onClick={handlePinClick}
        className={`flex items-center gap-1.5 px-2 py-2 rounded-lg transition-all ml-auto font-medium ${
          isLocationSaved
            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
        }`}
        disabled={!locationId}
      >
        <Pin className={`w-5 h-5 ${isLocationSaved ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
};
