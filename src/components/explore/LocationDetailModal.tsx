
import React, { useState, useEffect } from 'react';
import { X, Heart, Bookmark, Share2, MapPin, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { locationInteractionService } from '@/services/locationInteractionService';

interface LocationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: any;
}

const LocationDetailModal = ({ isOpen, onClose, location }: LocationDetailModalProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [friendsWhoPosted, setFriendsWhoPosted] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (isOpen && location) {
      loadLocationData();
      loadInteractionStatus();
    }
  }, [isOpen, location]);

  const loadLocationData = async () => {
    if (!location?.id) return;
    
    setLoading(true);
    try {
      console.log('🔍 Loading posts for location:', location.id, 'Google Place ID:', location.google_place_id);
      
      // Get posts for this specific location OR any location with the same google_place_id
      let postIds: string[] = [];

      // Get all locations that match either by google_place_id or by name
      const { data: allMatchingLocations, error: locationsError } = await supabase
        .from('locations')
        .select('id')
        .or(
          location.google_place_id 
            ? `google_place_id.eq.${location.google_place_id},name.ilike.${location.name}`
            : `name.ilike.${location.name}`
        );
      
      if (locationsError) {
        console.error('❌ Error fetching matching locations:', locationsError);
        throw locationsError;
      }
      
      const locationIds = allMatchingLocations?.map(l => l.id) || [location.id];
      console.log('📍 Searching posts from all matching locations:', locationIds.length, locationIds);
      
      // Get posts from all matching locations
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, caption, media_urls, created_at, user_id')
        .in('location_id', locationIds)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('❌ Error fetching posts:', postsError);
        throw postsError;
      }
      
      console.log('📊 Found posts:', postsData?.length || 0);
      setPosts(postsData || []);

      // Get user profiles for the posts
      if (postsData && postsData.length > 0) {
        const userIds = [...new Set(postsData.map(p => p.user_id))];
        // SECURITY FIX: Only select safe profile fields
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (!profilesError && profiles) {
          // Create a map of user profiles
          const profileMap = new Map(profiles.map(p => [p.id, p]));
          
          // Add profile data to posts
          const enrichedPosts = postsData.map(post => ({
            ...post,
            profiles: profileMap.get(post.user_id)
          }));
          
          setPosts(enrichedPosts);
          console.log('✅ Posts enriched with profiles:', enrichedPosts.length);
        }
      }

      // Get friends who posted here (if user follows them)  
      if (user && posts.length) {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = followingData?.map(f => f.following_id) || [];
        const friendPosts = posts.filter(post => followingIds.includes(post.user_id));
        
        // Get unique friends
        const uniqueFriends = new Map();
        friendPosts.forEach(post => {
          const profile = post.profiles as any;
          if (profile && !uniqueFriends.has(profile.id)) {
            uniqueFriends.set(profile.id, {
              id: profile.id,
              name: profile.username,
              avatar: profile.avatar_url
            });
          }
        });

        setFriendsWhoPosted(Array.from(uniqueFriends.values()));
      }
    } catch (error) {
      console.error('Error loading location data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInteractionStatus = async () => {
    if (!location?.id) return;

    try {
      const [liked, saved, count] = await Promise.all([
        locationInteractionService.isLocationLiked(location.id),
        locationInteractionService.isLocationSaved(location.id),
        locationInteractionService.getLocationLikeCount(location.id)
      ]);
      
      setIsLiked(liked);
      setIsSaved(saved);
      setLikeCount(count);
    } catch (error) {
      console.error('Error loading interaction status:', error);
    }
  };

  const handleLikeToggle = async () => {
    try {
      const result = await locationInteractionService.toggleLocationLike(location.id);
      setIsLiked(result.liked);
      setLikeCount(result.count);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSaveToggle = async () => {
    try {
      if (isSaved) {
        await locationInteractionService.unsaveLocation(location.id);
        setIsSaved(false);
      } else {
        await locationInteractionService.saveLocation(location.id, location);
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{location.name}</h2>
              <p className="text-gray-500 text-sm">{location.address}</p>
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm" className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Stats */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-red-400" />
                <span>{likeCount} likes</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span>{posts.length} posts</span>
              </div>
              {friendsWhoPosted.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-green-400" />
                  <span>{friendsWhoPosted.length} friends posted here</span>
                </div>
              )}
            </div>

            {/* Friends who posted */}
            {friendsWhoPosted.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Friends who posted here:</p>
                <div className="flex gap-2 flex-wrap">
                  {friendsWhoPosted.map(friend => (
                    <div key={friend.id} className="flex items-center gap-2 bg-blue-50 rounded-full px-3 py-1">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.name} className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                          {friend.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-medium text-blue-700">{friend.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Posts Grid */}
          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading posts...</p>
              </div>
            ) : posts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {posts.map(post => (
                  <div key={post.id} className="aspect-square rounded-xl overflow-hidden relative group cursor-pointer">
                    <img 
                      src={post.media_urls[0]} 
                      alt={post.caption || 'Post'} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1">
                      {(post.profiles as any)?.avatar_url ? (
                        <img 
                          src={(post.profiles as any).avatar_url} 
                          alt={(post.profiles as any).username} 
                          className="w-6 h-6 rounded-full border-2 border-white"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs">
                          {((post.profiles as any)?.username || 'U').charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No posts yet</p>
                <p className="text-gray-400 text-sm">Be the first to post about this place!</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-3">
            <Button
              onClick={handleLikeToggle}
              variant="ghost"
              className={`flex-1 rounded-xl transition-all duration-200 ${
                isLiked 
                  ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                  : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
              Like
            </Button>

            <Button
              onClick={handleSaveToggle}
              variant="ghost"
              className={`flex-1 rounded-xl transition-all duration-200 ${
                isSaved 
                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                  : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <Bookmark className={`w-4 h-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
              Save
            </Button>

            <Button
              variant="ghost"
              className="flex-1 rounded-xl text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationDetailModal;
