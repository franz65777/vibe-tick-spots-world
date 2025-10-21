import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, Tag, TrendingUp, Copy, Check, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface MarketingPost {
  id: string;
  caption: string;
  content_type: 'event' | 'discount' | 'promotion' | 'announcement';
  media_urls: string[];
  metadata: any;
  created_at: string;
  location_id: string;
  location?: {
    name: string;
    city: string;
    category: string;
    address: string;
  };
  user_id: string;
}

const BusinessFeedPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<MarketingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cities, setCities] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchMarketingPosts();
  }, [selectedCity, selectedCategory]);

  const fetchMarketingPosts = async () => {
    try {
      setLoading(true);

      const response = await supabase
        .from('posts')
        .select('*, locations(*)')
        .not('content_type', 'is', null)
        .in('content_type', ['event', 'discount', 'promotion', 'announcement'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (response.error) throw response.error;

      // Transform data
      const formattedPosts = ((response.data as any) || []).map((post: any) => ({
        ...post,
        location: Array.isArray(post.locations) ? post.locations[0] : post.locations
      }));

      // Extract unique cities
      const uniqueCities = Array.from(
        new Set(formattedPosts.map(p => p.location?.city).filter(Boolean))
      ) as string[];
      setCities(uniqueCities.sort());

      // Apply filters
      let filtered = formattedPosts;
      if (selectedCity !== 'all') {
        filtered = filtered.filter(p => p.location?.city === selectedCity);
      }
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(p => p.location?.category === selectedCategory);
      }

      setPosts(filtered);
    } catch (error) {
      console.error('Error fetching marketing posts:', error);
      toast.error('Failed to load marketing campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleImplementCampaign = async (post: MarketingPost) => {
    // Copy the campaign data for the business to implement
    setCopiedId(post.id);
    
    // Store in localStorage for easy access when creating a campaign
    localStorage.setItem('campaign_template', JSON.stringify({
      description: post.caption,
      content_type: post.content_type,
      metadata: post.metadata
    }));

    toast.success('Campaign template copied! Go to Add > Marketing to implement it.');
    
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'event': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'discount': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'promotion': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'announcement': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-sm mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="p-4">
            <h1 className="text-xl font-bold mb-3">Marketing Campaigns</h1>
            
            {/* Filters */}
            <div className="flex gap-2">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="flex-1 h-9 text-xs">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="flex-1 h-9 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="cafe">Cafe</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="museum">Museum</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Loading campaigns...
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No marketing campaigns found
            </div>
          ) : (
            posts.map(post => (
              <Card key={post.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{post.location?.name || 'Marketing Campaign'}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {post.content_type.charAt(0).toUpperCase() + post.content_type.slice(1)}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-xs ${getContentTypeColor(post.content_type)}`}>
                      {post.content_type}
                    </Badge>
                  </div>

                  {/* Image */}
                  {post.media_urls?.[0] && (
                    <div className="relative aspect-video rounded-lg overflow-hidden mb-2 bg-muted">
                      <img 
                        src={post.media_urls[0]} 
                        alt="Marketing campaign"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-xs text-foreground mb-2 line-clamp-2">
                    {post.caption}
                  </p>

                  {/* Metadata */}
                  <div className="space-y-1 mb-3">
                    {post.location && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{post.location.name}, {post.location.city}</span>
                      </div>
                    )}
                    
                    {post.content_type === 'event' && post.metadata?.start_date && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(post.metadata.start_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}

                    {post.content_type === 'discount' && post.metadata?.discount_amount && (
                      <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                        <TrendingUp className="w-3 h-3" />
                        <span>{post.metadata.discount_amount}% OFF</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handleImplementCampaign(post)}
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs"
                  >
                    {copiedId === post.id ? (
                      <>
                        <Check className="w-3 h-3 mr-1.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1.5" />
                        Implement Campaign
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessFeedPage;
