import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Star, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatPostDate } from '@/utils/dateFormatter';
import { useNavigate } from 'react-router-dom';
import { CommentDrawer } from '@/components/social/CommentDrawer';
import { ShareModal } from '@/components/social/ShareModal';
import { PostActions } from '@/components/feed/PostActions';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { getPostComments, addPostComment, deletePostComment, sharePost, type Comment } from '@/services/socialEngagementService';
import { useTranslation } from 'react-i18next';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { getRatingColor, getRatingFillColor } from '@/utils/ratingColors';
import { cn } from '@/lib/utils';

interface PostDetailModalMobileProps {
  postId: string;
  locationId?: string;
  userId?: string;
  isOpen: boolean;
  onClose: () => void;
  showBackButton?: boolean;
  backLabel?: string;
  initialPosts?: any[]; // Pre-loaded posts for instant display
}

interface PostData {
  id: string;
  user_id: string;
  caption: string | null;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  saves_count: number;
  shares_count: number;
  rating: number | null;
  created_at: string;
  location_id: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  locations?: {
    id: string;
    name: string;
    category: string;
    city: string;
    latitude: number;
    longitude: number;
  } | null;
}

export const PostDetailModalMobile = ({ postId, locationId, userId, isOpen, onClose, showBackButton, backLabel, initialPosts }: PostDetailModalMobileProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [expandedCaptions, setExpandedCaptions] = useState<{ [key: string]: boolean }>({});
  // Use ref instead of state to avoid infinite re-render loops when carousel calls setApi
  const carouselApisRef = useRef<Record<string, any>>({});
  const [currentMediaIndexes, setCurrentMediaIndexes] = useState<Record<string, number>>({});
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && postId) {
      // If we have pre-loaded posts (from profile grid), use them instantly
      if (initialPosts && initialPosts.length > 0) {
        // Transform to match PostData format
        const formattedPosts = initialPosts.map(post => ({
          id: post.id,
          user_id: post.user_id,
          caption: post.caption,
          media_urls: post.media_urls || [],
          likes_count: post.likes_count || 0,
          comments_count: post.comments_count || 0,
          saves_count: post.saves_count || 0,
          shares_count: post.shares_count || 0,
          rating: post.rating,
          created_at: post.created_at,
          location_id: post.location_id,
          profiles: post.profiles || { username: 'User', avatar_url: null },
          locations: post.locations || null,
        })) as PostData[];
        
        // Reorder with clicked post in context
        const initialPostIndex = formattedPosts.findIndex(p => p.id === postId);
        if (initialPostIndex !== -1) {
          const newerPosts = formattedPosts.slice(0, initialPostIndex);
          const clickedPost = formattedPosts[initialPostIndex];
          const olderPosts = formattedPosts.slice(initialPostIndex + 1);
          setPosts([...newerPosts, clickedPost, ...olderPosts]);
        } else {
          setPosts(formattedPosts);
        }
        setLoading(false);
        return;
      }
      // Fallback: load from network (for other entry points)
      loadPostData();
    }
  }, [isOpen, postId]);

  // Scroll to the clicked post after loading
  useEffect(() => {
    if (!loading && posts.length > 0 && scrollContainerRef.current) {
      const clickedPostIndex = posts.findIndex(p => p.id === postId);
      if (clickedPostIndex !== -1) {
        const postElement = scrollContainerRef.current.querySelector(`[data-post-id="${postId}"]`);
        if (postElement) {
          setTimeout(() => {
            // Get the header height (sticky header with safe area)
            const header = scrollContainerRef.current?.querySelector('.sticky');
            const headerHeight = header?.getBoundingClientRect().height || 60;
            
            // Calculate offset to account for sticky header
            const elementTop = postElement.getBoundingClientRect().top;
            const containerTop = scrollContainerRef.current?.getBoundingClientRect().top || 0;
            const currentScroll = scrollContainerRef.current?.scrollTop || 0;
            const targetScroll = currentScroll + (elementTop - containerTop) - headerHeight;
            
            scrollContainerRef.current?.scrollTo({
              top: Math.max(0, targetScroll),
              behavior: 'instant'
            });
          }, 100);
        }
      }
    }
  }, [loading, posts, postId]);

  const loadSinglePost = async () => {
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .maybeSingle();

    if (postError) throw postError;
    if (!postData) throw new Error('Post not found');

    const { data: profileData } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', postData.user_id)
      .single();

    let locationData = null;
    if (postData.location_id) {
      const { data: locData } = await supabase
        .from('locations')
        .select('id, name, category, city, latitude, longitude')
        .eq('id', postData.location_id)
        .single();
      locationData = locData;
    }
    
    setPosts([{ ...postData, profiles: profileData, locations: locationData }] as any);
  };

  const loadPostData = async () => {
    try {
      if (locationId) {
        // Load all posts for this location
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('location_id', locationId)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        // If for some reason there are no posts for this location, fall back to single post load
        if (!postsData || postsData.length === 0) {
          console.warn('No posts found for location, falling back to single post load', { locationId, postId });
          await loadSinglePost();
          return;
        }

        // Load profiles and locations for all posts
        const postsWithProfiles = await Promise.all(
          postsData.map(async (post) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', post.user_id)
              .single();

            const { data: locData } = await supabase
              .from('locations')
              .select('id, name, category, city, latitude, longitude')
              .eq('id', post.location_id)
              .single();

            return {
              ...post,
              profiles: profileData,
              locations: locData,
            };
          })
        );

        // Organize posts: clicked post in the middle of its chronological context
        const initialPostIndex = postsWithProfiles.findIndex(p => p.id === postId);
        if (initialPostIndex !== -1) {
          // Posts more recent than the clicked one (already DESC from DB)
          const newerPosts = postsWithProfiles.slice(0, initialPostIndex);
          const clickedPost = postsWithProfiles[initialPostIndex];
          // Posts older than the clicked one
          const olderPosts = postsWithProfiles.slice(initialPostIndex + 1);
          
          // Order: newer posts (most recent first), clicked post, then older posts
          const reorderedPosts = [...newerPosts, clickedPost, ...olderPosts];
          setPosts(reorderedPosts as any);
        } else {
          setPosts(postsWithProfiles as any);
        }
      } else if (userId) {
        // Load all photo/video posts for this user (exclude pure reviews)
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        // Keep only posts that have media (photos/videos)
        const mediaPostsData = (postsData || []).filter((post: any) =>
          Array.isArray(post.media_urls) && post.media_urls.length > 0
        );

        // If for some reason there are no media posts for this user, fall back to single post load
        if (!mediaPostsData || mediaPostsData.length === 0) {
          console.warn('No media posts found for user, falling back to single post load', { userId, postId });
          await loadSinglePost();
          return;
        }

        const postsWithProfiles = await Promise.all(
          mediaPostsData.map(async (post) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', post.user_id)
              .single();

            const { data: locData } = await supabase
              .from('locations')
              .select('id, name, category, city, latitude, longitude')
              .eq('id', post.location_id)
              .single();

            return {
              ...post,
              profiles: profileData,
              locations: locData,
            };
          })
        );

        // Organize posts: clicked post in the middle of its chronological context
        const initialPostIndex = postsWithProfiles.findIndex(p => p.id === postId);
        if (initialPostIndex !== -1) {
          // Posts more recent than the clicked one (already DESC from DB)
          const newerPosts = postsWithProfiles.slice(0, initialPostIndex);
          const clickedPost = postsWithProfiles[initialPostIndex];
          // Posts older than the clicked one
          const olderPosts = postsWithProfiles.slice(initialPostIndex + 1);
          
          // Order: newer posts (most recent first), clicked post, then older posts
          const reorderedPosts = [...newerPosts, clickedPost, ...olderPosts];
          setPosts(reorderedPosts as any);
        } else {
          setPosts(postsWithProfiles as any);
        }
      } else {
        // Load a single post by id
        await loadSinglePost();
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleCommentClick = async () => {
    setCommentsLoading(true);
    setCommentsDrawerOpen(true);
    const postComments = await getPostComments(postId);
    setComments(postComments);
    setCommentsLoading(false);
  };

  const bumpLocalPostCount = (targetPostId: string, field: 'comments_count' | 'shares_count', delta: number) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === targetPostId
          ? { ...p, [field]: Math.max(0, ((p as any)[field] || 0) + delta) }
          : p
      )
    );
  };

  const handleAddComment = async (content: string, targetPostId: string) => {
    if (!user?.id) return;
    const newComment = await addPostComment(
      targetPostId,
      user.id,
      content,
      t('comments.added', 'Commento aggiunto'),
      t('comments.addFailed', 'Impossibile aggiungere il commento'),
      t('comments.emptyError', 'Il commento non può essere vuoto')
    );
    if (newComment) {
      setComments(prev => [...prev, newComment]);
      bumpLocalPostCount(targetPostId, 'comments_count', 1);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user?.id) return;
    const success = await deletePostComment(
      commentId,
      user.id,
      t('comments.deleted', 'Commento eliminato'),
      t('comments.deleteFailed', 'Impossibile eliminare il commento')
    );
    if (success) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      bumpLocalPostCount(postId, 'comments_count', -1);
    }
  };

  const handleLocationClick = (e: React.MouseEvent, post: PostData) => {
    e.stopPropagation();
    if (!post?.locations) return;
    onClose();
    navigate('/', {
      state: {
        centerMap: {
          lat: post.locations.latitude,
          lng: post.locations.longitude,
          locationId: post.locations.id,
          shouldFocus: true
        },
        openPinDetail: {
          id: post.locations.id,
          name: post.locations.name,
          lat: post.locations.latitude,
          lng: post.locations.longitude,
          category: post.locations.category || 'restaurant',
          sourcePostId: post.id
        }
      }
    });
  };

  const renderCaption = (post: PostData) => {
    if (!post?.caption) return null;
    const caption = post.caption;
    const username = post.profiles.username;
    const userId = post.user_id;
    const isExpanded = expandedCaptions[post.id] || false;
    
    const firstLine = caption.split('\n')[0];
    const MAX_LENGTH = 80;
    const hasMultipleLines = caption.trim().length > firstLine.trim().length;
    const firstLineIsTooLong = firstLine.length > MAX_LENGTH;
    const hasMoreContent = hasMultipleLines || firstLineIsTooLong;
    
    const displayFirstLine = firstLineIsTooLong && !isExpanded 
      ? firstLine.substring(0, MAX_LENGTH)
      : firstLine;

    return (
      <div className="text-sm text-left">
        <span className="text-foreground">
          <span className="inline">
            {isExpanded ? (
              <>
                <span className="whitespace-pre-wrap">{caption}</span>
                {' '}
                {hasMoreContent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCaptions(prev => ({ ...prev, [post.id]: false }));
                    }}
                    className="text-muted-foreground hover:text-foreground font-medium"
                  >
                    meno
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
                      setExpandedCaptions(prev => ({ ...prev, [post.id]: true }));
                    }}
                    className="text-muted-foreground hover:text-foreground font-medium"
                  >
                    altro
                  </button>
                )}
              </>
            )}
          </span>
        </span>
      </div>
    );
  };

  if (!isOpen) return null;

  // Use Portal to escape stacking context and render above everything
  const modalContent = loading || posts.length === 0 ? (
    <div className="fixed inset-0 z-[2147483647] bg-background overflow-y-auto scrollbar-hide">
      {/* Skeleton Header with iOS safe area */}
      <div 
        className="bg-background sticky top-0 z-50 flex items-center px-4 py-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-muted rounded shimmer-skeleton" />
          <div className="h-5 w-20 bg-muted rounded shimmer-skeleton" />
        </div>
      </div>
      
      {/* Skeleton Post */}
      <article className="post-compact pb-2">
        <div className="post-compact-header flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 rounded-full bg-muted shimmer-skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 bg-muted rounded shimmer-skeleton" />
            <div className="h-3 w-36 bg-muted rounded shimmer-skeleton" />
          </div>
        </div>
        <div className="aspect-square w-full bg-muted shimmer-skeleton" />
        <div className="px-4 py-3 space-y-3">
          <div className="flex gap-2">
            <div className="h-9 w-14 bg-muted rounded-lg shimmer-skeleton" />
            <div className="h-9 w-16 bg-muted rounded-lg shimmer-skeleton" />
            <div className="h-9 w-12 bg-muted rounded-lg shimmer-skeleton" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-muted rounded shimmer-skeleton" />
            <div className="h-3 w-3/4 bg-muted rounded shimmer-skeleton" />
          </div>
        </div>
      </article>
    </div>
  ) : (

    <>
      <div ref={scrollContainerRef} className="fixed inset-0 z-[2147483647] bg-background overflow-y-auto scrollbar-hide">
        {/* Header with iOS safe area */}
        <div 
          className="bg-background sticky top-0 z-50 flex items-center px-4 py-3"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
          }}
        >
          {(locationId || userId || showBackButton) && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span className="font-semibold">
                {backLabel || (locationId ? t('location', { ns: 'common' }) : t('profile', { ns: 'common' }))}
              </span>
            </button>
          )}
        </div>

        {posts.map((post, index) => {
          const hasMultipleMedia = post.media_urls.length > 1;
          
          return (
            <article key={post.id} data-post-id={post.id} className="post-compact pb-2">
              {/* Header */}
              <div className="post-compact-header flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                      navigate(`/profile/${post.user_id}`);
                    }}
                    className="shrink-0"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.profiles.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {post.profiles.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="flex-1 min-w-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        navigate(`/profile/${post.user_id}`);
                      }}
                      className="font-semibold text-sm hover:opacity-70 block truncate text-left"
                    >
                      {post.profiles.username}
                    </button>
                    {post.locations && (
                      <button
                        onClick={(e) => handleLocationClick(e, post)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 truncate"
                      >
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{post.locations.name}</span>
                      </button>
                    )}
                  </div>
                </div>
                {post.rating && post.rating > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    {(() => {
                      const CategoryIcon = post.locations?.category ? getCategoryIcon(post.locations.category) : Star;
                      return <CategoryIcon className={cn("w-4 h-4", getRatingFillColor(post.rating), getRatingColor(post.rating))} />;
                    })()}
                    <span className={cn("text-sm font-semibold", getRatingColor(post.rating))}>{post.rating}</span>
                  </div>
                )}
              </div>

              {/* Media */}
              {post.media_urls.length > 0 && (
                <div className="post-compact-media relative">
                  {hasMultipleMedia ? (
                    <Carousel 
                      className="w-full" 
                      gutter={false}
                      setApi={(api) => {
                        // Store in ref to avoid re-render loops
                        if (api && carouselApisRef.current[post.id] !== api) {
                          carouselApisRef.current[post.id] = api;
                          api.on('select', () => {
                            setCurrentMediaIndexes(prev => ({ 
                              ...prev, 
                              [post.id]: api.selectedScrollSnap() 
                            }));
                          });
                        }
                      }}
                    >
                      <CarouselContent className="-ml-0">
                        {post.media_urls.map((url, idx) => {
                          const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm');
                          return (
                            <CarouselItem key={idx} className="pl-0">
                              <div className="aspect-square w-full">
                                {isVideo ? (
                                  <video
                                    src={url}
                                    className="w-full h-full object-cover"
                                    controls
                                    playsInline
                                    loop
                                  />
                                ) : (
                                  <img
                                    src={url}
                                    alt={`Post ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                            </CarouselItem>
                          );
                        })}
                      </CarouselContent>
                      {/* Dots Indicators */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                        {post.media_urls.map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              idx === (currentMediaIndexes[post.id] || 0)
                                ? 'bg-white w-2' 
                                : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </Carousel>
                  ) : (() => {
                    const isVideo = post.media_urls[0].includes('.mp4') || post.media_urls[0].includes('.mov') || post.media_urls[0].includes('.webm');
                    return (
                      <div className="aspect-square w-full">
                        {isVideo ? (
                          <video
                            src={post.media_urls[0]}
                            className="w-full h-full object-cover"
                            controls
                            playsInline
                            loop
                          />
                        ) : (
                          <img
                            src={post.media_urls[0]}
                            alt="Post"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Actions and Content */}
              <div className="post-compact-actions space-y-2.5">
                {/* Caption - moved above actions */}
                {post.caption && renderCaption(post)}

                <PostActions
                  postId={post.id}
                  likesCount={post.likes_count || 0}
                  commentsCount={post.comments_count || 0}
                  sharesCount={post.shares_count || 0}
                  locationId={post.location_id}
                  locationName={post.locations?.name}
                  onCommentClick={handleCommentClick}
                  onShareClick={() => setShareOpen(true)}
                />

                {/* Timestamp (same style as feed) */}
                <p className="text-xs text-muted-foreground text-left mt-0">
                  {formatPostDate(post.created_at, t, i18n.language)}
                </p>
              </div>
            </article>
          );
        })}

        {/* Bottom padding for safe scrolling */}
        <div className="h-20" />
      </div>

      {/* Comment Drawer */}
      <CommentDrawer
        isOpen={commentsDrawerOpen}
        onClose={() => {
          setCommentsDrawerOpen(false);
          setComments([]);
          setCommentsLoading(false);
        }}
        comments={comments}
        onAddComment={(content) => handleAddComment(content, postId)}
        onDeleteComment={handleDeleteComment}
        isLoading={commentsLoading}
      />

      {/* Share Modal */}
      {posts.length > 0 && (
        <ShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          onShare={async (recipientIds) => {
            if (!user?.id) return false;
            const ok = await sharePost(posts[0].id, user.id, recipientIds);
            if (ok) bumpLocalPostCount(posts[0].id, 'shares_count', 1);
            return ok;
          }}
          postId={posts[0].id}
        />
      )}
    </>
  );

  return createPortal(modalContent, document.body);
};

export default PostDetailModalMobile;
