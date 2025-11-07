import React, { useState, useEffect } from 'react';
import { ChevronLeft, MapPin, Calendar, Users, Heart, MessageCircle, Share2, Bookmark, X, Navigation, Star, Bell, BellOff, Camera } from 'lucide-react';
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
import { useMutedLocations } from '@/hooks/useMutedLocations';
import { useMarketingCampaign } from '@/hooks/useMarketingCampaign';
import MarketingCampaignBanner from './MarketingCampaignBanner';
import { cn } from '@/lib/utils';
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
  rating?: number;
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
  const { mutedLocations, muteLocation, unmuteLocation, isMuting } = useMutedLocations(user?.id);
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
  const [activeTab, setActiveTab] = useState<'posts' | 'reviews'>('posts');
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
  const { campaign } = useMarketingCampaign(place?.id, place?.google_place_id);
  const [isCampaignExpanded, setIsCampaignExpanded] = useState(false);

  // All hooks MUST be called before any early returns
  useEffect(() => {
    if (!place?.id) return;
    setPostsPage(1);
    fetchLocationPosts(1);
    if (user) {
      fetchUserInteractions();
      checkIfLocationSaved();
    }
  }, [place?.id, user, activeTab]);

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
      const limit = 20;
      const offset = (page - 1) * limit;
      
      // Build query based on active tab
      let query = supabase.from('posts').select(`
          id,
          user_id,
          caption,
          media_urls,
          likes_count,
          comments_count,
          saves_count,
          created_at,
          metadata,
          location_id,
          rating
        `).in('location_id', locationIds);
      
      // Filter based on tab
      if (activeTab === 'posts') {
        // Posts: only those with media_urls
        query = query.not('media_urls', 'is', null);
      } else {
        // Reviews: only those with rating
        query = query.not('rating', 'is', null).gt('rating', 0);
      }
      
      const {
        data: postsData,
        error: postsError
      } = await query.order('created_at', {
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
          <div className="bg-white px-4 py-4 pt-8 flex items-center gap-3 shadow-sm">
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex-1">
              <div className="flex items-start gap-2 mb-1">
                <h1 className="font-bold text-lg text-gray-900 text-left">{place.name}</h1>
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
                <span className="text-left">{detailedAddress}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white px-4 py-2">
            <div className="flex items-center gap-1.5">
              <div className="grid grid-cols-4 gap-1.5 flex-1">
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

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  const isMuted = mutedLocations?.some((m: any) => m.location_id === place.id);
                  if (isMuted) {
                    unmuteLocation(place.id);
                  } else {
                    muteLocation(place.id);
                  }
                }}
                disabled={isMuting}
                size="icon"
                variant="secondary"
                className={`h-10 w-10 rounded-full flex-shrink-0 ${
                  mutedLocations?.some((m: any) => m.location_id === place.id) ? 'bg-muted text-muted-foreground hover:bg-muted/80' : ''
                }`}
              >
                {mutedLocations?.some((m: any) => m.location_id === place.id) ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Marketing Campaign - Expandable Section */}
          {campaign && (
            <div className="bg-white px-4 pb-2">
              <button
                onClick={(e) => { e.stopPropagation(); setIsCampaignExpanded(!isCampaignExpanded); }}
                className="w-full px-3 py-2 flex items-center justify-between bg-background border-2 border-primary/20 hover:border-primary/40 rounded-xl transition-all"
              >
                <span className="text-sm font-medium truncate text-foreground">{campaign.title}</span>
                <svg className={`w-4 h-4 text-primary transition-transform ${isCampaignExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {isCampaignExpanded && (
                <div className="pt-2">
                  <MarketingCampaignBanner campaign={campaign} />
                </div>
              )}
            </div>
          )}

          {/* Filter Tabs */}
          <div className="bg-white px-4 py-3">
            <div className="flex bg-muted rounded-xl p-1">
              <button
                onClick={() => setActiveTab('posts')}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'posts'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {t('postsTab', { ns: 'explore', defaultValue: 'Posts' })}
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'reviews'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {t('reviewsTab', { ns: 'explore', defaultValue: 'Reviews' })}
              </button>
            </div>
          </div>

          {/* Posts Library - vertical grid with scrolling */}
          <div className="flex-1 overflow-y-auto scrollbar-hide bg-white">
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                  {activeTab === 'posts' ? (
                    <Camera className="w-10 h-10 text-muted-foreground" />
                  ) : (
                    <Star className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {activeTab === 'posts' 
                    ? t('noPosts', { ns: 'explore', defaultValue: 'No posts yet' })
                    : t('noReviewsYet', { ns: 'common', defaultValue: 'No reviews yet' })
                  }
                </h3>
                <p className="text-muted-foreground mb-6">
                  {t('beFirstToShare', { ns: 'explore', defaultValue: 'Be the first to share your experience at' })} {detailedAddress}!
                </p>
                
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
                      className="relative aspect-square bg-muted rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition shadow-sm" 
                      onClick={() => setSelectedPostId(post.id)}
                    >
                      {activeTab === 'posts' && post.media_urls && post.media_urls.length > 0 ? (
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
                          {post.media_urls.length > 1 && (
                            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium">
                              +{post.media_urls.length - 1}
                            </div>
                          )}
                        </>
                      ) : activeTab === 'reviews' && post.rating ? (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center p-4">
                          <Avatar className="w-12 h-12 mb-2 border-2 border-primary/20">
                            <AvatarImage src={post.profiles?.avatar_url} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                            <span className="text-2xl font-bold text-foreground">{post.rating}</span>
                            <span className="text-sm text-muted-foreground">/10</span>
                          </div>
                          {post.caption && (
                            <p className="text-xs text-center text-muted-foreground line-clamp-3 mt-2">
                              {post.caption}
                            </p>
                          )}
                        </div>
                      ) : null}
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