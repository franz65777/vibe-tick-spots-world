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
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="bg-background border-b border-border sticky top-0 z-10">
          <div className="px-4 pt-3 pb-2 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
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
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : feedItems.length === 0 ? (
          // Empty state
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <TrendingUp className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Your feed is empty
            </h3>
            <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
              Start following people to see their latest discoveries and activities
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:scale-105"
            >
              Discover People
            </button>
          </div>
        ) : (
          // Feed items
          <div className="space-y-3">
            {feedItems.map((item, idx) => {
              const display = getFeedEventDisplay(item.event_type);
              const isPost = !!item.post_id;
              return (
                <article
                  key={item.id}
                  className="bg-card rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex flex-col">
                    {/* Header with avatar and user info */}
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={item.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                          {item.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-tight">
                          <span className="font-semibold text-foreground">
                            {item.username}
                          </span>
                          {' '}
                          <span className="text-muted-foreground">{display.action}</span>
                          {' '}
                          {item.location_name && (
                            <span className="font-semibold text-foreground">
                              {item.location_name}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {/* Rating pill if available */}
                      {item.rating && (
                        <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
                          <span className="text-lg font-bold text-primary">{item.rating}</span>
                          <span className="text-xs text-primary">/10</span>
                        </div>
                      )}
                    </div>

                    {/* Media preview */}
                    {item.media_urls && item.media_urls.length > 0 && (
                      <div className="mt-1 rounded-xl overflow-x-auto snap-x snap-mandatory scrollbar-hide flex gap-2">
                        {item.media_urls.map((url, idx2) => (
                          <div key={idx2} className="snap-center flex-shrink-0 w-full">
                            <img 
                              src={url} 
                              alt={`${item.location_name || 'Post'} ${idx2 + 1}`}
                              className="w-full h-64 object-cover rounded-xl"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Content */}
                    {item.content && item.event_type !== 'review' && (
                      <p className="text-sm text-foreground mt-2 line-clamp-2 bg-muted/40 rounded-lg p-2">
                        {item.content}
                      </p>
                    )}

                    {/* Review block */}
                    {item.event_type === 'review' && item.rating && (
                      <div className="flex items-center gap-2 mt-2 bg-primary/5 rounded-lg p-2">
                        <span className="text-2xl font-bold text-primary">{item.rating}/10</span>
                        {item.content && (
                          <p className="text-sm text-foreground mt-1 flex-1">
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
                        className="flex items-center gap-1.5 mt-2 text-xs text-primary hover:opacity-80 font-medium bg-primary/10 rounded-lg px-2 py-1 w-fit"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{item.location_name}</span>
                      </button>
                    )}

                    {/* Action row for posts */}
                    {isPost && (
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          {/* Like */}
                          <button
                            className="flex items-center gap-1.5 hover:opacity-75"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!item.post_id) return;
                              toggleLike(item.post_id);
                              // optimistic UI
                              setFeedItems(prev => prev.map(fi => fi.id === item.id ? { ...fi, likes_count: (fi.likes_count || 0) + (likedPosts.has(item.post_id!) ? -1 : 1) } : fi));
                            }}
                          >
                            <Heart className={`w-5 h-5 ${item.post_id && likedPosts.has(item.post_id) ? 'fill-red-500 text-red-500' : ''}`} />
                            <span className="text-sm text-muted-foreground">{item.likes_count ?? 0}</span>
                          </button>
                          {/* Comment */}
                          <button
                            className="flex items-center gap-1.5 hover:opacity-75"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!item.post_id) return;
                              setSelectedPostId(item.post_id);
                              setOpenCommentsOnLoad(true);
                              setOpenShareOnLoad(false);
                            }}
                          >
                            <MessageCircle className="w-5 h-5" />
                            <span className="text-sm text-muted-foreground">{item.comments_count ?? 0}</span>
                          </button>
                          {/* Share */}
                          <button
                            className="flex items-center gap-1.5 hover:opacity-75"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!item.post_id) return;
                              setSelectedPostId(item.post_id);
                              setOpenCommentsOnLoad(false);
                              setOpenShareOnLoad(true);
                            }}
                          >
                            <Send className="w-5 h-5" />
                            <span className="text-sm text-muted-foreground">{item.shares_count ?? 0}</span>
                          </button>
                        </div>
                        <button
                          className="hover:opacity-75"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.location_id) {
                              navigate('/explore', { state: { openLocationDetail: { id: item.location_id, name: item.location_name } } });
                            }
                          }}
                          aria-label="Open location"
                        >
                          <MapPin className="w-5 h-5" />
                        </button>
                      </div>
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
