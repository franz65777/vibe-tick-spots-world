import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { MapPin, Star, Percent, Calendar, Sparkles, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostActions } from './PostActions';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { getRatingColor, getRatingFillColor } from '@/utils/ratingColors';
import { PostLikeUser } from '@/services/socialEngagementService';
import { useTranslation } from 'react-i18next';
import { formatPostDate } from '@/utils/dateFormatter';

interface FeedPostItemProps {
  item: any;
  profile: any;
  userHasStory: boolean;
  postLikes: Map<string, PostLikeUser[]>;
  expandedCaptions: Set<string>;
  isPromotionFeed?: boolean;
  onAvatarClick: (userId: string, isBusiness: boolean, e: React.MouseEvent) => void;
  onLocationClick: (postId: string, locationId: string, lat: number, lng: number, name: string | null, e: React.MouseEvent) => void;
  onCommentClick: (postId: string) => void;
  onShareClick: (postId: string) => void;
  onToggleCaption: (postId: string) => void;
}

const FeedPostItem = memo((props: FeedPostItemProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const {
    item,
    profile,
    userHasStory,
    postLikes,
    expandedCaptions,
    isPromotionFeed = false,
    onAvatarClick,
    onLocationClick,
    onCommentClick,
    onShareClick,
    onToggleCaption
  } = props;

  const username = profile?.username || 'Unknown';
  const avatarUrl = profile?.avatar_url;
  const userId = item.user_id;
  const isBusiness = profile?.is_business || false;
  const postId = item.id;
  const mediaUrls = item.media_urls || [];
  const hasMultipleMedia = mediaUrls.length > 1;
  const location = item.locations as any;
  const locationName = location?.name;
  const locationId = item.location_id;
  const caption = item.caption;
  const rating = item.rating;
  const createdAt = item.created_at;
  const isExpanded = expandedCaptions.has(postId);
  const contentType = item.content_type;
  
  // Get promotion type icon
  const getPromotionIcon = () => {
    if (!contentType) return null;
    switch (contentType) {
      case 'discount':
        return <Percent className="w-3.5 h-3.5 shrink-0" />;
      case 'event':
        return <Calendar className="w-3.5 h-3.5 shrink-0" />;
      case 'promotion':
        return <Sparkles className="w-3.5 h-3.5 shrink-0" />;
      case 'announcement':
        return <Megaphone className="w-3.5 h-3.5 shrink-0" />;
      default:
        return null;
    }
  };
  
  const getPromotionLabel = () => {
    if (!contentType) return null;
    switch (contentType) {
      case 'discount':
        return t('discount', { ns: 'common' });
      case 'event':
        return t('event', { ns: 'common' });
      case 'promotion':
        return t('promotion', { ns: 'common' });
      case 'announcement':
        return t('news', { ns: 'common' });
      default:
        return null;
    }
  };

  const renderCaption = () => {
    if (!caption) return null;
    const firstLine = caption.split('\n')[0];
    const MAX_FIRST_LINE_LENGTH = 80;
    const hasMultipleLines = caption.trim().length > firstLine.trim().length;
    const firstLineIsTooLong = firstLine.length > MAX_FIRST_LINE_LENGTH;
    const hasMoreContent = hasMultipleLines || firstLineIsTooLong;
    const displayFirstLine = firstLineIsTooLong && !isExpanded 
      ? firstLine.substring(0, MAX_FIRST_LINE_LENGTH)
      : firstLine;

    return (
      <div className="text-sm text-left">
        <span className="text-foreground">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAvatarClick(userId, isBusiness, e);
            }}
            className="font-semibold hover:opacity-70"
          >
            {username}
          </button>
          {' '}
          <span className="inline">
            {isExpanded ? (
              <>
                <span className="whitespace-pre-wrap">{caption}</span>
                {' '}
                {hasMoreContent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCaption(postId);
                    }}
                    className="text-muted-foreground hover:text-foreground font-medium"
                  >
                    {t('less')}
                  </button>
                )}
              </>
            ) : (
              <>
                <span>{displayFirstLine}</span>
                {hasMoreContent && '... '}
                {hasMoreContent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCaption(postId);
                    }}
                    className="text-muted-foreground hover:text-foreground font-medium"
                  >
                    {t('more')}
                  </button>
                )}
              </>
            )}
          </span>
        </span>
      </div>
    );
  };

  return (
    <article className="post-compact bg-background">
      {/* Post Header */}
      <div className="post-compact-header flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button 
            onClick={(e) => onAvatarClick(userId, isBusiness, e)}
            className="shrink-0 relative"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {userHasStory && (
              <div className="absolute inset-0 rounded-full ring-2 ring-blue-500 ring-offset-2 ring-offset-background pointer-events-none" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <button
              onClick={(e) => onAvatarClick(userId, isBusiness, e)}
              className="font-semibold text-sm hover:opacity-70 block truncate text-left"
            >
              {username}
            </button>
            {/* Show address only in promotion feed, otherwise show location name */}
            {isPromotionFeed && location && (
              <button
                onClick={(e) => onLocationClick(postId, locationId, location.latitude, location.longitude, locationName, e)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 truncate"
              >
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {location.address && location.city 
                    ? `${location.address}, ${location.city}`
                    : locationName || location.city || location.address || ''}
                </span>
              </button>
            )}
            {!isPromotionFeed && locationName && locationId && location?.latitude && location?.longitude && (
              <button
                onClick={(e) => onLocationClick(postId, locationId, location.latitude, location.longitude, locationName, e)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 truncate"
              >
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{locationName}</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Promotion type icon */}
          {contentType && (
            <div className="flex items-center gap-1 text-primary">
              {getPromotionIcon()}
              <span className="font-medium text-xs">{getPromotionLabel()}</span>
            </div>
          )}
          {/* Rating */}
          {rating && rating > 0 && (
            <div className="flex items-center gap-1">
              {(() => {
                const CategoryIcon = location?.category ? getCategoryIcon(location.category) : Star;
                return <CategoryIcon className={cn("w-4 h-4", getRatingFillColor(rating), getRatingColor(rating))} />;
              })()}
              <span className={cn("text-sm font-semibold", getRatingColor(rating))}>{rating}</span>
            </div>
          )}
        </div>
      </div>

      {/* Post Media */}
      {mediaUrls.length > 0 && (
        <div className="post-compact-media relative">
          {hasMultipleMedia ? (
            <Carousel className="w-full" gutter={false}>
              <CarouselContent className="-ml-0">
                {mediaUrls.map((url: string, idx: number) => {
                  const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm');
                  return (
                    <CarouselItem key={idx} className="pl-0">
                      <div className="aspect-square w-full">
                        {isVideo ? (
                          <video
                            src={url}
                            className="w-full h-full object-cover block touch-pinch-zoom"
                            controls
                            playsInline
                            loop
                          />
                        ) : (
                          <img
                            src={url}
                            alt={`Post ${idx + 1}`}
                            className="w-full h-full object-cover block touch-pinch-zoom"
                            loading="lazy"
                            decoding="async"
                            style={{ touchAction: 'pinch-zoom' }}
                          />
                        )}
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>
          ) : (() => {
            const isVideo = mediaUrls[0].includes('.mp4') || mediaUrls[0].includes('.mov') || mediaUrls[0].includes('.webm');
            return (
              <div className="aspect-square w-full">
                {isVideo ? (
                  <video
                    src={mediaUrls[0]}
                    className="w-full h-full object-cover block touch-pinch-zoom"
                    controls
                    playsInline
                    loop
                  />
                ) : (
                  <img
                    src={mediaUrls[0]}
                    alt="Post"
                    className="w-full h-full object-cover block touch-pinch-zoom"
                    loading="lazy"
                    decoding="async"
                    style={{ touchAction: 'pinch-zoom' }}
                  />
                )}
              </div>
            );
          })()}
          {hasMultipleMedia && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
              {mediaUrls.map((_: any, idx: number) => (
                <div 
                  key={idx} 
                  className="w-1.5 h-1.5 rounded-full bg-white/80"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Post Actions */}
      <div className="post-compact-actions space-y-2.5">
        <PostActions
          postId={postId}
          likesCount={item.likes_count || 0}
          commentsCount={item.comments_count || 0}
          sharesCount={item.shares_count || 0}
          locationId={locationId}
          locationName={locationName}
          onCommentClick={() => onCommentClick(postId)}
          onShareClick={() => onShareClick(postId)}
        />

        {/* Likes Section */}
        {item.likes_count > 0 && postLikes.get(postId) && postLikes.get(postId)!.length > 0 && (
          <div className="flex items-center gap-2 text-left">
            <div className="flex -space-x-2">
              {postLikes.get(postId)!.slice(0, 3).map((like) => (
                <button
                  key={like.user_id}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${like.user_id}`);
                  }}
                  className="relative"
                >
                  <Avatar className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={like.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10">
                      {like.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              ))}
            </div>
            <div className="text-sm">
              <span className="text-foreground">{t('likedBy')} </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${postLikes.get(postId)![0].user_id}`);
                }}
                className="font-semibold hover:opacity-70"
              >
                {postLikes.get(postId)![0].username}
              </button>
              {item.likes_count > 1 && (
                <span className="text-foreground">
                  {' '}{t('notifications:andOthers', { count: item.likes_count - 1 })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Caption */}
        {caption && renderCaption()}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground text-left">
          {formatPostDate(createdAt, t)}
        </p>
      </div>
    </article>
  );
});

FeedPostItem.displayName = 'FeedPostItem';

export default FeedPostItem;
