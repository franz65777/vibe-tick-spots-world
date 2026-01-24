import React, { useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { getRatingColor, getRatingFillColor } from '@/utils/ratingColors';

interface Post {
  id: string;
  user_id: string;
  caption: string | null;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  saves_count: number;
  created_at: string;
  metadata: any;
  rating?: number;
  profiles?: {
    username: string;
    avatar_url: string;
  } | null;
}

interface VirtualizedPostGridProps {
  posts: Post[];
  loading: boolean;
  onPostSelect: (postId: string) => void;
  category?: string;
  locale?: any;
}

// Memoized Post Item for better performance
const PostGridItem = memo(({ 
  post, 
  onSelect 
}: { 
  post: Post; 
  onSelect: (id: string) => void;
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onSelect(post.id);
    }}
    className="relative block aspect-square rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="absolute inset-0">
      <img 
        src={post.media_urls[0]} 
        alt="Post image" 
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute top-2 left-2">
        <Avatar className="w-8 h-8 border-2 border-white shadow-lg">
          <AvatarImage src={post.profiles?.avatar_url} />
          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
            {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
      {post.media_urls.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium">
          +{post.media_urls.length - 1}
        </div>
      )}
      {post.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2.5">
          <p className="text-xs text-white line-clamp-2 leading-relaxed">
            {post.caption}
          </p>
        </div>
      )}
    </div>
  </button>
));

PostGridItem.displayName = 'PostGridItem';

// Memoized Review Item
const ReviewItem = memo(({ 
  post, 
  category,
  locale
}: { 
  post: Post; 
  category?: string;
  locale?: any;
}) => {
  const CategoryIconComponent = category ? getCategoryIcon(category) : Star;
  
  return (
    <div className="flex gap-3 pb-4 border-b border-border last:border-0">
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarImage src={post.profiles?.avatar_url || ''} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-sm">{post.profiles?.username || 'User'}</p>
          <div className="flex items-center gap-1">
            <CategoryIconComponent className={cn("w-4 h-4", getRatingFillColor(post.rating), getRatingColor(post.rating))} />
            <span className={cn("text-sm font-medium", getRatingColor(post.rating))}>{post.rating}</span>
          </div>
        </div>
        {post.caption && (
          <p className="text-sm text-muted-foreground mb-1 text-left">{post.caption}</p>
        )}
        <p className="text-xs text-muted-foreground text-left">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale })}
        </p>
      </div>
    </div>
  );
});

ReviewItem.displayName = 'ReviewItem';

// Virtualized Grid for Posts (2 columns)
export const VirtualizedPostGrid = memo(({ 
  posts, 
  loading, 
  onPostSelect 
}: VirtualizedPostGridProps) => {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Calculate rows (2 posts per row)
  const rowCount = Math.ceil(posts.length / 2);
  
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180, // Estimated row height (aspect-square + gap)
    overscan: 3,
  });

  if (loading && posts.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
          <Camera className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          {t('noPosts', { ns: 'explore', defaultValue: 'No posts yet' })}
        </p>
      </div>
    );
  }

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div 
      ref={parentRef} 
      className="h-full overflow-y-auto px-4 py-4"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const rowIndex = virtualRow.index;
          const firstPost = posts[rowIndex * 2];
          const secondPost = posts[rowIndex * 2 + 1];
          
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid grid-cols-2 gap-3 pb-3"
            >
              {firstPost && (
                <PostGridItem post={firstPost} onSelect={onPostSelect} />
              )}
              {secondPost && (
                <PostGridItem post={secondPost} onSelect={onPostSelect} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualizedPostGrid.displayName = 'VirtualizedPostGrid';

// Virtualized List for Reviews
export const VirtualizedReviewList = memo(({ 
  posts, 
  loading, 
  category,
  locale
}: Omit<VirtualizedPostGridProps, 'onPostSelect'>) => {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated review item height
    overscan: 5,
  });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
          <Star className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          {t('noReviewsYet', { ns: 'common', defaultValue: 'No reviews yet' })}
        </p>
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div 
      ref={parentRef} 
      className="h-full overflow-y-auto px-4 py-4"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const post = posts[virtualItem.index];
          
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ReviewItem post={post} category={category} locale={locale} />
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualizedReviewList.displayName = 'VirtualizedReviewList';

export default VirtualizedPostGrid;
