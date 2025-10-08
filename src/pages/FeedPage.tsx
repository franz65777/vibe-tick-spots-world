import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserFeed, getFeedEventDisplay, FeedItem as FeedItemType } from '@/services/feedService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Sparkles, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

const FeedPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState<FeedItemType[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (item.post_id) {
      // Navigate to post detail or location
      if (item.event_type === 'review' && item.location_id) {
        // Navigate to home with location opened
        navigate('/', { 
          state: { 
            openPinDetail: {
              id: item.location_id,
              name: item.location_name || 'Location'
            }
          } 
        });
      } else {
        navigate(`/explore`); // You can enhance this to open the post modal
      }
    } else if (item.location_id) {
      // Navigate to location on map
      navigate('/', { 
        state: { 
          openPinDetail: {
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
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Modern Header */}
        <div className="bg-white border-b border-gray-200 pt-12">
          <div className="p-4 pt-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Your Feed</h1>
                <p className="text-xs text-gray-500">See what your friends are discovering</p>
              </div>
            </div>
          </div>
        </div>

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
            {feedItems.map((item) => {
              const display = getFeedEventDisplay(item.event_type);
              
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-start gap-3">
                    {/* User Avatar */}
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage src={item.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-semibold">
                        {item.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug">
                            <span className="font-semibold text-gray-900">
                              {item.username}
                            </span>
                            {' '}
                            <span className="text-gray-600">{display.action}</span>
                            {' '}
                            {item.location_name && (
                              <span className="font-semibold text-gray-900">
                                {item.location_name}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.rating && item.event_type === 'rated_post' && (
                            <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
                              <span className="text-lg font-bold text-primary">{item.rating}</span>
                              <span className="text-xs text-primary">/10</span>
                            </div>
                          )}
                          <span className="text-xl">{display.icon}</span>
                        </div>
                      </div>

                      {/* Media preview if available */}
                      {item.media_url && (
                        <div className="mt-2 rounded-lg overflow-hidden">
                          <img 
                            src={item.media_url} 
                            alt={item.location_name || 'Post image'}
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}

                      {/* Post content if available */}
                      {item.content && (
                        <p className="text-sm text-gray-700 mt-2 line-clamp-2 bg-gray-50 rounded-lg p-2">
                          {item.content}
                        </p>
                      )}

                      {/* Rating display for reviews */}
                      {item.event_type === 'review' && item.rating && (
                        <div className="flex items-center gap-2 mt-2 bg-yellow-50 rounded-lg p-2">
                          <span className="text-2xl font-bold text-yellow-600">{item.rating}/10</span>
                          <div className="flex">
                            {[...Array(Math.ceil(item.rating / 2))].map((_, i) => (
                              <span key={i} className="text-yellow-400">⭐</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Location badge if available - clickable */}
                      {item.location_name && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.location_id) {
                              navigate('/', { 
                                state: { 
                                  openPinDetail: {
                                    id: item.location_id,
                                    name: item.location_name
                                  }
                                } 
                              });
                            }
                          }}
                          className="flex items-center gap-1.5 mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 rounded-lg px-2 py-1 w-fit"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate">{item.location_name}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default FeedPage;
