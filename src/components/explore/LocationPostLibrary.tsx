
import React, { useState, useEffect } from 'react';
import { ChevronLeft, MapPin, Calendar, Users, Heart, MessageCircle, Share2, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LocationPost {
  id: string;
  user_id: string;
  caption: string | null;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  saves_count: number;
  created_at: string;
  metadata: any;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url: string;
  } | null;
}

interface LocationPostLibraryProps {
  place: {
    id: string;
    name: string;
    category?: string;
    address?: string;
    city?: string;
    google_place_id?: string;
    coordinates?: { lat: number; lng: number };
    postCount?: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

const LocationPostLibrary = ({ place, isOpen, onClose }: LocationPostLibraryProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<LocationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());

  // Extract city from address if not provided
  const displayCity = place.city || place.address?.split(',')[1]?.trim() || 'Unknown City';

  useEffect(() => {
    if (isOpen) {
      fetchLocationPosts();
      if (user) {
        fetchUserInteractions();
      }
    }
  }, [place.id, user, isOpen]);

  const fetchLocationPosts = async () => {
    try {
      setLoading(true);
      
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          caption,
          media_urls,
          likes_count,
          comments_count,
          saves_count,
          created_at,
          metadata,
          profiles (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('location_id', place.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`📍 Loaded ${posts?.length || 0} posts for ${place.name}`);
      setPosts(posts || []);
    } catch (error) {
      console.error('❌ Error fetching location posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInteractions = async () => {
    if (!user) return;

    try {
      // Fetch user's likes
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id);

      // Fetch user's saves
      const { data: saves } = await supabase
        .from('post_saves')
        .select('post_id')
        .eq('user_id', user.id);

      setLikedPosts(new Set(likes?.map(l => l.post_id) || []));
      setSavedPosts(new Set(saves?.map(s => s.post_id) || []));
    } catch (error) {
      console.error('Error fetching user interactions:', error);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    try {
      const isLiked = likedPosts.has(postId);
      
      if (isLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        
        setLikedPosts(prev => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      } else {
        await supabase
          .from('post_likes')
          .insert({ user_id: user.id, post_id: postId });
        
        setLikedPosts(prev => new Set([...prev, postId]));
      }

      // Update post likes count in UI
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likes_count: post.likes_count + (isLiked ? -1 : 1) }
          : post
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSave = async (postId: string) => {
    if (!user) return;

    try {
      const isSaved = savedPosts.has(postId);
      
      if (isSaved) {
        await supabase
          .from('post_saves')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        
        setSavedPosts(prev => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      } else {
        await supabase
          .from('post_saves')
          .insert({ user_id: user.id, post_id: postId });
        
        setSavedPosts(prev => new Set([...prev, postId]));
      }

      // Update post saves count in UI
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, saves_count: post.saves_count + (isSaved ? -1 : 1) }
          : post
      ));
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading posts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex-1">
          <h1 className="font-semibold text-lg text-gray-900">{place.name}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{displayCity}</span>
            {place.category && (
              <>
                <span>•</span>
                <Badge variant="secondary" className="text-xs">
                  {place.category}
                </Badge>
              </>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {posts.length} post{posts.length !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-gray-500">
            <Users className="w-3 h-3 inline mr-1" />
            {new Set(posts.map(p => p.user_id)).size} visitor{new Set(posts.map(p => p.user_id)).size !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-600 mb-6">Be the first to share your experience at {place.name}!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Post Image */}
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="aspect-square bg-gray-100 relative">
                    <img
                      src={post.media_urls[0]}
                      alt="Post"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {post.media_urls.length > 1 && (
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                        +{post.media_urls.length - 1}
                      </div>
                    )}
                  </div>
                )}

                {/* Post Content */}
                <div className="p-4">
                  {/* User Info */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {post.profiles?.full_name?.[0] || post.profiles?.username?.[0] || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {post.profiles?.full_name || post.profiles?.username || 'User'}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(post.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Caption */}
                  {post.caption && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {post.caption}
                    </p>
                  )}

                  {/* Engagement Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {post.likes_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {post.comments_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bookmark className="w-3 h-3" />
                        {post.saves_count}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1 px-2 py-1 h-auto ${
                        likedPosts.has(post.id) ? 'text-red-600' : 'text-gray-600'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${likedPosts.has(post.id) ? 'fill-current' : ''}`} />
                      <span className="text-xs">Like</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 px-2 py-1 h-auto text-gray-600"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-xs">Comment</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSave(post.id)}
                      className={`flex items-center gap-1 px-2 py-1 h-auto ${
                        savedPosts.has(post.id) ? 'text-blue-600' : 'text-gray-600'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${savedPosts.has(post.id) ? 'fill-current' : ''}`} />
                      <span className="text-xs">Save</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 px-2 py-1 h-auto text-gray-600"
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="text-xs">Share</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationPostLibrary;
