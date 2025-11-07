
import { Heart, MessageCircle, Grid3X3, Trash2, Star } from 'lucide-react';
import { useState } from 'react';
import PostDetailModalMobile from '../explore/PostDetailModalMobile';
import { useOptimizedPosts } from '@/hooks/useOptimizedPosts';
import { useOptimizedProfile } from '@/hooks/useOptimizedProfile';
import { useAuth } from '@/contexts/AuthContext';
import { usePostDeletion } from '@/hooks/usePostDeletion';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Post {
  id: string;
  user_id: string;
  location_id?: string;
  caption?: string;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  saves_count: number;
  created_at: string;
  updated_at: string;
  metadata: any;
  content_type?: string;
  rating?: number;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  };
}

interface PostsGridProps {
  userId?: string;
  locationId?: string;
  contentTypes?: string[];
  excludeUserId?: string;
}

const PostsGrid = ({ userId, locationId, contentTypes, excludeUserId }: PostsGridProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useOptimizedProfile();
  const targetUserId = userId || profile?.id;
  const { posts: allPosts, loading } = useOptimizedPosts(targetUserId);
  const { deletePost, deleting } = usePostDeletion();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postFilter, setPostFilter] = useState<'photos' | 'reviews'>('photos');

  // Filter posts based on locationId, contentTypes, and excludeUserId
  const posts = allPosts.filter((post: any) => {
    // Filter by location if specified
    if (locationId && post.location_id !== locationId) return false;
    
    // Filter by content types if specified
    if (contentTypes && contentTypes.length > 0) {
      const postContentType = post.content_type;
      if (!postContentType || !contentTypes.includes(postContentType)) return false;
    }
    
    // Exclude posts from specific user if specified
    if (excludeUserId && post.user_id === excludeUserId) return false;
    
    return true;
  });

  // Separate posts by type
  const photoPosts = posts.filter((post: any) => post.media_urls && post.media_urls.length > 0);
  const reviewPosts = posts.filter((post: any) => post.rating !== null && post.rating !== undefined);

  const isOwnProfile = user?.id === targetUserId;

  console.log('PostsGrid - Current user:', user?.id, 'Target user:', targetUserId, 'Is own profile:', isOwnProfile);
  console.log('PostsGrid - Posts loaded:', posts.length);

  const handlePostClick = (postId: string) => {
    console.log('Post clicked:', postId);
    setSelectedPostId(postId);
  };

  const handleDeletePost = async (postId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    console.log('Delete post clicked:', postId);
    
    if (!confirm(t('confirmDeletePost', { ns: 'business' }))) {
      return;
    }

    try {
      console.log('Attempting to delete post:', postId);
      const result = await deletePost(postId);
      
      if (result.success) {
        console.log('Post deleted successfully');
        toast.success(t('postDeletedSuccess', { ns: 'business' }));
        // Invalidate cache per aggiornare
        const { queryClient } = await import('@/lib/queryClient');
        queryClient.invalidateQueries({ queryKey: ['posts', targetUserId] });
      } else {
        console.error('Failed to delete post:', result.error);
        toast.error(result.error?.message || t('failedDeletePost', { ns: 'business' }));
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(t('failedDeletePost', { ns: 'business' }));
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const displayedPosts = postFilter === 'photos' ? photoPosts : reviewPosts;

  return (
    <div className="px-4">
      {/* Filter Tabs */}
      <div className="flex bg-muted rounded-xl p-1 mb-4">
        <button
          onClick={() => setPostFilter('photos')}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
            postFilter === 'photos'
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          {t('posts', { ns: 'profile', defaultValue: 'Posts' })}
        </button>
        <button
          onClick={() => setPostFilter('reviews')}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
            postFilter === 'reviews'
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          {t('reviews', { ns: 'common', defaultValue: 'Reviews' })}
        </button>
      </div>

      {displayedPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            {postFilter === 'photos' ? (
              <Grid3X3 className="w-8 h-8 text-muted-foreground" />
            ) : (
              <Star className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {postFilter === 'photos' 
              ? t('noPostsYet', { ns: 'business' })
              : t('noReviewsYet', { ns: 'common', defaultValue: 'No reviews yet' })
            }
          </h3>
          <p className="text-muted-foreground text-sm">
            {isOwnProfile 
              ? postFilter === 'photos'
                ? t('startSharing', { ns: 'business' })
                : t('startReviewing', { ns: 'common', defaultValue: 'Start reviewing places' })
              : postFilter === 'photos'
                ? t('noPostsToShow', { ns: 'business' })
                : t('noReviewsToShow', { ns: 'common', defaultValue: 'No reviews to show' })
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 w-full">
          {displayedPosts.map((post) => (
            <div
              key={post.id}
              className="relative aspect-square bg-muted rounded-xl overflow-hidden cursor-pointer group hover:scale-[1.02] transition-transform duration-200"
              onClick={() => handlePostClick(post.id)}
            >
              {postFilter === 'photos' ? (
                /* Photo Post */
                <>
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
                  
                  {/* Multiple images indicator */}
                  {post.media_urls.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                      <span className="text-xs text-white font-medium">
                        +{post.media_urls.length - 1}
                      </span>
                    </div>
                  )}

                  {/* Delete button - only show for own posts */}
                  {isOwnProfile && (
                    <button
                      onClick={(e) => handleDeletePost(post.id, e)}
                      disabled={deleting}
                      className="absolute top-2 left-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-10"
                      title="Delete post"
                    >
                      {deleting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                  )}
                  
                  {/* Overlay with stats */}
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
                </>
              ) : (
                /* Review Card */
                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center p-4">
                  <Avatar className="w-12 h-12 mb-2 border-2 border-primary/20">
                    <AvatarImage src={post.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                    <span className="text-2xl font-bold text-foreground">{post.rating}</span>
                    <span className="text-sm text-muted-foreground">/10</span>
                  </div>
                  {post.caption && (
                    <p className="text-xs text-center text-muted-foreground line-clamp-3 mt-2">
                      {post.caption}
                    </p>
                  )}
                  {/* Delete button for reviews */}
                  {isOwnProfile && (
                    <button
                      onClick={(e) => handleDeletePost(post.id, e)}
                      disabled={deleting}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-10"
                      title="Delete review"
                    >
                      {deleting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedPostId && (
        <PostDetailModalMobile 
          postId={selectedPostId}
          userId={targetUserId}
          isOpen={true}
          onClose={async () => {
            setSelectedPostId(null);
            // Invalidate cache per aggiornare i contatori
            const { queryClient } = await import('@/lib/queryClient');
            queryClient.invalidateQueries({ queryKey: ['posts', targetUserId] });
          }}
        />
      )}
    </div>
  );
};

export default PostsGrid;
