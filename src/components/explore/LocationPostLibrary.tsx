
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
  onClose: () => void;
}

const LocationPostLibrary = ({ place, onClose }: LocationPostLibraryProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<LocationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());

  const displayCity = place.city || place.address?.split(',')[1]?.trim() || 'Unknown City';

  useEffect(() => {
    fetchLocationPosts();
    if (user) {
      fetchUserInteractions();
    }
  }, [place.id, user]);

  const fetchLocationPosts = async () => {
    try {
      setLoading(true);
      console.log('🔍 FETCHING POSTS FOR LOCATION:', place.name, 'ID:', place.id);
      
      let locationIds = [place.id];

      // CRITICAL FIX: Find ALL location IDs that share the same Google Place ID OR exact name
      if (place.google_place_id) {
        console.log('📍 Finding all locations with Google Place ID:', place.google_place_id);
        
        const { data: relatedLocations, error: locationError } = await supabase
          .from('locations')
          .select('id, name, google_place_id')
          .or(`google_place_id.eq.${place.google_place_id},name.ilike.${place.name}`);

        if (locationError) {
          console.error('❌ Error finding related locations:', locationError);
        } else if (relatedLocations) {
          locationIds = relatedLocations.map(loc => loc.id);
          console.log('✅ Found related location IDs:', locationIds);
        }
      } else {
        // If no Google Place ID, try to find by exact name match
        const { data: nameMatchLocations, error: nameError } = await supabase
          .from('locations')
          .select('id, name')
          .ilike('name', place.name);

        if (nameError) {
          console.error('❌ Error finding locations by name:', nameError);
        } else if (nameMatchLocations) {
          locationIds = nameMatchLocations.map(loc => loc.id);
          console.log('✅ Found name-matched location IDs:', locationIds);
        }
      }

      // Ensure the current location ID is included
      if (!locationIds.includes(place.id)) {
        locationIds.push(place.id);
      }

      console.log('🎯 FINAL LOCATION IDs TO SEARCH:', locationIds);

      // Fetch ALL posts from ALL related locations
      const { data: postsData, error: postsError } = await supabase
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
          location_id
        `)
        .in('location_id', locationIds)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('❌ Error fetching posts:', postsError);
        throw postsError;
      }

      console.log('📊 RAW POSTS FOUND:', postsData?.length || 0);
      console.log('📋 Posts data:', postsData);

      // Fetch profiles for the users
      if (postsData && postsData.length > 0) {
        const userIds = [...new Set(postsData.map(post => post.user_id))];
        console.log('👥 Fetching profiles for users:', userIds);
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.error('❌ Error fetching profiles:', profilesError);
        }

        // Combine posts with profiles
        const postsWithProfiles = postsData.map(post => ({
          ...post,
          profiles: profilesData?.find(profile => profile.id === post.user_id) || null
        }));

        console.log(`✅ FINAL POSTS COUNT: ${postsWithProfiles.length} for location: ${place.name}`);
        setPosts(postsWithProfiles);
      } else {
        console.log('❌ No posts found for this location');
        setPosts([]);
      }
    } catch (error) {
      console.error('❌ CRITICAL ERROR fetching location posts:', error);
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600 font-medium">Loading posts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-4 flex items-center gap-3 shadow-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="p-2 hover:bg-white/20 rounded-full text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex-1">
          <h1 className="font-bold text-lg text-white">{place.name}</h1>
          <div className="flex items-center gap-2 text-sm text-blue-100">
            <MapPin className="w-4 h-4" />
            <span>{displayCity}</span>
            {place.category && (
              <>
                <span>•</span>
                <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                  {place.category}
                </Badge>
              </>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold text-white">
            {posts.length}
          </div>
          <div className="text-xs text-blue-100">
            post{posts.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
              <MapPin className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-600 mb-6">Be the first to share your experience at {place.name}!</p>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Share Your Experience
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                {/* Post Image */}
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    <img
                      src={post.media_urls[0]}
                      alt="Post"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {post.media_urls.length > 1 && (
                      <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-medium">
                        +{post.media_urls.length - 1}
                      </div>
                    )}
                  </div>
                )}

                {/* Post Content */}
                <div className="p-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white text-sm font-semibold">
                        {post.profiles?.full_name?.[0] || post.profiles?.username?.[0] || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">
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
                    <p className="text-sm text-gray-700 mb-3 line-clamp-3 leading-relaxed">
                      {post.caption}
                    </p>
                  )}

                  {/* Engagement Stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3 py-2 border-t border-gray-100">
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

                  {/* Action Buttons */}
                  <div className="grid grid-cols-4 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id)}
                      className={`h-8 px-2 rounded-lg transition-all ${
                        likedPosts.has(post.id) ? 'text-red-600 bg-red-50' : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${likedPosts.has(post.id) ? 'fill-current' : ''}`} />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <MessageCircle className="w-3 h-3" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSave(post.id)}
                      className={`h-8 px-2 rounded-lg transition-all ${
                        savedPosts.has(post.id) ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <Bookmark className={`w-3 h-3 ${savedPosts.has(post.id) ? 'fill-current' : ''}`} />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 rounded-lg text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-all"
                    >
                      <Share2 className="w-3 h-3" />
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
