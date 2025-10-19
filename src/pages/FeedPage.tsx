import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserFeed, getFeedEventDisplay, FeedItem as FeedItemType } from '@/services/feedService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Sparkles, TrendingUp, MessageSquare, Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import PostDetailModal from '@/components/explore/PostDetailModal';
import { PostActions } from '@/components/feed/PostActions';

const FeedPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState<FeedItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [openCommentsOnLoad, setOpenCommentsOnLoad] = useState(false);
  const [openShareOnLoad, setOpenShareOnLoad] = useState(false);

  const updatePostCounts = (postId: string, updates: Partial<Pick<FeedItemType, 'likes_count' | 'comments_count' | 'shares_count' | 'saves_count'>>) => {
    setFeedItems(prev => prev.map(item =>
      item.post_id === postId ? { ...item, ...updates } : item
    ));
  };

  useEffect(() => {
    if (!user?.id) return;

    let interval: any;
    let channels: any[] = [];

    const loadFeed = async () => {
      setLoading(true);
      const items = await getUserFeed(user.id);
      setFeedItems(items);
      setLoading(false);
    };

    loadFeed();
    interval = setInterval(loadFeed, 30000);

    // Realtime subscriptions for instant feed updates
    const setupRealtime = async () => {
      // Listen to posts from followed users
      const postsChannel = supabase
        .channel('feed-posts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
          loadFeed();
        })
        .subscribe();

      // Listen to comments from followed users
      const commentsChannel = supabase
        .channel('feed-comments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, () => {
          loadFeed();
        })
        .subscribe();

      // Listen to saved places from followed users
      const savedPlacesChannel = supabase
        .channel('feed-saved-places')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_places' }, () => {
          loadFeed();
        })
        .subscribe();

      // Listen to user saved locations from followed users
      const savedLocationsChannel = supabase
        .channel('feed-saved-locations')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_saved_locations' }, () => {
          loadFeed();
        })
        .subscribe();

      // Listen to interactions from followed users
      const interactionsChannel = supabase
        .channel('feed-interactions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'interactions' }, () => {
          loadFeed();
        })
        .subscribe();

      // Listen to reviews from followed users
      const reviewsChannel = supabase
        .channel('feed-reviews')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reviews' }, () => {
          loadFeed();
        })
        .subscribe();

      channels = [postsChannel, commentsChannel, savedPlacesChannel, savedLocationsChannel, interactionsChannel, reviewsChannel];
    };

    setupRealtime();

    return () => {
      if (interval) clearInterval(interval);
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user?.id]);

  const handleItemClick = (item: FeedItemType) => {
    // If it's a post with images/content, open post detail modal
    if (item.post_id && item.event_type === 'new_post' && item.media_url) {
      setSelectedPostId(item.post_id);
    } 
    // If it's a review/comment or interaction with a location, open location detail
    else if (item.location_id && (item.event_type === 'review' || item.event_type === 'new_comment' || item.event_type.includes('_location'))) {
      navigate('/explore', { 
        state: { 
          openLocationDetail: {
            id: item.location_id,
            name: item.location_name || 'Location',
            google_place_id: item.location_id
          }
        } 
      });
    }
    // Default: navigate to location if available
    else if (item.location_id) {
      navigate('/explore', { 
        state: { 
          openLocationDetail: {
            id: item.location_id,
            name: item.location_name || 'Location'
          }
        } 
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <p className="text-gray-500">Please sign in to view your feed</p>
      </div>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-muted/30 pb-20">
        {/* Header */}
        <header className="bg-background border-b border-border sticky top-0 z-10 shadow-sm">
          <div className="px-4 py-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Your Feed</h1>
                <p className="text-xs text-muted-foreground">See what your friends are discovering</p>
              </div>
            </div>
          </div>
        </header>

        {/* Feed Content */}
        <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          // Loading skeletons
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-background rounded-2xl p-4 shadow-sm border border-border">
                <div className="flex items-start gap-3 mb-3">
                  <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-48 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : feedItems.length === 0 ? (
          // Empty state
          <div className="bg-background rounded-2xl p-8 text-center shadow-sm border border-border">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
              <TrendingUp className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Your feed is empty
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Start following people to see their latest discoveries and activities
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:scale-105"
            >
              Discover People
            </button>
          </div>
        ) : (
          // Feed items
          <div className="space-y-4">
            {feedItems.map((item, idx) => {
              const display = getFeedEventDisplay(item.event_type);
              const isPost = !!item.post_id;
              return (
                <article
                  key={item.id}
                  className="bg-background rounded-2xl p-4 shadow-sm border border-border hover:shadow-md transition-all"
                >
                  <div className="flex flex-col">
                    {/* Header with avatar and user info */}
                    <div
                      className="flex items-center gap-2 mb-3 cursor-pointer"
                      onClick={() => handleItemClick(item)}
                    >
                      <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-background">
                        <AvatarImage src={item.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-sm">
                          {item.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-tight">
                          <span className="font-bold text-foreground">
                            {item.username}
                          </span>
                          {' '}
                          <span className="text-muted-foreground font-normal">{display.action}</span>
                          {' '}
                          {item.location_name && (
                            <span className="font-semibold text-foreground">
                              {item.location_name}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {/* Rating pill if available */}
                      {item.rating && (
                        <div className="flex items-center gap-1 bg-yellow-100 px-2.5 py-1 rounded-full">
                          <span className="text-base font-bold text-yellow-700">{item.rating}</span>
                          <span className="text-xs text-yellow-600">/10</span>
                        </div>
                      )}
                    </div>

                    {/* Media preview */}
                    {item.media_urls && item.media_urls.length > 0 && (
                      <div
                        className="mt-2 rounded-xl overflow-x-auto snap-x snap-mandatory scrollbar-hide flex gap-2 cursor-pointer"
                        onClick={() => handleItemClick(item)}
                      >
                        {item.media_urls.map((url, idx2) => (
                          <div key={idx2} className="snap-center flex-shrink-0 w-full">
                            <img
                              src={url}
                              alt={`${item.location_name || 'Post'} ${idx2 + 1}`}
                              className="w-full h-72 object-cover rounded-xl"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Content */}
                    {item.content && item.event_type !== 'review' && (
                      <p className="text-sm text-foreground mt-3 line-clamp-3">
                        {item.content}
                      </p>
                    )}

                    {/* Review block */}
                    {item.event_type === 'review' && item.rating && (
                      <div className="flex items-start gap-3 mt-3 bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                        <div className="flex items-center gap-1 bg-yellow-100 px-2.5 py-1.5 rounded-lg">
                          <span className="text-xl font-bold text-yellow-700">{item.rating}</span>
                          <span className="text-xs text-yellow-600">/10</span>
                        </div>
                        {item.content && (
                          <p className="text-sm text-foreground flex-1">
                            {item.content}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Location badge */}
                    {item.location_name && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.location_id) {
                            navigate('/explore', {
                              state: {
                                openLocationDetail: {
                                  id: item.location_id,
                                  name: item.location_name
                                }
                              }
                            });
                          }
                        }}
                        className="flex items-center gap-1.5 mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1.5 w-fit transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{item.location_name}</span>
                      </button>
                    )}

                    {/* Action row for posts */}
                    {isPost && (
                      <PostActions
                        postId={item.post_id!}
                        likesCount={item.likes_count || 0}
                        commentsCount={item.comments_count || 0}
                        sharesCount={item.shares_count || 0}
                        onCommentClick={() => {
                        onCountsUpdate={(updates) => updatePostCounts(item.post_id!, updates)}
                          setSelectedPostId(item.post_id!);
                          setOpenCommentsOnLoad(true);
                          setOpenShareOnLoad(false);
                        }}
                        onShareClick={() => {
                          setSelectedPostId(item.post_id!);
                          setOpenShareOnLoad(true);
                          setOpenCommentsOnLoad(false);
                        }}
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {selectedPostId && (
        <PostDetailModal
          postId={selectedPostId}
          isOpen={!!selectedPostId}
          onClose={() => {
            setSelectedPostId(null);
            setOpenCommentsOnLoad(false);
            setOpenShareOnLoad(false);
          }}
          openCommentsOnLoad={openCommentsOnLoad}
          openShareOnLoad={openShareOnLoad}
        />
      )}
    </AuthenticatedLayout>
  );
};

export default FeedPage;
