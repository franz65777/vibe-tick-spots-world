
import React, { useState, useEffect } from 'react';
import { X, Phone, Navigation, Bookmark, Check, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { locationInteractionService } from '@/services/locationInteractionService';
import { useAnalytics } from '@/hooks/useAnalytics';
import { toast } from 'sonner';

interface LocationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: any;
}

const LocationDetailModal = ({ isOpen, onClose, location }: LocationDetailModalProps) => {
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const [posts, setPosts] = useState<any[]>([]);
  const [friendsWhoPosted, setFriendsWhoPosted] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loadingPhone, setLoadingPhone] = useState(false);

  useEffect(() => {
    if (isOpen && location) {
      loadLocationData();
      loadInteractionStatus();
      loadPlaceDetails();
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
    if (!location?.id || !user) return;

    try {
      const saved = await locationInteractionService.isLocationSaved(location.id);
      setIsSaved(saved);
      
      // Check if visited (check if user has posts at this location)
      const { data: userPosts } = await supabase
        .from('posts')
        .select('id')
        .eq('location_id', location.id)
        .eq('user_id', user.id)
        .limit(1);
      
      setIsVisited((userPosts?.length || 0) > 0);
    } catch (error) {
      console.error('Error loading interaction status:', error);
    }
  };

  const loadPlaceDetails = async () => {
    if (!location?.google_place_id) return;
    
    setLoadingPhone(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${location.google_place_id}&fields=formatted_phone_number&key=AIzaSyBMQn6bdmj-wg9xPWyuDOhT-O3sJT9FmKs`
      );
      const data = await response.json();
      if (data.result?.formatted_phone_number) {
        setPhoneNumber(data.result.formatted_phone_number);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    } finally {
      setLoadingPhone(false);
    }
  };

  const handleGetDirections = () => {
    if (location?.coordinates) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${location.coordinates.lat},${location.coordinates.lng}`;
      window.open(url, '_blank');
      trackEvent('directions_clicked', { place_id: location.id, place_name: location.name });
    }
  };

  const handleCall = () => {
    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`;
      trackEvent('call_clicked', { place_id: location.id, place_name: location.name });
    }
  };

  const handleSaveToggle = async () => {
    if (!user) {
      toast.error('Please sign in to save locations');
      return;
    }
    
    try {
      if (isSaved) {
        await locationInteractionService.unsaveLocation(location.id);
        setIsSaved(false);
        toast.success('Removed from saved');
      } else {
        await locationInteractionService.saveLocation(location.id, location);
        setIsSaved(true);
        setIsVisited(false); // Mutually exclusive
        toast.success('Saved for later');
        trackEvent('save_clicked', { place_id: location.id, place_name: location.name });
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      toast.error('Failed to save location');
    }
  };

  const handleVisitedToggle = async () => {
    if (!user) {
      toast.error('Please sign in to mark as visited');
      return;
    }
    
    try {
      if (isVisited) {
        // Remove visited status (would need to delete user's posts or use a separate table)
        toast.info('To unmark as visited, delete your posts from this location');
        return;
      }
      
      // Mark as visited by creating a post or using a separate visited table
      // For now, just toggle the state and prompt user to add a post
      setIsVisited(true);
      setIsSaved(false); // Mutually exclusive
      toast.success('Marked as visited! Add a post to share your experience');
      trackEvent('visited_marked', { place_id: location.id, place_name: location.name });
    } catch (error) {
      console.error('Error toggling visited:', error);
      toast.error('Failed to mark as visited');
    }
  };

  if (!isOpen) return null;

  // Calculate total friends who interacted (visitors + savers)
  const totalFriends = friendsWhoPosted.length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="relative p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{location.name}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{location.category}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">{location.address}</p>
            </div>
            <Button onClick={onClose} variant="ghost" size="icon" className="rounded-full shrink-0">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Action Buttons */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                onClick={handleGetDirections}
                variant="outline"
                className="rounded-xl h-auto py-3 flex flex-col items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500 transition-all"
              >
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-medium">Directions</span>
              </Button>

              {phoneNumber && (
                <Button
                  onClick={handleCall}
                  variant="outline"
                  className="rounded-xl h-auto py-3 flex flex-col items-center gap-2 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-500 transition-all"
                >
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-xs font-medium">Call</span>
                </Button>
              )}

              <Button
                onClick={handleSaveToggle}
                variant="outline"
                className={`rounded-xl h-auto py-3 flex flex-col items-center gap-2 transition-all ${
                  isSaved 
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-600' 
                    : 'hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-500'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isSaved ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`} />
                </div>
                <span className="text-xs font-medium">{isSaved ? 'Saved' : 'Save'}</span>
              </Button>

              <Button
                onClick={handleVisitedToggle}
                variant="outline"
                className={`rounded-xl h-auto py-3 flex flex-col items-center gap-2 transition-all ${
                  isVisited 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-600' 
                    : 'hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-500'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isVisited ? 'bg-green-100 dark:bg-green-900/40' : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <Check className={`w-5 h-5 ${isVisited ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`} />
                </div>
                <span className="text-xs font-medium">{isVisited ? 'Visited' : 'Mark Visited'}</span>
              </Button>
            </div>
          </div>

          {/* Friends Section */}
          {totalFriends > 0 && (
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {totalFriends} {totalFriends === 1 ? 'friend has' : 'friends have'} been here
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {friendsWhoPosted.slice(0, 8).map(friend => (
                  <div key={friend.id} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-full px-3 py-1.5 border border-blue-100 dark:border-blue-800">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={friend.avatar} alt={friend.name} />
                      <AvatarFallback className="text-xs bg-blue-500 text-white">
                        {friend.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{friend.name}</span>
                  </div>
                ))}
                {friendsWhoPosted.length > 8 && (
                  <div className="flex items-center px-3 py-1.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">+{friendsWhoPosted.length - 8} more</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Map Snippet */}
          {location.coordinates && (
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden">
                <iframe
                  title="Location map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBMQn6bdmj-wg9xPWyuDOhT-O3sJT9FmKs&q=${location.coordinates.lat},${location.coordinates.lng}&zoom=15`}
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* Library Feed */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Photos & Videos from the community
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">({posts.length})</span>
            </div>
            
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm">Loading posts...</p>
              </div>
            ) : posts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {posts.map(post => (
                  <div key={post.id} className="aspect-square rounded-xl overflow-hidden relative group cursor-pointer shadow-sm hover:shadow-md transition-shadow">
                    <img 
                      src={post.media_urls[0]} 
                      alt={post.caption || 'Post'} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-2 left-2 flex items-center gap-2">
                      <Avatar className="w-7 h-7 border-2 border-white shadow-sm">
                        <AvatarImage src={(post.profiles as any)?.avatar_url} alt={(post.profiles as any)?.username} />
                        <AvatarFallback className="text-xs bg-blue-500 text-white">
                          {((post.profiles as any)?.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No posts yet</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">Be the first to share this place!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationDetailModal;
