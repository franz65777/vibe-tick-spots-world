
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

  useEffect(() => {
    if (isOpen && place?.id) {
      loadLocationPosts();
    }
  }, [isOpen, place?.id]);

  const loadLocationPosts = async (forceRefresh = false) => {
    if (!place?.id) {
      console.log('❌ No place ID provided');
      return;
    }

    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      console.log('🔍 DEBUGGING POSTS SEARCH');
      console.log('🔍 Place object:', JSON.stringify(place, null, 2));
      console.log('🔍 Looking for posts with place ID:', place.id);
      console.log('🔍 Looking for posts with place name:', place.name);

      // STEP 1: Get ALL posts first to see what we're working with
      console.log('📊 STEP 1: Getting ALL posts to debug');
      const { data: allPosts, error: allPostsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (allPostsError) {
        console.error('❌ Error getting all posts:', allPostsError);
      } else {
        console.log(`📊 TOTAL POSTS IN DATABASE: ${allPosts?.length || 0}`);
        
        // Log each post's location info
        allPosts?.forEach((post, index) => {
          console.log(`📝 Post ${index + 1}:`, {
            id: post.id,
            location_id: post.location_id,
            metadata: post.metadata,
            created_at: post.created_at
          });
        });
      }

      // STEP 2: Try direct location_id match
      console.log('🎯 STEP 2: Direct location_id search');
      const { data: directPosts, error: directError } = await supabase
        .from('posts')
        .select('*')
        .eq('location_id', place.id)
        .order('created_at', { ascending: false });

      let foundPosts: Post[] = [];

      if (directError) {
        console.error('❌ Direct search error:', directError);
      } else {
        console.log(`🎯 Direct search found: ${directPosts?.length || 0} posts`);
        if (directPosts && directPosts.length > 0) {
          foundPosts = directPosts;
          console.log('✅ Using direct search results');
        }
      }

      // STEP 3: If no direct matches, search by place name in metadata
      if (foundPosts.length === 0) {
        console.log('🔍 STEP 3: Searching metadata for place name');
        
        const { data: metadataPosts, error: metadataError } = await supabase
          .from('posts')
          .select('*')
          .contains('metadata', { place_name: place.name })
          .order('created_at', { ascending: false });

        if (metadataError) {
          console.error('❌ Metadata search error:', metadataError);
        } else {
          console.log(`🔍 Metadata search found: ${metadataPosts?.length || 0} posts`);
          if (metadataPosts && metadataPosts.length > 0) {
            foundPosts = metadataPosts;
            console.log('✅ Using metadata search results');
          }
        }
      }

      // STEP 4: If still no matches, try broader metadata search
      if (foundPosts.length === 0) {
        console.log('🔍 STEP 4: Broader metadata search');
        
        // Get all posts and filter in JavaScript for debugging
        const { data: allPostsForFilter, error: filterError } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (filterError) {
          console.error('❌ Filter search error:', filterError);
        } else {
          console.log(`🔍 Filter search checking: ${allPostsForFilter?.length || 0} posts`);
          
          const filteredPosts = allPostsForFilter?.filter(post => {
            if (!post.metadata) return false;
            
            const metadata = post.metadata;
            const searchTerm = place.name.toLowerCase();
            
            // Check various metadata fields
            const matchesPlaceName = metadata.place_name && 
              metadata.place_name.toString().toLowerCase().includes(searchTerm);
            const matchesLocationName = metadata.location_name && 
              metadata.location_name.toString().toLowerCase().includes(searchTerm);
            const matchesName = metadata.name && 
              metadata.name.toString().toLowerCase().includes(searchTerm);
            
            return matchesPlaceName || matchesLocationName || matchesName;
          }) || [];

          console.log(`🔍 JavaScript filter found: ${filteredPosts.length} posts`);
          if (filteredPosts.length > 0) {
            foundPosts = filteredPosts;
            console.log('✅ Using JavaScript filter results');
          }
        }
      }

      console.log(`🎯 FINAL RESULT: Found ${foundPosts.length} posts for location`);
      
      if (foundPosts.length === 0) {
        console.log('❌ NO POSTS FOUND - This suggests a data linking issue');
        console.log('💡 Check if posts are being saved with the correct location_id or metadata');
      }

      setPosts(foundPosts);

    } catch (error) {
      console.error('❌ CRITICAL ERROR loading location posts:', error);
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          {/* Compact Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                  {place?.name || 'Location'}
                </DialogTitle>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span>{place?.city || place?.address || 'Unknown location'}</span>
                  <Badge className={`${getCategoryColor(place?.category || '')} bg-gray-100 text-xs px-2 py-0.5 rounded-md border-0 ml-1`}>
                    {place?.category?.charAt(0).toUpperCase() + place?.category?.slice(1) || 'Place'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1">
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

          {/* Posts Grid Content */}
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
                <h3 className="font-semibold text-gray-900 mb-1">No posts yet</h3>
                <p className="text-gray-500 text-sm mb-3">Be the first to post about this spot!</p>
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
                  <span className="font-medium">{posts.length} post{posts.length !== 1 ? 's' : ''}</span>
                </div>
                
                {/* Compact Instagram-style Grid */}
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
