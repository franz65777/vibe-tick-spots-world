import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star } from 'lucide-react';
import BusinessLocationPosts from '@/components/business/BusinessLocationPosts';
import { getCategoryColor } from '@/utils/categoryIcons';
import { toast } from 'sonner';

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

const BusinessOverviewPage = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocationAndPosts();
  }, []);

  const fetchLocationAndPosts = async () => {
    try {
      setLoading(true);

      // For now, get a random location (we'll add business logic later)
      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (locationError) throw locationError;

      if (locationData) {
        setLocation(locationData);

        // Fetch posts for this location
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
        
        // Map the data to match our Post interface and extract is_pinned from metadata
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
      // Update the post's pinned status in metadata
      const { error } = await supabase
        .from('posts')
        .update({ 
          metadata: { is_pinned: !currentlyPinned }
        })
        .eq('id', postId);

      if (error) throw error;

      // Update local state
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

  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getPlaceholderImage = () => {
    const colors = [
      'bg-gradient-to-br from-blue-400 to-blue-600',
      'bg-gradient-to-br from-purple-400 to-purple-600',
      'bg-gradient-to-br from-green-400 to-green-600',
    ];
    const colorIndex = location ? location.id.length % colors.length : 0;
    return colors[colorIndex];
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-sm mx-auto">
        {/* Location Card */}
        <Card className="overflow-hidden rounded-none border-x-0 border-t-0 shadow-none">
          <div className="relative">
            {location.image_url ? (
              <div className="aspect-[16/9] overflow-hidden">
                <img
                  src={location.image_url}
                  alt={location.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className={`aspect-[16/9] ${getPlaceholderImage()} flex items-center justify-center`}>
                <MapPin className="w-16 h-16 text-white/80" />
              </div>
            )}

            {/* Category Badge */}
            <div className="absolute top-4 left-4">
              <Badge className={`${getCategoryColor(location.category)} bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full border-0 font-medium shadow-sm`}>
                {formatCategory(location.category)}
              </Badge>
            </div>
          </div>

          <CardContent className="p-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {location.name}
              </h1>
              {location.city && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{location.city}</span>
                </div>
              )}
              {location.address && (
                <p className="text-sm text-muted-foreground">{location.address}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Posts Section */}
        <div className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              User Posts ({posts.length})
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Pin posts to feature them at the top for all users
            </p>
          </div>

          <BusinessLocationPosts 
            posts={posts}
            onPinToggle={handlePinToggle}
          />
        </div>
      </div>
    </div>
  );
};

export default BusinessOverviewPage;

