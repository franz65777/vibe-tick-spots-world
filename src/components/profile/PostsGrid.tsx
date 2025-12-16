
import { Heart, MessageCircle, Grid3X3, Star, ChevronDown, MapPin, Image, RefreshCw } from 'lucide-react';
import deleteIcon from '@/assets/icon-delete.png';
import React from 'react';
import { useState } from 'react';
import PostDetailModalMobile from '../explore/PostDetailModalMobile';
import LocationPostLibrary from '../explore/LocationPostLibrary';
import { useOptimizedPosts } from '@/hooks/useOptimizedPosts';
import { useOptimizedProfile } from '@/hooks/useOptimizedProfile';
import { useAuth } from '@/contexts/AuthContext';
import { usePostDeletion } from '@/hooks/usePostDeletion';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { getCategoryIcon, getCategoryImage } from '@/utils/categoryIcons';
import { getRatingColor, getRatingFillColor } from '@/utils/ratingColors';
import { translateCityName } from '@/utils/cityTranslations';
import { usePostEngagementCounts } from '@/hooks/usePostEngagementCounts';
import { LikersDrawer } from '@/components/social/LikersDrawer';

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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { profile } = useOptimizedProfile();
  const targetUserId = userId || profile?.id;
  const { posts: allPosts, loading } = useOptimizedPosts(targetUserId);
  const { deletePost, deleting } = usePostDeletion();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postFilter, setPostFilter] = useState<'photos' | 'reviews'>('photos');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());
  const [reviewOrder, setReviewOrder] = useState<Record<string, number>>({});
  const [likersPostId, setLikersPostId] = useState<string | null>(null);
  const [likersOpen, setLikersOpen] = useState(false);

  // Assign progressive order to reviews for each location - memoized to prevent infinite loops
  React.useEffect(() => {
    if (!allPosts || allPosts.length === 0) {
      setReviewOrder({});
      return;
    }

    const locationReviews: Record<string, any[]> = {};
    
    // Group reviews by location
    allPosts.forEach((post: any) => {
      if (post.location_id && post.rating !== null && post.rating !== undefined) {
        if (!locationReviews[post.location_id]) {
          locationReviews[post.location_id] = [];
        }
        locationReviews[post.location_id].push(post);
      }
    });

    // Sort by date and assign order
    const orderMap: Record<string, number> = {};
    Object.entries(locationReviews).forEach(([locationId, reviews]) => {
      const sorted = reviews.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      sorted.forEach((review, index) => {
        orderMap[review.id] = index + 1;
      });
    });

    // Only update if the order has actually changed
    setReviewOrder(prevOrder => {
      const hasChanged = JSON.stringify(prevOrder) !== JSON.stringify(orderMap);
      return hasChanged ? orderMap : prevOrder;
    });
  }, [allPosts.length, JSON.stringify(allPosts.map((p: any) => ({ id: p.id, created_at: p.created_at, location_id: p.location_id, rating: p.rating })))]);

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

  const photoPostIds = React.useMemo(() => {
    if (postFilter !== 'photos') return [] as string[];
    return photoPosts.map((p: any) => p.id as string);
  }, [postFilter, photoPosts]);

  const { counts: photoCounts } = usePostEngagementCounts(photoPostIds);

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
      {/* Filter Dropdown */}
      <div className="mb-4 flex justify-start">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-auto p-0 hover:bg-transparent font-semibold text-base gap-1.5 justify-start text-left"
            >
              {postFilter === 'photos' 
                ? t('posts', { ns: 'profile', defaultValue: 'Posts' })
                : t('reviews', { ns: 'leaderboard', defaultValue: 'Reviews' })
              }
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 bg-background z-50 rounded-lg">
            <DropdownMenuItem 
              onClick={() => setPostFilter('photos')}
              className="cursor-pointer focus:bg-accent flex items-center gap-2 px-2"
            >
              <Image className="w-4 h-4" />
              <span className="font-medium">{t('postsTab', { ns: 'explore', defaultValue: 'Posts' })}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setPostFilter('reviews')}
              className="cursor-pointer focus:bg-accent flex items-center gap-2 px-2"
            >
              <Star className="w-4 h-4" />
              <span className="font-medium">{t('reviewsTab', { ns: 'explore', defaultValue: 'Reviews' })}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        postFilter === 'photos' ? (
          <div className="grid grid-cols-2 gap-3 w-full">
            {displayedPosts.map((post) => (
              <div
                key={post.id}
                className="relative aspect-square bg-muted rounded-xl overflow-hidden cursor-pointer group hover:scale-[1.02] transition-transform duration-200"
                onClick={() => handlePostClick(post.id)}
              >
                {/* Photo Post */}
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
                  {post.media_urls.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                      <span className="text-xs text-white font-medium">
                        +{post.media_urls.length - 1}
                      </span>
                    </div>
                  )}
                  {isOwnProfile && (
                    <button
                      onClick={(e) => handleDeletePost(post.id, e)}
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
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 via-background/0 to-transparent flex items-end">
                    <div className="p-3 w-full">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const count = photoCounts[post.id]?.likes ?? post.likes_count ?? 0;
                              if (count > 0) {
                                setLikersPostId(post.id);
                                setLikersOpen(true);
                              }
                            }}
                            className="bg-background/40 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1"
                          >
                            <Heart className="w-3 h-3 text-foreground" />
                            <span className="text-xs text-foreground font-medium">{photoCounts[post.id]?.likes ?? post.likes_count ?? 0}</span>
                          </button>
                          <div className="bg-background/40 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-foreground" />
                            <span className="text-xs text-foreground font-medium">{photoCounts[post.id]?.comments ?? post.comments_count ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full space-y-3">
            {displayedPosts.map((post) => {
              const isExpanded = expandedCaptions.has(post.id);
              const hasMedia = post.media_urls && post.media_urls.length > 0;
              const shouldTruncate = post.caption && post.caption.length > 100;
              
              return (
                <div
                  key={post.id}
                  className={cn(
                    "relative bg-background border border-border rounded-xl p-3 animate-fade-in group",
                    hasMedia && "cursor-pointer"
                  )}
                  onClick={hasMedia ? () => handlePostClick(post.id) : undefined}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => {
                        if (post.locations) {
                          e.stopPropagation();
                          setSelectedLocation({
                            id: post.locations.id,
                            name: post.locations.name,
                            category: post.locations.category || 'restaurant',
                            city: post.locations.city,
                            coordinates: {
                              lat: post.locations.latitude,
                              lng: post.locations.longitude,
                            },
                            address: post.locations.address,
                          });
                        }
                      }}
                      className="shrink-0"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage 
                          src={getCategoryImage(post.locations?.category || 'restaurant')}
                          alt={post.locations?.category || 'restaurant'}
                          className="object-contain p-1"
                        />
                        <AvatarFallback className="bg-primary/10">
                          {(() => {
                            const CategoryIcon = getCategoryIcon(post.locations?.category || 'restaurant');
                            return <CategoryIcon className="w-5 h-5 text-primary" />;
                          })()}
                        </AvatarFallback>
                      </Avatar>
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-0 pr-12">
                        {post.locations ? (
                          <button
                            onClick={(e) => {
                              if (!hasMedia) {
                                e.stopPropagation();
                                setSelectedLocation({
                                  id: post.locations.id,
                                  name: post.locations.name,
                                  category: post.locations.category || 'restaurant',
                                  city: post.locations.city,
                                  coordinates: {
                                    lat: post.locations.latitude,
                                    lng: post.locations.longitude,
                                  },
                                  address: post.locations.address,
                                });
                              }
                            }}
                            className="font-semibold text-sm hover:opacity-70 text-left flex-1"
                          >
                            {post.locations.name}
                          </button>
                        ) : (
                          <p className="font-semibold text-sm text-muted-foreground flex-1">
                            {t('unknownLocation', { ns: 'common', defaultValue: 'Unknown Location' })}
                          </p>
                        )}

                        {post.rating && (
                          <div className="absolute top-2 right-2 flex flex-col items-end gap-0.5">
                            <div className="flex items-center gap-1">
                              {(() => {
                                const CategoryIcon = post.locations?.category ? getCategoryIcon(post.locations.category) : Star;
                                return <CategoryIcon className={cn("w-4 h-4", getRatingFillColor(post.rating), getRatingColor(post.rating))} />;
                              })()}
                              <span className={cn("text-sm font-semibold", getRatingColor(post.rating))}>{post.rating}</span>
                            </div>
                            {reviewOrder[post.id] > 1 && (
                              <div className="flex items-center gap-0.5 bg-primary/10 rounded-full px-1.5 py-0.5">
                                <RefreshCw className="w-2.5 h-2.5 text-primary" />
                                <span className="text-[10px] font-semibold text-primary">
                                  {reviewOrder[post.id]}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {post.locations && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{translateCityName(post.locations.city || 'Unknown', i18n.language)}</span>
                        </p>
                      )}

                      {post.caption && (
                        <div className="relative">
                          <p className="text-sm text-foreground text-left">
                            {isExpanded ? (
                              <span className="whitespace-pre-wrap">{post.caption}</span>
                            ) : (
                              shouldTruncate ? (
                                <>
                                  <span className="line-clamp-2">
                                    {post.caption.slice(0, 80)}...{' '}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedCaptions(prev => {
                                        const newSet = new Set(prev);
                                        newSet.add(post.id);
                                        return newSet;
                                      });
                                    }}
                                    className="text-primary hover:opacity-70 font-medium inline-block"
                                  >
                                    {t('more', { ns: 'common' })}
                                  </button>
                                </>
                              ) : (
                                <span className="line-clamp-2">{post.caption}</span>
                              )
                            )}
                          </p>
                          {isExpanded && shouldTruncate && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedCaptions(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(post.id);
                                  return newSet;
                                });
                              }}
                              className="text-xs text-primary hover:opacity-70 mt-1 font-medium"
                            >
                              {t('less', { ns: 'common' })}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {isOwnProfile && (
                    <button
                      onClick={(e) => handleDeletePost(post.id, e)}
                      disabled={deleting}
                      className="absolute top-2 right-2 w-5 h-5 bg-red-500/90 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-10"
                      title="Delete review"
                    >
                      {deleting ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <img src={deleteIcon} alt="" className="w-2.5 h-2.5" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
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

      {likersPostId && (
        <LikersDrawer
          isOpen={likersOpen}
          onClose={() => {
            setLikersOpen(false);
            setLikersPostId(null);
          }}
          postId={likersPostId}
        />
      )}

      {selectedLocation && (
        <LocationPostLibrary
          place={selectedLocation}
          isOpen={true}
          onClose={() => setSelectedLocation(null)}
        />
      )}
    </div>
  );
};

export default PostsGrid;
