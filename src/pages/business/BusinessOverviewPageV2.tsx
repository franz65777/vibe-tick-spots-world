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

interface Location {
  id: string;
  name: string;
  category: string;
  city?: string;
  address?: string;
  image_url?: string;
  google_place_id?: string;
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { businessProfile } = useBusinessProfile();
  const [location, setLocation] = useState<Location | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { stats } = useLocationStats(location?.id || null, location?.google_place_id || null);
  const { viewsCount, commentsCount, dailyGrowth, loading: statsLoading } = useBusinessLocationStats(location?.id || null);

  useEffect(() => {
    fetchLocationAndPosts();
    fetchBusinessNotifications();
  }, []);

  const fetchBusinessNotifications = async () => {
    if (!user) return;
    
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      setUnreadNotifications(count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchLocationAndPosts = async () => {
    try {
      setLoading(true);

      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (locationError) throw locationError;

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
      toast.error('Failed to load location data');
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
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('locations')
        .update({ image_url: publicUrl })
        .eq('id', location.id);

      if (updateError) throw updateError;

      setLocation({ ...location, image_url: publicUrl });
      toast.success('Cover image updated successfully');
    } catch (error) {
      console.error('Error uploading cover image:', error);
      toast.error('Failed to upload cover image');
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
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No location found</p>
        </div>
      </div>
    );
  }

  const totalEngagement = posts.reduce((sum, post) => sum + post.likes_count + post.comments_count + post.saves_count, 0);
  const avgEngagement = posts.length > 0 ? Math.round(totalEngagement / posts.length) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/5 to-background pb-24">
      <div className="max-w-screen-sm mx-auto">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between p-4">
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
                  {businessProfile?.verification_status === 'verified' && (
                    <Sparkles className="w-3 h-3 text-primary" />
                  )}
                </h1>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{formatLocationAddress()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={() => navigate('/business/notifications')} className="relative">
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-destructive rounded-full flex items-center justify-center text-[10px] font-bold text-destructive-foreground">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/business/messages')}>
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-4 grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-3 text-center">
              <Eye className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{statsLoading ? '...' : viewsCount}</p>
              <p className="text-[10px] text-muted-foreground">Views</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-chart-2/20">
            <CardContent className="p-3 text-center">
              <MessageSquare className="w-5 h-5 text-chart-2 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{statsLoading ? '...' : commentsCount}</p>
              <p className="text-[10px] text-muted-foreground">Comments</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-chart-3/10 to-chart-3/5 border-chart-3/20">
            <CardContent className="p-3 text-center">
              <MapPin className="w-5 h-5 text-chart-3 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{statsLoading ? '...' : stats.totalSaves}</p>
              <p className="text-[10px] text-muted-foreground">Saves</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Insights */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {statsLoading ? '...' : dailyGrowth >= 0 ? `+${dailyGrowth}%` : `${dailyGrowth}%`}
                    </p>
                    <p className="text-xs text-muted-foreground">Daily Growth</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Empty State or Posts */}
        {posts.length === 0 ? (
          <div className="px-4 pb-4">
            <Card className="border-dashed border-2">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Grow Your Presence</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  No user posts yet. Start creating content to engage your audience.
                </p>
                <Button onClick={() => navigate('/business/add')} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Create Content
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">User Content</h2>
                <p className="text-xs text-muted-foreground">{posts.length} posts</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/business/add')}>
                <Sparkles className="w-4 h-4 mr-2" />
                New Post
              </Button>
            </div>
            <BusinessLocationPosts posts={posts} onPinToggle={handlePinToggle} />
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessOverviewPageV2;
