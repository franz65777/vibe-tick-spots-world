import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Heart, Check, X } from 'lucide-react';

interface NotificationActionsProps {
  type: string;
  isLoading: boolean;
  // For location_share
  isLocationShareActive?: boolean;
  onOnMyWayClick?: (e: React.MouseEvent) => void;
  // For follow_request
  followRequestHandled?: boolean;
  onAcceptRequest?: (e: React.MouseEvent) => void;
  onDeclineRequest?: (e: React.MouseEvent) => void;
  // For follow
  isFollowing?: boolean;
  followRequestSent?: boolean;
  targetIsPrivate?: boolean;
  onFollowClick?: (e: React.MouseEvent) => void;
  // For comment
  commentLiked?: boolean;
  onCommentLike?: (e: React.MouseEvent) => void;
  // For post thumbnail
  postImage?: string;
  onPostClick?: (e: React.MouseEvent) => void;
  // For review icon
  showReviewIcon?: boolean;
}

const NotificationActions = memo(({
  type,
  isLoading,
  isLocationShareActive,
  onOnMyWayClick,
  followRequestHandled,
  onAcceptRequest,
  onDeclineRequest,
  isFollowing,
  followRequestSent,
  targetIsPrivate,
  onFollowClick,
  commentLiked,
  onCommentLike,
  postImage,
  onPostClick,
  showReviewIcon
}: NotificationActionsProps) => {
  const { t } = useTranslation();

  // Location share: "On My Way" button
  if (type === 'location_share' && onOnMyWayClick) {
    return (
      <Button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onOnMyWayClick(e);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        disabled={isLoading || !isLocationShareActive}
        size="sm"
        variant="default"
        className="px-4 h-7 text-[12px] font-semibold rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t('onMyWay', { ns: 'notifications' })}
      </Button>
    );
  }

  // Follow request: Accept/Decline buttons
  if (type === 'follow_request' && !followRequestHandled) {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          onClick={onAcceptRequest}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          disabled={isLoading}
          size="sm"
          variant="default"
          className="px-3 h-7 text-[12px] font-semibold rounded-lg bg-primary hover:bg-primary/90"
        >
          <Check className="w-3.5 h-3.5" />
        </Button>
        <Button
          onClick={onDeclineRequest}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          disabled={isLoading}
          size="sm"
          variant="outline"
          className="px-3 h-7 text-[12px] font-semibold rounded-lg"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  // Follow: Follow/Following/Requested button
  if (type === 'follow' && onFollowClick) {
    const buttonText = isFollowing 
      ? t('following', { ns: 'common' })
      : followRequestSent 
        ? t('requested', { ns: 'notifications', defaultValue: 'Richiesto' })
        : targetIsPrivate 
          ? t('request', { ns: 'notifications', defaultValue: 'Richiedi' })
          : t('follow', { ns: 'common' });

    return (
      <Button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onFollowClick(e);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        disabled={isLoading}
        size="sm"
        variant={isFollowing || followRequestSent ? "outline" : "default"}
        className={`px-4 h-7 text-[12px] font-semibold rounded-lg ${
          isFollowing || followRequestSent
            ? 'bg-transparent border-border hover:bg-accent'
            : 'bg-primary hover:bg-primary/90'
        }`}
      >
        {buttonText}
      </Button>
    );
  }

  // Comment: Like button + Post thumbnail
  if (type === 'comment') {
    return (
      <div className="flex items-center gap-1.5">
        {onCommentLike && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onCommentLike(e);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            disabled={isLoading}
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full"
          >
            <Heart 
              className={`w-4 h-4 ${commentLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} 
            />
          </Button>
        )}
        {postImage && (
          <div 
            className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 border border-border cursor-pointer"
            onClick={onPostClick}
          >
            <img
              src={postImage}
              alt="Post"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        {showReviewIcon && !postImage && (
          <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-accent flex items-center justify-center">
            <img 
              src="/review-icon.png" 
              alt="Review" 
              className="w-6 h-6"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // Like: Post thumbnail or review icon
  if (type === 'like') {
    if (postImage) {
      return (
        <div 
          className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 border border-border cursor-pointer"
          onClick={onPostClick}
        >
          <img
            src={postImage}
            alt="Post"
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    if (showReviewIcon) {
      return (
        <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-accent flex items-center justify-center">
          <img 
            src="/review-icon.png" 
            alt="Review" 
            className="w-6 h-6"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      );
    }
  }

  return null;
});

NotificationActions.displayName = 'NotificationActions';

export default NotificationActions;
