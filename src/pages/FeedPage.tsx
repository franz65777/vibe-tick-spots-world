import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedFeed } from '@/hooks/useOptimizedFeed';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Star, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PostActions } from '@/components/feed/PostActions';
import { formatDistanceToNow } from 'date-fns';
import { it as itLocale, es as esLocale, enUS } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { useStories } from '@/hooks/useStories';
import StoriesViewer from '@/components/StoriesViewer';
import { getPostLikesWithUsers, PostLikeUser, getPostComments, addPostComment, deletePostComment, Comment } from '@/services/socialEngagementService';
import { useTranslation } from 'react-i18next';
import { CommentDrawer } from '@/components/social/CommentDrawer';
import { ShareModal } from '@/components/social/ShareModal';
import { messageService } from '@/services/messageService';
import { toast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useQueryClient } from '@tanstack/react-query';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { getRatingColor, getRatingFillColor } from '@/utils/ratingColors';

const FeedPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const dfnsLocale = i18n.language.startsWith('it') ? itLocale : i18n.language.startsWith('es') ? esLocale : enUS;
  
  const [feedType, setFeedType] = useState<'forYou' | 'promotions'>('forYou');
  
  // Usa React Query per feed "Per te" - post degli utenti seguiti
  const { posts: forYouFeed, loading: feedLoading } = useOptimizedFeed();
  
  // Query separata per le promozioni - carica i post marketing con content_type
  const { data: promotionsFeed = [], isLoading: promotionsLoading } = useQuery({
    queryKey: ['promotions-feed', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // Carica post marketing e includi profili business (left join), filtrando client-side
      const { data: posts, error } = await (supabase as any)
        .from('posts')
        .select(`
          *,
          profiles:user_id (id, username, avatar_url, full_name),
          locations:location_id (id, name, address, city, latitude, longitude),
          business_profiles:user_id (verification_status)
        `)
        .not('content_type', 'is', null)
        .in('content_type', ['event', 'discount', 'promotion', 'announcement'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.error('Promotions feed error:', error);
        return [];
      }
      const filtered = (posts as any[] | null) || [];
      return filtered.filter((p: any) => !!p.business_profiles);
    },
    enabled: !!user?.id && feedType === 'promotions',
    staleTime: 5 * 60 * 1000,
  });
  
  // Seleziona il feed appropriato in base al tipo
  const feedItems = feedType === 'promotions' ? promotionsFeed : forYouFeed;
  const loading = feedType === 'promotions' ? promotionsLoading : feedLoading;
  
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());
  const [storiesViewerOpen, setStoriesViewerOpen] = useState(false);
  const [selectedUserStoryIndex, setSelectedUserStoryIndex] = useState(0);
  const [filteredStories, setFilteredStories] = useState<typeof stories>([]);
  const [postLikes, setPostLikes] = useState<Map<string, PostLikeUser[]>>(new Map());
  // Comment drawer state
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  
  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  
  const { stories } = useStories();

  // Hide bottom navigation when overlays are open
  useEffect(() => {
    const isOpen = commentDrawerOpen || shareModalOpen;
    window.dispatchEvent(new CustomEvent(isOpen ? 'ui:overlay-open' : 'ui:overlay-close'));
    return () => {
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    };
  }, [commentDrawerOpen, shareModalOpen]);

  // Carica likes quando cambiano i feedItems
  useEffect(() => {
    if (!user?.id || feedItems.length === 0) return;
    
    const loadLikes = async () => {
      const likesMap = new Map<string, PostLikeUser[]>();
      await Promise.all(
        feedItems.slice(0, 10).map(async (item: any) => {
          const postId = item.id;
          const likes = await getPostLikesWithUsers(postId, user.id, 3);
          likesMap.set(postId, likes);
        })
      );
      setPostLikes(likesMap);
    };
    
    loadLikes();
  }, [feedItems, user?.id]);

  const handleAvatarClick = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Filter only this user's active (non-expired) stories
    const now = new Date().toISOString();
    const userStories = stories.filter(s => 
      s.user_id === userId && 
      new Date(s.expires_at).toISOString() > now
    );
    
    if (userStories.length > 0) {
      // Set filtered stories to only this user's stories
      setFilteredStories(userStories);
      setSelectedUserStoryIndex(0); // Always start from the first story of this user
      setStoriesViewerOpen(true);
    } else {
      navigate(`/profile/${userId}`);
    }
  };

  const handleLocationClick = (postId: string, locationId: string, latitude: number, longitude: number, locationName: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/', {
      state: {
        centerMap: {
          lat: latitude,
          lng: longitude,
          locationId: locationId,
          shouldFocus: true
        },
        openPinDetail: {
          id: locationId,
          name: locationName || '',
          lat: latitude,
          lng: longitude,
          sourcePostId: postId
        }
      }
    });
  };

  const toggleCaption = (postId: string) => {
    setExpandedCaptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleCommentClick = async (postId: string) => {
    setCommentPostId(postId);
    setCommentDrawerOpen(true);
    
    // Load comments
    const postComments = await getPostComments(postId);
    setComments(postComments);
  };

  const handleAddComment = async (content: string) => {
    if (!user?.id || !commentPostId) return;
    
    const newComment = await addPostComment(commentPostId, user.id, content);
    if (newComment) {
      setComments(prev => [...prev, newComment]);
      // Invalida cache per aggiornare count
      queryClient.invalidateQueries({ queryKey: ['feed', user.id] });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user?.id) return;
    
    const success = await deletePostComment(commentId, user.id);
    if (success) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      // Invalida cache per aggiornare count
      queryClient.invalidateQueries({ queryKey: ['feed', user.id] });
    }
  };

  const handleShareClick = (postId: string) => {
    setSharePostId(postId);
    setShareModalOpen(true);
  };

  const handleShare = async (recipientIds: string[]) => {
    if (!sharePostId) return false;
    
    const postItem = feedItems.find(item => item.id === sharePostId);
    if (!postItem) return false;

    try {
      const postData = {
        id: sharePostId,
        caption: postItem.caption,
        media_urls: postItem.media_urls || []
      };

      await Promise.all(
        recipientIds.map(recipientId => 
          messageService.sendPostShare(recipientId, postData)
        )
      );

      toast({
        title: "✅ Post condiviso!",
        description: `Condiviso con ${recipientIds.length} ${recipientIds.length === 1 ? 'persona' : 'persone'}`,
      });

      return true;
    } catch (error) {
      console.error('Error sharing post:', error);
      toast({
        title: "Error",
        description: "Failed to share post",
        variant: "destructive",
      });
      return false;
    }
  };

  const renderCaption = (caption: string | null, postId: string, username: string, userId: string) => {
    if (!caption) return null;
    const isExpanded = expandedCaptions.has(postId);
    
    const shouldTruncate = caption.length > 100;
    const moreLabel = t('more');
    const lessLabel = t('less');

    return (
      <div className="text-sm text-left">
        <span className="text-foreground">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${userId}`);
            }}
            className="font-semibold hover:opacity-70"
          >
            {username}
          </button>
          {' '}
          {isExpanded ? (
            <>
              <span className="whitespace-pre-wrap">{caption}</span>
              {' '}
              {shouldTruncate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCaption(postId);
                  }}
                  className="text-muted-foreground hover:text-foreground font-medium"
                >
                  {lessLabel}
                </button>
              )}
            </>
          ) : (
            <span className="line-clamp-2 inline">
              {shouldTruncate ? (
                <>
                  {caption}{' '}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCaption(postId);
                    }}
                    className="text-muted-foreground hover:text-foreground font-medium"
                  >
                    {moreLabel}
                  </button>
                </>
              ) : (
                caption
              )}
            </span>
          )}
        </span>
      </div>
    );
  };


  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background shadow-sm shrink-0">
          <div className="px-4 py-3 flex justify-start">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="h-auto p-0 hover:bg-transparent font-bold text-lg gap-1.5 -ml-2 justify-start text-left"
                >
                  {feedType === 'forYou' ? t('forYou') : t('promotions')}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-background z-50">
                <DropdownMenuItem 
                  onClick={() => setFeedType('forYou')}
                  className="cursor-pointer focus:bg-accent"
                >
                  <div className="flex flex-col py-1">
                    <span className="font-semibold">{t('forYou')}</span>
                    <span className="text-xs text-muted-foreground">{t('forYouDesc')}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setFeedType('promotions')}
                  className="cursor-pointer focus:bg-accent"
                >
                  <div className="flex flex-col py-1">
                    <span className="font-semibold">{t('promotions')}</span>
                    <span className="text-xs text-muted-foreground">{t('promotionsDesc')}</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Feed Content */}
        <div className="flex-1 overflow-y-scroll pb-24 scrollbar-hide bg-background">
          {feedItems.length === 0 && loading ? (
            <div className="py-4">
              {[1,2,3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center gap-3 px-3 py-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="aspect-square w-full" />
                </div>
              ))}
            </div>
           ) : feedItems.length === 0 ? (
            <div className="text-center py-12 px-4 text-muted-foreground">
              <p className="mb-2">{t('feedEmpty')}</p>
              <p className="text-sm">{t('startFollowing')}</p>
              <Button
                onClick={() => navigate('/explore')}
                variant="link"
                className="mt-4"
              >
                {t('exploreUsers')}
              </Button>
            </div>
           ) : (
            <div className="space-y-0 bg-background">
              {feedItems.map((item) => {
              const profile = item.profiles as any;
              const username = profile?.username || 'Unknown';
              const avatarUrl = profile?.avatar_url;
              const userId = item.user_id;
              const postId = item.id;
              const mediaUrls = item.media_urls || [];
              const hasMultipleMedia = mediaUrls.length > 1;
              const userHasStory = stories.some(s => s.user_id === userId);
              const location = item.locations as any;
              const locationName = location?.name;
              const locationId = item.location_id;
              const caption = item.caption;
              const rating = item.rating;
              const createdAt = item.created_at;

              return (
                <article key={item.id} className="post-compact bg-background">
                  {/* Post Header */}
                  <div className="post-compact-header flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button 
                        onClick={(e) => handleAvatarClick(userId, e)}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${userId}`);
                          }}
                          className="font-semibold text-sm hover:opacity-70 block truncate text-left"
                        >
                          {username}
                        </button>
                        {locationName && locationId && location?.latitude && location?.longitude && (
                          <button
                            onClick={(e) => handleLocationClick(postId, locationId, location.latitude, location.longitude, locationName, e)}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 truncate"
                          >
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{locationName}</span>
                          </button>
                        )}
                      </div>
                    </div>
                    {rating && rating > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        {(() => {
                          const CategoryIcon = location?.category ? getCategoryIcon(location.category) : Star;
                          return <CategoryIcon className={cn("w-4 h-4", getRatingFillColor(rating), getRatingColor(rating))} />;
                        })()}
                        <span className={cn("text-sm font-semibold", getRatingColor(rating))}>{rating}</span>
                      </div>
                    )}
                  </div>

                  {/* Post Media */}
                  {mediaUrls.length > 0 && (
                    <div className="post-compact-media relative">
                      {hasMultipleMedia ? (
                        <Carousel className="w-full" gutter={false}>
                          <CarouselContent className="-ml-0">
                            {mediaUrls.map((url, idx) => {
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
                          <CarouselPrevious className="left-2" />
                          <CarouselNext className="right-2" />
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
                          {mediaUrls.map((_, idx) => (
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
                      onCommentClick={() => handleCommentClick(postId)}
                      onShareClick={() => handleShareClick(postId)}
                    />

                    {/* Likes Section */}
                    {item.likes_count > 0 && (
                      <div className="flex items-center gap-2 text-left">
                        {postLikes.get(postId) && postLikes.get(postId)!.length > 0 && (
                          <>
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
                          </>
                        )}
                      </div>
                    )}

                    {/* Caption */}
                    {caption && renderCaption(caption, item.id, username, userId)}

                     {/* Timestamp */}
                    <p className="text-xs text-muted-foreground uppercase text-left">
                      {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: dfnsLocale })}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        </div>

        {/* Comment Drawer */}
        <CommentDrawer
          isOpen={commentDrawerOpen}
          onClose={() => {
            setCommentDrawerOpen(false);
            setCommentPostId(null);
            setComments([]);
          }}
          comments={comments}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
        />

        {/* Share Modal */}
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSharePostId(null);
          }}
          onShare={handleShare}
          postId={sharePostId || undefined}
        />

        {/* Stories Viewer */}
        {storiesViewerOpen && filteredStories.length > 0 && (
          <StoriesViewer
            stories={filteredStories.map((s) => ({
              id: s.id,
              userId: s.user_id,
              userName: 'User',
              userAvatar: '',
              mediaUrl: s.media_url,
              mediaType: s.media_type as 'image' | 'video',
              locationId: s.location_id || '',
              locationName: s.location_name || '',
              locationAddress: s.location_address || '',
              timestamp: s.created_at,
              isViewed: false
            }))}
            initialStoryIndex={selectedUserStoryIndex}
            onClose={() => {
              setStoriesViewerOpen(false);
              setFilteredStories([]);
            }}
            onStoryViewed={() => {}}
          />
        )}
      </div>
    </div>
  );
};

export default FeedPage;
