import { memo } from 'react';

/**
 * Shimmer skeleton that mimics the exact structure of FeedPostItem
 * Shows immediately while feed data is loading
 */
const FeedPostSkeleton = memo(() => {
  return (
    <article className="post-compact bg-background">
      {/* Header skeleton */}
      <div className="post-compact-header flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="h-10 w-10 rounded-full bg-muted shimmer-skeleton" />
          
          <div className="flex-1 min-w-0 space-y-2">
            {/* Username */}
            <div className="h-4 w-28 bg-muted rounded shimmer-skeleton" />
            {/* Location */}
            <div className="h-3 w-36 bg-muted rounded shimmer-skeleton" />
          </div>
        </div>
        
        {/* Rating placeholder */}
        <div className="h-5 w-12 bg-muted rounded shimmer-skeleton" />
      </div>

      {/* Media skeleton - aspect square */}
      <div className="post-compact-media relative">
        <div className="aspect-square w-full bg-muted shimmer-skeleton" />
      </div>

      {/* Actions skeleton */}
      <div className="post-compact-actions space-y-2">
        {/* Action buttons row */}
        <div className="flex items-center gap-1.5 pt-1">
          {/* Like */}
          <div className="h-9 w-12 bg-muted rounded-lg shimmer-skeleton" />
          {/* Comment */}
          <div className="h-9 w-14 bg-muted rounded-lg shimmer-skeleton" />
          {/* Share */}
          <div className="h-9 w-14 bg-muted rounded-lg shimmer-skeleton" />
          {/* Pin - right aligned */}
          <div className="ml-auto h-9 w-9 bg-muted rounded-lg shimmer-skeleton" />
        </div>
        
        {/* Caption skeleton */}
        <div className="space-y-1.5 mt-2">
          <div className="h-4 w-full bg-muted rounded shimmer-skeleton" />
          <div className="h-4 w-3/4 bg-muted rounded shimmer-skeleton" />
        </div>
        
        {/* Timestamp */}
        <div className="h-3 w-16 bg-muted rounded shimmer-skeleton mt-1" />
      </div>
    </article>
  );
});

FeedPostSkeleton.displayName = 'FeedPostSkeleton';

export default FeedPostSkeleton;
