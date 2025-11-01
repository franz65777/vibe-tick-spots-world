import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { useSocialEngagement } from '@/hooks/useSocialEngagement';

interface PostActionsProps {
  postId: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  onCommentClick: () => void;
  onShareClick: () => void;
  onCountsUpdate?: (updates: any) => void;
}

export const PostActions = ({
  postId,
  likesCount,
  commentsCount,
  sharesCount,
  onCommentClick,
  onShareClick,
  onCountsUpdate,
}: PostActionsProps) => {
  const { isLiked, isSaved, likeCount, toggleLike, toggleSave } = useSocialEngagement(postId);
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);

  useEffect(() => {
    if (likeCount !== undefined) {
      setLocalLikesCount(likeCount);
    } else if (likesCount !== undefined) {
      setLocalLikesCount(likesCount);
    }
  }, [likeCount, likesCount]);

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleLike();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleSave();
    } catch (error) {
      console.error('Error toggling save:', error);
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
        onClick={handleSaveClick}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ml-auto font-medium ${
          isSaved
            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
};
