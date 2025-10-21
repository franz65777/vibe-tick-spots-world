import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Star, Phone, Globe, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ProfileTabs from '@/components/profile/ProfileTabs';
import PostsGrid from '@/components/profile/PostsGrid';
import { getCategoryColor, getCategoryIcon } from '@/utils/categoryIcons';
import { formatDetailedAddress } from '@/utils/addressFormatter';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface BusinessLocation {
  id: string;
  name: string;
  category: string;
  city?: string;
  address?: string;
  image_url?: string;
  google_place_id?: string;
  description?: string;
  phone?: string;
  website?: string;
  hours?: string;
}

const BusinessProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [location, setLocation] = useState<BusinessLocation | null>(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [marketingContent, setMarketingContent] = useState<any[]>([]);

  useEffect(() => {
    fetchBusinessLocation();
    fetchMarketingContent();
  }, [user]);

  const fetchBusinessLocation = async () => {
    if (!user) return;

    try {
      // Get the business profile
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (businessProfile) {
        // For now, fetch a demo location - in production this would be linked via business_profiles
        const { data: locationData } = await supabase
          .from('locations')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (locationData) {
          setLocation(locationData);
        }
      }
    } catch (error) {
      console.error('Error fetching business location:', error);
      toast.error('Failed to load business location');
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketingContent = async () => {
    if (!user) return;

    try {
      const { data } = await (supabase as any)
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .in('content_type', ['event', 'discount', 'promotion', 'announcement'])
        .order('created_at', { ascending: false });

      setMarketingContent(data || []);
    } catch (error) {
      console.error('Error fetching marketing content:', error);
    }
  };

  const handleRelaunch = (content: any) => {
    try {
      const template = {
        description: content.caption || '',
        content_type: content.content_type || 'event',
        metadata: content.metadata || {}
      };
      localStorage.setItem('campaign_template', JSON.stringify(template));
      navigate('/business/add?mode=marketing');
    } catch (e) {
      console.error('Error preparing relaunch template:', e);
    }
  };

  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">No business location found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please claim a business location first
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-sm mx-auto">
        {/* Cover Image with gradient fade and overlay title */}
        <div className="relative mx-4 mt-4 rounded-2xl overflow-hidden h-40">
          {location.image_url ? (
            <img
              src={location.image_url}
              alt={location.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              {React.createElement(getCategoryIcon(location.category), {
                className: 'w-16 h-16 text-muted-foreground/40',
                strokeWidth: 1.5
              })}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground truncate">{location.name}</h1>
            <Badge className={`${getCategoryColor(location.category)} bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full border-0 font-medium shadow-sm`}>
              {formatCategory(location.category)}
            </Badge>
          </div>
        </div>

        {/* Location Info */}
        <div className="px-4 py-6 space-y-4">
          {location.description && (
            <p className="text-muted-foreground text-sm mb-3 text-left">
              {location.description}
            </p>
          )}

          {/* Contact Info */}
          <div className="space-y-2">
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="text-foreground text-left">
                {location.address && location.city 
                  ? `${location.address}, ${location.city}`
                  : location.city || location.address || 'No address available'}
              </span>
            </div>

            {location.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <a href={`tel:${location.phone}`} className="text-foreground hover:text-primary">
                  {location.phone}
                </a>
              </div>
            )}

            {location.website && (
              <div className="flex items-center gap-3 text-sm">
                <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <a
                  href={location.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-primary"
                >
                  Visit Website
                </a>
              </div>
            )}

            {location.hours && (
              <div className="flex items-start gap-3 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="text-foreground">{location.hours}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showTrips={false}
          showLocations={false}
          showMarketing={true}
        />

        {/* Tab Content */}
        <div className="px-4 py-4">
          {activeTab === 'posts' && location.id && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Marketing posts from this business
              </p>
              <PostsGrid 
                userId={user?.id} 
                locationId={location.id}
                contentTypes={['event', 'discount', 'promotion', 'announcement']}
              />
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="space-y-4">
              {marketingContent.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No marketing content yet</p>
                  <p className="text-sm mt-2">Create events, promotions, and announcements in the Add tab</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {marketingContent.map((content) => (
                    <Card key={content.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        {content.media_urls && content.media_urls.length > 0 ? (
                          <img
                            src={content.media_urls[0]}
                            alt={content.caption || 'Campaign'}
                            className="w-full aspect-square object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground">No Image</div>
                        )}
                        <div className="p-3 space-y-2">
                          <h3 className="font-semibold line-clamp-2 text-foreground text-sm">{content.caption || 'Campaign'}</h3>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">{new Date(content.created_at).toLocaleDateString()}</p>
                            <Button size="sm" onClick={() => handleRelaunch(content)} className="h-8 px-3 text-xs">Relaunch</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'badges' && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Business badges coming soon</p>
            </div>
          )}

          {activeTab === 'tagged' && location.id && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Posts from users who tagged this location
              </p>
              <PostsGrid 
                locationId={location.id}
                excludeUserId={user?.id}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessProfilePage;
