import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Star, Phone, Globe, Clock, Users, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ProfileTabs from '@/components/profile/ProfileTabs';
import PostsGrid from '@/components/profile/PostsGrid';
import { getCategoryColor, getCategoryIcon } from '@/utils/categoryIcons';
import { formatDetailedAddress } from '@/utils/addressFormatter';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessBadges from '@/components/business/BusinessBadges';
import { useDetailedAddress } from '@/hooks/useDetailedAddress';
import FollowersModal from '@/components/profile/FollowersModal';
import { useLocationSavers } from '@/hooks/useLocationSavers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  latitude?: number;
  longitude?: number;
}

const BusinessProfilePage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();
  const [location, setLocation] = useState<BusinessLocation | null>(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [marketingContent, setMarketingContent] = useState<any[]>([]);
  const [stats, setStats] = useState({ followers: 0, following: 0, saved: 0 });
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersType, setFollowersType] = useState<'followers' | 'following'>('followers');

  // Determina se stiamo visualizzando il profilo di un altro business
  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const { detailedAddress } = useDetailedAddress({
    id: location?.id,
    city: location?.city,
    address: location?.address,
    coordinates: location?.latitude && location?.longitude 
      ? { lat: Number(location.latitude), lng: Number(location.longitude) }
      : undefined,
  });

  const { savers } = useLocationSavers(location?.id);

  useEffect(() => {
    fetchBusinessLocation();
    fetchMarketingContent();
    fetchBusinessStats();
  }, [targetUserId]);

  // Refetch when tab becomes active
  useEffect(() => {
    const handleFocus = () => {
      fetchBusinessLocation();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  const fetchBusinessLocation = async () => {
    if (!targetUserId) return;

    try {
      setLoading(true);
      // Get the business profile with location_id
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('location_id, verification_status')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (businessProfile && businessProfile.location_id) {
        // Fetch the specific location owned by this business
        const { data: locationData } = await supabase
          .from('locations')
          .select('*')
          .eq('id', businessProfile.location_id)
          .maybeSingle();

        if (locationData) {
          setLocation(locationData);
        }
      }
    } catch (error) {
      console.error('Error fetching business location:', error);
      toast.error(t('failedLoadLocation', { ns: 'business' }));
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessStats = async () => {
    if (!targetUserId || !location?.id) return;
    
    try {
      // Count followers (users following this business)
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId);
      
      // Count following (users this business follows)
      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId);
      
      // Count saved (users who saved this location)
      const { count: savedCount } = await supabase
        .from('user_saved_locations')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', location.id);
      
      setStats({
        followers: followersCount || 0,
        following: followingCount || 0,
        saved: savedCount || 0
      });
    } catch (error) {
      console.error('Error fetching business stats:', error);
    }
  };

  const fetchMarketingContent = async () => {
    if (!targetUserId) return;

    try {
      const { data } = await (supabase as any)
        .from('posts')
        .select('*')
        .eq('user_id', targetUserId)
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
          <p className="text-muted-foreground">{t('noLocationFound', { ns: 'business' })}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {t('claimLocationFirst', { ns: 'business' })}
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

        {/* Location Label */}
        <div className="px-4 pt-3 flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          <span className="text-xs">
            {detailedAddress || 
             (location.address && location.city ? `${location.city}, ${location.address}` : location.city) || 
             'Location'}
          </span>
        </div>

        {/* Stats Section - Compact */}
        <div className="px-4 pt-2 pb-3 flex items-center gap-6">
          <button
            onClick={() => {
              setFollowersType('followers');
              setShowFollowersModal(true);
            }}
            className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          >
            <span className="text-sm font-semibold text-foreground">{stats.followers}</span>
            <span className="text-xs text-muted-foreground">{t('followers', { ns: 'common' })}</span>
          </button>
          
          <button
            onClick={() => {
              setFollowersType('following');
              setShowFollowersModal(true);
            }}
            className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          >
            <span className="text-sm font-semibold text-foreground">{stats.following}</span>
            <span className="text-xs text-muted-foreground">{t('following', { ns: 'common' })}</span>
          </button>
          
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">{stats.saved}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Bookmark className="w-3 h-3" />
              {t('saved', { ns: 'common' })}
            </span>
            {savers.length > 0 && (
              <div className="flex -space-x-2 ml-1">
                {savers.slice(0, 3).map((saver, index) => (
                  <Avatar key={saver.id} className="w-5 h-5 border-2 border-background">
                    <AvatarImage src={saver.avatar_url} alt={saver.username} />
                    <AvatarFallback className="text-[8px]">
                      {saver.username?.substring(0, 2).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {savers.length > 3 && (
                  <div className="w-5 h-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-[8px] font-medium text-muted-foreground">+{savers.length - 3}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="pt-2">
          <ProfileTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showTrips={false}
            showLocations={false}
            showMarketing={true}
          />
        </div>

        {/* Tab Content with scroll */}
        <div className="px-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
          {activeTab === 'posts' && location.id && (
            <div className="pb-4">
              <PostsGrid 
                userId={user?.id} 
                locationId={location.id}
                contentTypes={['event', 'discount', 'promotion', 'announcement']}
              />
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="space-y-4 pb-4">
              {marketingContent.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>{t('noMarketingContent', { ns: 'business' })}</p>
                  <p className="text-sm mt-2">{t('createMarketing', { ns: 'business' })}</p>
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
                          <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground">{t('noImage', { ns: 'business' })}</div>
                        )}
                        <div className="p-3 space-y-2">
                          <h3 className="font-semibold line-clamp-2 text-foreground text-sm">{content.caption || t('campaign', { ns: 'business' })}</h3>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">{new Date(content.created_at).toLocaleDateString()}</p>
                            <Button size="sm" onClick={() => handleRelaunch(content)} className="h-8 px-3 text-xs">{t('relaunch', { ns: 'business' })}</Button>
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
            <div className="pb-4">
              <BusinessBadges 
                locationId={location.id}
                googlePlaceId={location.google_place_id || null}
              />
            </div>
          )}

          {activeTab === 'tagged' && location.id && (
            <div className="pb-4">
              <PostsGrid 
                locationId={location.id}
                excludeUserId={user?.id}
              />
            </div>
          )}
        </div>
      </div>

      {showFollowersModal && (
        <FollowersModal
          isOpen={showFollowersModal}
          onClose={() => setShowFollowersModal(false)}
          userId={targetUserId || ''}
          initialTab={followersType}
        />
      )}
    </div>
  );
};

export default BusinessProfilePage;
