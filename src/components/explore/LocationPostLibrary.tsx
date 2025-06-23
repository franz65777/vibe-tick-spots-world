
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
      console.log('📚 LOADING ALL POSTS FOR LOCATION:', place.name);
      
      // First, find all locations that match this place (by name and city for broader matching)
      const { data: matchingLocations, error: locationsError } = await supabase
        .from('locations')
        .select('id')
        .or(`id.eq.${place.id},name.ilike.%${place.name}%`)
        .eq('city', place.city || '');

      if (locationsError) {
        console.error('❌ Error fetching matching locations:', locationsError);
        throw locationsError;
      }

      const locationIds = matchingLocations?.map(loc => loc.id) || [place.id];
      console.log('🔍 Searching posts in location IDs:', locationIds);

      // Get ALL posts for any of these matching locations
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
          saves_count
        `)
        .in('location_id', locationIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching posts:', error);
        throw error;
      }

      console.log(`📊 FOUND ${locationPosts?.length || 0} POSTS for ${place.name}`);

      if (!locationPosts || locationPosts.length === 0) {
        console.log('📝 No posts found for this location');
        setPosts([]);
        return;
      }

      // Get user profiles separately
      const userIds = [...new Set(locationPosts.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Process posts with profile data
      const processedPosts = locationPosts.map(post => {
        const profile = profileMap.get(post.user_id);
        return {
          id: post.id,
          user_id: post.user_id,
          caption: post.caption,
          media_urls: post.media_urls || [],
          created_at: post.created_at,
          likes_count: post.likes_count || 0,
          comments_count: post.comments_count || 0,
          saves_count: post.saves_count || 0,
          profiles: profile ? {
            username: profile.username,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url
          } : undefined
        };
      });

      console.log(`✅ SUCCESS: Loaded ${processedPosts.length} posts for ${place.name}`);
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
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">
                  {place?.name || 'Location'}
                </DialogTitle>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{place?.city || place?.address || 'Unknown location'}</span>
                  <Badge className={`${getCategoryColor(place?.category || '')} bg-gray-100 text-xs px-2 py-1 rounded-lg border-0 ml-2`}>
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
                  <RefreshCw className={`w-5 h-5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Posts Grid Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-500 text-sm mb-4">Be the first to post about this spot!</p>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">{posts.length} post{posts.length !== 1 ? 's' : ''}</span>
                </div>
                
                {/* Posts Grid - Instagram-style */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
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
                        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium">
                          {post.media_urls.length}
                        </div>
                      )}
                      
                      {/* Hover overlay with stats */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
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

                      {/* Quick action buttons */}
                      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={(e) => handleLike(post.id, e)}
                          className={`p-1.5 rounded-full backdrop-blur-sm transition-colors ${
                            isLiked(post.id) 
                              ? 'bg-red-500 text-white' 
                              : 'bg-white/80 text-gray-700 hover:bg-red-500 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-3 h-3 ${isLiked(post.id) ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => handleSave(post.id, e)}
                          className={`p-1.5 rounded-full backdrop-blur-sm transition-colors ${
                            isSaved(post.id) 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-white/80 text-gray-700 hover:bg-blue-500 hover:text-white'
                          }`}
                        >
                          <Bookmark className={`w-3 h-3 ${isSaved(post.id) ? 'fill-current' : ''}`} />
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
