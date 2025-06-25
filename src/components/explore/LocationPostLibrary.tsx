
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, X, Calendar, Users, Heart, MessageCircle, Bookmark, Share2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { usePostEngagement } from '@/hooks/usePostEngagement';
import PostDetailModal from './PostDetailModal';

interface LocationPostLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  place: any;
}

interface Post {
  id: string;
  user_id: string;
  caption?: string;
  media_urls: string[];
  created_at: string;
  likes_count: number;
  comments_count: number;
  saves_count: number;
  location_id?: string;
  metadata?: any;
}

const LocationPostLibrary = ({ isOpen, onClose, place }: LocationPostLibraryProps) => {
  const { user } = useAuth();
  const { isLiked, isSaved, toggleLike, toggleSave } = usePostEngagement();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isOpen && place) {
      loadLocationPosts();
    }
  }, [isOpen, place]);

  const loadLocationPosts = async (forceRefresh = false) => {
    if (!place) {
      console.log('❌ No place provided');
      setPosts([]);
      return;
    }

    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      console.log('🔍 Loading posts for place:', {
        id: place.id,
        name: place.name,
        google_place_id: place.google_place_id
      });

      // Get ALL posts from the database
      const { data: allPosts, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Database error:', error);
        setPosts([]);
        return;
      }

      console.log(`📊 Total posts in database: ${allPosts?.length || 0}`);

      if (!allPosts || allPosts.length === 0) {
        console.log('📭 No posts found in database');
        setPosts([]);
        return;
      }

      // Filter posts that match this location
      const matchingPosts = allPosts.filter(post => {
        // Strategy 1: Direct location_id match
        if (post.location_id === place.id) {
          console.log(`✅ MATCH by location_id: ${post.id}`);
          return true;
        }

        // Strategy 2: Google Place ID match (if available)
        if (place.google_place_id && 
            post.metadata && 
            typeof post.metadata === 'object' && 
            post.metadata !== null &&
            'google_place_id' in post.metadata &&
            post.metadata.google_place_id === place.google_place_id) {
          console.log(`✅ MATCH by google_place_id: ${post.id}`);
          return true;
        }

        // Strategy 3: Name matching in metadata
        const placeName = place.name?.toLowerCase();
        if (placeName && 
            post.metadata && 
            typeof post.metadata === 'object' && 
            post.metadata !== null) {
          const metadataKeys = ['place_name', 'location_name', 'name'];
          for (const key of metadataKeys) {
            if (key in post.metadata && 
                typeof post.metadata[key] === 'string' && 
                post.metadata[key].toLowerCase().includes(placeName)) {
              console.log(`✅ MATCH by metadata.${key}: ${post.id}`);
              return true;
            }
          }
        }

        return false;
      });

      console.log(`🎯 Found ${matchingPosts.length} matching posts`);
      setPosts(matchingPosts);

    } catch (error) {
      console.error('❌ Error loading posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
  };

  const handleLike = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleLike(postId);
    loadLocationPosts(true);
  };

  const handleSave = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleSave(postId);
    loadLocationPosts(true);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement share functionality
  };

  const handleRefresh = () => {
    loadLocationPosts(true);
  };

  // Get city name for display
  const getCityDisplay = () => {
    if (place.city) {
      return place.city;
    }
    if (place.address) {
      // Try to extract city from address
      const addressParts = place.address.split(',');
      if (addressParts.length > 1) {
        return addressParts[addressParts.length - 2].trim();
      }
    }
    return 'Unknown City';
  };

  const getLocationDisplay = () => {
    const city = getCityDisplay();
    return `${place.name}, ${city}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 bg-gradient-to-br from-gray-50 to-white">
          {/* Enhanced Header */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-2xl font-bold text-gray-900 mb-2 line-clamp-1">
                  {place?.name || 'Location'}
                </DialogTitle>
                <div className="flex items-center gap-3 text-gray-600 mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">{getLocationDisplay()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                    <ImageIcon className="w-3 h-3 mr-1" />
                    {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                  </Badge>
                  {place.category && (
                    <Badge className="bg-purple-50 text-purple-700 border-purple-200 px-3 py-1">
                      {place.category}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2 hover:bg-gray-100"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2 hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 font-medium">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-500 text-center max-w-sm mb-4">
                  Be the first to share a moment from this amazing location!
                </p>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                  className="rounded-full"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="p-6">
                {/* Posts Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Recent Posts
                  </h3>
                  <p className="text-sm text-gray-500">
                    {posts.length} {posts.length === 1 ? 'post' : 'posts'} found
                  </p>
                </div>
                
                {/* Posts Grid */}
                <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden bg-white shadow-sm border">
                  {posts.map((post) => (
                    <div 
                      key={post.id} 
                      className="aspect-square relative group cursor-pointer overflow-hidden bg-gray-100 hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition-all duration-300"
                      onClick={() => handlePostClick(post)}
                    >
                      {/* Post Image */}
                      {post.media_urls && post.media_urls.length > 0 && (
                        <img
                          src={post.media_urls[0]}
                          alt="Post content"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            console.log('Image failed to load:', post.media_urls[0]);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      
                      {/* Multiple images indicator */}
                      {post.media_urls && post.media_urls.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                          +{post.media_urls.length - 1}
                        </div>
                      )}
                      
                      {/* Hover overlay with enhanced stats */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-3">
                        {/* Top actions */}
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={(e) => handleLike(post.id, e)}
                            className={`p-1.5 rounded-full backdrop-blur-sm transition-all duration-200 ${
                              isLiked(post.id) 
                                ? 'bg-red-500 text-white scale-110' 
                                : 'bg-white/20 text-white hover:bg-red-500 hover:scale-110'
                            }`}
                          >
                            <Heart className={`w-3 h-3 ${isLiked(post.id) ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            onClick={(e) => handleSave(post.id, e)}
                            className={`p-1.5 rounded-full backdrop-blur-sm transition-all duration-200 ${
                              isSaved(post.id) 
                                ? 'bg-blue-500 text-white scale-110' 
                                : 'bg-white/20 text-white hover:bg-blue-500 hover:scale-110'
                            }`}
                          >
                            <Bookmark className={`w-3 h-3 ${isSaved(post.id) ? 'fill-current' : ''}`} />
                          </button>
                        </div>

                        {/* Bottom stats */}
                        <div className="flex items-center justify-center gap-4 text-white">
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4 fill-white" />
                            <span className="font-semibold text-sm">{post.likes_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4 fill-white" />
                            <span className="font-semibold text-sm">{post.comments_count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </>
  );
};

export default LocationPostLibrary;
