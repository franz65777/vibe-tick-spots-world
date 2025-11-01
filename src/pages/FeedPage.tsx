import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserFeed, FeedItem } from '@/services/feedService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Star, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PostDetailModal from '@/components/explore/PostDetailModal';
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

const FeedPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dfnsLocale = i18n.language.startsWith('it') ? itLocale : i18n.language.startsWith('es') ? esLocale : enUS;
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());
  const [storiesViewerOpen, setStoriesViewerOpen] = useState(false);
  const [selectedUserStoryIndex, setSelectedUserStoryIndex] = useState(0);
  const [postLikes, setPostLikes] = useState<Map<string, PostLikeUser[]>>(new Map());
  const [feedType, setFeedType] = useState<'forYou' | 'promotions'>('forYou');
  
  // Comment drawer state
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  
  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  
  const { stories } = useStories();

  // Hide bottom navigation when overlays (comments/share) are open
  useEffect(() => {
    const isOpen = commentDrawerOpen || shareModalOpen;
    window.dispatchEvent(new CustomEvent(isOpen ? 'ui:overlay-open' : 'ui:overlay-close'));
    return () => {
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    };
  }, [commentDrawerOpen, shareModalOpen]);

  const loadFeed = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const allItems = await getUserFeed(user.id);
      
      // Filter based on feed type - inversed logic
      const items = feedType === 'promotions' 
        ? allItems.filter(item => item.is_business_post === true)
        : allItems.filter(item => item.is_business_post === false || item.is_business_post == null);
      
      setFeedItems(items);
      
      // Load likes for each post
      const likesMap = new Map<string, PostLikeUser[]>();
      await Promise.all(
        items.map(async (item) => {
          const postId = item.post_id || item.id;
          const likes = await getPostLikesWithUsers(postId, user.id, 3);
          likesMap.set(postId, likes);
        })
      );
      setPostLikes(likesMap);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadFeed();

      // Set up polling for new content
      const pollInterval = setInterval(() => {
        loadFeed();
      }, 30000);

      // Set up realtime subscription
      const channel = supabase
        .channel('feed_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'posts'
          },
          () => {
            loadFeed();
          }
        )
        .subscribe();

      return () => {
        clearInterval(pollInterval);
        channel.unsubscribe();
      };
    }
  }, [user?.id, feedType]);

  const handleAvatarClick = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const userStories = stories
      .filter(s => s.user_id === userId)
      .map((s, idx) => ({
        id: s.id,
        userId: s.user_id,
        userName: 'User', // Will be populated from profile
        userAvatar: '',
        mediaUrl: s.media_url,
        mediaType: s.media_type as 'image' | 'video',
        locationId: s.location_id || '',
        locationName: s.location_name || '',
        locationAddress: s.location_address || '',
        timestamp: s.created_at,
        isViewed: false
      }));
    
    if (userStories.length > 0) {
      setSelectedUserStoryIndex(0);
      setStoriesViewerOpen(true);
    } else {
      navigate(`/profile/${userId}`);
    }
  };

  const handleLocationClick = (locationId: string, latitude: number, longitude: number, locationName: string | null, e: React.MouseEvent) => {
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
          lng: longitude
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
      
      // Update comment count in feed
      setFeedItems(prev => prev.map(item => {
        const itemPostId = item.post_id || item.id;
        if (itemPostId === commentPostId) {
          return { ...item, comments_count: (item.comments_count || 0) + 1 };
        }
        return item;
      }));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user?.id) return;
    
    const success = await deletePostComment(commentId, user.id);
    if (success) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      
      // Update comment count in feed
      if (commentPostId) {
        setFeedItems(prev => prev.map(item => {
          const itemPostId = item.post_id || item.id;
          if (itemPostId === commentPostId) {
            return { ...item, comments_count: Math.max(0, (item.comments_count || 0) - 1) };
          }
          return item;
        }));
      }
    }
  };

  const handleShareClick = (postId: string) => {
    setSharePostId(postId);
    setShareModalOpen(true);
  };

  const handleShare = async (recipientIds: string[]) => {
    if (!sharePostId) return false;
    
    const postItem = feedItems.find(item => (item.post_id || item.id) === sharePostId);
    if (!postItem) return false;

    try {
      const postData = {
        id: sharePostId,
        caption: postItem.content,
        media_urls: postItem.media_urls || (postItem.media_url ? [postItem.media_url] : [])
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

    const firstLine = caption.split('\n')[0];
    const MAX_FIRST_LINE_LENGTH = 80;
    
    // Show "altro/meno" if there are multiple lines OR if first line is too long
    const hasMultipleLines = caption.trim().length > firstLine.trim().length;
    const firstLineIsTooLong = firstLine.length > MAX_FIRST_LINE_LENGTH;
    const hasMoreContent = hasMultipleLines || firstLineIsTooLong;
    
    // Truncate first line for display
    const displayFirstLine = firstLineIsTooLong && !isExpanded 
      ? firstLine.substring(0, MAX_FIRST_LINE_LENGTH)
      : firstLine;

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
          <span className="inline">
            {isExpanded ? (
              <>
                <span className="whitespace-pre-wrap">{caption}</span>
                {' '}
                {hasMoreContent && (
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
              <>
                <span>{displayFirstLine}</span>
                {hasMoreContent && '... '}
                {hasMoreContent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCaption(postId);
                    }}
                    className="text-muted-foreground hover:text-foreground font-medium"
                  >
                    {moreLabel}
                  </button>
                )}
              </>
            )}
          </span>
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-screen-sm mx-auto space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center gap-3 p-3">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-sm mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background shadow-sm">
          <div className="px-4 py-3 flex justify-start">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="h-auto p-0 hover:bg-transparent font-bold text-lg gap-1.5 -ml-2 justify-start text-left"
                >
                  {feedType === 'forYou' ? t('promotions') : t('forYou')}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-background z-50">
                <DropdownMenuItem 
                  onClick={() => setFeedType('forYou')}
                  className="cursor-pointer focus:bg-accent"
                >
                  <div className="flex flex-col py-1">
                    <span className="font-semibold">{t('promotions')}</span>
                    <span className="text-xs text-muted-foreground">
                      {i18n.language.startsWith('it') ? 'Post marketing business' : 
                       i18n.language.startsWith('es') ? 'Posts de marketing' : 
                       'Business marketing posts'}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setFeedType('promotions')}
                  className="cursor-pointer focus:bg-accent"
                >
                  <div className="flex flex-col py-1">
                    <span className="font-semibold">{t('forYou')}</span>
                    <span className="text-xs text-muted-foreground">
                      {i18n.language.startsWith('it') ? 'Post da chi segui' : 
                       i18n.language.startsWith('es') ? 'Posts de quien sigues' : 
                       'Posts from people you follow'}
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Feed Content */}
        {feedItems.length === 0 ? (
          <div className="text-center py-12 px-4 text-muted-foreground">
            <p className="mb-2">Il tuo feed è vuoto.</p>
            <p className="text-sm">Inizia a seguire altri utenti per vedere i loro aggiornamenti!</p>
            <Button
              onClick={() => navigate('/explore')}
              variant="link"
              className="mt-4"
            >
              Esplora gli utenti
            </Button>
          </div>
        ) : (
          <div>
            {feedItems.map((item) => {
              const username = item.username;
              const avatarUrl = item.avatar_url;
              const userId = item.user_id;
              const postId = item.post_id || item.id;
              const mediaUrls = item.media_urls && item.media_urls.length > 0
                ? item.media_urls 
                : item.media_url ? [item.media_url] : [];
              const hasMultipleMedia = mediaUrls.length > 1;
              const userHasStory = stories.some(s => s.user_id === userId);
              const locationName = item.location_name;
              const locationId = item.location_id;
              const caption = item.content;
              const rating = item.rating;
              const createdAt = item.created_at;

              return (
                <article key={item.id} className="bg-background">
                  {/* Post Header */}
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button 
                        onClick={(e) => handleAvatarClick(userId, e)}
                        className="shrink-0"
                      >
                        <Avatar className={cn(
                          "h-8 w-8",
                          userHasStory && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        )}>
                          <AvatarImage src={avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                            {username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
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
                        {locationName && locationId && item.latitude && item.longitude && (
                          <button
                            onClick={(e) => handleLocationClick(locationId, item.latitude, item.longitude, locationName, e)}
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
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span className="text-sm font-semibold">{rating}</span>
                      </div>
                    )}
                  </div>

                  {/* Post Media */}
                  {mediaUrls.length > 0 && (
                    <div className="relative">
                      {hasMultipleMedia ? (
                        <Carousel className="w-full">
                          <CarouselContent>
                            {mediaUrls.map((url, idx) => (
                              <CarouselItem key={idx}>
                                <div 
                                  className="aspect-square bg-muted cursor-pointer"
                                  onClick={() => setSelectedPostId(postId)}
                                >
                                  <img
                                    src={url}
                                    alt={`Post ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious className="left-2" />
                          <CarouselNext className="right-2" />
                        </Carousel>
                      ) : (
                        <div 
                          className="aspect-square bg-muted cursor-pointer"
                          onClick={() => setSelectedPostId(postId)}
                        >
                          <img
                            src={mediaUrls[0]}
                            alt="Post"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
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
                  <div className="px-3 py-1 space-y-2">
                    <PostActions
                      postId={postId}
                      likesCount={item.likes_count || 0}
                      commentsCount={item.comments_count || 0}
                      sharesCount={item.shares_count || 0}
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

        {/* Post Detail Modal (for image click only) */}
        {selectedPostId && (
          <PostDetailModal
            postId={selectedPostId}
            isOpen={!!selectedPostId}
            onClose={() => setSelectedPostId(null)}
          />
        )}

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
        {storiesViewerOpen && stories.length > 0 && (
          <StoriesViewer
            stories={stories.map((s) => ({
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
            }}
            onStoryViewed={() => {}}
          />
        )}
      </div>
    </div>
  );
};

export default FeedPage;
