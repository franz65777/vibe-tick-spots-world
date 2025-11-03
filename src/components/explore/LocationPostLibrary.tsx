import React, { useState, useEffect } from 'react';
import { ChevronLeft, MapPin, Calendar, Users, Heart, MessageCircle, Share2, Bookmark, X, Navigation, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocationInteraction } from '@/hooks/useLocationInteraction';
import { locationInteractionService } from '@/services/locationInteractionService';
import PlaceInteractionModal from '@/components/home/PlaceInteractionModal';
import { LocationShareModal } from './LocationShareModal';
import PostDetailModal from './PostDetailModal';
import LocationReviewModal from './LocationReviewModal';
import { toast } from 'sonner';
import SavedByModal from './SavedByModal';
import { useNormalizedCity } from '@/hooks/useNormalizedCity';
import { useUserPosts } from '@/hooks/useUserPosts';
import { useDetailedAddress } from '@/hooks/useDetailedAddress';
import { useLocationStats } from '@/hooks/useLocationStats';
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
    coordinates?: {
      lat: number;
      lng: number;
    };
    postCount?: number;
  };
  isOpen: boolean;
  onClose: () => void;
}
const LocationPostLibrary = ({
  place,
  isOpen,
  onClose
}: LocationPostLibraryProps) => {
  const { t } = useTranslation();
  const {
    user
  } = useAuth();
  const [posts, setPosts] = useState<LocationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [showSavedBy, setShowSavedBy] = useState(false);
  const { posts: userPosts } = useUserPosts(user?.id);
  const { cityLabel: displayCity } = useNormalizedCity({
    id: place?.google_place_id || place?.id,
    city: place?.city,
    coordinates: place?.coordinates,
    address: place?.address
  });
  const { detailedAddress } = useDetailedAddress({
    id: place?.google_place_id || place?.id,
    city: place?.city,
    coordinates: place?.coordinates,
    address: place?.address
  });
  const {
    trackSave,
    trackVisit
  } = useLocationInteraction();
  const { stats, loading: statsLoading } = useLocationStats(
    place?.id || null,
    place?.google_place_id || null
  );

  // All hooks MUST be called before any early returns
  useEffect(() => {
    if (!place?.id) return;
    fetchLocationPosts();
    if (user) {
      fetchUserInteractions();
      checkIfLocationSaved();
    }
  }, [place?.id, user]);

  // Listen for global save changes
  useEffect(() => {
    const handleSaveChanged = (event: CustomEvent) => {
      const { locationId, isSaved: newSavedState } = event.detail;
      // Update if event matches either internal id or google_place_id
      if (locationId === place?.id || locationId === place?.google_place_id) {
        setIsSaved(newSavedState);
      }
    };
    
    window.addEventListener('location-save-changed', handleSaveChanged as EventListener);
    return () => {
      window.removeEventListener('location-save-changed', handleSaveChanged as EventListener);
    };
  }, [place?.id, place?.google_place_id]);

  const checkIfLocationSaved = async () => {
    if (!user || !place?.id) return;
    try {
      // Try with current id first
      let saved = await locationInteractionService.isLocationSaved(place.id);
      // If not saved, try with google_place_id as fallback
      if (!saved && place.google_place_id && place.google_place_id !== place.id) {
        saved = await locationInteractionService.isLocationSaved(place.google_place_id);
      }
      setIsSaved(!!saved);
    } catch (error) {
      console.error('Error checking if location is saved:', error);
    }
  };

  // Early return after ALL hooks
  if (!place) {
    return null;
  }
  const fetchLocationPosts = async (page: number = 1) => {
    try {
      setLoading(true);
      console.log('🔍 FETCHING POSTS FOR LOCATION:', place.name, 'ID:', place.id, 'Page:', page);
      
      // Find all internal location UUIDs that match this place
      let locationIds: string[] = [];
      
      if (place.google_place_id) {
        console.log('📍 Finding locations with Google Place ID:', place.google_place_id);
        // Find all locations with this google_place_id
        const { data: relatedLocations, error: locationError } = await supabase
          .from('locations')
          .select('id, name, google_place_id')
          .eq('google_place_id', place.google_place_id);
        
        if (locationError) {
          console.error('❌ Error finding related locations:', locationError);
        } else if (relatedLocations && relatedLocations.length > 0) {
          locationIds = relatedLocations.map(loc => loc.id);
          console.log('✅ Found location IDs by Google Place ID:', locationIds);
        }
      }
      
      // If place.id looks like a UUID, add it
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(place.id) && !locationIds.includes(place.id)) {
        locationIds.push(place.id);
      }
      
      // If no location IDs found yet, try by name
      if (locationIds.length === 0) {
        const { data: nameMatchLocations, error: nameError } = await supabase
          .from('locations')
          .select('id, name')
          .ilike('name', place.name);
        
        if (nameError) {
          console.error('❌ Error finding locations by name:', nameError);
        } else if (nameMatchLocations && nameMatchLocations.length > 0) {
          locationIds = nameMatchLocations.map(loc => loc.id);
          console.log('✅ Found location IDs by name:', locationIds);
        }
      }
      
      console.log('🎯 FINAL LOCATION IDs TO SEARCH (UUIDs only):', locationIds);
      
      // If no valid location IDs found, return empty
      if (locationIds.length === 0) {
        console.log('❌ No valid location IDs found');
        setPosts([]);
        setLoading(false);
        return;
      }
      const limit = 8;
      const offset = (page - 1) * limit;
      const {
        data: postsData,
        error: postsError
      } = await supabase.from('posts').select(`
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
        `).in('location_id', locationIds).order('created_at', {
        ascending: false
      }).range(offset, offset + limit - 1);
      if (postsError) {
        console.error('❌ Error fetching posts:', postsError);
        throw postsError;
      }
      console.log('📊 RAW POSTS FOUND:', postsData?.length || 0);
      if (postsData && postsData.length > 0) {
        const userIds = [...new Set(postsData.map(post => post.user_id))];
        console.log('👥 Fetching profiles for users:', userIds);

        // SECURITY FIX: Only select safe profile fields  
        const {
          data: profilesData,
          error: profilesError
        } = await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds);
        if (profilesError) {
          console.error('❌ Error fetching profiles:', profilesError);
        }
        const postsWithProfiles = postsData.map(post => ({
          ...post,
          profiles: profilesData?.find(profile => profile.id === post.user_id) || null
        }));
        console.log(`✅ FINAL POSTS COUNT: ${postsWithProfiles.length} for location: ${place.name}`);
        if (page === 1) {
          setPosts(postsWithProfiles);
        } else {
          setPosts(prev => [...prev, ...postsWithProfiles]);
        }
        setHasMorePosts(postsData.length === limit);
      } else {
        console.log('❌ No posts found for this location');
        if (page === 1) {
          setPosts([]);
        }
        setHasMorePosts(false);
      }
    } catch (error) {
      console.error('❌ CRITICAL ERROR fetching location posts:', error);
      if (page === 1) {
        setPosts([]);
      }
    } finally {
      setLoading(false);
    }
  };
  const loadMorePosts = () => {
    const nextPage = postsPage + 1;
    setPostsPage(nextPage);
    fetchLocationPosts(nextPage);
  };
  const fetchUserInteractions = async () => {
    if (!user) return;
    try {
      const {
        data: likes
      } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id);
      const {
        data: saves
      } = await supabase.from('post_saves').select('post_id').eq('user_id', user.id);
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
        await supabase.from('post_likes').delete().eq('user_id', user.id).eq('post_id', postId);
        setLikedPosts(prev => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      } else {
        await supabase.from('post_likes').insert({
          user_id: user.id,
          post_id: postId
        });
        setLikedPosts(prev => new Set([...prev, postId]));
      }
      setPosts(prev => prev.map(post => post.id === postId ? {
        ...post,
        likes_count: post.likes_count + (isLiked ? -1 : 1)
      } : post));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };
  const handleSave = async (postId: string) => {
    if (!user) return;
    try {
      const isSaved = savedPosts.has(postId);
      if (isSaved) {
        await supabase.from('post_saves').delete().eq('user_id', user.id).eq('post_id', postId);
        setSavedPosts(prev => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      } else {
        await supabase.from('post_saves').insert({
          user_id: user.id,
          post_id: postId
        });
        setSavedPosts(prev => new Set([...prev, postId]));
      }
      setPosts(prev => prev.map(post => post.id === postId ? {
        ...post,
        saves_count: post.saves_count + (isSaved ? -1 : 1)
      } : post));
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
  const handleSaveLocation = async () => {
    if (!user) {
      toast.error('Please log in to save locations');
      return;
    }
    try {
      if (isSaved) {
        // Unsave the location
        await locationInteractionService.unsaveLocation(place.id);
        setIsSaved(false);
        toast.success('Location removed from saved');
        // Emit global events for both identifiers
        window.dispatchEvent(new CustomEvent('location-save-changed', { 
          detail: { locationId: place.id, isSaved: false } 
        }));
        if (place.google_place_id) {
          window.dispatchEvent(new CustomEvent('location-save-changed', { 
            detail: { locationId: place.google_place_id, isSaved: false } 
          }));
        }
      } else {
        // Save the location
        const locationData = {
          google_place_id: place.google_place_id || place.id,
          name: place.name,
          address: place.address,
          latitude: place.coordinates?.lat || 0,
          longitude: place.coordinates?.lng || 0,
          category: place.category || 'place',
          types: place.category ? [place.category] : []
        };

        await locationInteractionService.saveLocation(place.id, locationData);
        setIsSaved(true);
        toast.success('Location saved successfully!');
        // Emit global events for both identifiers
        window.dispatchEvent(new CustomEvent('location-save-changed', { 
          detail: { locationId: place.id, isSaved: true } 
        }));
        if (place.google_place_id) {
          window.dispatchEvent(new CustomEvent('location-save-changed', { 
            detail: { locationId: place.google_place_id, isSaved: true } 
          }));
        }
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      toast.error('Failed to update location');
    }
  };
  
  const handleVisited = () => {
    window.location.href = '/add';
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600 font-medium">Loading posts...</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-white px-4 py-4 flex items-center gap-3 shadow-sm border-b">
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-bold text-lg text-gray-900">{place.name}</h1>
                {/* Pin Count & Rating */}
                {!statsLoading && (
            <div className="flex items-center gap-1.5">
              {stats.totalSaves > 0 && (
                <button
                  onClick={() => setShowSavedBy(true)}
                  className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors"
                >
                  <Bookmark className="w-3 h-3 fill-blue-600 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-600">{stats.totalSaves}</span>
                </button>
              )}
                    {stats.averageRating && (
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-600">{stats.averageRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="w-4 h-4" />
                <span>{detailedAddress}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white px-4 py-3 border-b">
            <div className="grid grid-cols-4 gap-2">
              <Button
                onClick={handleSaveLocation}
                size="sm"
                variant="secondary"
                className="flex-col h-auto py-3 gap-1 rounded-2xl"
              >
                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                <span className="text-xs">{t(isSaved ? 'saved' : 'save', { ns: 'common' })}</span>
              </Button>

              <Button
                onClick={() => setIsReviewModalOpen(true)}
                size="sm"
                variant="secondary"
                className="flex-col h-auto py-3 gap-1 rounded-2xl"
              >
                <Star className="w-5 h-5" />
                <span className="text-xs">{t('review', { ns: 'explore' })}</span>
              </Button>

              <Button
                onClick={() => {
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  const coords = place.coordinates ? `${place.coordinates.lat},${place.coordinates.lng}` : '';
                  const url = isIOS 
                    ? `maps://maps.apple.com/?daddr=${coords}`
                    : `https://www.google.com/maps/dir/?api=1&destination=${coords}`;
                  window.open(url, '_blank');
                }}
                size="sm"
                variant="secondary"
                className="flex-col h-auto py-3 gap-1 rounded-2xl"
              >
                <Navigation className="w-5 h-5" />
                <span className="text-xs">{t('directions', { ns: 'explore' })}</span>
              </Button>

              <Button
                onClick={() => setIsShareModalOpen(true)}
                size="sm"
                variant="secondary"
                className="flex-col h-auto py-3 gap-1 rounded-2xl"
              >
                <Share2 className="w-5 h-5" />
                <span className="text-xs">{t('share', { ns: 'common' })}</span>
              </Button>
            </div>
          </div>

          {/* Posts Library - vertical grid with scrolling */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <MapPin className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('noPosts', { ns: 'explore', defaultValue: 'No posts yet' })}</h3>
                <p className="text-gray-600 mb-6">{t('beFirstToShare', { ns: 'explore', defaultValue: 'Be the first to share your experience at' })} {detailedAddress}!</p>
                
                {/* Show user's posts from their profile - only for this location */}
                {userPosts && userPosts.filter(post => post.location_id === place.id || post.locations?.id === place.id).length > 0 && (
                  <div className="w-full mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">{t('yourPostsAt', { ns: 'explore', defaultValue: 'Your Posts at' })} {place.name}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {userPosts
                        .filter(post => post.location_id === place.id || post.locations?.id === place.id)
                        .slice(0, 4)
                        .map((post) => (
                          <div 
                            key={post.id} 
                            className="relative h-32 bg-gray-200 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition shadow-sm"
                              onClick={() => setSelectedPostId(post.id)}
                            >
                            {post.media_urls && post.media_urls.length > 0 && (
                              <img 
                                src={post.media_urls[0]} 
                                alt="Post" 
                                className="w-full h-full object-cover" 
                                loading="lazy" 
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                <Button className="bg-blue-600 hover:bg-blue-700 mt-6" onClick={() => window.location.href = '/add'}>
                  {t('shareExperience', { ns: 'explore', defaultValue: 'Share Your Experience' })}
                </Button>
              </div>
            ) : (
              <div className="p-3">
                <div className="grid grid-cols-2 gap-3">
                  {posts.map(post => (
                    <div 
                      key={post.id} 
                      className="relative h-48 bg-gray-200 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition shadow-sm" 
                      onClick={() => setSelectedPostId(post.id)}
                    >
                      {post.media_urls && post.media_urls.length > 0 && (
                        <>
                          <img src={post.media_urls[0]} alt="Post" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                          {/* User Avatar Overlay */}
                          <div className="absolute top-2 left-2">
                            <Avatar className="w-8 h-8 border-2 border-white shadow-lg">
                              <AvatarImage src={post.profiles?.avatar_url} />
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </>
                      )}
                      {post.media_urls && post.media_urls.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium">
                          +{post.media_urls.length - 1}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Load More Button */}
                {hasMorePosts && (
                  <div className="mt-4 flex justify-center pb-4">
                    <Button onClick={loadMorePosts} disabled={loading} variant="outline" size="sm">
                      {loading ? t('loading', { ns: 'common', defaultValue: 'Loading...' }) : t('loadMore', { ns: 'common', defaultValue: 'Load More' })}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Visited -> comments modal */}
          <PlaceInteractionModal isOpen={showComments} onClose={() => setShowComments(false)} mode="comments" place={{
            id: place.id,
            name: place.name,
            category: place.category,
            coordinates: place.coordinates
          }} />

          {/* Share modal */}
          <LocationShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} place={place} />
          
          {/* Post Detail Modal */}
          {selectedPostId && (
            <PostDetailModal
              postId={selectedPostId}
              isOpen={true}
              onClose={() => setSelectedPostId(null)}
              source="pin"
            />
          )}
          
          {/* Review Modal */}
          <LocationReviewModal
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            location={{
              id: place.id,
              name: place.name,
              google_place_id: place.google_place_id
            }}
          />

          {/* Saved By Modal */}
          <SavedByModal
            isOpen={showSavedBy}
            onClose={() => setShowSavedBy(false)}
            placeId={place.id}
            googlePlaceId={place.google_place_id || null}
          />
        </div>
      )}
    </div>
  );
};
export default LocationPostLibrary;