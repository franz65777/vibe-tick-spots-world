import React, { useState, useEffect } from 'react';
import { X, MapPin, Heart, Bookmark, MessageCircle, Share } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Post {
  id: string;
  user_id: string;
  caption?: string;
  media_urls: string[];
  likes_count: number;
  saves_count: number;
  comments_count: number;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url?: string;
  } | null;
}

interface LocationDetailSheetProps {
  locationId: string;
  locationName: string;
  locationAddress?: string;
  isOpen: boolean;
  onClose: () => void;
}

const LocationDetailSheet = ({
  locationId,
  locationName,
  locationAddress,
  isOpen,
  onClose
}: LocationDetailSheetProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [otherPosts, setOtherPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (isOpen && locationId) {
      fetchLocationPosts();
    }
  }, [isOpen, locationId, user]);

  const fetchLocationPosts = async () => {
    try {
      setLoading(true);
      console.log('Fetching posts for location:', locationId);

      // First get posts for this location - handle both UUID and string IDs
      let postsQuery = supabase
        .from('posts')
        .select(`
          id,
          user_id,
          caption,
          media_urls,
          likes_count,
          saves_count,
          comments_count,
          created_at
        `)
        .order('created_at', { ascending: false });

      // Check if locationId is a UUID or a Google Place ID
      if (locationId.includes('-')) {
        // Likely a UUID
        postsQuery = postsQuery.eq('location_id', locationId);
      } else {
        // Likely a Google Place ID, need to find the location first
        const { data: locationData, error: locationError } = await supabase
          .from('locations')
          .select('id')
          .eq('google_place_id', locationId)
          .maybeSingle();

        if (locationError) {
          console.error('Error finding location:', locationError);
          return;
        }

        if (locationData) {
          postsQuery = postsQuery.eq('location_id', locationData.id);
        } else {
          console.log('No location found for place ID:', locationId);
          setPosts([]);
          setFollowingPosts([]);
          setOtherPosts([]);
          return;
        }
      }

      const { data: postsData, error: postsError } = await postsQuery;

      if (postsError) {
        console.error('Error fetching location posts:', postsError);
        return;
      }

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setFollowingPosts([]);
        setOtherPosts([]);
        return;
      }

      // Get user profiles separately
      const userIds = postsData.map(post => post.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      // Create a map of profiles by user_id
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      // Combine posts with profiles
      const postsWithProfiles: Post[] = postsData
        .map(post => {
          const profile = profilesMap.get(post.user_id);
          return {
            ...post,
            profiles: profile ? {
              username: profile.username || 'Unknown User',
              full_name: profile.full_name || profile.username || 'Unknown User',
              avatar_url: profile.avatar_url
            } : null
          };
        })
        .filter(post => post.profiles !== null); // Only keep posts with valid profiles

      setPosts(postsWithProfiles);

      // If user is logged in, separate posts from followed users
      if (user) {
        // Get list of users the current user follows
        const { data: followsData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followedUserIds = followsData?.map(f => f.following_id) || [];

        // Separate posts
        const following = postsWithProfiles.filter(post => 
          followedUserIds.includes(post.user_id)
        );
        
        const others = postsWithProfiles.filter(post => 
          !followedUserIds.includes(post.user_id)
        );

        setFollowingPosts(following);
        setOtherPosts(others);
      } else {
        setFollowingPosts([]);
        setOtherPosts(postsWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching location posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const PostCard = ({ post }: { post: Post }) => (
    <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
      {/* User info */}
      <div className="flex items-center p-4 pb-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
          {post.profiles?.avatar_url ? (
            <img 
              src={post.profiles.avatar_url} 
              alt={post.profiles.username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-white text-sm font-medium">
              {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
            </span>
          )}
        </div>
        <div className="ml-3">
          <p className="font-medium text-gray-900">
            {post.profiles?.full_name || post.profiles?.username || 'Unknown User'}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(post.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="relative">
          <img
            src={post.media_urls[0]}
            alt="Post"
            className="w-full h-64 object-cover"
          />
          {post.media_urls.length > 1 && (
            <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
              +{post.media_urls.length - 1}
            </div>
          )}
        </div>
      )}

      {/* Caption */}
      {post.caption && (
        <div className="px-4 pt-3">
          <p className="text-gray-800">{post.caption}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors">
            <Heart className="w-5 h-5" />
            <span className="text-sm">{post.likes_count}</span>
          </button>
          <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{post.comments_count}</span>
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <button className="text-gray-600 hover:text-blue-500 transition-colors">
            <Bookmark className="w-5 h-5" />
          </button>
          <button className="text-gray-600 hover:text-gray-800 transition-colors">
            <Share className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="bg-white w-full sm:w-full sm:max-w-2xl sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <h2 className="font-semibold text-gray-900">{locationName}</h2>
              {locationAddress && (
                <p className="text-sm text-gray-500">{locationAddress}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[70vh] p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No content yet</h3>
              <p className="text-gray-500">Be the first to share something at this location!</p>
            </div>
          ) : (
            <div>
              {/* Posts from followed users first */}
              {followingPosts.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-blue-600 mb-3">From people you follow</h3>
                  {followingPosts.map(post => <PostCard key={post.id} post={post} />)}
                </div>
              )}

              {/* Other posts */}
              {otherPosts.length > 0 && (
                <div>
                  {followingPosts.length > 0 && (
                    <h3 className="text-sm font-medium text-gray-500 mb-3">More posts</h3>
                  )}
                  {otherPosts.map(post => <PostCard key={post.id} post={post} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationDetailSheet;
