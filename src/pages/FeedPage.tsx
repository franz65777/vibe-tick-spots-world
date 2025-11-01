import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserFeed, FeedItem } from '@/services/feedService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PostDetailModal from '@/components/explore/PostDetailModal';
import { PostActions } from '@/components/feed/PostActions';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { useStories } from '@/hooks/useStories';
import StoriesViewer from '@/components/StoriesViewer';

const FeedPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());
  const [storiesViewerOpen, setStoriesViewerOpen] = useState(false);
  const [selectedUserStoryIndex, setSelectedUserStoryIndex] = useState(0);
  const { stories } = useStories();

  const loadFeed = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const items = await getUserFeed(user.id);
      setFeedItems(items);
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
  }, [user?.id]);

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

  const handleLocationClick = (locationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/explore?location=${locationId}`);
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

  const renderCaption = (caption: string | null, postId: string, username: string) => {
    if (!caption) return null;
    const isExpanded = expandedCaptions.has(postId);
    const needsTruncate = caption.length > 100;

    return (
      <div className="text-sm">
        <span className="font-semibold mr-1">{username}</span>
        <span className="text-foreground">
          {isExpanded || !needsTruncate ? caption : `${caption.slice(0, 100)}...`}
        </span>
        {needsTruncate && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              toggleCaption(postId);
            }}
            className="ml-1 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? 'meno' : 'altro'}
          </button>
        )}
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
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold">Feed</h1>
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
          <div className="divide-y">
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
                          "h-10 w-10",
                          userHasStory && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        )}>
                          <AvatarImage src={avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
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
                        {locationName && locationId && (
                          <button
                            onClick={(e) => handleLocationClick(locationId, e)}
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
                  <div className="px-3 py-2">
                    <PostActions
                      postId={postId}
                      likesCount={item.likes_count || 0}
                      commentsCount={item.comments_count || 0}
                      sharesCount={item.shares_count || 0}
                      onCommentClick={() => setSelectedPostId(postId)}
                      onShareClick={() => setSelectedPostId(postId)}
                    />

                    {/* Caption */}
                    {caption && (
                      <div className="mt-2">
                        {renderCaption(caption, item.id, username)}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground mt-2 uppercase">
                      {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Post Detail Modal */}
        {selectedPostId && (
          <PostDetailModal
            postId={selectedPostId}
            isOpen={!!selectedPostId}
            onClose={() => setSelectedPostId(null)}
          />
        )}

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
