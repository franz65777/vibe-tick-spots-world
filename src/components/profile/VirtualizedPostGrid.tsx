import React, { useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Heart, MessageCircle } from 'lucide-react';
import deleteIcon from '@/assets/icon-delete.png';

interface Post {
  id: string;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  caption?: string;
}

interface VirtualizedPostGridProps {
  posts: Post[];
  isOwnProfile: boolean;
  deleting: boolean;
  onPostClick: (postId: string) => void;
  onDeletePost: (postId: string, event: React.MouseEvent) => void;
}

/**
 * VirtualizedPostGrid - 60fps virtualized grid for large datasets
 * Uses @tanstack/react-virtual for row virtualization
 * Only renders visible rows + 2 overscan rows
 */

// Memoized post item for optimal performance
const PostItem = memo(({ 
  post, 
  isOwnProfile, 
  deleting, 
  onPostClick, 
  onDeletePost 
}: { 
  post: Post; 
  isOwnProfile: boolean; 
  deleting: boolean;
  onPostClick: (postId: string) => void;
  onDeletePost: (postId: string, event: React.MouseEvent) => void;
}) => (
  <div
    className="relative aspect-square bg-muted rounded-xl overflow-hidden cursor-pointer group hover:scale-[1.02] transition-transform duration-200"
    onClick={() => onPostClick(post.id)}
  >
    <img
      src={post.media_urls[0]}
      alt={post.caption || 'Post'}
      className="w-full h-full object-cover"
      loading="lazy"
      decoding="async"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = '/placeholder.svg';
      }}
    />
    {post.media_urls.length > 1 && (
      <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
        <span className="text-xs text-white font-medium">
          +{post.media_urls.length - 1}
        </span>
      </div>
    )}
    {isOwnProfile && (
      <button
        onClick={(e) => onDeletePost(post.id, e)}
        disabled={deleting}
        className="absolute top-2 left-2 w-7 h-9 bg-gray-500/90 hover:bg-gray-600 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-10"
        title="Delete post"
      >
        {deleting ? (
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <img src={deleteIcon} alt="" className="w-4 h-5" />
        )}
      </button>
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end">
      <div className="p-3 w-full">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
              <Heart className="w-3 h-3 text-white" />
              <span className="text-xs text-white font-medium">{post.likes_count}</span>
            </div>
            <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
              <MessageCircle className="w-3 h-3 text-white" />
              <span className="text-xs text-white font-medium">{post.comments_count}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
));

PostItem.displayName = 'PostItem';

const VirtualizedPostGrid = ({ 
  posts, 
  isOwnProfile, 
  deleting, 
  onPostClick, 
  onDeletePost 
}: VirtualizedPostGridProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Create rows of 2 posts each
  const rows = React.useMemo(() => {
    const result: Post[][] = [];
    for (let i = 0; i < posts.length; i += 2) {
      result.push(posts.slice(i, i + 2));
    }
    return result;
  }, [posts]);
  
  // Row virtualizer - each row is ~180px (aspect-square post + gap)
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180,
    overscan: 3,
  });

  // For small datasets (<24 posts), use regular grid for simplicity
  if (posts.length < 24) {
    return (
      <div className="grid grid-cols-2 gap-3 w-full">
        {posts.map((post) => (
          <PostItem
            key={post.id}
            post={post}
            isOwnProfile={isOwnProfile}
            deleting={deleting}
            onPostClick={onPostClick}
            onDeletePost={onDeletePost}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[60vh] overflow-auto scrollbar-hide"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
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
            {rows[virtualRow.index].map((post) => (
              <PostItem
                key={post.id}
                post={post}
                isOwnProfile={isOwnProfile}
                deleting={deleting}
                onPostClick={onPostClick}
                onDeletePost={onDeletePost}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(VirtualizedPostGrid);
