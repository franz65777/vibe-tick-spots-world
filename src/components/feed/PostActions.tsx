import React from 'react';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { useSocialEngagement } from '@/hooks/useSocialEngagement';

interface PostActionsProps {
  postId: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  onCommentClick: () => void;
  onShareClick: () => void;
}

export const PostActions = ({
  postId,
  likesCount,
  commentsCount,
  sharesCount,
  onCommentClick,
  onShareClick,
}: PostActionsProps) => {
  const { isLiked, isSaved, toggleLike, toggleSave } = useSocialEngagement(postId);

  return (
    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleLike();
        }}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-all ${
          isLiked
            ? 'bg-red-50 text-red-600'
            : 'hover:bg-muted text-muted-foreground'
        }`}
      >
        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        <span className="text-xs font-medium">{likesCount}</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onCommentClick();
        }}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="text-xs font-medium">{commentsCount}</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onShareClick();
        }}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all"
      >
        <Send className="w-4 h-4" />
        <span className="text-xs font-medium">{sharesCount}</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleSave();
        }}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-all ml-auto ${
          isSaved
            ? 'bg-blue-50 text-blue-600'
            : 'hover:bg-muted text-muted-foreground'
        }`}
      >
        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
};
