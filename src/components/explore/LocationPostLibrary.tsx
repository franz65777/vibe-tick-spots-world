
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, X, Calendar, Users, Heart, MessageCircle, Bookmark, Share2, Refresh } from 'lucide-react';
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
  profiles?: {
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
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
      console.log('📚 LOADING POSTS FOR LOCATION - CRITICAL DEBUG');
      console.log('Location ID:', place.id);
      console.log('Location name:', place.name);
      
      // CRITICAL: Query posts for this specific location ID with better debugging
      const { data: locationPosts, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          location_id,
          caption,
          media_urls,
          created_at,
          likes_count,
          comments_count,
          saves_count,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('location_id', place.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching posts:', error);
        throw error;
      }

      console.log(`📊 POSTS QUERY RESULT:`, {
        locationId: place.id,
        locationName: place.name,
        postsFound: locationPosts?.length || 0,
        rawData: locationPosts
      });
      
      if (!locationPosts || locationPosts.length === 0) {
        console.log('📝 No posts found - Running diagnostic queries...');
        
        // DIAGNOSTIC 1: Check all posts in the database
        const { data: allPosts } = await supabase
          .from('posts')
          .select('id, location_id, caption')
          .limit(10);
        
        console.log('🔍 DIAGNOSTIC - Sample of all posts:', allPosts);
        
        // DIAGNOSTIC 2: Check all locations
        const { data: allLocations } = await supabase
          .from('locations')
          .select('id, name, google_place_id')
          .limit(10);
        
        console.log('🔍 DIAGNOSTIC - Sample of all locations:', allLocations);
        
        // DIAGNOSTIC 3: Check if there are posts with similar location names
        const { data: similarPosts } = await supabase
          .from('posts')
          .select(`
            id, 
            location_id, 
            caption,
            locations!inner(name)
          `)
          .ilike('locations.name', `%${place.name}%`);
        
        console.log('🔍 DIAGNOSTIC - Posts with similar location names:', similarPosts);
        
        setPosts([]);
        return;
      }

      // Process posts and ensure profiles data is properly formatted
      const processedPosts = locationPosts.map(post => ({
        id: post.id,
        user_id: post.user_id,
        caption: post.caption,
        media_urls: post.media_urls || [],
        created_at: post.created_at,
        likes_count: post.likes_count || 0,
        comments_count: post.comments_count || 0,
        saves_count: post.saves_count || 0,
        profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
      }));

      console.log(`✅ SUCCESS: Loaded ${processedPosts.length} posts for ${place.name}`);
      processedPosts.forEach((post, index) => {
        console.log(`  📸 Post ${index + 1}: ID=${post.id}, User=${post.profiles?.username || 'unknown'}, Media=${post.media_urls.length} files`);
      });

      setPosts(processedPosts);

    } catch (error) {
      console.error('❌ Error loading location posts:', error);
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
    loadLocationPosts(true); // Refresh to get updated counts
  };

  const handleSave = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleSave(postId);
    loadLocationPosts(true); // Refresh to get updated counts
  };

  const handleRefresh = () => {
    loadLocationPosts(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-2xl font-bold text-gray-900 mb-2 line-clamp-2">
                  {place?.name || 'Location'}
                </DialogTitle>
                <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{place?.city || place?.address || 'Unknown location'}</span>
                  </div>
                  <Badge className={`${getCategoryColor(place?.category || '')} bg-gray-100 text-xs px-2 py-1 rounded-lg border-0`}>
                    {place?.category?.charAt(0).toUpperCase() + place?.category?.slice(1) || 'Place'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Refresh className={`w-5 h-5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            {place?.image && (
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-100">
                <img
                  src={place.image}
                  alt={place.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Posts Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-500 text-sm">Be the first to post about this spot!</p>
                <p className="text-gray-400 text-xs mt-2">Location ID: {place?.id}</p>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  disabled={refreshing}
                >
                  <Refresh className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">{posts.length} post{posts.length !== 1 ? 's' : ''}</span>
                </div>
                
                {/* Posts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {posts.map((post) => (
                    <div 
                      key={post.id} 
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                      onClick={() => handlePostClick(post)}
                    >
                      {/* Post Media */}
                      {post.media_urls && post.media_urls.length > 0 && (
                        <div className="aspect-square relative overflow-hidden">
                          <img
                            src={post.media_urls[0]}
                            alt="Post content"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              console.log('Image failed to load:', post.media_urls[0]);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          {post.media_urls.length > 1 && (
                            <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium">
                              +{post.media_urls.length - 1}
                            </div>
                          )}
                          
                          {/* Overlay with engagement stats */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex items-center gap-4 text-white">
                              <div className="flex items-center gap-1">
                                <Heart className="w-5 h-5 fill-white" />
                                <span className="font-semibold">{post.likes_count}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageCircle className="w-5 h-5 fill-white" />
                                <span className="font-semibold">{post.comments_count}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Post Info */}
                      <div className="p-4">
                        {/* User Info */}
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={post.profiles?.avatar_url} />
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                              {(post.profiles?.full_name || post.profiles?.username || 'U')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {post.profiles?.full_name || post.profiles?.username || 'Anonymous'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>

                        {/* Caption */}
                        {post.caption && (
                          <p className="text-gray-800 text-sm leading-relaxed mb-3 line-clamp-2">
                            {post.caption}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={(e) => handleLike(post.id, e)}
                              className={`flex items-center gap-1 text-sm transition-colors ${
                                isLiked(post.id) ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${isLiked(post.id) ? 'fill-current' : ''}`} />
                              {post.likes_count}
                            </button>
                            <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500 transition-colors">
                              <MessageCircle className="w-4 h-4" />
                              {post.comments_count}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleSave(post.id, e)}
                              className={`p-1 rounded-full transition-colors ${
                                isSaved(post.id) ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'
                              }`}
                            >
                              <Bookmark className={`w-4 h-4 ${isSaved(post.id) ? 'fill-current' : ''}`} />
                            </button>
                            <button className="p-1 rounded-full text-gray-500 hover:text-gray-700 transition-colors">
                              <Share2 className="w-4 h-4" />
                            </button>
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
