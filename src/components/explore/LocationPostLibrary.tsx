
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, X, Calendar, Users, Heart, MessageCircle, Bookmark, Share2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { getCategoryColor } from '@/utils/categoryIcons';
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
  const [debugMode, setDebugMode] = useState(true); // Enable debug mode

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
      console.log('🚀 NEW STRATEGY: Starting fresh approach');
      console.log('🔍 Target place:', {
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

      console.log(`📊 TOTAL POSTS IN DATABASE: ${allPosts?.length || 0}`);

      if (!allPosts || allPosts.length === 0) {
        console.log('📭 No posts found in database');
        setPosts([]);
        return;
      }

      // Log every single post for debugging
      console.log('🔍 ANALYZING ALL POSTS:');
      allPosts.forEach((post, index) => {
        console.log(`POST ${index + 1}:`, {
          id: post.id,
          location_id: post.location_id,
          caption: post.caption,
          metadata: post.metadata,
          created_at: post.created_at
        });
      });

      let matchingPosts: Post[] = [];

      if (debugMode) {
        // DEBUG MODE: Show ALL posts to see what we're working with
        console.log('🐛 DEBUG MODE: Showing ALL posts');
        matchingPosts = allPosts;
      } else {
        // NORMAL MODE: Filter posts
        console.log('🎯 FILTERING MODE: Looking for matches...');
        
        matchingPosts = allPosts.filter(post => {
          // Strategy 1: Direct location_id match
          if (post.location_id === place.id) {
            console.log(`✅ MATCH by location_id: ${post.id}`);
            return true;
          }

          // Strategy 2: Google Place ID match (if available)
          if (place.google_place_id && post.metadata?.google_place_id === place.google_place_id) {
            console.log(`✅ MATCH by google_place_id: ${post.id}`);
            return true;
          }

          // Strategy 3: Name matching in metadata
          const placeName = place.name?.toLowerCase();
          if (placeName && post.metadata) {
            const metadataKeys = ['place_name', 'location_name', 'name'];
            for (const key of metadataKeys) {
              if (post.metadata[key] && 
                  typeof post.metadata[key] === 'string' && 
                  post.metadata[key].toLowerCase().includes(placeName)) {
                console.log(`✅ MATCH by metadata.${key}: ${post.id}`);
                return true;
              }
            }
          }

          console.log(`❌ NO MATCH: ${post.id}`);
          return false;
        });
      }

      console.log(`🎯 FINAL RESULT: ${matchingPosts.length} posts selected`);
      console.log('📝 Selected post IDs:', matchingPosts.map(p => p.id));

      setPosts(matchingPosts);

    } catch (error) {
      console.error('❌ CRITICAL ERROR:', error);
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

  const handleRefresh = () => {
    loadLocationPosts(true);
  };

  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
    loadLocationPosts(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                  {place?.name || 'Location'}
                </DialogTitle>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span>{place?.city || place?.address || 'Unknown location'}</span>
                  {debugMode && (
                    <Badge className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-md border-0 ml-1">
                      DEBUG MODE
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleDebugMode}
                  className={`p-1.5 rounded-full transition-colors text-xs px-2 py-1 ${
                    debugMode ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {debugMode ? 'EXIT DEBUG' : 'DEBUG'}
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">No posts found</h3>
                <p className="text-gray-500 text-sm mb-3">
                  {debugMode ? 'No posts in database' : 'No posts match this location'}
                </p>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                  <Calendar className="w-3 h-3" />
                  <span className="font-medium">
                    {posts.length} post{posts.length !== 1 ? 's' : ''} 
                    {debugMode ? ' (ALL POSTS - DEBUG MODE)' : ` for ${place.name}`}
                  </span>
                </div>
                
                {/* Posts Grid */}
                <div className="grid grid-cols-3 gap-0.5">
                  {posts.map((post) => (
                    <div 
                      key={post.id} 
                      className="aspect-square relative group cursor-pointer overflow-hidden bg-gray-100"
                      onClick={() => handlePostClick(post)}
                    >
                      {/* Post Image */}
                      {post.media_urls && post.media_urls.length > 0 && (
                        <img
                          src={post.media_urls[0]}
                          alt="Post content"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            console.log('Image failed to load:', post.media_urls[0]);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      
                      {/* Debug info overlay */}
                      {debugMode && (
                        <div className="absolute top-1 left-1 bg-black/70 text-white px-1 py-0.5 rounded text-xs">
                          ID: {post.id.slice(0, 8)}
                        </div>
                      )}
                      
                      {/* Multiple images indicator */}
                      {post.media_urls && post.media_urls.length > 1 && (
                        <div className="absolute top-1 right-1 bg-black/70 text-white px-1.5 py-0.5 rounded-full text-xs font-medium">
                          {post.media_urls.length}
                        </div>
                      )}
                      
                      {/* Hover overlay with stats */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="flex items-center gap-3 text-white">
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

                      {/* Quick action buttons */}
                      <div className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={(e) => handleLike(post.id, e)}
                          className={`p-1 rounded-full backdrop-blur-sm transition-colors ${
                            isLiked(post.id) 
                              ? 'bg-red-500 text-white' 
                              : 'bg-white/80 text-gray-700 hover:bg-red-500 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-2.5 h-2.5 ${isLiked(post.id) ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => handleSave(post.id, e)}
                          className={`p-1 rounded-full backdrop-blur-sm transition-colors ${
                            isSaved(post.id) 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-white/80 text-gray-700 hover:bg-blue-500 hover:text-white'
                          }`}
                        >
                          <Bookmark className={`w-2.5 h-2.5 ${isSaved(post.id) ? 'fill-current' : ''}`} />
                        </button>
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
