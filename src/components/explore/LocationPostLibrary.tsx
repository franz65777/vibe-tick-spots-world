
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MapPin, X, Calendar, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { getCategoryColor } from '@/utils/categoryIcons';

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
  profiles?: {
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

const LocationPostLibrary = ({ isOpen, onClose, place }: LocationPostLibraryProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && place) {
      loadLocationPosts();
    }
  }, [isOpen, place]);

  const loadLocationPosts = async () => {
    if (!place?.id) return;

    setLoading(true);
    try {
      console.log('📚 Loading ALL posts for location:', place.name);
      console.log('🔍 Fetching posts for location_id:', place.id);
      
      // Fetch ALL posts from ALL users for this specific location
      const { data: locationPosts, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('location_id', place.id) // Get ALL posts for this location
        .order('created_at', { ascending: false }); // Show newest first

      if (error) {
        console.error('❌ Error fetching posts:', error);
        throw error;
      }

      console.log(`✅ Found ${locationPosts?.length || 0} posts from ALL users for ${place.name}`);

      if (!locationPosts || locationPosts.length === 0) {
        setPosts([]);
        return;
      }

      // Separate posts: users you follow first, then others
      const followedUserPosts: Post[] = [];
      const otherPosts: Post[] = [];

      if (user) {
        // Get users that current user follows
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = new Set(following?.map(f => f.following_id) || []);

        locationPosts.forEach(post => {
          const processedPost: Post = {
            id: post.id,
            user_id: post.user_id,
            caption: post.caption,
            media_urls: post.media_urls || [],
            created_at: post.created_at,
            profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
          };

          // Show posts from users you follow first, then others
          if (followingIds.has(post.user_id)) {
            followedUserPosts.push(processedPost);
          } else {
            otherPosts.push(processedPost);
          }
        });
      } else {
        const processedPosts = locationPosts.map(post => ({
          id: post.id,
          user_id: post.user_id,
          caption: post.caption,
          media_urls: post.media_urls || [],
          created_at: post.created_at,
          profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
        }));
        
        otherPosts.push(...processedPosts);
      }

      // Combine: followed users first, then others
      setPosts([...followedUserPosts, ...otherPosts]);
      console.log(`✅ Library shows ${followedUserPosts.length} posts from followed users + ${otherPosts.length} from others`);
    } catch (error) {
      console.error('❌ Error loading location posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCategory = (category: string) => {
    return category?.charAt(0).toUpperCase() + category?.slice(1) || 'Place';
  };

  const getCityName = () => {
    return place?.city || 'Nearby';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                {place?.name || 'Location'}
              </DialogTitle>
              <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{getCityName()}</span>
                </div>
                <Badge className={`${getCategoryColor(place?.category || '')} bg-gray-100 text-xs px-2 py-1 rounded-lg border-0`}>
                  {formatCategory(place?.category || '')}
                </Badge>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
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
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <Calendar className="w-4 h-4" />
                <span>{posts.length} post{posts.length !== 1 ? 's' : ''}</span>
              </div>
              
              {posts.map((post) => (
                <div key={post.id} className="bg-gray-50 rounded-2xl p-5 space-y-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={post.profiles?.avatar_url} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {(post.profiles?.full_name || post.profiles?.username || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">
                        {post.profiles?.full_name || post.profiles?.username || 'Anonymous'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>

                  {/* Media */}
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div className="grid grid-cols-1 gap-3">
                      {post.media_urls.map((url, index) => (
                        <div key={index} className="aspect-video rounded-xl overflow-hidden bg-gray-200">
                          <img
                            src={url}
                            alt={`Post media ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Caption */}
                  {post.caption && (
                    <p className="text-gray-800 text-sm leading-relaxed">{post.caption}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPostLibrary;
