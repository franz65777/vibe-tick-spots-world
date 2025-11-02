import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Pin } from 'lucide-react';
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

  useEffect(() => {
    if (likeCount !== undefined) {
      setLocalLikesCount(likeCount);
    } else if (likesCount !== undefined) {
      setLocalLikesCount(likesCount);
    }
  }, [likeCount, likesCount]);

  useEffect(() => {
    const checkIfSaved = async () => {
      if (!locationId || !user) return;
      
      const { data } = await supabase
        .from('user_saved_locations')
        .select('id')
        .eq('user_id', user.id)
        .eq('location_id', locationId)
        .maybeSingle();
      
      setIsLocationSaved(!!data);
    };
    
    checkIfSaved();
  }, [locationId, user]);

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
        
        setIsLocationSaved(false);
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
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all font-medium ${
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
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all font-medium"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="text-sm font-semibold">{commentsCount || 0}</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onShareClick();
        }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all font-medium"
      >
        <Send className="w-5 h-5" />
        <span className="text-sm font-semibold">{sharesCount || 0}</span>
      </button>

      <button
        onClick={handlePinClick}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ml-auto font-medium ${
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
