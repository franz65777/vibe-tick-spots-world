import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserFeed, getFeedEventDisplay, FeedItem as FeedItemType } from '@/services/feedService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MessageCircle, Bookmark, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const FeedPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState<FeedItemType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeed = async () => {
      if (!user?.id) return;

      setLoading(true);
      const items = await getUserFeed(user.id);
      setFeedItems(items);
      setLoading(false);
    };

    loadFeed();
  }, [user?.id]);

  const handleItemClick = (item: FeedItemType) => {
    if (item.post_id) {
      // Navigate to post detail
      navigate(`/explore`); // You can enhance this to open the post modal
    } else if (item.location_id) {
      // Navigate to location
      navigate(`/explore`);
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200 px-4 py-4">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Feed
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          See what your friends are discovering
        </p>
      </div>

      {/* Feed Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : feedItems.length === 0 ? (
          // Empty state
          <Card className="p-8 text-center">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No activity yet
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Follow friends to see their discoveries here
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium hover:shadow-lg transition-shadow"
            >
              Discover People
            </button>
          </Card>
        ) : (
          // Feed items
          feedItems.map((item) => {
            const display = getFeedEventDisplay(item.event_type);
            
            return (
              <Card
                key={item.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* User Avatar */}
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={item.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white">
                        {item.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
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
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <span className="text-2xl">{display.icon}</span>
                      </div>

                      {/* Post content if available */}
                      {item.content && (
                        <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                          {item.content}
                        </p>
                      )}

                      {/* Quick actions */}
                      <div className="flex items-center gap-4 mt-3">
                        <button
                          className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle like
                          }}
                        >
                          <Heart className="w-4 h-4" />
                          <span className="text-xs">Like</span>
                        </button>
                        <button
                          className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle comment
                          }}
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-xs">Comment</span>
                        </button>
                        <button
                          className="flex items-center gap-1 text-gray-500 hover:text-purple-500 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle save
                          }}
                        >
                          <Bookmark className="w-4 h-4" />
                          <span className="text-xs">Save</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FeedPage;
