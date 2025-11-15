import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Upload, Bell, Send, TrendingUp, Eye, Heart, MessageSquare, Share2, Sparkles, Star, Target, Zap } from 'lucide-react';
import BusinessLocationPosts from '@/components/business/BusinessLocationPosts';
import { getCategoryColor, getCategoryIcon } from '@/utils/categoryIcons';
import { formatDetailedAddress } from '@/utils/addressFormatter';
import { toast } from 'sonner';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useLocationStats } from '@/hooks/useLocationStats';
import { useBusinessLocationStats } from '@/hooks/useBusinessLocationStats';
import { useTranslation } from 'react-i18next';
import { useDetailedAddress } from '@/hooks/useDetailedAddress';
import { LocationViewersModal } from '@/components/business/LocationViewersModal';
import { LocationCommentsModal } from '@/components/business/LocationCommentsModal';
import { LocationSharersModal } from '@/components/explore/LocationSharersModal';

interface Location {
  id: string;
  name: string;
  category: string;
  city?: string;
  address?: string;
  image_url?: string;
  google_place_id?: string;
  latitude?: number;
  longitude?: number;
}

interface Post {
  id: string;
  user_id: string;
  caption?: string;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  saves_count: number;
  created_at: string;
  is_pinned?: boolean;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

const BusinessOverviewPageV2 = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { businessProfile } = useBusinessProfile();
  const [location, setLocation] = useState<Location | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showSaversModal, setShowSaversModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { stats, loading: savesLoading } = useLocationStats(location?.id || null, location?.google_place_id || null);
  const { viewsCount, commentsCount, dailyGrowth, loading: statsLoading } = useBusinessLocationStats(location?.id || null);

  const { detailedAddress } = useDetailedAddress({
    id: location?.id,
    city: location?.city,
    address: location?.address,
    coordinates: location?.latitude && location?.longitude 
      ? { lat: Number(location.latitude), lng: Number(location.longitude) }
      : undefined,
  });

  useEffect(() => {
    fetchLocationAndPosts();
    fetchBusinessNotifications();
  }, []);

  // Refetch location when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && location) {
        fetchLocationAndPosts();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [location]);

  const fetchBusinessNotifications = async () => {
    if (!user) return;
    
    try {
      // Count ONLY business-specific unread notifications
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .in('type', ['business_post', 'business_review', 'location_save', 'business_mention']);
      
      setUnreadNotifications(count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchLocationAndPosts = async () => {
    try {
      setLoading(true);

      if (!user) return;

      // First, fetch the business profile to get the linked location
      const { data: businessProfile, error: businessError } = await supabase
        .from('business_profiles')
        .select('location_id, verification_status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (businessError) throw businessError;

      if (!businessProfile || businessProfile.verification_status !== 'verified') {
        toast.error('No verified business account found');
        setLoading(false);
        return;
      }

      if (!businessProfile.location_id) {
        toast.error('No location linked to your business account');
        setLoading(false);
        return;
      }

      // Fetch the specific location owned by this business
      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', businessProfile.location_id)
        .maybeSingle();

      if (locationError) throw locationError;

      if (!locationData) {
        toast.error('No location found for your business account');
        setLoading(false);
        return;
      }

      if (locationData) {
        setLocation(locationData);

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
            profiles!posts_user_id_fkey (
              username,
              avatar_url
            )
          `)
          .eq('location_id', locationData.id)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;
        
        const mappedPosts = (postsData || []).map((post: any) => ({
          id: post.id,
          user_id: post.user_id,
          caption: post.caption,
          media_urls: post.media_urls || [],
          likes_count: post.likes_count || 0,
          comments_count: post.comments_count || 0,
          saves_count: post.saves_count || 0,
          created_at: post.created_at,
          is_pinned: post.metadata?.is_pinned || false,
          profiles: post.profiles
        }));
        
        setPosts(mappedPosts);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(t('failedLoadLocation', { ns: 'business' }));
    } finally {
      setLoading(false);
    }
  };

  const handlePinToggle = async (postId: string, currentlyPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          metadata: { is_pinned: !currentlyPinned }
        })
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, is_pinned: !currentlyPinned }
          : post
      ));
    } catch (error) {
      console.error('Error toggling pin:', error);
      throw error;
    }
  };

  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !location) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${location.id}-${Date.now()}.${fileExt}`;
      const filePath = `location-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('location-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('location-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('locations')
        .update({ image_url: publicUrl })
        .eq('id', location.id);

      if (updateError) throw updateError;

      setLocation({ ...location, image_url: publicUrl });
      toast.success(t('coverImageUpdated', { ns: 'business' }));
    } catch (error) {
      console.error('Error uploading cover image:', error);
      toast.error(t('failedUploadCover', { ns: 'business' }));
    } finally {
      setUploading(false);
    }
  };

  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const formatLocationAddress = () => {
    if (!location) return '';
    const formatted = formatDetailedAddress({
      city: location.city,
      address: location.address,
    });
    return formatted;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('loading', { ns: 'business' })}</p>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{t('noLocationFound', { ns: 'business' })}</p>
        </div>
      </div>
    );
  }

  const totalEngagement = posts.reduce((sum, post) => sum + post.likes_count + post.comments_count + post.saves_count, 0);
  const avgEngagement = posts.length > 0 ? Math.round(totalEngagement / posts.length) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/5 to-background pb-24 w-full max-w-none">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm w-full safe-area-pt">
          <div className="flex items-center justify-between px-safe py-3 w-full">
            <div className="flex items-center gap-3 flex-1">
              {/* Profile Image - Smaller Icon */}
              <div className="relative group flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center cursor-pointer border border-border">
                  {location.image_url ? (
                    <img src={location.image_url} alt={location.name} className="w-full h-full object-cover" />
                  ) : (
                    <img src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d" alt="Business" className="w-full h-full object-cover" />
                  )}
                  <div 
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-3 h-3 text-white" />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageUpload}
                  className="hidden"
                />
              </div>
              
              <div className="flex-1 text-left">
                <h1 className="text-sm font-bold text-foreground flex items-center gap-2">
                  {location.name}
                </h1>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">
                    {detailedAddress || 
                     (location.address && location.city ? `${location.city}, ${location.address}` : location.city) || 
                     'Location'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-0 flex-shrink-0">
              <button 
                onClick={() => navigate('/business/notifications')} 
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 active:scale-95"
              >
                <div className="relative">
                  <Bell className="w-6 h-6" />
                  {unreadNotifications > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold leading-none">
                        {unreadNotifications > 99 ? '99+' : unreadNotifications}
                      </span>
                    </div>
                  )}
                </div>
              </button>
              
              <button 
                onClick={() => navigate('/business/messages')} 
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 active:scale-95"
                aria-label="Open messages"
              >
                <div className="relative">
                  <Send className="w-6 h-6" />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards - Compact Design */}
        <div className="px-safe py-3 grid grid-cols-3 gap-2.5 w-full">
          <Card 
            className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-primary via-primary/90 to-primary/80 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => setShowViewersModal(true)}
          >
            <CardContent className="p-3 text-center relative z-10">
              <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Eye className="w-4 h-4 text-white" />
              </div>
              <p className="text-xl font-bold text-white mb-0.5">{statsLoading ? '...' : (viewsCount || 0)}</p>
              <p className="text-[10px] text-white/80 font-medium">{t('views', { ns: 'business' })}</p>
            </CardContent>
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8" />
          </Card>

          <Card 
            className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-orange-500 via-orange-500/90 to-orange-600 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => setShowCommentsModal(true)}
          >
            <CardContent className="p-3 text-center relative z-10">
              <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <p className="text-xl font-bold text-white mb-0.5">{statsLoading ? '...' : (commentsCount || 0)}</p>
              <p className="text-[10px] text-white/80 font-medium">{t('comments', { ns: 'business' })}</p>
            </CardContent>
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8" />
          </Card>

          <Card 
            className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-emerald-500 via-emerald-500/90 to-emerald-600 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => setShowSaversModal(true)}
          >
            <CardContent className="p-3 text-center relative z-10">
              <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <p className="text-xl font-bold text-white mb-0.5">{savesLoading ? '...' : (stats.totalSaves || 0)}</p>
              <p className="text-[10px] text-white/80 font-medium">{t('saves', { ns: 'business' })}</p>
            </CardContent>
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8" />
          </Card>
        </div>

        {/* Quick Insights - Compact Design */}
        <div className="px-3 pb-3">
          <div className="grid grid-cols-2 gap-2.5">
            <Card className="relative overflow-hidden border-0 shadow-md">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent" />
              <CardContent className="p-3 relative z-10">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <Zap className="w-4 h-4 text-emerald-500/40" />
                </div>
                <p className="text-2xl font-bold text-foreground mb-0.5">
                  {statsLoading ? '...' : dailyGrowth >= 0 ? `+${dailyGrowth}%` : `${dailyGrowth}%`}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">{t('dailyGrowth', { ns: 'business' })}</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-md">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent" />
              <CardContent className="p-3 relative z-10">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                  <Sparkles className="w-4 h-4 text-amber-500/40" />
                </div>
                <p className="text-2xl font-bold text-foreground mb-0.5">
                  {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">{t('avgRating', { ns: 'business' })}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Empty State or Posts */}
        {posts.length === 0 ? (
          <div className="px-safe pb-4 w-full">
            <Card className="border-dashed border-2">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{t('growYourPresence', { ns: 'business' })}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('noUserPostsYet', { ns: 'business' })}
                </p>
                <Button onClick={() => navigate('/business/add')} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t('createContent', { ns: 'business' })}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="px-safe pb-4 w-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">{t('userContent', { ns: 'business' })}</h2>
                <p className="text-xs text-muted-foreground">{posts.length} {t('posts', { ns: 'common' })}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/business/add')}>
                <Sparkles className="w-4 h-4 mr-2" />
                {t('newPost', { ns: 'business' })}
              </Button>
            </div>
            <BusinessLocationPosts posts={posts} onPinToggle={handlePinToggle} />
          </div>
        )}

        {/* Modals */}
        <LocationViewersModal 
          isOpen={showViewersModal}
          onClose={() => setShowViewersModal(false)}
          locationId={location?.id || null}
          googlePlaceId={location?.google_place_id || null}
        />
        
        <LocationCommentsModal 
          isOpen={showCommentsModal}
          onClose={() => setShowCommentsModal(false)}
          locationId={location?.id || null}
          googlePlaceId={location?.google_place_id || null}
        />
        
        <LocationSharersModal 
          isOpen={showSaversModal}
          onClose={() => setShowSaversModal(false)}
          sharers={[]}
          locationName={location?.name || ''}
          locationId={location?.id || null}
          googlePlaceId={location?.google_place_id || null}
        />
    </div>
  );
};

export default BusinessOverviewPageV2;
