
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
      console.log('📚 LOADING POSTS FOR LOCATION:', place);
      console.log('📚 SEARCHING FOR PLACE ID:', place.id);
      console.log('📚 SEARCHING FOR PLACE NAME:', place.name);
      
      // Strategy 1: Search by exact place.id in location_id field
      console.log('🔍 Strategy 1: Direct location_id match');
      let { data: directPosts, error: directError } = await supabase
        .from('posts')
        .select('*')
        .eq('location_id', place.id)
        .order('created_at', { ascending: false });

      if (directError) {
        console.error('❌ Direct query error:', directError);
      } else {
        console.log('📊 Direct posts found:', directPosts?.length || 0);
      }

      let allPosts = directPosts || [];

      // Strategy 2: Search in locations table and find matching posts
      console.log('🔍 Strategy 2: Location table lookup');
      const { data: locationRecord, error: locationError } = await supabase
        .from('locations')
        .select('id')
        .or(`id.eq.${place.id},name.ilike.%${place.name}%,google_place_id.eq.${place.id}`)
        .limit(10);

      if (locationError) {
        console.error('❌ Location lookup error:', locationError);
      } else {
        console.log('📍 Found locations:', locationRecord);
        
        if (locationRecord && locationRecord.length > 0) {
          const locationIds = locationRecord.map(loc => loc.id);
          console.log('🎯 Searching posts for location IDs:', locationIds);
          
          const { data: locationPosts, error: locationPostsError } = await supabase
            .from('posts')
            .select('*')
            .in('location_id', locationIds)
            .order('created_at', { ascending: false });
          
          if (locationPostsError) {
            console.error('❌ Location posts error:', locationPostsError);
          } else {
            console.log('📊 Location-based posts found:', locationPosts?.length || 0);
            // Merge with direct posts, avoiding duplicates
            const existingIds = new Set(allPosts.map(p => p.id));
            const newPosts = (locationPosts || []).filter(p => !existingIds.has(p.id));
            allPosts = [...allPosts, ...newPosts];
          }
        }
      }

      // Strategy 3: Search by place name in post metadata (for posts created with place names)
      console.log('🔍 Strategy 3: Metadata search');
      const { data: metadataPosts, error: metadataError } = await supabase
        .from('posts')
        .select('*')
        .or(`metadata->>place_name.ilike.%${place.name}%,metadata->>location_name.ilike.%${place.name}%`)
        .order('created_at', { ascending: false });

      if (metadataError) {
        console.error('❌ Metadata search error:', metadataError);
      } else {
        console.log('📊 Metadata posts found:', metadataPosts?.length || 0);
        // Merge avoiding duplicates
        const existingIds = new Set(allPosts.map(p => p.id));
        const newPosts = (metadataPosts || []).filter(p => !existingIds.has(p.id));
        allPosts = [...allPosts, ...newPosts];
      }

      console.log('📊 TOTAL UNIQUE POSTS FOUND:', allPosts.length);

      if (allPosts.length === 0) {
        console.log('📝 No posts found for this location');
        setPosts([]);
        return;
      }

      // Get profiles for all posts
      const userIds = [...new Set(allPosts.map(post => post.user_id))];
      console.log('👥 Fetching profiles for users:', userIds);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
      } else {
        console.log('👤 Profiles fetched:', profiles?.length || 0);
      }

      // Combine posts with profile data
      const processedPosts = allPosts.map(post => {
        const profile = profiles?.find(p => p.id === post.user_id);
        return {
          ...post,
          profiles: profile ? {
            username: profile.username,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url
          } : undefined
        };
      });

      console.log(`✅ SUCCESS: Loaded ${processedPosts.length} posts with profile data`);
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
