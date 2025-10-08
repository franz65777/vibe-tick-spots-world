import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Upload, Image as ImageIcon } from 'lucide-react';
import BusinessLocationPosts from '@/components/business/BusinessLocationPosts';
import { getCategoryColor, getCategoryIcon } from '@/utils/categoryIcons';
import { formatDetailedAddress } from '@/utils/addressFormatter';
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    return formatDetailedAddress({
      city: location.city,
      address: location.address,
    });
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
        {/* Location Header */}
        <div className="p-6 border-b bg-card">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {location.name}
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{formatLocationAddress()}</span>
          </div>
        </div>

        {/* Cover Image Upload Section */}
        <Card className="m-4 overflow-hidden">
          <CardContent className="p-0">
            <div className="relative group">
              {location.image_url ? (
                <div className="aspect-[16/9] overflow-hidden bg-muted">
                  <img
                    src={location.image_url}
                    alt={location.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-[16/9] bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center">
                  {React.createElement(getCategoryIcon(location.category), {
                    className: 'w-16 h-16 text-muted-foreground/40',
                    strokeWidth: 1.5
                  })}
                  <p className="text-sm text-muted-foreground mt-2">No cover image</p>
                </div>
              )}

              {/* Upload Button Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Cover Image
                    </>
                  )}
                </Button>
              </div>

              {/* Category Badge */}
              <div className="absolute top-4 left-4">
                <Badge className={`${getCategoryColor(location.category)} bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full border-0 font-medium shadow-sm`}>
                  {formatCategory(location.category)}
                </Badge>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverImageUpload}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Posts Section */}
        <div className="px-4 pb-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              User Posts ({posts.length})
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Posts from users who tagged this location
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

